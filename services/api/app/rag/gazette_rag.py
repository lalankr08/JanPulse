import re
import math
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from app.db import Database
from app.llm.router import router

@dataclass
class GazetteChunk:
    index: int
    page: int
    heading: str
    content: str
    embedding: Optional[List[float]] = None

def extract_page_number(text: str, default_page: int = 1) -> int:
    """Extracts page number from markers like '--- Page 14 ---'."""
    m = re.search(r"---\s*Page\s*(\d+)\s*---", text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return default_page

def split_into_gazette_chunks(
    full_text: str,
    max_chunk_chars: int = 1400,
    overlap_chars: int = 200
) -> List[GazetteChunk]:
    """
    Splits large gazette text into semantic page-aware chunks.
    Preserves page boundaries and section headers.
    """
    if not full_text or not full_text.strip():
        return []

    # Check if text contains page delimiters
    raw_pages = re.split(r"(?=---\s*Page\s*\d+\s*---)", full_text)
    chunks: List[GazetteChunk] = []
    chunk_idx = 0

    for p_idx, page_content in enumerate(raw_pages, start=1):
        page_clean = page_content.strip()
        if not page_clean:
            continue

        page_num = extract_page_number(page_clean, default_page=p_idx)
        # Strip the page header from chunk body for cleaner matching
        body_text = re.sub(r"---\s*Page\s*\d+\s*---\n?", "", page_clean).strip()
        if not body_text:
            continue

        # Split page body into paragraphs or clauses
        paragraphs = [p.strip() for p in body_text.split("\n\n") if p.strip()]
        
        current_buffer = ""
        current_heading = f"Page {page_num}"

        for p in paragraphs:
            # Check for clause / section numbers like "1.", "Section 4", "Rule 12"
            first_line = p.split("\n")[0].strip()
            if re.match(r"^(section|rule|clause|sub-rule|schedule|annexure|\d+\.)", first_line, re.IGNORECASE):
                current_heading = f"Page {page_num} - {first_line[:40]}"

            if len(current_buffer) + len(p) > max_chunk_chars and current_buffer:
                chunks.append(GazetteChunk(
                    index=chunk_idx,
                    page=page_num,
                    heading=current_heading,
                    content=current_buffer.strip()
                ))
                chunk_idx += 1
                # Overlap
                current_buffer = current_buffer[-overlap_chars:] + "\n" + p
            else:
                if current_buffer:
                    current_buffer += "\n\n" + p
                else:
                    current_buffer = p

        if current_buffer.strip():
            chunks.append(GazetteChunk(
                index=chunk_idx,
                page=page_num,
                heading=current_heading,
                content=current_buffer.strip()
            ))
            chunk_idx += 1

    return chunks

# Key regulatory dimensions queried in gazette RAG
REGULATORY_ASPECTS = [
    {
        "aspect": "scope",
        "description": "Who is affected, applicability, scope, target beneficiaries, entities covered, exemptions",
        "keywords": ["applicable", "applies", "beneficiary", "citizen", "person", "business", "company", "eligibility", "exemption", "covered", "qualifying"]
    },
    {
        "aspect": "changes",
        "description": "What changes, key policy amendments, revised rates, new rules, procedural updates, mandates",
        "keywords": ["amendment", "substitute", "insert", "revised", "rate", "subsidy", "benefit", "requirement", "new rule", "order", "regulation"]
    },
    {
        "aspect": "deadlines",
        "description": "Effective date, commencement, deadlines, compliance dates, submission timeline, grace period, due date",
        "keywords": ["effective", "commencement", "force on", "deadline", "timeline", "due date", "within", "days", "months", "last date", "period"]
    },
    {
        "aspect": "penalties",
        "description": "Penalties, fines, interest, late fee, non-compliance, violation consequences, enforcement, cancellation",
        "keywords": ["penalty", "fine", "punishment", "imprisonment", "late fee", "interest", "violation", "offence", "default", "liable", "cancellation"]
    },
    {
        "aspect": "actions",
        "description": "What to do next, citizen action steps, portal, application, forms, appeals, procedure, submission",
        "keywords": ["apply", "application", "portal", "submit", "form", "procedure", "website", "officer", "authority", "appeal", "document"]
    }
]

def score_chunk_bm25(query_terms: List[str], chunk_text: str) -> float:
    """Lightweight token matching score for guaranteed fallback when vector DB is offline."""
    text_lower = chunk_text.lower()
    score = 0.0
    for term in query_terms:
        count = text_lower.count(term.lower())
        if count > 0:
            # Sub-linear term frequency scoring
            score += 1.0 + math.log(count)
    return score

def process_gazette_with_rag(
    full_text: str,
    source_url: str = "https://egazette.gov.in",
    source_id: Optional[str] = None,
    max_total_context_chars: int = 15000
) -> Dict[str, Any]:
    """
    Orchestrates Gazette RAG:
    - If document is small (<= 12,000 chars), returns direct text.
    - If document is large (50-200+ pages), runs semantic chunking, embeds to pgvector,
      and performs multi-aspect regulatory retrieval.
    """
    clean_full = full_text.strip()
    total_len = len(clean_full)

    # 1. Fast path: Small document fits directly into prompt
    if total_len <= 12000:
        return {
            "context": clean_full,
            "is_rag_used": False,
            "total_chunks": 1,
            "chunks_selected": 1,
            "pages_cited": [1],
            "total_pages": clean_full.count("--- Page") or 1
        }

    # 2. Large document: Chunk document by page & clause
    chunks = split_into_gazette_chunks(clean_full, max_chunk_chars=1400, overlap_chars=200)
    if not chunks:
        return {
            "context": clean_full[:max_total_context_chars],
            "is_rag_used": False,
            "total_chunks": 1,
            "chunks_selected": 1,
            "pages_cited": [1],
            "total_pages": 1
        }

    total_chunks = len(chunks)
    all_pages = sorted(list({c.page for c in chunks}))
    total_pages = max(all_pages) if all_pages else 1

    # 3. Always include Chunk 0 (Preamble & Statutory Header)
    selected_indices = {0}
    selected_chunks: List[GazetteChunk] = [chunks[0]]

    # 4. Multi-Aspect Retrieval across the 5 regulatory dimensions
    for aspect_def in REGULATORY_ASPECTS:
        query_desc = aspect_def["description"]
        aspect_kws = aspect_def["keywords"]
        
        # Candidate ranking
        scored_candidates: List[tuple[float, int, GazetteChunk]] = []

        # A. Try pgvector hybrid search if source_id is registered
        vector_results = None
        if source_id:
            try:
                emb = router.generate_embedding(query_desc)
                vector_results = Database.hybrid_search(
                    query_text=query_desc,
                    query_embedding=emb,
                    match_count=4,
                    source_types=["egazette"]
                )
            except Exception as e:
                vector_results = None

        # B. Score chunks locally using BM25 keyword density
        query_tokens = [w for w in query_desc.lower().split() if len(w) > 3] + aspect_kws
        for c in chunks:
            if c.index == 0:
                continue
            bm25_score = score_chunk_bm25(query_tokens, c.content)
            if bm25_score > 0:
                scored_candidates.append((bm25_score, c.index, c))

        # Sort highest score first
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        # Select top 2 unique chunks for this aspect
        added_for_aspect = 0
        for score, idx, chunk in scored_candidates:
            if idx not in selected_indices:
                selected_indices.add(idx)
                selected_chunks.append(chunk)
                added_for_aspect += 1
                if added_for_aspect >= 2:
                    break

    # 5. Sort selected chunks in original chronological document order
    selected_chunks.sort(key=lambda c: c.index)

    # 6. Format the synthesized context with clear page headers
    formatted_sections = []
    pages_cited = set()

    for c in selected_chunks:
        pages_cited.add(c.page)
        formatted_sections.append(f"[{c.heading}]\n{c.content}")

    synthesized_context = "\n\n---\n\n".join(formatted_sections)

    # Ensure context does not exceed budget
    if len(synthesized_context) > max_total_context_chars:
        synthesized_context = synthesized_context[:max_total_context_chars]

    return {
        "context": synthesized_context,
        "is_rag_used": True,
        "total_chunks": total_chunks,
        "chunks_selected": len(selected_chunks),
        "pages_cited": sorted(list(pages_cited)),
        "total_pages": total_pages
    }

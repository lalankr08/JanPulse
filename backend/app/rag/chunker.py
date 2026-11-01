import re
from typing import NamedTuple

class DocumentChunk(NamedTuple):
    index: int
    heading_path: str
    content: str

def clean_text(text: str) -> str:
    # Normalize excessive newlines and whitespace
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def chunk_document(content: str, heading_prefix: str = "", max_chars: int = 1200, overlap: int = 150, max_chunks: int = 12) -> list[DocumentChunk]:
    cleaned = clean_text(content)
    if not cleaned:
        return []

    # Split by headings or paragraphs
    paragraphs = cleaned.split("\n\n")
    chunks: list[DocumentChunk] = []
    
    current_chunk = ""
    current_heading = heading_prefix
    chunk_idx = 0

    for p in paragraphs:
        p_strip = p.strip()
        if not p_strip:
            continue
            
        # Detect markdown heading
        if p_strip.startswith("#"):
            lines = p_strip.split("\n")
            current_heading = lines[0].replace("#", "").strip()
            
        if len(current_chunk) + len(p_strip) > max_chars and current_chunk:
            chunks.append(DocumentChunk(
                index=chunk_idx,
                heading_path=current_heading,
                content=current_chunk.strip()
            ))
            chunk_idx += 1
            if len(chunks) >= max_chunks:
                break
            # Start next chunk with overlap
            current_chunk = current_chunk[-overlap:] + "\n" + p_strip
        else:
            if current_chunk:
                current_chunk += "\n\n" + p_strip
            else:
                current_chunk = p_strip

    if current_chunk.strip() and len(chunks) < max_chunks:
        chunks.append(DocumentChunk(
            index=chunk_idx,
            heading_path=current_heading,
            content=current_chunk.strip()
        ))

    return chunks


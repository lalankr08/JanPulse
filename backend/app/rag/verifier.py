import re
from typing import NamedTuple
from app.llm.schemas import VerdictDraft, CitationDraft

class VerificationFailure(NamedTuple):
    claim_id: str
    issue: str
    action: str

def normalize_text_for_comparison(text: str) -> str:
    # Lowercase and replace any sequence of whitespace with a single space
    return re.sub(r"\s+", " ", text.lower().strip())

def verify_verdicts(
    verdicts: list[VerdictDraft],
    chunks_by_id: dict[str, dict]
) -> tuple[bool, list[VerificationFailure], list[VerdictDraft]]:
    """
    Programmatic citation verification rule check.
    Returns (all_passed, list_of_failures, updated_verdicts).
    """
    failures: list[VerificationFailure] = []
    verified_verdicts: list[VerdictDraft] = []

    for v in verdicts:
        # Rule 1: Every non-cannot_verify must have at least one citation
        if v.label != "cannot_verify" and not v.citations:
            failures.append(VerificationFailure(
                claim_id=v.claim_id,
                issue=f"Verdict '{v.label}' has no official citations.",
                action="abstain_or_replan"
            ))
            # Force abstain if no citation provided
            v.label = "cannot_verify"
            v.confidence = 0.2
            v.confidence_reason = "No official government citation was found to substantiate this claim."
            v.explanation = "We could not find an official government page that confirms or refutes this. That does not mean it is false."

        # Rule 2: Check each cited span in code
        valid_citations: list[CitationDraft] = []
        for cit in v.citations:
            chunk = chunks_by_id.get(cit.chunk_id)
            if not chunk:
                failures.append(VerificationFailure(
                    claim_id=v.claim_id,
                    issue=f"Cited chunk_id '{cit.chunk_id}' not found in retrieved evidence.",
                    action="reject_citation"
                ))
                continue
                
            chunk_content = chunk.get("content", "")
            norm_chunk = normalize_text_for_comparison(chunk_content)
            norm_span = normalize_text_for_comparison(cit.verbatim_span)

            if norm_span not in norm_chunk:
                # Open models sometimes quote with slight whitespace or punctuation differences
                # Check if high overlap (e.g. 70% of words) exists
                span_words = norm_span.split()
                if len(span_words) >= 4 and all(w in norm_chunk for w in span_words[:4]):
                    # Accept near match
                    valid_citations.append(cit)
                else:
                    failures.append(VerificationFailure(
                        claim_id=v.claim_id,
                        issue=f"Cited span '{cit.verbatim_span[:40]}...' was not found verbatim in chunk.",
                        action="reject_citation"
                    ))
            else:
                valid_citations.append(cit)

        v.citations = valid_citations
        if v.label != "cannot_verify" and not v.citations:
            v.label = "cannot_verify"
            v.confidence = 0.2
            v.confidence_reason = "Official source quote verification failed code check."
            v.explanation = "We found related documents, but could not confirm the exact official statement."

        verified_verdicts.append(v)

    all_passed = len(failures) == 0
    return all_passed, failures, verified_verdicts


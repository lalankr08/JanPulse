from typing import Optional, Literal
from pydantic import BaseModel, Field

class AtomicClaim(BaseModel):
    id: str = Field(description="Unique claim ID e.g. claim_1")
    claim_text: str = Field(description="Claim in original language")
    claim_text_en: str = Field(description="Claim translated to English")
    kind: Literal["scheme", "amount", "deadline", "law", "eligibility", "rumor_or_hoax", "other"] = Field(description="Type of claim")

class FactCheckAssessment(BaseModel):
    is_hoax_or_viral_rumor: bool = Field(description="Set to True ONLY if the claim is an unsubstantiated viral rumor, fabricated personal/celebrity gossip, satire, or phishing scam. False for genuine schemes.")
    hoax_category: Optional[Literal["celebrity_political_gossip", "fabricated_scheme_scam", "satirical_meme", "conspiracy_hoax", "genuine_civic_query"]] = Field(default="genuine_civic_query")
    verdict_label: Literal["contradicted", "cannot_verify", "proceed_official_check"] = Field(description="Mark proceed_official_check for genuine civic queries or real government schemes. Mark contradicted ONLY for debunked hoaxes, scams, or gossip.")
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    confidence_reason: str = Field(description="Explanation of why this is considered a rumor/hoax or needs official checking.")
    correct_official_fact: str = Field(default="", description="The actual, true government policy or public record fact explaining the real situation.")
    explanation: str = Field(description="Citizen-friendly explanation: state plainly that the claim is false/rumor, and explain what the real fact is.")
    fact_check_basis: str = Field(default="PIB Fact Check & Official Public Records", description="Source basis or public record consensus.")

class ClaimExtractionResult(BaseModel):
    has_checkable_claims: bool = Field(description="Whether the input contains actual checkable civic/government claims or viral rumors")
    language: str = Field(description="Detected language code (e.g. en, hi, ta, te, bn, mr)")
    claims: list[AtomicClaim] = Field(default_factory=list, description="List of atomic checkable claims")
    nudge_message: Optional[str] = Field(None, description="If no checkable claims, a helpful human message explaining what to paste")

class ToolCallPlan(BaseModel):
    tool: Literal["pib_latest", "pib_search", "myscheme_fetch", "myscheme_candidates", "indiacode_search", "egazette_search", "datagov_query", "news_search"]
    query: str = Field(description="Query term for search")
    language: str = Field(default="en", description="Language of query")
    reason: str = Field(description="Why this tool and query were chosen")

class PlanResult(BaseModel):
    tool_calls: list[ToolCallPlan] = Field(default_factory=list, description="List of tool calls (up to 4 per iteration)")
    strategy: str = Field(description="Brief explanation of retrieval strategy")

class CitationDraft(BaseModel):
    chunk_id: str = Field(description="The exact chunk_id from the provided evidence")
    source_url: str = Field(description="The source URL")
    role: Literal["supports", "contradicts", "context"] = Field(description="Role of this citation")
    verbatim_span: str = Field(description="Verbatim text span copied EXACTLY from the chunk content, do not paraphrase")

class VerdictDraft(BaseModel):
    claim_id: str
    label: Literal["supported", "contradicted", "partly_supported", "cannot_verify"]
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    confidence_reason: str = Field(description="Human explanation for why this confidence was assigned")
    explanation: str = Field(description="Grounded explanation in plain words, citing official evidence")
    citations: list[CitationDraft] = Field(default_factory=list)

class JudgeResult(BaseModel):
    verdicts: list[VerdictDraft]

class CriterionItem(BaseModel):
    criterion: str = Field(description="What condition is required")
    source_span: str = Field(description="Exact span from official scheme text")
    met_status: Literal["met", "not_met", "unknown"] = Field(default="unknown")
    question_for_user: Optional[str] = Field(None, description="Simple question to ask the citizen if unknown")

class SchemeDetail(BaseModel):
    scheme_name: str
    scheme_slug: str
    nodal_ministry: Optional[str] = None
    brief_description: Optional[str] = None
    source_url: str
    criteria: list[CriterionItem] = Field(default_factory=list)
    documents: list[str] = Field(default_factory=list)
    apply_steps: list[str] = Field(default_factory=list)
    guidance_disclaimer: str = Field(default="This is guidance based on official scheme pages. It is not an official decision.")

class MultiSchemeResult(BaseModel):
    query: str
    total_found: int
    schemes: list[SchemeDetail] = Field(default_factory=list)

class SchemeExtractionResult(BaseModel):
    scheme_name: str
    scheme_slug: str
    nodal_ministry: Optional[str] = None
    criteria: list[CriterionItem] = Field(default_factory=list)
    documents: list[str] = Field(default_factory=list)
    application_steps: list[str] = Field(default_factory=list)
    guidance_disclaimer: str = Field(default="This is guidance based on official scheme pages. It is not an official decision.")

class NotificationExplainerResult(BaseModel):
    title: str
    effective_date: Optional[str] = None
    deadlines: list[str] = Field(default_factory=list)
    who_is_affected: list[str] = Field(default_factory=list)
    what_changes: list[str] = Field(default_factory=list)
    penalties_or_actions: list[str] = Field(default_factory=list)
    what_to_do_next: list[str] = Field(default_factory=list)
    citations: list[CitationDraft] = Field(default_factory=list)

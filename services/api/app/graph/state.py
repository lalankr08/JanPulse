from dataclasses import dataclass, field
from typing import Optional, Literal
from app.llm.schemas import AtomicClaim, ToolCallPlan, VerdictDraft

@dataclass
class PipelineState:
    run_id: str
    user_id: str
    kind: Literal["forward", "eligibility", "notification", "followup"]
    raw_input: str
    input_type: Literal["text", "image", "audio", "url", "pdf"]
    target_language: str = "en"
    detected_language: str = "en"
    
    # State flags
    iteration: int = 0
    max_iterations: int = 2
    tool_budget_remaining: int = 8
    seq: int = 1
    
    # Extracted data
    has_checkable_claims: bool = True
    nudge_message: Optional[str] = None
    claims: list[AtomicClaim] = field(default_factory=list)
    
    # Retrieval data
    plan_calls: list[ToolCallPlan] = field(default_factory=list)
    retrieved_sources: list[dict] = field(default_factory=list)
    retrieved_chunks: list[dict] = field(default_factory=list)
    chunks_by_id: dict[str, dict] = field(default_factory=dict)
    
    # Verdicts & verification
    verdicts: list[VerdictDraft] = field(default_factory=list)
    verification_gaps: list[str] = field(default_factory=list)
    
    # Results
    final_explanation: Optional[str] = None
    audio_available: bool = False
    models_used: dict[str, str] = field(default_factory=dict)
    status: str = "running"
    persist_to_db: bool = True


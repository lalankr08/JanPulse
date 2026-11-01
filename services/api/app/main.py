import json
import asyncio
from typing import Optional, Literal
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.auth import verify_jwt
from app.db import Database
from app.graph.state import PipelineState
from app.graph.pipeline import JanPulsePipeline
from app.voice.stt import transcribe_audio
from app.voice.tts import synthesize_english_speech
from app.mcp_server.server import CivicMCPServer

app = FastAPI(
    title="Jan-Pulse API",
    description="Civic intelligence and verification platform for Indian citizens",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RunCreateRequest(BaseModel):
    input_text: str
    input_type: Literal["text", "image", "audio", "url", "pdf"] = "text"
    kind: Literal["forward", "eligibility", "notification", "followup"] = "forward"
    language: str = "en"

class EligibilityAnswerRequest(BaseModel):
    answers: dict[str, str]

class FollowupRequest(BaseModel):
    question: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "jan-pulse-api", "version": "2.0.0"}

@app.post("/v1/runs")
async def create_run(
    payload: RunCreateRequest,
    user: dict = Depends(verify_jwt)
):
    user_id = user.get("sub", "anon-user")

    # Insert into queries
    q_row = Database.execute_one(
        """INSERT INTO queries (user_id, input_type, raw_text, detected_lang)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (user_id, payload.input_type, payload.input_text, payload.language)
    )
    query_id = q_row["id"] if q_row else None

    # Insert into agent_runs
    run_row = Database.execute_one(
        """INSERT INTO agent_runs (query_id, user_id, kind, status, graph_version)
           VALUES (%s, %s, %s, 'running', 'v2') RETURNING id""",
        (query_id, user_id, payload.kind)
    )
    run_id = str(run_row["id"])

    state = PipelineState(
        run_id=run_id,
        user_id=user_id,
        kind=payload.kind,
        raw_input=payload.input_text,
        input_type=payload.input_type,
        target_language=payload.language,
        detected_language=payload.language
    )

    async def event_generator():
        yield f"event: run_started\ndata: {json.dumps({'run_id': run_id, 'status': 'running'})}\n\n"
        try:
            async for event in JanPulsePipeline.run(state):
                event_name = event.get("type", "update")
                yield f"event: {event_name}\ndata: {json.dumps(event)}\n\n"
        except Exception as e:
            err_data = {"type": "error", "message": str(e)}
            yield f"event: error\ndata: {json.dumps(err_data)}\n\n"
            Database.execute_query("UPDATE agent_runs SET status = 'failed' WHERE id = %s", (run_id,))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Run-ID": run_id
        }
    )

@app.get("/v1/runs/{run_id}")
def get_run(run_id: str, user: dict = Depends(verify_jwt)):
    run_data = Database.execute_one(
        """SELECT id, kind, status, started_at, finished_at FROM agent_runs WHERE id = %s""",
        (run_id,)
    )
    if not run_data:
        raise HTTPException(status_code=404, detail="Run not found")

    claims = Database.execute_query(
        """SELECT id, claim_text, claim_text_en, kind FROM claims WHERE run_id = %s""",
        (run_id,)
    )
    verdicts = Database.execute_query(
        """SELECT v.id, v.claim_id, v.label, v.confidence, v.confidence_reason, v.explanation, v.explanation_lang, v.share_id
           FROM verdicts v WHERE v.run_id = %s""",
        (run_id,)
    )
    
    # Attach citations
    for v in verdicts:
        cits = Database.execute_query(
            """SELECT c.role, c.span, c.fetched_at, s.url, s.publisher, s.title
               FROM citations c
               JOIN sources s ON s.id = c.source_id
               WHERE c.verdict_id = %s""",
            (v["id"],)
        )
        v["citations"] = cits

    return {
        "run": run_data,
        "claims": claims,
        "verdicts": verdicts
    }

@app.get("/v1/runs/{run_id}/trace")
def get_run_trace(run_id: str, user: dict = Depends(verify_jwt)):
    events = Database.execute_query(
        """SELECT seq, node, event_type, tool, url, model, http_status, latency_ms, detail, created_at
           FROM trace_events WHERE run_id = %s ORDER BY seq ASC""",
        (run_id,)
    )
    return {"run_id": run_id, "trace_events": events}

@app.post("/v1/runs/{run_id}/answers")
def submit_eligibility_answers(run_id: str, payload: EligibilityAnswerRequest, user: dict = Depends(verify_jwt)):
    # Record eligibility session answers
    Database.execute_query(
        """INSERT INTO eligibility_sessions (user_id, run_id, answers, result)
           VALUES (%s, %s, %s, 'eligible')""",
        (user.get("sub"), run_id, json.dumps(payload.answers))
    )
    return {"status": "saved", "answers_recorded": len(payload.answers)}

@app.post("/v1/runs/{run_id}/followup")
async def thread_followup(run_id: str, payload: FollowupRequest, user: dict = Depends(verify_jwt)):
    # Re-run pipeline with kind=followup
    state = PipelineState(
        run_id=run_id,
        user_id=user.get("sub", "anon-user"),
        kind="followup",
        raw_input=payload.question,
        input_type="text"
    )
    async def followup_gen():
        async for event in JanPulsePipeline.run(state):
            yield f"event: {event.get('type')}\ndata: {json.dumps(event)}\n\n"

    return StreamingResponse(followup_gen(), media_type="text/event-stream")

@app.post("/v1/refresh")
def force_refresh_sources(run_id: str, user: dict = Depends(verify_jwt)):
    # Clears cache for sources used in this run so subsequent run refetches
    Database.execute_query(
        """UPDATE sources SET fetched_at = NOW() - INTERVAL '2 days'
           WHERE id IN (SELECT source_id FROM citations c JOIN verdicts v ON v.id = c.verdict_id WHERE v.run_id = %s)""",
        (run_id,)
    )
    return {"status": "refreshed", "message": "Source cache invalidated for run."}

@app.post("/v1/ocr")
async def extract_image_ocr(
    file: UploadFile = File(...),
    user: dict = Depends(verify_jwt)
):
    """
    Multimodal Vision OCR endpoint powered by Gemini 3.8 Flash.
    Accepts an uploaded screenshot or document image and extracts text and civic claims verbatim.
    """
    content_type = file.content_type or "image/jpeg"
    if not (content_type.startswith("image/") or content_type == "application/pdf"):
        content_type = "image/jpeg"
    
    image_bytes = await file.read()
    try:
        from app.llm.router import router
        extracted_text = router.extract_image_text(image_bytes=image_bytes, mime_type=content_type)
        return {
            "status": "success",
            "filename": file.filename or "screenshot.jpg",
            "text": extracted_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

@app.post("/v1/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    language: str = Form("en"),
    user: dict = Depends(verify_jwt)
):
    audio_bytes = await file.read()
    result = transcribe_audio(audio_bytes=audio_bytes, filename=file.filename or "audio.wav", language=language)
    return result

@app.post("/v1/speak")
def text_to_speech_endpoint(
    text: str = Form(...),
    language: str = Form("en"),
    user: dict = Depends(verify_jwt)
):
    if language != "en":
        raise HTTPException(
            status_code=400,
            detail="Server-side Groq Orpheus voice supports English only. Regional languages use device speech synthesis."
        )
    audio_bytes = synthesize_english_speech(text)
    return Response(content=audio_bytes, media_type="audio/wav")

@app.get("/v1/share/{share_id}")
def get_public_share(share_id: str):
    verdict = Database.execute_one(
        """SELECT v.id, v.label, v.confidence, v.confidence_reason, v.explanation, v.explanation_lang, c.claim_text, c.kind
           FROM verdicts v
           JOIN claims c ON c.id = v.claim_id
           WHERE v.share_id = %s""",
        (share_id,)
    )
    if not verdict:
        raise HTTPException(status_code=404, detail="Shared verdict card not found")

    citations = Database.execute_query(
        """SELECT c.role, c.span, c.fetched_at, s.url, s.publisher, s.title
           FROM citations c
           JOIN sources s ON s.id = c.source_id
           WHERE c.verdict_id = %s""",
        (verdict["id"],)
    )
    verdict["citations"] = citations
    return {"share_card": verdict}

@app.delete("/v1/me/history")
def delete_user_history(user: dict = Depends(verify_jwt)):
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    Database.execute_query("DELETE FROM queries WHERE user_id = %s", (user_id,))
    Database.execute_query("DELETE FROM agent_runs WHERE user_id = %s", (user_id,))
    return {"status": "deleted", "message": "All history and associated traces successfully deleted."}

# MCP tools endpoint
@app.get("/v1/mcp/tools")
def list_mcp_tools():
    return {"tools": CivicMCPServer.list_tools()}

@app.post("/v1/mcp/call")
def call_mcp_tool(tool_name: str, arguments: dict):
    return CivicMCPServer.call_tool(tool_name, arguments)


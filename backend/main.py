import uuid
import asyncio
import time
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from config import settings
from logger import logger, setup_langsmith, log_extract, log_error
from transcript import extract_all_transcripts
from knowledge_base import build_vectorstore, delete_namespace
from chat import stream_chat

# Enable LangSmith if configured
setup_langsmith(
    settings.langchain_api_key,
    settings.langchain_project,
    settings.langchain_tracing_v2,
)

app = FastAPI(title="YT Tutor API")

import os

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    urls: list[str]


class ChatRequest(BaseModel):
    session_id: str
    messages: list[dict]


class SettingsUpdate(BaseModel):
    model_name: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=50, le=4000)
    top_p: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    frequency_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)
    presence_penalty: Optional[float] = Field(default=None, ge=-2.0, le=2.0)
    retrieval_k: Optional[int] = Field(default=None, ge=1, le=20)
    teaching_level: Optional[str] = None
    response_style: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/extract")
async def extract(req: ExtractRequest):
    urls = [u for u in req.urls if u.strip()]
    if not urls:
        raise HTTPException(status_code=400, detail="No URLs provided")
    if len(urls) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 URLs allowed")

    logger.info(f"[EXTRACT] Extracting transcripts for {len(urls)} URL(s)")
    results, errors = extract_all_transcripts(urls)

    if not results:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract any transcripts. Errors: {errors}",
        )

    session_id = str(uuid.uuid4())
    start = time.time()
    chunk_count = await asyncio.to_thread(build_vectorstore, session_id, results)
    log_extract(session_id, len(results), chunk_count, time.time() - start)

    return {
        "session_id": session_id,
        "videos_processed": len(results),
        "chunk_count": chunk_count,
        "errors": errors,
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    logger.info(f"[CHAT] session={req.session_id[:8]}")
    return StreamingResponse(
        stream_chat(req.session_id, req.messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/settings")
async def get_settings():
    return {
        "model_name": settings.model_name,
        "temperature": settings.temperature,
        "max_tokens": settings.max_tokens,
        "top_p": settings.top_p,
        "frequency_penalty": settings.frequency_penalty,
        "presence_penalty": settings.presence_penalty,
        "retrieval_k": settings.retrieval_k,
        "teaching_level": settings.teaching_level,
        "response_style": settings.response_style,
    }


@app.patch("/settings")
async def update_settings(update: SettingsUpdate):
    changed = {}
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
        changed[field] = value
    if changed:
        logger.info(f"[SETTINGS] Updated: {changed}")
    return {"updated": changed, "current": (await get_settings())}


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    await asyncio.to_thread(delete_namespace, session_id)
    logger.info(f"[SESSION] Cleared session={session_id[:8]}")
    return {"status": "cleared"}

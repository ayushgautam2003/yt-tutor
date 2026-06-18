import logging
import json
import os
import time
from datetime import datetime

LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# ── Handlers ──────────────────────────────────────────────────────────────────
_fmt = logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s")

_console = logging.StreamHandler()
_console.setFormatter(_fmt)

_file = logging.FileHandler(os.path.join(LOG_DIR, "app.log"))
_file.setFormatter(_fmt)

# Chat events go to a separate JSONL file for easy parsing / monitoring
_chat_log_path = os.path.join(LOG_DIR, "chat_events.jsonl")

logger = logging.getLogger("yt_tutor")
logger.setLevel(logging.DEBUG)
logger.addHandler(_console)
logger.addHandler(_file)
logger.propagate = False


# ── LangSmith setup ───────────────────────────────────────────────────────────
def setup_langsmith(api_key: str, project: str, enabled: bool):
    if not enabled or not api_key:
        return
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = api_key
    os.environ["LANGCHAIN_PROJECT"] = project
    logger.info(f"LangSmith tracing enabled — project: {project}")


# ── Structured event helpers ──────────────────────────────────────────────────
def _write_event(event: dict):
    event["ts"] = datetime.utcnow().isoformat()
    with open(_chat_log_path, "a") as f:
        f.write(json.dumps(event) + "\n")


def log_extract(session_id: str, videos: int, chunks: int, duration_s: float):
    logger.info(
        f"[EXTRACT] session={session_id[:8]} videos={videos} chunks={chunks} "
        f"duration={duration_s:.2f}s"
    )
    _write_event({
        "event": "extract",
        "session_id": session_id,
        "videos": videos,
        "chunks": chunks,
        "duration_s": round(duration_s, 3),
    })


def log_chat(
    session_id: str,
    question: str,
    context_chunks: int,
    duration_s: float,
    model: str,
    temperature: float,
):
    logger.info(
        f"[CHAT] session={session_id[:8]} model={model} temp={temperature} "
        f"chunks={context_chunks} duration={duration_s:.2f}s "
        f"q={question[:60]!r}"
    )
    _write_event({
        "event": "chat",
        "session_id": session_id,
        "question": question,
        "context_chunks": context_chunks,
        "duration_s": round(duration_s, 3),
        "model": model,
        "temperature": temperature,
    })


def log_error(session_id: str, error: str, context: str = ""):
    logger.error(f"[ERROR] session={session_id[:8]} ctx={context!r} err={error}")
    _write_event({
        "event": "error",
        "session_id": session_id,
        "context": context,
        "error": error,
    })

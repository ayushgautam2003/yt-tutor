from __future__ import annotations
import asyncio
import time
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage

from config import settings
from prompts import build_prompt_messages
from knowledge_base import get_vectorstore
from logger import log_chat, log_error

_llm: ChatOpenAI | None = None
_llm_fingerprint: tuple = ()


def _get_llm() -> ChatOpenAI:
    """Return LLM, rebuilding it if fine-tuning settings have changed."""
    global _llm, _llm_fingerprint
    fingerprint = (
        settings.model_name,
        settings.temperature,
        settings.max_tokens,
        settings.top_p,
        settings.frequency_penalty,
        settings.presence_penalty,
    )
    if _llm is None or _llm_fingerprint != fingerprint:
        _llm = ChatOpenAI(
            model=settings.model_name,
            streaming=True,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            top_p=settings.top_p,
            frequency_penalty=settings.frequency_penalty,
            presence_penalty=settings.presence_penalty,
        )
        _llm_fingerprint = fingerprint
    return _llm


async def stream_chat(session_id: str, messages: list[dict]):
    start = time.time()
    last_human = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    try:
        # ── Step 1: Retrieve relevant chunks from Pinecone ────────────────
        vectorstore = get_vectorstore(session_id)
        docs = await asyncio.to_thread(
            vectorstore.similarity_search, last_human, settings.retrieval_k
        )
        context = "\n\n".join(doc.page_content for doc in docs)

        # ── Step 2: Build history (exclude last human message) ────────────
        history = []
        msg_list = messages[:-1]
        for m in msg_list:
            if m["role"] == "user":
                history.append(HumanMessage(content=m["content"]))
            elif m["role"] == "assistant":
                history.append(AIMessage(content=m["content"]))

        # ── Step 3: Build prompt via ChatPromptTemplate ───────────────────
        prompt_messages = build_prompt_messages(
            context=context,
            history=history,
            question=last_human,
            teaching_level=settings.teaching_level,
            response_style=settings.response_style,
        )

        # ── Step 4: Stream tokens from LLM ───────────────────────────────
        async for chunk in _get_llm().astream(prompt_messages):
            if chunk.content:
                token = chunk.content.replace("\n", "\\n")
                yield f"data: {token}\n\n"

        yield "data: [DONE]\n\n"

        log_chat(
            session_id=session_id,
            question=last_human,
            context_chunks=len(docs),
            duration_s=time.time() - start,
            model=settings.model_name,
            temperature=settings.temperature,
        )

    except Exception as e:
        log_error(session_id, str(e), context="stream_chat")
        yield f"data: [ERROR] {str(e)}\n\n"

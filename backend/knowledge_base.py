from __future__ import annotations
import os
import time
from pinecone import Pinecone, ServerlessSpec
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter

INDEX_NAME = "yt-tutor"
EMBEDDING_MODEL = "text-embedding-3-small"
DIMENSION = 1536

_pc: Pinecone | None = None
_embeddings: OpenAIEmbeddings | None = None


def _get_pinecone() -> Pinecone:
    global _pc
    if _pc is None:
        _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return _pc


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
    return _embeddings


def _ensure_index():
    pc = _get_pinecone()
    existing = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing:
        pc.create_index(
            name=INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        # Wait for index to be ready
        while not pc.describe_index(INDEX_NAME).status.get("ready", False):
            time.sleep(1)


def build_vectorstore(session_id: str, transcript_results: list) -> int:
    """Chunk transcripts, embed, and upsert to Pinecone. Returns chunk count."""
    _ensure_index()

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    all_chunks = []
    for t in transcript_results:
        chunks = splitter.split_text(t["transcript"])
        all_chunks.extend(chunks)

    vectorstore = PineconeVectorStore.from_texts(
        texts=all_chunks,
        embedding=_get_embeddings(),
        index_name=INDEX_NAME,
        namespace=session_id,
    )
    return len(all_chunks)


def get_vectorstore(session_id: str) -> PineconeVectorStore:
    _ensure_index()
    return PineconeVectorStore(
        index_name=INDEX_NAME,
        embedding=_get_embeddings(),
        namespace=session_id,
    )


def delete_namespace(session_id: str):
    try:
        pc = _get_pinecone()
        index = pc.Index(INDEX_NAME)
        index.delete(delete_all=True, namespace=session_id)
    except Exception:
        pass

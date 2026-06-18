from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # API keys (required)
    openai_api_key: str
    pinecone_api_key: str

    # ── LLM fine-tuning ────────────────────────────────────────────────────
    model_name: str = "gpt-4o"
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=50, le=4000)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)

    # ── RAG / retrieval ────────────────────────────────────────────────────
    retrieval_k: int = Field(default=5, ge=1, le=20)
    chunk_size: int = Field(default=500, ge=100, le=2000)
    chunk_overlap: int = Field(default=50, ge=0, le=200)

    # ── Teaching behaviour ─────────────────────────────────────────────────
    # beginner | intermediate | advanced
    teaching_level: str = "beginner"
    # concise | detailed
    response_style: str = "concise"

    # ── LangSmith monitoring ───────────────────────────────────────────────
    langchain_api_key: str = ""
    langchain_project: str = "yt-tutor"
    langchain_tracing_v2: bool = False


# Single shared instance — mutated at runtime via PATCH /settings
settings = AppSettings()

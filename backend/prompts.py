from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate

# ── Teaching level descriptions ───────────────────────────────────────────────
LEVEL_GUIDES = {
    "beginner": (
        "Assume zero prior knowledge. Use everyday analogies. "
        "Define every term before using it."
    ),
    "intermediate": (
        "Assume basic familiarity with the topic. "
        "Skip trivial definitions, focus on how things connect."
    ),
    "advanced": (
        "Assume strong background. Be technically precise. "
        "Go deep on edge cases and trade-offs."
    ),
}

# ── Response style descriptions ───────────────────────────────────────────────
STYLE_GUIDES = {
    "concise": "Keep your answer to 3-5 sentences. Be direct.",
    "detailed": "Give a thorough explanation with examples. Use bullet points or numbered steps where helpful.",
}

# ── Core system prompt template ───────────────────────────────────────────────
SYSTEM_TEMPLATE = """\
You are an expert teacher. Use ONLY the content below (extracted from YouTube videos) to answer.

────────────────────────────────────────────────
KNOWLEDGE BASE
────────────────────────────────────────────────
{context}
────────────────────────────────────────────────

Teaching level : {teaching_level}
Level guidance : {level_guide}
Response style : {style_guide}

If something is not covered in the knowledge base, say so honestly instead of guessing.\
"""

CHAT_PROMPT = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(SYSTEM_TEMPLATE),
        ("placeholder", "{history}"),
        ("human", "{question}"),
    ]
)


def build_prompt_messages(
    context: str,
    history: list,
    question: str,
    teaching_level: str = "beginner",
    response_style: str = "concise",
):
    """Return a list of LangChain messages ready to pass to the LLM."""
    return CHAT_PROMPT.format_messages(
        context=context,
        teaching_level=teaching_level,
        level_guide=LEVEL_GUIDES.get(teaching_level, LEVEL_GUIDES["beginner"]),
        style_guide=STYLE_GUIDES.get(response_style, STYLE_GUIDES["concise"]),
        history=history,
        question=question,
    )

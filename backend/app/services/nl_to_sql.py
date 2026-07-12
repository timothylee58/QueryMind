import re
from anthropic import AsyncAnthropic
from app.config import settings

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


_SYSTEM_BASE = """\
You are a PostgreSQL expert. Convert the user's question to a valid SELECT SQL query.
Output ONLY the raw SQL. No explanation. No markdown. No semicolons. No comments.

Rules:
- Only SELECT statements allowed.
- Always include LIMIT if not present (max 500).
- Never use DROP, DELETE, INSERT, UPDATE, TRUNCATE, ALTER, CREATE.
- Use standard PostgreSQL syntax only.
- Do not wrap output in markdown fences or backticks.

Schema context:
{schema_context}
"""

_MD_FENCE = re.compile(r"```(?:sql)?\s*|```", re.IGNORECASE)


async def generate_sql(nl_query: str, schema_context: str) -> str:
    system_prompt = _SYSTEM_BASE.format(schema_context=schema_context)

    message = await _get_client().messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        temperature=0,
        system=system_prompt,
        messages=[{"role": "user", "content": nl_query}],
    )

    raw = message.content[0].text if message.content else ""
    # Strip markdown fences and whitespace
    sql = _MD_FENCE.sub("", raw).strip().rstrip(";").strip()
    return sql

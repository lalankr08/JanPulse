# Jan-Pulse Architecture & System Specification

Please refer to [`plan.md`](../plan.md) for the complete, canonical specification of the Jan-Pulse system architecture, judging pillars, and technical design.

## Core System Highlights

1. **Zero Dummy Data**: All tables start empty. Every claim is validated against runtime fetches from official portals (PIB, myScheme, Gazette) with `fetched_at` timestamps and URLs logged.
2. **Programmatic Verification**: Citations are verified in code, not via model self-assessment. Verbatim continuous span matching against stored chunk content is enforced.
3. **Model Routing with Fallback**: Low-latency tasks run on Groq (`openai/gpt-oss-20b`), structured reasoning runs on `openai/gpt-oss-120b`, and long documents / embeddings run on Google Gemini (`gemini-3.8-flash`, `gemini-embedding-001`).
4. **Prompt Injection & SSRF Protection**: Ingested content is isolated in strict untrusted boundaries. All URLs are restricted to allowlisted Indian government domains (`.gov.in`, `.nic.in`), with private IP ranges blocked.


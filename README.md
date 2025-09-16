# HyperChat6

## Gemini model router & fallback

This project includes a robust Gemini model router that prefers Gemini 2.5 Pro and automatically falls back to Gemini 2.5 Flash when:
- The daily Pro limit is reached, or
- A 429 / quota error is returned by the API.

Scope:
- Applied to both Pro Search and Deep Research flows.
- UI displays a visible, dismissible banner when fallback occurs.

Implementation:
- Router located at `packages/ai/gemini/router.ts` with an in-memory per-day counter and retry-on-fallback logic.
- Pro Search and Deep Research tasks call the router via helpers in `packages/ai/gemini/index.ts` for text streaming and JSON object generation.
- Fallback info is propagated to the UI via the workflow `object` event under `object.geminiFallback`.

Environment variables (with defaults):
- GOOGLE_API_KEY or GEMINI_API_KEY
- GEMINI_PRIMARY_MODEL=gemini-2.5-pro
- GEMINI_FALLBACK_MODEL=gemini-2.5-flash
- GEMINI_PRIMARY_DAILY_LIMIT=50
- GEMINI_FALLBACK_DAILY_LIMIT=250
- GEMINI_ENABLE_FALLBACK=true

Notes:
- Counters are in-memory and reset daily at midnight (server time).
- If fallback is disabled or both limits are exhausted, a clear error is surfaced.
- The router uses the official Google AI SDK (`@google/generative-ai`).

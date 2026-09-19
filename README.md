# Fraudcatua

AI agent that listens to a mobile-money scam call, transcribes it, and shows the evidence.

Upload a recording of a suspicious phone call (mobile-money scams in Ghana — "This is MTN, read me the code we sent you"). Fraudcatua transcribes it with Speechmatics, an AI agent judges whether it's a scam, extracts evidence tied to transcript timestamps, verifies the caller's claims on the web with Firecrawl, suggests the official support number for the impersonated service, and lets you report the scammer's number to a shared database — earning gift points.

## Features

- **Transcribe** — Speechmatics batch transcription with speaker diarization (`enhanced` operating point), grouped into timestamped speaker turns.
- **Judge** — an open-weight model via Neon AI Gateway (`gpt-oss-120b` by default) extracts the impersonated service, scam type, claims, red flags, and numbers mentioned, then delivers a verdict with confidence, evidence quotes, and next steps.
- **Verify** — each factual claim is checked live via Firecrawl web search, plus a search for the impersonated service's official support number.
- **Report & remember** — report scammer numbers to a shared Postgres table; lookups and a recent-reports feed warn the next victim. Optional gift points (10/report) with opt-in.
- **No mock mode** — all API calls are real; a missing env var returns a clear `{"error": "..._API_KEY is not set"}` JSON error.

## Stack

Next.js 15+ App Router · TypeScript strict · Tailwind v4 · Vercel AI SDK (`ai` + `@neondatabase/ai-sdk-provider`) · `@speechmatics/batch-client` · `firecrawl` · `@neondatabase/serverless` (raw SQL, no ORM) · `page-mascot` · Vitest.

## Environment variables

Only secrets live in env vars. Non-secret settings (model id, API base URLs, language, mascot paths) live in `src/config.ts`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SPEECHMATICS_API_KEY` | yes | Speechmatics batch API key |
| `NEON_AI_GATEWAY_TOKEN` | yes | Neon AI Gateway platform token |
| `NEON_AI_GATEWAY_BASE_URL` | yes | Neon AI Gateway branch endpoint |
| `FIRECRAWL_API_KEY` | yes* | Firecrawl API key (*claim checks degrade to "unverified" without it) |
| `DATABASE_URL` | no | Postgres URL, required for `/api/reports*` and saved analyses `/a/[id]`; analysis works without it |

See `.env.example`.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # http://localhost:3000
npm test                     # vitest (phone utils)
npm run lint && npx tsc --noEmit
```

`GET /api/health` reports which integrations are configured (booleans only).

## Deploy on Render

1. Push this repo.
2. In Render: **New → Blueprint**, pick the repo — `render.yaml` defines the web service (`npm ci && npm run build`, `npm start`).
3. Fill the env vars marked `sync: false` in the Render dashboard (Neon AI Gateway URL + token, Speechmatics key, Firecrawl key, DATABASE_URL).
4. Health check hits `/`.

## How the pipeline works

Deterministic three stages in `src/lib/agent/analyze.ts`:

1. **Extract** — LLM structures the numbered transcript (speaker, timestamps) into summary, impersonated service, scam type, claims (≤4), red flags with `segmentIds`, numbers mentioned.
2. **Verify** — Firecrawl searches each claim (`"<claim> <service> Ghana scam"`, ≤3) plus the service's official support number; mentioned numbers are looked up in `reports`.
3. **Judge** — LLM weighs extraction + search snippets + prior reports into verdict/confidence/evidence/claimChecks/supportNumbers/whatToDo.

`askJson` (`src/lib/agent/llm.ts`) tries `generateObject` structured output first, falling back to `generateText` + JSON extraction + `zod.parse` for models that can't emit structured output.

## Database

`ensureSchema()` auto-creates tables on first use:

- `analyses(id text pk, created_at, file_name, duration_s, transcript jsonb, result jsonb)`
- `reports(id serial pk, created_at, phone_number, phone_normalized, service, scam_type, notes, analysis_id, contact, opt_in, points)` — index on `phone_normalized`

Numbers are normalized `0XXXXXXXXX → 233XXXXXXXXX` and masked in public feeds (`024 *** 1234`).

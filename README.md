# jobineurope

A personal AI job dashboard: ingest your professional profile, find
sponsorship-friendly jobs in **Germany & Romania**, rank them by fit, draft
tailored cover letters, and track every application.

**Stack:** Next.js 16 (App Router) · MongoDB Atlas + Vector Search · Auth.js v5 ·
provider-agnostic AI (Cloudflare Workers AI / NVIDIA NIM / OpenRouter).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Next.js + Atlas + Auth.js skeleton | ✅ done |
| 1 | CV upload + GitHub + website → structured profile | ✅ done |
| 2 | Job ingestion (Adzuna + Arbeitnow) + nightly cron | ✅ done |
| 3 | Vector shortlist + AI fit scoring | ✅ done |
| 4 | Cover-letter generation (tone + versioning) | ✅ done |
| 5 | Application tracker (kanban + notes) | ✅ done |
| 6 | Assisted apply (reusable answers + copy) | ✅ done |
| 7 | Polish (alerts, saved searches, GDPR export) | ▢ planned |

## Setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Configure env** — copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — a free Atlas cluster (https://cloud.mongodb.com)
   - `AUTH_SECRET` — run `npx auth secret`
   - GitHub + Google OAuth app credentials (callback URLs in `.env.example`)
   - One AI chat provider key (OpenRouter is easiest) and one embed provider
     (Cloudflare Workers AI or NVIDIA NIM)

3. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to `/login`.

## AI provider routing

Chat and embeddings are decoupled and selected by env:

```
AI_CHAT_PROVIDER  = openrouter | nim | cloudflare
AI_EMBED_PROVIDER = cloudflare | nim     # OpenRouter has no embeddings API
EMBED_DIMENSIONS  = 768                   # must match model + Atlas index
```

Implementation: `src/lib/ai/` (factory in `index.ts`, providers under `providers/`).

## Project map

```
src/
  auth.ts                      Auth.js config (GitHub doubles as data connection)
  proxy.ts                     Route protection (Next 16 proxy convention)
  app/
    login/                     Sign-in page
    (dashboard)/               Authenticated dashboard + CvUpload
    api/auth/[...nextauth]/    Auth.js handlers
    api/profile/cv/            CV upload → parse → persist
  lib/
    db/      mongo.ts (lazy client) · schema.ts (collection types)
    ai/      provider-agnostic chat + embeddings
    profile/ parse-cv.ts (PDF → text → structured JSON)
```

## Notes

- CV data is sensitive PII; all queries are scoped to `userId`. Keep GDPR basics
  in mind (export/delete, no needless retention).
- "Auto-apply" is intentionally **assisted apply** — the AI prepares materials,
  you review and submit. No login automation (LinkedIn/Indeed ToS + bans).

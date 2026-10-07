<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes for AI coding assistants

- This is a hackathon starter: data in → AI → impact metric. Keep code simple, no comments, no new dependencies unless asked.
- All AI calls go through `generateJSON()` in `src/lib/ai/index.ts`. Do not call provider SDKs directly.
- API routes must keep working without an AI key (fall back to `domain.rules`).
- Check your work with `npx tsc --noEmit && npm run lint && npm run build`.

# Team: two people, two AIs, one repo

## Step 1: know who you are working for

Read `ME.md` in the repo root before doing anything. It names your person and their role.
`ME.md` is gitignored, so each laptop keeps its own.

If `ME.md` is missing, this is a fresh clone. Hafi already has one, so your person is Haider (GitHub `haiderimran019`) on frontend.
Do the first-time setup below without waiting to be asked, then tell Haider in a few lines what you did and what to work on.
Only if they say they are Hafi, use `Name: Hafi` / `Role: backend` and the `backend` branch instead.

1. Check `node -v` is 22 or newer. If not, stop and ask them to install the LTS from nodejs.org.
2. Create `ME.md`:

   ```
   Name: Haider
   Role: frontend
   ```

3. Run `npm install`, then `cp .env.example .env.local`. No AI key is needed: without one the API answers in "rules" mode with the same response shapes.
4. Create the branch: `git switch frontend` if it exists on the remote, otherwise `git switch -c frontend && git push -u origin frontend`.
5. Run `npm run dev` and confirm http://localhost:3000 loads.
6. Tell them what to work on first: the demo flow (load data → run → results and impact cards), large type and strong contrast for a projector, loading / empty / error states, the amber "rules" badge, phone layout and the Urdu summary.

## Step 2: only edit files your role owns

| Area | Owner | Files |
| --- | --- | --- |
| API routes | backend | `src/app/api/**` |
| AI calls, prompts, data cleaning | backend | `src/lib/ai/**`, `src/lib/prompts.ts`, `src/lib/normalize.ts`, `src/lib/csv.ts` |
| Domain logic | backend | `src/domains/**`, except the display text below |
| Domain display text | frontend | only `product`, `tagline`, `problem`, `sdg`, `accent`, `photoHint` inside `src/domains/<domain>.ts` |
| Screens and components | frontend | `src/components/**`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` |
| Browser logic | frontend | `src/lib/usePipeline.ts`, `src/lib/files.ts`, `public/**` |
| Contract | both, by agreement | `src/lib/types.ts`, `src/domains/types.ts` |
| Config and docs | both, by agreement | `package.json`, `package-lock.json`, config files, `*.md` |

If a task needs a change in a file your role does not own: stop, do not edit it, and tell your person exactly what to ask their teammate for (file, change, reason). Never "quickly fix" the other side.

## Roles

**Backend (Hafi):** makes the data → AI → impact pipeline correct and reliable.
- For the assigned domain: `fields`, `sample`, the `analysis` prompt, `rules` and `impact()`
- Prompt quality, AI provider, retries, cache and fallbacks
- Test without the UI, e.g.:
  `curl -X POST localhost:3000/api/analyze -H 'content-type: application/json' -d '{"domainId":"example","rows":[{"id":"r1","task":"Submit quarterly report","owner":"Sara","due":"2026-10-20","progress":30,"notes":"Data abhi tak nahi mila"}]}'`

**Frontend (teammate):** makes the results clear and impressive on a projector in a 5-minute demo.
- Layout, components, loading / empty / error states, phone layout, Urdu display
- No API key needed: without one, the API answers in "rules" mode with the same response shapes
- Gets data only through the API and the contract types; never imports from `src/lib/ai/**`

## The contract

The two sides meet only here. Types live in `src/lib/types.ts` and `src/domains/types.ts`.

| Endpoint | Request body | Response |
| --- | --- | --- |
| `POST /api/extract` | `{ domainId, text?, file?: { mimeType, data } }` | `ExtractResponse`: `{ rows, review?, meta }`. `review` lists `{ id, fields }` the AI wasn't sure it read correctly: show them for a human to check |
| `POST /api/analyze` | `{ domainId, rows }` | `AnalyzeResponse`: `{ assessments, meta }`. Each assessment may carry `message`: a ready-to-send Roman Urdu SMS or WhatsApp text |
| `POST /api/summarize` | `SummarizeRequest` | `SummarizeResponse`: `{ summary, meta }` |
| `GET /api/status` | optional `?ping=1` | `{ provider, model, fallbackModel, ready }` |

- Errors come back as `{ error }` with a 4xx/5xx status. Analyze and summarize do not fail when the AI fails; they return `meta.mode: "rules"`.
- Backend may add optional fields at any time. Renaming or removing a field needs both people to agree first.
- Any commit that changes a contract file starts with `CONTRACT:`. After pulling, run `git log --oneline --grep CONTRACT -5` and adapt to any new changes.

## Git

- Backend works on branch `backend`, frontend on branch `frontend`. Never commit straight to `main`.
- Start of every session, on your own branch: `git pull origin main`.
- Commit small and often. Open a pull request to `main` whenever something works (at least every 2–3 hours); the other person merges it.
- Tell your teammate before adding a dependency. If `package-lock.json` conflicts, keep either version and run `npm install`.

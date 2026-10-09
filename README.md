# AICON'26: ER Operations Dashboard

Our project for the **Build with AI** module at AICON'26 (NUST). Assigned domain: **Health Operations**.

**Live:** https://aicon26-er-dashboard-taupe.vercel.app

Emergency departments in Pakistan run far over capacity (about 0.6 hospital beds per 1,000 people, one of the lowest rates in the world). Critical patients queue behind minor ones, patients wait on corridor trolleys, and nobody sees the whole floor at once. This dashboard helps the charge nurse decide **who is seen first, in which bed, by which doctor**, and what to do when the department is overwhelmed.

## What it does

1. **Intake:** a nurse types or dictates a messy note in English, Urdu or Roman Urdu. The AI turns it into clean vitals plus predicted needs (specialty, tests, destination, high risk) and flags anything it was unsure about.
2. **Triage:** an ESI-style checklist in code sets the urgency level (1–5). The AI can only raise priority, never lower it.
3. **Allocation:** code places patients in resus, acute or fast-track beds and matches them to doctors by urgency, wait and specialty.
4. **Live dashboard:** patients, beds, doctors and KPIs on a simulated clock, with a **Surge** button and a first-come vs smart policy toggle.
5. **Actions:** code detects problems (no beds, critical patients waiting, boarding) and offers one-click fixes; the AI writes a short brief for the charge nurse in English or Urdu.
6. **Evidence:** first come vs smart on the same arrivals, and triage accuracy against a real, anonymised triage dataset.

## Results on real data

We tested the full pipeline (AI reading of the nurse's note plus code triage) on 300 real, anonymised emergency visits (Moon et al. 2019) and compared it with the triage nurses on the same visits. Details are in [`data/ktas/README.md`](data/ktas/README.md).

| | Under-triage | Urgent patients rated non-urgent | Critical (level 1) patients caught |
| --- | --- | --- | --- |
| Triage nurses | 12.0% | 8 of 75 | 15 of 26 |
| **Our pipeline** | **7.3%** | **5 of 75** | **22 of 26** |
| Code alone, without the AI | 48.7% | 43 of 75 | |

- **The trade-off:** we rate more patients urgent than the experts did (over-triage 50% vs the nurses' 4%). ESI treats possible heart attack, stroke signs and GI bleeding as level 2, where the Korean experts often chose level 3. The patients we raised were admitted more often than those we didn't, and every raised level shows its reason so the nurse can lower it.
- **Smart allocation:** replaying real visits at peak load (17 arrivals an hour, averaged over 20 simulated 4-hour shifts), patients the experts rated urgent waited **2.4 minutes instead of 41**, and 56 patients were seen instead of 43.

## Built before AICON'26 (disclosed)

The rulebook allows templates and boilerplate if they are disclosed. Before the event we prepared a generic starter with no domain logic (the first commit, "Starter built before AICON'26 (disclosed)"):

- **AI provider layer** (`src/lib/ai/**`): plain `fetch` adapters for Gemini, OpenAI, Groq and Anthropic; backup model, time limit, answer cache.
- **A generic data → AI → metrics pipeline** with its UI shell and routes (`src/domains/**`, most of `src/components/**`, `src/lib/usePipeline.ts`, `/api/extract`, `/api/analyze`, `/api/summarize`, `/api/status`). The ER app does not use the pipeline; we are removing it as the ER screens replace it.

## Built during AICON'26

Everything for the ER dashboard, all visible in the commit history:

- **Backend (Hafi):** the contract (`src/er/types.ts`); the triage, allocation and simulation engine (`src/er/engine.ts`); note parsing and AI prompts (`src/er/intake.ts`, `src/er/prompts.ts`); the `/api/intake` and `/api/advise` routes; synthetic demo patients (`src/er/mock.ts`); the evaluation on real visits (`scripts/evaluate.ts`), the real-case replay pool (`src/er/replay.ts`) and the evidence numbers (`src/er/evidence.ts`).
- **Frontend (Haider):** the dashboard, intake form, actions panel, evidence page and all screens.

## Third-party resources

- **Software:** Next.js, React, Tailwind CSS and the Google Gemini API.
- **Triage method:** triage levels are based on the published Emergency Severity Index (ESI).
- **Dataset:** Moon S-H, Shim JL, Park K-S, Park C-S (2019). Triage accuracy and causes of mistriage using the Korean Triage and Acuity Scale. *PLOS ONE* 14(9): e0216972. https://doi.org/10.1371/journal.pone.0216972. CC BY 4.0. These are 1,267 anonymised visits, used for evaluation and for the "real cases" replay.
- **Statistics:** hospital beds per 1,000 people, World Bank indicator SH.MED.BEDS.ZS (WHO data; Pakistan 0.6 in 2017).
- **Demo patients:** the 23 demo patients in `src/er/mock.ts` are synthetic.

---

## Run it

You need Node.js 22 or newer (`node -v` to check).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. It works without an AI key: intake falls back to simple rules and the brief to a template, shown with an amber "rules" badge.

**Add the AI key:** create a free key at https://aistudio.google.com/apikey, paste it after `GEMINI_API_KEY=` in `.env.local`, restart `npm run dev`, then open http://localhost:3000/api/status?ping=1 and check for `"ping":"ok"`. Git ignores `.env.local`, so the key never reaches GitHub.

Test the AI without the UI:

```bash
curl -s -X POST localhost:3000/api/intake -H 'content-type: application/json' -d '{"note":"67 saal mard, seene mein dard aur paseena, BP 88/60, pulse 112, sat 94"}'
```

---

## How it works

```
 Nurse note ─► AI intake ─► Code triage ─► Code allocation ─► Dashboard ─► Code alerts ─► AI brief
 (EN / UR /     (vitals,      (level 1–5,     (bed zone,          (patients,    (no beds,       (EN or UR,
  Roman Urdu)    needs,        flags)          doctor match)       beds, KPIs)   boarding ...)   for the
                 unsure)                                                                         charge nurse)
```

Code and AI split the work. The AI reads messy notes and writes the brief. Code does everything that must be exact and auditable: the triage level, bed and doctor allocation, wait times and KPIs. The AI's only influence on priority is `highRisk`, which can raise a patient's level and never lower it.

| Part | File |
| --- | --- |
| Shared types (the contract between backend and frontend) | `src/er/types.ts` |
| Triage, allocation, simulation, KPIs, alerts | `src/er/engine.ts` |
| AI prompts | `src/er/prompts.ts` |
| Cleaning AI output, rules fallback | `src/er/intake.ts` |
| Synthetic demo patients | `src/er/mock.ts` |
| AI routes | `src/app/api/intake`, `src/app/api/advise` |
| AI provider layer | `src/lib/ai/` |

---

## Demo safety

- **Saved answers:** every AI answer is saved in `.ai-cache/`. Run the exact demo once before judging; on stage it replays instantly, even without Wi-Fi.
- **Busy models:** on a 503 or 429 the app switches straight to `AI_FALLBACK_MODEL`, which has its own free quota. A brief server error gets one retry first.
- **Time limit:** if the AI hasn't answered within `AI_TIME_LIMIT` seconds (25 by default), the routes fall back to rules instead of keeping the audience waiting.
- **Deployed link (required):** Vercel builds `main` as production and every other branch as a preview. The project needs these environment variables: `AI_PROVIDER=gemini`, `AI_MODEL=gemini-3.5-flash-lite`, `AI_FALLBACK_MODEL=gemini-3.1-flash-lite` and `GEMINI_API_KEY`. Saved answers in `.ai-cache/` stay on your laptop; the deployed site asks the AI live.

## Who does what

Hafi works on **backend**, Haider on **frontend**. File ownership, the API contract, the task lists and the Git flow are in `AGENTS.md`, which Codex, Cursor and Copilot read automatically (Claude Code through `CLAUDE.md`). Each laptop has its own gitignored `ME.md` naming its person and role.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Amber "rules" badge everywhere | Key missing in `.env.local`, or the server was not restarted |
| `/api/status?ping=1` says `API key not valid` | Copy the key again from AI Studio |
| `models/... is not found` | Change `AI_MODEL` to a model listed at https://ai.google.dev/gemini-api/docs/models |
| Same old answer every time | That's the cache. Delete `.ai-cache/` |
| Port 3000 in use | `npm run dev -- -p 3001` |

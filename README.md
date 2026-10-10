# ER Command: nothing gets missed

Our project for the **Build with AI** module at AICON'26 (NUST). Assigned domain: **Health Operations**.

**Live:** https://aicon26-er-dashboard-taupe.vercel.app

Pakistani hospitals run far over capacity (about 0.6 hospital beds per 1,000 people, one of the lowest rates in the world), and in an overloaded hospital patients get missed. A hospital owner we spoke to named missed care as his biggest operational problem: missed doses, injections, drips, dressings and doctor visits. Care slips at two points:

- **At the door:** critical patients queue behind minor ones and wait on corridor trolleys.
- **On the ward:** orders written on the chart are forgotten in the rush.

ER Command fixes both the same way: **the AI reads the mess, code turns it into tasks with an owner and a due time, and the dashboard escalates anything overdue.**

## What it does

1. **Intake:** a nurse types or dictates a messy note in English, Urdu or Roman Urdu, or attaches a photo or PDF of a handwritten note, ambulance handover or referral slip. The AI turns it into clean vitals plus predicted needs, shows what it read, and flags anything it was unsure about.
2. **Triage and allocation:** an ESI-style checklist in code sets the urgency level (1–5); the AI can only raise priority. Code places patients in resus, acute or fast-track beds and matches doctors. Every waiting patient becomes a "see a doctor" task with a target time for their level.
3. **Care plans:** the nurse adds notes or a **photo/PDF of the treatment chart or a report**. The AI lists the patient's problems and the orders actually written, with the exact source words. It never invents a drug or a dose. Code adds labelled monitoring suggestions, and the doctor confirms the plan.
4. **Rounds:** code turns every order into timed tasks (BD → every 12 h, TDS → every 8 h). Nursing tasks go to the patient's nurse and reviews to their doctor. Everyone sees **Due now / Overdue**.
5. **Escalation:** overdue tasks, full beds and waiting critical patients raise alerts with one-click fixes; the AI writes a short brief for the charge nurse in English or Urdu.
6. **Evidence:** triage accuracy on 300 real visits and smart vs first-come allocation on real arrivals (below).

## Results on real data

We tested the full pipeline (AI reading of the nurse's note plus code triage) on 300 real, anonymised emergency visits (Moon et al. 2019) and compared it with the triage nurses on the same visits. Details are in [`data/ktas/README.md`](data/ktas/README.md).

| | Under-triage | Urgent patients rated non-urgent | Critical (level 1) patients caught |
| --- | --- | --- | --- |
| Triage nurses | 12.0% | 8 of 75 | 15 of 26 |
| **Our pipeline** | **6.3%** | **2 of 75** | **22 of 26** |
| Code alone, without the AI | 48.7% | 43 of 75 | |

- **The trade-off:** we rate more patients urgent than the experts did (over-triage 43% vs the nurses' 4%). ESI treats possible heart attack, stroke signs and GI bleeding as level 2, where the Korean experts often chose level 3. The patients we raised were admitted more often than those we didn't, and every raised level shows its reason so the nurse can lower it.
- **Reading care orders:** on 14 synthetic notes and handwritten-style charts we wrote (with traps), the AI found 73 of 73 orders with the right type and frequency, added none, and scheduled none of the 3 stopped or already-given drugs. This is a small, self-made test; see [`data/care/README.md`](data/care/README.md).
- **Smart allocation:** replaying real visits at peak load (17 arrivals an hour, averaged over 20 simulated 4-hour shifts), patients the experts rated urgent waited **about 1 minute instead of 39**, and about 58 patients were seen instead of 44.

## Built before AICON'26 (disclosed)

The rulebook allows templates and boilerplate if they are disclosed. Before the event we prepared a generic starter with no domain logic (the first commit, "Starter built before AICON'26 (disclosed)"):

- **AI provider layer** (`src/lib/ai/**`): plain `fetch` adapters for Gemini, OpenAI, Groq and Anthropic; backup model, time limit, answer cache.
- **A generic data → AI → metrics pipeline** with its UI shell and routes (`src/domains/**`, most of `src/components/**`, `src/lib/usePipeline.ts`, `/api/extract`, `/api/analyze`, `/api/summarize`, `/api/status`). The ER app does not use the pipeline; we are removing it as the ER screens replace it.

## Built during AICON'26

Everything for the ER dashboard, all visible in the commit history:

- **Backend (Hafi):** the contract (`src/er/types.ts`); the triage, allocation, simulation, care-plan and rounds engine (`src/er/engine.ts`); order reading (`src/er/orders.ts`, `/api/care`); note parsing and AI prompts (`src/er/intake.ts`, `src/er/prompts.ts`); the `/api/intake` and `/api/advise` routes; synthetic demo patients (`src/er/mock.ts`); the evaluation on real visits (`scripts/evaluate.ts`), the real-case replay pool (`src/er/replay.ts`) and the evidence numbers (`src/er/evidence.ts`).
- **Frontend:**
  - Haider built the first dashboard screens and the state hook.
  - The final "Instrument" UI (`src/components/command/`) was a full redesign by Hafi. It is modelled on award-winning bedside monitors and hospital command centres, and uses Atkinson Hyperlegible for legibility on a projector.
  - The patient overview and the care-team cards are adapted from Haider's later redesign.

## Third-party resources

- **Software:** Next.js, React, Tailwind CSS and the Google Gemini API.
- **Triage method:** triage levels are based on the published Emergency Severity Index (ESI).
- **Dataset:** Moon S-H, Shim JL, Park K-S, Park C-S (2019). Triage accuracy and causes of mistriage using the Korean Triage and Acuity Scale. *PLOS ONE* 14(9): e0216972. https://doi.org/10.1371/journal.pone.0216972. CC BY 4.0. These are 1,267 anonymised visits, used for evaluation and for the "real cases" replay.
- **Statistics:**
  - Hospital beds per 1,000 people: World Bank indicator SH.MED.BEDS.ZS (WHO data; Pakistan 0.6 in 2017).
  - Omitted doses: Keers et al. (2020), *PLOS ONE*, "Prevalence, nature and predictors of omitted medication doses in mental health hospitals": 14.6% of 18,664 scheduled doses omitted.
  - Paper charts: an audit of 772 paper prescription charts in an English hospital trust (*The Pharmaceutical Journal*, "Omitted and delayed medicines: the perils of paper prescription charts") found 37% of regular medicines omitted or delayed.
  - Missed nursing care in low- and middle-income countries: systematic review, PMC10015781.
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

- **Demo notes:** the 9 notes in `src/er/demo-notes.ts` have their real AI answers saved in `src/er/demo-answers.json`, which is part of the repo. They come back instantly with `cached: true`, on the laptop and on the live site, even if Gemini is down. The 2 sample photos for New arrival (`public/demo/slip-*.jpg`, see [`data/intake/README.md`](data/intake/README.md)) have saved answers too. If you change the prompt, run `node scripts/warm.ts` with the dev server running to refresh them all, or `node scripts/warm.ts slips` to refresh only the sample photos.
- **Saved answers on the laptop:** every other AI answer is saved in `.ai-cache/` on that machine, so a repeated demo replays instantly. The live site can't save files, so it asks Gemini fresh.
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

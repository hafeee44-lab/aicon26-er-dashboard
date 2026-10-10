<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes for AI coding assistants

We are building **ER Command**, an operations dashboard for overloaded Pakistani hospitals, for AICON'26 "Build with AI" (domain: Health Operations, SDG 3.8). **One problem: patients get missed.** A hospital owner we interviewed called missed care (missed doses, injections, drips, dressings and visits) his biggest problem. Care slips at two points:

- **At the door:** critical patients queue behind minor ones and wait on trolleys.
- **On the ward:** doses, drips, dressings and doctor visits are forgotten.

**One mechanism for both: the AI reads the mess, code turns it into tasks with an owner and a due time, and the dashboard escalates anything overdue.** Present it as one product, never as "a triage tool plus a reminder tool".

What the app does:

1. **Intake (door):** a nurse types or dictates a messy note ("67 saal, seene mein dard, BP 88/60, sat 94"). The AI turns it into clean vitals plus predicted needs; fields it was unsure about are flagged for the nurse to check.
2. **Triage and allocation by code:** an ESI-style checklist sets the level (1 = most urgent); the AI can only raise priority. The engine places patients in beds and matches doctors. Every waiting patient becomes a "see a doctor" task due within the level's target time (L1 now, L2 15 min, L3 30, L4 60, L5 120).
3. **Care plans (ward):** for any patient, the nurse adds notes or a **photo/PDF of a treatment chart or report**. The AI lists the patient's problems and the orders actually written (medicines, drips, dressings, monitoring, tests, reviews) with the exact source words. It never invents a drug or a dose. Code adds clearly labelled monitoring suggestions; the doctor confirms the plan.
4. **Rounds:** code turns every order into timed tasks (BD → every 12 h, TDS → every 8 h, ...). Nursing tasks go to the patient's nurse and reviews to the patient's doctor. Each person sees **Due now / Overdue**.
5. **Escalation and actions:** code raises alerts (overdue care tasks, no beds, critical patients waiting) with one-click fixes; the AI writes a short brief for the charge nurse in English or Urdu.
6. **Evidence:** triage accuracy on 300 real visits, smart vs first come on real arrivals, and AI reading accuracy.

Rules for all code:

- Keep code simple, no comments, double quotes and semicolons, no new dependencies unless both people agree.
- All AI calls go through `generateJSON()` in `src/lib/ai/index.ts`.
- Every API route must still work without an AI key (it answers with `meta.mode: "rules"`).
- Only synthetic or anonymised patient data. Never real patient names.
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

3. Run `npm install`, then `cp .env.example .env.local`. No AI key is needed to start: without one the API answers in "rules" mode with the same response shapes. For real AI, Haider makes his own free key at https://aistudio.google.com/apikey (his own key has its own quota) and pastes it after `GEMINI_API_KEY=` in `.env.local`.
4. Create the branch: `git switch frontend` if it exists on the remote, otherwise `git switch -c frontend && git push -u origin frontend`.
5. Run `npm run dev` and confirm http://localhost:3000 loads.
6. Tell them to start with tasks F1 to F4 below.

**Codex note:** if your sandbox blocks the network, `npm install`, `git pull` and `git push` will fail. Then ask your person to run that one command in their own terminal and carry on.

## Step 2: only edit files your role owns

| Area | Owner | Files |
| --- | --- | --- |
| API routes | backend | `src/app/api/**` |
| AI calls and prompts | backend | `src/lib/ai/**`, `src/er/prompts.ts` |
| Triage, allocation, simulation | backend | `src/er/engine.ts` |
| Note and order parsing and cleaning | backend | `src/er/intake.ts`, `src/er/orders.ts`, `src/er/demo-key.ts` |
| Demo patients, datasets, evidence, scripts | backend | `src/er/mock.ts`, `src/er/demo-*`, `src/er/replay.*`, `src/er/evidence.*`, `data/**`, `scripts/**` |
| Screens and components | frontend | `src/components/**`, `src/app/**/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` |
| Browser state | frontend | `src/er/useDepartment.ts` and any new `src/er/ui*.ts` helpers |
| Static files | frontend | `public/**` except `public/demo/**` (backend's sample charts) |
| Contract | both, by agreement | `src/er/types.ts`, `src/lib/types.ts` |
| Config and docs | both, by agreement | `package.json`, `package-lock.json`, config files, `*.md` |

If a task needs a change in a file your role does not own: stop, do not edit it, and tell your person exactly what to ask their teammate for (file, change, reason). Never "quickly fix" the other side.

**Old starter code:** `src/domains/**`, `src/lib/usePipeline.ts`, `src/lib/files.ts`, `src/lib/normalize.ts`, `src/lib/csv.ts`, `src/lib/prompts.ts`, the components other than `ui.tsx` and `Header.tsx`, and the routes `/api/extract`, `/api/analyze` and `/api/summarize` come from the generic starter we built before the event. They are not part of the ER app. Don't build on them. Frontend may reuse `src/components/ui.tsx` and `Header.tsx`. Each side deletes its own old files once nothing imports them.

## How the app fits together

The engine is plain TypeScript with no server code, so **the dashboard runs it in the browser**. Only two things go through the API: reading a nurse's note (`/api/intake`) and writing the advice message (`/api/advise`).

Every engine function returns a **new** `Department` and never changes the one you pass in, so it plugs straight into React state:

```ts
import { actions, admit, apply, clock, completeTask, confirmPlan, kpis, planCare, rounds, setPolicy, simulate, surge, tick, triage } from "@/er/engine";
import { mockDepartment, surgeCases } from "@/er/mock";
import { ARRIVALS_PER_HOUR, replayArrivals, replayCases } from "@/er/replay";

let d = mockDepartment();          // a busy ER at 08:45 with 8 patients already in
d = tick(d, 1);                    // one simulated minute passes
d = surge(d, surgeCases);          // 15 synthetic patients arrive at once
d = surge(d, replayCases.slice(0, 15)); // or 15 real anonymised ED visits (Moon et al. 2019)
d = setPolicy(d, "first_come");    // or "smart"
const k = kpis(d);                 // numbers for the KPI bar
const a = actions(d);              // problems with a suggested fix
d = apply(d, a[0].kind);           // the fix, applied
clock(d.now);                      // "08:46"
triage(intake, needs);             // { level, flags } before admitting
d = admit(d, intake, needs, review);
simulate(replayArrivals(ARRIVALS_PER_HOUR.busy, 240), "smart", 240); // a busy 4-hour shift of real visits

d = planCare(d, patientId, response.plan); // after POST /api/care: problems + orders + code suggestions, not live yet
d = confirmPlan(d, patientId);             // the doctor approves: orders become timed tasks
rounds(d);                                 // every task (see-doctor + care) with status, owner, lateBy, sorted overdue first
d = completeTask(d, taskId);               // mark a care task done (see-doctor tasks finish when a doctor sees the patient)
d = apply(d, "escalate_tasks");            // the escalation action marks overdue tasks as escalated
```

Useful facts for display:

- `Patient`: `level` 1–5 and `flags` (why it got that level), `needs` (specialty, resources, destination, highRisk, reason), `review` (fields the nurse should check), `stage`, `doctorId`, `bedId`.
- Wait time: `(p.seenAt ?? d.now) - p.arrivedAt` minutes. In the queue: `p.stage === "waiting"`. On a corridor trolley: `!p.bedId` and the stage is `with_doctor`, `awaiting_results` or `awaiting_bed`. Finished: `isDone(p)`.
- Doctors: `onShift: false` is the backup doctor; `isBusy(d, doctor)` says whether they are with a patient.
- Beds: `zone` is `resus`, `acute` or `fasttrack`; `patientId` is null when free. "Open overflow" adds beds `O1`–`O4`.
- Real cases: patients from `replayCases` carry `p.source` with `expertLevel`, `nurseLevel` and `outcome` (where they really went). Show it on the card, e.g. "Experts: L2 · Nurse: L3 · went to ward", so judges can see our level next to the experts' one. Synthetic patients have no `source`.
- Care tasks: `rounds(d)` returns `TaskView`s with `status` (`overdue` / `due` / `upcoming` / `done`), `lateBy` (minutes), `ownerName`, `patientName`, `kind`, `role` and `source` (where it came from, e.g. `From the notes: "Inj RL 1L 8 hourly"` or `Suggested by our rules: ...`). Show `source` as a tooltip or small line: it is our proof that the AI did not invent the task. Filter by person with `t.ownerId === doctor.id` or a nurse id.
- Staff: `d.nurses` (4 nurses) and `p.nurseId`; the patient's doctor is `p.doctorId`.
- Ward patients: `mockDepartment()` includes 3 admitted ward patients with confirmed plans (Bilal Hussain: broken ankle + diarrhoea, the owner's example; Nasreen Akhtar: pneumonia; Ghulam Rasool: diabetic foot). At 08:45 Bilal's drip and ortho review are already overdue, so the escalation shows at once. Their `stage` is `"admitted"`: `isDone(p)` is true for the ER board, but they are active on the ward, so show them wherever care tasks are shown.
- `p.plan`: `problems`, `orders` (each with `suggested`: true when our rules added it), `review` (what the AI was unsure about, shown in amber) and `confirmedAt` (null until the doctor confirms).
- Level colours (standard triage colours): 1 red, 2 orange, 3 yellow, 4 green, 5 blue.

## The contract

The two sides meet only here. Types live in `src/er/types.ts` (ER) and `src/lib/types.ts` (`StepMeta`, `Language`).

| Endpoint | Request body | Response |
| --- | --- | --- |
| `POST /api/intake` | `IntakeRequest`: `{ note }` | `IntakeResponse`: `{ intake, needs, review, meta }`. `review` lists field names the AI was unsure about (e.g. `"age"`, `"spo2"`, `"needs"`): highlight them for the nurse to check |
| `POST /api/advise` | `AdviseRequest`: `{ kpis, actions, language }` | `AdviseResponse`: `{ message, meta }`. `message` has up to 4 lines separated by `\n` |
| `POST /api/care` | `CareRequest`: `{ note, files?, patient? }`. `files` are `{ mimeType, data }` photos or PDFs (raw base64, no `data:` prefix); `patient` is `{ age, sex, complaint }` | `CareResponse`: `{ plan: { problems, orders, review }, meta }`. Pass `plan` to `planCare` |
| `GET /api/status` | optional `?ping=1` | `{ provider, model, fallbackModel, ready }` |

- Errors come back as `{ error }` with a 4xx status. The routes do not fail when the AI fails; they answer with `meta.mode: "rules"`. Show a small amber "rules" badge when that happens.
- Call `/api/advise` only when the person asks or when the list of action kinds changes, never on every tick: the free AI quota is small.
- Backend may add optional fields at any time. Renaming or removing a field needs both people to agree first.
- Any commit that changes a contract file starts with `CONTRACT:`. After pulling, run `git log --oneline --grep CONTRACT -5` and adapt to any new changes.

## Tasks

Tick these off in your commits. Ask your teammate before starting a task from the other list.

### Frontend (Haider)

**UI redesign, 2026-10-10.** The app now runs on the "Instrument" UI in `src/components/command/` (state in `useCommand.ts`). It covers F1–F12 below: the board, intake, actions and AI brief, floor, rounds, care plans and evidence. The old components in `src/components/er/`, plus `src/er/useDepartment.ts`, `src/er/uiCopy.ts` and `src/er/uiPreferences.ts`, are no longer used. Don't build on them; delete them once nothing imports them. Build new UI inside `src/components/command/` and follow the design rules:

- **Inspiration:** award-winning bedside monitors (Philips IntelliVue, GE CARESCAPE, Mindray) and hospital command centres. Numbers come first, and there is one level of navigation.
- **Color only means something clinical:** triage levels (`lvl-1`…`lvl-5`), alarms (`text-alert`, `text-warn`) or vital-sign monitor colors (`text-hr` green, `text-spo2` cyan, `text-bp` red, `text-rr` yellow). Always pair a color with a text label.
- **The AI is always labelled:** wherever the AI reads or writes (intake, care plans, the brief, predictions), show `AiMark` (✦ AI in pen blue) from `ui.tsx`, and start AI buttons with ✦. Pen blue (`text-pen`, `border-pen`) is only for the AI and for words quoted from a chart.
- **Everything else is ink:** use the tokens in `globals.css` (`bg-bg`, `bg-panel`, `bg-raised`, `border-line`, `text-ink`, `text-ink-2`, `text-ink-3`).
- **No gradients, drop shadows, rounded-2xl cards or icon-in-a-circle tiles.** Use hairline borders and 2px corners.
- **Type:** Atkinson Hyperlegible Next for text, `font-mono` (Atkinson Hyperlegible Mono) for every number and code, `.hand` (Caveat) only for words quoted from a chart, and `font-urdu` for Urdu.
- **Themes:** `data-theme="monitor"` (dark, default) and `"paper"` (light). Every new color must be a token defined for both themes.
- **Primitives:** `Button`, `Seg`, `LevelTile`, `Glyph`, `Badge`, `AiMark`, `Avatar`, `SectionHead` and `Micro` in `ui.tsx`.
- **Clock:** the clock runs at one fixed speed, `MINUTES_PER_SECOND` (5) in `useCommand.ts`. There is no speed picker, so a demo always plays the same way.
- **Waiting list order:** the board shows the engine's real pick order (`waitingQueue(d)` in `engine.ts`), numbered with NEXT first. Switching "Who goes first" reorders it at once, so the policy's effect is visible.

**Next for frontend:**

- [ ] **F13. Urdu interface:** today only the AI brief and the notes can be Urdu. Add an EN / اردو switch for the labels (Nastaliq, right to left).
- [ ] **F14. Accessibility pass:** keyboard through every overlay (a focus trap in the patient sheet and the intake console), plus screen-reader labels on the rounds markers.
- [ ] **F15. Demo rehearsal on the projector:** both themes, 1280×720 and 1920×1080, and on a phone.

The tasks below are the original plan, kept for the record; the redesign covers them.

- [ ] **F1. State hook** `src/er/useDepartment.ts`: holds the `Department` (starts from `mockDepartment()`), a play/pause clock that calls `tick(d, 1)` every second, speed ×1 / ×5 / ×15, and `surge`, `admit`, `apply`, `setPolicy`, `reset`. Derives `kpis(d)` and `actions(d)`.
- [ ] **F2. Dashboard page** `src/app/page.tsx` (replaces the old starter page): top bar with product name, clock (`clock(d.now)`), play/pause, speed, **Surge** button, policy toggle (first come / smart), reset. Surge offers "Demo cases" (`surgeCases`) and "Real cases" (the next 15 of `replayCases` on each press).
- [ ] **F3. KPI bar:** waiting, critical waiting, average and longest wait, time to doctor per level, free beds per zone, doctors busy / on shift, boarding, corridor, left without being seen.
- [ ] **F4. Patient board:** cards grouped by stage (waiting, with doctor, awaiting results, awaiting bed). Each card shows the level colour and number, name, age, sex, complaint, flags, need chips (specialty, tests, destination), doctor and bed, live wait time, a "check" badge when `review` is not empty and a "corridor" badge when there is no bed. Waiting is sorted by level, then wait.
- [ ] **F5. Beds and doctors panel:** bed grid by zone (free or the patient's level colour) and the doctor list (free / busy with whom, specialty, backup off shift).
- [ ] **F6. Actions panel:** each item from `actions(d)` with its severity colour and an **Apply** button calling `apply(d, kind)`. Below it, the advice box: a button that posts to `/api/advise` and shows the message, with an English / Urdu toggle (Urdu uses the `--font-nastaliq` font and right-to-left text).
- [ ] **F7. Intake form:** a text box (optional: a mic button using the browser's built-in speech recognition, no new packages) → `POST /api/intake` → editable fields with the `review` ones highlighted in amber → live level preview from `triage(intake, needs)` with its flags → **Admit** calls `admit(d, intake, needs, review)`.
  **Demo notes:** show `demoNotes` (`import { demoNotes } from "@/er/demo-notes"`, 9 notes from level 1 to 5 in Roman Urdu, Urdu and English) as one-tap example chips above the note box. Their AI answers are saved in the repo, so they come back instantly on stage and on the live site (`meta.cached: true`). Any other note goes to Gemini live.
- [ ] **F8. Evidence page** `src/app/evidence/page.tsx`: `import { evidence } from "@/er/evidence"` (type `Evidence` in `src/er/types.ts`); everything is pre-computed, so there is no fetch or loading state. Five sections:
  1. **Safer than triage nurses:** `evidence.triage` (nurse / ours / codeOnly) on 300 real visits. Lead with under-triage (`under`) and urgent patients missed (`urgentMissed` of `urgentTotal`), plus `evidence.level1` (critical patients caught: ours vs nurses). Show over-triage honestly, with this caption: "ESI rates possible heart attack, stroke and GI bleeding as level 2; the Korean experts often rated them 3".
  2. **The AI reads notes accurately:** `evidence.reading` (`correct`% of `fieldsChecked`, `invented` = 0).
  3. **Raised patients really were sicker:** `evidence.admitted.raised` (admitted % for raised vs kept) and `byOurLevel` as a falling bar chart.
  4. **The AI reads care orders safely:** `evidence.care`, e.g. "73 of 73 orders read, 0 invented, 0 stopped drugs scheduled". Add the caption "14 synthetic notes and charts we wrote".
  5. **Smart allocation:** `evidence.shifts` (typical / busy / peak, each averaged over 20 simulated 4-hour shifts of real visits). Bars for first come vs smart: `urgentWait.avg`, `minorWait`, `seen`; also show `corridor`.

  Credit the source under it: "Moon et al. 2019, PLOS ONE, CC BY 4.0".
- [ ] **F9. Polish:** loading, empty and error states, the amber "rules" badge, phone layout, projector check (stand 3 m back), page title in `layout.tsx`.

**Care plans and rounds (same product: build them into the existing screens, not as a separate app):**

- [ ] **F10. One story on the Overview:** the hero says "Nothing gets missed" (or similar). The KPI row shows `tasksOverdue` next to the L1–2 wait, plus `tasksOnTime` (% of tasks done on time). The top of the Overview lists the most overdue items from `rounds(d)`, both see-doctor and care tasks. The actions panel already includes `escalate_tasks`.
- [ ] **F11. Rounds tab:** `rounds(d)` grouped as Overdue / Due now / Next 2 hours, with a person filter (each doctor and nurse, with their counts). Each row shows the time, task, patient, owner, `lateBy` and `source`, and has a **Done** button (`completeTask`); hide the button for `see_doctor` tasks. Show an "escalated" badge when `escalatedAt` is set.
- [ ] **F12. Care plan on the patient:** on any patient (ER or ward), an "Add notes or chart" panel:
  - A text box, plus an upload using `readUpload` from `src/lib/files.ts`.
  - **"Try sample chart"** buttons from `demoCharts` (`@/er/demo-notes`). Fetch the image and send its bytes as base64 unchanged (no canvas), so the saved answer matches and returns instantly.
  - `demoCareNotes` as one-tap chips.
  - POST `/api/care`, then `planCare`. Show the problems, the orders with their `source` words (suggested ones labelled "suggested by rules") and the `review` warnings in amber.
  - **Doctor confirms plan** calls `confirmPlan`. Show the patient's next tasks on their card.

### Backend (Hafi)

- [x] **B1.** Contract, engine (triage, allocation, simulation, KPIs, actions), demo patients, `/api/intake`, `/api/advise`.
- [ ] **B2.** Real triage dataset (Kaggle "Emergency Service – Triage Application", Moon et al. 2019) in `data/`, plus `scripts/evaluate.ts`: how often our triage under- and over-triages compared with the expert level, next to the nurses' 14.7%.
- [x] **B3.** Replay pool: `src/er/replay.ts` with real anonymised visits (`replayCases`) and realistic arrival times (`replayArrivals`).
- [x] **B4.** `src/er/evidence.ts`: accuracy, admission and shift numbers for the evidence page (`scripts/evidence.ts` regenerates it).
- [x] **B5.** Demo notes with saved AI answers (`src/er/demo-notes.ts`, `scripts/warm.ts`), plus a prompt fix so resources are counted as in ESI.
- [x] **B7.** Care plans: `/api/care` (notes + photo/PDF → problems and orders), schedules, owners, `rounds`, task KPIs, escalation, ward patients in the demo, saved answers for the demo notes and the sample chart.
- [x] **B8.** AI order-reading accuracy on 14 synthetic notes and charts (`data/care/`): 73 of 73 orders, 0 invented, 0 stopped drugs scheduled. Available as `evidence.care`.
- [x] **B6.** Deployed to Vercel (see Deploy below); README results and third-party credits.

## Deploy

- Production: https://aicon26-er-dashboard-taupe.vercel.app (Vercel project `havlen/aicon26-er-dashboard`). Every merge to `main` redeploys it within a couple of minutes.
- **Only Hafi merges pull requests into `main`.** The Vercel project is on the free plan, which only deploys commits authored by Hafi. If Haider merges, the production deploy is blocked ("Git author haiderimran019 must have access to the project").
- Preview links for `frontend` are blocked for the same reason. Check your work with `npm run dev` locally, then on production once Hafi merges.

## Git

- Backend works on branch `backend`, frontend on branch `frontend`. Never commit straight to `main`.
- Start of every session, on your own branch: `git pull origin main`.
- Commit small and often. Open a pull request to `main` whenever something works (at least every 2–3 hours); Hafi merges it (see Deploy).
- Never commit `.env.local`, `ME.md` or any API key.
- Tell your teammate before adding a dependency. If `package-lock.json` conflicts, keep either version and run `npm install`.

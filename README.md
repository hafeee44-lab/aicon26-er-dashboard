# AICON'26: Build with AI

Our project for the **Build with AI** module at AICON'26 (NUST): **data in → AI in the loop → impact metric out**.

Teams are **assigned** a domain on the day. The repo starts with a generic starter and one placeholder domain (`example`); the project for our assigned domain is built during the event (see below).

## Built before AICON'26 (disclosed)

The rulebook allows templates and boilerplate if they are disclosed. We prepared this generic starter before the event. It contains no domain logic:

- **Pipeline and UI shell:** load data (sample, CSV, photo, PDF, pasted text) → AI extraction → AI analysis per row → impact metrics → AI summary in English or Urdu
- **AI provider layer:** plain `fetch` adapters for Gemini, OpenAI, Groq and Anthropic; backup model, time limit, answer cache, built-in rules when the AI is unavailable
- **API routes** for extract, analyze, summarize and status, plus data cleanup (numbers, dates, CSV)
- **Domain hooks:** `facts` (exact maths by code), `message` (ready-to-send text), field `hint`s and a `review` list for uncertain readings
- **A placeholder domain** (`src/domains/example.ts`: a toy task list) to show how a domain file works

Everything for our assigned domain is built at AICON'26: the problem, data, fields, prompts, rules, impact maths, real inputs, UI work and deployment. The commit history shows it.

## Built during AICON'26

_To fill in at the event: the domain, the problem, what we built and who built what._

## Third-party resources

Next.js, React, Tailwind CSS and the Google Gemini API. Data sources and statistics are listed here as we add them.

---

## 1. Run it the first time

You need Node.js 20 or newer (`node -v` to check).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and press **Run AI pipeline**. It works even without an AI key (it uses simple built-in rules, shown with an amber dot).

**Add the AI key** (an API key is a password that lets your code use Gemini):

1. Go to https://aistudio.google.com/apikey and create a free key.
2. Paste it into `.env.local` after `GEMINI_API_KEY=`.
3. Stop the server (Ctrl+C) and run `npm run dev` again.
4. Open http://localhost:3000/api/status?ping=1. You should see `"ping":"ok"`.

`.env.local` is your private settings file. Git ignores it, so your key never ends up on GitHub.

---

## 2. How the pipeline works

```
 Load data  ─►  AI extraction  ─►  AI risk analysis  ─►  Impact metrics  ─►  AI summary
 (sample,       (photo / PDF /      (per-record risk,     (rupees saved,      (English or
  CSV, text)     messy text →        reason, action,       hours saved,        Urdu, for the
                 clean rows)         value at risk)        counts)             end user)
```

| Step | What happens | File |
| --- | --- | --- |
| Load data | Sample data, a CSV, a photo/PDF, or pasted text | `src/components/InputPanel.tsx` |
| AI extraction | Gemini reads the photo or messy text and returns clean rows, plus a `review` list of values it wasn't sure about. Skipped if the data is already a clean CSV | `src/app/api/extract/route.ts` |
| AI risk analysis | Gemini scores every row: risk, score, reason, action, value at risk, and a ready-to-send Roman Urdu message | `src/app/api/analyze/route.ts` |
| Impact metrics | Plain code adds up the AI's numbers into the headline metric | `impact()` in `src/domains/<domain>.ts` |
| AI summary | Gemini writes a short summary + 3 actions, in English or Urdu | `src/app/api/summarize/route.ts` |

An **API route** is a small server function the page calls (like `/api/analyze`). It keeps your AI key on the server, never in the browser.

This is why the AI is "embedded in the pipeline, not just a UI layer": three separate AI steps transform the data, and the impact number is computed from what the AI decided.

Code and AI split the work. Code does the exact maths (ages, days overdue, totals, whether an answer matches a key) and hands it to the AI as `calculated` values. The AI does what code can't: read handwriting, understand Roman Urdu notes, judge urgency, explain its reasoning and write the message.

---

## 3. On the day: add your assigned domain

1. Create `src/domains/<id>.ts` (for example `health.ts`) with the same shape as `example.ts`.
2. Add the id to `DomainId` in `src/domains/types.ts` and register it in `src/domains/index.ts`. `types.ts` is a contract file, so that commit starts with `CONTRACT:`.
3. In `.env.local`, set `NEXT_PUBLIC_DOMAIN=<id>` and restart `npm run dev`.

While developing, the dashed dropdown in the top bar switches between domains instantly (it disappears in the real build).

---

## 4. Make it yours

Everything domain-specific lives in **one file**: `src/domains/<domain>.ts`.

| Property | What it controls |
| --- | --- |
| `product`, `tagline`, `problem`, `sdg`, `accent` | Name, hero text, SDG badge, brand colour |
| `fields` | The columns of your data. The AI extracts exactly these. An optional `hint` tells the extraction step what belongs in a field |
| `sample` | Demo data loaded by the **Sample data** tab |
| `analysis` | The instructions the AI follows when scoring each row. **This is your secret sauce** |
| `facts` | Optional. Exact numbers worked out by code for each row (ages, days left, totals) so the AI never does date maths |
| `message` | Optional. What ready-to-send message the AI writes for each row (an SMS reminder, a warning to a customer) |
| `valueLabel`, `formatValue` | What "value at risk" means (rupees, hours, items…) |
| `rules` | Simple backup logic used when there is no internet or key |
| `impact` | Turns the AI results into the 4 headline numbers. The first one is the big coloured card |

### Worked example: add a "Priority" column to the example

1. In `src/domains/example.ts`, add to `fields`:
   ```ts
   { key: "priority", label: "Priority", type: "text", hint: "High, medium or low" },
   ```
2. Add `priority: "High"` (etc.) to a few rows in `sample`.
3. Add one line to `analysis`:
   ```
   Rescue high-priority tasks first.
   ```

That's it. The AI now extracts priorities from photos, the table shows them, CSV export includes them, and actions take them into account.

### Writing a new domain

Keep the shape (`fields`, `sample`, `analysis`, `facts`, `message`, `rules`, `impact`) and write the contents for your problem. Let code do exact maths in `facts` (dates, counts, money) and let the AI do the judgement in `analysis`: models get date arithmetic wrong surprisingly often.

---

## 5. Project map

```
src/
├── app/
│   ├── page.tsx              the one page (header, hero, workspace)
│   ├── layout.tsx            fonts (incl. Urdu Nastaliq) and page title
│   └── api/
│       ├── extract/          AI step 1: photo / text → rows
│       ├── analyze/          AI step 2: rows → risk + action + value
│       ├── summarize/        AI step 3: metrics → summary (EN / UR)
│       └── status/           shows which AI is connected (?ping=1 tests it)
├── components/               UI pieces (cards, pipeline steps, results table)
├── domains/                  ★ your domain goes here
│   ├── example.ts            placeholder: copy its shape for your domain
│   └── helpers.ts            small maths/formatting helpers
└── lib/
    ├── ai/                   talks to Gemini / OpenAI / Groq / Claude
    ├── prompts.ts            the shared prompt templates
    ├── usePipeline.ts        runs the steps in order and tracks progress
    ├── normalize.ts          cleans AI output (numbers, dates, missing values)
    └── csv.ts                CSV read / write
```

---

## 6. Switching AI provider

Change three lines in `.env.local`:

```
AI_PROVIDER=groq              # gemini | openai | groq | anthropic
AI_MODEL=<model name from the provider's docs>
GROQ_API_KEY=...
```

Photos work with Gemini, OpenAI and Claude. PDFs work with Gemini and Claude.

---

## 7. Demo safety (read before you go on stage)

- **Saved answers:** every AI answer is saved in `.ai-cache/`. Run your exact demo once before judging; on stage it replays instantly, even if the Wi-Fi dies. Delete the folder to get fresh answers.
- **Busy models:** if the main model is overloaded (503) or out of quota (429, "too many requests"), the app switches straight to `AI_FALLBACK_MODEL`. Gemini's free-tier quotas are per model, so the backup has its own allowance. A brief server error (500/502/504) gets one retry first.
- **Time limit:** if the AI hasn't answered within `AI_TIME_LIMIT` seconds (25 by default), analysis and summary fall back to the built-in rules instead of keeping the audience waiting. The main model only gets part of that time, so the backup model still gets a chance. Photo extraction gets twice as long.
- **No internet:** risk analysis and summary fall back to the built-in rules, and the pipeline shows an amber "!" so you stay honest about it.
- **Deployed link (required for submission):** deploy to Vercel (free), test it on a phone, and keep it open in a second tab.
  1. Push to GitHub, then import the repo at https://vercel.com/new.
  2. Add the same variables from `.env.local` in the Vercel project settings.
- **Photos:** use JPG or PNG. iPhone HEIC photos may not load in Chrome; take a screenshot of the photo instead.
- **Excel files:** File → Save As → CSV.

---

## 8. Who does what

Hafi works on **backend**, his teammate on **frontend**. The full rules (who owns which files, the API contract between the two sides, and the Git branches) are in `AGENTS.md`. AI coding tools read it on their own:

| Tool | How it reads AGENTS.md |
| --- | --- |
| Copilot in VS Code, Cursor, Codex, Windsurf | Automatically |
| Claude Code | Through `CLAUDE.md` |
| Gemini CLI | Through `.gemini/settings.json` |

**First time on a laptop**, create a file called `ME.md` in the project folder (it is never committed, so each laptop has its own):

```
Name: <your name>
Role: frontend
```

Then start your AI with: *"Read AGENTS.md and ME.md, then …"*. It will only touch your side and tell you when it needs something from the other person.

**Git, once per person:**

```bash
git checkout -b backend      # or: git checkout -b frontend
git push -u origin backend   # or: frontend
```

---

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| Amber dot "No AI key" | Key missing in `.env.local`, or server not restarted |
| `/api/status?ping=1` says `API key not valid` | Copy the key again from AI Studio |
| `models/... is not found` | Change `AI_MODEL` to a model listed at https://ai.google.dev/gemini-api/docs/models |
| Same old answer every time | That's the cache. Delete `.ai-cache/` |
| Results marked "rules" after a pause | The AI took longer than `AI_TIME_LIMIT`. Raise it in `.env.local` or pick a faster `AI_MODEL` |
| Port 3000 in use | `npm run dev -- -p 3001` |

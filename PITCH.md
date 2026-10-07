# Winning the 5-minute demo

## How judging works (from the rulebook)

- One judge from our assigned domain gives **85%** of our score; the other domains' judges give **15%** between them. Expect a domain expert's questions.
- Judges may ask about the model, data, prompts, API, workflow or reasoning behind the AI. We must be able to explain every part.
- The rulebook lists five criteria and gives no weights:

| Criterion | What judges look for | How we earn it |
| --- | --- | --- |
| AI Integration Depth | How meaningfully AI contributes to the actual solution | Three AI steps inside the pipeline (extraction → analysis → summary). Code does the exact maths; the AI reads, judges and explains. Show AI and rules side by side |
| Problem-Solving Quality | A clear, important problem, effectively addressed | One real user, one painful problem, one sourced number that improves |
| Demo & Presentation | It works, and we explain it clearly | A live run on real-looking data in under 60 seconds, with a moment that uses something from the judges' hands |
| Creativity & SDG Impact | Originality, potential impact, SDG relevance | Pakistani context, Urdu and Roman Urdu input and output, a named SDG target |
| Industrial Impact | Industry relevance, adoption, lower costs, efficiency, measurable value | Name who would adopt it and what it saves them, in rupees or hours |

## The 5-minute script

The rulebook says we should be ready to explain each of these.

| Time | What you say / do |
| --- | --- |
| 0:00 – 0:40 | **The problem and why it matters.** One real person, one real number with its source. |
| 0:40 – 1:00 | **The solution in one line + SDG.** |
| 1:00 – 3:00 | **Live demo.** Upload a real photo → point at the pipeline steps as they tick → land on the big impact card → open the top row and read its reason, action and message → switch the summary to اردو. |
| 3:00 – 3:45 | **Where and how AI is used.** "AI reads the messy input, AI judges every record, code turns those judgements into numbers, AI explains it in Urdu. If the AI is down, rules keep it running." |
| 3:45 – 4:30 | **Impact and adoption.** The measured or expected impact, who would adopt it and what it saves them. |
| 4:30 – 5:00 | **What we built at AICON'26.** The generic starter was prepared before and disclosed; everything for this domain was built here. Who built what. End on the number. |

Rehearse with a timer at least 3 times. The person not talking drives the laptop.

## Questions judges will likely ask

**"What did you build during AICON'26?"**
Everything for the domain: problem, data, fields, prompts, rules, impact maths, real inputs, UI work and deployment. The generic starter (pipeline, AI layer, UI shell) was built before the event and is disclosed in the README. The commit history shows the rest.

**"Isn't this just a ChatGPT wrapper?"**
No. The AI is three steps of a data pipeline with structured outputs. Code checks its outputs and does the exact maths. Without the AI the app falls back to crude rules: show the difference (rules can't read a photo or understand Roman Urdu notes).

**"How do you know the impact number is real?"**
Code does the counting, and every assumption is written on the card with its source. Each is one line of code and we can change it live. Point at the hint text.

**"What if the AI is wrong?"**
Every row shows a reason, values the AI wasn't sure it read go on a review list, and missing AI answers fall back to rules marked "rules". Quote our own measured extraction accuracy from real photos.

**"What about data privacy?"**
We only use synthetic or anonymised data (made-up names, masked numbers), as the rulebook asks. The server keeps nothing except a local answer cache we can switch off (`AI_CACHE=off`). On Gemini's free tier Google may use inputs to improve its products, so for real users we'd move to the paid tier.

**"How would this scale, and who pays?"**
Same pipeline, more records: rows are processed in batches of 25. Name the adopter and what it saves them; the next step is a database and WhatsApp delivery.

## 30-hour plan for two people

| Hours | Goal |
| --- | --- |
| 0 – 1 | Briefing. Pick the user and problem inside the assigned domain; decide the headline metric and the adopter |
| 1 – 4 | Build the domain file on the starter: `fields`, `sample`, `analysis`, `facts`, `message`, `rules`, `impact`. Get one clean run. Frontend starts on the review list and message display |
| 4 – 10 | Real (synthetic) inputs: photos and messy text. Measure extraction accuracy. Tune the `analysis` prompt |
| 10 – 12 | Deploy to Vercel and test the deployed link on a phone |
| 12 – 18 | **Sleep in shifts.** Seriously. |
| 18 – 24 | Polish the UI for the projector, fill in "Built during AICON'26" in the README, write the pitch |
| 24 – 28 | Rehearse 3×, run the exact demo once to fill the cache, record the screen recording and journey clips |
| 28 – 30 | Freeze the code. Submit: repo link (with access), deployed link, demo presentation |

Keep committing small and often: the history is our proof of what was built here.

## Before you leave home

- [ ] Organisers have answered our questions about the disclosed starter
- [ ] `npm install` done and `npm run dev` works on both laptops
- [ ] Gemini key works (`/api/status?ping=1` → `ok`), plus a spare key from the teammate's account; daily limits checked at ai.dev/rate-limit
- [ ] Repo cloned by both people; we know how we'll give judges access (public repo or invites)
- [ ] A test deploy to Vercel works
- [ ] Synthetic sample photos ready: made-up names, masked phone numbers
- [ ] Phone hotspot tested as backup internet
- [ ] Chargers, HDMI/USB-C adapter, student IDs and registration confirmation

## On the day

- [ ] Both team members on site on Day 2 (attendance is mandatory and teamwork is observed)
- [ ] One person is the main contact for the organisers
- [ ] Phone clips for the optional "Document Your Journey" video (3 min max)

# Sample intake photos

Two synthetic documents **written by us** for the New arrival screen. They are not real patient records.

| File | What it is | What the AI reads |
| --- | --- | --- |
| `slip-ambulance.html` / `.jpg` | An ambulance handover for a road accident | 32 M, confused (GCS 13), BP 92/60, pulse 124, RR 26, SpO2 93%, pain 9/10: level 2 |
| `slip-referral.html` / `.jpg` | A referral slip from a basic health unit for a pregnant woman | 26 F, 32 weeks, BP 168/112, pulse 98, 98.6 °F: level 2 (high risk) |

The JPGs are the HTML files rendered in Chrome at 800 px wide. The same images are in `public/demo/` for the "Or a photo of a handwritten note" buttons in New arrival, and their AI answers are saved in `src/er/demo-answers.json` so they come back instantly. To refresh only these answers, run `node scripts/warm.ts slips` with the dev server running.

When a photo or PDF is attached, the intake prompt gets an extra section asking the AI to also return a line-by-line transcript, which the app shows with the vital signs highlighted. Typed notes still use the exact prompt that was evaluated in `data/ktas`.

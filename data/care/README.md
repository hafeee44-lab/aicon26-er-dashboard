# Care-order reading test set

14 synthetic cases **written by us**. These are not real patient records. Each case has an answer key (`cases.json`) of the orders a nurse should end up with.

- **12 typed notes:** English shorthand, Roman Urdu, Urdu script, a child, a pregnancy, a stroke, burns, a heart attack, sloppy mixed shorthand, and the hospital owner's own example (broken ankle plus diarrhoea).
- **2 photos of handwritten-style treatment charts:** `chart-ghulam.jpg` and `chart-asma.jpg`, rendered from the HTML files next to them. The same images are in `public/demo/` for the app's "Try sample chart" button.
- **Traps:**
  - an order with no frequency, which must be flagged;
  - a drug that was stopped (twice, once crossed out on a chart), which must not be scheduled;
  - a dose that was already given, which must not be scheduled.

`scripts/evaluate-care.ts` sends each case to `/api/care` (skipping saved answers) and scores, for each order:

- whether it was found;
- whether it has the right type (medication, drip, dressing, ...);
- whether it has the right frequency.

It also counts any extra orders, any stopped or given orders that were scheduled, and whether missing frequencies were flagged. Results are written to `evaluation.json`.

```bash
node scripts/evaluate-care.ts
```

## Results (2026-10-10)

| | Result |
| --- | --- |
| Orders found | 73 of 73 (100%) |
| Right type | 100% |
| Right frequency (BD, TDS, OD, SOS, "8 ghante baad", "roz", ...) | 100% |
| Orders the AI added that were not written | 0 |
| Stopped or already-given drugs scheduled | 0 of 3 (each was reported to the nurse instead) |
| Missing frequency flagged for the nurse | 1 of 1 |

13 of the 14 answers came from the backup model (`gemini-3.1-flash-lite`), because the main model was over its free quota that night.

**Caveat:** this is a small test set that we wrote ourselves, with clean synthetic charts. Real handwriting and real charts will be harder. That is why every order shows the words it came from, and why the doctor confirms the plan before any reminder starts.

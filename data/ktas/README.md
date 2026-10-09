# Korean ED triage records (Moon et al. 2019)

1,267 anonymised adult emergency department visits from two Korean hospitals (October 2016 to September 2017), each with the triage nurse's level (`KTAS_RN`), the level three triage experts agreed on (`KTAS_expert`), vitals, chief complaint, disposition and length of stay. It is the same data as the Kaggle dataset "Emergency Service – Triage Application".

**Source:** Moon S-H, Shim JL, Park K-S, Park C-S (2019). Triage accuracy and causes of mistriage using the Korean Triage and Acuity Scale. *PLOS ONE* 14(9): e0216972. https://doi.org/10.1371/journal.pone.0216972

**Licence:** CC BY 4.0 (© 2019 Moon et al.). We use it unchanged except for the CSV conversion.

| File | What it is |
| --- | --- |
| `moon2019-s1.xlsx` | S1 Appendix, "EMR review coding data", as published |
| `moon2019-s2-guideline.xlsx` | S2 Appendix, the authors' coding guideline |
| `moon2019.csv` | S1 converted to UTF-8 CSV |

## Codes

| Column | Values |
| --- | --- |
| Sex | 1 female, 2 male |
| Arrival mode | 1 walking, 2 ambulance (119), 3 private car, 4 private ambulance, 5 police and other public, 6 wheelchair, 7 other |
| Injury | 1 no, 2 yes |
| Mental | 1 alert, 2 responds to voice, 3 responds to pain, 4 unresponsive |
| Pain | 1 pain, 2 no pain |
| KTAS_RN, KTAS_expert | 1 (most urgent) to 5 |
| Disposition | 1 discharge, 2 ward, 3 ICU, 4 left against advice, 5 transfer, 6 death, 7 operation |
| mistriage | 0 correct, 1 over-triage, 2 under-triage |

## Notes

- `측불` means "not measurable" and `#NULL!` means no pain score; treat both as missing. SpO2 is blank for 688 visits.
- KTAS is the Korean adaptation of the Canadian triage scale, not ESI, but both run from 1 (resuscitation) to 5 (non-urgent).
- Checked against the paper: 1,081 correct, 55 over-triaged and 131 under-triaged (14.7% mistriage).

## How we evaluate our triage

`scripts/evaluate.ts` checks the whole intake path the app uses against the experts' levels:

1. For each visit it writes a short nurse-style note from what is known at the door: age, sex, chief complaint, how the patient arrived, the vitals, pain and consciousness. The diagnosis, disposition and length of stay are left out, because nobody knows them at triage.
2. It sends the note to `/api/intake` (the same route as the app) and runs our code triage on the AI's reading.
3. It compares three things with `KTAS_expert` on the same visits:
   - the triage nurses (`KTAS_RN`);
   - our pipeline (AI reading plus code triage);
   - our code alone with the true vitals and no AI.

It also checks how accurately the AI read the vitals, and whether it predicted admission vs discharge correctly.

The sample is all 26 expert level 1 visits plus a fixed random draw (seed 2026). Results go to `evaluation.json`.

With the dev server running:

```bash
EVAL_GAP_MS=3000 node scripts/evaluate.ts 300
```

AI answers are cached in `.ai-cache/`, so a rerun after an engine change costs no AI calls. `EVAL_GAP_MS` keeps the free Gemini tier under its per-minute limit.

After an evaluation, rebuild the app's data:

- `node scripts/replay.ts` writes the replay pool `src/er/replay.json`.
- `node scripts/evidence.ts` writes the evidence page numbers `src/er/evidence.json`.

## Results (300 visits, 2026-10-10)

Same 300 visits for all three, judged against `KTAS_expert`. The sample includes all 26 expert level 1 visits, so level 1 is over-represented compared with the full dataset.

| | Exact | Within 1 level | Under-triage | Over-triage | Urgent (expert 1–2) rated 3+ |
| --- | --- | --- | --- | --- | --- |
| Triage nurses | 84% | 99% | 12.0% | 4% | 8 of 75 |
| **Ours (AI reading + code triage)** | 42% | 92% | **7.3%** | 50% | **5 of 75** |
| Code only, true vitals, no AI | 41% | 84% | 48.7% | 10% | 43 of 75 |

- **Resuscitation cases:** we put 22 of the 26 expert level 1 patients at level 1; the nurses put 15.
- **Reading:** the AI read 99.9% of 2,859 fields correctly and invented no vitals.
- **Admission vs discharge:** predicted correctly for 65% of patients.
- **Why we over-triage:** ESI treats possible heart attack, stroke signs, fainting, GI bleeding and new seizures as level 2 ("high-risk situations"), and counts an X-ray plus stitches as two resources (level 3). The Korean scale puts many of these one level lower.
- **Raised patients were sicker:** expert level 3 patients we raised were admitted (ward, ICU, theatre or death) 44% of the time vs 33% for those we left at level 3; for expert level 4, 17% vs 9%. Admission rates also fall cleanly with our level: L1 79%, L2 43%, L3 26%, L4 10%, L5 0%.
- **Every raised level shows its reason**, and the nurse can lower it.

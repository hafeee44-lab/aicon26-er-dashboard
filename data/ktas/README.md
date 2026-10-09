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

# Silent demo script, ninety seconds

No voice. Every screen says what is happening, and the consensus waits are cut short with the transaction link left on screen. The site needs a browser wallet for the writing steps; use two wallets (two browser profiles) for the two applicants.

| Time | Screen | What the viewer sees |
|---|---|---|
| 0:00 | Landing, `/` | The headline "Read the rules, then come in." and the live gate card with its pass rate, attempts and passes, read from the contract. |
| 0:08 | Open a gate, `/new` | A handbook, one question with its rubric, the bank health panel, then **Open the gate**. |
| 0:22 | Two applicants, `/g/<id>/apply` | Two wallets press **Take this gate**. The page shows the three questions drawn for each address, and they differ. Answers are typed. |
| 0:40 | Attempt page, `/a/<id>` | "Validators are grading", then PASSED for one applicant and RETRY for the other, each with its three labels. |
| 0:55 | Discord | The bot (run with real Discord settings) gives the Member role to the one who passed. |
| 1:10 | Passes, `/me` | **Withdraw**: the passed applicant's fee comes back, and the failed fee sits in the owner's pool. |

Notes for recording:

- The gate to use is the seeded Kiln Discord gate for the reading, and a fresh gate for the `/new` step.
- The Discord step needs your own bot token, guild and role (see `HANDOFF.md`); it is the one step that cannot be filmed from this repository alone.
- Cut the waits: a judgment takes about thirty seconds to a minute on Studio Next.

# Portal entry

Counted with code (`python scripts/count_submission.py`). Every link and hash below comes from the records in this repository.

## Name

Doorman

## Category

Community tools

## Tags

community, onboarding

## Icon

`submission/doorman-icon-512.png` (512 x 512, the site's own mark, inside the circular-crop safe area)

## One-liner

A gate that checks you read the rules.

## Description

Doorman is a reading gate for online communities on GenLayer. A community writes its handbook and a bank of questions with a rubric each. An applicant opens an attempt with a small fee and gets three questions drawn from their own address. Validators grade each answer against the handbook and its rubric, and the verdict is computed in code from the three labels. A pass is recorded on chain and returns the fee, and a read-only bot grants the role. Deployed on Studio Next, with golden cases run through real consensus and published as they came out.

## Path steps

1. **Open a gate.** Go to Open a gate, connect a wallet (Connect wallet, Switch network, Get test GEN), write a handbook and at least six questions with rubrics, then press Open the gate.
2. **Take the gate.** Open the gate page and press Take this gate. Enter a Discord id (17 to 20 digits) and press Open attempt. The page shows the three questions drawn for your address.
3. **Answer.** Type an answer to each of the three questions and press Submit my answers.
4. **Grade.** Press Grade my answers. The page shows Validators are grading with the transaction link, then the attempt page shows the three labels and PASSED, RETRY, LOCKED or EXPIRED.
5. **Withdraw.** On Passes, press Withdraw to take back the fee that came back on a pass. The gate owner withdraws the pool of failed fees the same way.

## Proof

- Contract on Studio Next: https://explorer-studio-dev.genlayer.com/address/0xEEE15be43F84CF00c4799E5e776156055AAbd229
- Deploy transaction: https://explorer-studio-dev.genlayer.com/tx/0x2c48eff56b1558dc59cb7ceaef900e111b7e54ab7a1e4274dfc63831fdab2e91
- A pass (attempt 9, PASS PASS PASS): https://explorer-studio-dev.genlayer.com/tx/0x3e7868685199298f4477d8f6605538a107a956f8b55ba4588664130bcd888a49
- A retry (attempt 11, FAIL FAIL FAIL): https://explorer-studio-dev.genlayer.com/tx/0x579803188415b8f77c27a61f08179abb8cdc2d39887a8d1f3c87393bce12753f
- An expired attempt (attempt 12): https://explorer-studio-dev.genlayer.com/tx/0x78d5ca6b8079d251dedcb4bf3400bd8aa92be4f11860e49231d3227a68ed8e36
- The fee coming back on a pass: https://explorer-studio-dev.genlayer.com/tx/0xe8010b8f33995564ce3cbec1beb3e5a465b8c1cf96b65968673bf97d0f7e831c
- The pool paid to the owner: https://explorer-studio-dev.genlayer.com/tx/0x41e905b51b66940d602ee01954ac3175588f62c229f6b4ac1dbf1c5e5cc8389c
- Golden cases: 8 of 10 matched, held-out round reported as it came out (`eval/results.md`)
- 71 of 71 mutants caught (`docs/MUTATIONS.md`)

## Steward note

Known limits: a pass shows understanding of the handbook, not a unique human. The golden set missed two items, published as they came out. The runtime header differs from earlier projects because the live network rejected the old one the day this was built. The Discord bot is tested against a mock Discord, not a live server. Answers are public, so questions must never ask for personal details.

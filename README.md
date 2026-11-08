# Doorman

**A gate that checks you read the rules.** A reading gate for online communities on GenLayer.

A community writes its handbook and a bank of questions, each with a rubric. An applicant opens an attempt with a small fee and is dealt three questions drawn from their own address. They answer in their own words. GenLayer validators grade each answer against the handbook and the rubric, the verdict is computed in code from the three labels and the community's pass mark, a pass is recorded on chain and returns the fee, and a read-only bot grants the role.

- **Network:** GenLayer Studio Next, chain 61997 (`0xF22D`)
- **Contract:** [`0xEEE15be43F84CF00c4799E5e776156055AAbd229`](https://explorer-studio-dev.genlayer.com/address/0xEEE15be43F84CF00c4799E5e776156055AAbd229), deployed in [`0x2c48eff5…ab2e91`](https://explorer-studio-dev.genlayer.com/tx/0x2c48eff56b1558dc59cb7ceaef900e111b7e54ab7a1e4274dfc63831fdab2e91)
- **Source:** `contracts/doorman.py`, sha256 `9a180bd2877c0a59d755d009d560262ef499d23d0ac2762f9564b16345a5f0d6`, held to the deployed bytes by `scripts/verify.py`
- **Spec:** the build spec this repository implements is the source of truth for the rules below.

## How it works

| Result | Meaning | Fee |
|---|---|---|
| PASSED | at least the pass mark of answers show what their rubric asks | back, credited to the applicant |
| RETRY | below the pass mark, attempts left | to the pool |
| LOCKED | below the pass mark on the third attempt | to the pool, 7 day lock |
| EXPIRED | no answer inside the time limit | to the pool, counts as an attempt |

- A gate has a handbook of at most 3,000 characters and a bank of 6 to 20 questions (title at most 100, rubric at most 300). Each answer is at most 600 characters. The time limit is 10 to 60 minutes, the cooldown 1 to 48 hours, the pass mark 2 or 3 of 3, and an applicant gets 3 attempts per round.
- An attempt is dealt exactly 3 questions by `sha256("gate|address|attempt")`, the same in the contract and the browser (`tests/vectors.json`, 288 shared vectors).
- Validators compare **the three labels and nothing else**. The pass is computed in code.
- An open attempt grades against the handbook and questions it was dealt, whatever the owner edits later.
- Money moves in one place: `apply` takes the exact fee in, `judge` and `expire` only move balances, `withdraw` is the only payout.

One contract, ten methods: `open_gate`, `update_gate`, `apply`, `submit`, `judge`, `expire`, `withdraw` and the views `get_gate`, `get_attempt`, `get_pass`. The reference is generated from the source and lives in the docs.

## What was measured

Every number below was read from a file in this repository or from the chain.

| | |
|---|---|
| Offline tests | 163 passed, 5 live-network tests skipped without `DOORMAN_INTEGRATION=1` (`pytest`) |
| Bot tests | 5 passed (`node --test bot/test.mjs`) |
| Mutation testing | 71 of 71 defences broken one at a time and caught, each naming its test (`docs/MUTATIONS.md`) |
| Golden set through real consensus | **8 of 10** items matched (`eval/results.md`) |
| Held-out items | H1, H2 and H3 all came back FAIL; they have no expected label, reported as they came out |
| Deployed source vs repository | identical (`python scripts/verify.py`) |

The golden set missed two items: case 1 (`Ask in #help first, and never post a claim link.`, expected PASS, got FAIL) and case 4 (a handbook sentence pasted without answering, expected FAIL, got PASS). They are published as they came out. Nothing was tuned to pass: the prompt is the spec's, word for word, and `eval/golden.json` was hashed before the first run (`eval/golden.lock.json`).

A round of the golden run (R3) first ended UNDETERMINED, because the validators could not agree on the three labels. That is the labels-only comparison doing its job: a disagreement is never a verdict. The same attempt was judged again, and both tries are in the record.

## A note about the runtime

The `5jycge4q…` runtime header that earlier Studio Next projects used was rejected by the live network on the day this was built (`invalid_contract runner malformed`, for this contract and for an already deployed one alike). This contract uses `py-genlayer:babwp9t3…`, which the network accepted, and the local linter, which does not know that runner yet, reads a copy of the file with the old header swapped in. Only the header differs; the lint is over the same code. The authority on the real header is `gen_getContractSchemaForCode`, which `scripts/deploy.py` calls before every deploy.

## Layout

```text
contracts/doorman.py        one contract, the judge prompt pinned inside
contracts/FROZEN.json       address, deploy transaction, sha256 of the deployed bytes
tests/                      direct tests (116), static tests over the parsed source, live read-only tests
tests/vectors.json          dealing vectors written by the contract, checked against the browser
eval/                       golden.json (locked), kiln.json (the handbook), run_golden.py, results.md
scripts/                    deploy, verify, mutate, seed, gen_docs, gen_vectors, chain
bot/                        Discord bot: polls the chain, holds no wallet key, signs nothing
web/                        Next.js site and /docs (Fumadocs), writes signed in the visitor's wallet
docs/                       mutation table, seed record, reviewer-path record
submission/                 portal text, X post, silent demo script, 512 px icon
```

## Run it

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt     # Windows; use bin/ elsewhere
.venv/Scripts/python -m pytest                                            # offline, about five seconds
.venv/Scripts/python scripts/mutate.py --table docs/MUTATIONS.md          # break every defence, name its test
DOORMAN_INTEGRATION=1 .venv/Scripts/python -m pytest tests/test_integration.py   # read the live network

cd web && npm ci && npm run dev                                           # the site on http://localhost:3210
cd bot && npm install && DOORMAN_GATE=4 DOORMAN_DRY=1 node bot.mjs --once # the bot, without calling Discord
```

## Keys

No private key is on any server or in this repository. Test accounts live in `~/.doorman/accounts.json` on the build machine, and the scripts print only addresses. The site signs in the visitor's wallet. The one optional server secret is `OPENROUTER_API_KEY` for the "try this question" preview, which is off without it and never binding.

## Honest limits

A pass shows someone understood the handbook. It is not a unique human, it cannot see later conduct, answers are public, and it is only as good as the handbook and rubrics a community writes. The bot has been tested against a mock Discord, not a live server. See `/docs/more/limitations`.

## Records

- `docs/seed.studio-next.md`: the demonstration gates and attempts, with transactions
- `docs/reviewer-path.studio-next.md`: the reviewer's path walked from fresh accounts to finality
- `eval/results.md`: the golden and held-out results
- `docs/MUTATIONS.md`: the mutation table

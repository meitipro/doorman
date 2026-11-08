# Progress

One line per step, newest last.

- Read the build spec and the rules; chose Studio Next because the spec names it.
- Wrote `contracts/doorman.py` (ten methods) and the test double, harness and 116 direct tests.
- Found and fixed a real bug the tests caught: the validator and `judge` passed the label string back through the JSON reader.
- Static tests over the parsed source: write classification, fencing, storage types, word-for-word judge prompt.
- Mutation testing: first run 70 of 71, the escape (Discord id kept on the standing) closed by a test; then 71 of 71.
- The live network rejected the `5jycge4q` runtime header (`invalid_contract runner malformed`); switched to the `babwp9t3` runner the network accepted.
- Deployed to Studio Next; a live smoke loop (open, apply, answer, judge) worked.
- Golden set locked, run through real consensus: 8 of 10, held-out all FAIL, one round judged again after UNDETERMINED.
- Site, docs, bot, seed, reviewer path.

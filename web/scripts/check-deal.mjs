/**
 * Hold lib/deal.mjs to the contract's dealing: every vector in tests/vectors.json
 * (written from contracts/doorman.py by scripts/gen_vectors.py) must come out the same.
 *
 *   node scripts/check-deal.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { deal } from '../lib/deal.mjs';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const doc = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'tests', 'vectors.json'), 'utf8'));
let bad = 0;
for (const v of doc.vectors) {
  const got = deal(v.gate, v.address, v.attempt, v.bank);
  if (JSON.stringify(got) !== JSON.stringify(v.dealt)) {
    bad++;
    if (bad <= 5) console.error('MISMATCH', JSON.stringify(v), 'got', JSON.stringify(got));
  }
}
if (bad) {
  console.error(`${bad} of ${doc.vectors.length} vectors differ`);
  process.exit(1);
}
console.log(`lib/deal.mjs deals the contract's three on all ${doc.vectors.length} vectors`);

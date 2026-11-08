/**
 * Open a gate from a script, signing with a local test account.
 *
 *   node examples/open-gate.mjs <account name> <bank.json> [--dry]
 *
 * bank.json holds { "name", "handbook", "bank": [{ "q", "rubric" }, ...] }, the shape of eval/kiln.json.
 * With --dry nothing is sent: it prints the call and the fee deposit the SDK estimates for it.
 * The site's own signing code (lib/genlayer-core.mjs) does the work, through a stand-in EIP-1193 wallet.
 */
import fs from 'node:fs';

import { parseEther } from 'viem';

import { CONTRACT, feesFor, outcomeOf, submit, waitDecided, walletClient } from '../lib/genlayer-core.mjs';
import { ensureAccount, standinWallet } from '../scripts/standin-wallet.mjs';

const [name, file, ...flags] = process.argv.slice(2);
if (!name || !file) {
  console.error('usage: node examples/open-gate.mjs <account name> <bank.json> [--dry]');
  process.exit(2);
}
const gate = JSON.parse(fs.readFileSync(file, 'utf8'));
ensureAccount(name);
const { address, provider } = standinWallet(name);
const client = walletClient(address, provider);
const args = [gate.name, gate.handbook, JSON.stringify(gate.bank), 2, parseEther('1'), 10, 12];

if (flags.includes('--dry')) {
  const fees = await feesFor(client, 'open_gate', address);
  console.log(JSON.stringify({ contract: CONTRACT, method: 'open_gate', from: address, questions: gate.bank.length, pass_mark: 2, fee_gen: '1', time_limit_m: 10, cooldown_h: 12, feeValue: String(fees.feeValue) }));
  await new Promise((r) => setTimeout(r, 200));
  process.exit(0);
}
const hash = await submit(client, { method: 'open_gate', args, sender: address });
const outcome = outcomeOf(await waitDecided(client, hash, 'open_gate'));
console.log(JSON.stringify({ hash, ok: outcome.ok, gate_id: outcome.returned ?? null, refusal: outcome.refusal || null }));
process.exit(outcome.ok ? 0 : 1);

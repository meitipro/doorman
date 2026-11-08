/**
 * Walk the reviewer's path from fresh accounts, through the site's own code, to finality.
 *
 *   node scripts/reviewer-path.mjs https://<the site> [run-name]
 *
 * Three accounts made for this run, which have never touched the contract:
 *   1. faucet    the site's /api/faucet funds all three, sent the address in lower case
 *   2. open      the owner opens a gate with the Kiln handbook and bank
 *   3. pass      the first applicant applies with the exact fee, answers the three dealt
 *                questions well, and judge runs the real consensus
 *   4. fail      the second applicant answers badly: a RETRY, and the fee goes to the pool
 *   5. money     after finality the applicant withdraws the fee that came back, the owner
 *                withdraws the pool, and each wallet must have moved by exactly what the
 *                contract owed minus the fee the transaction's own accounting reports
 *   6. bot       the bot, in dry mode, finds the pass and says which Discord id gets the role
 *   7. read      the site's gate and attempt pages show what the chain holds
 *
 * Every write goes through lib/genlayer-core.mjs with the stand-in wallet, the
 * code the browser runs. Each step is written to
 * ../docs/reviewer-path.studio-next.json before anything is printed about it.
 * Keys stay in ~/.doorman/accounts.json and are never printed.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { deal } from '../lib/deal.mjs';
import { CONTRACT, outcomeOf, readClient, retried, submit, waitDecided, waitFinal, walletClient } from '../lib/genlayer-core.mjs';
import { balanceOf, ensureAccount, rpc, standinWallet } from './standin-wallet.mjs';

const site = (process.argv[2] ?? '').replace(/\/$/, '');
const run = process.argv[3] ?? 'rp1';
if (!site) {
  console.error('usage: node scripts/reviewer-path.mjs https://<site> [run-name]');
  process.exit(2);
}
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.join(here, '..', '..');
const RECORD = path.join(root, 'docs', 'reviewer-path.studio-next.json');
const kiln = JSON.parse(fs.readFileSync(path.join(root, 'eval', 'kiln.json'), 'utf8'));
const answers = JSON.parse(fs.readFileSync(path.join(root, 'eval', 'answers.json'), 'utf8'));
const record = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { runs: {} };
const log = (record.runs[run] ??= { site, contract: CONTRACT, started: new Date().toISOString(), steps: [] });
const save = () => fs.writeFileSync(RECORD, JSON.stringify(record, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
const GEN = 10n ** 18n;
const fmt = (wei) => `${Number(wei) / 1e18} GEN`;

const stepDone = (key) => log.steps.find((s) => s.key === key && s.ok);
const recorded = (key) => log.steps.some((s) => s.key === key);
function note(entry) {
  log.steps.push({ at: new Date().toISOString(), ...entry });
  save();
}

const reader = readClient();
async function view(functionName, args) {
  return JSON.parse(String(await retried(() => reader.readContract({ address: CONTRACT, functionName, args }), 5)));
}

/** The net fee a decided transaction cost its sender, from its own fee accounting. */
async function netFee(hash) {
  const tx = await rpc('eth_getTransactionByHash', [hash]).catch(() => null);
  const gen = await rpc('gen_getTransactionByHash', [hash]).catch(() => null);
  const acct = gen?.data?.fee_accounting ?? tx?.data?.fee_accounting;
  if (!acct) return null;
  return BigInt(acct.paid_fee_value ?? 0) - BigInt(acct.total_refunded ?? 0);
}

async function write(key, account, method, args, value = 0n, { final = false } = {}) {
  const prior = stepDone(key);
  if (prior) return prior;
  const { address, provider } = standinWallet(account);
  const client = walletClient(address, provider);
  const started = Date.now();
  const hash = await submit(client, { method, args, value, sender: address });
  const decided = await waitDecided(client, hash, method);
  const outcome = outcomeOf(decided);
  const entry = {
    key,
    method,
    account,
    from: address,
    args: args.map((a) => (typeof a === 'string' && a.length > 60 ? a.slice(0, 57) + '...' : a)),
    value: value.toString(),
    hash,
    ok: outcome.ok,
    status: outcome.status,
    execution: outcome.execution,
    returned: outcome.returned ?? null,
    refusal: outcome.refusal || null,
    seconds_to_decision: Math.round((Date.now() - started) / 1000),
  };
  if (final && outcome.ok) {
    const done = await waitFinal(client, hash);
    entry.final_status = outcomeOf(done).status;
  }
  note(entry);
  console.log(`${key}: ${method} ${entry.ok ? 'ok' : 'NOT OK ' + (entry.refusal ?? entry.status)} in ${entry.seconds_to_decision} s  ${hash}`);
  if (!entry.ok) throw new Error(`${key} failed: ${entry.refusal ?? entry.status}`);
  return entry;
}

// -- accounts ---------------------------------------------------------------------------------
const names = { owner: `review_owner_${run}`, passer: `review_pass_${run}`, failer: `review_fail_${run}` };
const addr = Object.fromEntries(Object.entries(names).map(([k, n]) => [k, ensureAccount(n)]));
if (!log.accounts) {
  const nonces = {};
  for (const [k, a] of Object.entries(addr)) nonces[k] = Number(await rpc('eth_getTransactionCount', [a, 'latest']));
  log.accounts = { ...addr, nonces_at_start: nonces };
  save();
  console.log(`accounts: ${JSON.stringify(addr)} nonces at start ${JSON.stringify(nonces)}`);
}

// -- 1. faucet, through the site --------------------------------------------------------------
for (const [who, address] of Object.entries(addr)) {
  const key = `faucet-${who}`;
  if (stepDone(key)) continue;
  const response = await fetch(`${site}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: address.toLowerCase() }),
  });
  const body = await response.json().catch(() => ({}));
  const after = await balanceOf(address);
  // 409 is the faucet saying the address already holds enough: what the first, timed-out call of an earlier try had paid.
  const ok = (response.ok && BigInt(body.after ?? 0) > BigInt(body.before ?? 0) && after > 0n) || (response.status === 409 && after >= 10n * GEN);
  note({ key, ok, http: response.status, sent_address: address.toLowerCase(), answered_address: body.address, before: body.before, after: body.after, read_after: after.toString(), error: body.error });
  console.log(`${key}: HTTP ${response.status} ${fmt(BigInt(body.before ?? 0))} -> ${fmt(after)} ${body.error ?? ''}`);
  if (!ok) throw new Error(`${key} did not fund ${address}`);
}

// -- 2. open a gate ----------------------------------------------------------------------------
const opened = await write('open-gate', names.owner, 'open_gate', [`Reviewer path ${run}: Kiln`, kiln.handbook, JSON.stringify(kiln.bank), 2, GEN, 10, 1]);
const gateId = Number(opened.returned);

/** apply, answer the dealt questions with `table`, and grade. Returns the attempt read back from the chain. */
async function takeGate(who, tag, table, discord) {
  const address = addr[who];
  const before = await view('get_pass', [gateId, address.toLowerCase()]);
  // The browser's own dealing, checked against the contract's answer before signing.
  const mine = deal(gateId, address, before.next_attempt_no, 8);
  if (JSON.stringify(mine) !== JSON.stringify(before.next_dealt)) throw new Error(`${tag}: the browser deals ${mine} but the contract deals ${before.next_dealt}`);
  if (!recorded(`${tag}-deal-check`)) note({ key: `${tag}-deal-check`, ok: true, browser: mine, contract: before.next_dealt });
  console.log(`  ${tag}: the browser and the contract both deal ${mine.map((i) => 'Q' + (i + 1)).join(' ')}`);
  const applied = await write(`${tag}-apply`, names[who], 'apply', [gateId, discord], GEN);
  const attemptId = Number(applied.returned);
  const attempt = await view('get_attempt', [attemptId]);
  const texts = attempt.dealt.map((i) => table[i]);
  await write(`${tag}-submit`, names[who], 'submit', [attemptId, JSON.stringify(texts)]);
  await write(`${tag}-judge`, names[who], 'judge', [attemptId]);
  const got = await view('get_attempt', [attemptId]);
  if (!recorded(`${tag}-read`)) note({ key: `${tag}-read`, ok: true, attempt_id: attemptId, status: got.status, labels: got.labels, dealt: got.dealt, fee_to: got.fee_to });
  console.log(`  -> ${got.status} ${got.labels.join(',')} (fee to ${got.fee_to})`);
  return { attemptId, got };
}

// -- 3 and 4. one applicant who reads the handbook, one who does not ----------------------------------
const pass = await takeGate('passer', 'pass', answers.good, '100000000000000011');
const fail = await takeGate('failer', 'fail', answers.weak, '100000000000000012');

// -- 5. the money, to the wei, after finality ----------------------------------------------------------
async function settle(who, label) {
  const key = `balance-${label}`;
  if (recorded(key)) return;
  const address = addr[who];
  const owed = BigInt((await view('get_pass', [gateId, address.toLowerCase()])).balance);
  if (owed === 0n) {
    note({ key, ok: false, owed: '0', why: 'nothing was owed, so there was nothing to withdraw' });
    console.log(`  ${label}: nothing owed`);
    return;
  }
  const before = await balanceOf(address);
  const w = await write(`${label}-withdraw`, names[who], 'withdraw', [], 0n, { final: true });
  const after = await balanceOf(address);
  const fee = await netFee(w.hash);
  const expected = fee === null ? null : before + owed - fee;
  note({ key, ok: expected === after, owed: owed.toString(), before: before.toString(), after: after.toString(), net_fee: fee?.toString() ?? null, expected: expected?.toString() ?? null, difference: expected === null ? null : (after - expected).toString() });
  console.log(`  ${label}: ${fmt(before)} -> ${fmt(after)}; owed ${fmt(owed)}, fee ${fee === null ? '?' : fmt(fee)}; ${expected === after ? 'exact to the wei' : 'difference ' + (expected === null ? '?' : (after - expected).toString()) + ' wei'}`);
}
if (pass.got.status === 'PASSED') await settle('passer', 'applicant');
await settle('owner', 'owner');

// -- 6. the bot, in dry mode, finds the pass -------------------------------------------------------------
if (!recorded('bot')) {
  const stateFile = path.join(os.tmpdir(), `doorman-bot-${run}.json`);
  fs.writeFileSync(stateFile, JSON.stringify({ lastAttempt: pass.attemptId - 1 }));
  const result = spawnSync('node', [path.join(root, 'bot', 'bot.mjs'), '--once'], {
    encoding: 'utf8',
    env: { ...process.env, DOORMAN_GATE: String(gateId), DOORMAN_DRY: '1', DOORMAN_STATE: stateFile, DOORMAN_POLL_SECONDS: '1' },
    cwd: path.join(root, 'bot'),
    timeout: 180000,
  });
  const out = (result.stdout + result.stderr).trim();
  const found = pass.got.status === 'PASSED' && out.includes('role granted to 100000000000000011');
  note({ key: 'bot', ok: pass.got.status !== 'PASSED' || found, output: out.split('\n').slice(0, 6) });
  console.log(`bot (dry): ${found ? 'found the pass and would grant the role to 100000000000000011' : 'did not find it: ' + out.slice(0, 160)}`);
}

// -- 7. the site shows what the chain holds -----------------------------------------------------------------
const pages = [
  ['page-gate', `${site}/g/${gateId}`, `Reviewer path ${run}`],
  ['page-pass-attempt', `${site}/a/${pass.attemptId}`, 'Rubric'],
  ['page-fail-attempt', `${site}/a/${fail.attemptId}`, 'Rubric'],
];
for (const [key, url, needle] of pages) {
  if (recorded(key)) continue;
  let ok = false;
  let status = 0;
  for (let attempt = 0; attempt < 6 && !ok; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 10000));
    const response = await fetch(url, { cache: 'no-store' });
    status = response.status;
    const html = await response.text();
    ok = response.ok && html.includes(needle);
  }
  note({ key, ok, url, http: status });
  console.log(`${key}: HTTP ${status} ${ok ? 'shows it' : 'MISSING'}  ${url}`);
}

log.finished = new Date().toISOString();
save();
console.log(`\nrecorded in docs/reviewer-path.studio-next.json (run ${run})`);
process.exit(0);

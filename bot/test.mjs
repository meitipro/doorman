/**
 * The bot against a mock chain and a mock Discord. Run: node --test bot/test.mjs
 *
 * What it proves: it grants once per pass, skips other gates and non-passes,
 * stops at an attempt that is not decided yet and looks again, retries a grant
 * Discord refused, never writes to the chain (the mock has no write at all),
 * and sends only the Discord REST call.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discordGranter, poll } from './bot.mjs';

function mockChain(attempts) {
  const calls = [];
  return {
    calls,
    async view(method, args) {
      calls.push(method);
      if (method === 'get_gate') return { found: false, totals: { gates: 3, attempts: attempts.length, passes: 0 } };
      if (method === 'get_attempt') return attempts[args[0] - 1] ?? { found: false };
      if (method === 'get_pass') {
        const a = attempts.find((x) => x.applicant.toLowerCase() === args[1] && x.gate_id === args[0] && x.status === 'PASSED');
        return a ? { found: true, passed: true, discord_id: a.discord_id } : { found: true, passed: false, discord_id: '' };
      }
      throw new Error('the bot must only read: ' + method);
    },
  };
}

const A = (id, gate_id, status, discord_id = '1000000000000000' + String(id).padStart(2, '0')) => ({
  found: true,
  id,
  gate_id,
  status,
  discord_id,
  applicant: '0x' + String(id).padStart(40, 'a'),
});

test('grants once per pass at the watched gate, and nothing else', async () => {
  const chain = mockChain([A(1, 7, 'PASSED'), A(2, 7, 'RETRY'), A(3, 5, 'PASSED'), A(4, 7, 'PASSED'), A(5, 7, 'EXPIRED')]);
  const given = [];
  const state = { lastAttempt: 0 };
  const out = await poll({ chain, gate: 7, state, grant: async (id) => (given.push(id), { ok: true }) });
  assert.deepEqual(given, ['100000000000000001', '100000000000000004']);
  assert.equal(out.length, 2);
  assert.equal(state.lastAttempt, 5);
  // A second poll finds nothing new and grants nothing.
  given.length = 0;
  await poll({ chain, gate: 7, state, grant: async (id) => (given.push(id), { ok: true }) });
  assert.deepEqual(given, []);
});

test('stops at an attempt that is not decided yet and picks it up next time', async () => {
  const attempts = [A(1, 7, 'PASSED'), A(2, 7, 'ANSWERED'), A(3, 7, 'PASSED')];
  const chain = mockChain(attempts);
  const given = [];
  const state = { lastAttempt: 0 };
  await poll({ chain, gate: 7, state, grant: async (id) => (given.push(id), { ok: true }) });
  assert.deepEqual(given, ['100000000000000001']);
  assert.equal(state.lastAttempt, 1);
  attempts[1] = A(2, 7, 'PASSED');
  await poll({ chain, gate: 7, state, grant: async (id) => (given.push(id), { ok: true }) });
  assert.deepEqual(given, ['100000000000000001', '100000000000000002', '100000000000000003']);
});

test('a grant Discord refused is tried again on the next poll', async () => {
  const chain = mockChain([A(1, 7, 'PASSED')]);
  const state = { lastAttempt: 0 };
  let ok = false;
  await poll({ chain, gate: 7, state, grant: async () => ({ ok, detail: 'not in the server' }) });
  assert.equal(state.lastAttempt, 0);
  ok = true;
  const out = await poll({ chain, gate: 7, state, grant: async () => ({ ok }) });
  assert.equal(out.length, 1);
  assert.equal(state.lastAttempt, 1);
});

test('only reads the chain: no write method exists on the mock, and none is called', async () => {
  const chain = mockChain([A(1, 7, 'PASSED')]);
  await poll({ chain, gate: 7, state: { lastAttempt: 0 }, grant: async () => ({ ok: true }) });
  assert.ok(chain.calls.every((m) => m.startsWith('get_')));
});

test('discord granter sends the role call with the bot token and reads the status', async () => {
  const seen = [];
  const make = (status) => async (url, init) => (seen.push({ url, init }), { status });
  const grant = discordGranter({ token: 'T', guild: 'G', role: 'R', fetchImpl: make(204) });
  assert.deepEqual(await grant('42'), { ok: true });
  assert.equal(seen[0].url, 'https://discord.com/api/v10/guilds/G/members/42/roles/R');
  assert.equal(seen[0].init.method, 'PUT');
  assert.equal(seen[0].init.headers.Authorization, 'Bot T');
  assert.equal((await discordGranter({ token: 'T', guild: 'G', role: 'R', fetchImpl: make(404) })('42')).ok, false);
  assert.equal((await discordGranter({ token: 'T', guild: 'G', role: 'R', fetchImpl: make(403) })('42')).detail, 'Discord answered 403');
  assert.deepEqual(await discordGranter({ token: '', guild: '', role: '', dry: true })('42'), { ok: true, detail: 'dry run' });
});

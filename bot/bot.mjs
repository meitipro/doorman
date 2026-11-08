/**
 * Doorman's Discord bot: reads passes from the chain and grants a role.
 *
 * It HOLDS NO WALLET KEY AND SIGNS NOTHING. Every call to the chain is a read
 * (get_gate, get_attempt, get_pass). Its only secret is the Discord bot token
 * in the environment.
 *
 *   DOORMAN_GATE=7 DISCORD_TOKEN=... DISCORD_GUILD=... DISCORD_ROLE=... npm run bot
 *
 * Each poll it reads the contract's totals, then every attempt it has not seen
 * yet. For an attempt at the watched gate that ended PASSED it confirms the
 * pass with get_pass(gate, applicant), which carries the Discord id, and grants
 * the role to that id. The last attempt read is kept in bot/state.json, so a
 * restart does not grant twice.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = process.env.DOORMAN_STATE ?? path.join(HERE, 'state.json');
const DISCORD = 'https://discord.com/api/v10';

/** The chain, as plain reads. `chain` is { view(method, args) -> parsed JSON }. */
export async function poll({ chain, gate, grant, state, log = () => {} }) {
  const totals = (await chain.view('get_gate', [0])).totals;
  const granted = [];
  for (let id = state.lastAttempt + 1; id <= totals.attempts; id++) {
    const attempt = await chain.view('get_attempt', [id]);
    if (!attempt.found) break;
    if (attempt.status === 'APPLIED' || attempt.status === 'ANSWERED') {
      // Not decided yet: stop here and look again next poll, so an attempt is never skipped.
      break;
    }
    state.lastAttempt = id;
    if (attempt.gate_id !== gate || attempt.status !== 'PASSED') continue;
    const pass = await chain.view('get_pass', [gate, attempt.applicant.toLowerCase()]);
    if (!pass.found || !pass.passed) {
      log(`attempt ${id}: get_pass does not agree, skipped`);
      continue;
    }
    const outcome = await grant(pass.discord_id);
    log(`attempt ${id}: ${outcome.ok ? 'role granted' : 'could not grant'} to ${pass.discord_id}${outcome.detail ? ` (${outcome.detail})` : ''}`);
    granted.push({ attempt: id, discord_id: pass.discord_id, ok: outcome.ok });
    if (!outcome.ok) {
      // Try this attempt again next poll.
      state.lastAttempt = id - 1;
      break;
    }
  }
  return granted;
}

/** Grant a role with Discord's REST API. 204 is success; the bot needs Manage Roles. */
export function discordGranter({ token, guild, role, fetchImpl = fetch, dry = false }) {
  return async (userId) => {
    if (dry) return { ok: true, detail: 'dry run' };
    const response = await fetchImpl(`${DISCORD}/guilds/${guild}/members/${userId}/roles/${role}`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${token}`, 'X-Audit-Log-Reason': 'Passed the Doorman gate' },
    });
    if (response.status === 204 || response.status === 200) return { ok: true };
    if (response.status === 404) return { ok: false, detail: 'that Discord id is not in the server' };
    return { ok: false, detail: `Discord answered ${response.status}` };
  };
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return { lastAttempt: 0 };
  }
}

export function saveState(state) {
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
}

async function liveChain() {
  const { createClient } = await import('genlayer-js');
  const { studioDevnet } = await import('genlayer-js/chains');
  const frozen = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'contracts', 'FROZEN.json'), 'utf8')).deployments['studio-next'];
  const rpc = process.env.DOORMAN_RPC ?? frozen.rpc;
  const address = process.env.DOORMAN_CONTRACT ?? frozen.doorman;
  const client = createClient({ chain: { ...studioDevnet, id: 61997, rpcUrls: { default: { http: [rpc] } } } });
  return {
    async view(method, args) {
      for (let attempt = 1; ; attempt++) {
        try {
          return JSON.parse(String(await client.readContract({ address, functionName: method, args })));
        } catch (error) {
          if (attempt >= 4) throw error;
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    },
  };
}

async function main() {
  const gate = Number(process.env.DOORMAN_GATE);
  const need = ['DOORMAN_GATE', 'DISCORD_TOKEN', 'DISCORD_GUILD', 'DISCORD_ROLE'].filter((k) => !process.env[k]);
  const dry = process.env.DOORMAN_DRY === '1';
  if (!Number.isInteger(gate) || gate < 1 || (need.length && !(dry && need.every((k) => k.startsWith('DISCORD_'))))) {
    console.error(`missing: ${need.join(', ') || 'a valid DOORMAN_GATE'}`);
    process.exit(2);
  }
  const grant = discordGranter({ token: process.env.DISCORD_TOKEN, guild: process.env.DISCORD_GUILD, role: process.env.DISCORD_ROLE, dry });
  const chain = await liveChain();
  const state = loadState();
  const every = Number(process.env.DOORMAN_POLL_SECONDS ?? 60) * 1000;
  const once = process.argv.includes('--once');
  for (;;) {
    try {
      await poll({ chain, gate, grant, state, log: (line) => console.log(new Date().toISOString(), line) });
      saveState(state);
    } catch (error) {
      console.error('poll failed, will try again:', String(error?.message ?? error).slice(0, 160));
    }
    if (once) break;
    await new Promise((r) => setTimeout(r, every));
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

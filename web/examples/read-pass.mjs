/**
 * Read a pass the way the Discord bot does: no wallet, no key, nothing signed.
 *
 *   node examples/read-pass.mjs <gate id> <wallet address>
 *
 * get_pass answers JSON text. `passed` is the door; `discord_id` is who to give the role to.
 */
import { CONTRACT, readClient, retried } from '../lib/genlayer-core.mjs';

const [gate, address] = process.argv.slice(2);
if (!gate || !address) {
  console.error('usage: node examples/read-pass.mjs <gate id> <wallet address>');
  process.exit(2);
}
const client = readClient();
const raw = await retried(() =>
  client.readContract({ address: CONTRACT, functionName: 'get_pass', args: [Number(gate), address.toLowerCase()] }),
);
const pass = JSON.parse(String(raw));
console.log(JSON.stringify({ found: pass.found, passed: pass.passed, passed_at: pass.passed_at, discord_id: pass.discord_id, attempts: pass.attempts, left: pass.left }));

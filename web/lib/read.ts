import { unstable_cache } from 'next/cache';

import { CONTRACT, readClient, retried } from './genlayer-core.mjs';
import type { Attempt, Gate, NotFound, Standing, Totals } from './types';

/**
 * Reads happen on the server, cached for a short while under tags.
 *
 * Studio Next rate-limits each IP, and every visitor's page view would
 * otherwise spend the server's budget. Shared reads are cached for 20 seconds;
 * after a decided write the page POSTs /api/refresh, which expires the tags it
 * touched, so the person who wrote sees their own result at once.
 */

const client = readClient();
const REVALIDATE = 20;

async function view<T>(method: string, args: (number | string)[]): Promise<T> {
  const raw = await retried(() => client.readContract({ address: CONTRACT, functionName: method, args }), 3);
  return JSON.parse(String(raw)) as T;
}

export const tags = {
  gates: 'gates',
  attempts: 'attempts',
  gate: (id: number) => `gate:${id}`,
  attempt: (id: number) => `attempt:${id}`,
  pass: (gate: number, address: string) => `pass:${gate}:${address.toLowerCase()}`,
};

export function getGate(id: number): Promise<Gate | NotFound> {
  return unstable_cache(() => view<Gate | NotFound>('get_gate', [id]), ['get_gate', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.gates, tags.gate(id)],
  })();
}

export function getAttempt(id: number): Promise<Attempt | NotFound> {
  return unstable_cache(() => view<Attempt | NotFound>('get_attempt', [id]), ['get_attempt', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.attempts, tags.attempt(id)],
  })();
}

export function getPass(gate: number, address: string): Promise<Standing | NotFound> {
  const who = address.toLowerCase();
  return unstable_cache(() => view<Standing | NotFound>('get_pass', [gate, who]), ['get_pass', String(gate), who], {
    revalidate: REVALIDATE,
    tags: [tags.attempts, tags.gate(gate), tags.pass(gate, who)],
  })();
}

/** The contract's own totals: gate 0 is not a gate, it answers the counts. */
export async function getTotals(): Promise<Totals> {
  const out = await getGate(0);
  return out.totals ?? { gates: 0, attempts: 0, passes: 0 };
}

/** Gates newest first. The contract has no list view, so this reads gate by gate; the cache keeps it to one pass per 20 seconds. */
export async function allGates(limit = 12): Promise<Gate[]> {
  const { gates } = await getTotals();
  const out: Gate[] = [];
  for (let id = gates; id >= 1 && out.length < limit; id--) {
    const g = await getGate(id);
    if (g.found) out.push(g);
  }
  return out;
}

/** The newest attempts across gates, newest first. */
export async function recentAttempts(count = 4): Promise<Attempt[]> {
  const { attempts } = await getTotals();
  const out: Attempt[] = [];
  for (let id = attempts; id >= 1 && out.length < count; id--) {
    const a = await getAttempt(id);
    if (a.found) out.push(a);
  }
  return out;
}

/** A read failed: say so in one sentence rather than failing the page. */
export function readError(error: unknown): string {
  const text = String((error as Error)?.message ?? error);
  if (/-32029|rate limit/i.test(text)) return 'Studio Next is rate limiting reads right now. Wait a minute and reload.';
  return 'Studio Next did not answer this read. Reload in a moment.';
}

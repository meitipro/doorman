import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getAttempt, getGate, getPass, getTotals, readError } from '@/lib/read';

/**
 * Everything one address has at every gate: passes, attempts, cooldowns and
 * the balance they can withdraw. The contract has no per-address list, so
 * this walks the gates through the cached reads.
 */
export async function GET(request: Request) {
  const address = String(new URL(request.url).searchParams.get('address') ?? '');
  if (!isAddress(address, { strict: false })) return NextResponse.json({ error: 'Send a wallet address.' }, { status: 400 });
  try {
    const { gates } = await getTotals();
    const rows = [];
    let balance = '0';
    let withdrawn = '0';
    for (let id = gates; id >= 1 && rows.length < 30; id--) {
      const [g, standing] = await Promise.all([getGate(id), getPass(id, address)]);
      if (!g.found || !standing.found) continue;
      balance = standing.balance;
      withdrawn = standing.withdrawn;
      const owner = g.owner.toLowerCase() === address.toLowerCase();
      if (standing.total === 0 && !owner) continue;
      const attempts = [];
      for (const aid of [...standing.attempts].reverse().slice(0, 5)) {
        const a = await getAttempt(aid);
        if (a.found) attempts.push({ id: a.id, attempt_no: a.attempt_no, status: a.status, passes: a.passes, labels: a.labels });
      }
      rows.push({
        gate: { id: g.id, name: g.name, pass_mark: g.pass_mark, owner, owner_balance: g.owner_balance, pool: g.pool },
        standing: {
          passed: standing.passed,
          passed_at: standing.passed_at,
          discord_id: standing.discord_id,
          left: standing.left,
          next_at: standing.next_at,
          locked_until: standing.locked_until,
          open_attempt: standing.open_attempt,
        },
        attempts,
      });
    }
    return NextResponse.json({ address, balance, withdrawn, rows });
  } catch (error) {
    return NextResponse.json({ error: readError(error) }, { status: 502 });
  }
}

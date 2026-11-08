import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getAttempt, getGate, getPass, readError } from '@/lib/read';

/**
 * Where an applicant stands at one gate: the gate, their position, and their
 * open attempt if they have one. Read on the server through the cached reads,
 * so a visitor's page view spends none of their own RPC budget.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const gate = Number(url.searchParams.get('gate'));
  const address = String(url.searchParams.get('address') ?? '');
  if (!Number.isInteger(gate) || gate < 1 || !isAddress(address, { strict: false })) {
    return NextResponse.json({ error: 'Send a gate id and a wallet address.' }, { status: 400 });
  }
  try {
    const [g, standing] = await Promise.all([getGate(gate), getPass(gate, address)]);
    if (!g.found || !standing.found) return NextResponse.json({ error: 'No such gate.' }, { status: 404 });
    const attempt = standing.open_attempt > 0 ? await getAttempt(standing.open_attempt) : null;
    return NextResponse.json({ gate: g, standing, attempt: attempt && attempt.found ? attempt : null });
  } catch (error) {
    return NextResponse.json({ error: readError(error) }, { status: 502 });
  }
}

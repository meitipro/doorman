'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Props = { attempt: { id: number; gate_id: number; status: string; deadline: number; applicant: string } };

/**
 * The two open writes, on an attempt page. judge and expire are open to anyone
 * on purpose, so a pass does not wait for the applicant to come back and an
 * applicant who walked away cannot hold their seat. The caller is recorded.
 */
export function AttemptActions({ attempt }: Props) {
  const w = useWallet();
  const router = useRouter();
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const late = Math.floor(Date.now() / 1000) > attempt.deadline;
  const grading = attempt.status === 'ANSWERED';
  const expirable = attempt.status === 'APPLIED' && late;
  if (!grading && !expirable) return null;
  const method = grading ? 'judge' : 'expire';
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';

  async function run() {
    const out = await send(w.account, method, [attempt.id], 0n, setTx);
    if (out.phase === 'done') {
      await refreshReads(['gates', 'attempts', `attempt:${attempt.id}`, `gate:${attempt.gate_id}`, `pass:${attempt.gate_id}:${attempt.applicant.toLowerCase()}`]);
      router.refresh();
    }
  }

  return (
    <div className="c-card pad">
      <p className="text-[14.5px]">
        {grading
          ? 'The answers are stored and waiting for the validators. Anyone may start the grading; you will be recorded as the caller.'
          : 'The time limit ended with no answers. Anyone may close this attempt; it counts as an attempt and the fee goes to the pool.'}
      </p>
      <div className="mt-3">
        <WalletGate action={grading ? 'start the grading' : 'close this attempt'}>
          <button className="c-btn solid" onClick={run} disabled={busy}>
            {busy ? (grading ? 'Validators are grading…' : 'Closing…') : grading ? 'Grade these answers' : 'Close attempt'}
          </button>
        </WalletGate>
      </div>
      {tx.hash && (
        <p className="mt-2">
          <Tx hash={tx.hash} />
        </p>
      )}
      {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
    </div>
  );
}

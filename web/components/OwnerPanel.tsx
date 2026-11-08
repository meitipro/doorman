'use client';

import { useState } from 'react';

import { gen } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

/** The owner's side of a gate: the pool they can withdraw. Shown only to the owner's connected account. */
export function OwnerPanel({ gateId, owner, balance }: { gateId: number; owner: string; balance: string }) {
  const w = useWallet();
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  if (!w.account || w.account.toLowerCase() !== owner.toLowerCase()) return null;
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  return (
    <section>
      <p className="c-eyebrow">You own this gate</p>
      <div className="c-card pad mt-3">
        <p className="text-[14.5px]">
          Failed and expired fees you can withdraw: <span className="mono">{gen(balance)}</span>
        </p>
        <WalletGate action="withdraw">
          <button
            className="c-btn solid mt-3"
            disabled={busy || balance === '0'}
            onClick={async () => {
              const out = await send(w.account, 'withdraw', [], 0n, setTx);
              if (out.phase === 'done') {
                await refreshReads(['gates', `gate:${gateId}`]);
                w.refreshBalance();
              }
            }}
          >
            {busy ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </WalletGate>
        {tx.hash && (
          <p className="mt-2">
            <Tx hash={tx.hash} />
          </p>
        )}
        {tx.phase === 'done' && <p className="c-muted mt-2 text-[13.5px]">Withdrawn. The pool is paid out at finality.</p>}
        {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
      </div>
    </section>
  );
}

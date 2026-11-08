'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { dayTime, gen } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Result, Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Row = {
  gate: { id: number; name: string; pass_mark: number; owner: boolean; owner_balance: string; pool: string };
  standing: { passed: boolean; passed_at: number; discord_id: string; left: number; next_at: number; locked_until: number; open_attempt: number };
  attempts: { id: number; attempt_no: number; status: 'APPLIED' | 'ANSWERED' | 'PASSED' | 'RETRY' | 'LOCKED' | 'EXPIRED'; passes: number; labels: string[] }[];
};
type Me = { address: string; balance: string; withdrawn: string; rows: Row[] };

export function MePanel() {
  const w = useWallet();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });

  const load = useCallback(async () => {
    if (!w.account) return;
    try {
      const response = await fetch(`/api/me?address=${w.account}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The chain did not answer.');
      setMe(body);
      setError('');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [w.account]);

  useEffect(() => {
    setMe(null);
    load();
  }, [load]);

  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  const now = Math.floor(Date.now() / 1000);

  async function withdraw() {
    const out = await send(w.account, 'withdraw', [], 0n, setTx);
    if (out.phase === 'done') {
      await refreshReads(['gates', 'attempts', ...(me?.rows ?? []).flatMap((r) => [`gate:${r.gate.id}`, `pass:${r.gate.id}:${w.account.toLowerCase()}`])]);
      await load();
      w.refreshBalance();
    }
  }

  return (
    <WalletGate action="see your passes">
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {!me && !error && <p className="c-muted flex items-center gap-2"><span className="c-spin" /> Reading your passes…</p>}
      {me && (
        <div className="flex flex-col gap-8">
          <div className="c-card pad flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="c-eyebrow">Balance you can withdraw</p>
              <p className="mono mt-1 text-[28px]">{gen(me.balance)}</p>
              <p className="c-faint mt-1 text-[12.5px]">Fees that came back on a pass, and the pool of any gate you own. Already withdrawn: {gen(me.withdrawn)}.</p>
            </div>
            <div>
              <button className="c-btn solid" onClick={withdraw} disabled={busy || me.balance === '0'}>
                {busy ? 'Withdrawing…' : 'Withdraw'}
              </button>
              {tx.hash && <p className="mt-2"><Tx hash={tx.hash} /></p>}
              {tx.phase === 'done' && <p className="c-muted mt-1 text-[13px]">Paid at finality.</p>}
              {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-1 text-[13px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
            </div>
          </div>

          {me.rows.length === 0 && <div className="c-note">No attempts from this address yet. <Link className="c-link" href="/#gates">Find a gate.</Link></div>}
          {me.rows.map((r) => (
            <section key={r.gate.id}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[19px] font-semibold"><Link href={`/g/${r.gate.id}`}>{r.gate.name}</Link></h2>
                <span className="c-faint mono text-[12px]">gate #{r.gate.id}</span>
                {r.standing.passed && <span className="c-verdict yes">Passed {dayTime(r.standing.passed_at)}</span>}
                {r.gate.owner && <span className="c-verdict">Owner · pool {gen(r.gate.pool)}</span>}
              </div>
              {!r.standing.passed && r.attempts.length > 0 && (
                <p className="c-muted mt-1 text-[13.5px]">
                  {r.standing.locked_until > now
                    ? `Locked until ${dayTime(r.standing.locked_until)}.`
                    : r.standing.next_at > now
                      ? `Cooldown running until ${dayTime(r.standing.next_at)}. ${r.standing.left} attempts left.`
                      : r.standing.open_attempt
                        ? 'You have an open attempt.'
                        : `${r.standing.left} attempts left.`}{' '}
                  <Link className="c-link" href={`/g/${r.gate.id}/apply`}>Open the gate</Link>
                </p>
              )}
              <div className="c-card mt-3 divide-y divide-[var(--line)]">
                {r.attempts.map((a) => (
                  <Link key={a.id} href={`/a/${a.id}`} className="c-row-link flex flex-wrap items-center gap-3 px-4 py-3">
                    <Result status={a.status} />
                    <span className="text-[14px]">Attempt {a.attempt_no}</span>
                    <span className="c-faint text-[13px]">{a.labels.length === 3 ? `${a.passes} of 3 passed` : ''}</span>
                    <span className="c-faint mono ml-auto text-[11.5px]">#{a.id}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </WalletGate>
  );
}

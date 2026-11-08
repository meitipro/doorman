'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { toWei } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Q = { q: string; rubric: string };

const START: Q[] = Array.from({ length: 6 }, () => ({ q: '', rubric: '' }));

/** n choose 3: how many different deals a bank of n questions allows. */
function deals(n: number): number {
  return n < 3 ? 0 : (n * (n - 1) * (n - 2)) / 6;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9#]{4,}/g) ?? [];
}

export function NewGate() {
  const w = useWallet();
  const [name, setName] = useState('');
  const [handbook, setHandbook] = useState('');
  const [bank, setBank] = useState<Q[]>(START);
  const [at, setAt] = useState(0);
  const [mark, setMark] = useState(2);
  const [fee, setFee] = useState('1');
  const [limit, setLimit] = useState(10);
  const [cooldown, setCooldown] = useState(12);
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const [gateId, setGateId] = useState(0);
  const [tryAnswer, setTryAnswer] = useState('');
  const [tryResult, setTryResult] = useState('');

  const feeWei = toWei(fee);
  const health = useMemo(() => {
    const filled = bank.filter((b) => b.q.trim() && b.rubric.trim());
    const okRubrics = filled.filter((b) => b.q.length <= 100 && b.rubric.length <= 300).length;
    const hand = new Set(words(handbook));
    const covered = filled.filter((b) => {
      const ws = words(b.rubric);
      return ws.length > 0 && ws.filter((x) => hand.has(x)).length / ws.length >= 0.4;
    }).length;
    return { filled: filled.length, okRubrics, covered };
  }, [bank, handbook]);

  const problems: string[] = [];
  if (!name.trim()) problems.push('Name the gate.');
  if (!handbook.trim()) problems.push('Write the handbook.');
  if (handbook.length > 3000) problems.push('The handbook is over 3,000 characters.');
  if (health.filled < 6) problems.push('A bank needs 6 to 20 complete questions.');
  if (new Set(bank.map((b) => b.q.trim().toLowerCase())).size !== bank.length) problems.push('Two questions are the same.');
  if (bank.some((b) => b.q.includes('\n') || b.rubric.includes('\n'))) problems.push('Questions and rubrics are one line each.');
  if (feeWei === null) problems.push('The fee is a number of GEN, such as 1 or 0.5.');
  else if (feeWei > 1000n * 10n ** 18n) problems.push('The fee is at most 1,000 GEN.');
  const ready = problems.length === 0;
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';

  const set = (i: number, patch: Partial<Q>) => setBank(bank.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function open() {
    const out = await send(
      w.account,
      'open_gate',
      [name.trim(), handbook.trim(), JSON.stringify(bank.map((b) => ({ q: b.q.trim(), rubric: b.rubric.trim() }))), mark, feeWei ?? 0n, limit, cooldown],
      0n,
      setTx,
    );
    if (out.phase === 'done' && typeof out.returned === 'number') {
      setGateId(out.returned);
      await refreshReads(['gates', `gate:${out.returned}`]);
    }
  }

  async function tryQuestion() {
    setTryResult('Asking one model…');
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handbook, question: bank[at].q, rubric: bank[at].rubric, answer: tryAnswer }),
      });
      const body = await response.json();
      setTryResult(response.ok ? `${body.label} (a preview from one model, never binding)` : body.error);
    } catch {
      setTryResult('The preview did not answer.');
    }
  }

  if (gateId > 0) {
    return (
      <div className="c-card pad">
        <span className="c-verdict yes">Open</span>
        <p className="serif mt-3 text-[24px]">Gate #{gateId} is open.</p>
        <p className="c-muted mt-2 text-[14.5px]">Share the link. The bot polls <span className="mono">get_pass</span> for this gate and grants the role; see the quickstart.</p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link className="c-btn solid" href={`/g/${gateId}`}>Open the gate page</Link>
          <Link className="c-btn" href="/docs/reference/bot">Connect the bot</Link>
        </p>
        {tx.hash && <p className="mt-3"><Tx hash={tx.hash} /></p>}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-6">
        <div>
          <label className="c-label" htmlFor="name">Gate name</label>
          <input id="name" className="c-input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kiln Discord" />
        </div>
        <div>
          <label className="c-label" htmlFor="handbook">Handbook</label>
          <textarea id="handbook" className="c-textarea" style={{ minHeight: 220 }} value={handbook} onChange={(e) => setHandbook(e.target.value)} placeholder="The rules, in your own words. This is the only source of truth the validators use." />
          <p className="c-faint mono mt-1 text-right text-[11.5px]">{handbook.length} / 3,000</p>
        </div>
        <div>
          <p className="c-label">Question bank, one question at a time</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {bank.map((b, i) => (
              <button key={i} className="c-chip" style={i === at ? { borderColor: 'var(--violet)', color: 'var(--violet-ink)' } : undefined} onClick={() => setAt(i)}>
                Q{i + 1} {b.q.trim() ? b.q.trim().split(/\s+/)[0].toUpperCase().slice(0, 8) : ''}
              </button>
            ))}
            {bank.length < 20 && (
              <button className="c-chip" onClick={() => { setBank([...bank, { q: '', rubric: '' }]); setAt(bank.length); }}>+ add</button>
            )}
            {bank.length > 6 && (
              <button className="c-chip" onClick={() => { setBank(bank.filter((_, j) => j !== at)); setAt(Math.max(0, at - 1)); }}>remove Q{at + 1}</button>
            )}
          </div>
          <label className="c-label" htmlFor="q">Question {at + 1}</label>
          <input id="q" className="c-input" maxLength={100} value={bank[at].q} onChange={(e) => set(at, { q: e.target.value })} placeholder="Why does the team unlock schedule matter before you post about price?" />
          <p className="c-faint mono mt-1 text-right text-[11.5px]">{bank[at].q.length} / 100</p>
          <label className="c-label mt-3" htmlFor="rubric">Rubric: what a passing answer must show</label>
          <textarea id="rubric" className="c-textarea" maxLength={300} value={bank[at].rubric} onChange={(e) => set(at, { rubric: e.target.value.replace(/\n/g, ' ') })} placeholder="Names the reason and the rule it connects to. Both points are needed." />
          <p className="c-faint mono mt-1 text-right text-[11.5px]">{bank[at].rubric.length} / 300</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="c-label" htmlFor="mark">Pass mark</label>
            <select id="mark" className="c-select" value={mark} onChange={(e) => setMark(Number(e.target.value))}>
              <option value={2}>2 of 3</option>
              <option value={3}>3 of 3</option>
            </select>
          </div>
          <div>
            <label className="c-label" htmlFor="fee">Fee (GEN)</label>
            <input id="fee" className="c-input mono" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <label className="c-label" htmlFor="limit">Time limit</label>
            <select id="limit" className="c-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div>
            <label className="c-label" htmlFor="cooldown">Cooldown</label>
            <select id="cooldown" className="c-select" value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))}>
              {[1, 6, 12, 24, 48].map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </div>
        </div>
        {problems.length > 0 && (
          <ul className="c-faint list-disc pl-5 text-[13.5px]">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
        <WalletGate action="open a gate">
          <div>
            <button className="c-btn solid" onClick={open} disabled={!ready || busy}>
              {busy ? 'Opening…' : 'Open the gate'}
            </button>
            <p className="c-faint mt-2 text-[12.5px]">Network fee estimated by your wallet. Answers are public, so never write a question that asks for personal details.</p>
            {tx.phase === 'deciding' && <p className="c-muted mt-2 text-[13.5px]">Validators are recording it… {tx.hash && <Tx hash={tx.hash} />}</p>}
            {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
          </div>
        </WalletGate>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="c-card pad">
          <p className="c-eyebrow">Try this question {at + 1}</p>
          <p className="c-faint mt-1 text-[12.5px]">One model, a preview only, not binding.</p>
          <textarea className="c-textarea mt-3" style={{ minHeight: 80 }} maxLength={600} value={tryAnswer} onChange={(e) => setTryAnswer(e.target.value)} placeholder="A sample answer" />
          <button className="c-btn small mt-2" onClick={tryQuestion} disabled={!tryAnswer.trim() || !bank[at].q.trim() || !bank[at].rubric.trim() || !handbook.trim()}>Grade this sample</button>
          {tryResult && <p className="c-muted mt-2 text-[13.5px]">{tryResult}</p>}
        </div>
        <div className="c-card pad">
          <p className="c-eyebrow">Bank health</p>
          <dl className="c-kv mt-3">
            <div><dt>Questions</dt><dd>{health.filled} of 20, enough for {deals(health.filled).toLocaleString('en-US')} deals</dd></div>
            <div><dt>Rubrics checked</dt><dd>{health.okRubrics} of {bank.length}</dd></div>
            <div><dt>Handbook covers</dt><dd>{health.covered} of {bank.length}</dd></div>
          </dl>
          <p className="c-faint mt-3 text-[12.5px]">Counts from the browser. The validators do the grading.</p>
        </div>
      </aside>
    </div>
  );
}

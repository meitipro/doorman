'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { deal } from '@/lib/deal.mjs';
import { day, dayTime, gen, plural } from '@/lib/format';
import type { Attempt, Gate, Standing } from '@/lib/types';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Result, Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type State = { gate: Gate; standing: Standing; attempt: Attempt | null };

const MAX_ANSWER = 600;

function TxLine({ tx, working }: { tx: TxState; working: string }) {
  if (tx.phase === 'idle') return null;
  return (
    <div className="mt-3 text-[13.5px]">
      {tx.phase === 'signing' && <p className="c-muted">Confirm in your wallet…</p>}
      {tx.phase === 'deciding' && (
        <p className="c-muted flex items-center gap-2">
          <span className="c-spin" /> {working} {tx.hash && <Tx hash={tx.hash} />}
        </p>
      )}
      {tx.phase === 'done' && (
        <p className="c-muted">
          Done{tx.seconds ? ` in ${tx.seconds} seconds` : ''}. {tx.hash && <Tx hash={tx.hash} />}
        </p>
      )}
      {(tx.phase === 'refused' || tx.phase === 'error') && (
        <p style={{ color: 'var(--danger)' }}>
          {tx.message} {tx.hash && <Tx hash={tx.hash} />}
        </p>
      )}
    </div>
  );
}

function Timer({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, deadline * 1000 - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return <span className="mono">{left === 0 ? '00:00' : `${mm}:${ss}`}</span>;
}

export function ApplyFlow({ gateId }: { gateId: number }) {
  const w = useWallet();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [discord, setDiscord] = useState('');
  const [answers, setAnswers] = useState(['', '', '']);
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const [verdictId, setVerdictId] = useState(0);

  useEffect(() => {
    try {
      setDiscord(localStorage.getItem('doorman:discord') ?? '');
    } catch {
      /* private window */
    }
  }, []);

  const load = useCallback(async () => {
    if (!w.account) return;
    try {
      const response = await fetch(`/api/state?gate=${gateId}&address=${w.account}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The chain did not answer.');
      setState(body as State);
      setError('');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [gateId, w.account]);

  useEffect(() => {
    setState(null);
    load();
  }, [load]);

  const reload = useCallback(async () => {
    if (w.account) await refreshReads(['gates', 'attempts', `gate:${gateId}`, `pass:${gateId}:${w.account.toLowerCase()}`]);
    await load();
    w.refreshBalance();
  }, [gateId, load, w]);

  const preview = useMemo(() => {
    if (!state || !w.account) return null;
    const mine = deal(gateId, w.account, state.standing.next_attempt_no, state.gate.bank_size);
    const theirs = state.standing.next_dealt;
    return { mine, same: JSON.stringify(mine) === JSON.stringify(theirs) };
  }, [state, w.account, gateId]);

  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  const g = state?.gate;
  const st = state?.standing;
  const attempt = state?.attempt;
  const now = Math.floor(Date.now() / 1000);
  const feeText = g ? (g.fee === '0' ? 'no fee' : gen(g.fee)) : '';

  async function open() {
    if (!g) return;
    try {
      localStorage.setItem('doorman:discord', discord);
    } catch {
      /* ignored */
    }
    const out = await send(w.account, 'apply', [gateId, discord.trim()], BigInt(g.fee), setTx);
    if (out.phase === 'done') {
      setAnswers(['', '', '']);
      await reload();
    }
  }

  async function submit() {
    if (!attempt) return;
    const out = await send(w.account, 'submit', [attempt.id, JSON.stringify(answers)], 0n, setTx);
    if (out.phase === 'done') await reload();
  }

  async function grade() {
    if (!attempt) return;
    setTx({ phase: 'idle' });
    const out = await send(w.account, 'judge', [attempt.id], 0n, setTx);
    if (out.phase === 'done') {
      setVerdictId(attempt.id);
      await refreshReads(['gates', 'attempts', `attempt:${attempt.id}`, `gate:${gateId}`, `pass:${gateId}:${w.account.toLowerCase()}`]);
      await reload();
    }
  }

  async function expire() {
    if (!attempt) return;
    const out = await send(w.account, 'expire', [attempt.id], 0n, setTx);
    if (out.phase === 'done') {
      setVerdictId(attempt.id);
      await reload();
    }
  }

  const outcomes = (
    <div className="c-card pad">
      <p className="c-eyebrow">What happens to your {feeText}</p>
      <dl className="c-kv mt-3">
        <div><dt>PASSED</dt><dd>back, credited to you</dd></div>
        <div><dt>RETRY</dt><dd>to the pool</dd></div>
        <div><dt>LOCKED</dt><dd>to the pool</dd></div>
        <div><dt>EXPIRED</dt><dd>to the pool</dd></div>
      </dl>
      <p className="c-faint mt-3 text-[12.5px]">You take back a returned fee with Withdraw on the Passes page.</p>
    </div>
  );

  let body: React.ReactNode = null;
  if (error) body = <p style={{ color: 'var(--danger)' }}>{error}</p>;
  else if (!state || !g || !st) body = <p className="c-muted flex items-center gap-2"><span className="c-spin" /> Reading your position at this gate…</p>;
  else if (st.passed) {
    body = (
      <div className="c-card pad">
        <span className="c-verdict yes">Passed</span>
        <p className="serif mt-3 text-[22px]">You are through.</p>
        <p className="c-muted mt-2 text-[14.5px]">
          Recorded {dayTime(st.passed_at)} for Discord id <span className="mono">{st.discord_id}</span>. The community&apos;s bot reads this and grants the role.
        </p>
        <p className="mt-4 flex gap-3">
          <Link className="c-btn small" href={`/a/${st.pass_attempt ? st.attempts[st.pass_attempt - 1] : st.attempts[0]}`}>See the attempt</Link>
          <Link className="c-btn small" href="/me">Passes and balance</Link>
        </p>
      </div>
    );
  } else if (attempt && attempt.status === 'APPLIED') {
    const late = now > attempt.deadline;
    body = (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="c-eyebrow">
            Attempt {attempt.attempt_no} of 3 · #{attempt.id}
          </p>
          <p className="c-eyebrow">
            Time left <Timer deadline={attempt.deadline} />
          </p>
        </div>
        <h2 className="c-h2 mt-2">Three questions, drawn for {w.account.slice(0, 6)}…</h2>
        <p className="c-muted mt-1 text-[14px]">Answer in your own words, in any language. The handbook is open in <Link className="c-link" href={`/g/${gateId}#handbook`} target="_blank">another tab</Link>; use it.</p>
        <div className="mt-6 flex flex-col gap-6">
          {attempt.items.map((item, i) => (
            <div key={i}>
              <div className="flex gap-3">
                <span className="c-qno">{i + 1}</span>
                <div>
                  <p className="font-medium">{item.q}</p>
                  <p className="c-muted text-[13.5px]">Rubric is public: {item.rubric}</p>
                </div>
              </div>
              <textarea
                className="c-textarea mt-3"
                value={answers[i]}
                maxLength={MAX_ANSWER}
                disabled={busy || late}
                onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
                placeholder="Your answer"
              />
              <p className="c-faint mono mt-1 text-right text-[11.5px]">{answers[i].length} / {MAX_ANSWER}</p>
            </div>
          ))}
        </div>
        {late ? (
          <div className="c-note mt-5">
            <p>The time limit ended. Close this attempt: it counts as an attempt and the fee goes to the pool, and anyone may call this.</p>
            <button className="c-btn solid mt-3" onClick={expire} disabled={busy}>Close attempt</button>
          </div>
        ) : (
          <button className="c-btn solid mt-6" onClick={submit} disabled={busy || answers.some((a) => a.trim() === '')}>
            Submit my answers
          </button>
        )}
        <TxLine tx={tx} working="Storing your answers" />
      </div>
    );
  } else if (attempt && attempt.status === 'ANSWERED') {
    body = (
      <div className="c-card pad">
        <span className="c-verdict">Grading</span>
        <p className="serif mt-3 text-[22px]">Your answers are stored. Now the validators grade them.</p>
        <p className="c-muted mt-2 text-[14.5px]">This takes about a minute. Anyone may start it; the verdict is computed from the three labels and the pass mark ({g.pass_mark} of 3).</p>
        <button className="c-btn solid mt-4" onClick={grade} disabled={busy}>
          {busy ? 'Validators are grading…' : 'Grade my answers'}
        </button>
        <TxLine tx={tx} working="Validators are grading" />
      </div>
    );
  } else if (st.locked_until && now < st.locked_until) {
    body = (
      <div className="c-card pad">
        <span className="c-verdict locked">Locked</span>
        <p className="mt-3 text-[15px]">Three attempts used. This gate opens to your address again on {dayTime(st.locked_until)}.</p>
      </div>
    );
  } else if (now < st.next_at) {
    body = (
      <div className="c-card pad">
        <span className="c-verdict retry">Retry · {st.left} left</span>
        <p className="mt-3 text-[15px]">The cooldown ends {dayTime(st.next_at)}. Then you get three new questions.</p>
      </div>
    );
  } else {
    body = (
      <div>
        <p className="c-eyebrow">Attempt {st.total + 1} · {plural(st.left, 'attempt')} left in this round</p>
        <h2 className="c-h2 mt-2">Your three questions are drawn from your address.</h2>
        {preview && (
          <p className="c-muted mt-2 text-[14px]">
            Drawn for you: <span className="mono">{preview.mine.map((i) => `Q${i + 1}`).join(' ')}</span>{' '}
            {preview.same ? <span className="c-faint">· the contract deals the same three</span> : <span style={{ color: 'var(--danger)' }}>· does not match the contract, do not sign</span>}
          </p>
        )}
        <label className="c-label mt-5" htmlFor="discord">Your Discord id, so the bot knows who passed</label>
        <input id="discord" className="c-input mono max-w-[26em]" inputMode="numeric" value={discord} onChange={(e) => setDiscord(e.target.value.replace(/\D/g, '').slice(0, 20))} placeholder="17 to 20 digits" />
        <p className="c-faint mt-1 text-[12.5px]">In Discord: Settings, Advanced, Developer Mode, then right click your name and Copy User ID.</p>
        <button className="c-btn solid mt-5" onClick={open} disabled={busy || discord.length < 17}>
          {busy ? 'Opening…' : `Open attempt (${feeText})`}
        </button>
        <TxLine tx={tx} working="Opening your attempt" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <WalletGate action="open an attempt">{body}</WalletGate>
        {verdictId > 0 && (
          <p className="mt-6">
            <Link className="c-btn" href={`/a/${verdictId}`}>
              See the verdict
            </Link>
          </p>
        )}
      </div>
      <aside className="flex flex-col gap-4">
        {g && (
          <div className="c-card pad">
            <p className="c-eyebrow">Your attempt</p>
            <dl className="c-kv mt-3">
              <div><dt>Pass mark</dt><dd>{g.pass_mark} of 3</dd></div>
              <div><dt>Fee</dt><dd>{feeText}</dd></div>
              <div><dt>Time limit</dt><dd>{g.time_limit_m} min</dd></div>
              {st && <div><dt>Attempts left</dt><dd>{st.left} of 3</dd></div>}
            </dl>
          </div>
        )}
        {g && g.fee !== '0' && outcomes}
        {st?.passed === false && st.locked_until > 0 && now >= st.locked_until && <p className="c-faint text-[12.5px]">Your lock ended {day(st.locked_until)}: a new round of three attempts.</p>}
        {attempt && <Result status={attempt.status} />}
      </aside>
    </div>
  );
}

import Link from 'next/link';

import { DEPLOYMENT } from '@/lib/genlayer-core.mjs';
import { gen, short, shortHash, statusText } from '@/lib/format';
import type { Attempt, Status } from '@/lib/types';

export const EXPLORER = DEPLOYMENT.explorer as string;
export const CONTRACT = DEPLOYMENT.doorman as string;

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

const STATUS_CLASS: Record<Status, string> = {
  APPLIED: '',
  ANSWERED: '',
  PASSED: 'yes',
  RETRY: 'retry',
  LOCKED: 'locked',
  EXPIRED: 'expired',
};

/** Sky for PASSED, hatched for RETRY, grey and struck through for LOCKED, dotted for EXPIRED. */
export function Result({ status, left }: { status: Status; left?: number }) {
  return <span className={`c-verdict ${STATUS_CLASS[status]}`.trim()}>{statusText(status, left)}</span>;
}

export function Tx({ hash, label }: { hash: string; label?: string }) {
  if (!hash) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={txUrl(hash)} target="_blank" rel="noreferrer">
      {label ? `${label} ` : ''}
      {shortHash(hash)} ↗
    </a>
  );
}

export function Addr({ address }: { address: string }) {
  if (!address) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={addressUrl(address)} target="_blank" rel="noreferrer" title={address}>
      {short(address)}
    </a>
  );
}

/** One row of the recent-attempts feed: the result, the applicant, the gate, the score. */
export function AttemptRow({ a }: { a: Attempt }) {
  const graded = a.labels.length === 3;
  return (
    <Link href={`/a/${a.id}`} className="c-row-link px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Result status={a.status} />
        <span className="mono text-[12.5px]">{short(a.applicant)}</span>
        <span className="c-faint text-[13px]">{graded ? `${a.passes} of 3` : a.status === 'EXPIRED' ? 'no answer' : 'in progress'}</span>
        <span className="font-medium">{a.gate}</span>
        <span className="c-faint mono text-[11.5px]">attempt {a.attempt_no} of 3 · #{a.id}</span>
      </div>
    </Link>
  );
}

/** The live gate card on the landing page: a real gate, read from the contract. */
export function GateCard({ g }: { g: { id: number; name: string; pass_mark: number; fee: string; cooldown_h: number; time_limit_m: number; counts: { attempts: number; passed: number; retry: number; locked: number; expired: number } } }) {
  const done = g.counts.passed + g.counts.retry + g.counts.locked + g.counts.expired;
  return (
    <Link href={`/g/${g.id}`} className="c-card block p-5 transition-colors hover:border-[var(--line-strong)]">
      <div className="flex items-start justify-between gap-3">
        <p className="c-eyebrow">
          Gate #{g.id} · {g.name}
        </p>
        <span className="c-verdict yes">Open</span>
      </div>
      <p className="serif mt-3 text-[24px] leading-snug">Read the {g.name} handbook, answer three questions</p>
      <p className="c-muted mt-2 text-[13.5px]">
        pass mark {g.pass_mark} of 3 · 3 attempts · fee {gen(g.fee)}
        {g.fee !== '0' ? ', back on a pass' : ''}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4">
        <div>
          <p className="mono text-[22px]">{done ? `${Math.round((g.counts.passed / done) * 100)}%` : '–'}</p>
          <p className="c-eyebrow">pass rate</p>
        </div>
        <div>
          <p className="mono text-[22px]">{g.counts.attempts.toLocaleString('en-US')}</p>
          <p className="c-eyebrow">attempts</p>
        </div>
        <div>
          <p className="mono text-[22px]">{g.counts.passed.toLocaleString('en-US')}</p>
          <p className="c-eyebrow">passes</p>
        </div>
      </div>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="c-note">{children}</div>;
}

export function ReadError({ message }: { message: string }) {
  return (
    <div className="c-card pad">
      <p className="font-medium">The chain did not answer.</p>
      <p className="c-muted mt-1 text-[14px]">{message}</p>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OwnerPanel } from '@/components/OwnerPanel';
import { Addr, ReadError } from '@/components/ui';
import { day, decided, gen, passRate, plural } from '@/lib/format';
import { getGate, readError } from '@/lib/read';
import type { Gate } from '@/lib/types';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/g/[id]'>) {
  const { id } = await props.params;
  const g = await getGate(Number(id)).catch(() => null);
  return { title: g && g.found ? `${g.name} · gate #${g.id}` : `Gate #${id}` };
}

export default async function GatePage(props: PageProps<'/g/[id]'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  let g: Gate;
  try {
    const out = await getGate(n);
    if (!out.found) notFound();
    g = out;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-14">
        <ReadError message={readError(e)} />
      </div>
    );
  }
  const done = decided(g);
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        Gate #{g.id} · version {g.version} · opened {day(g.created_at)}
      </p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(30px, 4.4vw, 46px)' }}>
        {g.name}
      </h1>
      <p className="c-lead mt-4">
        Read the handbook, answer three questions drawn for you, and pass with {g.pass_mark} of 3. {g.fee !== '0' ? `The ${gen(g.fee)} fee comes back on a pass.` : 'This gate has no fee.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/g/${g.id}/apply`} className="c-btn solid">
          Take this gate
        </Link>
        <a href="#handbook" className="c-btn">
          Read the handbook
        </a>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [passRate(g.counts.passed, done), 'pass rate'],
          [g.counts.attempts.toLocaleString('en-US'), 'attempts'],
          [g.counts.passed.toLocaleString('en-US'), 'passed'],
          [g.counts.retry.toLocaleString('en-US'), 'retry'],
          [(g.counts.locked + g.counts.expired).toLocaleString('en-US'), 'locked or expired'],
        ].map(([v, l]) => (
          <div key={l} className="c-card pad">
            <p className="mono text-[26px]">{v}</p>
            <p className="c-eyebrow mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section id="handbook">
          <p className="c-eyebrow">Handbook</p>
          <div className="c-card pad mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{g.handbook}</div>
          <p className="c-faint mt-2 mono text-[11.5px]">
            {g.handbook.length.toLocaleString('en-US')} of 3,000 characters · sha3-256 {g.digest.slice(0, 16)}…
          </p>
        </section>
        <aside className="flex flex-col gap-6">
          <section>
            <p className="c-eyebrow">The rules of this gate</p>
            <dl className="c-kv mt-3">
              <div><dt>Pass mark</dt><dd>{g.pass_mark} of 3</dd></div>
              <div><dt>Fee</dt><dd>{gen(g.fee)}</dd></div>
              <div><dt>Time limit</dt><dd>{g.time_limit_m} minutes</dd></div>
              <div><dt>Cooldown</dt><dd>{plural(g.cooldown_h, 'hour')}</dd></div>
              <div><dt>Attempts</dt><dd>3, then a 7 day lock</dd></div>
              <div><dt>Questions in the bank</dt><dd>{g.bank_size}</dd></div>
              <div><dt>Owner</dt><dd><Addr address={g.owner} /></dd></div>
              <div><dt>Pool</dt><dd>{gen(g.pool)}</dd></div>
            </dl>
          </section>
          <OwnerPanel gateId={g.id} owner={g.owner} balance={g.owner_balance} />
        </aside>
      </div>

      <section className="mt-12">
        <p className="c-eyebrow">The bank, with its rubrics</p>
        <p className="c-muted mt-2 max-w-[44em] text-[14px]">
          Each attempt is dealt three of these, by a hash of the gate, your address and the attempt number. The rubrics are
          public on purpose: the gate tests understanding of the handbook, not secrecy.
        </p>
        <div className="c-card mt-4 divide-y divide-[var(--line)]">
          {g.bank.map((item, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <span className="c-qno">{i + 1}</span>
              <div>
                <p className="font-medium">{item.q}</p>
                <p className="c-muted mt-0.5 text-[13.5px]">{item.rubric}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

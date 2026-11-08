import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AttemptActions } from '@/components/AttemptActions';
import { Addr, ReadError, Result } from '@/components/ui';
import { dayTime, gen, outcomeLine } from '@/lib/format';
import { getAttempt, readError } from '@/lib/read';
import type { Attempt } from '@/lib/types';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/a/[id]'>) {
  const { id } = await props.params;
  return { title: `Attempt #${id}` };
}

export default async function AttemptPage(props: PageProps<'/a/[id]'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  let a: Attempt;
  try {
    const out = await getAttempt(n);
    if (!out.found) notFound();
    a = out;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-14">
        <ReadError message={readError(e)} />
      </div>
    );
  }
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        <Link href={`/g/${a.gate_id}`} className="c-link">
          Gate #{a.gate_id} · {a.gate}
        </Link>{' '}
        · attempt {a.attempt_no} of 3 · #{a.id}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="c-h1" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
          {a.status === 'PASSED' ? 'Passed.' : a.status === 'RETRY' ? 'Not yet.' : a.status === 'LOCKED' ? 'Locked.' : a.status === 'EXPIRED' ? 'Out of time.' : a.status === 'ANSWERED' ? 'Validators are grading.' : 'Waiting for answers.'}
        </h1>
        <Result status={a.status} />
      </div>
      <p className="c-lead mt-3">{outcomeLine(a)}</p>

      <div className="mt-6">
        <AttemptActions attempt={{ id: a.id, gate_id: a.gate_id, status: a.status, deadline: a.deadline, applicant: a.applicant }} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <p className="c-eyebrow">Questions, answers and labels</p>
          <div className="c-card mt-3 divide-y divide-[var(--line)]">
            {a.items.map((item, i) => {
              const label = a.labels[i];
              return (
                <div key={i} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="c-qno">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.q} <span className="c-faint mono text-[11.5px]">Q{a.dealt[i] + 1} of the bank</span>
                      </p>
                      <p className="c-muted mt-0.5 text-[13.5px]">Rubric: {item.rubric}</p>
                      {a.answers[i] !== undefined ? (
                        <p className="serif mt-3 whitespace-pre-wrap text-[18px] leading-snug">&ldquo;{a.answers[i]}&rdquo;</p>
                      ) : (
                        <p className="c-faint mt-3 text-[13.5px]">No answer stored.</p>
                      )}
                    </div>
                    {label && <span className={`c-verdict ${label === 'PASS' ? 'yes' : 'locked'}`}>{label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="c-faint mt-3 text-[12.5px]">
            Graded against the handbook as it stood when this attempt opened (version {a.version}, sha3-256 {a.digest.slice(0, 16)}…).
          </p>
        </section>
        <aside>
          <p className="c-eyebrow">The record</p>
          <dl className="c-kv mt-3">
            <div><dt>Applicant</dt><dd><Addr address={a.applicant} /></dd></div>
            <div><dt>Discord id</dt><dd className="mono">{a.discord_id}</dd></div>
            <div><dt>Opened</dt><dd>{dayTime(a.opened_at)}</dd></div>
            <div><dt>Deadline</dt><dd>{dayTime(a.deadline)}</dd></div>
            {a.submitted_at > 0 && <div><dt>Answered</dt><dd>{dayTime(a.submitted_at)}</dd></div>}
            {a.graded_at > 0 && <div><dt>Graded</dt><dd>{dayTime(a.graded_at)}</dd></div>}
            <div><dt>Pass mark</dt><dd>{a.pass_mark} of 3</dd></div>
            <div><dt>Fee</dt><dd>{gen(a.fee)}{a.fee_to ? `, ${a.fee_to === 'applicant' ? 'credited back to the applicant' : 'to the pool'}` : ', held'}</dd></div>
            {a.closed_by && <div><dt>Closed by</dt><dd><Addr address={a.closed_by} /></dd></div>}
          </dl>
          {a.status === 'PASSED' && (
            <div className="c-note mt-4">
              <p>The community&apos;s bot reads this pass from <span className="mono">get_pass</span> and grants the role to Discord id {a.discord_id}.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

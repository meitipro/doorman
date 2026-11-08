import Link from 'next/link';

import { AttemptRow, Empty, GateCard, ReadError } from '@/components/ui';
import { allGates, readError, recentAttempts } from '@/lib/read';
import { plural, short } from '@/lib/format';
import type { Attempt, Gate } from '@/lib/types';

export const revalidate = 20;

const FAQ = [
  {
    q: 'Is it a captcha?',
    a: 'No. A captcha checks for a pulse. Doorman checks that someone read the handbook: the answers are in their own words, graded against the community’s own text.',
  },
  {
    q: 'Can I read the handbook while I answer?',
    a: 'Yes, and you are meant to. The gate checks that the handbook was read and understood, not memorised. The rubric for each question is public once your attempt opens.',
  },
  {
    q: 'What if I fail?',
    a: 'You can try again after the gate’s cooldown, up to three attempts. A failed attempt’s fee goes to the community pool. After the third failure the gate is closed to your address for seven days.',
  },
  {
    q: 'Do I get my fee back?',
    a: 'On a pass, yes: it is credited to your balance in the same transaction that records the pass, and you take it out with Withdraw. Doorman moves money in one place only, withdraw.',
  },
  {
    q: 'Who decides?',
    a: 'Several GenLayer validators, each grading the same three answers with their own model. An attempt is decided only when they agree on all three PASS or FAIL labels. The pass itself is then computed in code from those labels and the community’s pass mark.',
  },
  {
    q: 'Which network?',
    a: 'GenLayer Studio Next, chain 61997. Test GEN is free from the faucet in the site. Every write carries a small fee deposit, most of which is refunded when the transaction finalizes.',
  },
];

/** The hero gate: a published gate with attempts, not an evaluation or smoke-test gate. */
function pickHero(gates: Gate[]): Gate | undefined {
  const real = gates.filter((g) => !/golden|smoke|reviewer path/i.test(g.name));
  const pool = real.length ? real : gates;
  return [...pool].sort((a, b) => b.counts.attempts - a.counts.attempts)[0];
}

export default async function Landing() {
  let gates: Gate[] = [];
  let recent: Attempt[] = [];
  let error = '';
  try {
    gates = await allGates(12);
    recent = await recentAttempts(12);
  } catch (e) {
    error = readError(e);
  }
  const hero = pickHero(gates);
  const real = recent.filter((a) => !/golden|smoke|reviewer path/i.test(a.gate));
  const feed = (real.length >= 4 ? real : recent).slice(0, 4);
  const dealt = feed.filter((a) => a.dealt.length === 3).slice(0, 3);

  return (
    <>
      <section className="c-wrap grid-cols-1 pb-16 pt-14 md:pt-20">
        <div className="c-grid-2">
          <div>
            <p className="c-eyebrow">Reading gates, graded on GenLayer</p>
            <h1 className="c-h1 mt-5">
              Read the rules,
              <br />
              <em>then come in.</em>
            </h1>
            <p className="c-lead mt-6">
              A community writes its handbook and a few questions. You answer three, drawn for you. GenLayer validators grade
              your answers against the handbook, and the community&apos;s bot opens the door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero ? (
                <Link href={`/g/${hero.id}`} className="c-btn solid">
                  Take a gate
                </Link>
              ) : null}
              <Link href="/new" className="c-btn">
                Open a gate
              </Link>
            </div>
            <p className="c-faint mt-5 text-[13.5px]">Pass and your fee comes back. Reading needs no wallet.</p>
          </div>
          <div>{error ? <ReadError message={error} /> : hero ? <GateCard g={hero} /> : <Empty>No gates on chain yet.</Empty>}</div>
        </div>
      </section>

      <section className="c-section" id="recent">
        <div className="c-wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="c-eyebrow">Recent attempts</p>
              <h2 className="c-h2 mt-2">Including the ones that did not pass.</h2>
            </div>
            <p className="c-muted max-w-[30em] text-[14px]">
              A gate that only ever said &ldquo;passed&rdquo; would be a rubber stamp. Retries, locks and expired attempts stay on the front page.
            </p>
          </div>
          <div className="c-card mt-6 divide-y divide-[var(--line)]">
            {feed.length ? feed.map((a) => <AttemptRow key={a.id} a={a} />) : <div className="p-4">{error ? error : 'No attempts yet.'}</div>}
          </div>
        </div>
      </section>

      <section className="c-section" id="gates">
        <div className="c-wrap">
          <p className="c-eyebrow">Gates</p>
          <h2 className="c-h2 mt-2">Every gate on the contract.</h2>
          <div className="c-card mt-6 divide-y divide-[var(--line)]">
            {gates.length ? (
              gates.map((g) => (
                <Link key={g.id} href={`/g/${g.id}`} className="c-row-link px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="mono c-faint text-[12px]">#{g.id}</span>
                    <span className="font-medium">{g.name}</span>
                    <span className="c-faint text-[13px]">
                      pass mark {g.pass_mark} of 3 · {plural(g.counts.attempts, 'attempt')} · {g.counts.passed} passed
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4">{error ? error : 'No gates yet.'}</div>
            )}
          </div>
        </div>
      </section>

      <section className="c-section" id="how">
        <div className="c-wrap">
          <p className="c-eyebrow">How it works</p>
          <h2 className="c-h2 mt-2">Write, apply, answer, grade.</h2>
          <div className="c-steps mt-8">
            {[
              ['01', 'Write', 'A handbook of at most 3,000 characters and a bank of 6 to 20 questions, each with a rubric.'],
              ['02', 'Apply', 'Open an attempt with the gate’s fee. Three questions are drawn from your own address.'],
              ['03', 'Answer', 'In your own words, in any language, before the timer ends. Short answers can pass.'],
              ['04', 'Grade', 'Validators grade each answer against the handbook. A pass is recorded, your fee comes back, and the bot opens the door.'],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="mono c-faint text-[12px]">{n}</p>
                <p className="mt-2 text-[18px] font-semibold">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="c-section" id="drawn">
        <div className="c-wrap c-grid-2">
          <div>
            <p className="c-eyebrow">Why drawn questions</p>
            <h2 className="c-h2 mt-2">Two applicants never get the same three.</h2>
            <p className="c-muted mt-4 max-w-[34em] text-[15px] leading-relaxed">
              A fixed quiz gets posted in a group by the first person to pass, and from then on the gate checks who found the
              answers. Doorman deals each attempt three questions from a hash of the gate, your address and the attempt number.
              The contract and this site compute the same three, byte for byte, and a pasted answer to another question fails.
            </p>
          </div>
          <div>
            {dealt.length ? (
              <div className="c-card overflow-hidden">
                <table className="c-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Gate</th>
                      <th>Attempt</th>
                      <th>Questions drawn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealt.map((a) => (
                      <tr key={a.id}>
                        <td className="mono text-[12.5px]">{short(a.applicant)}</td>
                        <td>#{a.gate_id}</td>
                        <td>{a.attempt_no}</td>
                        <td className="mono">{a.dealt.map((i) => `Q${i + 1}`).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Attempts will show here, with the three questions each was dealt.</Empty>
            )}
          </div>
        </div>
      </section>

      <section className="c-section" id="communities">
        <div className="c-wrap">
          <p className="c-eyebrow">For communities</p>
          <h2 className="c-h2 mt-2">Write a handbook, get a gate and a bot, keep a public record.</h2>
          <div className="c-steps mt-8">
            {[
              ['A gate that costs nothing to run', 'Written once. Fees that fail go to your pool, and you take them out with Withdraw.'],
              ['A pass the bot reads', 'The Discord bot polls get_pass and grants the role. It holds no wallet key and signs nothing.'],
              ['A public record of every attempt', 'Questions, answers, labels and verdicts are all on chain. A gate that waves everyone through is visible in its pass rate.'],
            ].map(([t, d]) => (
              <div key={t}>
                <p className="text-[17px] font-semibold">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/new" className="c-btn solid">
              Open a gate
            </Link>
            <Link href="/docs/quickstart" className="c-btn">
              Quickstart
            </Link>
          </div>
        </div>
      </section>

      <section className="c-section" id="faq">
        <div className="c-wrap">
          <p className="c-eyebrow">FAQ</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <p className="font-semibold">{f.q}</p>
                <p className="c-muted mt-1.5 text-[14.5px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

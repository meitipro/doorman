import type { Attempt, Status } from './types';

const GEN = 10n ** 18n;

/** Wei as GEN: 1 GEN, 0.5 GEN. Never through a float. */
export function gen(wei: string | bigint | number, unit = true): string {
  const value = BigInt(wei);
  const whole = value / GEN;
  const frac = value % GEN;
  let text = whole.toLocaleString('en-US');
  if (frac !== 0n) {
    const digits = frac.toString().padStart(18, '0').replace(/0+$/, '');
    text += '.' + digits.slice(0, 6);
  }
  return unit ? `${text} GEN` : text;
}

/** GEN typed by a person ("1", "0.5") to wei; null when it is not a number. */
export function toWei(text: string): bigint | null {
  const clean = text.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  return BigInt(whole) * GEN + BigInt((frac + '0'.repeat(18)).slice(0, 18));
}

export function short(address: string, head = 6, tail = 4): string {
  if (!address) return '';
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chain seconds as "Nov 8, 2026", in UTC so server and browser agree. */
export function day(seconds: number): string {
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function dayTime(seconds: number): string {
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day(seconds)}, ${hh}:${mm} UTC`;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** The four results of the spec, plus the two open states. */
export const STATUS_LABEL: Record<Status, string> = {
  APPLIED: 'OPEN',
  ANSWERED: 'GRADING',
  PASSED: 'PASSED',
  RETRY: 'RETRY',
  LOCKED: 'LOCKED',
  EXPIRED: 'EXPIRED',
};

/** "RETRY · 2 LEFT", "PASSED", "LOCKED". `left` is how many attempts the applicant has in the round. */
export function statusText(status: Status, left?: number): string {
  if (status === 'RETRY' && left !== undefined) return `RETRY · ${left} LEFT`;
  return STATUS_LABEL[status];
}

export function passRate(passed: number, decidedCount: number): string {
  if (!decidedCount) return '–';
  return `${Math.round((passed / decidedCount) * 100)}%`;
}

/** Attempts that ended: PASSED, RETRY, LOCKED or EXPIRED. */
export function decided(a: { counts: { passed: number; retry: number; locked: number; expired: number } }): number {
  return a.counts.passed + a.counts.retry + a.counts.locked + a.counts.expired;
}

export function outcomeLine(a: Attempt): string {
  if (a.status === 'APPLIED') return 'Waiting for the three answers.';
  if (a.status === 'ANSWERED') return 'Validators are grading.';
  if (a.status === 'EXPIRED') return 'No answer inside the time limit. It counted as an attempt.';
  return `${a.passes} of 3 answers passed; the mark is ${a.pass_mark}.`;
}

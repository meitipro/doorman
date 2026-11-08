/** The JSON the contract's views return. Field names are the contract's own. */

export type Status = 'APPLIED' | 'ANSWERED' | 'PASSED' | 'RETRY' | 'LOCKED' | 'EXPIRED';
export type Label = 'PASS' | 'FAIL';

export type Question = { q: string; rubric: string };
export type Totals = { gates: number; attempts: number; passes: number };

export type GateCounts = { attempts: number; passed: number; retry: number; locked: number; expired: number };

export type Gate = {
  found: true;
  totals: Totals;
  id: number;
  owner: string;
  name: string;
  handbook: string;
  bank: Question[];
  bank_size: number;
  digest: string;
  pass_mark: number;
  fee: string;
  time_limit_m: number;
  cooldown_h: number;
  version: number;
  created_at: number;
  updated_at: number;
  counts: GateCounts;
  pool: string;
  refunded: string;
  owner_balance: string;
};

export type Attempt = {
  found: true;
  totals: Totals;
  id: number;
  gate_id: number;
  gate: string;
  applicant: string;
  discord_id: string;
  attempt_no: number;
  version: number;
  digest: string;
  handbook: string;
  items: Question[];
  dealt: number[];
  answers: string[];
  labels: Label[];
  passes: number;
  pass_mark: number;
  fee: string;
  fee_to: '' | 'applicant' | 'pool';
  status: Status;
  opened_at: number;
  deadline: number;
  submitted_at: number;
  graded_at: number;
  closed_by: string;
  closed_at: number;
};

export type Standing = {
  found: true;
  totals: Totals;
  gate_id: number;
  address: string;
  passed: boolean;
  passed_at: number;
  pass_attempt: number;
  discord_id: string;
  used: number;
  left: number;
  total: number;
  next_at: number;
  locked_until: number;
  open_attempt: number;
  attempts: number[];
  next_attempt_no: number;
  next_dealt: number[];
  balance: string;
  withdrawn: string;
};

export type NotFound = { found: false; totals?: Totals };

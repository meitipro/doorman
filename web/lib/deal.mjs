/**
 * Dealing, in the browser: the same three questions the contract deals.
 *
 * deal() in contracts/doorman.py is the only definition. h = sha256 of
 * "gate|address|attempt" with the address in lowercase hex; the bank's
 * indexes are ordered by sha256(h + the index as two big-endian bytes); the
 * first three are dealt. tests/vectors.json holds vectors from the contract,
 * and scripts/check-deal.mjs holds this file to them.
 */

import { sha256 } from 'viem';

export const DEALT = 3;

function bytes(hex) {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function digest(input) {
  return sha256(input, 'hex').slice(2);
}

/** @param {number} gate @param {string} address @param {number} attempt @param {number} size @returns {number[]} */
export function deal(gate, address, attempt, size) {
  const text = `${gate}|${String(address).toLowerCase()}|${attempt}`;
  const h = bytes(digest(new TextEncoder().encode(text)));
  const keyed = [];
  for (let i = 0; i < size; i++) {
    const joined = new Uint8Array(h.length + 2);
    joined.set(h, 0);
    joined[h.length] = (i >> 8) & 0xff;
    joined[h.length + 1] = i & 0xff;
    keyed.push({ i, key: digest(joined) });
  }
  // Hex strings of equal length order exactly as the raw bytes do.
  keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return keyed.slice(0, DEALT).map((k) => k.i);
}

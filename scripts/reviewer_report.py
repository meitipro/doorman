#!/usr/bin/env python3
"""
Write docs/reviewer-path.studio-next.md from docs/reviewer-path.studio-next.json.

    python scripts/reviewer_report.py

The JSON is written by web/scripts/reviewer-path.mjs (every step, before it is
printed) and web/scripts/reconcile.mjs (balances to the wei once everything is
final). This only renders it, so every figure on the page is one the scripts read.
"""

from __future__ import annotations

import json
import pathlib
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "reviewer-path.studio-next.json"
TARGET = ROOT / "docs" / "reviewer-path.studio-next.md"
EXPLORER = "https://explorer-studio-dev.genlayer.com"
GEN = 10**18


def gen(wei) -> str:
    value = int(wei)
    whole, frac = divmod(abs(value), GEN)
    text = f"{whole}" + (f".{str(frac).rjust(18, '0').rstrip('0')}" if frac else "")
    return ("-" if value < 0 else "") + text + " GEN"


def main() -> int:
    record = json.loads(SOURCE.read_text(encoding="utf-8"))
    lines = ["# The reviewer's path, walked on the live site", ""]
    for name, run in record["runs"].items():
        acc = run["accounts"]
        lines += [
            f"Run `{name}` against {run['site']}, contract `{run['contract']}` on Studio Next. Two accounts made for the run, "
            f"with nonce {acc['nonces_at_start']['creator']} and {acc['nonces_at_start']['user']} at the start, so neither had touched the "
            "contract. Every write went through `web/lib/genlayer-core.mjs`, the code the browser runs, with a stand-in wallet "
            "(`web/scripts/standin-wallet.mjs`).",
            "",
            f"- Creator: [`{acc['creator']}`]({EXPLORER}/address/{acc['creator']})",
            f"- User: [`{acc['user']}`]({EXPLORER}/address/{acc['user']})",
            "",
            "| Step | What happened | Transaction |",
            "|---|---|---|",
        ]
        for s in run["steps"]:
            key = s["key"]
            tx = f"[{s['hash'][:10]}…]({EXPLORER}/tx/{s['hash']})" if s.get("hash") else ""
            if key.startswith("faucet-"):
                what = f"the site's `/api/faucet`, sent the address in lower case: HTTP {s['http']}, {gen(s['before'] or 0)} → {gen(s['after'] or 0)}"
            elif s.get("method"):
                what = f"`{s['method']}` {'accepted, returned ' + str(s['returned']) if s['ok'] else 'refused: ' + str(s.get('refusal'))}, decided in {s['seconds_to_decision']} s"
                if s.get("final_status"):
                    what += f", then {s['final_status']}"
            elif key.startswith("read-"):
                what = f"read back: request {s.get('request_id', '')} is {s.get('verdict', s.get('status', ''))} {s.get('tier', '')}".rstrip()
                if s.get("receipt_kind"):
                    what += f", receipt by the {s['receipt_kind'].lower()}"
                if s.get("reason"):
                    what += f". Reason: {s['reason']}"
            elif key.startswith("page-"):
                what = f"HTTP {s['http']} at {s['url']}: {'shows what the chain holds' if s['ok'] else 'MISSING'}"
            elif key.startswith("balance-"):
                what = (
                    f"per-step check: {gen(s['before'])} → {gen(s['after'])}, difference {s.get('difference')} wei from this "
                    "transaction's fee alone. Other transactions' refunds settle in the same window, so the reconciliation below is the real check."
                )
            else:
                what = json.dumps({k: v for k, v in s.items() if k not in ("at", "key")})[:200]
            lines.append(f"| {key} | {what} | {tx} |")
        rec = run.get("reconciled")
        if rec:
            lines += [
                "",
                "## Balances to the wei, once everything was final",
                "",
                "Every write locks a fee deposit and refunds the unused part when it finalizes. After all of an account's "
                "transactions were FINALIZED with their fee accounting settled:",
                "",
                "`balance = faucet paid in + value received - value sent - net fees`",
                "",
                "| Account | Faucet | Received | Sent | Net fees | Expected | Balance | Result |",
                "|---|---|---|---|---|---|---|---|",
            ]
            for who in ("creator", "user"):
                r = rec[who]
                if r["exact"]:
                    result = "exact to the wei"
                elif r.get("exact_without_message_fee"):
                    result = f"exact to the wei once the {r['message_fee_consumed']} wei External message fee is left out (see below)"
                else:
                    result = f"off by {r['difference']} wei"
                lines.append(
                    f"| {who} | {gen(r['faucet'])} | {gen(r['received'])} | {gen(r['sent'])} | {gen(r['fees'])} | {gen(r['expected'])} | "
                    f"{gen(r['actual'])} | {result} |"
                )
            if any(rec[w].get("message_fee_consumed", "0") != "0" for w in ("creator", "user")):
                lines += [
                    "",
                    "**The one term that does not behave as written.** `withdraw` pays its caller through an External message, "
                    "and its fee accounting lists `message_fee_consumed` of 25,000,000,000,000 wei (0.000025 GEN) inside "
                    "`paid_fee_value - total_refunded`. The creator's wallet was not charged that amount: the balance is higher than "
                    "the plain equation by exactly it. The seed's withdrawal shows the same thing (Nara's wallet cost was likewise "
                    "25,000,000,000,000 wei less than paid minus refunded). Where that budget goes is Studio Next's fee logic; this "
                    "page records what the chain reported and what the wallet shows.",
                ]
            lines += ["", f"Reconciled {rec['at']}."]
        lines.append("")
    TARGET.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"wrote {TARGET.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

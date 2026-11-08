#!/usr/bin/env python3
"""
Seed the deployed contract with a realistic gate and real attempts, and keep the record.

    python scripts/seed.py            # the Kiln Discord gate: a pass, a spanish pass, a retry, an expired attempt, withdrawals
    python scripts/seed.py --lock     # the Quill Telegram gate: three failed attempts an hour apart, ending LOCKED
    python scripts/seed.py --report   # rewrite docs/seed.studio-next.md from the record

Every verdict comes from the deployed judge through real consensus; nothing
here decides one. After each attempt the script reads the result back and
records what the contract said, not what was hoped. The accounts are test
accounts, the people and communities are fictional (docs/seed.md says so), and
the Discord ids are placeholders that belong to nobody.

The lock demonstration cannot be quicker than the contract allows: the shortest
cooldown is one hour, so three attempts take a little over two hours, and the
script sleeps between them.

Every step is written to docs/seed.studio-next.json before anything is printed,
so a crash never loses a transaction that exists on chain, and a rerun resumes
where the last one stopped. Accounts live in ~/.doorman/accounts.json; only
addresses are printed.
"""

from __future__ import annotations

import datetime
import json
import sys
import time

import chain as C

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RECORD = C.ROOT / "docs" / "seed.studio-next.json"
KILN = json.loads((C.ROOT / "eval" / "kiln.json").read_text(encoding="utf-8"))
GEN = 10**18

#: Correct answers in people's own words, by position in the Kiln bank.
GOOD = [
    "Ask a moderator in #help before you post any link, and never post a link to a wallet or a claim page.",
    "When team tokens unlock, selling can push the price down, so rule 4 bans price calls in #general to stop panic and rumours.",
    "In #feedback, with the steps to reproduce and what you expected to happen.",
    "Posting the same message in many channels, or joining only to promote something, is a raid, and raiders are banned.",
    "Passing the Doorman gate gives you Member. Contributor comes from moderators for merged work, never on request.",
    "It is a scam, the team never DMs first. Do not answer, and report it in #help.",
    "Only in #trading. Price talk is not allowed in #general.",
    "Open a ticket in #help and the head moderator answers you privately, instead of arguing in public.",
]
#: The same answers in Spanish, for the applicant who writes in their own language.
SPANISH = [
    "Pregunta primero a un moderador en #help antes de publicar cualquier enlace, y nunca publiques un enlace a una cartera ni a una página de reclamación.",
    "Cuando se desbloquean los tokens del equipo, las ventas pueden bajar el precio, por eso la regla 4 prohíbe hablar de precios en #general: evita el pánico y los rumores.",
    "En #feedback, con los pasos para reproducirlo y lo que esperabas que pasara.",
    "Publicar el mismo mensaje en muchos canales, o entrar solo para promocionar algo, es una incursión, y quien la hace es expulsado.",
    "Pasar la puerta de Doorman da el rol de Member. Contributor lo dan los moderadores por trabajo integrado, nunca a petición.",
    "Es una estafa, el equipo nunca escribe primero por mensaje directo. No respondas y repórtalo en #help.",
    "Solo en #trading. Hablar de precios no está permitido en #general.",
    "Abre un ticket en #help y el moderador principal responde en privado, en vez de discutir en público.",
]
#: Answers that read the handbook for nothing.
WEAK = [
    "Follow the rules in the handbook.",
    "Because prices go up.",
    "Post it in #general, it is faster.",
    "Being annoying.",
    "You ask nicely.",
    "Click the link and see.",
    "Anywhere.",
    "Complain loudly.",
]

KILN_ACCOUNTS = {"owner": "seed_kiln_owner", "ada": "seed_ada", "bo": "seed_bo", "cy": "seed_cy", "dee": "seed_dee"}


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> dict:
    if RECORD.exists():
        return json.loads(RECORD.read_text(encoding="utf-8"))
    return {"network": C.NETWORK, "contract": C.address(), "steps": [], "gates": {}}


def save(record: dict) -> None:
    RECORD.parent.mkdir(parents=True, exist_ok=True)
    RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def done(record: dict, key: str) -> dict | None:
    return next((s for s in record["steps"] if s["key"] == key and s.get("ok")), None)


def step(record: dict, key: str, chain: C.Chain, method: str, args: list, value: int = 0, note: str = "") -> dict:
    """Send once, record the outcome before printing, and never send a finished step again."""
    known = done(record, key)
    if known:
        print(f"{key}: already done {known['hash']}")
        return known
    outcome = chain.send(C.address(), method, args, value)
    row = {
        "key": key,
        "method": method,
        "from": chain.account.address,
        "ok": outcome["ok"],
        "hash": outcome["hash"],
        "returned": outcome["result"] if isinstance(outcome["result"], (int, str, type(None))) else None,
        "refusal": outcome["refusal"],
        "detail": outcome["detail"],
        "at": now_iso(),
        "note": note,
    }
    record["steps"].append(row)
    save(record)
    print(f"{key}: {'ok' if outcome['ok'] else 'FAILED ' + outcome['detail']} {C.EXPLORER}/tx/{outcome['hash']}")
    if not outcome["ok"]:
        raise SystemExit(f"{key} did not succeed: {outcome['detail']}")
    return row


def attempt(record: dict, tag: str, applicant: C.Chain, gate_id: int, discord: str, answers_for, read_chain: C.Chain, grade: bool = True) -> dict:
    """apply, then answer the dealt questions with answers_for(index), then judge."""
    opened = step(record, f"{tag}:apply", applicant, "apply", [gate_id, discord], GEN)
    aid = int(opened["returned"])
    a = read_chain.read_json(C.address(), "get_attempt", [aid])
    answers = [answers_for(i) for i in a["dealt"]]
    if not grade:
        return {"id": aid, "dealt": a["dealt"], "answers": answers}
    step(record, f"{tag}:submit", applicant, "submit", [aid, json.dumps(answers, ensure_ascii=False)])
    step(record, f"{tag}:judge", applicant, "judge", [aid])
    got = read_chain.read_json(C.address(), "get_attempt", [aid])
    record.setdefault("attempts", {})[tag] = {"id": aid, "status": got["status"], "labels": got["labels"], "dealt": got["dealt"], "applicant": applicant.account.address}
    save(record)
    print(f"  {tag}: attempt {aid} -> {got['status']} {got['labels']}")
    return got


def seed_kiln() -> None:
    record = load()
    people = C.accounts(*KILN_ACCOUNTS.values())
    chains = {k: C.Chain(people[v]) for k, v in KILN_ACCOUNTS.items()}
    reader = C.Chain()
    for chain in chains.values():
        chain.ensure(chain.account.address, 20)
    opened = step(
        record,
        "kiln:open_gate",
        chains["owner"],
        "open_gate",
        ["Kiln Discord", KILN["handbook"], json.dumps(KILN["bank"]), 2, GEN, 10, 1],
        note="pass mark 2 of 3, fee 1 GEN, 10 minutes, 1 hour cooldown",
    )
    gid = int(opened["returned"])
    record["gates"]["kiln"] = {"id": gid, "owner": chains["owner"].account.address}
    save(record)
    attempt(record, "ada", chains["ada"], gid, "100000000000000001", lambda i: GOOD[i], reader)
    attempt(record, "dee", chains["dee"], gid, "100000000000000004", lambda i: SPANISH[i], reader)
    attempt(record, "bo", chains["bo"], gid, "100000000000000002", lambda i: WEAK[i], reader)
    # An applicant who opens an attempt and never answers.
    if not done(record, "cy:expire"):
        cy = attempt(record, "cy", chains["cy"], gid, "100000000000000003", lambda i: GOOD[i], reader, grade=False)
        print("cy opened attempt", cy["id"], "and walks away; expire needs the 10 minute limit to pass")
        wait = 10 * 60 + 90
        print(f"waiting {wait} seconds for the time limit")
        time.sleep(wait)
        step(record, "cy:expire", chains["owner"], "expire", [cy["id"]], note="called by the gate owner; anyone may")
        got = reader.read_json(C.address(), "get_attempt", [cy["id"]])
        record.setdefault("attempts", {})["cy"] = {"id": cy["id"], "status": got["status"], "labels": got["labels"], "dealt": got["dealt"], "applicant": chains["cy"].account.address}
        save(record)
        print("  cy:", got["status"])
    # Money: the pass fees come back, the failed and expired fees are the owner's pool.
    for who in ("ada", "dee"):
        if record["attempts"][who]["status"] == "PASSED":
            step(record, f"{who}:withdraw", chains[who], "withdraw", [], note="the fee that came back on a pass")
    step(record, "owner:withdraw", chains["owner"], "withdraw", [], note="the pool: fees of the failed and expired attempts")
    report()


def seed_lock() -> None:
    record = load()
    people = C.accounts("seed_quill_owner", "seed_ed")
    owner = C.Chain(people["seed_quill_owner"])
    ed = C.Chain(people["seed_ed"])
    reader = C.Chain()
    owner.ensure(owner.account.address, 20)
    ed.ensure(ed.account.address, 20)
    opened = step(
        record,
        "quill:open_gate",
        owner,
        "open_gate",
        ["Quill Telegram", KILN["handbook"], json.dumps(KILN["bank"]), 2, GEN, 10, 1],
        note="the same handbook, a Telegram community, 1 hour cooldown, used to show a lock",
    )
    gid = int(opened["returned"])
    record["gates"]["quill"] = {"id": gid, "owner": owner.account.address}
    save(record)
    for n in (1, 2, 3):
        tag = f"ed{n}"
        if done(record, f"{tag}:judge"):
            continue
        if n > 1:
            state = reader.read_json(C.address(), "get_pass", [gid, ed.account.address.lower()])
            wait = max(0, int(state["next_at"]) - int(time.time())) + 120
            print(f"waiting {wait} seconds for the cooldown before attempt {n}")
            time.sleep(wait)
        attempt(record, tag, ed, gid, "100000000000000005", lambda i: WEAK[i], reader)
    report()


def report() -> None:
    record = {"contract": C.address(), "steps": [], "attempts": {}, "gates": {}}
    for path in (C.ROOT / "docs" / "seed.studio-next.json", C.ROOT / "docs" / "seed.lock.studio-next.json"):
        if path.exists():
            part = json.loads(path.read_text(encoding="utf-8"))
            record["steps"] += part["steps"]
            record["attempts"].update(part.get("attempts", {}))
            record["gates"].update(part.get("gates", {}))
    explorer = C.EXPLORER
    lines = [
        "# Seed",
        "",
        f"Written by `python scripts/seed.py` against the Doorman contract [`{record.get('contract', '')}`]({explorer}/address/{record.get('contract', '')}) on Studio Next. "
        "Every verdict below was produced by the deployed judge through real consensus, and the script recorded what the contract said, not what was hoped.",
        "",
        "The communities (Kiln, Quill), the handbook and the people are fictional and exist only for this demonstration. The Discord ids are placeholders that belong to nobody. The accounts are test accounts.",
        "",
        "## Attempts",
        "",
        "| Applicant | Gate | Attempt | Result | Labels | Applied | Closed |",
        "|---|---|---|---|---|---|---|",
    ]
    steps = {s["key"]: s for s in record["steps"]}

    def link(h: str) -> str:
        return f"[{h[:10]}…]({explorer}/tx/{h})" if h else ""

    for tag, a in record.get("attempts", {}).items():
        gate = "Kiln Discord" if tag in ("ada", "bo", "cy", "dee") else "Quill Telegram"
        applied = steps.get(f"{tag}:apply", {}).get("hash", "")
        closed = steps.get(f"{tag}:judge", steps.get(f"{tag}:expire", {})).get("hash", "")
        labels = ",".join(a["labels"]) if a["labels"] else "no labels"
        lines.append(f"| `{a['applicant'][:10]}…` ({tag}) | {gate} | {a['id']} | **{a['status']}** | {labels} | {link(applied)} | {link(closed)} |")
    lines += ["", "## Money", ""]
    for s in record["steps"]:
        if s["method"] == "withdraw":
            lines.append(f"- {s['key']}: {link(s['hash'])} {'(' + s['note'] + ')' if s.get('note') else ''}")
    lines += ["", "## Every step", ""]
    for s in record["steps"]:
        status = "ok" if s["ok"] else "FAILED"
        lines.append(f"- `{s['key']}` {s['method']} {status} {link(s['hash'])} {s['at']}")
    lines.append("")
    out = C.ROOT / "docs" / "seed.studio-next.md"
    out.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print("wrote", out.relative_to(C.ROOT).as_posix())


if __name__ == "__main__":
    if "--report" in sys.argv:
        report()
    elif "--lock" in sys.argv:
        # The lock demonstration runs for hours beside the rest, so it keeps its own record.
        RECORD = C.ROOT / "docs" / "seed.lock.studio-next.json"
        seed_lock()
    else:
        seed_kiln()

#!/usr/bin/env python3
"""
Run the golden cases through the deployed Doorman contract on Studio Next,
through real consensus, and publish what came out.

    python eval/run_golden.py --lock          # hash and timestamp golden.json, once, before the first run
    python eval/run_golden.py                 # the five golden rounds not yet decided
    python eval/run_golden.py RH              # the held-out round, once
    python eval/run_golden.py --report        # rewrite results.md from results.json

eval/golden.json was written, hashed and timestamped (eval/golden.lock.json)
before the first run, and this script refuses to run if it has changed since.

An attempt is dealt three questions from the applicant's address, so a golden
round (three cases about three different questions) needs an applicant whose
address deals exactly those three. The script makes fresh test accounts until
the real deal() hands one the right set, which takes about fifty tries and no
network; then that account applies, answers each dealt question with the case
written for it, and judge runs the real consensus. Cases are scored per item.

H1 to H3 are held out: run once, reported as they came out, never used to tune
the prompt. A round whose judge produced no labels (the committee timed out or
could not agree) is judged again, and every try stays in the record. A round
that produced labels is never run again, whatever the labels were.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))

import chain as C  # noqa: E402

# A model's reason can carry any character; the Windows console codepage cannot.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
GOLDEN = HERE / "golden.json"
LOCK = HERE / "golden.lock.json"
RESULTS = HERE / "results.json"
REPORT = HERE / "results.md"
KILN = HERE / "kiln.json"
GATE_NAME = "Kiln golden gate"


def judge_sha() -> str:
    import ast

    tree = ast.parse(C.CONTRACT_FILE.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and ast.unparse(node.targets[0]) == "JUDGE":
            return hashlib.sha256(ast.literal_eval(node.value).encode("utf-8")).hexdigest()
    raise SystemExit("no JUDGE constant")


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_results() -> dict:
    if RESULTS.exists():
        return json.loads(RESULTS.read_text(encoding="utf-8"))
    return {"rounds": [], "gate": None}


def save(results: dict) -> None:
    RESULTS.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def lock() -> None:
    if LOCK.exists():
        raise SystemExit("already locked: " + LOCK.read_text(encoding="utf-8"))
    LOCK.write_text(
        json.dumps({"file": "eval/golden.json", "sha256": C.sha256_file(GOLDEN), "locked_at": now_iso()}, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print("locked", LOCK.read_text(encoding="utf-8"))


def by_id(golden: dict) -> dict:
    return {c["id"]: c for c in golden["cases"] + golden["context"]}


def deal_fn():
    from harness import load
    import genvm_double as D

    return load(D.GL()).deal


def make_applicant(name: str, gate_id: int, wanted: set[int], bank: int, deal) -> object:
    """Fresh test accounts until the first attempt at this gate deals exactly `wanted`; kept under `name`."""
    stored = json.loads(C.KEYS.read_text(encoding="utf-8")) if C.KEYS.exists() else {}
    if name in stored:
        return C.create_account(account_private_key=stored[name])
    for tries in range(1, 5000):
        account = C.create_account()
        if set(deal(gate_id, account.address.lower(), 1, bank)) == wanted:
            stored[name] = account.key.hex()
            C.KEYS.write_text(json.dumps(stored, indent=2) + "\n", encoding="utf-8")
            print(f"  account for {name} found after {tries} tries: {account.address}")
            return account
    raise SystemExit("no account found")


def open_gate(owner: C.Chain, address: str, kiln: dict, results: dict) -> int:
    if results.get("gate"):
        return int(results["gate"]["id"])
    outcome = owner.send(address, "open_gate", [GATE_NAME, kiln["handbook"], json.dumps(kiln["bank"]), 2, 10**18, 30, 1])
    if not outcome["ok"] or not isinstance(outcome["result"], int):
        raise SystemExit("open_gate failed: " + outcome["detail"])
    results["gate"] = {"id": outcome["result"], "tx": outcome["hash"], "opened_at": now_iso(), "owner": owner.account.address}
    save(results)
    print(f"  gate {outcome['result']}  {C.EXPLORER}/tx/{outcome['hash']}")
    return int(outcome["result"])


def run(ids: list[str]) -> None:
    lock_doc = json.loads(LOCK.read_text(encoding="utf-8"))
    if C.sha256_file(GOLDEN) != lock_doc["sha256"]:
        raise SystemExit("eval/golden.json changed after it was locked; the golden set is not edited after the first run")
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    kiln = json.loads(KILN.read_text(encoding="utf-8"))
    cases = by_id(golden)
    address = C.address()
    deal = deal_fn()
    owner_account = C.accounts("golden_owner")["golden_owner"]
    owner = C.Chain(owner_account)
    owner.ensure(owner_account.address, minimum_gen=20)
    results = load_results()
    results.update(
        {
            "contract": address,
            "contract_sha256": C.deployment().get("doorman_sha256"),
            "golden_sha256": lock_doc["sha256"],
            "golden_locked_at": lock_doc["locked_at"],
            "judge_sha256": judge_sha(),
            "network": C.NETWORK,
            "explorer": C.EXPLORER,
        }
    )
    save(results)
    gate_id = open_gate(owner, address, kiln, results)
    wanted = ids or [r["id"] for r in golden["rounds"] if not r.get("held_out")]
    for rnd in golden["rounds"]:
        rid = rnd["id"]
        if rid not in wanted:
            continue
        if any(r["round"] == rid and r.get("labels") for r in results["rounds"]):
            print(f"{rid}: already decided, never run again")
            continue
        print(f"\n{rid}: cases {', '.join(rnd['items'])}")
        record = next((r for r in results["rounds"] if r["round"] == rid), None)
        if record is None:
            qs = [cases[i]["q"] for i in rnd["items"]]
            account = make_applicant("golden_" + rid.lower(), gate_id, set(qs), len(kiln["bank"]), deal)
            applicant = C.Chain(account)
            applicant.ensure(account.address, minimum_gen=20)
            dealt = deal(gate_id, account.address.lower(), 1, len(kiln["bank"]))
            by_q = {cases[i]["q"]: i for i in rnd["items"]}
            order = [by_q[q] for q in dealt]
            answers = [cases[i]["answer"] for i in order]
            record = {
                "round": rid,
                "held_out": bool(rnd.get("held_out")),
                "applicant": account.address,
                "gate": gate_id,
                "dealt": dealt,
                "order": order,
                "answers": answers,
                "tries": [],
            }
            results["rounds"].append(record)
            save(results)
        account = make_applicant("golden_" + rid.lower(), gate_id, set(), len(kiln["bank"]), deal)
        applicant = C.Chain(account)
        if not record.get("attempt_id"):
            outcome = applicant.send(address, "apply", [gate_id, "1" + str(int(rid[1:], 36)).rjust(17, "0")[-17:]], value=10**18)
            if not outcome["ok"] or not isinstance(outcome["result"], int):
                record["tries"].append({"step": "apply", "error": outcome["detail"], "tx": outcome["hash"]})
                save(results)
                raise SystemExit("apply failed: " + outcome["detail"])
            record.update({"attempt_id": outcome["result"], "apply_tx": outcome["hash"]})
            save(results)
            outcome = applicant.send(address, "submit", [record["attempt_id"], json.dumps(record["answers"])])
            if not outcome["ok"]:
                record["tries"].append({"step": "submit", "error": outcome["detail"], "tx": outcome["hash"]})
                save(results)
                raise SystemExit("submit failed: " + outcome["detail"])
            record["submit_tx"] = outcome["hash"]
            save(results)
        outcome = applicant.send(address, "judge", [record["attempt_id"]])
        try_row = {"step": "judge", "tx": outcome["hash"], "sent_at": now_iso(), "consensus": "decided" if outcome["ok"] else outcome["detail"]}
        record["tries"].append(try_row)
        if outcome["ok"]:
            stored = C.retry("get_attempt", applicant.read_json, address, "get_attempt", [record["attempt_id"]])
            record.update({"labels": stored["labels"], "status": stored["status"], "judge_tx": outcome["hash"], "dealt_onchain": stored["dealt"]})
        # Saved before anything is printed: a result that exists on chain must
        # never be lost to a failure on this side of the wire.
        save(results)
        if record.get("labels"):
            for item, label in zip(record["order"], record["labels"]):
                case = cases[item]
                if case["expected"] == "EITHER":
                    print(f"  {item:>3} {label}  (held out, no expected answer)")
                else:
                    print(f"  {item:>3} {'MATCH' if label == case['expected'] else 'MISS '} got {label}, expected {case['expected']}")
            print(f"  attempt {record['attempt_id']} {record['status']}  {C.EXPLORER}/tx/{record['judge_tx']}")
        else:
            print(f"  no labels: {try_row['consensus']}")
    report()


def report() -> None:
    results = load_results()
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    cases = by_id(golden)
    explorer = results.get("explorer", C.EXPLORER)
    rows: dict[str, dict] = {}
    for rnd in results["rounds"]:
        if not rnd.get("labels"):
            continue
        for item, label, answer in zip(rnd["order"], rnd["labels"], rnd["answers"]):
            rows[item] = {"label": label, "round": rnd, "answer": answer}

    def score(held: bool) -> tuple[int, int]:
        hits = n = 0
        for item, row in rows.items():
            case = cases[item]
            if item.startswith("C") or bool(case.get("held_out")) != held or case["expected"] == "EITHER":
                continue
            n += 1
            hits += row["label"] == case["expected"]
        return hits, n

    g_hit, g_n = score(False)
    c_hit = sum(1 for i, r in rows.items() if i.startswith("C") and r["label"] == "PASS")
    c_n = sum(1 for i in rows if i.startswith("C"))
    contract = results.get("contract", "")
    lines = [
        "# Golden cases, through real consensus",
        "",
        f"Contract [`{contract}`]({explorer}/address/{contract}) on Studio Next (chain 61997). Every round is one "
        "`apply`, one `submit` and one `judge` on the deployed contract, from a fresh test account whose address deals "
        "exactly the three questions the round needs. The labels are read back from the contract with `get_attempt`, "
        "not from the script's memory.",
        "",
        f"- Golden set: **{g_hit} of {g_n}** items matched.",
        f"- Context items (correct answers to other questions, used to fill the three slots of a round): {c_hit} of {c_n} came back PASS. Not scored.",
        "- Held-out items: reported below exactly as they came out; they have no expected answer.",
        f"- `eval/golden.json` sha256 `{results.get('golden_sha256', '')}`, locked at {results.get('golden_locked_at', '')}, before the first run.",
        f"- Judge prompt sha256 `{results.get('judge_sha256', '')}`.",
        "",
        "Nothing here was tuned. The prompt is the spec's, word for word, and no case was edited after the lock.",
        "",
        "| Case | Question | Answer | Expected | Got | Round |",
        "|---|---|---|---|---|---|",
    ]
    kiln = json.loads(KILN.read_text(encoding="utf-8"))
    order = [c["id"] for c in golden["cases"]] + [c["id"] for c in golden["context"]]
    for item in order:
        case = cases[item]
        row = rows.get(item)
        question = kiln["bank"][case["q"]]["q"]
        answer = case["answer"].replace("|", "/").replace("\n", " ")
        if len(answer) > 90:
            answer = answer[:87] + "..."
        if not row:
            lines.append(f"| {item} | {question} | {answer} | {case['expected']} | not run | |")
            continue
        exp = case["expected"]
        mark = "held out" if exp == "EITHER" else ("✓" if row["label"] == exp else "✗ miss")
        rnd = row["round"]
        lines.append(
            f"| {item}{' (held out)' if case.get('held_out') else ''} | {question} | {answer} | {exp} | {row['label']} {mark} | "
            f"[{rnd['round']}, attempt {rnd['attempt_id']}]({explorer}/tx/{rnd['judge_tx']}) |"
        )
    lines += ["", "## Every try", ""]
    extra = [(r, t) for r in results["rounds"] for t in r["tries"] if t.get("consensus") != "decided" or t.get("error")]
    if extra:
        lines.append("Tries that produced no labels, each followed by another judge of the same attempt:")
        lines.append("")
        for rnd, t in extra:
            lines.append(f"- {rnd['round']}: {t.get('consensus') or t.get('error')} ([tx]({explorer}/tx/{t['tx']}))")
    else:
        lines.append("Every round produced labels on its first judge; nothing was sent twice.")
    lines += ["", "## The rounds", ""]
    gate = results.get("gate") or {}
    if gate:
        lines.append(f"Gate {gate['id']} \"{GATE_NAME}\", opened in [{gate['tx'][:10]}…]({explorer}/tx/{gate['tx']}): pass mark 2 of 3, fee 1 GEN, 30 minutes.")
        lines.append("")
    for rnd in results["rounds"]:
        if rnd.get("labels"):
            lines.append(
                f"- {rnd['round']}: applicant `{rnd['applicant']}`, attempt {rnd['attempt_id']}, dealt questions {rnd['dealt']}, "
                f"labels {rnd['labels']} → {rnd['status']}; "
                f"apply [{rnd['apply_tx'][:10]}…]({explorer}/tx/{rnd['apply_tx']}), submit [{rnd['submit_tx'][:10]}…]({explorer}/tx/{rnd['submit_tx']}), "
                f"judge [{rnd['judge_tx'][:10]}…]({explorer}/tx/{rnd['judge_tx']})"
            )
    lines.append("")
    REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"\nwrote {REPORT.relative_to(C.ROOT).as_posix()}: golden {g_hit}/{g_n}")


if __name__ == "__main__":
    if "--lock" in sys.argv:
        lock()
    elif "--report" in sys.argv:
        report()
    else:
        run([a for a in sys.argv[1:] if not a.startswith("--")])

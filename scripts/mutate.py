#!/usr/bin/env python3
"""
Break every defence in the contract, one at a time, and name the test that notices.

    python scripts/mutate.py                          # run, print the table
    python scripts/mutate.py --table docs/MUTATIONS.md

A passing count is a claim; a table of mutations, each named with the test that
killed it, is evidence. Each mutant is a copy of contracts/doorman.py with one
defence removed or weakened. The direct and static tests run against it through
DOORMAN_CONTRACT, and the first failing test is recorded as the kill.

A kill is read from pytest's own report of which test failed, never from an
exit code alone: a runner that scores exit codes reports a perfect run while
testing nothing. The generated-files test is left out, because it fails for
ANY edit and would kill every mutant without testing its defence.

If anything escapes, the table is not written and the escapes are printed. An
escape means a missing test, or a defence strict enough elsewhere that this one
can no longer fail, and either is a finding.
"""

from __future__ import annotations

import os
import pathlib
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "contracts" / "doorman.py"

#: (what the mutant does, text in the contract, what replaces it). Each text
#: must occur exactly once, so a mutant always changes exactly one place.
MUTANTS = [
    # who may write
    ("update_gate: any account may update", 'raise gl.vm.UserError(E + "only the owner may update this gate")', "pass"),
    ("submit: any account may submit for an applicant", 'raise gl.vm.UserError(E + "only the applicant may submit these answers")', "pass"),
    ("open_gate: the gate is owned by a fixed address", "owner=gl.message.sender_address,", "owner=ZERO,"),
    (
        "apply: the attempt is not bound to the applicant",
        "            applicant=me,\n            discord_id=discord,\n            attempt_no=u32(number),",
        "            applicant=ZERO,\n            discord_id=discord,\n            attempt_no=u32(number),",
    ),
    ("withdraw: pays a fixed address", "_Payee(me).emit_transfer(value=u256(amount))", "_Payee(ZERO).emit_transfer(value=u256(amount))"),
    (
        "judge: the caller is not recorded",
        "self._close(a, g, st, PASSED if passed else RETRY, now, gl.message.sender_address)",
        "self._close(a, g, st, PASSED if passed else RETRY, now, ZERO)",
    ),
    (
        "expire: the caller is not recorded",
        "self._close(a, g, st, EXPIRED, now, gl.message.sender_address)",
        "self._close(a, g, st, EXPIRED, now, ZERO)",
    ),
    # money
    ("apply: any fee is accepted", "if value != int(g.fee):", "if value < 0:"),
    ("withdraw: the balance is not zeroed", "        self.balances[me] = u256(0)\n", ""),
    (
        "withdraw: an empty balance still sends",
        '        if amount <= 0:\n            raise gl.vm.UserError(E + "nothing to withdraw")',
        '        if amount < 0:\n            raise gl.vm.UserError(E + "nothing to withdraw")',
    ),
    ("passed: the fee is not credited back", "self._credit(a.applicant, fee)", "pass"),
    ("failed: the fee is not credited to the pool", "self._credit(g.owner, fee)", "pass"),
    ("passed: the fee destination is not recorded", 'a.fee_to = "applicant" if fee > 0 else ""', 'a.fee_to = ""'),
    ("passed: the refunded total is not counted", "g.refunded = u256(int(g.refunded) + fee)", "pass"),
    ("failed: the pool total is not counted", "g.pool = u256(int(g.pool) + fee)", "pass"),
    (
        "credit: a balance is overwritten, not added to",
        "self.balances[who] = u256(int(self.balances.get(who, u256(0))) + amount)",
        "self.balances[who] = u256(amount)",
    ),
    # the verdict
    ("verdict: needs more than the pass mark", "return labels.count(PASS) >= int(pass_mark)", "return labels.count(PASS) > int(pass_mark)"),
    ("verdict: one pass is enough", "return labels.count(PASS) >= int(pass_mark)", "return labels.count(PASS) >= 1"),
    ("passed: no pass is recorded", "            st.passed = True\n", "            pass\n"),
    ("passed: the gate does not count it", "g.passed = u32(int(g.passed) + 1)", "pass"),
    ("passed: the contract does not count it", "self.pass_count = u64(int(self.pass_count) + 1)", "pass"),
    (
        "close: the open attempt is never cleared",
        "        st.open_attempt = u64(0)\n        if outcome == PASSED:",
        "        if outcome == PASSED:",
    ),
    ("close: a third failure does not lock the status", "                a.status = LOCKED\n", "                pass\n"),
    ("close: a lock is not counted", "g.locked = u32(int(g.locked) + 1)", "pass"),
    ("close: a retry is not counted", "g.retry = u32(int(g.retry) + 1)", "pass"),
    (
        "close: an expired attempt does not count toward the lock",
        "        if int(st.used) >= MAX_ATTEMPTS:\n            # The last attempt",
        "        if int(st.used) >= MAX_ATTEMPTS and outcome != EXPIRED:\n            # The last attempt",
    ),
    ("close: a failure starts no cooldown", "st.next_at = u64(now + int(g.cooldown_h) * HOUR)", "st.next_at = u64(0)"),
    # the gate's rules
    ("open_gate: a pass mark of 1 is accepted", "if int(pass_mark) not in (2, 3):", "if int(pass_mark) not in (1, 2, 3):"),
    ("open_gate: any fee is accepted", "if int(fee) < 0 or int(fee) > MAX_FEE:", "if int(fee) < 0:"),
    (
        "open_gate: any time limit is accepted",
        "if int(time_limit_m) < MIN_LIMIT_M or int(time_limit_m) > MAX_LIMIT_M:",
        "if int(time_limit_m) < 1:",
    ),
    (
        "open_gate: any cooldown is accepted",
        "if int(cooldown_h) < MIN_COOLDOWN_H or int(cooldown_h) > MAX_COOLDOWN_H:",
        "if int(cooldown_h) < 0:",
    ),
    ("bank: forty questions are accepted", "MAX_BANK = 20", "MAX_BANK = 40"),
    ("bank: three questions are accepted", "MIN_BANK = 6", "MIN_BANK = 3"),
    ("bank: duplicate questions are accepted", "        if key in seen:", "        if False:"),
    (
        "open_gate: the 3,000-character handbook cap is gone",
        '        text = _block(handbook, "handbook", MAX_HANDBOOK)\n        questions = parse_bank(bank)\n        if int(pass_mark)',
        '        text = _block(handbook, "handbook", 10**6)\n        questions = parse_bank(bank)\n        if int(pass_mark)',
    ),
    (
        "bank: the 100-character question cap is gone",
        'question = _line(row.get("q", row.get("title")), "a question", MAX_QUESTION)',
        'question = _line(row.get("q", row.get("title")), "a question", 10**6)',
    ),
    (
        "bank: the 300-character rubric cap is gone",
        'rubric = _line(row.get("rubric"), "a rubric", MAX_RUBRIC)',
        'rubric = _line(row.get("rubric"), "a rubric", 10**6)',
    ),
    (
        "submit: the 600-character answer cap is gone",
        "MAX_ANSWER) for n, text in enumerate(parsed)]",
        "10**6) for n, text in enumerate(parsed)]",
    ),
    (
        "apply: the Discord id is not checked",
        "if not text.isdigit() or len(text) < DISCORD_MIN or len(text) > DISCORD_MAX:",
        "if False:",
    ),
    # attempts, time and locks
    ("rules: five attempts per round", "MAX_ATTEMPTS = 3", "MAX_ATTEMPTS = 5"),
    ("rules: the lock lasts six days", "LOCK_S = 7 * DAY", "LOCK_S = 6 * DAY"),
    ("apply: the cooldown is not checked", "        if now < int(st.next_at):", "        if False:"),
    ("apply: the lock is not checked", "            if now < int(st.locked_until):", "            if False:"),
    ("apply: two attempts can be open at once", "        if int(st.open_attempt) != 0:", "        if False:"),
    ("apply: a passed applicant can pay again", "        if st.passed:", "        if False:"),
    (
        "apply: a new round never starts",
        "            st.locked_until = u64(0)\n            st.used = u32(0)",
        "            st.locked_until = u64(0)",
    ),
    ("apply: a new round repeats the old questions", "number = int(st.total) + 1", "number = int(st.used) + 1"),
    (
        "apply: the deadline is twice the time limit",
        "deadline=u64(now + int(g.time_limit_m) * 60),",
        "deadline=u64(now + int(g.time_limit_m) * 120),",
    ),
    ("submit: answers after the deadline are stored", "        if self._now() > int(a.deadline):", "        if False:"),
    (
        "submit: answers can be replaced",
        '        if a.status != APPLIED:\n            raise gl.vm.UserError(E + "this attempt is not open for answers")',
        "        pass",
    ),
    ("expire: an attempt expires before its deadline", "        if now <= int(a.deadline):", "        if False:"),
    (
        "expire: an answered attempt can be expired",
        '        if a.status != APPLIED:\n            raise gl.vm.UserError(E + "this attempt is not waiting for answers")',
        "        pass",
    ),
    ("judge: an attempt without answers is graded", "        if a.status != ANSWERED:", "        if False:"),
    ("update_gate: the version is not bumped", "g.version = u32(int(g.version) + 1)", "pass"),
    (
        "judge: an open attempt is graded against the live handbook",
        "out = run_judgment(build_prompt(a.handbook, items, answers))",
        "out = run_judgment(build_prompt(g.handbook, items, answers))",
    ),
    ("apply: the attempt does not copy its questions", "            items=bank_json(items),", "            items=g.bank,"),
    ("apply: the Discord id is not kept on the standing", "        st.discord_id = discord", "        pass"),
    (
        "apply: the attempt is not indexed for the applicant",
        'self.attempt_index[skey + "#" + str(number)] = u64(aid)',
        "pass",
    ),
    # dealing
    ("deal: the address case matters", '+ "|" + str(who_hex).lower() + "|"', '+ "|" + str(who_hex) + "|"'),
    (
        "deal: the order ignores the hash",
        'key=lambda i: hashlib.sha256(h + i.to_bytes(2, "big")).digest())',
        "key=lambda i: i)",
    ),
    ("deal: only two questions are dealt", "    return order[:DEALT]", "    return order[:2]"),
    # the judge
    ("judge: the fence lets delimiters through", 'return str(raw).replace("<", "(").replace(">", ")")', "return str(raw)"),
    (
        "judge: the handbook is not fenced",
        "JUDGE.format(handbook=fence(handbook), items=items_text(items, answers))",
        "JUDGE.format(handbook=handbook, items=items_text(items, answers))",
    ),
    ("judge: answers are not fenced", "fence(answers[n])", "str(answers[n])"),
    ("judge: questions are not fenced", 'fence(items[n]["q"])', 'str(items[n]["q"])'),
    ("judge: rubrics are not fenced", 'fence(items[n]["rubric"])', 'str(items[n]["rubric"])'),
    ("judge: validators agree with any answer", 'return mine["labels"] == theirs_labels', "return True"),
    (
        "judge: validators compare the first label only",
        'return mine["labels"] == theirs_labels',
        'return mine["labels"].split(",")[0] == theirs_labels.split(",")[0]',
    ),
    (
        "judge: an unreadable label defaults to PASS",
        '        if word not in LABELS:\n            raise gl.vm.UserError(L + "bad label")',
        "        if word not in LABELS:\n            word = PASS",
    ),
    (
        "judge: any number of labels is accepted",
        "if not isinstance(labels, list) or len(labels) != count:",
        "if not isinstance(labels, list):",
    ),
    (
        "judge: a formatting slip is never retried",
        "        if not error_text(first).startswith(L):\n            raise",
        "        raise",
    ),
]

EXCLUDED = [
    "tests/test_static.py::test_generated_files_are_what_the_generator_writes",
    "tests/test_static.py::test_the_site_reads_the_frozen_deployment",
    "tests/test_static.py::test_no_private_key_in_the_repository",
    "tests/test_static.py::test_the_browser_deals_the_same_three",
]


def first_failure(output: str) -> str | None:
    for line in output.splitlines():
        match = re.match(r"FAILED (\S+)", line.strip())
        if match:
            return match.group(1).split(" - ")[0]
    return None


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    rows: list[tuple[int, str, str]] = []
    escapes: list[str] = []
    with tempfile.TemporaryDirectory() as folder:
        mutant = pathlib.Path(folder) / "doorman.py"
        for index, (what, old, new) in enumerate(MUTANTS, 1):
            count = source.count(old)
            if count != 1:
                raise SystemExit(f"mutant {index} ({what}) matches {count} places; it must match exactly one")
            mutant.write_text(source.replace(old, new), encoding="utf-8", newline="\n")
            env = dict(os.environ, DOORMAN_CONTRACT=str(mutant))
            command = [
                sys.executable, "-m", "pytest", "tests/test_direct.py", "tests/test_static.py",
                "-x", "-q", "--tb=no", "-rf", "-p", "no:cacheprovider",
            ] + [arg for test in EXCLUDED for arg in ("--deselect", test)]
            result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8")
            killer = first_failure(result.stdout)
            if result.returncode == 0 or killer is None:
                escapes.append(what)
                print(f"  {index:2} ESCAPED  {what}")
            else:
                rows.append((index, what, killer))
                print(f"  {index:2} killed   {what}  <- {killer}")
    if escapes:
        print(f"\n{len(escapes)} mutant(s) escaped; no table written:")
        for what in escapes:
            print(f"  - {what}")
        return 1
    if "--table" in sys.argv:
        target = ROOT / sys.argv[sys.argv.index("--table") + 1]
        lines = [
            "# Mutations",
            "",
            f"Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. {len(rows)} defences in",
            "`contracts/doorman.py` were each broken on their own, and every mutant was caught. Each row",
            "names the first test that failed against it, read from pytest's report rather than an exit code.",
            "The generated-files, frozen-deployment, browser-parity and private-key tests are excluded,",
            "because the first three fail for any edit at all and the last reads files, not the contract.",
            "",
            "One check is deliberately not mutated: the validator's test that the leader's payload is a dict",
            "with a string `labels`. The labels comparison right below it already refuses anything else, so no",
            "test can tell the two apart; it stays so the validator never depends on how the runtime treats an",
            "exception raised inside it.",
            "",
            "| # | defence broken | caught by |",
            "|---|---|---|",
        ] + [f"| {i} | {what} | `{killer}` |" for i, what, killer in rows]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        print(f"\nwrote {target.relative_to(ROOT).as_posix()}")
    print(f"\n{len(rows)} of {len(MUTANTS)} killed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

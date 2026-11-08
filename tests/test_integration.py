"""
Read-only checks against the deployed contract on Studio Next.

Skipped unless DOORMAN_INTEGRATION=1, so the suite stays offline and green on
a reviewer's machine. Nothing here writes or spends: the writes were proven by
eval/run_golden.py, scripts/seed.py and the reviewer-path run in docs/.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

pytestmark = pytest.mark.skipif(os.environ.get("DOORMAN_INTEGRATION") != "1", reason="set DOORMAN_INTEGRATION=1 to read the live network")


@pytest.fixture(scope="module")
def live():
    import chain as C

    return C, C.Chain(), C.address()


def test_the_deployed_code_is_the_repository_s(live):
    import verify

    C, chain, address = live
    onchain = verify.deployed_source(chain, address)
    assert onchain == C.CONTRACT_FILE.read_text(encoding="utf-8")


def test_the_live_schema_has_the_ten_methods(live):
    C, chain, address = live
    schema = C.retry("schema", chain.client.get_contract_schema, address)
    assert sorted(schema["methods"]) == sorted(
        ["open_gate", "update_gate", "apply", "submit", "judge", "expire", "withdraw", "get_gate", "get_attempt", "get_pass"]
    )


def test_every_golden_round_reads_back_as_recorded(live):
    C, chain, address = live
    results = json.loads((ROOT / "eval" / "results.json").read_text(encoding="utf-8"))
    for rnd in results["rounds"]:
        if not rnd.get("labels"):
            continue
        stored = chain.read_json(address, "get_attempt", [rnd["attempt_id"]])
        assert stored["labels"] == rnd["labels"], rnd["round"]
        assert stored["answers"] == rnd["answers"], rnd["round"]


def test_unknown_ids_read_as_not_found(live):
    C, chain, address = live
    assert chain.read_json(address, "get_attempt", [10**6])["found"] is False
    assert chain.read_json(address, "get_gate", [10**6])["found"] is False
    assert chain.read_json(address, "get_pass", [10**6, "0x" + "00" * 20])["found"] is False
    assert chain.read_json(address, "get_pass", [1, "not an address"])["found"] is False


def test_the_browser_and_the_chain_deal_the_same_three(live):
    """get_pass previews the next deal; the browser's deal.mjs must give the same."""
    import subprocess

    C, chain, address = live
    who = "0x" + "ab" * 20
    gate = chain.read_json(address, "get_gate", [1])
    stored = chain.read_json(address, "get_pass", [1, who])
    script = (
        "import { deal } from './lib/deal.mjs';"
        f"console.log(JSON.stringify(deal(1, '{who}', {stored['next_attempt_no']}, {gate['bank_size']})));"
    )
    result = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, cwd=ROOT / "web")
    assert json.loads(result.stdout) == stored["next_dealt"], result.stderr

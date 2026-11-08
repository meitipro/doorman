"""
Loads the REAL contract file against the doubles in genvm_double.py.

Nothing is copied or re-implemented here, so a change to contracts/doorman.py
is a change to what these tests exercise. The runner comment on the first lines
of the contract is ignored by CPython, so the file imports as ordinary Python.
"""

from __future__ import annotations

import datetime
import importlib.util
import json
import os
import pathlib
import sys
import types

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
#: DOORMAN_CONTRACT points the suite at a mutant; scripts/mutate.py sets it.
CONTRACT = pathlib.Path(os.environ.get("DOORMAN_CONTRACT") or ROOT / "contracts" / "doorman.py")

sys.path.insert(0, str(HERE))

import genvm_double as D  # noqa: E402

GEN = 10**18
HOUR = 3600
DAY = 86400

#: 2026-09-01T00:00:00Z. Every world starts here.
T0 = 1788220800

KILN = json.loads((ROOT / "eval" / "kiln.json").read_text(encoding="utf-8"))


def _install(gl: D.GL) -> None:
    """
    Publish a `genlayer` package shaped like py-genlayer:babwp9t3 (Studio Next):
    the star import brings Address and the integer types, `import genlayer as gl`
    is the package itself, and the storage names live in genlayer.storage. An
    import the contract left out fails here rather than on chain.
    """
    storage = types.ModuleType("genlayer.storage")
    storage.TreeMap = D.TreeMap
    storage.DynArray = D.DynArray
    storage.allow = D.allow_storage
    module = types.ModuleType("genlayer")
    module.Address = D.Address
    for name in ("u8", "u16", "u32", "u64", "u256"):
        setattr(module, name, getattr(D, name))
    for name in ("contract", "vm", "message", "public", "nondet", "evm"):
        setattr(module, name, getattr(gl, name))
    module.storage = storage
    module.__all__ = ["Address", "u8", "u16", "u32", "u64", "u256"]
    sys.modules["genlayer"] = module
    sys.modules["genlayer.storage"] = storage


def load(gl: D.GL, path: pathlib.Path | None = None, name: str = "doorman_contract") -> types.ModuleType:
    """Import the contract fresh against this gl."""
    _install(gl)
    spec = importlib.util.spec_from_file_location(name, path or CONTRACT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def labels_answer(*labels: str) -> str:
    """A model answer, as the model would type it."""
    return json.dumps({"labels": list(labels)})


class World:
    """
    One Doorman contract and the accounts around it.

    Time is explicit: `at(seconds)` sets the transaction datetime the contract
    reads, because nothing on chain moves the clock on its own and the time
    limit, the cooldown and the lock are the things these tests most need to
    control. The accounts model fees honestly: `sender(address, value)` sends
    value with the call, and `received` totals everything the contract was paid.
    """

    OWNER = "0x" + "c1" * 20
    ALICE = "0x" + "a1" * 20
    BOB = "0x" + "a2" * 20
    CAROL = "0x" + "a3" * 20
    STRANGER = "0x" + "d4" * 20

    NAME = KILN["name"]
    HANDBOOK = KILN["handbook"]
    BANK = KILN["bank"]
    FEE = 1 * GEN
    DISCORD = "100000000000000001"

    def __init__(self) -> None:
        self.gl = D.GL()
        self.mod = load(self.gl)
        self.at(T0)
        self.sender(self.OWNER)
        self.c = self.mod.Doorman()
        self.received = 0

    # -- controls ----------------------------------------------------------

    def at(self, seconds: int) -> "World":
        self.t = int(seconds)
        stamp = datetime.datetime.fromtimestamp(self.t, datetime.timezone.utc)
        self.gl.message.raw["datetime"] = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return self

    def advance(self, seconds: int) -> "World":
        return self.at(self.t + seconds)

    def sender(self, address: str, value: int = 0) -> "World":
        self.gl.message.sender_address = D.Address(address)
        self.gl.message.origin_address = D.Address(address)
        self.gl.message.value = int(value)
        return self

    @property
    def leader(self) -> D.NodeWorld:
        return self.gl.nondet.leader

    @property
    def validators(self) -> list[D.NodeWorld]:
        return self.gl.nondet.validators

    def nodes(self) -> list[D.NodeWorld]:
        return [self.leader, *self.validators]

    # -- shorthands --------------------------------------------------------

    def open(self, name=None, handbook=None, bank=None, pass_mark=2, fee=None, limit_m=10, cooldown_h=12, who=None) -> int:
        self.sender(who or self.OWNER)
        payload = bank if bank is not None else self.BANK
        return int(
            self.c.open_gate(
                name if name is not None else self.NAME,
                handbook if handbook is not None else self.HANDBOOK,
                payload if isinstance(payload, str) else json.dumps(payload),
                pass_mark,
                self.FEE if fee is None else fee,
                limit_m,
                cooldown_h,
            )
        )

    def update(self, handbook=None, bank=None, gid: int = 1, who=None) -> int:
        self.sender(who or self.OWNER)
        payload = bank if bank is not None else self.BANK
        return int(
            self.c.update_gate(
                gid,
                handbook if handbook is not None else self.HANDBOOK,
                payload if isinstance(payload, str) else json.dumps(payload),
            )
        )

    def apply(self, gid: int = 1, who=None, discord=None, value=None) -> int:
        gate = self.gate(gid)
        pay = int(gate["fee"]) if value is None else int(value)
        self.sender(who or self.ALICE, pay)
        try:
            aid = int(self.c.apply(gid, discord if discord is not None else self.DISCORD))
        finally:
            self.sender(who or self.ALICE)
        self.received += pay
        return aid

    def answers(self, aid: int, texts=None, who=None) -> int:
        given = texts if texts is not None else ["First answer.", "Second answer.", "Third answer."]
        self.sender(who or self.attempt(aid)["applicant"])
        return int(self.c.submit(aid, given if isinstance(given, str) else json.dumps(given)))

    def queue(self, *labels: str, validator=None) -> None:
        """One model answer for the leader and one for each validator."""
        self.leader.answers.append(labels_answer(*labels))
        for world in self.validators:
            world.answers.append(labels_answer(*(validator or labels)))

    def judge(self, aid: int, *labels: str, validator=None, who=None) -> int:
        self.queue(*labels, validator=validator)
        self.sender(who or self.STRANGER)
        return int(self.c.judge(aid))

    def expire(self, aid: int, who=None) -> int:
        self.sender(who or self.STRANGER)
        return int(self.c.expire(aid))

    def withdraw(self, who=None) -> int:
        self.sender(who or self.OWNER)
        return int(self.c.withdraw())

    def play(self, *labels: str, gid: int = 1, who=None, texts=None) -> int:
        """apply, submit and judge in one go; returns the attempt id."""
        aid = self.apply(gid, who=who)
        self.answers(aid, texts, who=who)
        self.judge(aid, *labels)
        return aid

    # -- reads -------------------------------------------------------------

    def gate(self, gid: int = 1) -> dict:
        return json.loads(self.c.get_gate(gid))

    def attempt(self, aid: int) -> dict:
        return json.loads(self.c.get_attempt(aid))

    def standing(self, who: str | None = None, gid: int = 1) -> dict:
        return json.loads(self.c.get_pass(gid, who or self.ALICE))

    def paid_to(self, address: str) -> int:
        return sum(t.value for t in self.gl.bus.transfers if t.to.lower() == address.lower())

    def paid_out(self) -> int:
        return sum(t.value for t in self.gl.bus.transfers)

    def owed(self) -> int:
        """Everything the contract holds for someone: balances plus the fees of open attempts."""
        total = 0
        for balance in self.c.balances.values():
            total += int(balance)
        for attempt in self.c.attempts.values():
            if attempt.status in (self.mod.APPLIED, self.mod.ANSWERED):
                total += int(attempt.fee)
        return total

    def balances_add_up(self) -> None:
        """Every wei the contract was paid is either still owed, or was paid out."""
        assert self.received == self.owed() + self.paid_out(), (self.received, self.owed(), self.paid_out())


def refused(prefix: str, fn, *args, **kwargs) -> str:
    """Assert the call is refused, and that the refusal is the sentence it should be."""
    try:
        fn(*args, **kwargs)
    except D.UserError as error:
        message = str(error)
        assert message.startswith("[EXPECTED] "), f"unprefixed refusal: {message}"
        assert prefix in message, f"expected {prefix!r}, got {message!r}"
        return message
    raise AssertionError(f"expected a refusal containing {prefix!r}, nothing was raised")

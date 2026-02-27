#!/usr/bin/env python3
"""CLowl v0.2 — Reference Python Library

A minimal, stdlib-only Python library for creating, validating, and translating
CLowl messages.

No external dependencies. Python 3.8+ only.
"""

import json
import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, Union, List


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CLOWL_VERSION = "0.2"

VALID_PERFORMATIVES = frozenset({
    "REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"
})

VALID_DELEGATION_MODES = frozenset({"transfer", "fork", "assist"})

PERFORMATIVE_NAMES = {
    "REQ":  "REQUEST",
    "INF":  "INFORM",
    "ACK":  "ACKNOWLEDGE",
    "ERR":  "ERROR",
    "DLGT": "DELEGATE",
    "DONE": "COMPLETE",
    "CNCL": "CANCEL",
    "QRY":  "QUERY",
    "PROG": "PROGRESS",
    "CAPS": "CAPABILITIES",
}


# ---------------------------------------------------------------------------
# ID generation
# ---------------------------------------------------------------------------

def generate_mid() -> str:
    """Generate a time-ordered message ID (UUIDv7-style).

    Format: <timestamp_ms_hex>-<4-hex-groups from uuid4>
    Sorts lexicographically by creation time.
    """
    ts_ms = int(time.time() * 1000)
    rand  = uuid.uuid4().hex
    # UUIDv7-style: 48-bit timestamp prefix + version + random
    return f"{ts_ms:012x}-7{rand[1:4]}-{rand[4:8]}-{rand[8:12]}-{rand[12:24]}"


def generate_cid() -> str:
    """Generate a conversation ID."""
    return uuid.uuid4().hex[:16]


def generate_tid() -> str:
    """Generate a trace ID."""
    return "t-" + uuid.uuid4().hex[:12]


def sha256_of_file(path: str) -> Optional[str]:
    """Compute SHA-256 of a file's contents. Returns None if file not found."""
    try:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except (FileNotFoundError, PermissionError):
        return None


# ---------------------------------------------------------------------------
# CLowlMessage
# ---------------------------------------------------------------------------

class CLowlMessage:
    """Represents a single CLowl v0.2 message.

    Required fields: clowl, mid, ts, p, from_, to, cid, body
    Optional fields: tid, pid, ctx, auth, det
    """

    def __init__(
        self,
        p: str,
        from_: str,
        to: Union[str, List[str]],
        cid: str,
        body_t: str,
        body_d: Optional[dict] = None,
        *,
        mid: Optional[str] = None,
        ts: Optional[int] = None,
        tid: Optional[str] = None,
        pid: Optional[str] = None,
        ctx: Optional[dict] = None,
        auth: Optional[str] = None,
        det: bool = False,
    ):
        self.clowl  = CLOWL_VERSION
        self.mid   = mid or generate_mid()
        self.ts    = ts  or int(time.time())
        self.tid   = tid
        self.pid   = pid
        self.p     = p
        self.from_ = from_
        self.to    = to
        self.cid   = cid
        self.body  = {"t": body_t, "d": body_d or {}}
        self.ctx   = ctx
        self.auth  = auth
        self.det   = det

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Convert to a Python dict (suitable for JSON serialization)."""
        d: dict = {
            "clowl": self.clowl,
            "mid":  self.mid,
            "ts":   self.ts,
            "p":    self.p,
            "from": self.from_,
            "to":   self.to,
            "cid":  self.cid,
            "body": self.body,
        }
        # Optional fields — only include if set
        if self.tid  is not None: d["tid"]  = self.tid
        if self.pid  is not None: d["pid"]  = self.pid
        if self.ctx  is not None: d["ctx"]  = self.ctx
        if self.auth is not None: d["auth"] = self.auth
        if self.det:              d["det"]  = self.det
        return d

    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: dict) -> "CLowlMessage":
        """Construct a CLowlMessage from a dict (e.g., parsed JSON)."""
        body   = data.get("body", {})
        body_t = body.get("t", "")
        body_d = body.get("d", {})
        return cls(
            p      = data["p"],
            from_  = data["from"],
            to     = data["to"],
            cid    = data["cid"],
            body_t = body_t,
            body_d = body_d,
            mid    = data.get("mid"),
            ts     = data.get("ts"),
            tid    = data.get("tid"),
            pid    = data.get("pid"),
            ctx    = data.get("ctx"),
            auth   = data.get("auth"),
            det    = data.get("det", False),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "CLowlMessage":
        """Construct a CLowlMessage from a JSON string."""
        return cls.from_dict(json.loads(json_str))

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self) -> list:
        """Validate the message. Returns a list of error strings (empty = valid)."""
        errors = []

        if self.clowl != CLOWL_VERSION:
            errors.append(f"Invalid clowl version: '{self.clowl}' (expected '{CLOWL_VERSION}')")

        if not self.mid:
            errors.append("Missing required field: mid")

        if not isinstance(self.ts, int) or self.ts < 0:
            errors.append(f"Invalid ts: {self.ts!r} (must be non-negative integer)")

        if self.p not in VALID_PERFORMATIVES:
            errors.append(f"Invalid performative: '{self.p}' (must be one of {sorted(VALID_PERFORMATIVES)})")

        if not self.from_:
            errors.append("Missing required field: from")

        if not self.to:
            errors.append("Missing required field: to")

        if not self.cid:
            errors.append("Missing required field: cid")

        if not isinstance(self.body, dict):
            errors.append("body must be an object")
        else:
            if not self.body.get("t"):
                errors.append("body.t is required")
            if not isinstance(self.body.get("d"), dict):
                errors.append("body.d must be an object")

        # DLGT requires delegation_mode
        if self.p == "DLGT":
            d = self.body.get("d", {})
            mode = d.get("delegation_mode")
            if mode not in VALID_DELEGATION_MODES:
                errors.append(
                    f"DLGT messages require body.d.delegation_mode to be one of "
                    f"{sorted(VALID_DELEGATION_MODES)}, got {mode!r}"
                )

        # ctx validation
        if self.ctx is not None:
            if not isinstance(self.ctx, dict):
                errors.append("ctx must be an object with ref/inline/hash fields")
            else:
                inline = self.ctx.get("inline")
                if inline and len(inline) > 2000:
                    errors.append(f"ctx.inline exceeds 2000 character limit (got {len(inline)})")
                h = self.ctx.get("hash")
                if h and not (isinstance(h, str) and len(h) == 64):
                    errors.append(f"ctx.hash must be a 64-char SHA-256 hex string")

        return errors

    def is_valid(self) -> bool:
        """Return True if the message passes validation."""
        return len(self.validate()) == 0

    # ------------------------------------------------------------------
    # Human translation
    # ------------------------------------------------------------------

    def to_human(self) -> str:
        """Return a human-readable English description of this message."""
        ts_str = datetime.fromtimestamp(self.ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        perf   = PERFORMATIVE_NAMES.get(self.p, self.p)
        to_str = "[" + ", ".join(self.to) + "]" if isinstance(self.to, list) else self.to

        body_d    = self.body.get("d", {})
        body_t    = self.body.get("t", "")
        tid_tag   = f"[{self.tid}] " if self.tid else ""
        pid_tag   = f" (re: {self.pid[:8]}…)" if self.pid else ""
        det_tag   = " [deterministic]" if self.det else ""
        auth_tag  = " [authenticated]" if self.auth else ""

        # Body summary
        if self.p == "ERR":
            code   = body_d.get("code", "?")
            msg    = body_d.get("msg", "unknown error")
            retry  = " — retryable" if body_d.get("retry") else ""
            detail = f"[{code}] {msg}{retry}"
        elif self.p == "CAPS":
            supports = body_d.get("supports", [])
            ver      = body_d.get("clowl", "?")
            detail   = f"CLowl v{ver} | supports: {', '.join(supports)}"
        elif self.p == "DLGT":
            mode   = body_d.get("delegation_mode", "transfer")
            rest   = {k: v for k, v in body_d.items() if k != "delegation_mode"}
            detail = f"{body_t} [{mode}]"
            if rest:
                detail += f" — {json.dumps(rest)}"
        elif self.p == "PROG":
            pct  = body_d.get("pct")
            note = body_d.get("note", "")
            detail = f"{body_t} — {pct}% {note}".strip(" —") if pct is not None else f"{body_t} — {note}"
        elif self.p == "ACK":
            eta    = body_d.get("eta")
            detail = f"Acknowledged {body_t}" + (f" — ETA {eta}" if eta else "")
        elif body_d:
            detail = f"{body_t} — {json.dumps(body_d)}"
        else:
            detail = body_t

        ctx_str = ""
        if self.ctx:
            ref = self.ctx.get("ref")
            h   = self.ctx.get("hash")
            if ref:
                ctx_str = f" | ctx: {ref}"
                if h:
                    ctx_str += f" (sha256: {h[:12]}…)"

        return (
            f"[{ts_str}] {tid_tag}"
            f"{self.from_} → {to_str}: {perf} {detail}"
            f"{ctx_str}{det_tag}{pid_tag}{auth_tag}"
        )

    def __repr__(self) -> str:
        return f"CLowlMessage(p={self.p!r}, from={self.from_!r}, to={self.to!r}, t={self.body.get('t')!r})"


# ---------------------------------------------------------------------------
# Factory methods
# ---------------------------------------------------------------------------

def create_req(
    from_: str, to: Union[str, List[str]], cid: str, task: str,
    data: Optional[dict] = None, **kwargs
) -> CLowlMessage:
    """Create a REQ (Request) message."""
    return CLowlMessage("REQ", from_, to, cid, task, data or {}, **kwargs)


def create_ack(
    from_: str, to: str, cid: str, task: str,
    data: Optional[dict] = None, **kwargs
) -> CLowlMessage:
    """Create an ACK (Acknowledge) message."""
    return CLowlMessage("ACK", from_, to, cid, task, data or {}, **kwargs)


def create_done(
    from_: str, to: str, cid: str, task: str,
    data: Optional[dict] = None, **kwargs
) -> CLowlMessage:
    """Create a DONE (Complete) message."""
    return CLowlMessage("DONE", from_, to, cid, task, data or {}, **kwargs)


def create_err(
    from_: str, to: str, cid: str,
    code: str, msg: str, retry: bool = False, **kwargs
) -> CLowlMessage:
    """Create an ERR (Error) message."""
    return CLowlMessage("ERR", from_, to, cid, "error", {
        "code": code, "msg": msg, "retry": retry
    }, **kwargs)


def create_dlgt(
    from_: str, to: str, cid: str, task: str,
    delegation_mode: str = "transfer",
    data: Optional[dict] = None, **kwargs
) -> CLowlMessage:
    """Create a DLGT (Delegate) message.

    delegation_mode: 'transfer' | 'fork' | 'assist'
    """
    if delegation_mode not in VALID_DELEGATION_MODES:
        raise ValueError(f"delegation_mode must be one of {sorted(VALID_DELEGATION_MODES)}")
    d = {"delegation_mode": delegation_mode}
    if data:
        d.update(data)
    return CLowlMessage("DLGT", from_, to, cid, task, d, **kwargs)


def create_prog(
    from_: str, to: str, cid: str, task: str,
    pct: Optional[int] = None, note: str = "", **kwargs
) -> CLowlMessage:
    """Create a PROG (Progress) message."""
    data: dict = {}
    if pct is not None:
        data["pct"] = pct
    if note:
        data["note"] = note
    return CLowlMessage("PROG", from_, to, cid, task, data, **kwargs)


def create_caps(
    from_: str, supports: List[str], **kwargs
) -> CLowlMessage:
    """Create a CAPS (Capabilities) message. Broadcasts to '*'."""
    return CLowlMessage("CAPS", from_, "*", "system", "capabilities", {
        "supports": supports,
        "clowl": CLOWL_VERSION,
    }, **kwargs)


def create_cncl(
    from_: str, to: str, cid: str, task: str,
    reason: str = "", **kwargs
) -> CLowlMessage:
    """Create a CNCL (Cancel) message."""
    data = {"reason": reason} if reason else {}
    return CLowlMessage("CNCL", from_, to, cid, task, data, **kwargs)


# ---------------------------------------------------------------------------
# __main__ — example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== CLowl v0.2 Reference Library — Example Usage ===\n")

    # Shared conversation / trace IDs
    cid = generate_cid()
    tid = generate_tid()
    print(f"Conversation: {cid}")
    print(f"Trace:        {tid}\n")

    # 1. Radar advertises capabilities
    caps = create_caps("radar", ["search:web", "search:repo", "analyze:trend"])
    print("1. CAPS broadcast:")
    print(caps.to_human())
    print()

    # 2. Oscar requests a search
    req = create_req(
        "oscar", "radar", cid, "search",
        {"q": "MCP vs A2A comparison", "scope": "web"},
        tid=tid,
    )
    errors = req.validate()
    assert not errors, f"Validation failed: {errors}"
    print("2. REQ (with validation):")
    print(req.to_human())
    print()

    # 3. Radar acknowledges
    ack = create_ack("radar", "oscar", cid, "search", {"eta": "60s"},
                     tid=tid, pid=req.mid)
    print("3. ACK:")
    print(ack.to_human())
    print()

    # 4. Radar sends progress
    prog = create_prog("radar", "oscar", cid, "search", pct=50,
                       note="Indexed 4 of 8 sources",
                       tid=tid, pid=req.mid)
    print("4. PROG:")
    print(prog.to_human())
    print()

    # 5. Radar completes
    done = create_done("radar", "oscar", cid, "search",
                       {"result_path": "research/mcp-vs-a2a.md", "sources": 8},
                       tid=tid, pid=req.mid, det=True)
    print("5. DONE (deterministic):")
    print(done.to_human())
    print()

    # 6. Oscar delegates to Muse (transfer mode)
    dlgt = create_dlgt(
        "oscar", "muse", cid, "analyze",
        delegation_mode="transfer",
        data={"target": "content angle", "type": "competitive"},
        tid=tid, pid=done.mid,
        ctx={"ref": "research/mcp-vs-a2a.md", "inline": None, "hash": None},
    )
    print("6. DLGT (transfer):")
    print(dlgt.to_human())
    print()

    # 7. Error example
    err = create_err("muse", "oscar", cid, "E003",
                     "Context file not found: research/mcp-vs-a2a.md",
                     retry=True, tid=tid)
    print("7. ERR (retryable):")
    print(err.to_human())
    print()

    # 8. Broadcast INF to multiple agents
    broadcast = CLowlMessage(
        "INF", "oscar", ["radar", "muse", "ink"], cid, "notify",
        {"message": "Pipeline starting for MCP vs A2A analysis"},
        tid=tid,
    )
    print("8. INF broadcast to [radar, muse, ink]:")
    print(broadcast.to_human())
    print()

    # 9. Cancel
    cncl = create_cncl("oscar", "radar", cid, "search",
                       reason="Scope changed, no longer needed", tid=tid)
    print("9. CNCL:")
    print(cncl.to_human())
    print()

    # 10. Round-trip: to_dict → from_dict
    d    = req.to_dict()
    req2 = CLowlMessage.from_dict(d)
    assert req2.mid == req.mid
    assert req2.body == req.body
    print("10. Round-trip (to_dict → from_dict): ✓")
    print()

    # 11. Show full JSON for the REQ
    print("11. Full JSON for REQ message:")
    print(req.to_json())

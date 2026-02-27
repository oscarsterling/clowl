#!/usr/bin/env python3
"""CLowl Translator v0.2 — bidirectional conversion between CLowl JSON and human-readable English.

Usage:
    python translator.py '<clowl_json>'
    python translator.py 'Oscar asks Radar to search the web for CLowl competitors'
    echo '<clowl_json>' | python translator.py
    python translator.py --trace t001 --log messages.jsonl
    python translator.py --to-clowl 'Oscar asks Radar to search for CLowl competitors'

Modes:
    Default         Auto-detect CLowl JSON or English, translate the other way
    --to-clowl       Force English → CLowl JSON conversion
    --to-human      Force CLowl JSON → English conversion
    --trace <tid>   Reconstruct full conversation timeline from a log file (requires --log)
    --log <file>    JSONL log file for --trace (one CLowl message per line)

No external dependencies. Python 3.8+ stdlib only.
"""

import json
import re
import sys
import uuid
import time
import hashlib
import argparse
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Performatives
# ---------------------------------------------------------------------------

PERFORMATIVES = {
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

PERFORMATIVES_REV = {v: k for k, v in PERFORMATIVES.items()}

DELEGATION_MODES = {
    "transfer": "full handoff (original agent done)",
    "fork":     "parallel work (original continues)",
    "assist":   "assist (original remains accountable)",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fmt_ts(ts) -> str:
    """Format a Unix timestamp to a readable string."""
    if ts is None:
        return "?"
    try:
        dt = datetime.fromtimestamp(int(ts), tz=timezone.utc)
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except (ValueError, OSError):
        return str(ts)


def _fmt_to(to) -> str:
    """Format the 'to' field (string or list)."""
    if isinstance(to, list):
        return "[" + ", ".join(str(x) for x in to) + "]"
    return str(to)


def _summarize_body(p: str, body: dict) -> str:
    """Produce a concise summary of the message body."""
    task = body.get("t", "")
    data = body.get("d", {})

    if p == "ERR":
        code = data.get("code", "?")
        msg  = data.get("msg", "unknown error")
        retry = " — retryable" if data.get("retry") else ""
        return f"[{code}] {msg}{retry}"

    if p == "CAPS":
        supports = data.get("supports", [])
        ver = data.get("clowl", "?")
        caps_str = ", ".join(supports) if supports else "none listed"
        return f"CLowl v{ver} | supports: {caps_str}"

    if p == "ACK":
        eta = data.get("eta")
        return f"Acknowledged {task}" + (f" — ETA {eta}" if eta else "")

    if p == "PROG":
        pct  = data.get("pct")
        note = data.get("note", "")
        pct_str = f"{pct}% " if pct is not None else ""
        return f"{task} — {pct_str}{note}".strip(" —")

    if p == "CNCL":
        reason = data.get("reason", "")
        return f"Cancel {task}" + (f" — {reason}" if reason else "")

    if p == "DLGT":
        mode = data.get("delegation_mode", "transfer")
        mode_desc = DELEGATION_MODES.get(mode, mode)
        # Remove delegation_mode from display data
        rest = {k: v for k, v in data.items() if k != "delegation_mode"}
        detail = json.dumps(rest) if rest else ""
        return f"{task} [{mode_desc}]" + (f" — {detail}" if detail else "")

    if p == "DONE":
        # Surface the most useful field: path, result_path, answer, summary
        for key in ("path", "result_path", "answer", "summary", "output"):
            if key in data:
                return f"{task} — {key}: {data[key]}"
        if data:
            return f"{task} — {json.dumps(data)}"
        return task

    if p in ("REQ", "QRY"):
        # Try common fields
        if "q" in data:
            scope = data.get("scope", "")
            return f"{task} — \"{data['q']}\"" + (f" ({scope})" if scope else "")
        if data:
            return f"{task} — {json.dumps(data)}"
        return task

    if p == "INF":
        for key in ("answer", "content", "message", "summary"):
            if key in data:
                return f"{task} — {data[key]}"
        if data:
            return f"{task} — {json.dumps(data)}"
        return task

    if data:
        return f"{task} — {json.dumps(data)}"
    return task or "(no body)"


def _fmt_ctx(ctx) -> str:
    """Format ctx field to a readable string."""
    if not ctx:
        return ""
    if isinstance(ctx, str):
        # v0.1 compat: ctx was a plain string
        return f" | ctx: {ctx}"
    if isinstance(ctx, dict):
        ref    = ctx.get("ref")
        inline = ctx.get("inline")
        h      = ctx.get("hash")
        parts  = []
        if ref:
            parts.append(f"ref: {ref}")
        if h:
            parts.append(f"sha256: {h[:12]}…")
        if inline and not ref:
            parts.append(f"inline: {inline[:60]}…" if len(inline) > 60 else f"inline: {inline}")
        if inline and ref:
            parts.append("(inline fallback available)")
        return " | ctx: " + ", ".join(parts) if parts else ""
    return ""


# ---------------------------------------------------------------------------
# CLowl → Human
# ---------------------------------------------------------------------------

def clowl_to_human(msg: dict) -> str:
    """Convert a CLowl v0.2 (or v0.1) JSON message to a human-readable log line."""
    ts      = _fmt_ts(msg.get("ts"))
    tid     = msg.get("tid")
    mid     = msg.get("mid", "")
    pid     = msg.get("pid")
    sender  = msg.get("from", "?")
    to_raw  = msg.get("to", "?")
    receiver = _fmt_to(to_raw)
    p       = msg.get("p", "?")
    perf    = PERFORMATIVES.get(p, p)
    body    = msg.get("body", {})
    det     = msg.get("det", False)
    ctx     = msg.get("ctx")
    auth    = msg.get("auth")

    body_desc = _summarize_body(p, body)
    ctx_str   = _fmt_ctx(ctx)
    det_str   = " [deterministic]" if det else ""
    pid_str   = f" (re: {pid[:8]}…)" if pid else ""
    auth_str  = " [authenticated]" if auth else ""

    tid_tag = f"[{tid}] " if tid else ""
    mid_tag = f"[{mid[:8]}…] " if mid else ""

    return (
        f"[{ts}] {tid_tag}{mid_tag}"
        f"{sender} → {receiver}: {perf} {body_desc}"
        f"{ctx_str}{det_str}{pid_str}{auth_str}"
    )


# ---------------------------------------------------------------------------
# Human → CLowl
# ---------------------------------------------------------------------------

def _now_mid() -> str:
    """Generate a simple time-ordered message ID (UUIDv7-style)."""
    ts_ms = int(time.time() * 1000)
    rand  = uuid.uuid4().hex[12:]
    return f"{ts_ms:013x}-{rand}"


def human_to_clowl(text: str) -> dict:
    """Best-effort conversion of English description to CLowl v0.2 JSON."""
    msg = {
        "clowl": "0.2",
        "mid":  _now_mid(),
        "ts":   int(time.time()),
        "pid":  None,
        "cid":  uuid.uuid4().hex[:12],
        "det":  False,
    }

    # Pattern: [From → To] PERFORMATIVE: detail (ctx: ...)
    m_bracket = re.match(
        r"\[([^\]]+?)\s*[→\->]+\s*([^\]]+?)\]\s*(\w+):\s*(.+?)(?:\s*\|\s*ctx:\s*(.+?))?\s*$",
        text, re.IGNORECASE,
    )

    if m_bracket:
        sender   = m_bracket.group(1).strip().lower()
        receiver = m_bracket.group(2).strip().lower()
        perf_w   = m_bracket.group(3).strip().upper()
        detail   = m_bracket.group(4).strip()
        ctx_str  = m_bracket.group(5)

        msg["from"] = sender
        msg["to"]   = receiver
        msg["p"]    = PERFORMATIVES_REV.get(perf_w, "REQ")
        if ctx_str:
            msg["ctx"] = {"ref": ctx_str.strip(), "inline": None, "hash": None}
        task, data = _parse_detail(detail, msg["p"])
        msg["body"] = {"t": task, "d": data}
        return msg

    # Natural language patterns
    text_l = text.lower()

    # Detect from/to
    sender   = "unknown"
    receiver = "unknown"
    perf     = "REQ"

    # "X asks Y to ..."  /  "X tells Y ..."  /  "X informs Y ..."
    m_nat = re.match(
        r"(\w+)\s+(?:asks?|tells?|informs?|requests?|notifies?|queries?|cancels?|delegates?\s+to)\s+(\w+)\s+(?:to\s+)?(.+)",
        text_l,
    )
    if m_nat:
        sender   = m_nat.group(1)
        receiver = m_nat.group(2)
        action   = m_nat.group(3).strip()
        perf     = "REQ"
        if any(w in text_l for w in ("informs", "tells", "notifies")):
            perf = "INF"
        if "queries" in text_l:
            perf = "QRY"
        if "cancels" in text_l:
            perf = "CNCL"
        task, data = _parse_detail(action, perf)
    else:
        task, data = _parse_detail(text_l, perf)

    msg["from"] = sender
    msg["to"]   = receiver
    msg["p"]    = perf
    msg["body"] = {"t": task, "d": data}
    return msg


def _parse_detail(detail: str, p: str = "REQ") -> tuple:
    """Extract task type and data dict from a detail string."""
    dl = detail.lower().strip()

    patterns = [
        (r"search(?:ing)?\s+(?:the\s+web\s+)?for\s+['\"]?(.+?)['\"]?(?:\s+\((\w+)\s+scope\))?$",
         lambda m: ("search", {"q": m.group(1).strip(), "scope": m.group(2) or "web"})),
        (r"draft(?:ing)?\s+(?:a\s+)?(.+)",
         lambda m: ("draft", {"topic": m.group(1).strip()})),
        (r"analy[sz]e\s+(.+)",
         lambda m: ("analyze", {"target": m.group(1).strip()})),
        (r"review(?:ing)?\s+(.+)",
         lambda m: ("review", {"target": m.group(1).strip()})),
        (r"summari[sz]e\s+(.+)",
         lambda m: ("summarize", {"target": m.group(1).strip()})),
        (r"deploy(?:ing)?\s+(?:to\s+)?(.+)",
         lambda m: ("deploy", {"target": m.group(1).strip()})),
        (r"read(?:ing)?\s+(.+)",
         lambda m: ("read", {"path": m.group(1).strip()})),
        (r"write\s+to\s+(.+)",
         lambda m: ("write", {"path": m.group(1).strip()})),
        (r"notify\s+(.+)",
         lambda m: ("notify", {"recipient": m.group(1).strip()})),
        (r"escalat(?:e|ing)\s+(.+)",
         lambda m: ("escalate", {"issue": m.group(1).strip()})),
        (r"cancel(?:l?ing)?\s+(.+)",
         lambda m: ("cancel", {"target": m.group(1).strip()})),
        (r"(?:query|querying|check|status of)\s+(.+)",
         lambda m: ("query", {"target": m.group(1).strip()})),
    ]

    for pattern, builder in patterns:
        m = re.match(pattern, dl)
        if m:
            return builder(m)

    if "acknowledged" in dl or "proceeding" in dl:
        return "ack", {}

    return "task", {"description": detail}


# ---------------------------------------------------------------------------
# Trace reconstruction
# ---------------------------------------------------------------------------

def trace(tid: str, log_file: str) -> str:
    """Reconstruct the full timeline for a trace ID from a JSONL log file."""
    messages = []
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    msg = json.loads(line)
                    if msg.get("tid") == tid:
                        messages.append(msg)
                except json.JSONDecodeError as e:
                    sys.stderr.write(f"Warning: line {lineno} is not valid JSON: {e}\n")
    except FileNotFoundError:
        return f"Error: log file not found: {log_file}"

    if not messages:
        return f"No messages found for trace ID: {tid}"

    # Sort by ts, then by mid lexicographically as tiebreaker
    messages.sort(key=lambda m: (m.get("ts", 0), m.get("mid", "")))

    lines = [f"=== Trace: {tid} ({len(messages)} messages) ===", ""]
    for msg in messages:
        lines.append(clowl_to_human(msg))
    lines.append("")
    lines.append(f"=== End of trace {tid} ===")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Auto-detect and translate
# ---------------------------------------------------------------------------

def translate(input_str: str) -> str:
    """Auto-detect input format and translate to the other format."""
    stripped = input_str.strip()
    if stripped.startswith("{") or stripped.startswith("[{"):
        # Looks like JSON — try CLowl → Human
        try:
            if stripped.startswith("["):
                msgs = json.loads(stripped)
                return "\n".join(clowl_to_human(m) for m in msgs)
            else:
                msg = json.loads(stripped)
                return clowl_to_human(msg)
        except json.JSONDecodeError:
            pass
    # Human → CLowl
    return json.dumps(human_to_clowl(stripped), indent=2)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="CLowl Translator v0.2 — CLowl JSON ↔ English",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python translator.py '{"clowl":"0.2","p":"REQ","from":"oscar","to":"radar",...}'
  python translator.py 'Oscar asks Radar to search the web for CLowl competitors'
  python translator.py --trace t001 --log messages.jsonl
  echo '{"clowl":"0.2",...}' | python translator.py
        """,
    )
    parser.add_argument("input", nargs="?", help="CLowl JSON or English text")
    parser.add_argument("--to-clowl",  action="store_true", help="Force English → CLowl")
    parser.add_argument("--to-human", action="store_true", help="Force CLowl → English")
    parser.add_argument("--trace", metavar="TID", help="Reconstruct timeline for this trace ID")
    parser.add_argument("--log",   metavar="FILE", help="JSONL log file (required with --trace)")

    args = parser.parse_args()

    # --trace mode
    if args.trace:
        if not args.log:
            parser.error("--trace requires --log <file>")
        print(trace(args.trace, args.log))
        return

    # Get input text
    if args.input:
        text = args.input
    elif not sys.stdin.isatty():
        text = sys.stdin.read()
    else:
        parser.print_help()
        sys.exit(1)

    text = text.strip()

    if args.to_clowl:
        print(json.dumps(human_to_clowl(text), indent=2))
    elif args.to_human:
        try:
            msg = json.loads(text)
            if isinstance(msg, list):
                for m in msg:
                    print(clowl_to_human(m))
            else:
                print(clowl_to_human(msg))
        except json.JSONDecodeError as e:
            print(f"Error: input is not valid JSON: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(translate(text))


if __name__ == "__main__":
    main()

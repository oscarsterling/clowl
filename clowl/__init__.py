"""CLowl v0.2 - A structured communication language for AI agent-to-agent messaging.

Usage:
    from clowl import CLowlMessage, create_req, create_done, generate_cid, generate_tid
"""

from .clowl import (
    CLOWL_VERSION,
    VALID_PERFORMATIVES,
    VALID_DELEGATION_MODES,
    PERFORMATIVE_NAMES,
    CLowlMessage,
    generate_mid,
    generate_cid,
    generate_tid,
    sha256_of_file,
    create_req,
    create_ack,
    create_done,
    create_err,
    create_dlgt,
    create_prog,
    create_caps,
    create_cncl,
)

__version__ = CLOWL_VERSION
__all__ = [
    "CLOWL_VERSION",
    "VALID_PERFORMATIVES",
    "VALID_DELEGATION_MODES",
    "PERFORMATIVE_NAMES",
    "CLowlMessage",
    "generate_mid",
    "generate_cid",
    "generate_tid",
    "sha256_of_file",
    "create_req",
    "create_ack",
    "create_done",
    "create_err",
    "create_dlgt",
    "create_prog",
    "create_caps",
    "create_cncl",
]

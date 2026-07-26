#!/usr/bin/env python3
"""CLowl v0.2 reference library, root re-export shim.

The canonical implementation lives in clowl/clowl.py and is imported by the
clowl package. This root module is a thin re-export so that imports targeting
the repo-root file and direct execution (python3 clowl.py) keep working. Do
not add logic here; edit clowl/clowl.py instead. fixtures/run-conformance.sh
fails the build if this file stops being a shim.
"""

from clowl.clowl import *  # noqa: F401,F403
from clowl.clowl import (
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
    reconstruct_progress,
    ProgressReconstruction,
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
    "reconstruct_progress",
    "ProgressReconstruction",
]

if __name__ == "__main__":
    from clowl.clowl import _demo
    _demo()

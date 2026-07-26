"""CLowl generated-constant layer, root re-export shim.

The canonical generated file is clowl/_generated.py, emitted by
tools/gen_sdk_layer.py from clowl-schema.json. This root module is a thin
re-export so imports targeting the repo-root file keep working. Do not edit
or generate this file; edit the schema and regenerate clowl/_generated.py.
"""

from clowl._generated import *  # noqa: F401,F403
from clowl._generated import (
    CLOWL_VERSION,
    VALID_PERFORMATIVES,
    VALID_DELEGATION_MODES,
    REQUIRED_FIELDS,
    BODY_REQUIRED_FIELDS,
    KNOWN_FIELDS,
    CTX_INLINE_MAX_LENGTH,
    CTX_HASH_LENGTH,
    PROGRESS_PCT_MIN,
    PROGRESS_PCT_MAX,
    PROGRESS_SEQ_MIN,
    PROGRESS_PARTIAL_FIELDS,
)

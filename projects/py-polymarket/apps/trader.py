"""CLI shim that dispatches to the unified launcher trade command."""

from __future__ import annotations

import argparse
import sys
from typing import List, Optional

from apps.launcher import build_parser


def main(argv: Optional[List[str]] = None) -> None:
    """Delegate to ``apps.launcher`` so trade flags stay in one place."""

    args = list(sys.argv[1:] if argv is None else argv)
    parser = build_parser()
    parser.prog = "polymarket-trader"
    for action in parser._actions:  # type: ignore[attr-defined]
        if isinstance(action, argparse._SubParsersAction):
            if "trade" in action.choices:
                action.choices["trade"].prog = "polymarket-trader"
            break
    parsed = parser.parse_args(["trade", *args])
    if not getattr(parsed, "func", None):
        parser.print_help()
        return
    parsed.func(parsed)


if __name__ == "__main__":
    main()

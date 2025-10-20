"""CLI shim delegating to the unified launcher monitor command."""

from __future__ import annotations

import argparse
import sys
from typing import List, Optional

from apps.launcher import build_parser


def main(argv: Optional[List[str]] = None) -> None:
    """Forward CLI args to the monitor subcommand."""

    args = list(sys.argv[1:] if argv is None else argv)
    parser = build_parser()
    parser.prog = "polymarket-monitor"
    for action in parser._actions:  # type: ignore[attr-defined]
        if isinstance(action, argparse._SubParsersAction):
            if "monitor" in action.choices:
                action.choices["monitor"].prog = "polymarket-monitor"
            break
    parsed = parser.parse_args(["monitor", *args])
    if not getattr(parsed, "func", None):
        parser.print_help()
        return
    parsed.func(parsed)


if __name__ == "__main__":
    main()

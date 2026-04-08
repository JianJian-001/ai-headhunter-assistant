#!/usr/bin/env python3
import sys
from pathlib import Path

SHARED_PYTHON_DIR = Path(__file__).resolve().parents[2] / "headhunter_shared" / "python"
if str(SHARED_PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_PYTHON_DIR))

from headhunter_shared.cli_io import dump_json, emit_error, load_payload
from headhunter_shared.messaging_runtime import build_outreach_sequence


def main() -> None:
    try:
        payload = load_payload()
        result = build_outreach_sequence(payload)
        dump_json(result)
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)


if __name__ == "__main__":
    main()

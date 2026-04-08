import json
import sys
from pathlib import Path
from typing import Any


def emit_error(message: str) -> None:
    json.dump({"error": message}, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def dump_json(payload: Any) -> None:
    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def load_payload() -> dict[str, Any]:
    try:
        if len(sys.argv) > 1:
            input_path = Path(sys.argv[1])
            with input_path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        return json.load(sys.stdin)
    except FileNotFoundError as error:
        raise ValueError("输入文件不存在") from error
    except json.JSONDecodeError as error:
        raise ValueError("输入不是合法的 JSON") from error

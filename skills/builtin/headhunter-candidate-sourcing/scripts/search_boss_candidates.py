#!/usr/bin/env python3
import json
import sys
from typing import Any

from platform_candidate_utils import build_platform_candidate, build_platform_search_terms, emit_error, load_payload


def main() -> None:
    try:
        payload = load_payload()
        job = payload.get("job")
        if not isinstance(job, dict):
            raise ValueError("输入必须包含 job 对象")

        raw_cards = payload.get("cards") or payload.get("boss_cards") or []
        if raw_cards and not isinstance(raw_cards, list):
            raise ValueError("cards/boss_cards 必须是数组")

        candidates: list[dict[str, Any]] = []
        for raw_card in raw_cards:
            candidate = build_platform_candidate(job, "boss", raw_card)
            if candidate:
                candidates.append(candidate)

        result = {
            "job": job,
            "platform": "boss",
            "platform_name": "BOSS直聘",
            "search_terms": build_platform_search_terms(job, "boss"),
            "candidates": candidates,
            "total_candidates": len(candidates),
        }
        if not raw_cards:
            result["message"] = (
                "当前未提供 BOSS 结构化候选人卡片；可先通过浏览器自动化或人工整理卡片后回填，再接入统一流水线。"
            )

        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"BOSS 候选人适配失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

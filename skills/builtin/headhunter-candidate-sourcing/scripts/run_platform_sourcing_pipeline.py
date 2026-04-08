#!/usr/bin/env python3
import json
import sys
from typing import Any

from normalize_candidates import normalize_candidate, normalize_job
from platform_candidate_utils import build_platform_candidate, collect_cards, emit_error, load_payload
from rank_candidates import deduplicate_candidates
from run_public_sourcing_pipeline import build_handoffs, build_public_candidates, enrich_ranked_candidate


def extend_candidates(target: list[dict[str, Any]], raw_candidates: Any) -> None:
    if raw_candidates is None:
        return
    if not isinstance(raw_candidates, list):
        raise ValueError("平台候选人结果必须是数组")
    for raw_candidate in raw_candidates:
        if not isinstance(raw_candidate, dict):
            raise ValueError("平台候选人数组中的每一项都必须是对象")
        target.append(raw_candidate)


def deduplicate_raw_cards(raw_cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduplicated_cards: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for raw_card in raw_cards:
        dedupe_key = "|".join(
            [
                str(raw_card.get("url") or raw_card.get("profile_url") or "").strip().lower(),
                str(raw_card.get("name") or raw_card.get("candidate_name") or "").strip().lower(),
                str(raw_card.get("current_company") or raw_card.get("company") or "").strip().lower(),
                str(raw_card.get("current_title") or raw_card.get("title") or "").strip().lower(),
            ]
        )
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        deduplicated_cards.append(raw_card)
    return deduplicated_cards


def collect_platform_candidates(job: dict[str, Any], payload: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    platform_candidates: list[dict[str, Any]] = []

    for platform_key in ("boss", "liepin", "zhilian"):
        platform_raw_cards: list[dict[str, Any]] = []
        platform_raw_cards.extend(collect_cards(payload, platform_key, allow_generic_cards=False))

        platform_results = payload.get("platform_results")
        if platform_results is not None:
            if not isinstance(platform_results, dict):
                raise ValueError("platform_results 必须是对象")
            platform_result = platform_results.get(platform_key)
            if isinstance(platform_result, dict) and isinstance(platform_result.get("cards"), list):
                platform_raw_cards.extend(platform_result["cards"])

        for raw_card in deduplicate_raw_cards(platform_raw_cards):
            candidate = build_platform_candidate(job, platform_key, raw_card)
            if candidate:
                platform_candidates.append(candidate)

        extend_candidates(platform_candidates, payload.get(f"{platform_key}_candidates"))

    extend_candidates(platform_candidates, payload.get("platform_candidates"))

    platform_results = payload.get("platform_results")
    if platform_results is not None:
        if not isinstance(platform_results, dict):
            raise ValueError("platform_results 必须是对象")
        for platform_name, platform_result in platform_results.items():
            if not isinstance(platform_result, dict):
                raise ValueError(f"{platform_name} 平台结果必须是对象")
            extend_candidates(platform_candidates, platform_result.get("candidates"))

    source_summary: dict[str, int] = {}
    for candidate in platform_candidates:
        source_type = str(candidate.get("source_type") or "platform")
        source_summary[source_type] = source_summary.get(source_type, 0) + 1
    return platform_candidates, source_summary


def main() -> None:
    try:
        payload = load_payload()
        raw_job = payload.get("job")
        if not isinstance(raw_job, dict):
            raise ValueError("输入必须包含 job 对象")

        normalized_job = normalize_job(raw_job)
        queries_used, public_candidates, valid_search_results, total_search_result_count = build_public_candidates(
            normalized_job, payload
        )
        platform_candidates, platform_source_summary = collect_platform_candidates(normalized_job, payload)

        local_candidates = payload.get("local_candidates", [])
        if not isinstance(local_candidates, list):
            raise ValueError("local_candidates 必须是数组")

        normalized_candidates: list[dict[str, Any]] = []
        for raw_candidate in public_candidates + platform_candidates + local_candidates:
            if not isinstance(raw_candidate, dict):
                raise ValueError("候选人数组中的每一项都必须是对象")
            normalized_candidates.append(normalize_candidate(raw_candidate, normalized_job["job_id"]))

        deduplicated_candidates = deduplicate_candidates(normalized_candidates)
        ranked_candidates = [
            enrich_ranked_candidate(normalized_job, candidate) for candidate in deduplicated_candidates
        ]
        ranked_candidates.sort(
            key=lambda candidate: (
                candidate.get("match_score", 0),
                len(candidate.get("contact_channels", {})),
                candidate.get("source_credibility", 0),
            ),
            reverse=True,
        )
        top_candidates = ranked_candidates[:10]

        result = {
            "job": normalized_job,
            "queries_used": queries_used,
            "search_results_used": valid_search_results,
            "search_results_dropped_count": max(total_search_result_count - len(valid_search_results), 0),
            "public_candidates": public_candidates,
            "platform_candidates": platform_candidates,
            "platform_source_summary": platform_source_summary,
            "normalized_candidates": normalized_candidates,
            "deduplicated_candidates": deduplicated_candidates,
            "top_candidates": top_candidates,
            "handoffs": build_handoffs(normalized_job, top_candidates),
        }
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"平台候选人流水线执行失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

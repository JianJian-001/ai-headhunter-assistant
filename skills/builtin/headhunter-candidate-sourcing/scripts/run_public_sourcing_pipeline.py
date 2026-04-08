#!/usr/bin/env python3
import json
import sys
from typing import Any

from extract_public_candidates import build_public_candidate
from normalize_candidates import normalize_candidate, normalize_job
from rank_candidates import build_table_recommendations, deduplicate_candidates, route_candidate, score_candidate
from prepare_skill_handoffs import build_task_queue_item, build_table_record
from search_public_results import build_queries, parse_duckduckgo_html


def emit_error(message: str) -> None:
    json.dump({"error": message}, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def load_payload() -> dict[str, Any]:
    try:
        if len(sys.argv) > 1:
            with open(sys.argv[1], "r", encoding="utf-8") as handle:
                return json.load(handle)
        return json.load(sys.stdin)
    except FileNotFoundError:
        raise ValueError("输入文件不存在")
    except json.JSONDecodeError as error:
        raise ValueError("输入不是合法的 JSON") from error


def build_public_candidates(
    job: dict[str, Any], payload: dict[str, Any]
) -> tuple[list[str], list[dict[str, Any]], list[dict[str, Any]], int]:
    search_results = payload.get("search_results") or payload.get("public_results")
    html_pages = payload.get("html_pages")
    queries_used = build_queries(job)
    if search_results is None and html_pages is None:
        return queries_used, [], [], 0

    if search_results is None:
        if not isinstance(html_pages, list):
            raise ValueError("html_pages 必须是数组")
        query_limit = int(payload.get("query_limit", 3))
        if query_limit <= 0:
            raise ValueError("query_limit 必须大于 0")
        queries_used = build_queries(job)[:query_limit]
        if len(html_pages) != len(queries_used):
            raise ValueError("html_pages 数量必须与 queries 数量一致")
        parsed_results: list[dict[str, Any]] = []
        for query, html_page in zip(queries_used, html_pages):
            for result_item in parse_duckduckgo_html(str(html_page)):
                result_item["query"] = query
                parsed_results.append(result_item)
        search_results = parsed_results
    total_search_result_count = len(search_results)

    if not isinstance(search_results, list):
        raise ValueError("search_results 必须是数组")

    public_candidates: list[dict[str, Any]] = []
    valid_search_results: list[dict[str, Any]] = []
    for result_item in search_results:
        if not isinstance(result_item, dict):
            raise ValueError("search_results 数组中的每一项都必须是对象")
        candidate = build_public_candidate(job, result_item)
        if candidate:
            public_candidates.append(candidate)
            valid_search_results.append(result_item)
    return queries_used, public_candidates, valid_search_results, total_search_result_count


def enrich_ranked_candidate(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    match_score, match_reasons, risk_flags = score_candidate(job, candidate)
    recommended_next_skill, recommended_priority = route_candidate(candidate, match_score, risk_flags)
    enriched_candidate = dict(candidate)
    enriched_candidate["match_score"] = match_score
    enriched_candidate["match_reasons"] = match_reasons
    enriched_candidate["risk_flags"] = risk_flags
    enriched_candidate["recommended_next_skill"] = recommended_next_skill
    enriched_candidate["recommended_priority"] = recommended_priority
    enriched_candidate["task_payload"] = {
        "skill": recommended_next_skill,
        "priority": recommended_priority,
        "candidate_id": enriched_candidate.get("candidate_id"),
        "candidate_name": enriched_candidate.get("name"),
        "job_id": job.get("job_id"),
        "match_score": match_score,
        "summary": "；".join(match_reasons[:2]) or "待进一步确认",
    }
    enriched_candidate["table_recommendation"] = build_table_recommendations(enriched_candidate)
    table_record = build_table_record(job, enriched_candidate)
    enriched_candidate["table_record"] = {
        "target_table": table_record["target_table"],
        "fields": table_record["fields"],
    }
    return enriched_candidate


def build_handoffs(job: dict[str, Any], top_candidates: list[dict[str, Any]]) -> dict[str, Any]:
    handoffs = {
        "table_manage": {"人才库": [], "招聘项目进展": []},
        "task_queue": [],
    }
    for candidate in top_candidates:
        table_record = candidate["table_record"]
        handoffs["table_manage"][table_record["target_table"]].append(table_record["fields"])
        handoffs["task_queue"].append(build_task_queue_item(job, candidate))
    return handoffs


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

        local_candidates = payload.get("local_candidates", [])
        if not isinstance(local_candidates, list):
            raise ValueError("local_candidates 必须是数组")

        normalized_candidates: list[dict[str, Any]] = []
        for raw_candidate in public_candidates + local_candidates:
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
        emit_error(f"公开寻访流水线执行失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

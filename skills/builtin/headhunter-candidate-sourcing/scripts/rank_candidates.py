#!/usr/bin/env python3
import json
import re
import sys
from copy import deepcopy
from typing import Any

from normalize_candidates import normalize_job

COMMUNICATION_STATUS_ALIASES = {
    "new_lead": "new_lead",
    "new": "new_lead",
    "评估中": "new_lead",
    "contacted": "contacted",
    "已联系": "contacted",
    "connected": "connected",
    "已建联": "connected",
    "interviewing": "interviewing",
    "面试": "interviewing",
    "recommended": "recommended",
    "推荐": "recommended",
    "inactive": "inactive",
    "沉默": "inactive",
}


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


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_values = value
    elif isinstance(value, dict):
        raw_values = list(value.values())
    else:
        raw_values = str(value).replace("，", ",").replace("；", ",").replace("/", ",").split(",")
    normalized_values: list[str] = []
    seen_values: set[str] = set()
    for raw_value in raw_values:
        cleaned_value = normalize_text(raw_value)
        if cleaned_value and cleaned_value not in seen_values:
            normalized_values.append(cleaned_value)
            seen_values.add(cleaned_value)
    return normalized_values


def normalize_contact_channels(candidate: dict[str, Any]) -> dict[str, str]:
    contact_channels = candidate.get("contact_channels")
    if not isinstance(contact_channels, dict):
        return {}
    normalized_channels: dict[str, str] = {}
    for channel_name, channel_value in contact_channels.items():
        cleaned_name = normalize_text(channel_name).lower()
        cleaned_value = normalize_text(channel_value)
        if cleaned_name and cleaned_value:
            normalized_channels[cleaned_name] = cleaned_value
    return normalized_channels


def normalize_communication_status(value: Any) -> str:
    cleaned_value = normalize_text(value)
    if not cleaned_value:
        return "new_lead"
    return COMMUNICATION_STATUS_ALIASES.get(
        cleaned_value.lower(),
        COMMUNICATION_STATUS_ALIASES.get(cleaned_value, "new_lead"),
    )


def normalize_phone(value: str) -> str:
    cleaned_value = re.sub(r"[^\d+]", "", normalize_text(value))
    if cleaned_value.startswith("+86"):
        return cleaned_value[3:]
    return cleaned_value


def normalize_email(value: str) -> str:
    return normalize_text(value).lower().replace(" ", "")


def has_reachable_contact(contact_channels: dict[str, str]) -> bool:
    for channel_name in ("phone", "wechat", "email", "linkedin", "maimai", "boss", "liepin", "zhilian"):
        if normalize_text(contact_channels.get(channel_name)):
            return True
    return False


def parse_salary_numbers(raw_text: str) -> list[int]:
    salary_segments = re.findall(r"\d+\s*(?:k|K|万)", raw_text)
    if salary_segments:
        return [int(re.search(r"\d+", segment).group()) for segment in salary_segments if re.search(r"\d+", segment)]
    return [int(number) for number in re.findall(r"\d+", raw_text)]


def normalize_skills(candidate: dict[str, Any]) -> set[str]:
    values = normalize_list(candidate.get("skills"))
    return {normalize_text(value).lower() for value in values if normalize_text(value)}


def dedupe_key(candidate: dict[str, Any]) -> str:
    contact_channels = normalize_contact_channels(candidate)
    candidate_id = normalize_text(candidate.get("candidate_id"))
    if candidate_id:
        return f"candidate_id:{candidate_id}"
    for channel_name in ("phone", "wechat", "email"):
        raw_channel_value = normalize_text(contact_channels.get(channel_name))
        if channel_name == "phone":
            channel_value = normalize_phone(raw_channel_value)
        elif channel_name == "email":
            channel_value = normalize_email(raw_channel_value)
        else:
            channel_value = raw_channel_value.lower()
        if channel_value:
            return f"{channel_name}:{channel_value.lower()}"
    source_reference = normalize_text(candidate.get("source_url_or_path"))
    if source_reference:
        return f"source:{source_reference.lower()}"
    return "|".join(
        [
            normalize_text(candidate.get("name")).lower(),
            normalize_text(candidate.get("current_company")).lower(),
            normalize_text(candidate.get("current_title")).lower(),
        ]
    )


def choose_better_candidate(existing_candidate: dict[str, Any], incoming_candidate: dict[str, Any]) -> dict[str, Any]:
    existing_score = candidate_completeness(existing_candidate)
    incoming_score = candidate_completeness(incoming_candidate)
    incoming_is_primary = incoming_score > existing_score
    primary_candidate = deepcopy(incoming_candidate if incoming_is_primary else existing_candidate)
    secondary_candidate = existing_candidate if incoming_is_primary else incoming_candidate

    merged_evidence = list(dict.fromkeys(primary_candidate.get("evidence", []) + secondary_candidate.get("evidence", [])))
    merged_skills = list(dict.fromkeys(primary_candidate.get("skills", []) + secondary_candidate.get("skills", [])))
    merged_notes = "\n".join(filter(None, [primary_candidate.get("notes", ""), secondary_candidate.get("notes", "")])).strip()
    merged_channels = dict(secondary_candidate.get("contact_channels", {}))
    merged_channels.update(primary_candidate.get("contact_channels", {}))

    primary_candidate["evidence"] = merged_evidence
    primary_candidate["skills"] = merged_skills
    primary_candidate["contact_channels"] = merged_channels
    primary_candidate["notes"] = merged_notes
    primary_candidate["has_local_resume"] = primary_candidate.get("has_local_resume") or secondary_candidate.get(
        "has_local_resume"
    )
    primary_candidate["has_report"] = primary_candidate.get("has_report") or secondary_candidate.get("has_report")
    primary_candidate["needs_client_push"] = primary_candidate.get("needs_client_push") or secondary_candidate.get(
        "needs_client_push"
    )
    return primary_candidate


def candidate_completeness(candidate: dict[str, Any]) -> int:
    completeness_score = 0
    for field_name in ("name", "current_company", "current_title", "location", "seniority", "education"):
        if normalize_text(candidate.get(field_name)):
            completeness_score += 1
    completeness_score += len(normalize_list(candidate.get("skills", [])))
    completeness_score += len(candidate.get("contact_channels", {})) * 2
    completeness_score += len(candidate.get("evidence", []))
    completeness_score += 3 if candidate.get("has_local_resume") else 0
    completeness_score += 2 if candidate.get("has_report") else 0
    return completeness_score


def deduplicate_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduplicated_candidates: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        candidate_key = dedupe_key(candidate)
        existing_candidate = deduplicated_candidates.get(candidate_key)
        deduplicated_candidates[candidate_key] = (
            choose_better_candidate(existing_candidate, candidate) if existing_candidate else deepcopy(candidate)
        )
    return list(deduplicated_candidates.values())


def score_candidate(job: dict[str, Any], candidate: dict[str, Any]) -> tuple[int, list[str], list[str]]:
    total_score = 0
    match_reasons: list[str] = []
    risk_flags: list[str] = []

    candidate_skills = normalize_skills(candidate)
    must_have_skills = [normalize_text(skill).lower() for skill in normalize_list(job.get("must_have_skills", []))]
    preferred_skills = [normalize_text(skill).lower() for skill in normalize_list(job.get("nice_to_have_skills", []))]
    keywords = [normalize_text(keyword).lower() for keyword in normalize_list(job.get("keywords", []))]
    candidate_profile_text = " ".join(
        [
            normalize_text(candidate.get("current_company")).lower(),
            normalize_text(candidate.get("current_title")).lower(),
            normalize_text(candidate.get("notes")).lower(),
            " ".join(candidate.get("evidence", [])).lower(),
        ]
    )
    source_credibility = candidate.get("source_credibility", 0)
    try:
        source_credibility = int(source_credibility)
    except (TypeError, ValueError):
        source_credibility = 0

    must_hit_count = sum(1 for skill in must_have_skills if skill and skill in candidate_skills)
    must_skill_score = min(must_hit_count * 8, 24)
    total_score += must_skill_score
    if must_hit_count:
        match_reasons.append(f"命中 {must_hit_count} 项硬性技能")

    preferred_hit_count = sum(1 for skill in preferred_skills if skill and skill in candidate_skills)
    keyword_hit_count = sum(
        1 for keyword in keywords if keyword and (keyword in candidate_skills or keyword in candidate_profile_text)
    )
    experience_score = min(preferred_hit_count * 3 + keyword_hit_count * 2, 10)
    total_score += experience_score
    if preferred_hit_count or keyword_hit_count:
        match_reasons.append("岗位关键词和候选人标签存在明显重合")

    company_background_score = 0
    if normalize_text(candidate.get("current_company")):
        company_background_score += 4
    if len(candidate.get("evidence", [])) >= 2:
        company_background_score += 4
    total_score += min(company_background_score, 8)

    education_score = 0
    education = normalize_text(candidate.get("education")).lower()
    if education in {"博士", "phd"}:
        education_score = 7
    elif education in {"硕士", "master"}:
        education_score = 5
    elif education in {"本科", "bachelor"}:
        education_score = 3
    total_score += education_score

    current_title = normalize_text(candidate.get("current_title")).lower()
    seniority = normalize_text(candidate.get("seniority")).lower()
    if any(token in current_title for token in ("专家", "leader", "lead", "主管", "经理", "director")) or seniority in {
        "senior",
        "lead",
        "director",
        "executive",
    }:
        total_score += 8
        match_reasons.append("当前职级与目标岗位接近")
    elif current_title:
        total_score += 4

    job_city = normalize_text(job.get("city")).lower()
    candidate_location = normalize_text(candidate.get("location")).lower()
    if job_city and candidate_location:
        if job_city in candidate_location or candidate_location in job_city:
            total_score += 4
        else:
            risk_flags.append("地点匹配度一般")
    elif job_city:
        risk_flags.append("候选人地点信息缺失")

    salary_range = normalize_text(job.get("salary_range"))
    candidate_notes = normalize_text(candidate.get("notes"))
    if salary_range and candidate_notes:
        job_salary_numbers = parse_salary_numbers(salary_range)
        note_salary_numbers = parse_salary_numbers(candidate_notes)
        if job_salary_numbers and note_salary_numbers:
            if max(note_salary_numbers) >= min(job_salary_numbers):
                total_score += 4
            else:
                risk_flags.append("薪资可能不匹配")

    contact_channels = normalize_contact_channels(candidate)
    if normalize_text(contact_channels.get("phone")):
        total_score += 5
    if normalize_text(contact_channels.get("wechat")):
        total_score += 5
    other_contact_count = sum(
        1
        for channel_name in ("email", "linkedin", "maimai", "boss", "liepin", "zhilian")
        if normalize_text(contact_channels.get(channel_name))
    )
    total_score += min(other_contact_count * 2, 5)
    if not has_reachable_contact(contact_channels):
        risk_flags.append("缺少可直接触达渠道")

    if candidate.get("source_type") == "lark_talent_base":
        total_score += 3
    if candidate.get("source_type") == "lark_project_progress":
        total_score += 3
    total_score += min(max(source_credibility, 0), 10)
    if normalize_text(candidate.get("notes")):
        total_score += 2
    if candidate.get("has_report"):
        total_score += 2

    evidence_count = len(candidate.get("evidence", []))
    if evidence_count == 0:
        total_score -= 5
        risk_flags.append("缺少证据字段")
    elif evidence_count == 1:
        risk_flags.append("证据来源较单一")
    if candidate.get("source_type") == "web_public" and source_credibility < 6:
        risk_flags.append("公开来源可信度一般")

    if not candidate_skills:
        total_score -= 4
        risk_flags.append("技能标签不足")
    if not normalize_text(candidate.get("current_company")):
        total_score -= 2
        risk_flags.append("当前公司信息缺失")
    if not normalize_text(candidate.get("current_title")):
        total_score -= 2
        risk_flags.append("当前岗位信息缺失")

    total_score = max(0, min(total_score, 100))
    return total_score, match_reasons[:3], risk_flags[:3]


def route_candidate(candidate: dict[str, Any], match_score: int, risk_flags: list[str]) -> tuple[str, str]:
    communication_status = normalize_communication_status(candidate.get("communication_status"))
    has_local_resume = bool(candidate.get("has_local_resume"))
    has_report = bool(candidate.get("has_report"))
    needs_client_push = bool(candidate.get("needs_client_push"))
    contact_channels = normalize_contact_channels(candidate)
    is_complete = candidate_completeness(candidate) >= 10

    if needs_client_push:
        return "headhunter-client-nurture", "high"
    if match_score >= 80 and is_complete and len(risk_flags) <= 1 and (has_local_resume or has_report):
        return "headhunter-candidate-report", "high"
    if communication_status in {"connected", "interviewing", "recommended"}:
        return "headhunter-greeting-skill", "high" if match_score >= 75 else "medium"
    if has_local_resume:
        return "headhunter-cv-jd-matching", "high" if match_score >= 70 else "medium"
    if communication_status in {"new_lead", "contacted"} and has_reachable_contact(contact_channels):
        return "headhunter-outreach-message", "high" if match_score >= 70 else "medium"
    return "headhunter-table-manage", "low"


def build_table_recommendations(candidate: dict[str, Any]) -> dict[str, Any]:
    target_table = "招聘项目进展" if candidate.get("match_score", 0) >= 70 else "人才库"
    return {
        "target_table": target_table,
        "source_type": candidate.get("source_type"),
        "source_url_or_path": candidate.get("source_url_or_path"),
        "match_score": candidate.get("match_score"),
        "match_reasons": candidate.get("match_reasons"),
        "risk_flags": candidate.get("risk_flags"),
        "recommended_next_skill": candidate.get("recommended_next_skill"),
    }


def main() -> None:
    try:
        payload = load_payload()
        raw_job = payload.get("job")
        raw_candidates = payload.get("candidates")
        if not isinstance(raw_job, dict):
            raise ValueError("输入必须包含 job 对象")
        if not isinstance(raw_candidates, list) or not raw_candidates:
            raise ValueError("输入必须包含非空 candidates 数组")

        job = normalize_job(raw_job)

        deduplicated_candidates = deduplicate_candidates(raw_candidates)
        ranked_candidates: list[dict[str, Any]] = []
        for candidate in deduplicated_candidates:
            if not isinstance(candidate, dict):
                raise ValueError("candidates 数组中的每一项都必须是对象")
            match_score, match_reasons, risk_flags = score_candidate(job, candidate)
            recommended_next_skill, recommended_priority = route_candidate(candidate, match_score, risk_flags)
            enriched_candidate = deepcopy(candidate)
            enriched_candidate["match_score"] = match_score
            enriched_candidate["match_reasons"] = match_reasons
            enriched_candidate["risk_flags"] = risk_flags
            enriched_candidate["recommended_next_skill"] = recommended_next_skill
            enriched_candidate["recommended_priority"] = recommended_priority
            enriched_candidate["table_recommendation"] = build_table_recommendations(enriched_candidate)
            enriched_candidate["task_payload"] = {
                "skill": recommended_next_skill,
                "priority": recommended_priority,
                "candidate_id": enriched_candidate.get("candidate_id"),
                "candidate_name": enriched_candidate.get("name"),
                "job_id": job.get("job_id"),
                "match_score": match_score,
                "summary": "；".join(match_reasons[:2]) or "待进一步确认",
            }
            ranked_candidates.append(enriched_candidate)

        ranked_candidates.sort(
            key=lambda candidate: (
                candidate.get("match_score", 0),
                candidate_completeness(candidate),
                len(candidate.get("contact_channels", {})),
            ),
            reverse=True,
        )
        top_candidates = ranked_candidates[:10]

        result = {
            "job": job,
            "total_candidates": len(raw_candidates),
            "deduplicated_candidates": len(deduplicated_candidates),
            "top_candidates": top_candidates,
            "all_ranked_candidates": ranked_candidates,
        }
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"候选人排序失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

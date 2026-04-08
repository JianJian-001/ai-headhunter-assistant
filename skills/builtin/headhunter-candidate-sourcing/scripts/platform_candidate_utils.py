#!/usr/bin/env python3
import json
import re
import sys
from typing import Any


PLATFORM_CONFIG = {
    "boss": {
        "source_type": "boss_platform",
        "source_domain": "zhipin.com",
        "profile_type": "boss_candidate_card",
        "credibility": 8,
        "contact_channel": "boss",
        "display_name": "BOSS直聘",
    },
    "liepin": {
        "source_type": "liepin_platform",
        "source_domain": "liepin.com",
        "profile_type": "liepin_candidate_card",
        "credibility": 8,
        "contact_channel": "liepin",
        "display_name": "猎聘",
    },
    "zhilian": {
        "source_type": "zhilian_platform",
        "source_domain": "zhaopin.com",
        "profile_type": "zhilian_candidate_card",
        "credibility": 7,
        "contact_channel": "zhilian",
        "display_name": "智联招聘",
    },
}

TITLE_HINTS = [
    "算法",
    "工程师",
    "专家",
    "leader",
    "lead",
    "manager",
    "经理",
    "总监",
    "director",
    "scientist",
    "architect",
    "research",
    "产品",
]


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


def safe_int(value: Any, default: int = 0) -> int:
    cleaned_value = normalize_text(value)
    if not cleaned_value:
        return default
    try:
        return int(cleaned_value)
    except (TypeError, ValueError):
        return default


def normalize_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_values = value
    elif isinstance(value, dict):
        raw_values = list(value.values())
    else:
        normalized_value = str(value).replace("；", ",").replace("，", ",").replace("/", ",")
        raw_values = normalized_value.split(",")
    values: list[str] = []
    seen_values: set[str] = set()
    for raw_value in raw_values:
        cleaned_value = normalize_text(raw_value)
        if cleaned_value and cleaned_value not in seen_values:
            values.append(cleaned_value)
            seen_values.add(cleaned_value)
    return values


def first_non_empty(source: dict[str, Any], field_names: list[str]) -> Any:
    for field_name in field_names:
        value = source.get(field_name)
        if value not in (None, "", [], {}):
            return value
    return None


def build_platform_search_terms(job: dict[str, Any], platform_key: str) -> list[str]:
    platform_name = PLATFORM_CONFIG[platform_key]["display_name"]
    job_title = normalize_text(job.get("job_title") or job.get("岗位名称"))
    company_name = normalize_text(job.get("company_name") or job.get("公司名称"))
    city = normalize_text(job.get("city") or job.get("城市"))
    keywords = normalize_list(job.get("keywords") or job.get("寻访关键字"))

    queries = [
        f"{job_title} {city}".strip(),
        f"{job_title} {company_name}".strip(),
    ]
    queries.extend(f"{job_title} {keyword}".strip() for keyword in keywords[:4] if keyword)

    search_terms: list[str] = []
    seen_terms: set[str] = set()
    for query in queries:
        cleaned_query = normalize_text(query)
        if cleaned_query and cleaned_query not in seen_terms:
            search_terms.append(cleaned_query)
            seen_terms.add(cleaned_query)
    if not search_terms:
        search_terms.append(platform_name)
    return search_terms


def infer_title_from_text(summary_text: str) -> str:
    for segment in re.split(r"[|｜\-·•,，;；/]", summary_text):
        cleaned_segment = normalize_text(segment)
        lowered_segment = cleaned_segment.lower()
        if cleaned_segment and any(title_hint in lowered_segment for title_hint in TITLE_HINTS):
            return cleaned_segment
    return ""


def infer_seniority(years_text: str, title_text: str) -> str:
    title_value = normalize_text(title_text).lower()
    years_value = normalize_text(years_text)
    years_match = re.search(r"(\d+)", years_value)
    years_number = int(years_match.group(1)) if years_match else 0
    if any(token in title_value for token in ("director", "总监", "负责人", "head", "vp")):
        return "director"
    if any(token in title_value for token in ("leader", "lead", "专家", "manager", "经理", "architect", "架构师")):
        return "lead"
    if years_number >= 8:
        return "senior"
    if years_number >= 4:
        return "mid"
    if years_number > 0:
        return "junior"
    return ""


def build_notes(card: dict[str, Any]) -> str:
    note_parts = [
        first_non_empty(card, ["summary", "snippet", "candidate_summary"]),
        first_non_empty(card, ["years_experience", "experience", "work_years"]),
        first_non_empty(card, ["salary", "expected_salary"]),
        first_non_empty(card, ["activity_status", "active_status"]),
    ]
    cleaned_parts = [normalize_text(part) for part in note_parts if normalize_text(part)]
    return "；".join(dict.fromkeys(cleaned_parts))


def build_evidence(card: dict[str, Any], url: str) -> list[str]:
    evidence_candidates: list[str] = []
    for field_name in (
        "title",
        "headline",
        "current_title",
        "current_company",
        "company",
        "summary",
        "snippet",
        "candidate_summary",
    ):
        field_value = normalize_text(card.get(field_name))
        if field_value:
            evidence_candidates.append(field_value)
    for skill in normalize_list(card.get("skills") or card.get("tags"))[:6]:
        evidence_candidates.append(skill)
    if url:
        evidence_candidates.append(url)
    return list(dict.fromkeys(evidence_candidates))


def build_contact_channels(platform_key: str, card: dict[str, Any], url: str) -> dict[str, str]:
    channel_name = PLATFORM_CONFIG[platform_key]["contact_channel"]
    channels: dict[str, str] = {}
    if url:
        channels[channel_name] = url
    for field_name in ("phone", "wechat", "email"):
        field_value = normalize_text(card.get(field_name))
        if field_value:
            channels[field_name] = field_value
    return channels


def build_platform_candidate(job: dict[str, Any], platform_key: str, raw_card: dict[str, Any]) -> dict[str, Any] | None:
    if platform_key not in PLATFORM_CONFIG:
        raise ValueError(f"暂不支持的平台: {platform_key}")
    if not isinstance(raw_card, dict):
        raise ValueError("平台候选人卡片必须是对象")

    platform_config = PLATFORM_CONFIG[platform_key]
    name = normalize_text(first_non_empty(raw_card, ["name", "candidate_name", "姓名"]))
    url = normalize_text(first_non_empty(raw_card, ["url", "profile_url", "candidate_url", "链接"]))
    current_title = normalize_text(
        first_non_empty(raw_card, ["current_title", "title", "headline", "职位", "当前岗位"])
    )
    current_company = normalize_text(
        first_non_empty(raw_card, ["current_company", "company", "company_name", "当前公司"])
    )
    summary_text = normalize_text(first_non_empty(raw_card, ["summary", "snippet", "candidate_summary"]))
    if not current_title:
        current_title = infer_title_from_text(summary_text)
    if not name:
        return None

    skills = normalize_list(
        first_non_empty(raw_card, ["skills", "tags", "skill_tags", "keywords", "关键词"])
    ) or normalize_list(job.get("keywords"))
    location = normalize_text(first_non_empty(raw_card, ["location", "city", "期望城市"])) or normalize_text(
        job.get("city")
    )
    education = normalize_text(first_non_empty(raw_card, ["education", "学历"]))
    years_experience = normalize_text(first_non_empty(raw_card, ["years_experience", "experience", "work_years"]))
    notes = build_notes(raw_card)
    contact_channels = build_contact_channels(platform_key, raw_card, url)
    evidence = build_evidence(raw_card, url)

    return {
        "source_type": platform_config["source_type"],
        "source_url_or_path": url or f'{platform_config["source_type"]}:{name}',
        "name": name,
        "current_company": current_company,
        "current_title": current_title,
        "location": location,
        "skills": skills,
        "seniority": normalize_text(raw_card.get("seniority")) or infer_seniority(years_experience, current_title),
        "education": education,
        "contact_channels": contact_channels,
        "resume_path_or_attachment": normalize_text(raw_card.get("resume_path_or_attachment")),
        "evidence": evidence,
        "communication_status": normalize_text(raw_card.get("communication_status")) or "new_lead",
        "has_local_resume": bool(normalize_text(raw_card.get("resume_path_or_attachment"))),
        "has_report": bool(raw_card.get("has_report")),
        "needs_client_push": bool(raw_card.get("needs_client_push")),
        "notes": notes,
        "source_domain": platform_config["source_domain"],
        "public_profile_type": platform_config["profile_type"],
        "source_credibility": safe_int(raw_card.get("source_credibility"), platform_config["credibility"]),
    }


def collect_cards(payload: dict[str, Any], platform_key: str, allow_generic_cards: bool = True) -> list[dict[str, Any]]:
    if allow_generic_cards:
        direct_cards = payload.get("cards")
        if isinstance(direct_cards, list):
            return direct_cards

    platform_cards = payload.get(f"{platform_key}_cards")
    if isinstance(platform_cards, list):
        return platform_cards

    platforms = payload.get("platforms")
    if isinstance(platforms, dict):
        nested_cards = platforms.get(platform_key)
        if isinstance(nested_cards, dict) and isinstance(nested_cards.get("cards"), list):
            return nested_cards["cards"]
        if isinstance(nested_cards, list):
            return nested_cards
    return []


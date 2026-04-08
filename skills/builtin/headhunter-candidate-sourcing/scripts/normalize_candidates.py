#!/usr/bin/env python3
import hashlib
import json
import sys
from typing import Any


SOURCE_TYPE_ALIASES = {
    "web_public": "web_public",
    "web": "web_public",
    "public": "web_public",
    "boss_platform": "boss_platform",
    "boss": "boss_platform",
    "boss直聘": "boss_platform",
    "liepin_platform": "liepin_platform",
    "liepin": "liepin_platform",
    "猎聘": "liepin_platform",
    "zhilian_platform": "zhilian_platform",
    "zhilian": "zhilian_platform",
    "智联招聘": "zhilian_platform",
    "lark_talent_base": "lark_talent_base",
    "talent_base": "lark_talent_base",
    "人才库": "lark_talent_base",
    "lark_project_progress": "lark_project_progress",
    "project_progress": "lark_project_progress",
    "招聘项目进展": "lark_project_progress",
    "resume_folder": "resume_folder",
    "本地简历": "resume_folder",
    "wechat_local": "wechat_local",
    "微信": "wechat_local",
    "local_file": "local_file",
    "manual": "manual",
}

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

JOB_FIELD_ALIASES = {
    "job_id": ["job_id", "id", "岗位ID", "岗位编号"],
    "job_title": ["job_title", "title", "岗位名称", "职位名称"],
    "company_name": ["company_name", "company", "所属公司", "公司名称"],
    "city": ["city", "城市", "location"],
    "salary_range": ["salary_range", "薪资范围", "salary"],
    "must_have_skills": ["must_have_skills", "必备技能", "must_skills"],
    "nice_to_have_skills": ["nice_to_have_skills", "加分项", "preferred_skills"],
    "keywords": ["keywords", "寻访关键字", "search_keywords"],
    "priority": ["priority", "优先级"],
}

CANDIDATE_FIELD_ALIASES = {
    "name": ["name", "姓名"],
    "current_company": ["current_company", "当前公司", "当前公司名称", "company"],
    "current_title": ["current_title", "当前岗位", "当前岗位名称", "title", "position"],
    "location": ["location", "城市", "期望城市"],
    "skills": ["skills", "标签", "skill_tags"],
    "seniority": ["seniority", "职级"],
    "education": ["education", "最高学历"],
    "phone": ["phone", "电话", "候选人电话"],
    "wechat": ["wechat", "微信", "候选人微信", "search_key"],
    "email": ["email", "邮箱"],
    "linkedin": ["linkedin", "linkedin_url"],
    "maimai": ["maimai", "maimai_url"],
    "boss": ["boss", "boss_url", "boss_profile", "boss_profile_url"],
    "liepin": ["liepin", "liepin_url", "liepin_profile", "liepin_profile_url"],
    "zhilian": ["zhilian", "zhilian_url", "zhilian_profile", "zhilian_profile_url"],
    "resume_path_or_attachment": ["resume_path_or_attachment", "简历", "resume_path", "attachment"],
    "source_url_or_path": ["source_url_or_path", "source", "来源链接", "资料链接", "path"],
    "source_domain": ["source_domain", "来源域名"],
    "public_profile_type": ["public_profile_type", "公开资料类型"],
    "source_credibility": ["source_credibility", "来源可信度"],
    "notes": ["notes", "备注", "沟通记录"],
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


def first_non_empty(source: dict[str, Any], aliases: list[str]) -> Any:
    for alias in aliases:
        value = source.get(alias)
        if value not in (None, "", [], {}):
            return value
    return None


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


def normalize_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    cleaned_value = normalize_text(value).lower()
    return cleaned_value in {"1", "true", "yes", "y", "是", "有"}


def normalize_source_type(raw_value: Any) -> str:
    cleaned_value = normalize_text(raw_value)
    if not cleaned_value:
        return "manual"
    return SOURCE_TYPE_ALIASES.get(cleaned_value.lower(), SOURCE_TYPE_ALIASES.get(cleaned_value, "manual"))


def normalize_communication_status(raw_value: Any) -> str:
    cleaned_value = normalize_text(raw_value)
    if not cleaned_value:
        return "new_lead"
    return COMMUNICATION_STATUS_ALIASES.get(
        cleaned_value.lower(),
        COMMUNICATION_STATUS_ALIASES.get(cleaned_value, "new_lead"),
    )


def normalize_contact_channels(candidate: dict[str, Any]) -> dict[str, str]:
    channels: dict[str, str] = {}
    for channel_name in ("phone", "wechat", "email", "linkedin", "maimai", "boss", "liepin", "zhilian"):
        raw_value = first_non_empty(candidate, CANDIDATE_FIELD_ALIASES[channel_name])
        cleaned_value = normalize_text(raw_value)
        if cleaned_value:
            channels[channel_name] = cleaned_value
    if isinstance(candidate.get("contact_channels"), dict):
        for channel_name, channel_value in candidate["contact_channels"].items():
            cleaned_channel = normalize_text(channel_name).lower()
            cleaned_value = normalize_text(channel_value)
            if cleaned_channel and cleaned_value and cleaned_channel not in channels:
                channels[cleaned_channel] = cleaned_value
    return channels


def build_candidate_id(candidate: dict[str, Any]) -> str:
    identity_parts = [
        candidate.get("source_type", ""),
        candidate.get("name", ""),
        candidate.get("current_company", ""),
        candidate.get("current_title", ""),
        candidate.get("source_url_or_path", ""),
        candidate.get("contact_channels", {}).get("phone", ""),
        candidate.get("contact_channels", {}).get("wechat", ""),
        candidate.get("contact_channels", {}).get("email", ""),
    ]
    raw_identity = "|".join(identity_parts)
    return hashlib.sha1(raw_identity.encode("utf-8")).hexdigest()[:16]


def normalize_job(raw_job: dict[str, Any]) -> dict[str, Any]:
    normalized_job: dict[str, Any] = {}
    for canonical_field, aliases in JOB_FIELD_ALIASES.items():
        raw_value = first_non_empty(raw_job, aliases)
        if canonical_field in {"must_have_skills", "nice_to_have_skills", "keywords"}:
            normalized_job[canonical_field] = normalize_list(raw_value)
        else:
            normalized_job[canonical_field] = normalize_text(raw_value)
    if not normalized_job["job_title"]:
        raise ValueError("岗位信息缺少 job_title/岗位名称")
    if not normalized_job["company_name"]:
        raise ValueError("岗位信息缺少 company_name/公司名称")
    if not normalized_job["keywords"]:
        raise ValueError("岗位信息缺少 keywords/寻访关键字")
    if not normalized_job["job_id"]:
        normalized_job["job_id"] = hashlib.sha1(
            f'{normalized_job["company_name"]}|{normalized_job["job_title"]}|{normalized_job["city"]}'.encode("utf-8")
        ).hexdigest()[:12]
    return normalized_job


def normalize_candidate(raw_candidate: dict[str, Any], job_id: str) -> dict[str, Any]:
    normalized_candidate: dict[str, Any] = {
        "source_type": normalize_source_type(raw_candidate.get("source_type") or raw_candidate.get("来源类型")),
        "job_id": job_id,
    }
    for canonical_field in ("name", "current_company", "current_title", "location", "seniority", "education"):
        normalized_candidate[canonical_field] = normalize_text(
            first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES[canonical_field])
        )

    normalized_candidate["skills"] = normalize_list(
        first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["skills"])
    )
    normalized_candidate["resume_path_or_attachment"] = normalize_text(
        first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["resume_path_or_attachment"])
    )
    normalized_candidate["source_url_or_path"] = normalize_text(
        first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["source_url_or_path"])
    )
    normalized_candidate["source_domain"] = normalize_text(
        first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["source_domain"])
    )
    normalized_candidate["public_profile_type"] = normalize_text(
        first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["public_profile_type"])
    )
    source_credibility = first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["source_credibility"])
    try:
        normalized_candidate["source_credibility"] = int(source_credibility) if source_credibility not in (None, "") else 0
    except (TypeError, ValueError):
        normalized_candidate["source_credibility"] = 0
    normalized_candidate["notes"] = normalize_text(first_non_empty(raw_candidate, CANDIDATE_FIELD_ALIASES["notes"]))
    normalized_candidate["contact_channels"] = normalize_contact_channels(raw_candidate)
    normalized_candidate["evidence"] = normalize_list(raw_candidate.get("evidence")) or [
        value
        for value in (
            normalized_candidate["source_url_or_path"],
            normalized_candidate["resume_path_or_attachment"],
            normalized_candidate["notes"],
        )
        if value
    ]
    normalized_candidate["communication_status"] = normalize_communication_status(
        raw_candidate.get("communication_status") or raw_candidate.get("推荐进展")
    )
    has_local_resume_flag = normalize_bool(raw_candidate.get("has_local_resume"))
    has_local_resume_path = bool(normalize_text(normalized_candidate["resume_path_or_attachment"]))
    normalized_candidate["has_local_resume"] = has_local_resume_flag or has_local_resume_path
    has_report_flag = normalize_bool(raw_candidate.get("has_report"))
    has_report_link = bool(normalize_text(raw_candidate.get("推荐报告")))
    normalized_candidate["has_report"] = has_report_flag or has_report_link
    normalized_candidate["needs_client_push"] = normalize_bool(raw_candidate.get("needs_client_push"))
    if not normalized_candidate["name"]:
        raise ValueError("候选人缺少姓名字段")
    if not normalized_candidate["source_url_or_path"] and not normalized_candidate["resume_path_or_attachment"]:
        normalized_candidate["source_url_or_path"] = f'{normalized_candidate["source_type"]}:{normalized_candidate["name"]}'
    normalized_candidate["candidate_id"] = normalize_text(raw_candidate.get("candidate_id")) or build_candidate_id(
        normalized_candidate
    )
    return normalized_candidate


def build_source_summary(candidates: list[dict[str, Any]]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for candidate in candidates:
        source_type = candidate["source_type"]
        summary[source_type] = summary.get(source_type, 0) + 1
    return summary


def main() -> None:
    try:
        payload = load_payload()
        raw_job = payload.get("job")
        raw_candidates = payload.get("candidates")
        if not isinstance(raw_job, dict):
            raise ValueError("输入必须包含 job 对象")
        if not isinstance(raw_candidates, list) or not raw_candidates:
            raise ValueError("输入必须包含非空 candidates 数组")

        normalized_job = normalize_job(raw_job)
        normalized_candidates = []
        for raw_candidate in raw_candidates:
            if not isinstance(raw_candidate, dict):
                raise ValueError("candidates 数组中的每一项都必须是对象")
            normalized_candidates.append(normalize_candidate(raw_candidate, normalized_job["job_id"]))
        result = {
            "job": normalized_job,
            "candidates": normalized_candidates,
            "source_summary": build_source_summary(normalized_candidates),
            "total_candidates": len(normalized_candidates),
        }
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"候选人归一化失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

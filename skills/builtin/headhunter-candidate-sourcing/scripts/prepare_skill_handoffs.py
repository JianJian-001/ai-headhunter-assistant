#!/usr/bin/env python3
import json
import sys
from typing import Any


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


def to_text_list(values: Any) -> str:
    if isinstance(values, str):
        values = [value.strip() for value in values.replace("；", ",").replace("，", ",").split(",")]
    elif isinstance(values, dict):
        values = list(values.values())
    elif not isinstance(values, list):
        values = [values]
    cleaned_values = [normalize_text(value) for value in values if normalize_text(value)]
    return "；".join(cleaned_values)


def build_table_record(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    target_table = candidate.get("table_recommendation", {}).get("target_table", "人才库")
    if target_table not in {"人才库", "招聘项目进展"}:
        target_table = "人才库"
    contact_channels = normalize_contact_channels(candidate)
    common_fields = {
        "姓名": candidate.get("name"),
        "候选人来源类型": candidate.get("source_type"),
        "候选人来源链接": candidate.get("source_url_or_path"),
        "来源可信度": candidate.get("source_credibility", 0),
        "匹配分": candidate.get("match_score"),
        "匹配理由": to_text_list(candidate.get("match_reasons", [])),
        "风险提示": to_text_list(candidate.get("risk_flags", [])),
        "下一步技能": candidate.get("recommended_next_skill"),
    }
    if target_table == "招聘项目进展":
        fields = {
            "岗位名称": job.get("job_title"),
            "公司名称": job.get("company_name"),
            "城市": job.get("city"),
            "当前公司": candidate.get("current_company"),
            "备注": normalize_text(candidate.get("notes")),
        }
        fields.update(common_fields)
    else:
        fields = {
            "当前公司名称": candidate.get("current_company"),
            "当前岗位名称": candidate.get("current_title"),
            "候选人电话": contact_channels.get("phone", ""),
            "候选人微信": contact_channels.get("wechat", ""),
            "标签": to_text_list(candidate.get("skills", [])),
            "备注": normalize_text(candidate.get("notes")),
        }
        fields.update(common_fields)
    return {"target_table": target_table, "fields": fields}


def build_outreach_payload(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": candidate.get("name"),
        "current_company": candidate.get("current_company"),
        "current_title": candidate.get("current_title"),
        "location": candidate.get("location"),
        "contact_channels": candidate.get("contact_channels", {}),
        "match_score": candidate.get("match_score"),
        "match_reasons": candidate.get("match_reasons", []),
        "recommended_priority": candidate.get("recommended_priority"),
        "job_title": job.get("job_title"),
        "company_name": job.get("company_name"),
        "salary_range": job.get("salary_range"),
    }


def build_greeting_payload(candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": candidate.get("name"),
        "current_company": candidate.get("current_company"),
        "current_title": candidate.get("current_title"),
        "contact_channels": candidate.get("contact_channels", {}),
        "communication_status": candidate.get("communication_status"),
        "match_score": candidate.get("match_score"),
        "match_reasons": candidate.get("match_reasons", []),
        "recommended_priority": candidate.get("recommended_priority"),
        "notes": candidate.get("notes"),
    }


def build_candidate_report_payload(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "entry_mode": "sourcing_pre_report",
        "requires_minutes_or_record_context": True,
        "job_title": job.get("job_title"),
        "company_name": job.get("company_name"),
        "name": candidate.get("name"),
        "current_company": candidate.get("current_company"),
        "current_title": candidate.get("current_title"),
        "match_score": candidate.get("match_score"),
        "match_reasons": candidate.get("match_reasons", []),
        "risk_flags": candidate.get("risk_flags", []),
        "source_url_or_path": candidate.get("source_url_or_path"),
        "resume_path_or_attachment": candidate.get("resume_path_or_attachment"),
    }


def build_client_nurture_payload(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "company_name": job.get("company_name"),
        "job_title": job.get("job_title"),
        "priority": job.get("priority"),
        "candidate_name": candidate.get("name"),
        "match_score": candidate.get("match_score"),
        "risk_flags": candidate.get("risk_flags", []),
        "needs_client_push": candidate.get("needs_client_push"),
        "notes": candidate.get("notes"),
    }


def build_cv_match_payload(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "resume_path_or_attachment": candidate.get("resume_path_or_attachment"),
        "job_content_data": {
            "job_title": job.get("job_title"),
            "company_name": job.get("company_name"),
            "city": job.get("city"),
            "salary_range": job.get("salary_range"),
            "must_have_skills": job.get("must_have_skills", []),
            "nice_to_have_skills": job.get("nice_to_have_skills", []),
            "keywords": job.get("keywords", []),
        },
        "candidate_name": candidate.get("name"),
    }


def build_task_queue_item(job: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    task_payload = candidate.get("task_payload", {})
    return {
        "job_id": job.get("job_id"),
        "job_title": job.get("job_title"),
        "company_name": job.get("company_name"),
        "candidate_id": candidate.get("candidate_id"),
        "candidate_name": candidate.get("name"),
        "target_skill": candidate.get("recommended_next_skill"),
        "priority": candidate.get("recommended_priority"),
        "match_score": candidate.get("match_score"),
        "summary": "；".join(candidate.get("match_reasons", [])[:2]) or "待进一步确认",
        "risk_flags": candidate.get("risk_flags", []),
        "task_payload": task_payload,
    }


def main() -> None:
    try:
        payload = load_payload()
        job = payload.get("job")
        top_candidates = payload.get("top_candidates")
        if not isinstance(job, dict):
            raise ValueError("输入必须包含 job 对象")
        if not isinstance(top_candidates, list):
            raise ValueError("输入必须包含 top_candidates 数组")

        result = {
            "job": job,
            "table_manage": {"人才库": [], "招聘项目进展": []},
            "headhunter-outreach-message": [],
            "headhunter-greeting-skill": [],
            "headhunter-candidate-report": [],
            "headhunter-client-nurture": [],
            "headhunter-cv-jd-matching": [],
            "task_queue": [],
        }

        for candidate in top_candidates:
            if not isinstance(candidate, dict):
                raise ValueError("top_candidates 数组中的每一项都必须是对象")
            table_record = build_table_record(job, candidate)
            result["table_manage"].setdefault(table_record["target_table"], []).append(table_record["fields"])

            next_skill = candidate.get("recommended_next_skill")
            if next_skill == "headhunter-outreach-message":
                result[next_skill].append(build_outreach_payload(job, candidate))
            elif next_skill == "headhunter-greeting-skill":
                result[next_skill].append(build_greeting_payload(candidate))
            elif next_skill == "headhunter-candidate-report":
                result[next_skill].append(build_candidate_report_payload(job, candidate))
            elif next_skill == "headhunter-client-nurture":
                result[next_skill].append(build_client_nurture_payload(job, candidate))
            elif next_skill == "headhunter-cv-jd-matching":
                result[next_skill].append(build_cv_match_payload(job, candidate))
            result["task_queue"].append(build_task_queue_item(job, candidate))

        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"下游交接数据生成失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

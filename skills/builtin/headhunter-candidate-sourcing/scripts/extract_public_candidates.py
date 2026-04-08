#!/usr/bin/env python3
import json
import re
import sys
from urllib.parse import urlparse
from typing import Any


SUPPORTED_DOMAINS = {
    "linkedin.com": {"profile_type": "linkedin_profile", "credibility": 9},
    "maimai.cn": {"profile_type": "maimai_profile", "credibility": 8},
    "github.com": {"profile_type": "github_profile", "credibility": 8},
    "gitlab.com": {"profile_type": "git_profile", "credibility": 7},
}

COMPANY_SIGNAL_KEYWORDS = ["团队", "team", "speaker", "嘉宾", "技术委员会", "cto", "工程师", "算法", "产品"]
TITLE_HINTS = [
    "工程师",
    "专家",
    "leader",
    "manager",
    "经理",
    "director",
    "scientist",
    "researcher",
    "architect",
    "cto",
    "vp",
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


def normalize_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        raw_values = value
    else:
        raw_values = str(value).replace("，", ",").replace("；", ",").split(",")
    values: list[str] = []
    seen_values: set[str] = set()
    for raw_value in raw_values:
        cleaned_value = normalize_text(raw_value)
        if cleaned_value and cleaned_value not in seen_values:
            values.append(cleaned_value)
            seen_values.add(cleaned_value)
    return values


def get_domain(url: str) -> str:
    parsed_url = urlparse(url)
    domain = parsed_url.netloc.lower()
    if not domain:
        path_value = parsed_url.path.lower()
        if "/" in path_value:
            domain = path_value.split("/")[0]
        else:
            domain = path_value
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def infer_profile_type(domain: str, title: str, snippet: str) -> tuple[str, int]:
    if domain in SUPPORTED_DOMAINS:
        domain_config = SUPPORTED_DOMAINS[domain]
        return domain_config["profile_type"], domain_config["credibility"]

    merged_text = f"{title} {snippet}".lower()
    if any(keyword in merged_text for keyword in COMPANY_SIGNAL_KEYWORDS):
        return "company_team_page", 6
    return "public_web_page", 5


def extract_name(title: str, snippet: str) -> str:
    title_candidates = re.split(r"[-|·•]", title)
    for title_candidate in title_candidates:
        cleaned_candidate = normalize_text(title_candidate)
        if 1 < len(cleaned_candidate) <= 20 and not any(
            forbidden_word in cleaned_candidate.lower()
            for forbidden_word in ("github", "linkedin", "maimai", "blog", "team", "官网", "主页", "about", "关于")
        ):
            return cleaned_candidate

    chinese_name_match = re.search(r"[\u4e00-\u9fff]{2,4}", snippet)
    if chinese_name_match:
        return chinese_name_match.group()

    english_name_match = re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b", title)
    if english_name_match:
        return english_name_match.group()
    return ""


def extract_current_title(title: str, snippet: str) -> str:
    merged_text = f"{title} {snippet}"
    for title_hint in TITLE_HINTS:
        match = re.search(rf"([^,，|/]+{re.escape(title_hint)}[^,，|/]*)", merged_text, re.IGNORECASE)
        if match:
            return normalize_text(match.group(1))
    return ""


def build_public_candidate(job: dict[str, Any], result_item: dict[str, Any]) -> dict[str, Any] | None:
    url = normalize_text(result_item.get("url") or result_item.get("link"))
    title = normalize_text(result_item.get("title"))
    snippet = normalize_text(result_item.get("snippet") or result_item.get("description"))
    if not url or not title:
        return None

    domain = get_domain(url)
    profile_type, source_credibility = infer_profile_type(domain, title, snippet)
    name = extract_name(title, snippet)
    if not name:
        return None

    current_title = extract_current_title(title, snippet)
    evidence = [item for item in [title, snippet, url] if item]

    return {
        "source_type": "web_public",
        "source_url_or_path": url,
        "name": name,
        "current_company": normalize_text(result_item.get("company")),
        "current_title": current_title,
        "location": normalize_text(result_item.get("location") or job.get("city")),
        "skills": normalize_list(result_item.get("skills") or job.get("keywords")),
        "seniority": normalize_text(result_item.get("seniority")),
        "education": normalize_text(result_item.get("education")),
        "contact_channels": {
            key: value
            for key, value in {
                "linkedin": url if domain == "linkedin.com" else "",
                "maimai": url if domain == "maimai.cn" else "",
                "email": normalize_text(result_item.get("email")),
            }.items()
            if value
        },
        "resume_path_or_attachment": "",
        "evidence": evidence,
        "communication_status": "new_lead",
        "has_local_resume": False,
        "has_report": False,
        "needs_client_push": False,
        "notes": normalize_text(result_item.get("notes")),
        "source_domain": domain,
        "public_profile_type": profile_type,
        "source_credibility": source_credibility,
    }


def build_queries(job: dict[str, Any]) -> list[str]:
    job_title = normalize_text(job.get("job_title") or job.get("岗位名称"))
    company_name = normalize_text(job.get("company_name") or job.get("公司名称"))
    city = normalize_text(job.get("city") or job.get("城市"))
    keywords = normalize_list(job.get("keywords") or job.get("寻访关键字"))
    query_seeds = [job_title, company_name, city] + keywords[:4]

    queries: list[str] = []
    for seed in query_seeds:
        if seed:
            if seed == job_title:
                continue
            queries.append(f"{job_title} {seed}".strip())
    queries.extend(
        [
            f"{job_title} {city} site:linkedin.com/in",
            f"{job_title} {city} site:github.com",
            f"{job_title} {company_name} team",
        ]
    )

    deduplicated_queries: list[str] = []
    seen_queries: set[str] = set()
    for query in queries:
        cleaned_query = normalize_text(query)
        if cleaned_query and cleaned_query not in seen_queries:
            deduplicated_queries.append(cleaned_query)
            seen_queries.add(cleaned_query)
    return deduplicated_queries


def main() -> None:
    try:
        payload = load_payload()
        job = payload.get("job")
        search_results = payload.get("search_results") or payload.get("public_results")
        if not isinstance(job, dict):
            raise ValueError("输入必须包含 job 对象")
        if search_results is None:
            result = {
                "job": job,
                "queries": build_queries(job),
                "candidates": [],
                "message": "当前仅生成公开网页寻访查询建议，待外部搜索结果回填后可继续抽取候选人。",
            }
            json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
            sys.stdout.write("\n")
            return
        if not isinstance(search_results, list):
            raise ValueError("search_results 必须是数组")

        candidates: list[dict[str, Any]] = []
        for result_item in search_results:
            if not isinstance(result_item, dict):
                raise ValueError("search_results 数组中的每一项都必须是对象")
            candidate = build_public_candidate(job, result_item)
            if candidate:
                candidates.append(candidate)

        result = {
            "job": job,
            "queries": build_queries(job),
            "candidates": candidates,
            "total_candidates": len(candidates),
        }
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"公开候选人抽取失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

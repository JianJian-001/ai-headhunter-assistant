#!/usr/bin/env python3
"""Local first-stage resume matcher."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


TEXT_SUFFIXES = {".txt", ".md", ".json"}
EDUCATION_KEYWORDS = ["博士", "硕士", "本科", "大专"]


def read_text(path: Path) -> str:
    if path.suffix.lower() not in TEXT_SUFFIXES:
        raise ValueError(f"暂不支持该文件类型: {path.suffix or 'unknown'}")
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return raw
        return json.dumps(parsed, ensure_ascii=False)
    return raw


def extract_year_requirement(jd_text: str) -> int | None:
    match = re.search(r"(\d+)\s*年以上", jd_text)
    return int(match.group(1)) if match else None


def extract_resume_years(resume_text: str) -> int:
    years = re.findall(r"(20\d{2})[.\-/年]?\s*(?:0?\d|1[0-2])?\s*[-~至到]\s*(20\d{2}|至今|现在)", resume_text)
    if not years:
        simple = re.search(r"(\d+)\s*年(?:工作)?经验", resume_text)
        return int(simple.group(1)) if simple else 0
    numbers = []
    for start, end in years:
        start_year = int(start)
        end_year = 2026 if end in {"至今", "现在"} else int(end)
        if end_year >= start_year:
            numbers.append(end_year - start_year)
    return max(numbers) if numbers else 0


def extract_keywords(jd_text: str) -> list[str]:
    tokens = re.split(r"[\s,，、/；;:：()（）]+", jd_text)
    keywords: list[str] = []
    for token in tokens:
        token = token.strip()
        if len(token) < 2:
            continue
        if re.search(r"[\u4e00-\u9fffA-Za-z]", token):
            keywords.append(token)
    unique_keywords: list[str] = []
    for keyword in keywords:
        if keyword not in unique_keywords:
            unique_keywords.append(keyword)
    return unique_keywords[:25]


def extract_education(jd_text: str, resume_text: str) -> tuple[str | None, str | None]:
    jd_level = next((level for level in EDUCATION_KEYWORDS if level in jd_text), None)
    resume_level = next((level for level in EDUCATION_KEYWORDS if level in resume_text), None)
    return jd_level, resume_level


def summarize_level(score: int) -> str:
    if score >= 80:
        return "priority"
    if score >= 60:
        return "consider"
    return "hold"


def evaluate_resume(resume_path: Path, jd_text: str) -> dict[str, object]:
    resume_text = read_text(resume_path)
    keywords = extract_keywords(jd_text)
    matched = [keyword for keyword in keywords if keyword.lower() in resume_text.lower()]
    missing = [keyword for keyword in keywords if keyword not in matched][:8]

    keyword_score = min(40, int((len(matched) / max(len(keywords), 1)) * 40))
    required_years = extract_year_requirement(jd_text)
    resume_years = extract_resume_years(resume_text)
    if required_years is None:
        years_score = 10
    elif resume_years >= required_years:
        years_score = 20
    elif resume_years > 0:
        years_score = 10
    else:
        years_score = 0

    industry_score = 20 if any(word in resume_text for word in matched[:5]) else 8
    jd_education, resume_education = extract_education(jd_text, resume_text)
    education_score = 10 if jd_education is None or jd_education == resume_education else 4
    management_score = 10 if any(word in resume_text for word in ("负责人", "带队", "管理", "项目")) else 4

    score = keyword_score + years_score + industry_score + education_score + management_score

    reasons = []
    if matched:
        reasons.append(f"命中关键词 {', '.join(matched[:6])}")
    if required_years is not None:
        reasons.append(f"JD 要求 {required_years} 年以上，简历识别为约 {resume_years} 年")
    if resume_education:
        reasons.append(f"简历识别到学历信息：{resume_education}")

    gaps = []
    if missing:
        gaps.append(f"未明显命中的关键词：{', '.join(missing[:5])}")
    if required_years is not None and resume_years < required_years:
        gaps.append("工作年限证据偏弱")
    if jd_education and resume_education and jd_education != resume_education:
        gaps.append("学历与 JD 要求不完全一致")

    level = summarize_level(score)
    next_step = {
        "priority": "建议优先沟通，补齐项目成果和到岗意愿。",
        "consider": "建议电话初筛，重点核实缺失项和关键项目。",
        "hold": "暂不优先推进，除非人才池较浅或有特别优势。",
    }[level]

    return {
        "resume_path": str(resume_path),
        "score": score,
        "level": level,
        "matched_keywords": matched[:10],
        "missing_keywords": missing,
        "matched_reasons": reasons,
        "gaps": gaps,
        "next_step": next_step,
    }


def run_single(resume_path: Path, jd_path: Path) -> dict[str, object]:
    jd_text = read_text(jd_path)
    return evaluate_resume(resume_path, jd_text)


def run_batch(resume_dir: Path, jd_path: Path) -> dict[str, object]:
    jd_text = read_text(jd_path)
    results = []
    for candidate_path in sorted(resume_dir.iterdir()):
        if candidate_path.is_file() and candidate_path.suffix.lower() in TEXT_SUFFIXES:
            result = evaluate_resume(candidate_path, jd_text)
            results.append(
                {
                    "candidate": candidate_path.stem,
                    "score": result["score"],
                    "level": result["level"],
                    "one_line_summary": "；".join(result["matched_reasons"][:2]) or "待补充更多文本证据",
                }
            )
    results.sort(key=lambda item: item["score"], reverse=True)
    return {"job_title": jd_path.stem, "results": results}


def main() -> int:
    if len(sys.argv) != 4:
        print('用法: python3 match_resume.py <single|batch> "<简历路径或目录>" "<JD 文件路径>"', file=sys.stderr)
        return 1

    mode = sys.argv[1].strip().lower()
    source_path = Path(sys.argv[2]).expanduser()
    jd_path = Path(sys.argv[3]).expanduser()

    try:
        if mode == "single":
            payload = run_single(source_path, jd_path)
        elif mode == "batch":
            payload = run_batch(source_path, jd_path)
        else:
            raise ValueError(f"未知模式: {mode}")
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1

    print(json.dumps({"ok": True, "data": payload}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

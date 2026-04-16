#!/usr/bin/env python3
"""Normalize local job materials into a structured summary."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


LABEL_PATTERNS = {
    "company_name": [r"公司[:：]\s*(.+)", r"客户[:：]\s*(.+)"],
    "job_title": [r"岗位[:：]\s*(.+)", r"职位[:：]\s*(.+)"],
    "city": [r"地点[:：]\s*(.+)", r"城市[:：]\s*(.+)"],
    "salary_range": [r"薪资[:：]\s*(.+)", r"薪酬[:：]\s*(.+)"],
}


def read_text(file_path: Path) -> str:
    if not file_path.exists():
        raise FileNotFoundError(f"文件不存在: {file_path}")
    return file_path.read_text(encoding="utf-8")


def extract_field(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return None


def extract_bullets(section_text: str) -> list[str]:
    items = []
    for raw_line in section_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith(("-", "*", "•")):
            items.append(line[1:].strip())
        elif re.match(r"^\d+[.)、]\s*", line):
            items.append(re.sub(r"^\d+[.)、]\s*", "", line))
    return items


def digest_material(text: str) -> dict[str, object]:
    summary: dict[str, object] = {
        "company_name": None,
        "job_title": None,
        "city": None,
        "salary_range": None,
        "must_have": [],
        "nice_to_have": [],
        "questions": [],
    }

    for field_name, patterns in LABEL_PATTERNS.items():
        summary[field_name] = extract_field(text, patterns)

    lowered = text.lower()
    if "必须" in text or "任职要求" in text:
        summary["must_have"] = extract_bullets(text)
    if "加分" in text or "优先" in text:
        summary["nice_to_have"] = [item for item in extract_bullets(text) if item]

    questions: list[str] = []
    if not summary["salary_range"]:
        questions.append("薪酬预算是否已明确？")
    if not summary["city"]:
        questions.append("工作地点是否固定，是否接受异地或远程？")
    if "汇报" not in text:
        questions.append("该岗位向谁汇报，团队规模多大？")
    if "必须" not in text and "任职要求" not in text:
        questions.append("当前材料缺少明确的任职要求，请补充必须项。")
    summary["questions"] = questions

    summary["raw_length"] = len(text)
    summary["contains_ai_keywords"] = any(keyword in lowered for keyword in ("ai", "大模型", "算法", "模型"))
    return summary


def main() -> int:
    if len(sys.argv) != 2:
        print('用法: python3 material_digest.py "<材料文件路径>"', file=sys.stderr)
        return 1

    file_path = Path(sys.argv[1]).expanduser()
    try:
        text = read_text(file_path)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1

    result = digest_material(text)
    print(json.dumps({"ok": True, "summary": result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

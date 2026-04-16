#!/usr/bin/env python3
"""Local first-stage resume risk scanner."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class RiskHit:
    rule_id: str
    dimension: str
    level: str
    evidence: str
    note: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def collect_year_ranges(text: str) -> list[tuple[int, int | None, str]]:
    pattern = re.compile(r"(20\d{2})[.\-/年]?(?:0?\d|1[0-2])?\s*[-~至到]\s*(20\d{2}|至今|现在)")
    ranges = []
    for match in pattern.finditer(text):
        start_year = int(match.group(1))
        end_raw = match.group(2)
        end_year = None if end_raw in {"至今", "现在"} else int(end_raw)
        ranges.append((start_year, end_year, match.group(0)))
    return ranges


def scan_timeline(text: str) -> list[RiskHit]:
    hits: list[RiskHit] = []
    ranges = collect_year_ranges(text)
    previous_end: int | None = None
    short_count = 0

    for start_year, end_year, evidence in ranges:
        if previous_end is not None and start_year < previous_end:
            hits.append(RiskHit("timeline_overlap", "时间线", "L2", evidence, "日期区间存在重叠，建议核验真实起止时间。"))
        if previous_end is not None and start_year - previous_end >= 1:
            hits.append(RiskHit("timeline_gap_long", "时间线", "L2", evidence, "检测到较长空档，建议了解当时状态。"))
        if end_year is not None and end_year - start_year <= 1:
            short_count += 1
        previous_end = end_year or 2026

    if short_count >= 2:
        hits.append(RiskHit("timeline_short_hopping", "时间线", "L2", "多段经历任职时间偏短", "连续短任职较多，建议核验离职原因。"))

    return hits


def scan_education(text: str) -> list[RiskHit]:
    hits: list[RiskHit] = []
    if "三年本科" in text or "一年硕士" in text:
        hits.append(RiskHit("education_short_cycle", "学历", "L3", "出现异常学制表述", "学制与学历表述异常，需要重点核验。"))
    if re.search(r"(大学|学院)", text) and not re.search(r"(本科|硕士|博士|大专)", text):
        hits.append(RiskHit("education_missing_degree", "学历", "L1", "只出现学校信息，未见学历层次", "学历信息不完整，建议补充学习形式与学历层次。"))
    return hits


def scan_consistency(text: str) -> list[RiskHit]:
    hits: list[RiskHit] = []
    if len(re.findall(r"(总监|负责人|VP|副总裁|CEO|CTO)", text, flags=re.IGNORECASE)) >= 3:
        hits.append(RiskHit("consistency_many_titles", "履历一致性", "L2", "短文本内出现多个高阶头衔", "头衔较多，建议核实是否为并列职责或不同时期角色。"))
    if re.search(r"(推动|负责|参与).*(全面提升|显著增长|行业领先)", text) and not re.search(r"(\d+%|\d+人|\d+万|\d+个)", text):
        hits.append(RiskHit("consistency_low_evidence", "履历一致性", "L1", "成果描述偏口号化", "项目成果缺少量化证据，建议补充事实依据。"))
    return hits


def summarize_level(hits: list[RiskHit]) -> str:
    if not hits:
        return "L1"
    levels = {hit.level for hit in hits}
    if "L3" in levels:
        return "L3"
    if len([hit for hit in hits if hit.level == "L2"]) >= 2:
        return "L3"
    if "L2" in levels:
        return "L2"
    return "L1"


def build_followups(hits: list[RiskHit]) -> list[str]:
    followups = []
    for hit in hits:
        if hit.rule_id == "timeline_overlap":
            followups.append("请确认这两段经历是否存在兼职、项目制或日期记录偏差。")
        elif hit.rule_id == "timeline_gap_long":
            followups.append("请补充空档期的真实状态，以及是否有学习、创业或休整经历。")
        elif hit.rule_id == "education_short_cycle":
            followups.append("请明确该学历的学制、学习形式和毕业时间。")
        elif hit.rule_id == "consistency_many_titles":
            followups.append("请拆分不同阶段的岗位名称和实际职责范围。")
        elif hit.rule_id == "consistency_low_evidence":
            followups.append("请补充可量化的项目成果、指标或交付结果。")
    return list(dict.fromkeys(followups))


def main() -> int:
    if len(sys.argv) != 2:
        print('用法: python3 scan_resume_risk.py "<简历路径>"', file=sys.stderr)
        return 1

    resume_path = Path(sys.argv[1]).expanduser()
    try:
        text = read_text(resume_path)
        hits = scan_timeline(text) + scan_education(text) + scan_consistency(text)
        result = {
            "resume_path": str(resume_path),
            "risk_level": summarize_level(hits),
            "hits": [
                {
                    "rule_id": hit.rule_id,
                    "dimension": hit.dimension,
                    "level": hit.level,
                    "evidence": hit.evidence,
                    "note": hit.note,
                }
                for hit in hits
            ],
            "followups": build_followups(hits),
        }
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1

    print(json.dumps({"ok": True, "data": result}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
候选人处理模块

- 候选人格式校验
- 候选人名称解析
- 手工候选人处理
- 称呼判断
"""


def is_valid_candidate(name: str) -> bool:
    parts = name.split("-")
    if len(parts) < 4:
        return False
    return all(part.strip() for part in parts[:4])


def parse_candidate(name: str) -> dict:
    parts = name.split("-")
    return {
        "full_name": name,
        "name_part": parts[0].strip(),
        "company": parts[1].strip() if len(parts) > 1 else "",
        "position": parts[2].strip() if len(parts) > 2 else "",
        "location": parts[3].strip() if len(parts) > 3 else "",
    }


def determine_appellation(name_part: str) -> str:
    name = name_part.strip()

    if _is_pure_chinese(name):
        if len(name) == 3:
            common_compound_surnames = [
                "诸葛",
                "欧阳",
                "司马",
                "上官",
                "东方",
                "独孤",
                "南宫",
                "万俟",
                "闻人",
                "夏侯",
                "端木",
                "公孙",
                "慕容",
                "尉迟",
                "长孙",
                "宇文",
                "轩辕",
                "令狐",
                "皇甫",
                "百里",
            ]
            if name[:2] in common_compound_surnames:
                return name
            return name[1:]
        return name
    return name


def _is_pure_chinese(text: str) -> bool:
    return bool(text) and all("\u4e00" <= character <= "\u9fff" for character in text)


def process_manual_candidates(manual_list: list[dict]) -> list[dict]:
    candidates = []
    seen = set()

    for item in manual_list:
        name = item.get("name", "").strip()
        search_key = item.get("search_key", "").strip()
        if not name:
            continue
        if not search_key:
            search_key = name

        dedup_key = f"{name}|{search_key}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        appellation = item.get("appellation", "").strip()
        if not appellation:
            appellation = determine_appellation(name)

        candidates.append(
            {
                "name": name,
                "search_key": search_key,
                "appellation": appellation,
            }
        )

    return candidates

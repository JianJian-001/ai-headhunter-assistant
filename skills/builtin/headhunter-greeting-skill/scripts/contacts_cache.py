"""
候选人数据库管理模块

持久化到 greeting/contacts_cache.json。
"""

import json
import os
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(SCRIPT_DIR)
CACHE_FILE = os.path.join(SKILL_DIR, "greeting", "contacts_cache.json")
CST = timezone(timedelta(hours=8))


def _ensure_dir():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)


def _empty_cache() -> dict:
    return {
        "version": "1.0",
        "scan_time": datetime.now(CST).isoformat(),
        "candidates": [],
    }


def load_cache() -> dict | None:
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, KeyError):
        return None


def has_cache() -> bool:
    cache = load_cache()
    return cache is not None and len(cache.get("candidates", [])) > 0


def get_cache_summary() -> str:
    cache = load_cache()
    if not cache:
        return "无数据"
    scan_time = cache.get("scan_time", "未知")
    candidates_count = len(cache.get("candidates", []))
    return f"更新时间: {scan_time}, 候选人: {candidates_count}"


def get_cached_candidates() -> list[dict]:
    cache = load_cache()
    if not cache:
        return []
    return cache.get("candidates", [])


def clear_cache():
    if os.path.exists(CACHE_FILE):
        os.remove(CACHE_FILE)


def add_candidate_to_cache(candidate: dict):
    _ensure_dir()
    cache = load_cache()
    if cache is None:
        cache = _empty_cache()

    existing_names = {item.get("full_name") for item in cache.get("candidates", [])}
    full_name = candidate.get("full_name", candidate.get("name", ""))
    if full_name and full_name not in existing_names:
        cache["candidates"].append(candidate)
        with open(CACHE_FILE, "w", encoding="utf-8") as handle:
            json.dump(cache, handle, ensure_ascii=False, indent=2)

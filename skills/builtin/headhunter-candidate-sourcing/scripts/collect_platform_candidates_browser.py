#!/usr/bin/env python3
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

SHARED_PYTHON_DIR = Path(__file__).resolve().parents[2] / "headhunter_shared" / "python"
if str(SHARED_PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_PYTHON_DIR))

from headhunter_shared.browser_runtime import detect_login_by_keywords, launch_browser_context, wait_for_first_selector
from platform_candidate_utils import build_platform_search_terms, emit_error, load_payload, normalize_text, safe_int


PLATFORM_BROWSER_CONFIG = {
    "boss": {
        "display_name": "BOSS直聘",
        "card_selectors": [
            ".candidate-card",
            ".resume-card",
            ".geek-card",
            "[ka*='candidate']",
            ".card-item",
        ],
        "ready_selectors": [
            ".candidate-card",
            ".resume-card",
            ".geek-card",
            "[ka*='candidate']",
        ],
        "search_input_selectors": [
            "input[placeholder*='搜索']",
            "input[placeholder*='关键词']",
            "input[type='search']",
            "input",
        ],
        "next_page_selectors": [
            "a[ka='page-next']",
            ".ui-icon-arrow-right",
            ".options-pages a:last-child",
            "button:has-text('下一页')",
        ],
        "field_selectors": {
            "name": [".name", ".candidate-name", ".geek-name", "h3", "h4", ".title"],
            "current_title": [".job-title", ".title", ".candidate-title", ".info-primary"],
            "current_company": [".company-name", ".company", ".company-text", ".info-secondary"],
            "location": [".job-area", ".location", ".city", ".area"],
            "salary": [".salary", ".expect-salary", ".price"],
            "summary": [".desc", ".summary", ".content", ".tags-box", ".experience"],
            "tags": [".tag", ".tags span", ".labels span", ".skill-tag"],
            "profile_url": ["a[href]"],
        },
    },
    "liepin": {
        "display_name": "猎聘",
        "card_selectors": [
            ".resume-card-wrap",
            ".candidate-card",
            ".sojob-item-main",
            ".card-list-item",
        ],
        "ready_selectors": [
            ".resume-card-wrap",
            ".candidate-card",
            ".sojob-item-main",
        ],
        "search_input_selectors": [
            "input[placeholder*='搜索']",
            "input[placeholder*='职位']",
            "input[type='search']",
            "input",
        ],
        "next_page_selectors": [
            ".pager-next",
            "a.next",
            "button:has-text('下一页')",
            ".common-pagination-next",
        ],
        "field_selectors": {
            "name": [".name", ".candidate-name", ".title-name", "h3", "h4"],
            "current_title": [".job-title", ".title", ".resume-title", ".ellipsis-1"],
            "current_company": [".company-name", ".company", ".company-text", ".company-info"],
            "location": [".location", ".city", ".job-area", ".area"],
            "salary": [".salary", ".job-salary", ".expect-salary"],
            "summary": [".summary", ".desc", ".content", ".advantages", ".experience"],
            "tags": [".tag", ".labels span", ".tag-box span", ".labels-item"],
            "profile_url": ["a[href]"],
        },
    },
    "zhilian": {
        "display_name": "智联招聘",
        "card_selectors": [
            ".candidate-item",
            ".resume-item",
            ".talent-card",
            ".list-item",
            ".card-item",
        ],
        "ready_selectors": [
            ".candidate-item",
            ".resume-item",
            ".talent-card",
        ],
        "search_input_selectors": [
            "input[placeholder*='搜索']",
            "input[placeholder*='关键词']",
            "input[type='search']",
            "input",
        ],
        "next_page_selectors": [
            ".pagination-next",
            "a.next-page",
            "button:has-text('下一页')",
            ".soupager__next",
        ],
        "field_selectors": {
            "name": [".name", ".candidate-name", ".resume-name", "h3", "h4"],
            "current_title": [".job-title", ".title", ".resume-title", ".candidate-title"],
            "current_company": [".company-name", ".company", ".company-text", ".company-info"],
            "location": [".location", ".city", ".job-area", ".area"],
            "salary": [".salary", ".expect-salary", ".job-salary"],
            "summary": [".summary", ".desc", ".content", ".experience", ".advantage"],
            "tags": [".tag", ".labels span", ".tag-list span", ".skill-tag"],
            "profile_url": ["a[href]"],
        },
    },
}

LOGIN_KEYWORDS = ["登录", "扫码", "验证手机", "请先登录", "立即登录", "身份验证", "账号登录"]
LOGIN_SELECTORS = [
    "input[type='password']",
    "input[placeholder*='手机号']",
    "input[placeholder*='验证码']",
    ".login-dialog",
    ".login-box",
    ".sign-in",
    ".passport-login-container",
]


def safe_slug(value: str) -> str:
    return "".join(character if character.isalnum() else "-" for character in value).strip("-") or "output"


def get_platform_payload(payload: dict[str, Any], platform_key: str) -> dict[str, Any]:
    platform_payload = payload.get(platform_key)
    if isinstance(platform_payload, dict):
        return platform_payload

    platforms = payload.get("platforms")
    if isinstance(platforms, dict) and isinstance(platforms.get(platform_key), dict):
        return platforms[platform_key]
    return {}


def get_entry_url(payload: dict[str, Any], platform_key: str) -> str:
    platform_payload = get_platform_payload(payload, platform_key)
    if normalize_text(platform_payload.get("entry_url")):
        return normalize_text(platform_payload["entry_url"])

    entry_urls = payload.get("platform_entry_urls")
    if isinstance(entry_urls, dict) and normalize_text(entry_urls.get(platform_key)):
        return normalize_text(entry_urls[platform_key])

    return normalize_text(payload.get(f"{platform_key}_entry_url"))


def get_search_terms(payload: dict[str, Any], job: dict[str, Any], platform_key: str) -> list[str]:
    platform_payload = get_platform_payload(payload, platform_key)
    if platform_payload.get("search_terms") is not None:
        search_terms = platform_payload.get("search_terms")
        if not isinstance(search_terms, list):
            raise ValueError(f"{platform_key} 的 search_terms 必须是数组")
        return [normalize_text(item) for item in search_terms if normalize_text(item)]

    top_level_search_terms = payload.get(f"{platform_key}_search_terms")
    if top_level_search_terms is not None:
        if not isinstance(top_level_search_terms, list):
            raise ValueError(f"{platform_key}_search_terms 必须是数组")
        return [normalize_text(item) for item in top_level_search_terms if normalize_text(item)]

    return build_platform_search_terms(job, platform_key)


def should_run_platform(payload: dict[str, Any], platform_key: str) -> bool:
    requested_platforms = payload.get("platforms_to_run")
    if requested_platforms is None:
        return True
    if not isinstance(requested_platforms, list):
        raise ValueError("platforms_to_run 必须是数组")
    normalized_platforms = {normalize_text(item).lower() for item in requested_platforms}
    aliases = {
        platform_key,
        PLATFORM_BROWSER_CONFIG[platform_key]["display_name"].lower(),
    }
    return bool(aliases & normalized_platforms)


def make_absolute_url(href: str, current_url: str) -> str:
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("//"):
        return f"https:{href}"
    if href.startswith("/"):
        domain = current_url.split("/", 3)
        if len(domain) >= 3:
            return f"{domain[0]}//{domain[2]}{href}"
    return href


async def create_browser_context(
    playwright: Playwright, payload: dict[str, Any]
) -> tuple[Browser | None, BrowserContext]:
    headless = bool(payload.get("headless", True))
    user_data_dir = normalize_text(payload.get("user_data_dir"))
    storage_state_path = normalize_text(payload.get("storage_state_path"))

    if user_data_dir:
        os.makedirs(user_data_dir, exist_ok=True)
    if storage_state_path:
        if not os.path.exists(storage_state_path):
            raise ValueError("storage_state_path 指向的文件不存在")
    return await launch_browser_context(
        playwright,
        headless=headless,
        user_data_dir=user_data_dir,
        storage_state_path=storage_state_path,
    )


async def wait_for_page_ready(page: Page, ready_selectors: list[str], timeout_ms: int) -> None:
    matched_selector = await wait_for_first_selector(page, ready_selectors, timeout_ms)
    if matched_selector is None:
        await page.wait_for_timeout(min(timeout_ms, 3000))


async def detect_login(page: Page) -> bool:
    return await detect_login_by_keywords(
        page,
        selectors=LOGIN_SELECTORS,
        keywords=LOGIN_KEYWORDS,
        min_keyword_hits=2,
    )


async def maybe_run_search(page: Page, platform_key: str, search_terms: list[str]) -> str:
    if not search_terms:
        return ""
    config = PLATFORM_BROWSER_CONFIG[platform_key]
    chosen_term = search_terms[0]
    for selector in config["search_input_selectors"]:
        try:
            input_handle = await page.query_selector(selector)
            if input_handle is None:
                continue
            await input_handle.click()
            await input_handle.fill("")
            await input_handle.fill(chosen_term)
            await input_handle.press("Enter")
            await page.wait_for_timeout(2000)
            return chosen_term
        except Exception:
            continue
    return ""


async def extract_cards_from_page(page: Page, platform_key: str, per_page_limit: int) -> list[dict[str, Any]]:
    config = PLATFORM_BROWSER_CONFIG[platform_key]
    raw_cards = await page.evaluate(
        """
        ({ cardSelectors, fieldSelectors, currentUrl, perPageLimit }) => {
          const normalizeText = (value) => (value || "").replace(/\\s+/g, " ").trim();
          const unique = (values) => Array.from(new Set(values.filter(Boolean)));
          const pickText = (root, selectors) => {
            for (const selector of selectors) {
              const element = root.querySelector(selector);
              if (element) {
                const text = normalizeText(element.textContent);
                if (text) return text;
              }
            }
            return "";
          };
          const pickTags = (root, selectors) => {
            const values = [];
            for (const selector of selectors) {
              root.querySelectorAll(selector).forEach((element) => {
                const text = normalizeText(element.textContent);
                if (text) values.push(text);
              });
            }
            return unique(values);
          };
          const pickUrl = (root, selectors) => {
            for (const selector of selectors) {
              const element = root.querySelector(selector);
              if (!element) continue;
              const href = element.href || element.getAttribute("href") || "";
              if (href) return href;
            }
            const fallbackAnchor = root.querySelector("a[href]");
            return fallbackAnchor ? (fallbackAnchor.href || fallbackAnchor.getAttribute("href") || "") : "";
          };
          const firstMatchedCards = () => {
            for (const selector of cardSelectors) {
              const nodes = Array.from(document.querySelectorAll(selector));
              if (nodes.length) return nodes;
            }
            return [];
          };

          return firstMatchedCards().slice(0, perPageLimit).map((card) => ({
            name: pickText(card, fieldSelectors.name || []),
            current_title: pickText(card, fieldSelectors.current_title || []),
            current_company: pickText(card, fieldSelectors.current_company || []),
            location: pickText(card, fieldSelectors.location || []),
            salary: pickText(card, fieldSelectors.salary || []),
            summary: pickText(card, fieldSelectors.summary || []),
            skills: pickTags(card, fieldSelectors.tags || []),
            url: pickUrl(card, fieldSelectors.profile_url || []),
            source_page_url: currentUrl,
          }));
        }
        """,
        {
            "cardSelectors": config["card_selectors"],
            "fieldSelectors": config["field_selectors"],
            "currentUrl": page.url,
            "perPageLimit": per_page_limit,
        },
    )
    cards: list[dict[str, Any]] = []
    for raw_card in raw_cards:
        if not isinstance(raw_card, dict):
            continue
        normalized_url = normalize_text(raw_card.get("url"))
        if normalized_url:
            raw_card["url"] = make_absolute_url(normalized_url, page.url)
        cards.append(raw_card)
    return cards


async def goto_next_page(page: Page, platform_key: str) -> bool:
    config = PLATFORM_BROWSER_CONFIG[platform_key]
    for selector in config["next_page_selectors"]:
        try:
            next_handle = await page.query_selector(selector)
            if next_handle is None:
                continue
            await next_handle.click()
            await page.wait_for_timeout(2000)
            return True
        except Exception:
            continue
    return False


async def collect_single_platform(
    page: Page,
    payload: dict[str, Any],
    job: dict[str, Any],
    platform_key: str,
) -> dict[str, Any]:
    config = PLATFORM_BROWSER_CONFIG[platform_key]
    platform_payload = get_platform_payload(payload, platform_key)
    entry_url = get_entry_url(payload, platform_key)
    max_pages = safe_int(platform_payload.get("max_pages") or payload.get("max_pages", 2), 2)
    per_page_limit = safe_int(platform_payload.get("per_page_limit") or payload.get("per_page_limit", 20), 20)
    wait_timeout_ms = safe_int(payload.get("wait_timeout_ms", 8000), 8000)
    search_terms = get_search_terms(payload, job, platform_key)

    if max_pages <= 0:
        raise ValueError("max_pages 必须大于 0")
    if per_page_limit <= 0:
        raise ValueError("per_page_limit 必须大于 0")
    if wait_timeout_ms <= 0:
        raise ValueError("wait_timeout_ms 必须大于 0")
    max_pages = min(max_pages, 10)
    per_page_limit = min(per_page_limit, 50)

    result = {
        "platform": platform_key,
        "platform_name": config["display_name"],
        "entry_url": entry_url,
        "search_terms": search_terms,
        "pages_visited": 0,
        "cards": [],
        "status": "success",
    }
    if not entry_url:
        result["status"] = "missing_entry_url"
        result["message"] = "未提供平台入口 URL，无法启动浏览器采集。"
        return result

    await page.goto(entry_url, wait_until="domcontentloaded", timeout=30000)
    await wait_for_page_ready(page, config["ready_selectors"], wait_timeout_ms)
    if await detect_login(page):
        result["status"] = "need_login"
        result["message"] = "页面需要登录后才能继续采集。"
        return result

    executed_search_term = await maybe_run_search(page, platform_key, search_terms)
    if executed_search_term:
        result["executed_search_term"] = executed_search_term
        await wait_for_page_ready(page, config["ready_selectors"], wait_timeout_ms)

    seen_urls: set[str] = set()
    for page_index in range(max_pages):
        result["pages_visited"] = page_index + 1
        cards = await extract_cards_from_page(page, platform_key, per_page_limit)
        for card in cards:
            card_url = normalize_text(card.get("url"))
            dedupe_key = card_url or f'{normalize_text(card.get("name"))}|{normalize_text(card.get("current_company"))}'
            if dedupe_key and dedupe_key not in seen_urls:
                seen_urls.add(dedupe_key)
                result["cards"].append(card)
        if page_index == max_pages - 1:
            break
        if not await goto_next_page(page, platform_key):
            break
        await wait_for_page_ready(page, config["ready_selectors"], wait_timeout_ms)
        if await detect_login(page):
            result["status"] = "need_login"
            result["message"] = "翻页后进入登录态，已停止采集。"
            break

    result["total_cards"] = len(result["cards"])
    if not result["cards"] and result["status"] == "success":
        result["message"] = "未采集到候选人卡片，请检查入口 URL、登录状态或选择器配置。"
    return result


async def run_collection(payload: dict[str, Any]) -> dict[str, Any]:
    job = payload.get("job")
    if not isinstance(job, dict):
        raise ValueError("输入必须包含 job 对象")

    results = {
        "job": job,
        "collected_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "platform_results": {},
        "boss_cards": [],
        "liepin_cards": [],
        "zhilian_cards": [],
    }

    async with async_playwright() as playwright:
        browser, context = await create_browser_context(playwright, payload)
        try:
            for platform_key in ("boss", "liepin", "zhilian"):
                if not should_run_platform(payload, platform_key):
                    continue
                page = await context.new_page()
                try:
                    platform_result = await collect_single_platform(page, payload, job, platform_key)
                    results["platform_results"][platform_key] = platform_result
                    results[f"{platform_key}_cards"] = platform_result.get("cards", [])
                finally:
                    await page.close()
        finally:
            await context.close()
            if browser is not None:
                await browser.close()

    results["total_cards"] = sum(
        len(results.get(card_key, [])) for card_key in ("boss_cards", "liepin_cards", "zhilian_cards")
    )
    return results


def main() -> None:
    try:
        payload = load_payload()
        result = asyncio.run(run_collection(payload))
        output_path = normalize_text(payload.get("output_path"))
        if output_path:
            output_directory = os.path.dirname(output_path)
            if output_directory:
                os.makedirs(output_directory, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as handle:
                json.dump(result, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            result["output_path"] = output_path
        elif bool(payload.get("auto_output_file")):
            output_directory = normalize_text(payload.get("output_dir")) or "outputs"
            os.makedirs(output_directory, exist_ok=True)
            job_title = normalize_text(result["job"].get("job_title"))
            output_path = os.path.join(
                output_directory,
                f'{datetime.now().strftime("%Y%m%d%H%M%S")}-{safe_slug(job_title)}-platform-cards.json',
            )
            with open(output_path, "w", encoding="utf-8") as handle:
                json.dump(result, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            result["output_path"] = output_path

        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"平台浏览器采集失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

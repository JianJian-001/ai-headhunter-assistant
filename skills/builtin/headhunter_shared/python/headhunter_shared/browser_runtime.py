import asyncio
import random
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, Playwright
from playwright.async_api import TimeoutError as PlaywrightTimeoutError


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
DEFAULT_VIEWPORT = {"width": 1440, "height": 1024}


async def wait_random(min_seconds: float = 1.0, max_seconds: float = 2.0) -> None:
    await asyncio.sleep(random.uniform(min_seconds, max_seconds))


async def wait_for_first_selector(page: Page, selectors: list[str], timeout_ms: int) -> str | None:
    for selector in selectors:
        try:
            await page.wait_for_selector(selector, timeout=timeout_ms)
            return selector
        except PlaywrightTimeoutError:
            continue
    return None


async def detect_login_by_keywords(
    page: Page,
    *,
    selectors: list[str] | None = None,
    keywords: list[str] | None = None,
    min_keyword_hits: int = 1,
) -> bool:
    for selector in selectors or []:
        if await page.query_selector(selector):
            return True

    if not keywords:
        return False
    content = await page.content()
    matched_keywords = sum(1 for keyword in keywords if keyword in content)
    return matched_keywords >= min_keyword_hits


async def launch_browser_context(
    playwright: Playwright,
    *,
    headless: bool = True,
    user_data_dir: str = "",
    storage_state_path: str = "",
    viewport: dict[str, int] | None = None,
    user_agent: str = DEFAULT_USER_AGENT,
) -> tuple[Browser | None, BrowserContext]:
    viewport = viewport or DEFAULT_VIEWPORT
    if user_data_dir:
        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=headless,
            viewport=viewport,
            user_agent=user_agent,
        )
        return None, context

    browser = await playwright.chromium.launch(headless=headless)
    context_options: dict[str, Any] = {
        "viewport": viewport,
        "user_agent": user_agent,
    }
    if storage_state_path:
        context_options["storage_state"] = storage_state_path
    context = await browser.new_context(**context_options)
    return browser, context


智猎，90天内发布了1000多家岗位
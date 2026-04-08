#!/usr/bin/env python3
import json
import re
import sys
from html import unescape
from typing import Any
from urllib.parse import parse_qs, quote_plus, urlparse
from urllib.request import Request, urlopen

from extract_public_candidates import build_queries, normalize_text


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
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


def strip_tags(value: str) -> str:
    return normalize_text(re.sub(r"<[^>]+>", " ", unescape(value)))


def extract_result_url(raw_url: str) -> str:
    cleaned_url = normalize_text(unescape(raw_url))
    parsed_url = urlparse(cleaned_url)
    query_values = parse_qs(parsed_url.query)
    for redirect_key in ("uddg", "rut"):
        if redirect_key in query_values and query_values[redirect_key]:
            return normalize_text(query_values[redirect_key][0])
    return cleaned_url


def parse_duckduckgo_html(html: str) -> list[dict[str, str]]:
    anchor_pattern = re.compile(
        r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    snippet_pattern = re.compile(
        r'<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(?P<snippet>.*?)</a>|'
        r'<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(?P<divsnippet>.*?)</div>',
        re.IGNORECASE | re.DOTALL,
    )

    anchors = list(anchor_pattern.finditer(html))
    snippets = list(snippet_pattern.finditer(html))
    results: list[dict[str, str]] = []
    for index, anchor_match in enumerate(anchors):
        snippet_match = snippets[index] if index < len(snippets) else None
        snippet_value = ""
        if snippet_match:
            snippet_value = snippet_match.group("snippet") or snippet_match.group("divsnippet") or ""
        results.append(
            {
                "title": strip_tags(anchor_match.group("title")),
                "url": extract_result_url(anchor_match.group("url")),
                "snippet": strip_tags(snippet_value),
            }
        )
    return results


def fetch_duckduckgo_html(query: str, timeout_seconds: int) -> str:
    query_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
    request = Request(query_url, headers=DEFAULT_HEADERS)
    with urlopen(request, timeout=timeout_seconds) as response:
        return response.read().decode("utf-8", errors="replace")


def deduplicate_results(search_results: list[dict[str, str]], per_query_limit: int) -> list[dict[str, str]]:
    deduplicated_results: list[dict[str, str]] = []
    seen_urls: set[str] = set()
    for search_result in search_results:
        normalized_url = normalize_text(search_result.get("url")).lower()
        if not normalized_url or normalized_url in seen_urls:
            continue
        seen_urls.add(normalized_url)
        deduplicated_results.append(search_result)
        if len(deduplicated_results) >= per_query_limit:
            break
    return deduplicated_results


def main() -> None:
    try:
        payload = load_payload()
        job = payload.get("job")
        if not isinstance(job, dict):
            raise ValueError("输入必须包含 job 对象")

        query_limit = int(payload.get("query_limit", 3))
        per_query_limit = int(payload.get("per_query_limit", 5))
        timeout_seconds = int(payload.get("timeout_seconds", 15))
        if query_limit <= 0:
            raise ValueError("query_limit 必须大于 0")
        if per_query_limit <= 0:
            raise ValueError("per_query_limit 必须大于 0")
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds 必须大于 0")
        queries = build_queries(job)[: max(query_limit, 1)]

        all_search_results: list[dict[str, str]] = []
        html_pages = payload.get("html_pages")
        if html_pages is not None:
            if not isinstance(html_pages, list):
                raise ValueError("html_pages 必须是数组")
            if len(html_pages) != len(queries):
                raise ValueError("html_pages 数量必须与 queries 数量一致")
            for query, html_page in zip(queries, html_pages):
                query_results = parse_duckduckgo_html(normalize_text(html_page))
                query_results = deduplicate_results(query_results, per_query_limit)
                for query_result in query_results:
                    query_result["query"] = query
                all_search_results.extend(query_results)
        else:
            for query in queries:
                html_page = fetch_duckduckgo_html(query, timeout_seconds)
                query_results = parse_duckduckgo_html(html_page)
                query_results = deduplicate_results(query_results, per_query_limit)
                for query_result in query_results:
                    query_result["query"] = query
                all_search_results.extend(query_results)

        deduplicated_results = deduplicate_results(all_search_results, query_limit * per_query_limit)
        result = {
            "job": job,
            "queries": queries,
            "search_results": deduplicated_results,
            "total_results": len(deduplicated_results),
        }
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    except ValueError as error:
        emit_error(str(error))
        sys.exit(1)
    except Exception as error:
        emit_error(f"公开搜索结果获取失败: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()

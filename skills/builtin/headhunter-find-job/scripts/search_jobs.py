#!/usr/bin/env python3
"""
招聘岗位信息获取 - 基于 Playwright 的浏览器自动化

支持 BOSS直聘、猎聘等招聘网站的岗位信息抓取。
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page

SHARED_PYTHON_DIR = Path(__file__).resolve().parents[2] / "headhunter_shared" / "python"
if str(SHARED_PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_PYTHON_DIR))

from headhunter_shared.browser_runtime import (
    DEFAULT_USER_AGENT,
    DEFAULT_VIEWPORT,
    detect_login_by_keywords,
    launch_browser_context,
    wait_for_first_selector,
    wait_random,
)


# 招聘网站配置
SITES = {
    "boss": {
        "name": "BOSS直聘",
        "search_url": "https://www.zhipin.com/web/geek/job?query={keyword}&city={city}",
        "city_code": {
            "北京": "101010100", "上海": "101020100", "广州": "101280100",
            "深圳": "101280600", "杭州": "101210100", "成都": "101270100",
            "南京": "101190100", "武汉": "101200100", "西安": "101110100",
        }
    },
    "liepin": {
        "name": "猎聘",
        "search_url": "https://www.liepin.com/zhaopin/?key={keyword}&city={city}",
        "city_code": {
            "北京": "010", "上海": "020", "广州": "030",
            "深圳": "040", "杭州": "080", "成都": "280",
        }
    }
}

# 输出目录
OUTPUT_DIR = "jobs"


async def detect_login(page: Page) -> bool:
    """检测是否需要登录"""
    login_keywords = ["登录", "扫码", "验证手机", "请先登录", "立即登录"]
    return await detect_login_by_keywords(page, keywords=login_keywords, min_keyword_hits=1)


async def extract_jobs_boss(page: Page) -> List[Dict]:
    """从 BOSS直聘提取岗位信息"""
    jobs = []
    
    try:
        # 等待页面加载
        await wait_random(2, 3)
        
        # 尝试多种选择器
        selectors = [
            ".job-list-box .job-card-wrapper",
            ".search-job-result .job-list-item", 
            ".job-card-left",
            "[ka='search-job-item']",
            ".job-card-wrapper"
        ]
        
        job_cards = []
        matched_selector = await wait_for_first_selector(page, selectors, 5000)
        if matched_selector:
            job_cards = await page.query_selector_all(matched_selector)
        
        if not job_cards:
            # 尝试获取页面内容并解析
            content = await page.content()
            if "验证" in content or "登录" in content or "安全验证" in content:
                print("BOSS直聘需要验证或登录")
                return []
        
        for card in job_cards[:20]:  # 最多取20条
            try:
                job = {}
                
                # 岗位名称
                title_el = await card.query_selector(".job-name, .job-title")
                if title_el:
                    job["title"] = await title_el.inner_text()
                
                # 公司名称
                company_el = await card.query_selector(".company-name, .company-text")
                if company_el:
                    job["company"] = await company_el.inner_text()
                
                # 薪资
                salary_el = await card.query_selector(".salary, .job-salary")
                if salary_el:
                    job["salary"] = await salary_el.inner_text()
                
                # 地点
                location_el = await card.query_selector(".job-area, .area")
                if location_el:
                    job["location"] = await location_el.inner_text()
                
                # 链接
                link_el = await card.query_selector("a[href*='/job_detail/'], a[href*='/job/']")
                if link_el:
                    href = await link_el.get_attribute("href")
                    if href:
                        if href.startswith("/"):
                            job["url"] = f"https://www.zhipin.com{href}"
                        else:
                            job["url"] = href
                
                if job.get("title"):
                    jobs.append(job)
                    
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"BOSS直聘提取失败: {e}")
    
    return jobs


async def extract_jobs_liepin(page: Page) -> List[Dict]:
    """从猎聘提取岗位信息"""
    jobs = []
    
    try:
        # 等待岗位列表加载
        await page.wait_for_selector(".job-list, .sojob-list", timeout=10000)
        await wait_random(1.5, 2.5)
        
        # 提取岗位信息
        job_cards = await page.query_selector_all(".job-list-item, .sojob-item")
        
        for card in job_cards[:20]:  # 最多取20条
            try:
                job = {}
                
                # 岗位名称
                title_el = await card.query_selector(".job-title, .job-name")
                if title_el:
                    job["title"] = await title_el.inner_text()
                
                # 公司名称
                company_el = await card.query_selector(".company-name, .company-text")
                if company_el:
                    job["company"] = await company_el.inner_text()
                
                # 薪资
                salary_el = await card.query_selector(".job-salary, .text-warning")
                if salary_el:
                    job["salary"] = await salary_el.inner_text()
                
                # 地点
                location_el = await card.query_selector(".job-area, .area")
                if location_el:
                    job["location"] = await location_el.inner_text()
                
                # 链接
                link_el = await card.query_selector("a[href*='/job/'], a[href*='liepin.com']")
                if link_el:
                    href = await link_el.get_attribute("href")
                    if href:
                        job["url"] = href
                
                if job.get("title"):
                    jobs.append(job)
                    
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"猎聘提取失败: {e}")
    
    return jobs


async def search_jobs(
    keyword: str,
    city: str = "",
    sites: List[str] = ["boss", "liepin"],
    headless: bool = True
) -> Dict:
    """搜索招聘岗位"""
    
    results = {
        "keyword": keyword,
        "city": city,
        "search_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "jobs": {},
        "total": 0
    }
    
    async with async_playwright() as p:
        browser, context = await launch_browser_context(
            p,
            headless=headless,
            viewport=DEFAULT_VIEWPORT,
            user_agent=DEFAULT_USER_AGENT,
        )
        page = await context.new_page()
        
        for site_key in sites:
            if site_key not in SITES:
                continue
                
            site = SITES[site_key]
            site_name = site["name"]
            
            try:
                # 构建搜索URL
                city_code = site["city_code"].get(city, "")
                url = site["search_url"].format(
                    keyword=keyword,
                    city=city_code
                )
                
                print(f"正在访问 {site_name}: {url}")
                
                # 导航到页面
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await wait_random(2, 3)
                
                # 检测登录墙
                if await detect_login(page):
                    print(f"{site_name} 需要登录，跳过")
                    results["jobs"][site_name] = {
                        "status": "need_login",
                        "message": "需要登录才能查看岗位"
                    }
                    continue
                
                # 提取岗位信息
                if site_key == "boss":
                    jobs = await extract_jobs_boss(page)
                elif site_key == "liepin":
                    jobs = await extract_jobs_liepin(page)
                else:
                    jobs = []
                
                results["jobs"][site_name] = {
                    "status": "success",
                    "count": len(jobs),
                    "list": jobs
                }
                results["total"] += len(jobs)
                
                print(f"{site_name} 获取到 {len(jobs)} 个岗位")
                
            except Exception as e:
                print(f"{site_name} 访问失败: {e}")
                results["jobs"][site_name] = {
                    "status": "error",
                    "message": str(e)
                }
        
        await context.close()
        if browser is not None:
            await browser.close()
    
    return results


async def search_company_jobs(
    company: str,
    keyword: str = "",
    headless: bool = True
) -> Dict:
    """搜索指定公司的岗位"""
    
    search_term = f"{company} {keyword}".strip()
    return await search_jobs(search_term, sites=["boss", "liepin"], headless=headless)


async def search_by_url(
    url: str,
    headless: bool = True
) -> Dict:
    """从指定URL获取岗位信息"""
    
    results = {
        "url": url,
        "search_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "jobs": [],
        "status": "success"
    }
    
    async with async_playwright() as p:
        browser, context = await launch_browser_context(
            p,
            headless=headless,
            viewport=DEFAULT_VIEWPORT,
            user_agent=DEFAULT_USER_AGENT,
        )
        page = await context.new_page()
        
        try:
            print(f"正在访问: {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await wait_random(2, 3)
            
            # 检测登录墙
            if await detect_login(page):
                results["status"] = "need_login"
                results["message"] = "需要登录才能查看内容"
            else:
                # 截图保存
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                screenshot_path = f"{OUTPUT_DIR}/screenshot-{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
                await page.screenshot(path=screenshot_path, full_page=True)
                results["screenshot"] = screenshot_path
                
                # 提取页面标题
                title = await page.title()
                results["page_title"] = title
                
                # 尝试提取岗位链接
                links = await page.query_selector_all("a[href*='job'], a[href*='position']")
                for link in links[:20]:
                    href = await link.get_attribute("href")
                    text = await link.inner_text()
                    if href and text:
                        results["jobs"].append({
                            "title": text.strip(),
                            "url": href if href.startswith("http") else urljoin(page.url, href)
                        })
                
        except Exception as e:
            results["status"] = "error"
            results["message"] = str(e)
        
        await context.close()
        if browser is not None:
            await browser.close()
    
    return results


def save_results(results: Dict, filename: str = None) -> str:
    """保存结果到文件"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not filename:
        keyword = results.get("keyword", "unknown")
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"{OUTPUT_DIR}/{timestamp}-{keyword}-001.md"
    
    # 生成 Markdown 内容
    content = f"""# 招聘岗位搜索结果

**搜索关键词**: {results.get('keyword', 'N/A')}  
**搜索城市**: {results.get('city', '不限')}  
**搜索时间**: {results.get('search_time', 'N/A')}  
**总计**: {results.get('total', 0)} 个岗位

"""
    
    for site_name, site_data in results.get("jobs", {}).items():
        if site_data.get("status") != "success":
            content += f"## {site_name}\n\n状态: {site_data.get('message', '获取失败')}\n\n"
            continue
        
        jobs = site_data.get("list", [])
        content += f"""## {site_name} ({site_data.get('count', 0)} 个)

| # | 岗位名称 | 公司 | 地点 | 薪资 | 链接 |
|---|---------|------|------|------|------|
"""
        for i, job in enumerate(jobs, 1):
            content += f"| {i} | {job.get('title', 'N/A')} | {job.get('company', 'N/A')} | {job.get('location', 'N/A')} | {job.get('salary', 'N/A')} | [查看]({job.get('url', '#')}) |\n"
        
        content += "\n"
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    
    return filename


def main():
    parser = argparse.ArgumentParser(description="招聘岗位信息获取")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # search 命令
    search_parser = subparsers.add_parser("search", help="搜索岗位")
    search_parser.add_argument("keyword", help="搜索关键词")
    search_parser.add_argument("--city", default="", help="城市")
    search_parser.add_argument("--sites", nargs="+", default=["boss", "liepin"], help="招聘网站")
    search_parser.add_argument("--show-browser", action="store_false", dest="headless", default=True, help="显示浏览器窗口")
    search_parser.add_argument("--output", help="输出文件名")
    
    # company 命令
    company_parser = subparsers.add_parser("company", help="搜索公司岗位")
    company_parser.add_argument("company", help="公司名称")
    company_parser.add_argument("--keyword", default="", help="岗位关键词")
    company_parser.add_argument("--show-browser", action="store_false", dest="headless", default=True, help="显示浏览器窗口")
    
    # url 命令
    url_parser = subparsers.add_parser("url", help="从URL获取")
    url_parser.add_argument("url", help="页面URL")
    url_parser.add_argument("--show-browser", action="store_false", dest="headless", default=True, help="显示浏览器窗口")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == "search":
        results = asyncio.run(search_jobs(
            keyword=args.keyword,
            city=args.city,
            sites=args.sites,
            headless=args.headless
        ))
        filename = save_results(results, args.output)
        results["output_file"] = filename
        
    elif args.command == "company":
        results = asyncio.run(search_company_jobs(
            company=args.company,
            keyword=args.keyword,
            headless=args.headless
        ))
        filename = save_results(results)
        results["output_file"] = filename
        
    elif args.command == "url":
        results = asyncio.run(search_by_url(
            url=args.url,
            headless=args.headless
        ))
    
    # 输出 JSON 结果
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

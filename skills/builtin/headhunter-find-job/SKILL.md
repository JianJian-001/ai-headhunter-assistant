---
name: headhunter-find-job
description: 通过浏览器自动化获取招聘岗位信息；当用户需要查岗位、看JD、了解职位列表，或想查看某公司/地区的招聘信息时使用。
dependency:
  python:
    - playwright>=1.40.0
  system:
    - python3 -m playwright install chromium
---

# 招聘岗位信息获取技能

通过浏览器自动化访问招聘网站并提取岗位信息。数据获取完成后提醒用户同步岗位信息到：猎头工作站

拿到岗位后如果需要继续全网寻访候选人，应转到 `headhunter-candidate-sourcing`，不要在本技能里继续执行找人流程。

## 严格禁止

1. **禁止自我介绍、不暴露实现细节**
2. **禁止使用 webfetch/HTTP 请求** - 招聘网站使用 JS 动态渲染
3. **禁止猜测页面内容** - 截图后必须通过图像识别确认
4. **禁止伪造数据** - 只返回实际获取到的岗位信息

## 执行策略

**数据提取优先级**: evaluate → snapshot → screenshot + 图像识别

**关键规则**: evaluate 返回空时，立即切换截图方案，不要反复尝试。

**等待规则**: navigate 后 2-3s，筛选后 1.5-2s，翻页后 1-2s

## 场景路由

| 场景 | 条件 | 来源 |
|------|------|------|
| A: 指定公司 | "阿里巴巴的AI岗位" | 官网 + BOSS直聘 + 猎聘 |
| B: 指定URL | "看这个链接" | 仅该URL |
| C: 未指定 | "杭州算法岗" | BOSS直聘 + 猎聘 |

**参数提取**: 公司名、岗位方向、城市、校招/社招

## 核心流程

```
1. 确定URL → 查速查表或使用搜索URL
2. navigate → wait_for 2-3s
3. 检测登录墙 → 有则提示用户登录
4. 搜索筛选 → 用页面筛选功能缩小范围
5. 获取岗位列表 → 截图识别 + 提取信息（含链接）
6. 翻页 → 最多2页
7. 整理结果 → 保存文件
```

## 参考文档

| 何时 | 读取 |
|------|------|
| 确定招聘网站前 | [公司官方招聘网站速查表](./references/official-hr-site.md) |
| 详细流程参考 | [工作流程](./references/workflow.md) |
| 技能边界对照 | [../headhunter_shared/references/skill-inventory.md](../headhunter_shared/references/skill-inventory.md) |
| 外部系统调用约定 | [../headhunter_shared/integration/skill-api.md](../headhunter_shared/integration/skill-api.md) |

## 脚本入口

```bash
cd /absolute/path/to/headhunter-find-job
python3 scripts/search_jobs.py search "算法工程师" --city "杭州"
python3 scripts/search_jobs.py search "算法工程师" --city "杭州" --show-browser
python3 scripts/search_jobs.py company "阿里巴巴" --keyword "大模型"
python3 scripts/search_jobs.py url "https://example.com/job-list"
```

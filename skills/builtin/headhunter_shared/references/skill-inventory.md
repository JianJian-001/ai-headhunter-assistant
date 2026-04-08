# 猎头 Skills 边界清单

## 上游链路

| Skill | 核心职责 | 输入焦点 | 输出焦点 | 不负责 |
|------|----------|----------|----------|--------|
| `headhunter-find-job` | 抓取岗位列表与 JD | 公司、方向、城市、URL | 岗位列表、岗位链接、JD 线索 | 寻访候选人、生成报告 |
| `headhunter-search-report` | 生成岗位分析报告并回写岗位库 | JD、岗位信息、行业背景 | 岗位分析、寻访关键字、飞书文档 | 招聘网站抓取、候选人 Top10 |
| `headhunter-candidate-sourcing` | 多源候选人寻访、Top10、路由 | `job`、公开线索、本地知识库、平台卡片 | `top_candidates`、`task_queue`、`handoffs` | 单份简历深挖、已建联长期跟进 |
| `headhunter-cv-jd-matching` | 本地简历与 JD 深度匹配 | `resume_file_path` / `resume_file_dir_path`、JD | 匹配结果、触达建议、入表结果 | 全网寻访、平台抓卡片 |

## 候选人沟通链路

| Skill | 核心职责 | 输入焦点 | 输出焦点 | 不负责 |
|------|----------|----------|----------|--------|
| `headhunter-outreach-message` | 首次触达与首轮无回复跟进 | 候选人线索、岗位卖点、可用渠道 | 渠道建议、首触文案、跟进节奏 | 已建联长期保温 |
| `headhunter-greeting-skill` | 已建联后的保温、推进、微信发送 | 已建联候选人、互动历史、推进阶段 | 热度判断、下一步动作、微信预览/发送结果 | 首次触达、客户维护 |
| `headhunter-client-nurture` | 客户关系维护、续单扩单挖掘 | 客户合作状态、风险信号、生命周期 | 客户分层、触点建议、沟通议题 | 候选人跟进、正式报告 |

## 交付与工作台

| Skill | 核心职责 | 输入焦点 | 输出焦点 | 不负责 |
|------|----------|----------|----------|--------|
| `headhunter-candidate-report` | 候选人正式推荐报告 | 会议纪要、妙记、候选人记录、岗位记录 | 飞书文档、推荐报告回写链接 | 没有上下文时直接编报告 |
| `headhunter-table-manage` | 飞书工作台统一 I/O | Base、表、字段、记录、文档 | 岗位库/人才库/项目进展的增删改查 | 寻访排序、触达文案 |
| `headhunter-chat` | 技能目录和默认入口 | 闲聊、问候、功能咨询 | 技能导览、示例句式 | 具体业务执行 |

## 主要重复点

### 1. 飞书规则重复

重复出现于：

- `headhunter-table-manage`
- `headhunter-search-report`
- `headhunter-candidate-report`
- `headhunter-cv-jd-matching`

重复内容：

- `lark-cli` 认证与身份
- Base 结构读取
- 文档创建/更新
- 记录回写
- token/field 校验纪律

### 2. 浏览器自动化重复

重复出现于：

- `headhunter-find-job/scripts/search_jobs.py`
- `headhunter-candidate-sourcing/scripts/collect_platform_candidates_browser.py`

重复内容：

- Playwright 上下文创建
- 登录检测
- 页面等待
- 翻页
- 平台站点配置

### 3. 消息与动作规划重复

重复出现于：

- `headhunter-outreach-message/scripts/channel_selector.py`
- `headhunter-outreach-message/scripts/sequence_builder.py`
- `headhunter-greeting-skill/scripts/interest_score.py`
- `headhunter-greeting-skill/scripts/next_action_planner.py`
- `headhunter-client-nurture/scripts/client_tier_score.py`
- `headhunter-client-nurture/scripts/touchpoint_scheduler.py`

重复内容：

- JSON CLI 输入输出
- 评分器
- 节奏建议
- 下一步动作规划

## 收敛原则

- 保留 skill 名，不合并业务阶段
- 共享实现层，不共享业务边界
- 外部系统只调用 skills，不感知内部脚本路径

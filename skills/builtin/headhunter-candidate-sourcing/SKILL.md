---
name: headhunter-candidate-sourcing
description: 拿到岗位后执行全网与本地知识库候选人寻访、统一去重打分、输出 Top10 候选人，并将结果分流到现有猎头技能链路。用户提到寻访候选人、搜人、找合适候选人、Top10 推荐、岗位后全网找人时使用。
dependency:
  python:
    - playwright>=1.40.0
  system:
    - python3
    - python3 -m playwright install chromium
---

# 候选人寻访技能

这个技能是猎头工作流的上游入口。目标不是只“搜到一些人”，而是围绕一个岗位完成：

1. 读取岗位上下文与寻访关键字
2. 同时检索全网公开来源和本地知识库
3. 统一结构化、去重、打分、排序
4. 输出最匹配的 10 位候选人
5. 让结果直接流入现有技能链路

## 作用边界

适用：
- 拿到岗位后，需要全网寻访候选人
- 需要从飞书人才库、本地简历、微信联系人线索中找合适人选
- 需要合并多来源候选人并输出 Top10
- 需要决定候选人下一步进入哪个猎头技能

不适用：
- 单纯查招聘岗位或 JD
- 只分析一份简历和职位匹配度
- 只写首次触达文案
- 已建联后的长期候选人保温

对应下游技能：
- 找岗位/JD：`headhunter-find-job`
- 简历匹配：`headhunter-cv-jd-matching`
- 首次触达：`headhunter-outreach-message`
- 已建联跟进：`headhunter-greeting-skill`
- 正式推荐报告：`headhunter-candidate-report`
- 客户侧后续推动：`headhunter-client-nurture`
- 飞书入库与更新：`headhunter-table-manage`

## 先读规则

执行前先读取：

1. [../headhunter-table-manage/SKILL.md](../headhunter-table-manage/SKILL.md)
2. [../LARK-CLI-FEISHU-GUIDE.md](../LARK-CLI-FEISHU-GUIDE.md)
3. [references/candidate-schema.md](./references/candidate-schema.md)
4. [references/source-playbook.md](./references/source-playbook.md)
5. [references/ranking-routing.md](./references/ranking-routing.md)
6. [../headhunter-outreach-message/SKILL.md](../headhunter-outreach-message/SKILL.md)
7. [../headhunter-greeting-skill/SKILL.md](../headhunter-greeting-skill/SKILL.md)
8. [../headhunter_shared/references/skill-inventory.md](../headhunter_shared/references/skill-inventory.md)
9. [../headhunter_shared/contracts/job-contract.md](../headhunter_shared/contracts/job-contract.md)
10. [../headhunter_shared/contracts/candidate-contract.md](../headhunter_shared/contracts/candidate-contract.md)
11. [../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)

如果岗位分析报告和寻访关键字尚未准备好，优先引导用户先走 `headhunter-search-report` 或从岗位库补齐上下文。

## 严格禁止

1. 禁止编造候选人资料、联系方式、来源链接或简历内容
2. 禁止跳过证据字段，只给结论不给来源
3. 禁止绕过 `headhunter-table-manage` 直接写飞书
4. 禁止把首次触达和已建联跟进混成一个技能
5. 禁止把微信聊天记录解析当成第一版硬依赖
6. 禁止在没有岗位上下文时直接输出 Top10

## 标准输入

至少提供以下任一入口：

- 岗位名称 + 公司 + 城市 + 职位要求
- 岗位库记录或岗位库链接
- 一份完整 JD
- 已整理好的寻访关键字

可选补充：

- 本地简历文件夹路径
- 历史候选人文件或表格路径
- 候选人公开资料链接列表
- 飞书人才库 / 招聘项目进展中的候选人范围

## 数据来源

### 全网公开来源

优先寻找：

- 领英、脉脉、GitHub、个人主页等公开资料
- 公司官网团队页、技术博客、演讲嘉宾页、新闻稿
- 招聘平台上的公开候选人线索页或公开资料页

### 平台适配器来源

第一阶段已单独接入：

- `BOSS直聘`
- `猎聘`
- `智联招聘`

说明：

- 不把国内招聘平台混进公开网页抽取脚本
- 平台结果先通过独立适配器输出统一候选人结构
- 平台结果当前支持“浏览器自动化抓卡片 -> 平台适配 -> 统一打分与分流”
- `拉勾`、`前程无忧` 留待后续平台模块补齐

### 本地知识库

优先读取：

- 飞书人才库
- 飞书招聘项目进展
- 本地简历文件夹
- 本地候选人表格或 Markdown/JSON 文件
- 微信联系人辅助信息

## 核心工作流

1. 提取岗位上下文：
   - 岗位名称、公司、城市、薪资、职级、必备技能、加分项、寻访关键字
2. 建立来源清单：
   - 全网公开来源
   - 平台适配器来源
   - 飞书人才库 / 招聘项目进展
   - 本地简历和其他本地文件
3. 对公开网页线索先做抽取：
   - 使用 `scripts/extract_public_candidates.py`
4. 对国内招聘平台结果先做平台适配：
   - 先使用 `scripts/collect_platform_candidates_browser.py` 抓取平台卡片
   - 使用 `scripts/search_boss_candidates.py`
   - 使用 `scripts/search_liepin_candidates.py`
   - 使用 `scripts/search_zhilian_candidates.py`
5. 将候选人归一化成统一结构：
   - 使用 `scripts/normalize_candidates.py`
6. 根据岗位画像打分和路由：
   - 使用 `scripts/rank_candidates.py`
7. 输出 Top10：
   - 每位候选人必须包含匹配分、匹配理由、风险提示、下一步技能
8. 将结果流入工作台：
   - 通过 `headhunter-table-manage` 写入人才库或招聘项目进展
9. 按路由进入现有技能：
   - 未建联 -> `headhunter-outreach-message`
   - 已建联 -> `headhunter-greeting-skill`
   - 高潜正式推荐 -> `headhunter-candidate-report`
   - 需要客户侧推进 -> `headhunter-client-nurture`

## 脚本入口

### 1. 公开网页候选人抽取

先获取公开搜索结果：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/search_public_results.py public-search-query.json
```

输入岗位信息与搜索结果摘要，输出公开网页候选人线索：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/extract_public_candidates.py public-search-results.json
```

### 2. 候选人归一化

输入 `job` 与 `candidates` 的 JSON 文件，输出统一结构：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/normalize_candidates.py input.json
```

### 3. 平台候选人适配

将 `BOSS直聘` 结构化卡片结果转为统一候选人结构：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/search_boss_candidates.py boss-cards.json
```

将 `猎聘` 结构化卡片结果转为统一候选人结构：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/search_liepin_candidates.py liepin-cards.json
```

将 `智联招聘` 结构化卡片结果转为统一候选人结构：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/search_zhilian_candidates.py zhilian-cards.json
```

### 4. 浏览器自动化采集平台候选人卡片

如果已有平台候选人入口页 URL，并且账号已登录，可直接抓取平台卡片：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/collect_platform_candidates_browser.py browser-input.json
```

输入建议包含：

- `job`
- `platform_entry_urls.boss`
- `platform_entry_urls.liepin`
- `platform_entry_urls.zhilian`
- `user_data_dir` 或 `storage_state_path`

说明：

- 当前优先支持“已知入口 URL”的浏览器采集
- 如果页面存在登录墙，会返回 `need_login`
- 输出结果内含 `boss_cards`、`liepin_cards`、`zhilian_cards`，可直接喂给统一流水线

### 5. 候选人打分与路由

对归一化候选人打分、去重、输出 Top10：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/rank_candidates.py normalized.json
```

### 6. 生成下游技能交接数据

根据 Top10 结果生成 `headhunter-table-manage` 与各下游技能可直接消费的数据包：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/prepare_skill_handoffs.py ranked.json
```

### 7. 运行公开寻访端到端流水线

如果已拿到公开搜索结果或 HTML 页面，可直接运行端到端流水线：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/run_public_sourcing_pipeline.py pipeline-input.json
```

注意：

- `query_limit`、`per_query_limit` 必须大于 0
- 如果传 `html_pages`，数量必须和本轮 `queries_used` 数量一致
- 流水线输出的 `search_results_used` 是进入候选人池的搜索结果子集

### 8. 运行多来源候选人寻访流水线

如果同时有公开网页线索、平台适配结果与本地候选人数据，可直接运行：

```bash
cd /absolute/path/to/headhunter-candidate-sourcing
python3 scripts/run_platform_sourcing_pipeline.py pipeline-input.json
```

支持输入：

- `search_results` 或 `html_pages`
- `boss_cards` / `boss_candidates`
- `liepin_cards` / `liepin_candidates`
- `zhilian_cards` / `zhilian_candidates`
- `platform_results`
- `local_candidates`

## 输出要求

默认输出按 [assets/top10-template.md](./assets/top10-template.md) 组织，至少包含：

1. 岗位摘要
2. 来源覆盖范围
3. Top10 候选人清单
4. 每位候选人的匹配分、依据、风险、下一步技能
5. 需要写入 `headhunter-table-manage` 的建议字段
6. 可直接消费的 `task_queue`

聊天窗口内只输出业务结果，不暴露底层命令细节。

## 与现有技能的流转规则

- `recommended_next_skill = headhunter-outreach-message`
  - 候选人是新线索
  - 具备至少一个有效触达渠道
  - 尚未建联

- `recommended_next_skill = headhunter-greeting-skill`
  - 已有过往沟通记录
  - 已在微信或电话中建立联系

- `recommended_next_skill = headhunter-candidate-report`
  - 匹配分高
  - 信息完整
  - 适合正式推荐给客户

- `recommended_next_skill = headhunter-client-nurture`
  - 候选人推进需要客户侧动作
  - 项目中存在客户风险、推进卡点或优先级升级

- `recommended_next_skill = headhunter-cv-jd-matching`
  - 已拿到本地简历文件或附件
  - 需要进一步做简历与 JD 的结构化匹配

## 参考文件

- 统一结构：[references/candidate-schema.md](./references/candidate-schema.md)
- 来源打法：[references/source-playbook.md](./references/source-playbook.md)
- 公开网页抽取：[references/public-web-sourcing.md](./references/public-web-sourcing.md)
- 排序与路由：[references/ranking-routing.md](./references/ranking-routing.md)
- Top10 模板：[assets/top10-template.md](./assets/top10-template.md)
- 共享岗位 contract：[../headhunter_shared/contracts/job-contract.md](../headhunter_shared/contracts/job-contract.md)
- 共享候选人 contract：[../headhunter_shared/contracts/candidate-contract.md](../headhunter_shared/contracts/candidate-contract.md)
- 共享 handoff contract：[../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)

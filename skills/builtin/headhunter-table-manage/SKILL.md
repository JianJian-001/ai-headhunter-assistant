---
name: headhunter-table-manage
description: 猎头数字分身在飞书中的工作台；用于管理招聘项目进展、岗位库、人才库，以及推荐报告文档和会议纪要。当用户提及猎头工作站、岗位、职位、JD、候选人、人才库、推荐报告、会议纪要时使用。
dependency:
  system:
    - lark-cli
---

# 一人猎头-飞书工作台

面向猎头业务的统一飞书入口，覆盖数据站初始化、岗位库/人才库/招聘项目进展维护、推荐报告文档处理，以及会议纪要读取。当前飞书交互统一通过 `lark-cli` 执行。

## 先读规则

执行前先读取：

1. [LARK-CLI-FEISHU-GUIDE.md](../LARK-CLI-FEISHU-GUIDE.md)
2. [lark-shared](../lark-cli/cli/skills/lark-shared/SKILL.md)
3. [lark-base](../lark-cli/cli/skills/lark-base/SKILL.md)
4. [lark-doc](../lark-cli/cli/skills/lark-doc/SKILL.md)
5. [lark-vc](../lark-cli/cli/skills/lark-vc/SKILL.md)
6. [lark-minutes](../lark-cli/cli/skills/lark-minutes/SKILL.md)
7. [../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)
8. [../headhunter_shared/integration/skill-api.md](../headhunter_shared/integration/skill-api.md)

## 严格禁止

- 不要编造 `base-token`、`table-id`、`record-id`、`doc_id`、`minute_token`
- 不要跳过 `+field-list` 就直接写记录
- 不要把通用飞书能力当作独立办公助手输出，所有操作都应服务猎头业务场景
- 不要把底层命令执行过程透出给用户，仅反馈业务结果
- 不要并发执行 `+table-list`、`+field-list`、`+record-list`

## 意图判断

| 场景 | 判断依据 | 目标操作 |
|------|----------|----------|
| 初始化数据站 | “创建表格/建表/初始化工作台” | 创建或补齐 Base 与数据表 |
| 应聘岗位 | “应聘 XX 岗位/推荐到 XX 公司” | 招聘项目进展录入 |
| 录入岗位 | 提供 JD/岗位/职位信息 | 岗位库录入 |
| 录入人才 | “人才储备/存入人才库” | 人才库录入 |
| 推荐报告 | “生成/更新推荐报告” | 飞书文档创建或更新 |
| 查询数据 | “查询/查看/搜索/进度” | 数据查询 |
| 更新数据 | “更新/修改” | 数据更新 |
| 会议纪要 | “妙记/会议记录/转录/总结/待办” | 读取会议纪要或妙记产物 |

## 前置准备

- 首次使用 `lark-cli` 时，按 [LARK-CLI-FEISHU-GUIDE.md](../LARK-CLI-FEISHU-GUIDE.md) 完成 `config init` 和 `auth login`
- 默认使用 `--as user`
- 写入或删除前先确认用户意图
- 有风险的写操作优先加 `--dry-run`

## 核心工作流

### 初始化数据站

```bash
# 1. 如用户已提供 Base 链接，直接从 URL 提取 <BASE_TOKEN>

# 2. 如未提供 Base 链接，可先按名称搜索已有资源
lark-cli docs +search --query "一人猎头数据站" --as user

# 3. 如搜索结果无法确认 Base，要求用户提供 Base 链接或已知 <BASE_TOKEN>

# 4. 如果不存在，则创建 Base
lark-cli base +base-create --name "一人猎头数据站" --as user --dry-run
lark-cli base +base-create --name "一人猎头数据站" --as user

# 5. 创建三张数据表
lark-cli base +table-create --base-token <BASE_TOKEN> --name "招聘项目进展" --as user --dry-run
lark-cli base +table-create --base-token <BASE_TOKEN> --name "岗位库" --as user --dry-run
lark-cli base +table-create --base-token <BASE_TOKEN> --name "人才库" --as user --dry-run

# 6. 补齐字段（详见 references/workflow.md 和 references/resources.md）
```

### 数据录入与更新

```bash
# 1. 获取数据表与字段结构
lark-cli base +table-list --base-token <BASE_TOKEN> --as user
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id <TABLE_ID_OR_NAME> --as user

# 2. 创建记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id <TABLE_ID_OR_NAME> \
  --json '{"字段名":"值"}' \
  --as user \
  --dry-run

# 3. 更新记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id <TABLE_ID_OR_NAME> \
  --record-id <RECORD_ID> \
  --json '{"字段名":"新值"}' \
  --as user \
  --dry-run
```

### 推荐报告与飞书文档

```bash
# 搜索文档
lark-cli docs +search --query "候选人姓名 岗位名称 推荐报告" --as user

# 创建文档
lark-cli docs +create \
  --title "候选人推荐报告" \
  --markdown "## 候选人概况" \
  --as user

# 更新文档
lark-cli docs +update \
  --doc <DOC_ID_OR_URL> \
  --mode append \
  --markdown "## 更新内容" \
  --as user

# 获取文档内容
lark-cli docs +fetch --doc <DOC_ID_OR_URL> --as user
```

### 会议纪要与妙记

```bash
# 查询会议纪要产物（总结、待办、章节、逐字稿）
lark-cli vc +notes --minute-tokens <MINUTE_TOKEN> --as user

# 只看妙记基础元信息
lark-cli minutes minutes get --params '{"minute_token":"<MINUTE_TOKEN>"}' --as user
```

## 关键数据格式

写 `+record-upsert` 的 `--json` 时遵循 `lark-base` 值格式：

- 文本字段：`"字段名": "值"`
- 单选字段：`"状态": "进行中"`
- 数字字段：`"招聘人数": 3`
- 日期字段：`"日期": "2026-03-29 10:00:00"`
- 链接字段：`"推荐报告": {"text":"推荐报告","link":"https://..."}`
- 附件字段：先用 `+record-upload-attachment`

## 详细参考

- [初始化 Workflow](./references/workflow.md) — 数据站初始化流程
- [操作流程](./references/operations.md) — 录入、查询、更新、文档、会议纪要流程
- [字段定义](./references/resources.md) — 表格结构、字段类型与字段创建建议
- [共享飞书规范](../LARK-CLI-FEISHU-GUIDE.md) — 认证、身份、dry-run、token 处理

## 注意事项

- Base 写操作前，必须先获取真实字段结构
- 文档创建与更新优先使用 `docs +create`、`docs +update`
- 会议纪要内容优先使用 `vc +notes`，妙记基础信息使用 `minutes get`
- 用户若提供的是 `/wiki/...` 链接，不要直接当 `doc_id` 或 `base-token` 使用，先按 `lark-doc` 或 `lark-base` 的 wiki 规则解析

---
name: headhunter-search-report
description: 生成猎头岗位分析报告并同步到飞书文档和岗位库；当用户需要生成岗位解析报告、寻访报告、职位分析报告、人才搜寻方案时使用。
dependency:
  system:
    - lark-cli
---

# 岗位分析报告生成 Skill

生成猎头岗位深度分析报告，写入飞书在线文档，并同步到岗位库。当前所有飞书交互统一通过 `lark-cli` 完成。

## 先读规则

执行前先读取：

1. [../LARK-CLI-FEISHU-GUIDE.md](../LARK-CLI-FEISHU-GUIDE.md)
2. [../lark-cli/cli/skills/lark-shared/SKILL.md](../lark-cli/cli/skills/lark-shared/SKILL.md)
3. [../lark-cli/cli/skills/lark-base/SKILL.md](../lark-cli/cli/skills/lark-base/SKILL.md)
4. [../lark-cli/cli/skills/lark-doc/SKILL.md](../lark-cli/cli/skills/lark-doc/SKILL.md)
5. [../headhunter-table-manage/SKILL.md](../headhunter-table-manage/SKILL.md)
6. [../headhunter_shared/contracts/job-contract.md](../headhunter_shared/contracts/job-contract.md)
7. [../headhunter_shared/integration/skill-api.md](../headhunter_shared/integration/skill-api.md)

## 严格禁止

- 禁止使用 `lark-cli` 之外的方式操作飞书文档
- 禁止编造 `base-token`、`record_id`、`doc_id`
- 禁止在步骤 3 完成后停止，必须继续写岗位库和飞书文档
- 禁止跳过任何步骤
- 禁止将报告原文直接输出给用户，报告内容只能写入本地文件和飞书文档

## 任务完成的唯一标准

**本 Skill 的任务在且仅在最终输出完飞书文档链接和岗位库链接后才算完成。**

## 核心工作流

```bash
# 1. 读取报告模板 references/report-template.md（必须）
# 2. 收集用户提供的职位信息（公司、行业、职位名称、职位描述等）
# 3. 按五维分析框架生成报告，保存到：
#    output/{公司名称}-{职位名称}-岗位解析报告.md
#    ⚠️ 后续写文档必须直接读取这个文件，不得重新生成第二份内容

# 4. 保存岗位到岗位库
#    按 references/skill-context.md 的字段映射组织记录数据
#    通过更新后的 headhunter-table-manage / lark-cli base 流程写入

# 5. 创建飞书在线文档
#    文档标题严格为：{公司名称}-{职位名称}-岗位解析报告
lark-cli docs +create \
  --title "{公司名称}-{职位名称}-岗位解析报告" \
  --markdown "<读取本地 md 后得到的正文>" \
  --as user

# 6. 如果正文过长，使用 append 分段写入
lark-cli docs +update \
  --doc <DOC_ID_OR_URL> \
  --mode append \
  --markdown "<追加内容>" \
  --as user

# 7. 回填岗位库记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id "岗位库" \
  --record-id <RECORD_ID> \
  --json '{"岗位分析链接":{"text":"{公司名称}-{职位名称}-岗位解析报告","link":"<DOC_URL>"},"寻访关键字":"<关键词>"}' \
  --as user \
  --dry-run

# 8. 输出概括和链接
# 1. 飞书文档地址：[{公司名称}-{职位名称}-岗位解析报告](<DOC_URL>)
# 2. 多维表格地址：[岗位库](<BITABLE_URL>)
```

## 上下文传递表

| 操作 | 从返回中提取 | 用于 |
|------|------------|------|
| 飞书文档操作 | `doc_id`、`doc_url` | 回填岗位链接与最终输出 |
| 岗位库写入 | `base_token`、`record_id` | 回填记录与拼接 Base 链接 |

## 错误处理

1. `lark-cli` 报错：重试一次，仍失败则报告给用户
2. 岗位库写入出错：按 `headhunter-table-manage` 的错误处理规则执行
3. 内容写入截断：改为 `docs +update --mode append` 分段追加

## 详细参考

- [references/report-template.md](./references/report-template.md) -- 五维分析框架模板
- [references/skill-context.md](./references/skill-context.md) -- 五维框架详情、岗位库字段映射、格式检查规则
- [references/doc-workflow.md](./references/doc-workflow.md) -- 飞书文档写入规范
- [../headhunter-table-manage/SKILL.md](../headhunter-table-manage/SKILL.md) -- 多维表格操作

# 猎头 Skills 的 lark-cli 飞书规范

适用于当前项目中所有通过 `lark-cli` 操作飞书的猎头 skill。

## 使用原则

1. 业务 skill 只负责编排猎头流程，不再自行封装飞书 HTTP 请求。
2. 所有飞书操作优先使用 `lark-cli` 的现成 skill 和 shortcut。
3. 写入或删除前，必须确认用户意图；能先预演时先用 `--dry-run`。
4. 不猜测 `base-token`、`table-id`、`record-id`、`doc_id`、`minute_token`、字段名或选项名。
5. 写记录前先读结构；写文档前先确认文档 token 或 URL。

## 首次准备

首次使用 `lark-cli` 时，先按 [lark-shared](./lark-cli/cli/skills/lark-shared/SKILL.md) 完成配置与认证：

```bash
lark-cli config init --new
lark-cli auth login --domain base,docs,vc,minutes,drive
lark-cli auth status
```

如果只是补充缺失权限，按业务域或精确 scope 增量授权：

```bash
lark-cli auth login --domain base
lark-cli auth login --scope "minutes:minutes:readonly"
```

## 身份选择

- 默认优先使用 `--as user` 处理猎头工作台、推荐报告、岗位分析、会议纪要等用户资源。
- 只有明确需要应用身份时才使用 `--as bot`。
- 若遇到权限不足，先看 [lark-shared](./lark-cli/cli/skills/lark-shared/SKILL.md) 的身份与 scope 规则，再决定补授权还是切换身份。

## 常用能力映射

| 场景 | 优先技能 | 常用命令 |
|------|----------|----------|
| Base/多维表格 | [lark-base](./lark-cli/cli/skills/lark-base/SKILL.md) | `+base-create` `+table-create` `+field-list` `+field-create` `+record-list` `+record-upsert` |
| 飞书文档 | [lark-doc](./lark-cli/cli/skills/lark-doc/SKILL.md) | `+search` `+create` `+fetch` `+update` |
| 会议记录/纪要产物 | [lark-vc](./lark-cli/cli/skills/lark-vc/SKILL.md) | `+search` `+notes` |
| 妙记基础信息 | [lark-minutes](./lark-cli/cli/skills/lark-minutes/SKILL.md) | `minutes minutes get` |
| 文档元数据/权限/上传 | [lark-drive](./lark-cli/cli/skills/lark-drive/SKILL.md) | `metas batch_query` `permission.members.create` `+upload` |

## 执行纪律

### Base

1. 先用 `+table-list`、`+table-get`、`+field-list` 获取真实结构。
2. 再用 `+field-create` 或 `+record-upsert` 写入。
3. `+record-list`、`+field-list`、`+table-list` 必须串行执行，不要并发。

示例：

```bash
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "岗位库" --as user
lark-cli base +record-upsert --base-token <BASE_TOKEN> --table-id "岗位库" --json '{"岗位名称":"高级工程师"}' --as user --dry-run
```

### Docs

1. 搜索文档优先用 `docs +search`。
2. 新建文档优先用 `docs +create`。
3. 更新已有文档优先用 `docs +update`，避免自行拼接底层 API。
4. 长文档优先先创建，再用 `--mode append` 分段追加。

### VC / Minutes

1. 查询会议纪要内容、逐字稿、总结、待办、章节，优先用 `lark-cli vc +notes`。
2. 只看妙记标题、时长、封面等元信息时，用 `lark-cli minutes minutes get`。

## Token 处理

- Base 链接：`https://xxx.feishu.cn/base/<base-token>` 中的最后一段是 `base-token`。
- Doc 链接：`https://xxx.feishu.cn/docx/<doc_id>` 中的最后一段是 `doc_id`。
- Minutes 链接：`https://xxx.feishu.cn/minutes/<minute_token>` 中的最后一段是 `minute_token`。
- Wiki 链接不能直接当 `doc_id` 或 `base-token` 用，必须先按 [lark-doc](./lark-cli/cli/skills/lark-doc/SKILL.md) 或 [lark-base](./lark-cli/cli/skills/lark-base/SKILL.md) 的 wiki 规则解析真实 `obj_token`。

## 写入前检查

- 写 Base 记录前，先跑 `+field-list`。
- 创建或更新文档前，确认标题、目标 token、写入模式。
- 写入可能有副作用的命令时，优先加 `--dry-run`。
- 返回用户时只输出业务结果，不暴露底层命令细节。

## 错误处理

- 缺少 scope：按 [lark-shared](./lark-cli/cli/skills/lark-shared/SKILL.md) 增量授权。
- `base-token` 无效：先检查是否把 wiki token 当成了 base token。
- 字段不存在或类型不匹配：重新执行 `+field-list`，按真实字段和类型重建 JSON。
- 文档写入过长：改成 `docs +create` 后配合 `docs +update --mode append` 分段写入。

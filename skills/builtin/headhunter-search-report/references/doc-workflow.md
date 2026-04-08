# 飞书在线文档操作详细规范

当前文档写入统一通过 `lark-cli docs +create` 与 `lark-cli docs +update` 执行。

## 步骤 1：准备正文

⚠️ 必须直接读取主 Skill [../SKILL.md](../SKILL.md) 中步骤 3 已保存的本地 md 文件 `output/{公司名称}-{职位名称}-岗位解析报告.md`。  
⚠️ 禁止重新生成第二份报告内容。  
⚠️ 文档标题严格为 `{公司名称}-{职位名称}-岗位解析报告`，连字符 `-` 前后禁止有空格。  
⚠️ 正文不要重复写与标题相同的一级标题。

## 步骤 2：创建文档

```bash
lark-cli docs +create \
  --title "{公司名称}-{职位名称}-岗位解析报告" \
  --markdown "<从本地 md 读取并去掉重复标题后的正文>" \
  --as user
```

从返回值中提取：

- `doc_id`
- `doc_url`

## 步骤 3：内容过长时分段追加

若内容过长导致单次写入不完整，可先创建正文首段，再追加剩余内容：

```bash
lark-cli docs +update \
  --doc <DOC_ID_OR_URL> \
  --mode append \
  --markdown "<追加段落>" \
  --as user
```

## 上下文传递

| 操作 | 从返回中提取 | 用于 |
|------|------------|------|
| `docs +create` | `doc_id` | 后续 `docs +update` |
| `docs +create` | `doc_url` | 最终输出与岗位库回填 |
| `docs +update` | `doc_id` | 追加写入时继续使用 |

## 注意事项

- 文档内容使用 Lark-flavored Markdown
- 禁止编造 `doc_id`
- 飞书文档 URL 常见格式：`https://xxx.feishu.cn/docx/<DOC_ID>`

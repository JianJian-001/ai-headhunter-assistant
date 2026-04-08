# 数据操作流程

## 前置检查

所有数据操作前先确认：

1. 已按 [workflow.md](./workflow.md) 初始化或定位到 `base_token`
2. 已拿到目标 `table_id` 或真实表名
3. 已执行过对应表的 `+field-list`

## 招聘项目进展数据录入

数据写入「招聘项目进展」数据表，记录候选人应聘某岗位的推荐情况。

```bash
# 1. 获取数据表和字段结构
lark-cli base +table-list --base-token <BASE_TOKEN> --as user
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "招聘项目进展" --as user

# 2. 写入前如需查重，先串行读取记录
lark-cli base +record-list --base-token <BASE_TOKEN> --table-id "招聘项目进展" --as user

# 3. 创建记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id "招聘项目进展" \
  --json '{"姓名":"张三","电话":"13800138000","岗位名称":"高级工程师"}' \
  --as user \
  --dry-run
```

## 岗位数据录入

数据写入「岗位库」数据表。

```bash
# 1. 读取字段与现有记录
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "岗位库" --as user
lark-cli base +record-list --base-token <BASE_TOKEN> --table-id "岗位库" --as user

# 2. 比对「岗位名称」+「所属公司」是否重复

# 3. 新建或更新记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id "岗位库" \
  --json '{"岗位名称":"高级工程师","所属公司":"XX公司"}' \
  --as user \
  --dry-run
```

## 人才库数据录入

数据写入「人才库」数据表，存储人才储备信息。

```bash
# 1. 读取字段与现有记录
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "人才库" --as user
lark-cli base +record-list --base-token <BASE_TOKEN> --table-id "人才库" --as user

# 2. 比对「候选人电话」是否重复

# 3. 创建记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id "人才库" \
  --json '{"姓名":"李四","候选人电话":"13900139000"}' \
  --as user \
  --dry-run
```

## 数据查询

```bash
lark-cli base +record-list --base-token <BASE_TOKEN> --table-id <TABLE_ID_OR_NAME> --as user
```

## 推荐报告文档

用于生成、更新和检索候选人推荐报告等猎头业务文档。

```bash
# 搜索文档
lark-cli docs +search --query "候选人姓名 岗位名称 推荐报告" --as user

# 创建文档
lark-cli docs +create \
  --title "候选人推荐报告" \
  --markdown "## 候选人概况" \
  --as user

# 追加更新
lark-cli docs +update \
  --doc <DOC_ID_OR_URL> \
  --mode append \
  --markdown "## 更新后的内容" \
  --as user

# 读取内容
lark-cli docs +fetch --doc <DOC_ID_OR_URL> --as user
```

## 会议纪要与妙记

```bash
# 纪要产物
lark-cli vc +notes --minute-tokens <MINUTE_TOKEN> --as user

# 妙记元信息
lark-cli minutes minutes get --params '{"minute_token":"<MINUTE_TOKEN>"}' --as user
```

## 数据更新

```bash
# 1. 先确认字段和目标记录
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id <TABLE_ID_OR_NAME> --as user
lark-cli base +record-list --base-token <BASE_TOKEN> --table-id <TABLE_ID_OR_NAME> --as user

# 2. 更新记录
lark-cli base +record-upsert \
  --base-token <BASE_TOKEN> \
  --table-id <TABLE_ID_OR_NAME> \
  --record-id <RECORD_ID> \
  --json '{"推荐进展":"面试"}' \
  --as user \
  --dry-run
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 数据重复录入 | 先读现有记录，再让用户决定更新或跳过 |
| 用户输入模糊 | 主动询问，不猜测 |
| 字段不存在 | 重新执行 `+field-list`，按真实字段重建 JSON |
| `base-token` 无效 | 检查是否误用了 wiki token 或错误链接 |
| 写入或权限错误 | 展示真实错误信息，不猜测重试 |

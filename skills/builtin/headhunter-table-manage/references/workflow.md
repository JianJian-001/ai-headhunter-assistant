# 猎头工作站数据初始化 Workflow

## 概述

本 Workflow 用于初始化「一人猎头数据站」，资源目标如下：

| 资源类型 | 名称 | 说明 |
|----------|------|------|
| 多维表格 | 一人猎头数据站 | 数据表容器 |
| 数据表 | 招聘项目进展 | 候选人进度记录 |
| 数据表 | 岗位库 | 职位/JD 记录 |
| 数据表 | 人才库 | 人才储备记录 |

当前初始化流程统一基于 `lark-cli`。执行前先读：

1. [../../LARK-CLI-FEISHU-GUIDE.md](../../LARK-CLI-FEISHU-GUIDE.md)
2. [../../lark-cli/cli/skills/lark-shared/SKILL.md](../../lark-cli/cli/skills/lark-shared/SKILL.md)
3. [../../lark-cli/cli/skills/lark-base/SKILL.md](../../lark-cli/cli/skills/lark-base/SKILL.md)

## 前置条件

- 已完成 `lark-cli config init --new`
- 已完成 `lark-cli auth login --domain base,docs,vc,minutes,drive`
- 当前默认使用 `--as user`
- 如果本次只做 Base 初始化，`base,docs` 已足够；若要继续读取会议纪要或妙记，必须补齐 `vc,minutes`
- 如果后续会写附件字段或上传文件，必须补齐 `drive`

## 执行步骤

### Step 1: 定位或创建 Base

**目标**：确保存在「一人猎头数据站」

```bash
# 1. 如用户已提供 Base 链接，直接提取 <BASE_TOKEN>

# 2. 如未提供，先按名称搜索已有资源
lark-cli docs +search --query "一人猎头数据站" --as user

# 3. 如搜索结果无法确认 Base，要求用户提供 Base 链接或已知 <BASE_TOKEN>

# 4. 若不存在，则创建 Base
lark-cli base +base-create --name "一人猎头数据站" --as user --dry-run
lark-cli base +base-create --name "一人猎头数据站" --as user
```

### Step 2: 检查或创建数据表

**目标**：确保三张数据表存在且结构完整

```bash
# 1. 读取表结构
lark-cli base +table-list --base-token <BASE_TOKEN> --as user

# 2. 创建缺失的数据表
lark-cli base +table-create --base-token <BASE_TOKEN> --name "招聘项目进展" --as user --dry-run
lark-cli base +table-create --base-token <BASE_TOKEN> --name "岗位库" --as user --dry-run
lark-cli base +table-create --base-token <BASE_TOKEN> --name "人才库" --as user --dry-run
```

### Step 3: 补齐字段

**目标**：按 [resources.md](./resources.md) 的定义补齐字段

```bash
# 1. 串行读取字段结构
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "招聘项目进展" --as user
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "岗位库" --as user
lark-cli base +field-list --base-token <BASE_TOKEN> --table-id "人才库" --as user

# 2. 按字段定义逐个创建缺失字段
lark-cli base +field-create \
  --base-token <BASE_TOKEN> \
  --table-id "岗位库" \
  --json '{"name":"薪资范围","type":"text"}' \
  --as user \
  --dry-run
```

## 字段处理原则

- 创建字段前必须先跑 `+field-list`
- `+field-list` 必须串行执行
- 只创建缺失字段，不重建已存在字段
- 单选字段的可选项要与真实业务值保持一致

## 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 搜索不到 Base | 创建新的 Base |
| `base-token` 无效 | 优先检查是否把 wiki token 当成了 base token |
| 创建表失败 | 记录失败表名，继续核对其他表，最后汇总 |
| 字段创建失败 | 报告失败字段名，重新核对字段 JSON 与选项值 |

## 完成后输出

初始化完成后，向用户返回：

- Base 名称
- Base token
- Base 链接
- 三张数据表名称与对应 ID

## 状态变量

| 变量 | 类型 | 用途 |
|------|------|------|
| `base_token` | string | 一人猎头数据站 token |
| `table_ids` | dict | 三张数据表的 ID 映射 |

## 字段定义参考

详细字段定义请参考：[resources.md](./resources.md)

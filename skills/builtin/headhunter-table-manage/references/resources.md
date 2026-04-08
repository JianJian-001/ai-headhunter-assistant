
## 猎头工作站数据文件结构

飞书文档目录结构：
```
飞书文档根目录(ROOT)
    └── 一人猎头(folder)
           └── 一人猎头数据站(BASE)
                  ├── 招聘项目进展(TABLE)
                  ├── 岗位库(TABLE)
                  └── 人才库(TABLE)
```

文件目录和表格名称：
| 对象 | 固定名称 | 说明 |
|------|----------|------|
| 飞书文档目录 (NODE) | 一人猎头 | 飞书文档文件夹 |
| 多维表格 (BASE) | 一人猎头数据站 | 所有数据表的容器 |
| 数据表 (TABLE) | 招聘项目进展 | 招聘项目进度记录表（候选人进度） |
| 数据表 (TABLE) | 岗位库 | 职位/岗位/JD 记录的数据表 |
| 数据表 (TABLE) | 人才库 | 人才储备记录的数据表 |

## 多维表格字段

**务必**按照给定的字段进行表格创建。当前字段维护统一使用 `lark-cli base +field-create`。

## 招聘项目进展

| 字段名 | 类型 | 类型描述 | 说明 |
|--------|------|----------|------|
| 岗位名称 | text | 文本 | 应聘的岗位名称 |
| 岗位类别 | singleSelect | 单选 | 市场营销类/技术支持类/职能支持类/程序开发类/产品运营类/兼职实习类 |
| 公司名称 | text | 文本 | 招聘公司名称 |
| 城市 | text | 文本 | 岗位所在城市 |
| 岗位匹配说明 | richText | 文本 | 岗位匹配说明 |
| 来源 | singleSelect | 单选 | BOSS直聘/智联招聘 |
| 推荐进展 | singleSelect | 单选 | 评估中/简历不合适/推荐/面试/offer/入职 |
| 姓名 | text | 文本 | 姓名 |
| 性别 | singleSelect | 单选 | 男/女 |
| 电话 | text | 文本 | 电话 |
| 邮箱 | text | 文本 | 邮箱 |
| 学校 | text | 文本 | 学校 |
| 上家公司 | text | 文本 | 上家公司 |
| 当前公司 | text | 文本 | 当前公司 |
| 专业 | text | 文本 | 专业 |
| 最高学历 | singleSelect | 单选 | 大专/本科/硕士/博士 |
| 简历分析 | richText | 文本 | 简历分析 |
| 语言能力分析 | text | 文本 | 语言能力分析 |
| 毕业时间 | date | 日期 | 毕业时间 |
| 推荐报告 | url | 文本 | 推荐报告 |
| 备注 | text | 文本 | 备注 |

## 岗位库

| 字段名 | 类型 | 类型描述 | 说明 |
|--------|------|----------|------|
| 岗位名称 | text | 文本 | 岗位名称 |
| 岗位类型 | singleSelect | 单选 | 技术岗/销售岗/职能岗 |
| 所属公司 | text | 文本 | 所属公司 |
| 招聘人数 | number | 数字 | 招聘人数 |
| 薪资范围 | text | 文本 | 薪资范围 |
| 招聘状态 | singleSelect | 单选 | 进行中/已关闭/待启动 |
| 招聘负责人 | text | 文本 | 招聘负责人 |
| 负责人电话 | text | 文本 | 负责人电话 |
| 负责人微信 | text | 文本 | 负责人微信 |
| 岗位分析 | richText | 富文本 | 岗位分析 |
| 岗位分析链接 | url | 链接 | 岗位分析链接 |
| 寻访关键字 | text | 文本 | 寻访关键字 |
| 备注 | text | 文本 | 备注 |

## 人才库

| 字段名 | 类型 | 类型描述 | 说明 |
|--------|------|----------|------|
| 姓名 | text | 文本 | 姓名 |
| 简历 | attachment | 图片和附件 | 简历 |
| 候选人电话 | text | 文本 | 候选人电话 |
| 候选人微信 | text | 文本 | 候选人微信 |
| 当前公司名称 | text | 文本 | 当前公司名称 |
| 当前岗位名称 | text | 文本 | 当前岗位名称 |
| 当前薪资 | text | 文本 | 当前薪资 |
| 期望薪资 | text | 文本 | 期望薪资 |
| 期望城市 | text | 文本 | 期望城市 |
| 出生年 | date | 日期 | 出生年 |
| 标签 | text | 文本 | 技能标签 |
| 沟通记录 | richText | 文本 | 沟通记录 |
| 备注 | text | 文本 | 备注 |
| 更新时间 | date | 日期 | 更新时间 |

## 候选人寻访工作流扩展字段建议

以下字段不是替换现有字段，而是为了支持 `headhunter-candidate-sourcing` 的 Top10 推荐、来源追踪和下游技能分流。

### 招聘项目进展扩展字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 候选人来源类型 | singleSelect | `web_public` / `lark_talent_base` / `resume_folder` / `wechat_local` / `local_file` / `manual` |
| 候选人来源链接 | url | 公开资料链接、本地文件链接占位或飞书记录链接 |
| 来源可信度 | number | 公开来源或线索来源的可信度分值 |
| 匹配分 | number | 候选人与岗位的综合匹配分 |
| 匹配理由 | text | Top3 匹配依据摘要 |
| 风险提示 | text | 主要风险提示 |
| 下一步技能 | singleSelect | `headhunter-table-manage` / `headhunter-outreach-message` / `headhunter-greeting-skill` / `headhunter-candidate-report` / `headhunter-client-nurture` / `headhunter-cv-jd-matching` |
| 寻访批次 | text | 本轮寻访任务或批次标识 |

### 人才库扩展字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 候选人来源类型 | singleSelect | 便于区分人才沉淀来源 |
| 候选人来源链接 | url | 原始候选人资料链接 |
| 来源可信度 | number | 原始来源可信度分值 |
| 匹配分 | number | 最近一次与岗位的综合匹配分 |
| 匹配理由 | text | 当前岗位下的匹配依据摘要 |
| 风险提示 | text | 候选人信息风险 |
| 下一步技能 | singleSelect | 推荐下游技能，可包含 `headhunter-table-manage` 作为仅入库待处理状态 |
| 最近联系时间 | date | 用于后续 `headhunter-greeting-skill` 或客户推进判断 |

### 岗位库扩展字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Top10 候选人链接 | url | Top10 推荐结果文档链接 |
| 最近寻访时间 | date | 最近一次执行候选人寻访的时间 |
| 寻访批次 | text | 当前岗位对应的寻访任务标识 |
| 任务队列摘要 | text | 供下游技能消费的任务化摘要 |

## 字段类型速查

| 类型 | 用途 |
|------|------|
| text | 文本内容 |
| number | 数值 |
| select | 选择字段，需配合 `multiple: false/true` 区分单选或多选 |
| telephone | 电话 |
| date | 日期 |
| richText | 富文本 |
| url | 链接 |
| attachment | 图片和附件 |

## `lark-cli` 字段创建建议

项目内常用的 `lark-cli base +field-create --json` 类型映射如下：

| 业务类型描述 | `lark-cli` 类型 | 说明 |
|------|------|------|
| text | `text` | 普通文本 |
| number | `number` | 数值 |
| singleSelect | `select` | 需补 `multiple: false` 与 `options` |
| multipleSelect | `select` | 需补 `multiple: true` 与 `options` |
| date | `date` | 日期或时间 |
| richText | `text` | 当前项目内默认按正文文本写入 |
| url | `url` | 适用于报告链接 |
| attachment | `attachment` | 写入时需走 `+record-upload-attachment` |

### 示例：文本字段

```bash
lark-cli base +field-create \
  --base-token <BASE_TOKEN> \
  --table-id "岗位库" \
  --json '{"name":"岗位名称","type":"text"}' \
  --as user \
  --dry-run
```

### 示例：单选字段

```bash
lark-cli base +field-create \
  --base-token <BASE_TOKEN> \
  --table-id "岗位库" \
  --json '{"name":"招聘状态","type":"select","multiple":false,"options":[{"name":"进行中","hue":"Green","lightness":"Light"},{"name":"已关闭","hue":"Red","lightness":"Light"},{"name":"待启动","hue":"Blue","lightness":"Lighter"}]}' \
  --as user \
  --dry-run
```

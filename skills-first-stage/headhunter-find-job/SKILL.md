---
name: headhunter-find-job
description: 一期招聘情报信息获取技能。基于用户提供的 JD、职位名、客户名和补充材料，在本项目内做结构化整理、要点提取和招聘情报输出，不调用远端业务系统或第三方招聘数据接口。
---

# 招聘情报信息获取

## 作用边界

这个技能只负责整理用户提供的岗位材料与招聘情报，不负责联网抓取、招聘站搜索或候选人寻访。

适用：

- 用户贴来 JD、职位名、客户名、岗位说明
- 用户上传岗位说明、组织信息、内部备注
- 用户希望把材料整理成可读的岗位情报卡

不适用：

- 需要去招聘网站抓职位
- 需要直接找候选人
- 需要输出完整做单策略

需要深度策略时转 `headhunter-search-report`。

## 标准输入

- `job_title`
- `company_name`
- `jd_text`
- 可选：`city`、`salary_range`、`business_background`、`team_notes`

更完整的字段见 [input-schema.md](./references/input-schema.md)。

## 执行流程

1. 校验岗位标题、公司名、JD 是否齐全
2. 读取 [input-schema.md](./references/input-schema.md)
3. 必要时执行 `python3 scripts/material_digest.py "<材料文件路径>"`
4. 提取职责、要求、加分项、疑点和待确认项
5. 按 [job-brief-template.md](./assets/job-brief-template.md) 输出
6. 若用户下一步要做岗位深度分析，转 `headhunter-search-report`

## 输出要求

默认输出五块：

1. 岗位概览
2. 核心职责
3. 硬性要求与加分项
4. 当前材料里的模糊点
5. 建议下一步补充的问题

## 严格禁止

1. 不调用任何远端招聘接口
2. 不编造岗位、薪资、地点、汇报关系
3. 不继续执行候选人寻访
4. 材料缺失时必须明确标注“待补充”
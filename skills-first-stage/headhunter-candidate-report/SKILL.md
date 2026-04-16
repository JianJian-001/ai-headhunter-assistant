---
name: headhunter-candidate-report
description: 一期推荐报告生成技能。结合简历、岗位 JD 和沟通纪要，在对话界面交付结构化候选人推荐报告，可按需输出本地 Markdown，不写飞书文档。
---

# 推荐报告生成

## 作用边界

这个技能一人一报告，只负责结构化推荐内容，不负责飞书写入和多人合并报告。

## 输入

- `candidate_name`
- `jd_text`
- `resume_text`
- `communication_notes`

如果缺少候选人姓名或沟通纪要，必须先追问。

## 工作流

1. 读取 [report-structure.md](./references/report-structure.md)
2. 读取 [notes-intake.md](./references/notes-intake.md)
3. 按 [recommendation-report-template.md](./assets/recommendation-report-template.md) 生成报告
4. 对话中分节交付；用户明确需要文件时，再输出 Markdown 正文

## 输出要求

1. 推荐理由
2. 基本资料
3. 教育背景
4. 工作经历
5. 项目经验
6. 其他补充说明

## 严格禁止

1. 不猜测候选人姓名
2. 不编造沟通纪要和成果
3. 不多人合并成一份报告
4. 不再走飞书、多维表格或妙记链路

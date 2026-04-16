---
name: headhunter-floating-cv
description: 一期高端候选人简历脱敏技能。基于用户提供的简历正文与脱敏约定，在对话中输出脱敏后的简历内容，只做脱敏处理，不做包装网页或寻访分析。
---

# 高端候选人简历脱敏

## 作用边界

这个技能只负责对候选人简历做脱敏处理，不负责包装页面、候选人寻访、简历匹配、风险主判断或推荐报告生成。

## 输入

- `resume_text`
- `redaction_rules`
- 可选：`must_keep_fields`

如果用户没有明确给出脱敏约定，必须先追问。

## 工作流

1. 读取 [desensitization-rules.md](./references/desensitization-rules.md)
2. 明确本次需要隐藏、泛化、保留的字段
3. 按 [redacted-resume-template.md](./assets/redacted-resume-template.md) 输出脱敏后的简历正文
4. 如存在无法判断是否应保留的信息，单独列出“待确认项”

## 输出要求

1. 本次脱敏约定摘要
2. 脱敏后的简历正文
3. 待确认项（如有）

## 严格禁止

1. 不编造原简历中不存在的任职、业绩、学校或身份信息
2. 不擅自删除用户要求保留的关键信息
3. 不输出包装网页、排版设计稿或推荐结论
4. 用户未给出脱敏范围时，不得直接开始处理

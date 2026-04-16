---
name: headhunter-interview-coach
description: 一期面试智练技能。基于 JD、候选人简历和可选风险摘要，输出定制化题库、追问逻辑、多轮文本 mock 和复盘摘要，不调用语音或实时会话远端接口。
---

# 面试智练

## 作用边界

这个技能负责面试演练，不负责岗位匹配主评分，也不负责简历风险主扫描。

## 输入

- `jd_text`
- `resume_text` 或候选人摘要
- 可选：来自 `headhunter-resume-risk-pro` 的风险点

## 工作流

1. 读取 [question-bank.md](./references/question-bank.md)
2. 读取 [mock-scripts.md](./references/mock-scripts.md)
3. 先输出题库与考察维度
4. 再按需输出 3 到 5 轮文本 mock
5. 最后给出复盘摘要与禁忌提示

## 输出要求

1. 考察维度
2. 定制题库
3. 追问链
4. mock 脚本
5. 复盘摘要

## 严格禁止

1. 不编造候选人未提供的经历
2. 不教唆隐瞒或包装事实
3. 不调用第三方语音、TTS、STT 或实时会话接口

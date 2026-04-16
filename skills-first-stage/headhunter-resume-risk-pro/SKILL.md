---
name: headhunter-resume-risk-pro
description: 一期简历风险分析技能。围绕时间线、学历真实性和履历一致性三类风险，在本项目内做规则扫描、分级、证据摘录、核验追问和顾问话术生成，不调用外部核验接口。
---

# 简历风险分析

## 作用边界

这个技能负责识别可疑点和待核实项，不替代人工定性，也不输出法律或合规终局意见。

适用：

- 标出简历中的可疑点
- 给顾问准备核验问题和解释话术
- 面试前准备尖锐问题预警

不适用：

- 直接给岗位匹配主评分
- 替代背景调查
- 联网查询工商、学信网或社保接口

## 输入

- 单份简历文本或本地文本文件
- 可选：岗位要求、客户强调项、用户提供的对照材料

## 工作流

1. 读取 [dimensions.md](./references/dimensions.md)
2. 读取 [suspicion-rules.md](./references/suspicion-rules.md)
3. 读取 [risk-levels.md](./references/risk-levels.md)
4. 执行 `python3 scripts/scan_resume_risk.py "<简历路径>"`
5. 按 [risk-report-template.md](./assets/risk-report-template.md) 组织结果
6. 需要 mock 时转 `headhunter-interview-coach`

## 输出要求

默认输出：

1. 风险等级
2. 命中可疑点
3. 每条证据片段
4. 核验追问清单
5. 顾问对内/对外话术
6. 面试前尖锐问题预防

## 严格禁止

1. 不使用“造假”“欺诈”等未经核实的定性词
2. 不调用远端核验接口
3. 证据必须能回溯到输入文本
4. 对缺失材料只能说“待核实”，不能补造

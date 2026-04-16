---
name: headhunter-cv-matching
description: 一期简历匹配分析技能。基于本地单份简历或简历文件夹与 JD 文本，在本项目内完成要点解析、匹配打分、理由说明和批量排序，不调用远端简历解析或匹配接口。
---

# 简历匹配分析

## 作用边界

这个技能只做匹配度、匹配理由和 gap 分析，不承担风险主判定和面试 mock 主流程。

适用：

- 单份简历和 JD 的匹配分析
- 批量简历初筛和排序
- 输出匹配原因、缺口和优先级建议

不适用：

- 猎聘搜人（转 `liepin-candidate-search`）
- 简历风险主分析
- 推荐报告生成

风险问题转 `headhunter-resume-risk-pro`，题库与 mock 转 `headhunter-interview-coach`。

## 输入

- 本地简历文件路径，或简历文件夹路径
- `jd_text`

支持的本地文件建议为 `txt`、`md`、`json`；若来自聊天附件，应优先使用已提取出的文本。

## 工作流

1. 读取 [matching-rules.md](./references/matching-rules.md)
2. 读取 [output-schema.md](./references/output-schema.md)
3. 单份简历执行：
   `python3 scripts/match_resume.py single "<简历路径>" "<JD 文件路径>"`
4. 批量简历执行：
   `python3 scripts/match_resume.py batch "<简历目录>" "<JD 文件路径>"`
5. 按输出 schema 组织结论
6. 若发现可疑点，建议转 `headhunter-resume-risk-pro`

## 输出要求

### 单份

1. 综合匹配分
2. 关键匹配点
3. 关键 gap
4. 推荐结论
5. 下一步建议

### 批量

1. 排序表
2. 每人一句结论
3. 建议优先沟通名单

## 严格禁止

1. 不调用远端解析或匹配 HTTP 接口
2. 不凭模型主观臆造经历事实
3. 分数必须基于规则和文本证据
4. 不把风险结论混写成匹配主评分

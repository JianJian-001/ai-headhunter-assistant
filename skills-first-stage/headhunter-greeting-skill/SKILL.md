---
name: headhunter-greeting-skill
description: 一期候选人跟进话术技能。用于候选人已建联后的持续跟进、热度判断、阶段动作建议和可直接复制的话术生成，只生成策略和文案，不执行任何实际触达。
---

# 候选人跟进话术

## 作用边界

这个技能只处理已建联候选人的后续跟进，不负责首次陌生触达，也不执行微信发送。

## 输入

- 候选人姓名、当前公司、岗位
- 最近一次互动时间、内容、渠道
- 当前推进阶段
- 可选风险信号

## 工作流

1. 读取 [nurture-playbook.md](./references/nurture-playbook.md)
2. 读取 [candidate-state-signals.md](./references/candidate-state-signals.md)
3. 按 [nurture-message-template.md](./assets/nurture-message-template.md) 输出

## 输出要求

1. 热度判断
2. 当前阶段下一步动作建议
3. 一条或多条跟进文案
4. 建议记录的信息

## 严格禁止

1. 不用于首次联系
2. 不调用微信 GUI 自动化
3. 不承诺发送结果
4. 不编造最近一次互动内容

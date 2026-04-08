---
name: headhunter-outreach-message
description: 为猎头顾问生成候选人首次触达和首轮跟进文案，并规划外部渠道触达节奏。用户提到候选人首触、加微信、打电话、发短信、发脉脉、发邮件、外部触达、首轮跟进时使用。适用于已拿到候选人简历或候选人线索、准备第一次建立联系的场景。
---

# Headhunter Outreach Message

## 作用边界

这个技能只处理`首次建立联系`与`首轮无回复跟进`。

适用：
- 拿到候选人简历后，准备第一次联系
- 需要判断先打电话、加微信、发短信还是发邮件
- 需要为不同渠道生成首触文案
- 需要设计首轮跟进节奏

不适用：
- 已经建立联系后的长期保温和关系经营
- 节日关怀、入职纪念日关怀、长期意向维护
- 客户侧关系维护

长期跟进请改用 `headhunter-greeting-skill`。

## 标准输入

- 候选人基础信息：姓名、当前公司、岗位、职级、所在地
- 岗位信息：职位名称、核心卖点、薪酬区间、业务背景
- 可用触达渠道：电话、微信、短信、邮件、脉脉、领英
- 触达限制：是否已有过往联系、是否急招、是否保密

### 来自候选人寻访链路的最小输入

如果上游来自 `headhunter-candidate-sourcing`，建议至少传入：

- `name`
- `current_company`
- `current_title`
- `location`
- `contact_channels`
- `match_score`
- `match_reasons`
- `recommended_priority`
- 岗位名称、岗位卖点、薪酬区间

当 `recommended_next_skill = headhunter-outreach-message` 时，表示该候选人仍属于新线索或未建联状态，应优先在本技能完成首次触达文案和首轮跟进节奏。

信息不足时，优先补齐：
1. 候选人当前岗位和公司
2. 目标职位卖点
3. 可用渠道

### 脚本输入字段

`scripts/channel_selector.py` 约定输入：

```json
{
  "available_channels": ["phone", "wechat", "sms", "email", "maimai", "linkedin"],
  "seniority": "senior",
  "urgent": true,
  "has_referral": false
}
```

`scripts/sequence_builder.py` 约定输入：

```json
{
  "start_date": "2026-03-26",
  "preferred_channel": "wechat"
}
```

## 输出要求

默认输出四部分：

1. 渠道建议
2. 首触文案
3. 无回复跟进文案
4. 触达节奏建议

输出时优先使用 [outreach-brief-template.md](./assets/outreach-brief-template.md)。
对外部系统，推荐以共享 candidate/handoff contract 作为本技能入参基础，而不是直接依赖上游脚本输出字段名。

## 工作流

1. 先读取 [workflow-rules.md](./references/workflow-rules.md) 明确边界和顺序
2. 再读取 [messaging-rules.md](./references/messaging-rules.md) 生成文案
3. 需要判断渠道时，执行 `python3 scripts/channel_selector.py <input.json>`
4. 需要生成节奏计划时，执行 `python3 scripts/sequence_builder.py <input.json>`
5. 按模板组织输出，确保每条文案都能直接发给候选人

## 核心原则

- 首触目标是让候选人愿意回复，不是一次性讲完全部信息
- 同一候选人的不同渠道文案要保持一致意图，但语气要适配渠道
- 电话开场比文字更短，微信和脉脉更自然，邮件更完整
- 无回复跟进必须提供新信息，不能只是重复催回复
- 不夸大岗位，不虚构薪酬，不替顾问承诺无法兑现的条件

## 默认输出结构

```markdown
## 触达建议
- 推荐渠道：
- 推荐原因：

## 首触文案
### 电话开场
...

### 微信/脉脉
...

### 邮件
...

## 跟进文案
### 第一次跟进
...

### 第二次跟进
...

## 节奏建议
- Day 0:
- Day 5:
- Day 10:
- Day 20:
```

## 参考文件

- 流程规则：[workflow-rules.md](./references/workflow-rules.md)
- 文案规则：[messaging-rules.md](./references/messaging-rules.md)
- 输出模板：[outreach-brief-template.md](./assets/outreach-brief-template.md)
- 节奏模板：[followup-sequence-template.md](./assets/followup-sequence-template.md)
- 共享候选人 contract：[../headhunter_shared/contracts/candidate-contract.md](../headhunter_shared/contracts/candidate-contract.md)
- 共享 handoff contract：[../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)

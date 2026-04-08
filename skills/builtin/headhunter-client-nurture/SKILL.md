---
name: headhunter-client-nurture
description: 为猎头顾问维护存量客户关系、识别续单与新需求信号、输出客户关怀动作和下一步建议。用户提到客户维护、客户关怀、续单、扩单、存量客户跟进、客户风险预警、客户分层时使用。
---

# Headhunter Client Nurture

## 作用边界

这个技能只处理`存量客户维护和需求挖掘`。

适用：
- 客户分层管理
- 定期关怀与沟通节奏建议
- 续单、扩单、新需求信号识别
- 客户满意度风险预警
- 输出下一步客户动作建议

不适用：
- 新客户陌拜开发
- 合同条款谈判
- 项目汇报材料生成

项目汇报材料可交给 `headhunter-client-report`。

## 标准输入

- 客户信息：公司名、行业、合作历史、联系人角色
- 当前合作状态：活跃项目数、最近一次交付、最近一次沟通时间
- 公司动态：扩编、融资、组织变化、关键人物变动
- 风险信号：沉默、反馈变差、竞对入场、回款异常、项目停滞
- 生命周期阶段：合作中、项目交付后、沉默待激活

### 来自候选人寻访链路的项目推进输入

如果上游来自 `headhunter-candidate-sourcing`，且候选人被标记为需要客户侧推进，建议补齐：

- 岗位名称、公司名称、岗位优先级
- Top10 候选人摘要或高潜候选人名单
- `match_score`
- `risk_flags`
- `needs_client_push`
- 当前客户卡点，例如反馈慢、面试安排慢、Offer 决策慢

当 `recommended_next_skill = headhunter-client-nurture` 时，表示当前问题重点已从“找到候选人”转向“推动客户动作和需求管理”。

### 脚本输入字段

`scripts/client_tier_score.py` 约定输入：

```json
{
  "annual_revenue": 300000,
  "active_roles": 3,
  "successful_placements": 2,
  "response_speed": "normal",
  "strategic_value": true
}
```

`scripts/touchpoint_scheduler.py` 约定输入：

```json
{
  "tier": "核心客户",
  "lifecycle_stage": "合作中",
  "has_new_signal": true,
  "risk_level": "中",
  "last_contact_date": "2026-03-26"
}
```

说明：

- 如果未传 `last_contact_date`，脚本默认以当天作为排期基准日

## 输出要求

默认输出四部分：

1. 客户分层结果
2. 当前关系判断
3. 推荐维护动作
4. 下一步沟通话术或议题

输出时优先使用 [client-touchpoint-template.md](./assets/client-touchpoint-template.md)。
如来自寻访链路，推荐通过共享 handoff contract 进入本技能，避免直接依赖上游脚本字段名。

## 工作流

1. 读取 [client-tiering.md](./references/client-tiering.md)
2. 读取 [demand-signals.md](./references/demand-signals.md)
3. 需要给客户打层级时，执行 `python3 scripts/client_tier_score.py <input.json>`
4. 需要安排维护动作时，执行 `python3 scripts/touchpoint_scheduler.py <input.json>`
5. 用模板输出维护建议与沟通动作

## 核心原则

- 客户维护不等于频繁打扰
- 每次联系都要有明确理由或价值输出
- 关系维护和需求挖掘要同时兼顾
- 风险客户优先处理，沉默客户要尽早识别
- 对客户不能虚构市场信息和候选人供给情况

## 默认输出结构

```markdown
## 客户状态
- 客户层级：
- 当前合作温度：
- 风险等级：

## 维护建议
- 推荐动作：
- 推荐时间：
- 推荐切入点：

## 沟通建议
...

## 后续记录
- 本次应记录：
- 下次应关注：
```

## 参考文件

- 客户分层：[client-tiering.md](./references/client-tiering.md)
- 需求与风险信号：[demand-signals.md](./references/demand-signals.md)
- 维护模板：[client-touchpoint-template.md](./assets/client-touchpoint-template.md)
- 复盘模板：[client-review-template.md](./assets/client-review-template.md)
- 共享 handoff contract：[../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)
- 技能边界对照：[../headhunter_shared/references/skill-inventory.md](../headhunter_shared/references/skill-inventory.md)

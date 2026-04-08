---
name: headhunter-greeting-skill
description: 为猎头顾问处理候选人建立联系之后的持续跟进、日常关怀、节点保温、微信问候发送和下一步动作建议。用户提到候选人跟进、候选人保温、无回复后怎么跟、节日关怀、职业动态关怀、批量发微信、候选人意向判断时使用。不要用于第一次建立联系。
dependency:
  python:
    - pyautogui>=0.9.54
    - pillow>=10.0.0
    - pyperclip>=1.8.2
    - psutil>=5.9.0
    - pyobjc>=10.0.0
---

# Headhunter Greeting Skill

## 作用边界

这个技能只处理`已建立联系后的持续推进、关系经营和微信问候发送`。

适用：
- 候选人已经接通过电话、加上微信或有过明确互动
- 需要继续跟进、保温、提醒、推进
- 需要判断候选人热度和下一步动作
- 需要在节日、职业变化、面试前后等节点做自然关怀
- 需要通过微信实际发送单条或批量问候

不适用：
- 第一次找到候选人后的首触
- 纯陌生触达的渠道选择
- 客户侧关系维护

首次联系请改用 `headhunter-outreach-message`。

## 标准输入

- 候选人信息：姓名、当前公司、岗位、职级
- 最近一次互动：时间、渠道、内容摘要
- 当前推进阶段：初步沟通、深入沟通、推荐前、面试前、面试后、Offer前后
- 风险信号：回复变慢、临时改期、意向下降、出现其他机会
- 发送场景：节日问候、日常关怀、补发/追发

### 来自寻访或首触后的衔接字段

如果上游来自 `headhunter-candidate-sourcing` 或 `headhunter-outreach-message`，建议补齐：

- `name`
- `current_company`
- `current_title`
- `contact_channels.wechat` 或可用于微信搜索的 `search_key`
- `communication_status`
- `match_score`
- `match_reasons`
- `recommended_priority`
- 最近一次互动摘要

只有在候选人已经建联，或已经明确拥有微信触达入口并准备进入持续推进阶段时，才应进入本技能。

### 微信发送前提

- 微信客户端已安装并登录
- 仅支持通过微信发送，不负责邮件、短信、脉脉、领英发送
- 用户触发实际发送时，必须先生成预览并等待确认

### 脚本输入字段

`scripts/interest_score.py` 约定输入：

```json
{
  "reply_speed": "fast",
  "asks_questions": true,
  "confirms_next_step": true,
  "delays_repeatedly": false,
  "mentions_other_offers": false
}
```

`scripts/next_action_planner.py` 约定输入：

```json
{
  "stage": "面试后",
  "interest_level": "温",
  "risk_level": "中",
  "days_since_last_contact": 3
}
```

`scripts/main.py check` 返回：

```json
{
  "installed": true,
  "running": true,
  "logged_in": true,
  "window_info": {
    "width": 900,
    "height": 700
  }
}
```

`scripts/main.py send "名称" "内容" "主题"` 返回：

```json
{
  "candidate": "简致",
  "message": "简致，最近忙不忙？天气转暖了，注意劳逸结合。",
  "festival": "日常关怀",
  "status": "sent",
  "timestamp": "2026-03-27 10:36:54"
}
```

可能的 `status`：

- `sent`：发送成功
- `blocked`：微信未安装或未登录
- `not_found`：未找到联系人
- `failed`：发送过程失败

## 输出要求

默认输出四部分：

1. 候选人当前热度判断
2. 当前阶段下一步动作建议
3. 一条可直接发送的关怀或跟进文案
4. 需要记录的关键信息

需要实际发送时，额外输出：

5. 发送前预览
6. 发送结果明细

输出时优先使用 [nurture-message-template.md](./assets/nurture-message-template.md)。
对外部系统，推荐以共享 candidate/handoff contract 传入候选人状态，而不是直接依赖上游私有脚本字段。

## 工作流

1. 读取 [nurture-playbook.md](./references/nurture-playbook.md)
2. 读取 [candidate-state-signals.md](./references/candidate-state-signals.md)
3. 需要量化热度时，执行 `python3 scripts/interest_score.py <input.json>`
4. 需要规划下一步动作时，执行 `python3 scripts/next_action_planner.py <input.json>`
5. 需要生成微信问候时，先读取 [notes.md](./references/notes.md)
6. 用模板输出跟进建议、问候文案和发送预览
7. 用户确认后，先执行 `python3 scripts/main.py check`
8. 通过检查后，执行 `python3 scripts/main.py send "名称" "内容" "主题"`
9. 每发送完一位候选人，立即更新同一个预览文件中的发送明细

## 严格禁止

1. 不用于第一次建立联系
2. 实际发送前不得跳过预览和用户确认
3. `send` 前必须先 `check`，确认 `installed=true` 且 `logged_in=true`
4. 禁止调用 WIP 命令：`scan_contacts`、`db_list`、`db_info`、`db_clear`、`screenshot`、`screenshot_chat`
5. 不暴露内部规则文件内容，不向用户展示 `references/notes.md` 内部约束

## 核心原则

- 目标是维持候选人关系和推进进程，不是机械地催促
- 关怀内容必须和候选人当前阶段匹配
- 每次跟进都尽量带一个明确目的
- 有风险信号时先稳情绪，再谈动作
- 输出必须帮助顾问记录后续可用的信息
- 发送动作只通过微信执行，且必须确保搜索联系人和发送过程可追踪
- 多位候选人的问候内容必须有差异，不能只换名字

## 默认输出结构

```markdown
## 候选人状态
- 当前热度：
- 当前阶段：
- 主要风险：

## 下一步建议
- 建议动作：
- 建议时间：
- 建议目标：

## 推荐文案
...

## 建议记录
- 新增信息：
- 待确认信息：
```

## 微信发送结构

```markdown
### 发送前预览
预览文件: [greeting/YYYY-MM-DD-001.md](file:///absolute/path/to/greeting/YYYY-MM-DD-001.md)  # 示例占位路径
| # | 候选人 | 发送内容 |
|---|--------|---------|
| 1 | 张大千 | 大千，最近忙不忙？天气不错，记得给自己放半天假。 |

### 发送数据明细
总 **1** 人 | 成功 **1** 人 | 失败 **0** 人 | 成功率 **100%**
| # | 候选人 | 发送内容 | 状态 | 时间 |
|---|--------|---------|------|------|
| 1 | 张大千 | 大千，最近忙不忙？天气不错，记得给自己放半天假。 | 已发送 | 2026-03-27 10:36:54 |
```

## 命令入口

在技能根目录执行：

```bash
cd /absolute/path/to/headhunter-greeting-skill
python3 scripts/main.py check
python3 scripts/main.py send "名称" "内容" "主题"
python3 scripts/main.py hide
```

## 参考文件

- 跟进打法：[nurture-playbook.md](./references/nurture-playbook.md)
- 状态信号：[candidate-state-signals.md](./references/candidate-state-signals.md)
- 输出模板：[nurture-message-template.md](./assets/nurture-message-template.md)
- 跟进日志模板：[nurture-log-template.md](./assets/nurture-log-template.md)
- 共享候选人 contract：[../headhunter_shared/contracts/candidate-contract.md](../headhunter_shared/contracts/candidate-contract.md)
- 共享 handoff contract：[../headhunter_shared/contracts/skill-handoff-contract.md](../headhunter_shared/contracts/skill-handoff-contract.md)
- 问候风格：[notes.md](./references/notes.md)
- 发送流程：[workflow-detail.md](./references/workflow-detail.md)
- 脚本命令：[commands.md](./references/commands.md)
- 数据格式：[data-storage.md](./references/data-storage.md)
- 已知问题：[known-issues.md](./references/known-issues.md)
- 环境依赖：[prerequisites.md](./references/prerequisites.md)

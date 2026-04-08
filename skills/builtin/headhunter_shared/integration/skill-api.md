# Skills API 对接约定

这个文档给前后端、算法服务和外部编排层使用。目标是：外部系统只调用 `headhunter-*` skill，不直接依赖脚本路径。

## 调用原则

- 只通过 skill 名选择能力
- 输入输出遵循共享 contract
- 不直接引用 `scripts/*.py`、`scripts/*.js` 路径
- 不把 `lark-cli`、Playwright、微信自动化细节暴露给外部系统

## 稳定 skill 名

- `headhunter-find-job`
- `headhunter-search-report`
- `headhunter-candidate-sourcing`
- `headhunter-cv-jd-matching`
- `headhunter-outreach-message`
- `headhunter-greeting-skill`
- `headhunter-candidate-report`
- `headhunter-client-nurture`
- `headhunter-table-manage`
- `headhunter-chat`

## 推荐输入对象

| 对象 | 参考文档 |
|------|----------|
| `job` | `../contracts/job-contract.md` |
| `candidate` | `../contracts/candidate-contract.md` |
| `task_queue` / `task_payload` | `../contracts/skill-handoff-contract.md` |

## 推荐调用方式

### 1. 上游获取岗位

- 调用 `headhunter-find-job`
- 返回岗位列表后，映射到 `job` contract

### 2. 岗位分析

- 调用 `headhunter-search-report`
- 返回岗位分析、寻访关键字、岗位库链接

### 3. 候选人寻访

- 调用 `headhunter-candidate-sourcing`
- 返回 `top_candidates`、`task_queue`、`handoffs`

### 4. 下游分发

- `target_skill = headhunter-outreach-message`
- `target_skill = headhunter-greeting-skill`
- `target_skill = headhunter-candidate-report`
- `target_skill = headhunter-client-nurture`
- `target_skill = headhunter-cv-jd-matching`

### 5. 飞书写入

- 统一通过 `headhunter-table-manage`
- 外部只传业务字段，不直连 `lark-cli`

## 不建议的对接方式

- 前后端直接执行仓库里的 Python/Node 脚本
- 外部系统自己拼接 `lark-cli` 命令
- 外部系统使用 skill 私有字段名代替共享 contract

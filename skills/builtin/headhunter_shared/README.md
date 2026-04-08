# Headhunter Shared

这个目录是猎头 Skills 的共享底座，只放两类内容：

1. 共享 contract
2. 共享 runtime

目标：

- 对外让前后端、算法、自动化编排只感知 `headhunter-*` skills
- 对内沉淀重复出现的结构定义、脚本逻辑和平台适配规则

目录约定：

- `references/`：技能边界和能力盘点
- `contracts/`：统一输入输出结构
- `integration/`：给外部系统调用 skills 的约定
- `python/`：Python 共享 runtime

原则：

- 不替代业务 skill
- 不直接承接用户意图
- 只解决多 skill 复用的问题

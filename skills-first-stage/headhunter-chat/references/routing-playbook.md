# 一期路由手册

## 典型意图映射

| 用户意图 | 进入技能 |
|---|---|
| “帮我整理这个 JD”“看看这个岗位是什么情况” | `headhunter-find-job` |
| “在猎聘上搜人”“猎聘找 Java”“导出猎聘候选人” | `liepin-candidate-search` |
| “给我一份做单秘籍”“这个职位怎么寻访” | `headhunter-search-report` |
| “这份简历匹不匹配”“帮我筛一批简历” | `headhunter-cv-matching` |
| “这份简历哪里有风险”“帮我出核验问题” | `headhunter-resume-risk-pro` |
| “给候选人出面试题”“做一轮 mock” | `headhunter-interview-coach` |
| “生成推荐报告”“写候选人报告” | `headhunter-candidate-report` |
| “把这份简历脱敏”“做匿名简历”“高端候选人简历脱敏” | `headhunter-floating-cv` |
| “候选人没回复怎么跟”“帮我写跟进话术” | `headhunter-greeting-skill` |
| “分析这家公司”“整理公司情报” | `headhunter-company-intel` |

## 澄清优先级

用户需求模糊时，优先补这几类信息：

1. 当前是岗位侧、候选人侧还是客户侧问题
2. 已有材料是什么
3. 目标交付物是什么

## 闲聊回复样式

- 简短
- 专业
- 给出下一步可执行示例
- 不输出冗长介绍

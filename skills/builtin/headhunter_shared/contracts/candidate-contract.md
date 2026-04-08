# Candidate Contract

`candidate` 是候选人统一对象，覆盖公开寻访、本地简历、平台卡片、飞书记录和手工输入。

## 标准结构

```json
{
  "candidate_id": "cand-001",
  "job_id": "job-001",
  "source_type": "web_public",
  "source_url_or_path": "https://example.com/profile",
  "source_domain": "example.com",
  "public_profile_type": "public_web_page",
  "source_credibility": 7,
  "name": "张三",
  "current_company": "某互联网公司",
  "current_title": "算法专家",
  "location": "杭州",
  "skills": ["推荐系统", "Python"],
  "seniority": "senior",
  "education": "硕士",
  "contact_channels": {
    "phone": "",
    "wechat": "",
    "email": "",
    "linkedin": "",
    "maimai": "",
    "boss": "",
    "liepin": "",
    "zhilian": ""
  },
  "resume_path_or_attachment": "",
  "evidence": ["公开资料链接"],
  "communication_status": "new_lead",
  "has_local_resume": false,
  "has_report": false,
  "needs_client_push": false,
  "notes": ""
}
```

## 来源枚举

| 值 | 说明 |
|----|------|
| `web_public` | 公开网页 |
| `boss_platform` | BOSS直聘 |
| `liepin_platform` | 猎聘 |
| `zhilian_platform` | 智联招聘 |
| `lark_talent_base` | 飞书人才库 |
| `lark_project_progress` | 飞书项目进展 |
| `resume_folder` | 本地简历 |
| `wechat_local` | 微信辅助 |
| `local_file` | 本地结构化文件 |
| `manual` | 手工输入 |

## 技能映射

- `headhunter-candidate-sourcing`：生产与消费该对象
- `headhunter-cv-jd-matching`：补充 `resume_path_or_attachment`
- `headhunter-outreach-message`：消费 `contact_channels/match_score`
- `headhunter-greeting-skill`：消费 `contact_channels.wechat/communication_status`
- `headhunter-candidate-report`：消费 `source_url_or_path/risk_flags/match_reasons`

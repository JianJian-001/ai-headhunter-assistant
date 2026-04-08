# 统一候选人结构

`headhunter-candidate-sourcing` 的核心不是单一抓取方式，而是把不同来源的候选人统一成同一个结构，方便去重、打分、分流和回写。

## 顶层结构

```json
{
  "job": {
    "job_id": "job-001",
    "job_title": "高级算法工程师",
    "company_name": "示例科技",
    "city": "杭州",
    "salary_range": "50-80K * 14",
    "must_have_skills": ["大模型", "Python", "推荐系统"],
    "nice_to_have_skills": ["广告算法", "团队管理"],
    "keywords": ["LLM", "推荐", "广告", "搜索排序"],
    "priority": "high"
  },
  "candidates": [
    {
      "candidate_id": "cand-001",
      "source_type": "lark_talent_base",
      "source_url_or_path": "https://...",
      "name": "张三",
      "current_company": "某互联网公司",
      "current_title": "算法专家",
      "location": "杭州",
      "skills": ["推荐系统", "Python", "大模型"],
      "seniority": "senior",
      "education": "硕士",
      "contact_channels": {
        "phone": "13800000000",
        "wechat": "zhangsan_ai",
        "email": "zhangsan@example.com"
      },
      "resume_path_or_attachment": "/absolute/path/to/resume.pdf",
      "evidence": [
        "飞书人才库记录",
        "GitHub 主页",
        "本地简历"
      ],
      "communication_status": "new_lead",
      "has_local_resume": true,
      "has_report": false,
      "needs_client_push": false,
      "notes": "曾聊过推荐系统方向"
    }
  ]
}
```

## 字段定义

### `job`

| 字段 | 必填 | 说明 |
|------|------|------|
| `job_id` | 建议 | 岗位唯一标识，优先使用岗位库记录 ID 或内部岗位编号 |
| `job_title` | 是 | 岗位名称 |
| `company_name` | 是 | 公司名称 |
| `city` | 否 | 工作城市 |
| `salary_range` | 否 | 薪资范围 |
| `must_have_skills` | 否 | 硬性技能要求 |
| `nice_to_have_skills` | 否 | 加分项技能 |
| `keywords` | 是 | 寻访关键字，可来自岗位库 `寻访关键字` |
| `priority` | 否 | `low` / `medium` / `high` / `urgent` |

### `candidate`

| 字段 | 必填 | 说明 |
|------|------|------|
| `candidate_id` | 建议 | 归一化后稳定标识，建议基于来源、姓名、联系方式生成 |
| `source_type` | 是 | 候选人来源 |
| `source_url_or_path` | 是 | 公开资料链接、本地文件路径或飞书记录链接 |
| `source_domain` | 否 | 当来源是公开网页时记录域名 |
| `public_profile_type` | 否 | 公开网页资料类型，如 `linkedin_profile` / `github_profile` / `company_team_page` |
| `source_credibility` | 否 | 来源可信度，建议 1-10 |
| `name` | 是 | 候选人姓名 |
| `current_company` | 否 | 当前公司 |
| `current_title` | 否 | 当前岗位/职级 |
| `location` | 否 | 当前所在地或期望城市 |
| `skills` | 否 | 技能标签列表 |
| `seniority` | 否 | `junior` / `mid` / `senior` / `lead` / `director` / `executive` |
| `education` | 否 | 最高学历 |
| `contact_channels` | 否 | 电话、微信、邮箱、领英、脉脉等 |
| `resume_path_or_attachment` | 否 | 本地简历路径或附件标识 |
| `evidence` | 是 | 支撑判断的证据列表 |
| `communication_status` | 是 | `new_lead` / `contacted` / `connected` / `interviewing` / `recommended` / `inactive` |
| `has_local_resume` | 否 | 是否已有本地简历或附件 |
| `has_report` | 否 | 是否已有推荐报告 |
| `needs_client_push` | 否 | 是否需要客户侧推进 |
| `notes` | 否 | 额外备注 |

## `source_type` 枚举

| 值 | 说明 |
|----|------|
| `web_public` | 公开网页来源，如领英、GitHub、个人主页、公司官网团队页 |
| `boss_platform` | BOSS直聘 候选人线索卡片或平台资料入口 |
| `liepin_platform` | 猎聘候选人线索卡片或平台资料入口 |
| `zhilian_platform` | 智联招聘候选人线索卡片或平台资料入口 |
| `lark_talent_base` | 飞书人才库 |
| `lark_project_progress` | 飞书招聘项目进展 |
| `resume_folder` | 本地简历文件夹 |
| `wechat_local` | 微信联系人辅助信息 |
| `local_file` | 其他本地 Markdown / JSON / 表格 |
| `manual` | 用户手工提供 |

## `contact_channels` 扩展说明

除电话、微信、邮箱外，第一阶段还允许保留这些平台内触达渠道：

- `boss`
- `liepin`
- `zhilian`
- `linkedin`
- `maimai`

## 推荐输出字段

归一化后的候选人进入排序脚本时，会补充这些字段：

| 字段 | 说明 |
|------|------|
| `match_score` | 0-100 的综合匹配分 |
| `match_reasons` | 最多 3 条匹配依据 |
| `risk_flags` | 风险提示列表 |
| `recommended_next_skill` | 推荐下游技能 |
| `recommended_priority` | `low` / `medium` / `high` |
| `task_payload` | 给下游技能的任务化载荷 |

## 下游技能路由枚举

`recommended_next_skill` 必须是以下之一：

- `headhunter-table-manage`
- `headhunter-outreach-message`
- `headhunter-greeting-skill`
- `headhunter-cv-jd-matching`
- `headhunter-candidate-report`
- `headhunter-client-nurture`

## 去重主键建议

优先顺序：

1. 电话
2. 微信
3. 邮箱
4. `source_url_or_path`
5. `name + current_company + current_title`

如果多个来源命中同一候选人，应合并证据、联系方式和备注，不丢弃更完整的记录。

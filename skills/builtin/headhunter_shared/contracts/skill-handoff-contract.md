# Skill Handoff Contract

这个 contract 用于在多个猎头 skills 之间传递稳定的任务对象，避免前后端或算法侧依赖每个 skill 的私有字段。

## `top_candidate`

```json
{
  "candidate_id": "cand-001",
  "name": "张三",
  "match_score": 86,
  "match_reasons": ["命中 2 项硬性技能", "当前职级与目标岗位接近"],
  "risk_flags": ["证据来源较单一"],
  "recommended_next_skill": "headhunter-outreach-message",
  "recommended_priority": "high",
  "table_record": {
    "target_table": "招聘项目进展",
    "fields": {}
  },
  "task_payload": {
    "skill": "headhunter-outreach-message",
    "priority": "high",
    "candidate_id": "cand-001",
    "candidate_name": "张三",
    "job_id": "job-001",
    "match_score": 86,
    "summary": "命中 2 项硬性技能；当前职级与目标岗位接近"
  }
}
```

## `task_queue_item`

```json
{
  "job_id": "job-001",
  "job_title": "高级算法工程师",
  "company_name": "示例科技",
  "candidate_id": "cand-001",
  "candidate_name": "张三",
  "target_skill": "headhunter-outreach-message",
  "priority": "high",
  "match_score": 86,
  "summary": "命中 2 项硬性技能；当前职级与目标岗位接近",
  "risk_flags": ["证据来源较单一"],
  "task_payload": {}
}
```

## `table_record`

```json
{
  "target_table": "招聘项目进展",
  "fields": {
    "岗位名称": "高级算法工程师",
    "公司名称": "示例科技",
    "姓名": "张三",
    "匹配分": 86,
    "下一步技能": "headhunter-outreach-message"
  }
}
```

## 设计原则

- 上游统一产出 `top_candidates`
- 中间统一产出 `task_queue`
- 飞书写入统一产出 `table_record`
- 下游 skill 只认 `task_payload` 和 contract，不认上游脚本路径

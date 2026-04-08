# Job Contract

`job` 是猎头链路的统一岗位对象。所有上游 skill 和下游 handoff 都应尽量映射到这个结构。

## 标准结构

```json
{
  "job_id": "job-001",
  "job_title": "高级算法工程师",
  "company_name": "示例科技",
  "city": "杭州",
  "salary_range": "50-80K * 14",
  "must_have_skills": ["大模型", "Python"],
  "nice_to_have_skills": ["推荐系统"],
  "keywords": ["LLM", "推荐", "搜索排序"],
  "priority": "high"
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `job_id` | 建议 | 统一岗位标识 |
| `job_title` | 是 | 岗位名称 |
| `company_name` | 是 | 公司名称 |
| `city` | 否 | 工作城市 |
| `salary_range` | 否 | 薪酬范围 |
| `must_have_skills` | 否 | 硬性要求 |
| `nice_to_have_skills` | 否 | 加分项 |
| `keywords` | 是 | 寻访与匹配关键字 |
| `priority` | 否 | `low` / `medium` / `high` / `urgent` |

## 技能映射

- `headhunter-find-job`：补齐 `job_title/company_name/city`
- `headhunter-search-report`：补齐 `keywords/must_have_skills/nice_to_have_skills`
- `headhunter-candidate-sourcing`：要求至少具备 `job_title/company_name/keywords`
- `headhunter-cv-jd-matching`：消费该对象中的 JD 侧字段

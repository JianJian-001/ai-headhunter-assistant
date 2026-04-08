# 公开网页候选人抽取

第一版公开网页寻访不直接依赖完整桌面代理，而是采用：

1. 生成公开检索查询
2. 从搜索结果或公开页面摘要中提取候选人线索
3. 补充来源可信度和证据
4. 再进入统一归一化、去重、打分和路由

## 支持的公开来源

- 领英公开资料页
- 脉脉公开资料页
- GitHub / GitLab 个人主页
- 公司官网团队页
- 技术博客、演讲嘉宾页、新闻稿
- 其他公开网页候选人资料页

## 输入格式

公开网页寻访当前拆成两步：

1. `scripts/search_public_results.py` 获取搜索结果
2. `scripts/extract_public_candidates.py` 从搜索结果抽取候选人

## `search_public_results.py`

### 查询输入

```json
{
  "job": {
    "job_title": "高级算法工程师",
    "company_name": "示例科技",
    "city": "杭州",
    "keywords": ["推荐系统", "LLM", "广告算法"]
  },
  "query_limit": 3,
  "per_query_limit": 5
}
```

### 离线测试输入

如果不想直接联网，可以传 `html_pages` 数组做离线解析测试：

```json
{
  "job": {
    "job_title": "高级算法工程师",
    "company_name": "示例科技",
    "city": "杭州",
    "keywords": ["推荐系统", "LLM", "广告算法"]
  },
  "html_pages": ["<html>...</html>"]
}
```

输出会包含：

- `queries`
- `search_results`
- `total_results`

要求：

- `query_limit`、`per_query_limit` 必须大于 0
- 如果传 `html_pages`，数量必须和本轮 `queries` 数量一致
- 脚本失败时会返回错误 JSON 且退出码非 0

## `extract_public_candidates.py`

`scripts/extract_public_candidates.py` 支持两种模式：

### 1. 仅生成查询

传入 `job`，不传 `search_results`：

```json
{
  "job": {
    "job_title": "高级算法工程师",
    "company_name": "示例科技",
    "city": "杭州",
    "keywords": ["推荐系统", "LLM", "广告算法"]
  }
}
```

输出会包含建议查询词。

### 2. 从搜索结果抽取候选人

```json
{
  "job": {
    "job_title": "高级算法工程师",
    "company_name": "示例科技",
    "city": "杭州",
    "keywords": ["推荐系统", "LLM", "广告算法"]
  },
  "search_results": [
    {
      "title": "张三 - 算法专家 - 某互联网公司 | LinkedIn",
      "url": "https://www.linkedin.com/in/example",
      "snippet": "推荐系统、广告算法和大模型方向经验",
      "location": "杭州"
    }
  ]
}
```

## 输出字段

每条候选人线索会补充：

- `source_domain`
- `public_profile_type`
- `source_credibility`
- `evidence`

并统一标记为：

- `source_type = web_public`
- `communication_status = new_lead`

## 来源可信度建议

| 来源 | `source_credibility` |
|------|----------------------|
| LinkedIn 公开个人资料 | 9 |
| 脉脉公开资料 | 8 |
| GitHub / GitLab 个人主页 | 8 / 7 |
| 公司官网团队页 | 6 |
| 一般公开网页 | 5 |

## 使用顺序

1. 先执行 `search_public_results.py` 获取公开搜索结果
2. 再执行 `extract_public_candidates.py` 获取公开候选人线索
3. 把输出候选人与本地知识库候选人合并
4. 再交给 `normalize_candidates.py`
5. 最后交给 `rank_candidates.py` 和 `prepare_skill_handoffs.py`

如果已经拿到公开搜索结果或 HTML 页面，也可以直接用 `scripts/run_public_sourcing_pipeline.py` 走完整链路。

## 端到端流水线输出说明

`scripts/run_public_sourcing_pipeline.py` 会输出：

- `queries_used`：本轮实际使用的查询列表，已按 `query_limit` 截断
- `search_results_used`：真正被识别为候选人线索并进入候选人池的搜索结果
- `search_results_dropped_count`：被丢弃的搜索结果数量
- `public_candidates`
- `top_candidates`
- `handoffs`

注意：

- `queries_used` 才是与 `html_pages` 对齐的查询列表
- `search_results_used` 不是原始搜索结果全集，而是已经通过候选人识别筛选后的子集

## 注意事项

- 公开网页来源必须保留链接
- 标题和摘要是第一版的重要证据来源
- 公开资料如果无法识别候选人姓名，不进入候选人池
- 第一版不保证直接拿到联系方式，主要目标是拿到可追溯线索

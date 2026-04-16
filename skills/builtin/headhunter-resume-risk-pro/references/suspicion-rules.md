# 可疑点规则

| rule_id | 维度 | 说明 | 默认级别 |
|---|---|---|---|
| `timeline_overlap` | 时间线 | 相邻经历日期重叠 | L2 |
| `timeline_gap_long` | 时间线 | 出现 6 个月以上空档且无解释 | L2 |
| `timeline_short_hopping` | 时间线 | 连续两段以上短任职 | L2 |
| `education_short_cycle` | 学历 | 出现明显异常学制表述，如“三年本科” | L3 |
| `education_missing_degree` | 学历 | 只有学校名，没有学历层次 | L1 |
| `consistency_many_titles` | 履历一致性 | 同一段经历堆叠多个高阶头衔 | L2 |
| `consistency_low_evidence` | 履历一致性 | 项目成果全是口号，缺少事实证据 | L1 |

## 追问模板

- 请补充这段经历的准确起止时间。
- 这段空档期当时的状态是什么？
- 该学历的学习形式、学制和毕业时间分别是什么？
- 这段项目成果里，哪些是你本人直接负责并可量化说明的？

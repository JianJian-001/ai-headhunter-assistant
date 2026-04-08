# 错误码与常见错误

CLI 命令执行中可能遇到的错误及修复建议。

## 错误码表

| 错误码/错误信息 | 含义 | 修复建议 |
|----------------|------|---------|
| `record not found` | 指定的 recordId 不存在或已被删除 | 重新执行 `record list` 获取最新 recordId |
| `field not found` | 指定的字段名在表中不存在 | 重新执行 `field list` 确认字段名，注意大小写和空格 |
| `permission denied` | 当前用户无权限访问该资源 | 提示用户检查文档/表格的分享设置和权限配置 |
| `invalid parameter` | 命令参数格式错误 | 检查 --data 的 JSON 格式是否正确，url 字段是否使用对象格式 |
| `document create failed` | 文档创建失败 | 检查 --parent 的 rootDentryUuid 是否正确，重新执行 `get-root` |
| `document write failed` | 文档内容写入失败 | 检查 dentryUuid 是否正确，内容过长时分段使用 mode 1 续写 |
| `network timeout` | 网络请求超时 | 加 `--verbose` 重试一次，仍失败则报告给用户 |

## 常见错误 Top 5

1. **url 字段传纯字符串** — 必须传 `{"text":"显示文本","link":"https://..."}` 对象格式，纯字符串 100% 失败
2. **record update 缺少 recordId** — data 数组中每个对象必须包含 `recordId` 字段
3. **未先查字段就写入** — 字段名与实际不一致导致 `field not found`，写入前必须先 `field list`
4. **dentryUuid 与 baseId 混淆** — 文档操作用 dentryUuid，表格操作用 baseId，不可混用
5. **cells 键名与表格字段名不一致** — cells 的键名必须与 `field list` 返回的字段名完全一致

## 调试流程

```
命令失败
  |
  +--> 加 --verbose 重试
  |      |
  |      +--> 成功 --> 继续
  |      |
  |      +--> 仍失败 --> 检查错误信息
  |             |
  |             +--> "not found" --> 重新获取对应 ID (record list / field list / get-root)
  |             |
  |             +--> "permission" --> 提示用户检查权限
  |             |
  |             +--> "invalid" --> 检查参数格式 (JSON / 对象格式)
  |             |
  |             +--> 其他 --> 报告给用户，附带完整错误信息
```

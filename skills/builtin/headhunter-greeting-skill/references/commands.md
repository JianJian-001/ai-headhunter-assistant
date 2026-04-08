# 脚本说明

## 脚本列表

| 脚本 | 用途 | 状态 |
|------|------|:----:|
| `scripts/main.py` | 主入口 | 可用 |
| `scripts/wechat_ui.py` | 平台路由层 | 可用 |
| `scripts/wechat_ui_base.py` | 平台抽象基类 | 可用 |
| `scripts/wechat_ui_mac.py` | macOS 实现 | 可用 |
| `scripts/wechat_ui_win.py` | Windows 实现 | 可用 |
| `scripts/candidates.py` | 候选人格式校验、称呼判断 | 可用 |
| `scripts/contacts_cache.py` | 候选人数据库管理 | [WIP] |

## 可用命令

| 命令 | 用途 | 返回 |
|------|------|------|
| `check` | 检查微信（安装+登录） | `{installed, running, logged_in, window_info}` |
| `send "名称" "内容" "主题"` | 发送单条微信消息 | `{candidate, message, festival, status, timestamp}` |
| `hide` | 隐藏微信窗口到后台 | `{status: "hidden"}` |

send 内部每人完整循环：①检查安装+登录 → ②激活微信→搜索联系人 → ③发送（焦点验证）→ ④关闭聊天→隐藏微信。每人发完微信自动隐藏。

hide 可单独调用隐藏微信。

## [WIP] 开发中命令（禁止调用）

| 命令 | 用途 |
|------|------|
| `scan_contacts` | 扫描通讯录 |
| `screenshot` / `screenshot_chat` | 截图 |
| `db_list` / `db_info` / `db_clear` | 候选人数据库操作 |

## 执行方式

所有命令都必须先切到 `headhunter-greeting-skill` 根目录，再执行：

```bash
cd /absolute/path/to/headhunter-greeting-skill
python3 scripts/main.py <命令>
```

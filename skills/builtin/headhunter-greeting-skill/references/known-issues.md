# 已知问题与经验

## 搜索候选人验证

微信搜索优先级：微信号 > 姓名 > 手机号。

**问题**：候选人不存在时按 Enter 可能打开错误窗口。
**解决**：
- 最前端不是微信 -> `not_found`
- 窗口 ID 变了 -> `not_found`
- 窗口尺寸剧变 -> `not_found`
- 前端仍是原窗口 -> 继续发送

## 微信登录状态判断

**macOS**：通过窗口尺寸启发式判断。登录界面约 280x400，主界面 >700x500。

**Windows**：主要依靠窗口尺寸判断，阈值为 500x600。

`check` 返回 `logged_in: true/false`。`send` 命令内部也会自动检查。

## 发送后操作

- 每条发送后自动 `close_chat()` 回到主界面
- 每人发完后自动 `hide_wechat()` 隐藏到后台

## 微信窗口在其他 Space

微信在另一个 macOS Space 时截图可能空白。`activate_wechat()` 同时调用 `activate` 和 `reopen`。

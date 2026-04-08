"""
微信 GUI 自动化 - 平台抽象基类

定义所有平台实现必须提供的接口。
macOS 实现见 wechat_ui_mac.py，Windows 实现见 wechat_ui_win.py。

图像理解由 AI 通过环境内置的 view_image 工具完成，脚本只负责截图。
"""

import sys
import time
import random
from abc import ABC, abstractmethod

MODIFIER_KEY = "command" if sys.platform == "darwin" else "ctrl"


class WeChatUIBase(ABC):
    """微信 GUI 操控抽象基类"""

    @abstractmethod
    def is_wechat_installed(self) -> bool:
        ...

    @abstractmethod
    def is_wechat_running(self) -> bool:
        ...

    @abstractmethod
    def launch_wechat(self):
        ...

    @abstractmethod
    def activate_wechat(self):
        ...

    @abstractmethod
    def hide_wechat(self):
        ...

    @abstractmethod
    def get_wechat_main_window(self) -> dict | None:
        ...

    @abstractmethod
    def take_screenshot_of_wechat(self) -> str:
        ...

    @abstractmethod
    def take_screenshot_region(self, x: int, y: int, w: int, h: int) -> str:
        ...

    @abstractmethod
    def scan_contacts_screenshots(
        self, reset_to_top: bool = True, max_time: int = 240
    ) -> list[str]:
        ...

    @abstractmethod
    def search_and_open_chat(self, contact_name: str) -> bool:
        ...

    @abstractmethod
    def send_message(self, message: str) -> bool:
        ...

    @abstractmethod
    def close_chat(self):
        ...

    def screenshot_chat(self, contact_name: str, search_key: str = "") -> dict:
        actual_search = search_key.strip() if search_key else contact_name
        try:
            found = self.search_and_open_chat(actual_search)
            if not found:
                self.close_chat()
                return {"found": False, "screenshot_path": ""}
            time.sleep(0.5)
            path = self.take_screenshot_of_wechat()
            return {"found": True, "screenshot_path": path}
        except Exception as error:
            print(f"[错误] screenshot_chat {contact_name}: {error}")
            try:
                self.close_chat()
            except Exception:
                pass
            return {"found": False, "screenshot_path": ""}

    def send_greeting_to_contact(
        self, contact_name: str, message: str, search_key: str = ""
    ) -> str:
        actual_search = search_key.strip() if search_key else contact_name
        try:
            found = self.search_and_open_chat(actual_search)
            if not found:
                self.close_chat()
                self.hide_wechat()
                return "not_found"

            success = self.send_message(message)
            self.close_chat()
            self.hide_wechat()
            return "sent" if success else "failed"
        except Exception as error:
            print(f"[错误] 发送给 {contact_name} 时出错: {error}")
            try:
                self.close_chat()
                self.hide_wechat()
            except Exception:
                pass
            return "failed"

    def check_wechat_status(self) -> dict:
        result = {
            "installed": self.is_wechat_installed(),
            "running": False,
            "logged_in": False,
            "window_info": None,
        }

        if result["installed"]:
            result["running"] = self.is_wechat_running()

            if not result["running"]:
                try:
                    self.launch_wechat()
                    result["running"] = self.is_wechat_running()
                except Exception:
                    pass

            if result["running"]:
                try:
                    window_info = self.get_wechat_main_window()
                    if window_info:
                        result["window_info"] = {
                            "id": window_info.get("id"),
                            "x": window_info["x"],
                            "y": window_info["y"],
                            "width": window_info["width"],
                            "height": window_info["height"],
                            "on_screen": window_info.get("on_screen", True),
                        }
                        result["logged_in"] = self._check_logged_in(window_info)
                        if not result["logged_in"]:
                            print(
                                f"[检查] 微信窗口({window_info['width']}x{window_info['height']})，判定为未登录",
                                file=sys.stderr,
                            )
                except Exception:
                    pass

        return result

    def _check_logged_in(self, window_info: dict) -> bool:
        return window_info["width"] > 400 and window_info["height"] > 450

    @staticmethod
    def random_delay():
        delay = random.randint(1, 10)
        print(f"  等待 {delay} 秒...")
        time.sleep(delay)

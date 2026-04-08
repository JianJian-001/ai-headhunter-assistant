"""
微信 GUI 自动化 - macOS 实现
"""

import subprocess
import time
import os
import sys
import tempfile

import pyautogui
import pyperclip
import Quartz
from PIL import Image

from scripts.wechat_ui_base import WeChatUIBase, MODIFIER_KEY

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3

WECHAT_OWNER_NAME = "微信"
WECHAT_PROCESS_NAME = "WeChat"
WECHAT_APP_PATH = "/Applications/WeChat.app"


def _run_applescript(script: str) -> tuple[str, str]:
    result = subprocess.run(
        ["osascript", "-e", script], capture_output=True, text=True, timeout=10
    )
    return result.stdout.strip(), result.stderr.strip()


def _get_retina_scale() -> int:
    try:
        display_id = Quartz.CGMainDisplayID()
        pixel_width = Quartz.CGDisplayPixelsWide(display_id)
        logical_width = Quartz.CGDisplayBounds(display_id).size.width
        if pixel_width > 0 and logical_width > 0:
            scale = round(pixel_width / logical_width)
            return scale if scale >= 2 else 2
    except Exception:
        pass
    return 2


def _to_rgb(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])
        return background
    return image.convert("RGB")


class WeChatUIMac(WeChatUIBase):
    def is_wechat_installed(self) -> bool:
        return os.path.exists(WECHAT_APP_PATH)

    def is_wechat_running(self) -> bool:
        result = subprocess.run(["pgrep", "-x", WECHAT_PROCESS_NAME], capture_output=True)
        return result.returncode == 0

    def launch_wechat(self):
        subprocess.run(["open", WECHAT_APP_PATH], check=True)
        time.sleep(3)

    def activate_wechat(self):
        _run_applescript(
            'tell application "WeChat" to activate\ntell application "WeChat" to reopen'
        )
        time.sleep(0.8)

    def hide_wechat(self):
        _run_applescript(
            'tell application "System Events" to set visible of process "WeChat" to false'
        )
        time.sleep(0.3)

    def _get_wechat_window_ids(self) -> list[int]:
        windows = Quartz.CGWindowListCopyWindowInfo(
            Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID
        )
        window_ids = []
        for window in windows:
            if str(window.get("kCGWindowOwnerName", "")) != WECHAT_OWNER_NAME:
                continue
            bounds = window.get("kCGWindowBounds", {})
            width, height = int(bounds.get("Width", 0)), int(bounds.get("Height", 0))
            if width > 100 and height > 100 and int(window.get("kCGWindowLayer", -1)) == 0:
                window_ids.append(int(window.get("kCGWindowNumber", 0)))
        return window_ids

    def get_wechat_main_window(self) -> dict | None:
        windows = Quartz.CGWindowListCopyWindowInfo(
            Quartz.kCGWindowListOptionAll, Quartz.kCGNullWindowID
        )
        candidates = []
        for window in windows:
            if str(window.get("kCGWindowOwnerName", "")) != WECHAT_OWNER_NAME:
                continue
            bounds = window.get("kCGWindowBounds", {})
            width, height = int(bounds.get("Width", 0)), int(bounds.get("Height", 0))
            if width > 100 and height > 100 and int(window.get("kCGWindowLayer", -1)) == 0:
                candidates.append(
                    {
                        "id": int(window.get("kCGWindowNumber", 0)),
                        "name": str(window.get("kCGWindowName", "")),
                        "x": int(bounds.get("X", 0)),
                        "y": int(bounds.get("Y", 0)),
                        "width": width,
                        "height": height,
                        "on_screen": bool(window.get("kCGWindowIsOnscreen", False)),
                    }
                )
        if not candidates:
            return None
        pool = [candidate for candidate in candidates if candidate["on_screen"]] or candidates
        return max(pool, key=lambda candidate: candidate["width"] * candidate["height"])

    def _screenshot_wechat_window(self, filename: str = "wechat_screenshot.png") -> str:
        file_path = os.path.join(tempfile.gettempdir(), filename)
        window_info = self.get_wechat_main_window()
        if window_info and window_info.get("id"):
            result = subprocess.run(
                ["screencapture", "-x", "-o", "-l", str(window_info["id"]), file_path],
                capture_output=True,
            )
            if result.returncode == 0 and os.path.exists(file_path):
                _to_rgb(Image.open(file_path)).save(file_path)
                return file_path
        subprocess.run(["screencapture", "-x", file_path], check=True)
        _to_rgb(Image.open(file_path)).save(file_path)
        return file_path

    def take_screenshot_of_wechat(self) -> str:
        return self._screenshot_wechat_window()

    def take_screenshot_region(self, x: int, y: int, w: int, h: int) -> str:
        full_path = os.path.join(tempfile.gettempdir(), "region_full.png")
        output_path = os.path.join(tempfile.gettempdir(), "region_crop.png")
        subprocess.run(["screencapture", "-x", full_path], check=True)
        scale = _get_retina_scale()
        image = Image.open(full_path)
        _to_rgb(image.crop((x * scale, y * scale, (x + w) * scale, (y + h) * scale))).save(
            output_path
        )
        os.remove(full_path)
        return output_path

    def scan_contacts_screenshots(
        self, reset_to_top: bool = True, max_time: int = 240
    ) -> list[str]:
        import time as local_time

        start_time = local_time.time()

        self.activate_wechat()
        self._open_contacts_panel()
        time.sleep(0.5)

        window_info = self.get_wechat_main_window()
        if not window_info:
            raise RuntimeError("无法获取微信窗口信息")

        screenshots = []

        if reset_to_top:
            self._scroll_to_top(window_info)

        scroll_x = window_info["x"] + 200
        scroll_y = window_info["y"] + int(window_info["height"] * 0.7)
        pyautogui.moveTo(scroll_x, scroll_y)
        time.sleep(0.2)

        path = self._screenshot_wechat_window("wechat_contacts_0000.png")
        screenshots.append(path)

        page_scroll = -max(10, (window_info["height"] - 100) // 10)
        same_count = 0
        last_size = None
        round_num = 0
        timed_out = False

        while True:
            round_num += 1
            elapsed = local_time.time() - start_time
            if elapsed > max_time:
                print(
                    f"[扫描] 达到时间上限 {max_time}s，已扫描 {round_num - 1} 轮",
                    file=sys.stderr,
                )
                timed_out = True
                break

            pyautogui.scroll(page_scroll)
            time.sleep(0.2)

            file_name = f"wechat_contacts_{round_num:04d}.png"
            path = self._screenshot_wechat_window(file_name)
            current_size = os.path.getsize(path)
            if last_size is not None and current_size == last_size:
                same_count += 1
                if same_count >= 3:
                    print(f"[扫描] 列表已到底，共扫描 {round_num} 轮", file=sys.stderr)
                    try:
                        os.remove(path)
                    except OSError:
                        pass
                    break
            else:
                same_count = 0
            last_size = current_size
            screenshots.append(path)

        elapsed = local_time.time() - start_time
        print(
            f"[扫描] 完成, 共 {len(screenshots)} 张截图, 耗时 {elapsed:.0f}s"
            + (", 未扫完(超时)" if timed_out else ""),
            file=sys.stderr,
        )
        return screenshots

    def _scroll_to_top(self, window_info: dict):
        scroll_x = window_info["x"] + 200
        scroll_y = window_info["y"] + int(window_info["height"] * 0.5)
        pyautogui.moveTo(scroll_x, scroll_y)
        time.sleep(0.2)

        old_pause = pyautogui.PAUSE
        pyautogui.PAUSE = 0
        for _ in range(10):
            pyautogui.scroll(32767)
        pyautogui.PAUSE = old_pause
        time.sleep(0.5)

        print("[扫描] 已滚动到列表顶部", file=sys.stderr)

    def _open_contacts_panel(self):
        self.activate_wechat()
        time.sleep(0.5)
        window_info = self.get_wechat_main_window()
        if not window_info:
            raise RuntimeError("无法获取微信窗口信息")
        pyautogui.click(window_info["x"] + 30, window_info["y"] + 165)
        time.sleep(1)

    def _get_frontmost_window(self) -> dict | None:
        windows = Quartz.CGWindowListCopyWindowInfo(
            Quartz.kCGWindowListOptionOnScreenOnly
            | Quartz.kCGWindowListExcludeDesktopElements,
            Quartz.kCGNullWindowID,
        )
        for window in windows:
            layer = int(window.get("kCGWindowLayer", -1))
            bounds = window.get("kCGWindowBounds", {})
            width, height = int(bounds.get("Width", 0)), int(bounds.get("Height", 0))
            if layer == 0 and width > 50 and height > 50:
                return {
                    "owner": str(window.get("kCGWindowOwnerName", "")),
                    "id": int(window.get("kCGWindowNumber", 0)),
                    "width": width,
                    "height": height,
                }
        return None

    def search_and_open_chat(self, contact_name: str) -> bool:
        self.activate_wechat()
        time.sleep(0.5)
        window_info = self.get_wechat_main_window()
        if not window_info:
            return False

        original_id = window_info.get("id")
        original_width = window_info["width"]
        original_height = window_info["height"]

        pyautogui.click(window_info["x"] + 190, window_info["y"] + 33)
        time.sleep(0.5)
        pyautogui.hotkey(MODIFIER_KEY, "a")
        time.sleep(0.1)

        pyperclip.copy(contact_name)
        pyautogui.hotkey(MODIFIER_KEY, "v")
        time.sleep(1.5)

        pyautogui.press("enter")
        time.sleep(1.0)

        front_window = self._get_frontmost_window()
        if not front_window:
            print(f"[发送] 搜索 '{contact_name}' 无法获取前端窗口信息", file=sys.stderr)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        if front_window["owner"] != WECHAT_OWNER_NAME:
            print(
                f"[发送] 搜索 '{contact_name}' 打开了非微信窗口（{front_window['owner']}），关闭中",
                file=sys.stderr,
            )
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            self.activate_wechat()
            time.sleep(0.3)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        if front_window["id"] != original_id:
            print(
                f"[发送] 搜索 '{contact_name}' 打开了微信新窗口（ID {front_window['id']} != {original_id}），关闭中",
                file=sys.stderr,
            )
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        size_change = abs(front_window["width"] - original_width) + abs(
            front_window["height"] - original_height
        )
        if size_change > 100:
            print(
                f"[发送] 搜索 '{contact_name}' 窗口尺寸异常变化（差异 {size_change}px），关闭中",
                file=sys.stderr,
            )
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        print(f"[发送] 搜索 '{contact_name}' 已进入聊天窗口", file=sys.stderr)
        return True

    def send_message(self, message: str) -> bool:
        window_info = self.get_wechat_main_window()
        if not window_info:
            return False
        original_id = window_info.get("id")

        if not self._ensure_wechat_focused(original_id):
            return False
        pyautogui.click(
            window_info["x"] + window_info["width"] * 2 // 3,
            window_info["y"] + window_info["height"] - 80,
        )
        time.sleep(0.3)

        if not self._ensure_wechat_focused(original_id):
            return False
        pyperclip.copy(message)
        pyautogui.hotkey(MODIFIER_KEY, "v")
        time.sleep(0.3)

        if not self._ensure_wechat_focused(original_id):
            return False
        pyautogui.press("enter")
        time.sleep(1.0)

        front_window = self._get_frontmost_window()
        if not front_window or front_window["owner"] != WECHAT_OWNER_NAME:
            print("[发送] 发送后微信不在前台，消息可能未成功发送", file=sys.stderr)
            return False

        return True

    def _ensure_wechat_focused(self, expected_id: int, max_retries: int = 2) -> bool:
        for attempt in range(max_retries + 1):
            front_window = self._get_frontmost_window()
            if (
                front_window
                and front_window["owner"] == WECHAT_OWNER_NAME
                and front_window["id"] == expected_id
            ):
                return True
            if attempt < max_retries:
                print(
                    f"[发送] 微信不在前台（当前: {front_window['owner'] if front_window else '未知'}），重新激活中",
                    file=sys.stderr,
                )
                self.activate_wechat()
                time.sleep(0.5)
        print("[发送] 无法将微信保持在前台，中止发送", file=sys.stderr)
        return False

    def close_chat(self):
        window_info = self.get_wechat_main_window()
        if window_info:
            pyautogui.click(window_info["x"] + 190, window_info["y"] + 90)
            time.sleep(0.5)

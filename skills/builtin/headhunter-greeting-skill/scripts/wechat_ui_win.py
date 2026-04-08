"""
微信 GUI 自动化 - Windows 实现
"""

import subprocess
import time
import os
import sys
import tempfile

import pyautogui
import pyperclip
from PIL import ImageGrab

from scripts.wechat_ui_base import WeChatUIBase, MODIFIER_KEY

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3

WECHAT_PROCESS_NAMES = ["WeChat.exe", "Weixin.exe"]
WECHAT_WINDOW_CLASSES = ["WeChatMainWndForPC", "WeixinMainWndForPC"]
WECHAT_WINDOW_TITLES = ["微信", "Weixin"]

WECHAT_DEFAULT_PATHS = [
    os.path.expandvars(r"%ProgramFiles%\Tencent\WeChat\WeChat.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Tencent\WeChat\WeChat.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tencent\WeChat\WeChat.exe"),
    os.path.expandvars(r"%ProgramFiles%\Tencent\Weixin\Weixin.exe"),
    os.path.expandvars(r"%ProgramFiles(x86)%\Tencent\Weixin\Weixin.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tencent\Weixin\Weixin.exe"),
]


def _find_wechat_exe() -> str | None:
    for path in WECHAT_DEFAULT_PATHS:
        if os.path.exists(path):
            return path
    try:
        import winreg

        for reg_key in [r"Software\Tencent\WeChat", r"Software\Tencent\Weixin"]:
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_key)
                install_path, _ = winreg.QueryValueEx(key, "InstallPath")
                winreg.CloseKey(key)
                for exe_name in ["WeChat.exe", "Weixin.exe"]:
                    executable = os.path.join(install_path, exe_name)
                    if os.path.exists(executable):
                        return executable
            except Exception:
                continue
    except ImportError:
        pass

    for exe_name in ["WeChat.exe", "Weixin.exe"]:
        result = subprocess.run(["where", exe_name], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0].strip()
    return None


class WeChatUIWin(WeChatUIBase):
    def __init__(self):
        self._wechat_exe = _find_wechat_exe()

    @staticmethod
    def _is_wechat_title(title: str) -> bool:
        return title in WECHAT_WINDOW_TITLES or any(
            expected_title in title for expected_title in WECHAT_WINDOW_TITLES
        )

    def is_wechat_installed(self) -> bool:
        return self._wechat_exe is not None

    def is_wechat_running(self) -> bool:
        try:
            import psutil

            lower_names = [name.lower() for name in WECHAT_PROCESS_NAMES]
            for process in psutil.process_iter(["name"]):
                process_name = (process.info["name"] or "").lower()
                if process_name in lower_names:
                    return True
            return False
        except ImportError:
            for process_name in WECHAT_PROCESS_NAMES:
                result = subprocess.run(
                    ["tasklist", "/FI", f"IMAGENAME eq {process_name}"],
                    capture_output=True,
                    text=True,
                )
                if process_name.lower() in result.stdout.lower():
                    return True
            return False

    def launch_wechat(self):
        if self._wechat_exe:
            os.startfile(self._wechat_exe)
        else:
            for executable in ["Weixin.exe", "WeChat.exe"]:
                try:
                    subprocess.Popen([executable])
                    break
                except FileNotFoundError:
                    continue
        time.sleep(5)

    def activate_wechat(self):
        try:
            import win32gui
            import win32con

            hwnd = self._find_wechat_hwnd()
            if hwnd:
                if win32gui.IsIconic(hwnd):
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
                time.sleep(0.5)
        except ImportError:
            print("[警告] 未安装 pywin32，无法可靠激活窗口", file=sys.stderr)

    def hide_wechat(self):
        try:
            import win32gui
            import win32con

            hwnd = self._find_wechat_hwnd()
            if hwnd:
                win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
                time.sleep(0.3)
        except ImportError:
            pass

    def _find_wechat_hwnd(self) -> int | None:
        try:
            import win32gui

            candidates = []

            def enum_callback(hwnd, _):
                if not win32gui.IsWindowVisible(hwnd):
                    return
                title = win32gui.GetWindowText(hwnd)
                class_name = win32gui.GetClassName(hwnd)
                if title in WECHAT_WINDOW_TITLES or class_name in WECHAT_WINDOW_CLASSES:
                    rect = win32gui.GetWindowRect(hwnd)
                    width = rect[2] - rect[0]
                    height = rect[3] - rect[1]
                    if width > 50 and height > 50 and rect[0] > -10000:
                        candidates.append({"hwnd": hwnd, "width": width, "height": height})

            win32gui.EnumWindows(enum_callback, None)
            if not candidates:
                return None
            candidates.sort(key=lambda item: item["width"] * item["height"], reverse=True)
            return candidates[0]["hwnd"]
        except ImportError:
            return None

    def _check_logged_in(self, window_info: dict) -> bool:
        is_large = window_info["width"] > 500 and window_info["height"] > 600
        print(
            f"[检查] 微信窗口 {window_info['width']}x{window_info['height']}，判定为{'已登录' if is_large else '未登录'}",
            file=sys.stderr,
        )
        return is_large

    def get_wechat_main_window(self) -> dict | None:
        try:
            import win32gui

            hwnd = self._find_wechat_hwnd()
            if not hwnd:
                return None
            rect = win32gui.GetWindowRect(hwnd)
            width = rect[2] - rect[0]
            height = rect[3] - rect[1]
            if width < 50 or height < 50:
                return None
            return {
                "id": hwnd,
                "x": rect[0],
                "y": rect[1],
                "width": width,
                "height": height,
                "on_screen": win32gui.IsWindowVisible(hwnd),
            }
        except ImportError:
            return None

    def take_screenshot_of_wechat(self) -> str:
        self.activate_wechat()
        time.sleep(0.5)
        file_path = os.path.join(tempfile.gettempdir(), "wechat_screenshot.png")
        window_info = self.get_wechat_main_window()
        if window_info:
            bbox = (
                window_info["x"],
                window_info["y"],
                window_info["x"] + window_info["width"],
                window_info["y"] + window_info["height"],
            )
            image = ImageGrab.grab(bbox=bbox)
            image.save(file_path)
            return file_path
        image = ImageGrab.grab()
        image.save(file_path)
        return file_path

    def _screenshot_wechat_window(self, filename: str = "wechat_screenshot.png") -> str:
        file_path = os.path.join(tempfile.gettempdir(), filename)
        window_info = self.get_wechat_main_window()
        if window_info:
            bbox = (
                window_info["x"],
                window_info["y"],
                window_info["x"] + window_info["width"],
                window_info["y"] + window_info["height"],
            )
            image = ImageGrab.grab(bbox=bbox)
            image.save(file_path)
            return file_path
        image = ImageGrab.grab()
        image.save(file_path)
        return file_path

    def take_screenshot_region(self, x: int, y: int, w: int, h: int) -> str:
        file_path = os.path.join(tempfile.gettempdir(), "region_crop.png")
        image = ImageGrab.grab(bbox=(x, y, x + w, y + h))
        image.save(file_path)
        return file_path

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
        pyautogui.moveTo(window_info["x"] + 200, window_info["y"] + int(window_info["height"] * 0.7))

        if reset_to_top:
            for _ in range(30):
                pyautogui.scroll(10)
            time.sleep(0.5)

        path = self._screenshot_wechat_window("wechat_contacts_0000.png")
        screenshots.append(path)

        same_count = 0
        last_size = None
        round_num = 0

        while True:
            round_num += 1

            elapsed = local_time.time() - start_time
            if elapsed > max_time:
                print(f"[扫描] 达到时间上限 {max_time}s", file=sys.stderr)
                break

            pyautogui.scroll(-10)
            time.sleep(0.15)

            file_name = f"wechat_contacts_{round_num:04d}.png"
            path = self._screenshot_wechat_window(file_name)
            current_size = os.path.getsize(path)
            if last_size is not None and current_size == last_size:
                same_count += 1
                if same_count >= 3:
                    try:
                        os.remove(path)
                    except OSError:
                        pass
                    break
            else:
                same_count = 0
            last_size = current_size
            screenshots.append(path)

        print(f"[扫描] 完成, 共 {len(screenshots)} 张截图", file=sys.stderr)
        return screenshots

    def _open_contacts_panel(self):
        self.activate_wechat()
        time.sleep(0.3)
        window_info = self.get_wechat_main_window()
        if not window_info:
            raise RuntimeError("无法获取微信窗口信息")
        pyautogui.click(window_info["x"] + 35, window_info["y"] + 120)
        time.sleep(0.5)

    def _get_foreground_window_info(self) -> dict | None:
        try:
            import win32gui

            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None
            title = win32gui.GetWindowText(hwnd)
            rect = win32gui.GetWindowRect(hwnd)
            return {
                "title": title,
                "hwnd": hwnd,
                "width": rect[2] - rect[0],
                "height": rect[3] - rect[1],
            }
        except ImportError:
            return None

    def search_and_open_chat(self, contact_name: str) -> bool:
        self.activate_wechat()
        time.sleep(0.3)

        window_info = self.get_wechat_main_window()
        if not window_info:
            return False

        original_hwnd = window_info.get("id")
        original_width = window_info["width"]
        original_height = window_info["height"]

        pyautogui.hotkey(MODIFIER_KEY, "f")
        time.sleep(0.5)
        pyautogui.hotkey(MODIFIER_KEY, "a")
        time.sleep(0.1)
        pyperclip.copy(contact_name)
        pyautogui.hotkey(MODIFIER_KEY, "v")
        time.sleep(1.5)

        pyautogui.press("enter")
        time.sleep(0.8)

        front_window = self._get_foreground_window_info()
        if not front_window:
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        if not self._is_wechat_title(front_window["title"]):
            print(
                f"[发送] 搜索 '{contact_name}' 打开了非微信窗口（{front_window['title']}），关闭中",
                file=sys.stderr,
            )
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            self.activate_wechat()
            time.sleep(0.3)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        if front_window["hwnd"] != original_hwnd:
            print(f"[发送] 搜索 '{contact_name}' 打开了新窗口，关闭中", file=sys.stderr)
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        size_change = abs(front_window["width"] - original_width) + abs(
            front_window["height"] - original_height
        )
        if size_change > 100:
            print(f"[发送] 搜索 '{contact_name}' 窗口尺寸异常变化，关闭中", file=sys.stderr)
            pyautogui.hotkey(MODIFIER_KEY, "w")
            time.sleep(0.5)
            pyautogui.press("escape")
            time.sleep(0.3)
            return False

        print(f"[发送] 搜索 '{contact_name}' 已进入聊天窗口", file=sys.stderr)
        return True

    def send_message(self, message: str) -> bool:
        window_info = self.get_wechat_main_window()
        if not window_info or not window_info.get("id"):
            return False
        original_hwnd = window_info["id"]

        if not self._ensure_wechat_focused(original_hwnd):
            return False
        input_x = window_info["x"] + window_info["width"] * 2 // 3
        input_y = window_info["y"] + window_info["height"] - 80
        pyautogui.click(input_x, input_y)
        time.sleep(0.3)

        if not self._ensure_wechat_focused(original_hwnd):
            return False
        pyperclip.copy(message)
        pyautogui.hotkey(MODIFIER_KEY, "v")
        time.sleep(0.3)

        if not self._ensure_wechat_focused(original_hwnd):
            return False
        pyautogui.press("enter")
        time.sleep(0.5)

        front_window = self._get_foreground_window_info()
        if not front_window or not self._is_wechat_title(front_window["title"]):
            print("[发送] 发送后微信不在前台，消息可能未成功发送", file=sys.stderr)
            return False

        return True

    def _ensure_wechat_focused(self, expected_hwnd: int, max_retries: int = 2) -> bool:
        for attempt in range(max_retries + 1):
            front_window = self._get_foreground_window_info()
            if front_window and front_window["hwnd"] == expected_hwnd:
                return True
            if attempt < max_retries:
                print("[发送] 微信不在前台，重新激活中", file=sys.stderr)
                self.activate_wechat()
                time.sleep(0.5)
        print("[发送] 无法将微信保持在前台，中止发送", file=sys.stderr)
        return False

    def close_chat(self):
        pyautogui.press("escape")
        time.sleep(0.5)
        pyautogui.press("escape")
        time.sleep(0.3)

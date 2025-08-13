#!/usr/bin/env python3
import os
import subprocess
import sys
import threading
import time
import signal
import platform

# 强制设置UTF-8编码
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['LC_ALL'] = 'en_US.UTF-8'
os.environ['LANG'] = 'en_US.UTF-8'

# 全局变量用于控制程序退出
should_exit = False
processes = []
threads = []

# 定义颜色常量，用于输出格式化
class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_with_color(text, color=Color.GREEN):
    """带颜色打印文本"""
    print(f"{color}{text}{Color.END}")


def run_command(command, cwd=None, name="process"):
    """运行命令并返回进程对象"""
    try:
        print_with_color(f"启动 {name}: {' '.join(command)}", Color.BLUE)
        # 如果指定了工作目录，则在该目录下运行命令
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',  # 明确指定编码
            errors='replace'   # 处理编码错误
        )
        processes.append(process)
        return process
    except Exception as e:
        print_with_color(f"启动 {name} 失败: {e}", Color.RED)
        sys.exit(1)


def monitor_process(process, name, color=Color.GREEN):
    """监控进程的输出和错误"""
    def read_stdout():
        for line in process.stdout:
            if should_exit:
                break
            print_with_color(f"[{name} stdout] {line.strip()}", color)
    
    def read_stderr():
        for line in process.stderr:
            if should_exit:
                break
            if name == 'Django':
                print_with_color(f"[{name} debug] {line.strip()}", color)
            else:
                print_with_color(f"[{name} stderr] {line.strip()}", Color.RED)
    
    # 创建线程来分别读取标准输出和标准错误
    stdout_thread = threading.Thread(target=read_stdout, daemon=True)
    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    
    threads.append(stdout_thread)
    threads.append(stderr_thread)
    
    stdout_thread.start()
    stderr_thread.start()
    
    # 等待进程结束
    process.wait()
    
    # 如果进程异常退出，打印错误信息
    if process.returncode != 0 and not should_exit:
        print_with_color(f"{name} 异常退出，返回码: {process.returncode}", Color.RED)
        # 触发程序退出
        trigger_exit()


def trigger_exit(sig=None, frame=None):
    """触发程序退出"""
    global should_exit
    if should_exit:
        return
    
    print_with_color("\n接收到退出信号，正在关闭所有进程...", Color.YELLOW)
    should_exit = True
    
    # 关闭所有进程
    for process in processes:
        try:
            process.terminate()
            # 等待进程结束，最多等待5秒
            start_time = time.time()
            while time.time() - start_time < 5 and process.poll() is None:
                time.sleep(0.1)
            # 如果进程仍未结束，强制终止
            if process.poll() is None:
                process.kill()
        except Exception as e:
            print_with_color(f"关闭进程时出错: {e}", Color.RED)
    
    print_with_color("所有进程已关闭，程序退出。", Color.GREEN)
    sys.exit(0)


def find_npm_path():
    """查找 npm 的路径

    返回:
        str: npm 可执行文件的完整路径
    """
    system = platform.system()
    npm_cmd = "npm.cmd" if system == "Windows" else "npm"
    
    # 检查环境变量 PATH
    paths = os.environ.get("PATH", "").split(os.pathsep)
    for path in paths:
        npm_path = os.path.join(path, npm_cmd)
        if os.path.exists(npm_path) and os.access(npm_path, os.X_OK):
            return npm_path
    
    # 检查常见安装路径
    if system == "Windows":
        common_paths = [
            os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "nodejs"),
            os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "nodejs"),
            os.path.join(os.environ.get("AppData", "C:\\Users\\$USER\\AppData\\Roaming"), "npm"),
            os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\$USER"), "AppData\\Roaming\\npm")
        ]
    else:  # macOS/Linux
        common_paths = [
            "/usr/local/bin",
            "/usr/bin",
            "/bin",
            "/opt/homebrew/bin",  # macOS Homebrew
            os.path.expanduser("~/.nvm/versions/node/*/bin"),  # NVM
            os.path.expanduser("~/.npm-global/bin")
        ]
    
    for path in common_paths:
        # 处理通配符路径（如 NVM）
        if '*' in path:
            import glob
            for match in glob.glob(path):
                npm_path = os.path.join(match, npm_cmd)
                if os.path.exists(npm_path) and os.access(npm_path, os.X_OK):
                    return npm_path
        else:
            npm_path = os.path.join(path, npm_cmd)
            if os.path.exists(npm_path) and os.access(npm_path, os.X_OK):
                return npm_path
    
    # 如果找不到 npm
    print_with_color(f"无法找到 npm，请确保已安装 Node.js: https://nodejs.org/", Color.RED)
    sys.exit(1)


def main():
    """主函数"""
    # 设置信号处理
    signal.signal(signal.SIGINT, trigger_exit)  # 处理 Ctrl+C
    signal.signal(signal.SIGTERM, trigger_exit)  # 处理 kill 命令
    
    print_with_color("==== 启动 PPT Killer 服务 ====", Color.BLUE)
    
    # 运行 Django 开发服务器
    django_process = run_command(
        ["uv", "run", "manage.py", "runserver", "8810"],
        name="Django 服务器"
    )
    
    # 监控 Django 进程
    django_monitor_thread = threading.Thread(
        target=monitor_process,
        args=(django_process, "Django", Color.BLUE),
        daemon=True
    )
    threads.append(django_monitor_thread)
    django_monitor_thread.start()
    
    # 进入 frontend 目录并运行 npm dev
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    if not os.path.exists(frontend_dir):
        print_with_color(f"frontend 目录不存在: {frontend_dir}", Color.RED)
        sys.exit(1)
    
    # 查找 npm 路径
    npm_path = find_npm_path()
    print_with_color(f"找到 npm 路径: {npm_path}", Color.GREEN)
    
    # 使用找到的 npm 路径运行命令
    npm_process = run_command(
        [npm_path, "run", "dev"],
        cwd=frontend_dir,
        name="前端服务"
    )
    
    # 监控 npm 进程
    npm_monitor_thread = threading.Thread(
        target=monitor_process,
        args=(npm_process, "Frontend"),
        daemon=True
    )
    threads.append(npm_monitor_thread)
    npm_monitor_thread.start()
    
    # 主线程等待退出信号
    while not should_exit:
        time.sleep(1)


if __name__ == "__main__":
    main()
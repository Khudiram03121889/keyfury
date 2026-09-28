import sys
import subprocess
import time
import os

blender_exe = r"C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\blender-launcher.exe"

def wait_for_blender():
    while True:
        try:
            out = subprocess.check_output('tasklist /FI "IMAGENAME eq blender.exe"', shell=True, text=True)
            if "blender.exe" not in out:
                break
        except Exception:
            pass
        time.sleep(1.5)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_one_arena.py <script_path>")
        sys.exit(1)
    
    script_path = sys.argv[1]
    wait_for_blender()
    print(f">>> Running Blender with {script_path}...")
    t0 = time.time()
    res = subprocess.run([blender_exe, "-b", "-P", script_path], capture_output=True, text=True)
    time.sleep(3.0)
    wait_for_blender()
    print(res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    print(f">>> Done in {time.time() - t0:.1f}s.")

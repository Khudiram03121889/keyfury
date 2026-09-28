import subprocess
import time
import sys
import os

blender_exe = r"C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\blender-launcher.exe"
script_to_run = sys.argv[1] if len(sys.argv) > 1 else r"d:\Keyboard stickman warrior\test_3d\test_run.py"
log_path = r"d:\Keyboard stickman warrior\test_3d\blender_exec.log"

cmd = f'"{blender_exe}" -b -P "{script_to_run}" > "{log_path}" 2>&1'
print(f">>> Launching Blender with: {script_to_run}")
subprocess.run(cmd, shell=True)

# Give blender.exe time to spawn
time.sleep(2.0)

# Wait until blender.exe process is completely done
while True:
    try:
        out = subprocess.check_output('tasklist /FI "IMAGENAME eq blender.exe"', shell=True, text=True)
        if "blender.exe" not in out:
            break
    except Exception as e:
        print(f"Check exception: {e}")
        pass
    time.sleep(1.0)

print(">>> Blender finished execution! Log output:")
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        print(f.read())
else:
    print("Log file not found.")

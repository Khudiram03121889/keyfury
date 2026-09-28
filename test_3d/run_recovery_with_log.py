from pathlib import Path
import runpy
import traceback

log = Path(r"D:\Keyboard stickman warrior\test_3d\recovery_status.txt")
log.write_text("started\n", encoding="utf-8")
try:
    runpy.run_path(r"D:\Keyboard stickman warrior\test_3d\recover_and_apply_leg_finish.py", run_name="__main__")
    log.write_text("completed\n", encoding="utf-8")
except Exception:
    log.write_text("failed\n" + traceback.format_exc(), encoding="utf-8")
    raise

import traceback
import sys

try:
    with open(r"d:\Keyboard stickman warrior\test_3d\build_true_3d_volcanic_pure_geometry.py", "r", encoding="utf-8") as f:
        code = f.read()
    exec(compile(code, r"d:\Keyboard stickman warrior\test_3d\build_true_3d_volcanic_pure_geometry.py", "exec"), globals())
except Exception as e:
    with open(r"d:\Keyboard stickman warrior\test_3d\blender_error.log", "w", encoding="utf-8") as err_f:
        traceback.print_exc(file=err_f)
    print(f"FAILED: {e}")

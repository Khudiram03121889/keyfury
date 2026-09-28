"""
Calibrates cam_z to exact platform horizon math across all 4 builder scripts
cam_z = total_h * (0.5 - ratio_from_bottom)
"""

import os
import re

work_dir = r"d:\Keyboard stickman warrior\test_3d"

configs = [
    ("build_perfect_3d_highland.py", 0.280, 2.2275),
    ("build_perfect_3d_cyber.py", 0.270, 2.32875),
    ("build_perfect_3d_volcanic.py", 0.380, 1.215),
    ("build_perfect_3d_celestial.py", 0.290, 2.12625),
]

for fname, r_bot, target_cz in configs:
    fpath = os.path.join(work_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace cam_z calculation
    # Pattern: cam_z = ...
    content_new = re.sub(
        r'cam_z\s*=\s*0\.\d+\s*\*\s*total_h[^\n]*',
        f'cam_z = (0.5 - {r_bot}) * total_h  # {target_cz}m (Calibrated to Z=0 floor at exact platform ratio)',
        content
    )
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content_new)
    print(f"Updated {fname} -> cam_z = {target_cz}m")

print("All 4 builders updated with exact ground plane calibration!")

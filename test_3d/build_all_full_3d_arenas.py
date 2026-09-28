"""
KeyFury Master Suite: All 4 Full Live 3D Environments
Sequential Builder for:
1. Highland Sanctuary   (Platform Ratio: 0.72)
2. Cyber Neon Rooftop    (Platform Ratio: 0.73)
3. Volcanic Caldera      (Platform Ratio: 0.62)
4. Celestial Void Shrine (Platform Ratio: 0.71)
"""

import sys
import subprocess
import os
import time

out_dir = r"d:\Keyboard stickman warrior\test_3d"
blender_exe = r"C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\blender-launcher.exe"

arenas = [
    {
        "name": "Highland Sanctuary",
        "script": os.path.join(out_dir, "build_full_3d_highland.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.blend"),
        "render": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_Render.png"),
        "glb": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.glb"),
    },
    {
        "name": "Cyber Neon Rooftop",
        "script": os.path.join(out_dir, "build_full_3d_cyber.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_CyberRooftop.blend"),
        "render": os.path.join(out_dir, "KeyFury_3D_CyberRooftop_Render.png"),
        "glb": os.path.join(out_dir, "KeyFury_3D_CyberRooftop.glb"),
    },
    {
        "name": "Volcanic Caldera",
        "script": os.path.join(out_dir, "build_full_3d_volcanic.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.blend"),
        "render": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera_Render.png"),
        "glb": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.glb"),
    },
    {
        "name": "Celestial Void Shrine",
        "script": os.path.join(out_dir, "build_full_3d_celestial.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_CelestialVoid.blend"),
        "render": os.path.join(out_dir, "KeyFury_3D_CelestialVoid_Render.png"),
        "glb": os.path.join(out_dir, "KeyFury_3D_CelestialVoid.glb"),
    },
]

def wait_for_blender():
    # Wait until all background blender processes finish
    while True:
        try:
            out = subprocess.check_output('tasklist /FI "IMAGENAME eq blender.exe"', shell=True, text=True)
            if "blender.exe" not in out:
                break
        except Exception:
            pass
        time.sleep(1.5)

print("===================================================================")
print(">>> KEYFURY MASTER 3D ENVIRONMENT PIPELINE: BUILDING ALL 4 ARENAS")
print("===================================================================")

for a in arenas:
    print(f"\n>>> [STARTING] {a['name']} ({os.path.basename(a['script'])})...")
    wait_for_blender()
    
    t_start = time.time()
    cmd = [blender_exe, "-b", "-P", a["script"]]
    subprocess.run(cmd)
    
    # Wait for completion
    time.sleep(3.0)
    wait_for_blender()
    
    # Verify outputs
    blend_size = os.path.getsize(a["blend"]) if os.path.exists(a["blend"]) else 0
    glb_size = os.path.getsize(a["glb"]) if os.path.exists(a["glb"]) else 0
    render_size = os.path.getsize(a["render"]) if os.path.exists(a["render"]) else 0
    
    print(f"    - .blend : {blend_size:,} bytes (Valid: {blend_size > 100_000})")
    print(f"    - .glb   : {glb_size:,} bytes (Valid: {glb_size > 50_000})")
    print(f"    - Render : {render_size:,} bytes (Valid: {render_size > 50_000})")
    
    if blend_size > 100_000 and glb_size > 50_000 and render_size > 50_000:
        print(f">>> [SUCCESS] {a['name']} completed in {time.time() - t_start:.1f}s.")
    else:
        print(f">>> [ERROR] {a['name']} validation failed!")
        sys.exit(1)

print("\n===================================================================")
print(">>> ALL 4 FULL 3D ARENAS BUILT & EXPORTED SUCCESSFULLY!")
print("===================================================================")

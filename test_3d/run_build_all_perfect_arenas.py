"""
KeyFury 3D: Master Sequential Pipeline for All 4 Perfected 3D Stages
Executes in Blender 5.2.1 LTS:
1. Highland Sanctuary
2. Cyber Neon Rooftop
3. Volcanic Caldera
4. Celestial Void Shrine
Verifies .blend, .glb, and .png outputs.
"""

import subprocess
import os
import time
import sys

out_dir = r"d:\Keyboard stickman warrior\test_3d"
blender_launcher = r"C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\blender-launcher.exe"

arenas = [
    {
        "name": "Highland Sanctuary",
        "script": os.path.join(out_dir, "build_perfect_3d_highland.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.blend"),
        "glb": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.glb"),
        "render": os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_Render.png"),
    },
    {
        "name": "Cyber Neon Rooftop",
        "script": os.path.join(out_dir, "build_perfect_3d_cyber.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_CyberRooftop.blend"),
        "glb": os.path.join(out_dir, "KeyFury_3D_CyberRooftop.glb"),
        "render": os.path.join(out_dir, "KeyFury_3D_CyberRooftop_Render.png"),
    },
    {
        "name": "Volcanic Caldera",
        "script": os.path.join(out_dir, "build_perfect_3d_volcanic.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.blend"),
        "glb": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.glb"),
        "render": os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera_Render.png"),
    },
    {
        "name": "Celestial Void Shrine",
        "script": os.path.join(out_dir, "build_perfect_3d_celestial.py"),
        "blend": os.path.join(out_dir, "KeyFury_3D_CelestialVoid.blend"),
        "glb": os.path.join(out_dir, "KeyFury_3D_CelestialVoid.glb"),
        "render": os.path.join(out_dir, "KeyFury_3D_CelestialVoid_Render.png"),
    },
]

def wait_for_blender():
    while True:
        try:
            out = subprocess.check_output('tasklist /FI "IMAGENAME eq blender.exe"', shell=True, text=True)
            if "blender.exe" not in out:
                break
        except Exception:
            pass
        time.sleep(1.0)

print("========================================================================")
print(">>> KEYFURY MASTER 3D PIPELINE: BUILDING ALL 4 PERFECTED COMBAT STAGES")
print("========================================================================")

results = []

for a in arenas:
    print(f"\n>>> [STARTING] {a['name']} ({os.path.basename(a['script'])})...")
    wait_for_blender()
    
    t_start = time.time()
    cmd = [blender_launcher, "-b", "-P", a["script"]]
    subprocess.run(cmd)
    
    # Wait for completion
    time.sleep(2.0)
    wait_for_blender()
    
    elapsed = time.time() - t_start
    
    # File checks
    blend_size = os.path.getsize(a["blend"]) if os.path.exists(a["blend"]) else 0
    glb_size = os.path.getsize(a["glb"]) if os.path.exists(a["glb"]) else 0
    render_size = os.path.getsize(a["render"]) if os.path.exists(a["render"]) else 0
    
    valid = blend_size > 50_000 and glb_size > 50_000 and render_size > 100_000
    
    print(f"    - .blend : {blend_size:,} bytes")
    print(f"    - .glb   : {glb_size:,} bytes")
    print(f"    - Render : {render_size:,} bytes")
    print(f"    - Time   : {elapsed:.1f}s")
    print(f"    - Status : {'SUCCESS' if valid else 'FAILED'}")
    
    results.append({
        "name": a["name"],
        "valid": valid,
        "blend_size": blend_size,
        "glb_size": glb_size,
        "render_size": render_size,
        "time": elapsed
    })

print("\n========================================================================")
print(">>> SUMMARY OF ARENA BUILDS:")
all_ok = True
for r in results:
    status_str = "OK" if r["valid"] else "FAIL"
    if not r["valid"]: all_ok = False
    print(f"  {r['name']:<25} : {status_str} (Render: {r['render_size']:,} B, GLB: {r['glb_size']:,} B)")
print("========================================================================")

if all_ok:
    print(">>> ALL 4 ARENAS BUILT AND VERIFIED SUCCESSFULLY!")
else:
    print(">>> WARNING: Some arena builds failed!")
    sys.exit(1)

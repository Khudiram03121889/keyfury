import bpy
import math

bpy.ops.wm.open_mainfile(filepath=r'd:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_True3D.blend')

cam = bpy.data.objects['Camera_01_Front_Combat']
lines = [f"Cam loc: {cam.location}, rot: {[math.degrees(r) for r in cam.rotation_euler]}\n"]

for obj in bpy.data.objects:
    if any(k in obj.name for k in ['Volc', 'Mount', 'Plume', 'Fount', 'Cliff', 'Ridge']):
        lines.append(f"Obj: {obj.name:<30} loc={tuple(round(v, 2) for v in obj.location)} dims={tuple(round(v, 2) for v in obj.dimensions)}\n")

with open(r'd:\Keyboard stickman warrior\test_3d\positions_debug.txt', 'w') as f:
    f.writelines(lines)

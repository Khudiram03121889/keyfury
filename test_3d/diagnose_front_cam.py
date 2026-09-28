import bpy
import os
import math
from mathutils import Vector

log_path = r"d:\Keyboard stickman warrior\test_3d\front_diag.txt"

blend_path = r"d:\Keyboard stickman warrior\test_3d\keyfury_stage_volcanic_caldera.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

scene = bpy.context.scene
cam = bpy.data.objects.get('Camera_Front')
cam_loc = cam.location

depsgraph = bpy.context.evaluated_depsgraph_get()
lines = [f"Camera_Front loc: {cam_loc}, rot: {cam.rotation_euler}"]

# Raycasts across the camera field of view: X angles -15 to +15, Y/Z angles -10 to +25
for dy in range(-6, 26, 3):
    rad_y = math.radians(dy)
    ray_dir = Vector((0.0, math.cos(rad_y), math.sin(rad_y))).normalized()
    res, loc, norm, idx, hit_obj, mat = scene.ray_cast(depsgraph, cam_loc, ray_dir)
    if res:
        dist = (loc - cam_loc).length
        lines.append(f"Angle {dy:+03d} deg: Hit '{hit_obj.name}' dist={dist:.2f}m, loc={loc}")
    else:
        lines.append(f"Angle {dy:+03d} deg: NO HIT")

with open(log_path, "w") as f:
    f.write("\n".join(lines))

print("Front camera diagnosis complete.")

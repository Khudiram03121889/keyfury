import bpy
import os
from mathutils import Vector

log_path = r"d:\Keyboard stickman warrior\test_3d\diag_out.txt"
with open(log_path, "w") as f:
    f.write("Starting diagnosis...\n")

blend_path = r"d:\Keyboard stickman warrior\test_3d\keyfury_stage_volcanic_caldera.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

scene = bpy.context.scene
cam = bpy.data.objects.get('Camera_Isometric')
cam_loc = cam.location
target = Vector((0.0, 0.0, 0.0))
ray_dir = (target - cam_loc).normalized()

lines = []
lines.append(f"Camera_Isometric location: {cam_loc}")
lines.append(f"Camera_Isometric rotation: {cam.rotation_euler}")

depsgraph = bpy.context.evaluated_depsgraph_get()
result, location, normal, index, hit_obj, matrix = scene.ray_cast(depsgraph, cam_loc, ray_dir)
if result:
    lines.append(f"HIT OBJECT: {hit_obj.name} at distance {(location - cam_loc).length:.2f}m, hit location: {location}")
else:
    lines.append("NO HIT along direct ray to center")

for obj in scene.objects:
    if obj.type == 'MESH':
        bbox_world = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
        min_dist = min((b - cam_loc).length for b in bbox_world)
        if min_dist < 15.0:
            lines.append(f"Obj: {obj.name}, min_dist: {min_dist:.2f}m, center: {obj.location}")

with open(log_path, "w") as f:
    f.write("\n".join(lines))

print("Diagnosis finished.")

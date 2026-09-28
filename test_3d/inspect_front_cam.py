import bpy
import math
from mathutils import Vector

blend_file = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_True3D.blend"
bpy.ops.wm.open_mainfile(filepath=blend_file)

scene = bpy.context.scene
cam = bpy.data.objects.get('Camera_01_Front_Combat')

lines = []
lines.append("=== CAMERA INFO ===")
lines.append(f"Cam Loc: {cam.location}")
lines.append(f"Cam Rot: {[math.degrees(a) for a in cam.rotation_euler]}")

from bpy_extras.object_utils import world_to_camera_view

lines.append("\n=== VISIBLE OBJECTS IN FRONT CAMERA ===")
for obj in scene.objects:
    if obj.type == 'MESH':
        bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        center = sum(bbox, Vector((0,0,0))) / 8.0
        co_cam = world_to_camera_view(scene, cam, center)
        if -0.2 <= co_cam.x <= 1.2 and -0.2 <= co_cam.y <= 1.2 and co_cam.z > 0:
            mats = [m.name for m in obj.data.materials if m]
            lines.append(f"Obj: {obj.name:<34} CamPos: ({co_cam.x:.2f}, {co_cam.y:.2f}, dist={co_cam.z:.1f}) Mats: {mats}")

with open(r"d:\Keyboard stickman warrior\test_3d\inspect_out.txt", "w") as f:
    f.write("\n".join(lines))
print("WROTE INSPECT OUT")

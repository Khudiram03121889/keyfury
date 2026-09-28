import bpy
import os

blend_p = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_True3D.blend"
bpy.ops.wm.open_mainfile(filepath=blend_p)

with open(r"d:\Keyboard stickman warrior\test_3d\front_objects_audit.txt", "w") as f:
    f.write("=== OBJECTS & MATERIALS AUDIT ===\n")
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            mats = [m.name for m in obj.data.materials if m]
            # Check bounding box center or location
            f.write(f"Mesh: {obj.name:<35} Loc: {str(obj.location):<30} Mats: {mats}\n")

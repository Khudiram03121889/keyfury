import bpy

blend_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

print("\n=== OBJECTS & MATERIALS IN VOLCANIC BLEND ===")
for obj in bpy.data.objects:
    mats = [m.name for m in obj.data.materials] if hasattr(obj.data, "materials") else []
    print(f"Object: {obj.name:30} | Type: {obj.type:8} | Loc: {tuple(round(v, 2) for v in obj.location)} | Mats: {mats}")

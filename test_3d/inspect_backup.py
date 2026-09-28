import bpy

blend_path = r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

with open(r"D:\Keyboard stickman warrior\test_3d\backup_objs.txt", "w") as f:
    f.write(f"Total objects: {len(bpy.data.objects)}\n")
    for o in bpy.data.objects:
        f.write(f"{o.name:<32} {o.type:<8} loc={tuple(round(v, 2) for v in o.location)} visible={not o.hide_viewport}\n")

import bpy

bpy.ops.wm.open_mainfile(filepath=r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend")

with open(r"D:\Keyboard stickman warrior\test_3d\backup_lights_detail.txt", "w") as f:
    for o in bpy.data.objects:
        if o.type == 'LIGHT':
            f.write(f"{o.name:<28} type={o.data.type:<6} energy={o.data.energy:<8.1f} color={tuple(round(c, 3) for c in o.data.color)} loc={tuple(round(v, 2) for v in o.location)}\n")


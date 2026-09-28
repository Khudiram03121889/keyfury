import bpy
bpy.ops.wm.open_mainfile(filepath="d:/Keyboard stickman warrior/test_3d/KeyFury_3D_CyberRooftop.blend")
print([o.name for o in bpy.data.objects])

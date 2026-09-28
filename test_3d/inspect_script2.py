import bpy
import os

o = bpy.data.objects.new('t', bpy.data.meshes.new('tm'))
lines = [
    f"has visible_shadow: {hasattr(o, 'visible_shadow')}",
    f"has visible_camera: {hasattr(o, 'visible_camera')}",
    f"has visible_diffuse: {hasattr(o, 'visible_diffuse')}",
]
with open(r"d:\Keyboard stickman warrior\test_3d\inspect_out2.txt", "w") as f:
    f.write("\n".join(lines))

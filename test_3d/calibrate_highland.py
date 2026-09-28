import bpy
from math import radians

cam = bpy.data.objects['Highland_Combat_Camera']
# Lower the rear parapet slightly and adjust camera
terrace = bpy.data.objects.get('Highland_Terrace_Platform')

# Fine-tune camera position and angle
cam.location = (0.0, -12.5, 3.2)
cam.rotation_euler = (radians(78.2), 0, 0)

# Update backdrop to stay locked to camera
backdrop = bpy.data.objects.get('Highland_Alpine_Backdrop')
if backdrop:
    dist = 35.0
    sw = cam.data.sensor_width
    focal = cam.data.lens
    w = dist * (sw / focal)
    h = w * (9.0 / 16.0)
    backdrop.location = (0, 0, -dist)
    backdrop.scale = (w, h, 1.0)

scene = bpy.context.scene
scene.render.filepath = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_HighlandSanctuary_Render.png"
bpy.ops.render.render(write_still=True)
print(">>> Calibrated Highland Camera & Rendered!")

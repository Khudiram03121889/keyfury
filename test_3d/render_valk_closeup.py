"""
Renders close-up front and perspective stills of Cyber Valkyrie for rigorous fidelity inspection.
"""
import bpy
from math import radians

scene = bpy.context.scene

# Create or get Inspection Camera
cam_name = "Valk_Inspection_Camera"
cam_obj = bpy.data.objects.get(cam_name)
if not cam_obj:
    cam_data = bpy.data.cameras.new(cam_name)
    cam_data.lens = 55.0
    cam_obj = bpy.data.objects.new(cam_name, cam_data)
    bpy.context.collection.objects.link(cam_obj)

RX = 2.15

# 1. Frontal Full-Body Shot
cam_obj.location = (RX, -4.5, 1.30)
cam_obj.rotation_euler = (radians(90.0), 0.0, 0.0)
scene.camera = cam_obj

scene.render.engine = 'BLENDER_EEVEE'
front_path = r"d:\Keyboard stickman warrior\test_3d\valk_closeup_render.png"
scene.render.filepath = front_path
bpy.ops.render.render(write_still=True)
print(f">>> Frontal close-up rendered to: {front_path}")

# 2. 3/4 Dynamic 3D Perspective Shot (to inspect true 3D depth and thickness)
cam_obj.location = (RX - 1.8, -3.8, 1.45)
cam_obj.rotation_euler = (radians(85.0), 0.0, radians(-25.0))

persp_path = r"d:\Keyboard stickman warrior\test_3d\valk_perspective_render.png"
scene.render.filepath = persp_path
bpy.ops.render.render(write_still=True)
print(f">>> 3D Perspective close-up rendered to: {persp_path}")

# Reset scene camera back to combat camera
combat_cam = bpy.data.objects.get("KeyFury_Combat_Camera")
if combat_cam:
    scene.camera = combat_cam

print(">>> Valkyrie close-up inspection renders complete!")

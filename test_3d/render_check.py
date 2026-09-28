import bpy
import os

blend_path = r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend1"
bpy.ops.wm.open_mainfile(filepath=blend_path)

scene = bpy.context.scene
cam = bpy.data.objects.get("KeyFury_Combat_Camera")
if cam:
    scene.camera = cam

# Set render settings for EEVEE
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.filepath = r"D:\Keyboard stickman warrior\test_3d\current_scene_eevee.png"
bpy.ops.render.render(write_still=True)
print("Rendered EEVEE to current_scene_eevee.png")

# Set render settings for Workbench (viewport look)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.filepath = r"D:\Keyboard stickman warrior\test_3d\current_scene_workbench.png"
bpy.ops.render.render(write_still=True)
print("Rendered Workbench to current_scene_workbench.png")

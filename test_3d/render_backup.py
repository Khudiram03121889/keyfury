import bpy
import os

blend_path = r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

scene = bpy.context.scene
cam = bpy.data.objects.get("KeyFury_Combat_Camera")
if cam:
    scene.camera = cam

# Configure EEVEE render
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.filepath = r"D:\Keyboard stickman warrior\test_3d\backup_eevee_render.png"
bpy.ops.render.render(write_still=True)
print("Rendered EEVEE to backup_eevee_render.png")

# Configure Workbench render
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.filepath = r"D:\Keyboard stickman warrior\test_3d\backup_workbench_render.png"
bpy.ops.render.render(write_still=True)
print("Rendered Workbench to backup_workbench_render.png")

"""
Triggers EEVEE and Workbench solid renders in Blender and saves them to test_3d/.
"""
import bpy

print(">>> Rendering EEVEE and Workbench stills...")
scene = bpy.context.scene

# 1. EEVEE Render
scene.render.engine = 'BLENDER_EEVEE'
eevee_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_Arena_Render.png"
scene.render.filepath = eevee_path
bpy.ops.render.render(write_still=True)
print(f">>> EEVEE Render saved to: {eevee_path}")

# 2. Workbench Solid Render
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
workbench_path = r"d:\Keyboard stickman warrior\test_3d\solid_viewport_test.png"
scene.render.filepath = workbench_path
bpy.ops.render.render(write_still=True)
print(f">>> Workbench Render saved to: {workbench_path}")

# Reset to EEVEE
scene.render.engine = 'BLENDER_EEVEE'
print(">>> Finished renders successfully!")

import bpy
import os
from math import radians

print(">>> Starting 3-Fighter Arena Finalization & GLB Exports...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"

# 1. Standalone Export of Volt_Shinobi.glb at origin (0, 0, 0)
shinobi = bpy.data.objects.get("Volt_Shinobi")
if shinobi:
    shinobi.location = (0.0, 0.0, 0.0)
    shinobi.rotation_euler = (0.0, 0.0, 0.0)
    bpy.ops.object.select_all(action='DESELECT')
    shinobi.select_set(True)
    bpy.context.view_layer.objects.active = shinobi
    standalone_path = os.path.join(work_dir, "Volt_Shinobi.glb")
    bpy.ops.export_scene.gltf(
        filepath=standalone_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False
    )
    print(f">>> Exported standalone Volt_Shinobi.glb to: {standalone_path}")
else:
    print("WARNING: Volt_Shinobi object not found in scene!")

# 2. Position all three fighters on the Cyber Rooftop Arena
# Ronin on left
ronin = bpy.data.objects.get("Shadow_Ronin")
if ronin:
    ronin.location = (-2.35, 0.0, 0.0)
    ronin.rotation_euler = (0.0, 0.0, radians(-10.0))
    ronin.hide_render = False
    ronin.hide_viewport = False

# Valkyrie on right
valk = bpy.data.objects.get("Cyber_Valkyrie")
if valk:
    valk.location = (2.35, 0.0, 0.0)
    valk.rotation_euler = (0.0, 0.0, radians(10.0))
    valk.hide_render = False
    valk.hide_viewport = False

# Shinobi in center, slightly forward
if shinobi:
    shinobi.location = (0.0, -0.35, 0.0)
    shinobi.rotation_euler = (0.0, 0.0, radians(0.0))
    shinobi.hide_render = False
    shinobi.hide_viewport = False

# Move in-scene soft accent lights to match character locations
r_visor = bpy.data.objects.get("Ronin_Visor_Light")
if r_visor: r_visor.location = (-2.35, -0.45, 1.95)
r_spine = bpy.data.objects.get("Ronin_Spine_Light")
if r_spine: r_spine.location = (-2.35, 0.45, 1.65)

s_visor = bpy.data.objects.get("Shinobi_Visor_Light")
if s_visor: s_visor.location = (0.0, -0.35 - 0.45, 1.95)
s_spine = bpy.data.objects.get("Shinobi_Spine_Light")
if s_spine: s_spine.location = (0.0, -0.35 + 0.45, 1.65)

# Ensure camera is active
cam_obj = bpy.data.objects.get("KeyFury_Combat_Camera")
if cam_obj:
    bpy.context.scene.camera = cam_obj

# Unhide all arena objects
for o in bpy.data.objects:
    o.hide_render = False
    o.hide_viewport = False

# Remove obsolete 3D HUD boxes and old block dummy if any
hud_objs = ['Combat_HUD', 'HUD_Name_Ronin', 'HUD_Name_Valk', 'HUD_Text_Fight', 'HUD_Text_Round', 'Void_Assassin']
for name in hud_objs:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

# 3. Save .blend file
blend_path = os.path.join(work_dir, "KeyFury_3D_CyberRooftop.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> Saved Blender scene to: {blend_path}")

# 4. Render EEVEE Still
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.film_transparent = False
eevee_path = os.path.join(work_dir, "KeyFury_3D_Arena_Render.png")
scene.render.filepath = eevee_path
bpy.ops.render.render(write_still=True)
print(f">>> Final EEVEE render saved to: {eevee_path}")

# 5. Render Solid Workbench Still
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
bench_path = os.path.join(work_dir, "solid_viewport_test.png")
scene.render.filepath = bench_path
bpy.ops.render.render(write_still=True)
scene.render.engine = 'BLENDER_EEVEE'
print(f">>> Final Workbench render saved to: {bench_path}")

# 6. Export GLB
glb_path = os.path.join(work_dir, "KeyFury_3D_Arena.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=False)
print(f">>> Exported complete 3-fighter KeyFury_3D_Arena.glb to: {glb_path}")
print(">>> ARENA FINALIZATION WITH 3 FIGHTERS COMPLETED SUCCESSFULLY!")

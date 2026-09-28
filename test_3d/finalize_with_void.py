import bpy
import os
from math import radians

print(">>> Starting 4-Fighter Arena Finalization & GLB Exports...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"

# 1. Standalone Export of Void_Assassin.glb at origin (0, 0, 0)
void_obj = bpy.data.objects.get("Void_Assassin")
if void_obj:
    void_obj.location = (0.0, 0.0, 0.0)
    void_obj.rotation_euler = (0.0, 0.0, 0.0)
    bpy.ops.object.select_all(action='DESELECT')
    void_obj.select_set(True)
    bpy.context.view_layer.objects.active = void_obj
    standalone_path = os.path.join(work_dir, "Void_Assassin.glb")
    bpy.ops.export_scene.gltf(
        filepath=standalone_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False
    )
    print(f">>> Exported standalone Void_Assassin.glb to: {standalone_path}")
else:
    print("WARNING: Void_Assassin object not found in scene!")

# 2. Position all four fighters on the Cyber Rooftop Arena
# Ronin on outer left
ronin = bpy.data.objects.get("Shadow_Ronin")
if ronin:
    ronin.location = (-2.55, 0.20, 0.0)
    ronin.rotation_euler = (0.0, 0.0, radians(-12.0))
    ronin.hide_render = False
    ronin.hide_viewport = False

# Valkyrie on outer right
valk = bpy.data.objects.get("Cyber_Valkyrie")
if valk:
    valk.animation_data_clear()
    valk.location = (2.55, 0.20, 0.0)
    valk.rotation_euler = (0.0, 0.0, radians(12.0))
    valk.hide_render = False
    valk.hide_viewport = False
    valk.hide_set(False)

# Shinobi in center-left, slightly forward
shinobi = bpy.data.objects.get("Volt_Shinobi")
if shinobi:
    shinobi.location = (-0.88, -0.38, 0.0)
    shinobi.rotation_euler = (0.0, 0.0, radians(-4.0))
    shinobi.hide_render = False
    shinobi.hide_viewport = False
    shinobi.hide_set(False)

# Void Assassin in center-right, slightly forward
if void_obj:
    void_obj.location = (0.88, -0.38, 0.0)
    void_obj.rotation_euler = (0.0, 0.0, radians(4.0))
    void_obj.hide_render = False
    void_obj.hide_viewport = False
    void_obj.hide_set(False)

# Move in-scene soft accent lights to match character locations
r_visor = bpy.data.objects.get("Ronin_Visor_Light")
if r_visor: r_visor.location = (-2.55, 0.20 - 0.45, 1.95)
r_spine = bpy.data.objects.get("Ronin_Spine_Light")
if r_spine: r_spine.location = (-2.55, 0.20 + 0.45, 1.65)

s_visor = bpy.data.objects.get("Shinobi_Visor_Light")
if s_visor: s_visor.location = (-0.88, -0.38 - 0.45, 1.95)
s_spine = bpy.data.objects.get("Shinobi_Spine_Light")
if s_spine: s_spine.location = (-0.88, -0.38 + 0.45, 1.65)

v_visor = bpy.data.objects.get("Void_Visor_Light")
if v_visor: v_visor.location = (0.88, -0.38 - 0.45, 1.70)
v_spine = bpy.data.objects.get("Void_Spine_Light")
if v_spine: v_spine.location = (0.88, -0.38 + 0.45, 1.45)

v_arc = bpy.data.objects.get("Valk_ArcCore_Light")
if v_arc: v_arc.location = (2.55, 0.20 - 0.32, 1.85)
v_back = bpy.data.objects.get("Valk_BackThruster_Light")
if v_back: v_back.location = (2.55, 0.20 + 0.38, 1.84)
v_wing = bpy.data.objects.get("Valk_WingThruster_Light")
if v_wing: v_wing.location = (2.55 + 0.45, 0.20 + 0.38, 1.96)
v_gaunt = bpy.data.objects.get("Valk_Gauntlet_Light")
if v_gaunt: v_gaunt.location = (2.55 - 0.48, 0.20 - 0.28, 1.30)
v_side = bpy.data.objects.get("Valk_Side_Fill")
if v_side: v_side.location = (2.55 + 3.0, 0.20, 1.30)

# Ensure active camera
cam_obj = bpy.data.objects.get("KeyFury_Combat_Camera")
if cam_obj:
    bpy.context.scene.camera = cam_obj

# Unhide all arena objects
for o in bpy.data.objects:
    o.hide_render = False
    o.hide_viewport = False

# Remove obsolete 3D HUD boxes if any
hud_objs = ['Combat_HUD', 'HUD_Name_Ronin', 'HUD_Name_Valk', 'HUD_Text_Fight', 'HUD_Text_Round']
for name in hud_objs:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)

# Select Void_Assassin as active object
bpy.ops.object.select_all(action='DESELECT')
if void_obj:
    void_obj.select_set(True)
    bpy.context.view_layer.objects.active = void_obj

# Configure 3D view: clean Material Preview with closed N-panel
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.show_region_ui = False
                    space.shading.type = 'MATERIAL'

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

# 5. Render Workbench Solid Still (shows all 4 fighters in solid mode)
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
print(f">>> Exported complete 4-fighter KeyFury_3D_Arena.glb to: {glb_path}")

# 7. Capture GUI screenshot
bpy.ops.screen.screenshot(filepath=os.path.join(work_dir, "blender_four_fighters_viewport.png"))
print(">>> GUI screenshot saved to blender_four_fighters_viewport.png")
print(">>> ARENA FINALIZATION WITH 4 FIGHTERS COMPLETED SUCCESSFULLY!")

"""
Master Configuration & Calibration Script for Character 3: Volt Shinobi (Raijin)
KeyFury 3D Rigging & Blender Integration Pipeline

Functional Improvements:
1. Symmetrical side-view and front-view body balance (centering torso, spine, hips, neck, head).
2. Symmetrical leg and foot alignment (Thigh.L/R at X=±0.185).
3. Exact anatomical arm and hand bone placement for Dual Lightning Kunai.
4. High-fidelity vertex weight overhaul:
   - Hand.R assigned 100% full weight on the right Kunai and glove grip.
   - Hand.L assigned 100% full weight on the left Kunai and reverse-grip.
5. Ground contact calibration (min Z = 0.0000).
6. Updated Blender scene and standalone GLB export for game engine integration.
"""

import bpy
import bmesh
import math
import mathutils
import os

SOURCE_BLEND = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"
WEB_ASSETS_DIR = r"d:\Keyboard stickman warrior\apps\web\public\assets\3d"
TEST_3D_DIR = r"d:\Keyboard stickman warrior\test_3d"

print("======================================================================")
print(">>> CALIBRATING CHARACTER 3: VOLT SHINOBI IN BLENDER <<<")
print("======================================================================")

# 1. Open Source Blend File
bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)

# Purge any stray icosphere objects
for obj in list(bpy.data.objects):
    if "icosphere" in obj.name.lower():
        bpy.data.objects.remove(obj, do_unlink=True)

mesh_obj = bpy.data.objects.get("Volt_Shinobi")
if not mesh_obj:
    raise RuntimeError("Volt_Shinobi object not found in blend file!")

print(f"Found mesh: {mesh_obj.name}, verts: {len(mesh_obj.data.vertices)}")

# Remove any old armatures associated with Volt_Shinobi
for obj in list(bpy.data.objects):
    if "Volt_Shinobi_Rig" in obj.name or "Shinobi_Rig" in obj.name:
        bpy.data.objects.remove(obj, do_unlink=True)

# 2. Side-View & Front-View Proportion & Balance Calibration
verts = mesh_obj.data.vertices
min_z = min(v.co.z for v in verts)
max_z = max(v.co.z for v in verts)
min_x = min(v.co.x for v in verts)
max_x = max(v.co.x for v in verts)
min_y = min(v.co.y for v in verts)
max_y = max(v.co.y for v in verts)

# Calculate torso core center (head, chest, spine, hips) to align the sagittal plane
core_verts = [v for v in verts if abs(v.co.x) < 0.20 and 0.40 * (max_z - min_z) <= (v.co.z - min_z) <= 0.85 * (max_z - min_z)]
if core_verts:
    cx = sum(v.co.x for v in core_verts) / len(core_verts)
    cy = sum(v.co.y for v in core_verts) / len(core_verts)
else:
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0

print(f"Volt Shinobi Core Offset: X={cx:.4f}m, Y={cy:.4f}m. Centering to (0, 0, 0)...")

# Shift mesh geometry so torso core is centered at (0, 0) and feet at Z=0.0000
mesh_obj.data.transform(mathutils.Matrix.Translation((-cx, -cy, -min_z)))
mesh_obj.location = (0, 0, 0)
mesh_obj.data.update()

height = max(v.co.z for v in mesh_obj.data.vertices)
hw_l = abs(min(v.co.x for v in mesh_obj.data.vertices))
hw_r = max(v.co.x for v in mesh_obj.data.vertices)
hw = max(hw_l, hw_r)

print(f"Volt Shinobi Calibrated Height: {height:.4f}m, Half-Width: {hw:.4f}m")

# 3. Build Anatomically Calibrated 20-Bone Humanoid Armature
arm_data = bpy.data.armatures.new("Volt_Shinobi_Rig_Data")
arm_obj = bpy.data.objects.new("Volt_Shinobi_Rig", arm_data)
bpy.context.scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
arm_obj.select_set(True)

win = bpy.context.window_manager.windows[0]
with bpy.context.temp_override(window=win, screen=win.screen, active_object=arm_obj, selected_objects=[arm_obj], selected_editable_objects=[arm_obj]):
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    root = eb.new("Root")
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.15)

    hips = eb.new("Hips")
    hips.head = (0, 0, height * 0.48)
    hips.tail = (0, 0, height * 0.56)
    hips.parent = root

    spine = eb.new("Spine")
    spine.head = (0, 0, height * 0.56)
    spine.tail = (0, 0, height * 0.69)
    spine.parent = hips

    chest = eb.new("Chest")
    chest.head = (0, 0, height * 0.69)
    chest.tail = (0, 0, height * 0.83)
    chest.parent = spine

    neck = eb.new("Neck")
    neck.head = (0, 0, height * 0.83)
    neck.tail = (0, 0, height * 0.88)
    neck.parent = chest

    head = eb.new("Head")
    head.head = (0, 0, height * 0.88)
    head.tail = (0, 0, height * 1.05)
    head.parent = neck

    # Right Arm & Weapon Socket Bone Chain (Symmetric Y = 0.0)
    sh_r = eb.new("Shoulder.R")
    sh_r.head = (hw * 0.18, 0.0, height * 0.79)
    sh_r.tail = (hw * 0.42, 0.0, height * 0.78)
    sh_r.parent = chest

    ua_r = eb.new("UpperArm.R")
    ua_r.head = (hw * 0.42, 0.0, height * 0.78)
    ua_r.tail = (hw * 0.66, 0.0, height * 0.65)
    ua_r.parent = sh_r

    fa_r = eb.new("Forearm.R")
    fa_r.head = (hw * 0.66, 0.0, height * 0.65)
    fa_r.tail = (hw * 0.82, 0.0, height * 0.54)
    fa_r.parent = ua_r

    h_r = eb.new("Hand.R")
    # Positioned at right Dual Lightning Kunai weapon socket
    h_r.head = (hw * 0.82, 0.0, height * 0.54)
    h_r.tail = (hw * 0.96, 0.0, height * 0.48)
    h_r.parent = fa_r

    # Left Arm & Weapon Socket Bone Chain (Symmetric Y = 0.0)
    sh_l = eb.new("Shoulder.L")
    sh_l.head = (-hw * 0.18, 0.0, height * 0.79)
    sh_l.tail = (-hw * 0.42, 0.0, height * 0.78)
    sh_l.parent = chest

    ua_l = eb.new("UpperArm.L")
    ua_l.head = (-hw * 0.42, 0.0, height * 0.78)
    ua_l.tail = (-hw * 0.66, 0.0, height * 0.65)
    ua_l.parent = sh_l

    fa_l = eb.new("Forearm.L")
    fa_l.head = (-hw * 0.66, 0.0, height * 0.65)
    fa_l.tail = (-hw * 0.82, 0.0, height * 0.54)
    fa_l.parent = ua_l

    h_l = eb.new("Hand.L")
    # Positioned at left Dual Lightning Kunai weapon socket
    h_l.head = (-hw * 0.82, 0.0, height * 0.54)
    h_l.tail = (-hw * 0.96, 0.0, height * 0.48)
    h_l.parent = fa_l

    # Symmetrical Leg Chains
    leg_x = 0.185

    # Right Leg
    th_r = eb.new("Thigh.R")
    th_r.head = (leg_x * 0.90, 0.0, height * 0.48)
    th_r.tail = (leg_x, 0.0, height * 0.26)
    th_r.parent = hips

    shn_r = eb.new("Shin.R")
    shn_r.head = (leg_x, 0.0, height * 0.26)
    shn_r.tail = (leg_x, 0.0, 0.12)
    shn_r.parent = th_r

    ft_r = eb.new("Foot.R")
    ft_r.head = (leg_x, 0.0, 0.12)
    ft_r.tail = (leg_x, -0.15, 0.005)
    ft_r.parent = shn_r

    # Left Leg
    th_l = eb.new("Thigh.L")
    th_l.head = (-leg_x * 0.90, 0.0, height * 0.48)
    th_l.tail = (-leg_x, 0.0, height * 0.26)
    th_l.parent = hips

    shn_l = eb.new("Shin.L")
    shn_l.head = (-leg_x, 0.0, height * 0.26)
    shn_l.tail = (-leg_x, 0.0, 0.12)
    shn_l.parent = th_l

    ft_l = eb.new("Foot.L")
    ft_l.head = (-leg_x, 0.0, 0.12)
    ft_l.tail = (-leg_x, -0.15, 0.005)
    ft_l.parent = shn_l

    bpy.ops.object.mode_set(mode='OBJECT')

# 4. Skinning & High-Fidelity Weight Painting Calibration
mesh_obj.vertex_groups.clear()
for mod in list(mesh_obj.modifiers):
    if mod.type == 'ARMATURE':
        mesh_obj.modifiers.remove(mod)

with bpy.context.temp_override(window=win, screen=win.screen, active_object=arm_obj, selected_objects=[mesh_obj, arm_obj], selected_editable_objects=[mesh_obj, arm_obj]):
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

vg_hand_r = mesh_obj.vertex_groups.get("Hand.R")
vg_fa_r = mesh_obj.vertex_groups.get("Forearm.R")
vg_hand_l = mesh_obj.vertex_groups.get("Hand.L")
vg_fa_l = mesh_obj.vertex_groups.get("Forearm.L")
vg_chest = mesh_obj.vertex_groups.get("Chest")
vg_spine = mesh_obj.vertex_groups.get("Spine")
vg_foot_l = mesh_obj.vertex_groups.get("Foot.L")
vg_foot_r = mesh_obj.vertex_groups.get("Foot.R")
vg_shin_l = mesh_obj.vertex_groups.get("Shin.L")
vg_shin_r = mesh_obj.vertex_groups.get("Shin.R")

for v in mesh_obj.data.vertices:
    # Right Hand & Dual Lightning Kunai solid weight reinforcement
    if v.co.x > (hw * 0.65):
        if v.co.x >= (hw * 0.78):
            if vg_hand_r: vg_hand_r.add([v.index], 1.0, 'REPLACE')
            if vg_fa_r: vg_fa_r.remove([v.index])
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])
        elif v.co.x >= (hw * 0.66):
            t = (v.co.x - hw * 0.66) / (hw * 0.12)
            t_smooth = t * t * (3.0 - 2.0 * t)
            if vg_hand_r: vg_hand_r.add([v.index], t_smooth, 'REPLACE')
            if vg_fa_r: vg_fa_r.add([v.index], 1.0 - t_smooth, 'REPLACE')
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])

    # Left Hand & Dual Lightning Kunai solid weight reinforcement
    if v.co.x < (-hw * 0.65):
        if v.co.x <= (-hw * 0.78):
            if vg_hand_l: vg_hand_l.add([v.index], 1.0, 'REPLACE')
            if vg_fa_l: vg_fa_l.remove([v.index])
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])
        elif v.co.x <= (-hw * 0.66):
            t = (abs(v.co.x) - hw * 0.66) / (hw * 0.12)
            t_smooth = t * t * (3.0 - 2.0 * t)
            if vg_hand_l: vg_hand_l.add([v.index], t_smooth, 'REPLACE')
            if vg_fa_l: vg_fa_l.add([v.index], 1.0 - t_smooth, 'REPLACE')
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])

    # Foot bone isolation
    if v.co.z > 0.18:
        if vg_foot_l: vg_foot_l.remove([v.index])
        if vg_foot_r: vg_foot_r.remove([v.index])
    elif v.co.z <= 0.035:
        if v.co.x < 0 and vg_foot_l:
            vg_foot_l.add([v.index], 1.0, 'REPLACE')
            if vg_shin_l: vg_shin_l.remove([v.index])
        elif v.co.x > 0 and vg_foot_r:
            vg_foot_r.add([v.index], 1.0, 'REPLACE')
            if vg_shin_r: vg_shin_r.remove([v.index])

# 5. Save Updated Master Blend File
bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND)
print(f">>> Saved updated master blend: {SOURCE_BLEND}")

# 6. Export Standalone Volt_Shinobi.glb
bpy.ops.object.select_all(action='DESELECT')
mesh_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj

web_path = os.path.join(WEB_ASSETS_DIR, "Volt_Shinobi.glb")
test_path = os.path.join(TEST_3D_DIR, "Volt_Shinobi.glb")

for target_path in [web_path, test_path]:
    with bpy.context.temp_override(window=win, screen=win.screen):
        bpy.ops.export_scene.gltf(
            filepath=target_path,
            export_format='GLB',
            use_selection=True,
            export_apply=False,
            export_skins=True,
            export_cameras=False,
            export_lights=False
        )
    print(f">>> Exported {target_path} ({os.path.getsize(target_path):,} bytes)")

print(">>> VOLT SHINOBI CALIBRATION COMPLETE!")

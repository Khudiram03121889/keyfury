"""
KeyFury 3D Roster Armature Rigging & Skinned GLB Exporter
Blender 5.2.1 LTS
Rigs all 4 fighters: Shadow Ronin, Volt Shinobi, Void Assassin, Cyber Valkyrie
Binds with 20-bone humanoid armature and automatic skin weights
Exports directly to apps/web/public/assets/3d/
"""

import bpy
import mathutils
import traceback
import os
from math import radians
from pathlib import Path

out_log = []
def log(msg):
    out_log.append(str(msg))
    print(msg)

WEB_ASSETS_DIR = r"D:\Keyboard stickman warrior\apps\web\public\assets\3d"
os.makedirs(WEB_ASSETS_DIR, exist_ok=True)

FIGHTERS = [
    {
        "name": "Shadow_Ronin",
        "export_file": "Shadow_Ronin.glb",
        "base_loc": (-2.55, 0.20, 0.0),
        "target_height": 2.15,
        "half_width": 0.45,
    },
    {
        "name": "Volt_Shinobi",
        "export_file": "Volt_Shinobi.glb",
        "base_loc": (-0.88, -0.38, 0.0),
        "target_height": 1.98,
        "half_width": 0.42,
    },
    {
        "name": "Void_Assassin",
        "export_file": "Void_Assassin.glb",
        "base_loc": (0.88, -0.38, 0.0),
        "target_height": 1.98,
        "half_width": 0.40,
    },
    {
        "name": "Cyber_Valkyrie",
        "export_file": "Cyber_Valkyrie.glb",
        "base_loc": (2.55, 0.20, 0.0),
        "target_height": 2.12,
        "half_width": 0.48,
    },
]

def build_humanoid_armature(name, height, hw):
    arm_data = bpy.data.armatures.new(f"{name}_Rig_Data")
    arm_obj = bpy.data.objects.new(f"{name}_Rig", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    # 1. Root & Hips
    root = eb.new("Root")
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.15)

    hips = eb.new("Hips")
    hips.head = (0, 0, height * 0.50)
    hips.tail = (0, 0, height * 0.57)
    hips.parent = root

    # 2. Spine, Chest, Neck, Head
    spine = eb.new("Spine")
    spine.head = (0, 0, height * 0.57)
    spine.tail = (0, 0, height * 0.70)
    spine.parent = hips

    chest = eb.new("Chest")
    chest.head = (0, 0, height * 0.70)
    chest.tail = (0, 0, height * 0.84)
    chest.parent = spine

    neck = eb.new("Neck")
    neck.head = (0, 0, height * 0.84)
    neck.tail = (0, 0, height * 0.89)
    neck.parent = chest

    head = eb.new("Head")
    head.head = (0, 0, height * 0.89)
    head.tail = (0, 0, height * 1.05)
    head.parent = neck

    # 3. Right Arm
    sh_r = eb.new("Shoulder.R")
    sh_r.head = (hw * 0.18, 0, height * 0.80)
    sh_r.tail = (hw * 0.45, 0, height * 0.79)
    sh_r.parent = chest

    ua_r = eb.new("UpperArm.R")
    ua_r.head = (hw * 0.45, 0, height * 0.79)
    ua_r.tail = (hw * 0.75, -0.05, height * 0.65)
    ua_r.parent = sh_r

    fa_r = eb.new("Forearm.R")
    fa_r.head = (hw * 0.75, -0.05, height * 0.65)
    fa_r.tail = (hw * 0.95, -0.12, height * 0.53)
    fa_r.parent = ua_r

    h_r = eb.new("Hand.R")
    h_r.head = (hw * 0.95, -0.12, height * 0.53)
    h_r.tail = (hw * 1.08, -0.16, height * 0.47)
    h_r.parent = fa_r

    # 4. Left Arm
    sh_l = eb.new("Shoulder.L")
    sh_l.head = (-hw * 0.18, 0, height * 0.80)
    sh_l.tail = (-hw * 0.45, 0, height * 0.79)
    sh_l.parent = chest

    ua_l = eb.new("UpperArm.L")
    ua_l.head = (-hw * 0.45, 0, height * 0.79)
    ua_l.tail = (-hw * 0.75, 0.05, height * 0.65)
    ua_l.parent = sh_l

    fa_l = eb.new("Forearm.L")
    fa_l.head = (-hw * 0.75, 0.05, height * 0.65)
    fa_l.tail = (-hw * 0.95, 0.12, height * 0.53)
    fa_l.parent = ua_l

    h_l = eb.new("Hand.L")
    h_l.head = (-hw * 0.95, 0.12, height * 0.53)
    h_l.tail = (-hw * 1.08, 0.16, height * 0.47)
    h_l.parent = fa_l

    # 5. Right Leg
    th_r = eb.new("Thigh.R")
    th_r.head = (hw * 0.32, 0, height * 0.50)
    th_r.tail = (hw * 0.36, 0.02, height * 0.26)
    th_r.parent = hips

    shn_r = eb.new("Shin.R")
    shn_r.head = (hw * 0.36, 0.02, height * 0.26)
    shn_r.tail = (hw * 0.38, 0, height * 0.06)
    shn_r.parent = th_r

    ft_r = eb.new("Foot.R")
    ft_r.head = (hw * 0.38, 0, height * 0.06)
    ft_r.tail = (hw * 0.38, -0.15, 0.01)
    ft_r.parent = shn_r

    # 6. Left Leg
    th_l = eb.new("Thigh.L")
    th_l.head = (-hw * 0.32, 0, height * 0.50)
    th_l.tail = (-hw * 0.36, 0.02, height * 0.26)
    th_l.parent = hips

    shn_l = eb.new("Shin.L")
    shn_l.head = (-hw * 0.36, 0.02, height * 0.26)
    shn_l.tail = (-hw * 0.38, 0, height * 0.06)
    shn_l.parent = th_l

    ft_l = eb.new("Foot.L")
    ft_l.head = (-hw * 0.38, 0, height * 0.06)
    ft_l.tail = (-hw * 0.38, -0.15, 0.01)
    ft_l.parent = shn_l

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

try:
    log("=== RIGGING AND EXPORTING ALL 4 KEYFURY FIGHTERS ===")
    
    for f in FIGHTERS:
        name = f["name"]
        obj = bpy.data.objects.get(name)
        if not obj:
            log(f"SKIPPING {name}: Object not found in scene")
            continue
        
        log(f"\n--- Rigging {name} ---")
        
        # Calculate bounding box in world space
        bpy.context.view_layer.update()
        world_verts = [obj.matrix_world @ mathutils.Vector(b) for b in obj.bound_box]
        min_x = min(v.x for v in world_verts)
        max_x = max(v.x for v in world_verts)
        min_y = min(v.y for v in world_verts)
        max_y = max(v.y for v in world_verts)
        min_z = min(v.z for v in world_verts)
        max_z = max(v.z for v in world_verts)
        
        center_x = (min_x + max_x) / 2.0
        center_y = (min_y + max_y) / 2.0
        height = max_z - min_z
        hw = max(0.35, (max_x - min_x) / 2.0)
        
        log(f"  Center: ({center_x:.2f}, {center_y:.2f}), Z-range: [{min_z:.2f}, {max_z:.2f}], Height: {height:.2f}")

        # Store original transform
        orig_loc = mathutils.Vector(obj.location)
        orig_rot = mathutils.Euler(obj.rotation_euler)
        
        # Move object so center_x, center_y = 0, and min_z = 0
        obj.location.x -= center_x
        obj.location.y -= center_y
        obj.location.z -= min_z
        
        # Apply transform so vertices are cleanly zero-centered
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

        # Clear any prior vertex groups or armature modifiers
        obj.vertex_groups.clear()
        for mod in list(obj.modifiers):
            if mod.type == 'ARMATURE':
                obj.modifiers.remove(mod)

        # Create calibrated humanoid armature
        arm_obj = build_humanoid_armature(name, height, hw)
        
        # Bind mesh to armature with automatic weights
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        arm_obj.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj
        
        bind_res = bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        log(f"  Binding result: {bind_res}, Vertex groups created: {len(obj.vertex_groups)}")

        # Select both armature and mesh for export
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        arm_obj.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj

        # Export to web assets directory
        export_path = os.path.join(WEB_ASSETS_DIR, f["export_file"])
        bpy.ops.export_scene.gltf(
            filepath=export_path,
            export_format='GLB',
            use_selection=True,
            export_apply=False,
            export_skins=True,
            export_cameras=False,
            export_lights=False
        )
        log(f"  Exported to {export_path} ({os.path.getsize(export_path):,} bytes)")

        # Cleanup created armature object from scene
        bpy.data.objects.remove(arm_obj, do_unlink=True)
        
        # Restore object position
        obj.location = orig_loc
        obj.rotation_euler = orig_rot
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    log("\n=== ALL FIGHTERS RIGGED AND EXPORTED SUCCESSFULLY ===")

except Exception as e:
    log("ERROR IN RIGGING PIPELINE: " + traceback.format_exc())

Path(r"D:\Keyboard stickman warrior\test_3d\build_rigged_roster_out.txt").write_text("\n".join(out_log), encoding="utf-8")

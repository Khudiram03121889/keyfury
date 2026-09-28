"""
KeyFury 3D Master Roster Build Script: Perfect Foot Geometry & Physical Ground Contact
Blender 5.2.1 LTS MCP Pipeline

Overhauls all 4 KeyFury fighters:
- Shadow Ronin (Cyan welt #00f0ff)
- Volt Shinobi (Gold welt #ffbe0b)
- Void Assassin (Amethyst welt #b5179e)
- Cyber Valkyrie (Crimson welt #ff0055)

Key Fixes:
1. Direct mesh zeroing and elevation correction (min_z = 0.0000, zero-centered).
2. Elimination of curved rocker stump bottoms via precision cutline.
3. Extrusion of cyberpunk combat boot welt conduit and planar outsole tread at Z = 0.0000.
4. Calibrated 20-bone humanoid armature with exact anatomical ankle centers.
5. Strict vertex weight isolation preventing shin leakage.
6. Clean GLB export to apps/web/public/assets/3d/ and test_3d/ with zero Icosphere artifacts.
"""

import bpy
import bmesh
import math
import mathutils
import os
from pathlib import Path

WEB_ASSETS_DIR = r"D:\Keyboard stickman warrior\apps\web\public\assets\3d"
TEST_3D_DIR = r"D:\Keyboard stickman warrior\test_3d"
SOURCE_BLEND = r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"

os.makedirs(WEB_ASSETS_DIR, exist_ok=True)
os.makedirs(TEST_3D_DIR, exist_ok=True)

FIGHTERS = [
    {
        "name": "Shadow_Ronin",
        "export_name": "Shadow_Ronin.glb",
        "glow_color": (0.0, 0.94, 1.0, 1.0), # Neon Cyan
        "glow_energy": 4.5,
        "cut_z": 0.0250,
    },
    {
        "name": "Volt_Shinobi",
        "export_name": "Volt_Shinobi.glb",
        "glow_color": (1.0, 0.74, 0.04, 1.0), # Neon Amber / Gold
        "glow_energy": 4.5,
        "cut_z": 0.0250,
    },
    {
        "name": "Void_Assassin",
        "export_name": "Void_Assassin.glb",
        "glow_color": (0.71, 0.09, 0.62, 1.0), # Neon Amethyst
        "glow_energy": 4.5,
        "cut_z": 0.0250,
    },
    {
        "name": "Cyber_Valkyrie",
        "export_name": "Cyber_Valkyrie.glb",
        "glow_color": (1.0, 0.0, 0.33, 1.0), # Neon Crimson
        "glow_energy": 4.5,
        "cut_z": 0.0250,
    },
]

print("======================================================================")
print("STARTING KEYFURY MASTER ROSTER BOOT & GROUND CONTACT PIPELINE")
print("======================================================================")

win = bpy.context.window_manager.windows[0]

for f_info in FIGHTERS:
    name = f_info["name"]
    export_name = f_info["export_name"]
    glow_col = f_info["glow_color"]
    glow_eng = f_info["glow_energy"]
    cut_z = f_info["cut_z"]
    
    print(f"\n>>> PROCESSING FIGHTER: {name} <<<")
    
    # 1. Open pristine source blend file
    bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)
    
    # Purge any stray objects
    for obj in list(bpy.data.objects):
        if "icosphere" in obj.name.lower():
            bpy.data.objects.remove(obj, do_unlink=True)
            
    mesh_obj = bpy.data.objects.get(name)
    if not mesh_obj:
        raise RuntimeError(f"Fighter mesh object '{name}' not found in source blend!")

    # 2. Direct mesh zeroing (zero-center X/Y, ground min Z to 0.0000)
    min_z = min(v.co.z for v in mesh_obj.data.vertices)
    min_x = min(v.co.x for v in mesh_obj.data.vertices)
    max_x = max(v.co.x for v in mesh_obj.data.vertices)
    min_y = min(v.co.y for v in mesh_obj.data.vertices)
    max_y = max(v.co.y for v in mesh_obj.data.vertices)
    
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    
    mesh_obj.data.transform(mathutils.Matrix.Translation((-cx, -cy, -min_z)))
    mesh_obj.location = (0, 0, 0)
    mesh_obj.data.update()
    
    # 3. Create & assign PBR boot materials
    mat_boot_tread = bpy.data.materials.new(f"Mat_{name}_Boot_Tread")
    mat_boot_tread.use_nodes = True
    n_tread = mat_boot_tread.node_tree.nodes
    n_tread.clear()
    o_tread = n_tread.new("ShaderNodeOutputMaterial")
    b_tread = n_tread.new("ShaderNodeBsdfPrincipled")
    b_tread.inputs["Base Color"].default_value = (0.015, 0.018, 0.025, 1.0)
    b_tread.inputs["Metallic"].default_value = 0.35
    b_tread.inputs["Roughness"].default_value = 0.65
    mat_boot_tread.node_tree.links.new(b_tread.outputs["BSDF"], o_tread.inputs["Surface"])

    mat_boot_glow = bpy.data.materials.new(f"Mat_{name}_Boot_Glow")
    mat_boot_glow.use_nodes = True
    n_glow = mat_boot_glow.node_tree.nodes
    n_glow.clear()
    o_glow = n_glow.new("ShaderNodeOutputMaterial")
    b_glow = n_glow.new("ShaderNodeBsdfPrincipled")
    b_glow.inputs["Base Color"].default_value = glow_col
    b_glow.inputs["Emission Color"].default_value = glow_col
    b_glow.inputs["Emission Strength"].default_value = glow_eng
    mat_boot_glow.node_tree.links.new(b_glow.outputs["BSDF"], o_glow.inputs["Surface"])

    mesh_obj.data.materials.append(mat_boot_tread)
    mesh_obj.data.materials.append(mat_boot_glow)
    idx_tread = len(mesh_obj.data.materials) - 2
    idx_glow  = len(mesh_obj.data.materials) - 1

    # 4. BMesh Foot Overhaul: Cut rocker curve & extrude planar ground contact sole
    bm = bmesh.new()
    bm.from_mesh(mesh_obj.data)

    cut_verts = [v for v in bm.verts if v.co.z < cut_z]
    print(f"  Cutting {len(cut_verts)} rocker vertices below Z={cut_z:.4f}")
    bmesh.ops.delete(bm, geom=cut_verts, context='VERTS')

    b_edges = [e for e in bm.edges if len(e.link_faces) == 1]
    left_edges = [e for e in b_edges if e.verts[0].co.x < 0]
    right_edges = [e for e in b_edges if e.verts[0].co.x > 0]

    ankle_centers = {}

    def extrude_tread_and_sole(edges, is_left):
        loop_verts = list(set(v for e in edges for v in e.verts))
        lcx = sum(v.co.x for v in loop_verts) / len(loop_verts)
        lcy = sum(v.co.y for v in loop_verts) / len(loop_verts)
        side_key = "left" if is_left else "right"
        ankle_centers[side_key] = (lcx, lcy)
        
        # Layer 1: Glowing Welt Conduit band down to Z = 0.0120
        r1 = bmesh.ops.extrude_edge_only(bm, edges=edges)
        v1 = [v for v in r1['geom'] if isinstance(v, bmesh.types.BMVert)]
        f1 = [f for f in r1['geom'] if isinstance(f, bmesh.types.BMFace)]
        for f in f1: f.material_index = idx_glow
        for v in v1:
            v.co.z = 0.0120
            v.co.x = lcx + (v.co.x - lcx) * 0.99
            v.co.y = lcy + (v.co.y - lcy) * 0.99
            
        e1 = [e for e in bm.edges if len(e.link_faces) == 1 and all(v in v1 for v in e.verts)]
        
        # Layer 2: Heavy carbon rubber outsole down to Z = 0.0000 (Planar Ground Contact!)
        r2 = bmesh.ops.extrude_edge_only(bm, edges=e1)
        v2 = [v for v in r2['geom'] if isinstance(v, bmesh.types.BMVert)]
        f2 = [f for f in r2['geom'] if isinstance(f, bmesh.types.BMFace)]
        for f in f2: f.material_index = idx_tread
        for v in v2:
            v.co.z = 0.0000 # EXACT GROUND CONTACT!
            v.co.x = lcx + (v.co.x - lcx) * 1.01
            v.co.y = lcy + (v.co.y - lcy) * 1.01
            
        e2 = [e for e in bm.edges if len(e.link_faces) == 1 and all(abs(v.co.z) < 1e-4 for v in e.verts)]
        
        # Fill bottom sole planar face
        sole_verts = list(set(v for e in e2 for v in e.verts))
        ordered = [sole_verts[0]]
        curr = ordered[0]
        while len(ordered) < len(sole_verts):
            for e in e2:
                if curr in e.verts:
                    other = e.other_vert(curr)
                    if other not in ordered:
                        ordered.append(other)
                        curr = other
                        break
            else:
                break
                
        if len(ordered) == len(sole_verts):
            sole_face = bm.faces.new(ordered)
            sole_face.material_index = idx_tread
            print(f"  Created sole face with {len(ordered)} verts for {'Left' if is_left else 'Right'}")

    extrude_tread_and_sole(left_edges, is_left=True)
    extrude_tread_and_sole(right_edges, is_left=False)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh_obj.data)
    bm.free()
    mesh_obj.data.update()

    ground_verts = [v for v in mesh_obj.data.vertices if abs(v.co.z) < 1e-4]
    print(f"  Ground contact vertices at Z=0.0000: {len(ground_verts)}")
    print(f"  Mesh Z bounds: [{min(v.co.z for v in mesh_obj.data.vertices):.4f}, {max(v.co.z for v in mesh_obj.data.vertices):.4f}]")

    # 5. Build Calibrated 20-Bone Humanoid Armature
    height = max(v.co.z for v in mesh_obj.data.vertices)
    hw = (max(v.co.x for v in mesh_obj.data.vertices) - min(v.co.x for v in mesh_obj.data.vertices)) / 2.0
    
    ankle_lx, ankle_ly = ankle_centers["left"]
    ankle_rx, ankle_ry = ankle_centers["right"]
    
    print(f"  Calibrated Left Ankle: ({ankle_lx:.4f}, {ankle_ly:.4f}), Right Ankle: ({ankle_rx:.4f}, {ankle_ry:.4f})")

    arm_data = bpy.data.armatures.new(f"{name}_Rig_Data")
    arm_obj = bpy.data.objects.new(f"{name}_Rig", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    with bpy.context.temp_override(window=win, screen=win.screen, active_object=arm_obj, selected_objects=[arm_obj], selected_editable_objects=[arm_obj]):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm_data.edit_bones

        root = eb.new("Root")
        root.head = (0, 0, 0)
        root.tail = (0, 0, 0.15)

        hips = eb.new("Hips")
        hips.head = (0, 0, height * 0.50)
        hips.tail = (0, 0, height * 0.57)
        hips.parent = root

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

        # Right Arm
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

        # Left Arm
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

        # Right Leg
        th_r = eb.new("Thigh.R")
        th_r.head = (ankle_rx * 0.75, 0, height * 0.50)
        th_r.tail = (ankle_rx * 0.90, 0.02, height * 0.26)
        th_r.parent = hips

        shn_r = eb.new("Shin.R")
        shn_r.head = (ankle_rx * 0.90, 0.02, height * 0.26)
        shn_r.tail = (ankle_rx, ankle_ry, 0.12)
        shn_r.parent = th_r

        ft_r = eb.new("Foot.R")
        ft_r.head = (ankle_rx, ankle_ry, 0.12)
        ft_r.tail = (ankle_rx, ankle_ry - 0.15, 0.005)
        ft_r.parent = shn_r

        # Left Leg
        th_l = eb.new("Thigh.L")
        th_l.head = (ankle_lx * 0.75, 0, height * 0.50)
        th_l.tail = (ankle_lx * 0.90, 0.02, height * 0.26)
        th_l.parent = hips

        shn_l = eb.new("Shin.L")
        shn_l.head = (ankle_lx * 0.90, 0.02, height * 0.26)
        shn_l.tail = (ankle_lx, ankle_ly, 0.12)
        shn_l.parent = th_l

        ft_l = eb.new("Foot.L")
        ft_l.head = (ankle_lx, ankle_ly, 0.12)
        ft_l.tail = (ankle_lx, ankle_ly - 0.15, 0.005)
        ft_l.parent = shn_l

        bpy.ops.object.mode_set(mode='OBJECT')

    # 6. Automatic Weight Binding & Precise Vertex Weight Calibration
    mesh_obj.vertex_groups.clear()
    for mod in list(mesh_obj.modifiers):
        if mod.type == 'ARMATURE':
            mesh_obj.modifiers.remove(mod)

    with bpy.context.temp_override(window=win, screen=win.screen, active_object=arm_obj, selected_objects=[mesh_obj, arm_obj], selected_editable_objects=[mesh_obj, arm_obj]):
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Clean weight painting isolation: clamp Foot.L and Foot.R to Z <= 0.18
    vg_foot_l = mesh_obj.vertex_groups.get("Foot.L")
    vg_foot_r = mesh_obj.vertex_groups.get("Foot.R")
    vg_shin_l = mesh_obj.vertex_groups.get("Shin.L")
    vg_shin_r = mesh_obj.vertex_groups.get("Shin.R")

    for v in mesh_obj.data.vertices:
        if v.co.z > 0.18:
            if vg_foot_l: vg_foot_l.remove([v.index])
            if vg_foot_r: vg_foot_r.remove([v.index])
        elif v.co.z <= 0.035:
            # Planar outsole and welt strictly 100% foot bone
            if v.co.x < 0 and vg_foot_l:
                vg_foot_l.add([v.index], 1.0, 'REPLACE')
                if vg_shin_l: vg_shin_l.remove([v.index])
            elif v.co.x > 0 and vg_foot_r:
                vg_foot_r.add([v.index], 1.0, 'REPLACE')
                if vg_shin_r: vg_shin_r.remove([v.index])

    # 7. Clean GLB Export (Web Assets and test_3d)
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    web_path = os.path.join(WEB_ASSETS_DIR, export_name)
    test_path = os.path.join(TEST_3D_DIR, export_name)

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
        print(f"  Saved GLB: {target_path} ({os.path.getsize(target_path):,} bytes)")

print("\n======================================================================")
print("ALL 4 KEYFURY FIGHTERS RIGGED, OVERHAULED, AND EXPORTED SUCCESSFULLY!")
print("======================================================================")

"""
High-Precision 3D Fighter Builder for KeyFury
Constructs fully connected, anatomically cohesive, beautifully detailed 3D models for:
- Shadow Ronin (Kage) - Precision Cyber-Samurai Stickman with Azure Plasma Katana & Kabuto
- Cyber Valkyrie (Freya) - Heavy Vanguard Exo-Brawler Stickman with Winged Helm & Hydraulic Gauntlets
Joins each character into a single clean unified mesh with zero scattered relationship lines!
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos

print(">>> Building high-precision 3D fighters...")

def get_mat(name):
    return bpy.data.materials.get(name)

mat_dark_carbon = get_mat("Mat_DarkCarbon")
mat_chrome_trim = get_mat("Mat_ChromeTrim")
mat_gold_accent = get_mat("Mat_GoldAccent")
mat_cyan_glow = get_mat("Mat_CyanGlow")
mat_magenta_glow = get_mat("Mat_MagentaGlow")
mat_crimson_glow = get_mat("Mat_CrimsonGlow")
mat_amber_glow = get_mat("Mat_AmberGlow")
mat_white_glow = get_mat("Mat_WhiteGlow")

# Create a blonde/gold energy material for Valkyrie's ponytail plume
mat_hair_gold = bpy.data.materials.new(name="Mat_HairGold")
mat_hair_gold.use_nodes = True
bsdf = mat_hair_gold.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.92, 0.72, 0.28, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.4
    bsdf.inputs['Roughness'].default_value = 0.35

# Helper functions for precision connected geometry
def create_limb(pt_a, pt_b, radius_a, radius_b=None, mat=None, segments=16):
    if radius_b is None:
        radius_b = radius_a
    va = mathutils.Vector(pt_a)
    vb = mathutils.Vector(pt_b)
    v = vb - va
    length = v.length
    if length < 0.001:
        return None
    mid = (va + vb) / 2.0
    rot = mathutils.Vector((0, 0, 1)).rotation_difference(v).to_euler()
    
    if abs(radius_a - radius_b) > 0.002:
        bpy.ops.mesh.primitive_cone_add(radius1=radius_a, radius2=radius_b, depth=length, vertices=segments, location=mid)
    else:
        bpy.ops.mesh.primitive_cylinder_add(radius=radius_a, depth=length, vertices=segments, location=mid)
    
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_sphere(pt, radius, mat=None, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=segments, location=pt)
    obj = bpy.context.active_object
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_box(pt, scale, rot_euler=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot_euler
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_cone(pt, r1, r2, depth, rot_euler=(0,0,0), mat=None, segments=12):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, vertices=segments, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot_euler
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

# ----------------------------------------------------------------------
# 1. BUILD SHADOW RONIN (KAGE)
# ----------------------------------------------------------------------
def build_shadow_ronin():
    parts = []
    
    # Anatomical Keypoints (Combat Pose)
    foot_r = (-2.05, -0.22, 0.06)
    ankle_r = (-2.10, -0.22, 0.14)
    knee_r = (-1.95, -0.20, 0.65)
    hip_r = (-2.48, -0.16, 1.15)
    
    foot_l = (-3.30, 0.22, 0.06)
    ankle_l = (-3.25, 0.22, 0.14)
    knee_l = (-3.05, 0.20, 0.65)
    hip_l = (-2.72, 0.16, 1.15)
    
    pelvis = (-2.60, 0.0, 1.15)
    waist = (-2.58, 0.0, 1.30)
    chest = (-2.52, 0.0, 1.65)
    neck = (-2.48, 0.0, 1.90)
    head = (-2.42, 0.0, 2.12)
    
    shoulder_r = (-2.40, -0.26, 1.72)
    elbow_r = (-2.02, -0.20, 1.55)
    hand_r = (-1.62, -0.14, 1.66)
    
    shoulder_l = (-2.64, 0.26, 1.72)
    elbow_l = (-2.45, 0.40, 1.44)
    hand_l = (-2.12, 0.32, 1.56)
    
    # --- Lower Body ---
    # Feet (Samurai combat boots with flat soles)
    parts.append(create_box((-2.00, -0.22, 0.06), (0.28, 0.14, 0.10), mat=mat_dark_carbon))
    parts.append(create_box((-3.25, 0.22, 0.06), (0.28, 0.14, 0.10), mat=mat_dark_carbon))
    
    # Shins (Ankle -> Knee)
    parts.append(create_sphere(ankle_r, 0.09, mat_dark_carbon))
    parts.append(create_limb(ankle_r, knee_r, 0.08, 0.10, mat=mat_dark_carbon))
    parts.append(create_sphere(knee_r, 0.11, mat_cyan_glow)) # Glowing cyber knee joint
    
    parts.append(create_sphere(ankle_l, 0.09, mat_dark_carbon))
    parts.append(create_limb(ankle_l, knee_l, 0.08, 0.10, mat=mat_dark_carbon))
    parts.append(create_sphere(knee_l, 0.11, mat_cyan_glow))
    
    # Knee Armor Caps (Hizayoroi)
    parts.append(create_box((knee_r[0]+0.06, knee_r[1], knee_r[2]), (0.08, 0.16, 0.14), (0, radians(25), 0), mat_chrome_trim))
    parts.append(create_box((knee_l[0]+0.06, knee_l[1], knee_l[2]), (0.08, 0.16, 0.14), (0, radians(-20), 0), mat_chrome_trim))
    
    # Thighs (Knee -> Hip)
    parts.append(create_limb(knee_r, hip_r, 0.10, 0.12, mat=mat_dark_carbon))
    parts.append(create_sphere(hip_r, 0.12, mat_dark_carbon))
    
    parts.append(create_limb(knee_l, hip_l, 0.10, 0.12, mat=mat_dark_carbon))
    parts.append(create_sphere(hip_l, 0.12, mat_dark_carbon))
    
    # Pelvis & Waist
    parts.append(create_sphere(pelvis, 0.20, mat_dark_carbon))
    parts.append(create_limb(pelvis, waist, 0.18, 0.16, mat=mat_dark_carbon))
    # Obi Belt Sash (Cyan Glow)
    parts.append(create_limb((waist[0], waist[1], waist[2]-0.06), (waist[0], waist[1], waist[2]+0.06), 0.22, 0.22, mat=mat_cyan_glow))
    
    # --- Torso & Armor ---
    parts.append(create_limb(waist, chest, 0.16, 0.22, mat=mat_dark_carbon))
    # Samurai Cuirass (Do) Chestplate
    parts.append(create_box((chest[0]+0.04, chest[1], chest[2]), (0.34, 0.44, 0.42), (0, radians(6), 0), mat_dark_carbon))
    # Chest Glowing Core Slit
    parts.append(create_box((chest[0]+0.21, chest[1], chest[2]), (0.04, 0.08, 0.32), (0, radians(6), 0), mat_cyan_glow))
    # Neck
    parts.append(create_limb(chest, neck, 0.12, 0.10, mat=mat_dark_carbon))
    parts.append(create_sphere(neck, 0.11, mat_dark_carbon))
    
    # --- Head & Kabuto Helmet ---
    parts.append(create_sphere(head, 0.22, mat_dark_carbon))
    # Kabuto Helmet Shell (Covers top and back)
    parts.append(create_sphere((head[0]-0.02, head[1], head[2]+0.04), 0.24, mat_dark_carbon))
    # Brow Trim Band
    parts.append(create_box((head[0]+0.12, head[1], head[2]+0.04), (0.12, 0.38, 0.08), (0, radians(8), 0), mat_gold_accent))
    # Horizontal Inset Cyan Visor HUD
    parts.append(create_box((head[0]+0.18, head[1], head[2]+0.02), (0.06, 0.28, 0.04), (0, radians(8), 0), mat_cyan_glow))
    
    # Kuwasagata Samurai Crest Horns (Curved swept gold horns)
    # Left Horn: root at forehead sweeping up & left
    parts.append(create_limb((head[0]+0.14, head[1]-0.08, head[2]+0.12), (head[0]+0.08, head[1]-0.32, head[2]+0.42), 0.04, 0.015, mat=mat_gold_accent))
    # Right Horn: root at forehead sweeping up & right
    parts.append(create_limb((head[0]+0.14, head[1]+0.08, head[2]+0.12), (head[0]+0.08, head[1]+0.32, head[2]+0.42), 0.04, 0.015, mat=mat_gold_accent))
    
    # Neck Guard Flanges (Shikoro)
    parts.append(create_box((head[0]-0.15, head[1]-0.18, head[2]-0.08), (0.16, 0.04, 0.18), (0, radians(-25), radians(-20)), mat_dark_carbon))
    parts.append(create_box((head[0]-0.15, head[1]+0.18, head[2]-0.08), (0.16, 0.04, 0.18), (0, radians(-25), radians(20)), mat_dark_carbon))
    parts.append(create_box((head[0]-0.22, head[1], head[2]-0.08), (0.06, 0.32, 0.18), (0, radians(-30), 0), mat_dark_carbon))
    
    # --- Dynamic Energy Scarf (Flowing S-curve trailing behind) ---
    scarf_pts = [
        (neck[0]-0.08, neck[1]-0.05, neck[2]+0.05),
        (neck[0]-0.40, neck[1]-0.12, neck[2]+0.08),
        (neck[0]-0.75, neck[1]-0.18, neck[2]+0.02),
        (neck[0]-1.10, neck[1]-0.25, neck[2]-0.10),
        (neck[0]-1.45, neck[1]-0.32, neck[2]-0.25),
    ]
    for si in range(len(scarf_pts)-1):
        parts.append(create_limb(scarf_pts[si], scarf_pts[si+1], 0.10 - si*0.012, 0.09 - si*0.012, mat=mat_cyan_glow))
    
    # --- Arms & Katana ---
    # Right Arm (Sword Arm: Shoulder -> Elbow -> Hand)
    parts.append(create_sphere(shoulder_r, 0.12, mat_cyan_glow))
    # Shoulder Pauldron (Sode)
    parts.append(create_box((shoulder_r[0], shoulder_r[1]-0.08, shoulder_r[2]+0.06), (0.24, 0.12, 0.20), (radians(20), 0, radians(15)), mat_dark_carbon))
    parts.append(create_box((shoulder_r[0], shoulder_r[1]-0.12, shoulder_r[2]+0.08), (0.20, 0.04, 0.16), (radians(20), 0, radians(15)), mat_cyan_glow))
    
    parts.append(create_limb(shoulder_r, elbow_r, 0.09, 0.08, mat=mat_dark_carbon))
    parts.append(create_sphere(elbow_r, 0.09, mat_cyan_glow))
    parts.append(create_limb(elbow_r, hand_r, 0.08, 0.07, mat=mat_dark_carbon))
    # Hand (Closed Fist wrapped around hilt)
    parts.append(create_sphere(hand_r, 0.09, mat_chrome_trim))
    
    # Left Arm (Poise / Guard Arm)
    parts.append(create_sphere(shoulder_l, 0.12, mat_cyan_glow))
    parts.append(create_box((shoulder_l[0], shoulder_l[1]+0.08, shoulder_l[2]+0.06), (0.24, 0.12, 0.20), (radians(-20), 0, radians(-15)), mat_dark_carbon))
    parts.append(create_box((shoulder_l[0], shoulder_l[1]+0.12, shoulder_l[2]+0.08), (0.20, 0.04, 0.16), (radians(-20), 0, radians(-15)), mat_cyan_glow))
    
    parts.append(create_limb(shoulder_l, elbow_l, 0.09, 0.08, mat=mat_dark_carbon))
    parts.append(create_sphere(elbow_l, 0.09, mat_cyan_glow))
    parts.append(create_limb(elbow_l, hand_l, 0.08, 0.07, mat=mat_dark_carbon))
    parts.append(create_sphere(hand_l, 0.09, mat_chrome_trim))
    
    # --- Azure Plasma Katana (Held in Right Hand) ---
    hilt_start = (hand_r[0]-0.18, hand_r[1]-0.04, hand_r[2]-0.12)
    hilt_tsuba = (hand_r[0]+0.14, hand_r[1]+0.03, hand_r[2]+0.09)
    # Wrapped Hilt (Tsuka)
    parts.append(create_limb(hilt_start, hilt_tsuba, 0.035, 0.035, mat=mat_dark_carbon))
    # Gold Pommel (Kashira)
    parts.append(create_sphere(hilt_start, 0.045, mat_gold_accent))
    # Gold Guard (Tsuba)
    tsuba_norm = mathutils.Vector(hilt_tsuba) - mathutils.Vector(hilt_start)
    rot_tsuba = mathutils.Vector((0,0,1)).rotation_difference(tsuba_norm).to_euler()
    parts.append(create_cone(hilt_tsuba, 0.11, 0.11, 0.02, rot_tsuba, mat=mat_gold_accent))
    
    # Plasma Blade (nagasa) - single continuous razor blade extending forward-upward
    blade_start = hilt_tsuba
    blade_mid = (hilt_tsuba[0]+0.75, hilt_tsuba[1]+0.08, hilt_tsuba[2]+0.42)
    blade_tip = (hilt_tsuba[0]+1.55, hilt_tsuba[1]+0.16, hilt_tsuba[2]+0.78)
    
    parts.append(create_limb(blade_start, blade_mid, 0.04, 0.035, mat=mat_cyan_glow))
    parts.append(create_limb(blade_mid, blade_tip, 0.035, 0.015, mat=mat_cyan_glow))
    
    # Filter valid parts
    valid_parts = [p for p in parts if p is not None]
    
    # Select and Join all into single unified mesh
    bpy.ops.object.select_all(action='DESELECT')
    for p in valid_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = valid_parts[0]
    bpy.ops.object.join()
    
    ronin = bpy.context.active_object
    ronin.name = "Shadow_Ronin"
    ronin.location = (0, 0, 0)
    print(">>> Shadow Ronin built and joined successfully into:", ronin.name)
    return ronin

# ----------------------------------------------------------------------
# 2. BUILD CYBER VALKYRIE (FREYA)
# ----------------------------------------------------------------------
def build_cyber_valkyrie():
    parts = []
    
    # Anatomical Keypoints (Heavy Brawler Stance)
    foot_l = (1.95, -0.28, 0.06)
    ankle_l = (2.00, -0.28, 0.16)
    knee_l = (1.85, -0.24, 0.65)
    hip_l = (2.42, -0.18, 1.12)
    
    foot_r = (3.45, 0.30, 0.06)
    ankle_r = (3.40, 0.30, 0.16)
    knee_r = (3.15, 0.26, 0.65)
    hip_r = (2.78, 0.18, 1.12)
    
    pelvis = (2.60, 0.0, 1.12)
    waist = (2.56, 0.0, 1.28)
    chest = (2.48, 0.0, 1.64)
    neck = (2.44, 0.0, 1.88)
    head = (2.38, 0.0, 2.12)
    
    shoulder_l = (2.32, -0.32, 1.70)
    elbow_l = (1.92, -0.24, 1.50)
    wrist_l = (1.52, -0.16, 1.58)
    fist_l = (1.28, -0.12, 1.62)
    
    shoulder_r = (2.66, 0.32, 1.70)
    elbow_r = (2.82, 0.44, 1.42)
    wrist_r = (2.44, 0.36, 1.50)
    fist_r = (2.16, 0.28, 1.54)
    
    # --- Lower Body ---
    # Heavy Stomper Boots
    parts.append(create_box((2.00, -0.28, 0.06), (0.34, 0.18, 0.12), mat=mat_dark_carbon))
    parts.append(create_box((3.40, 0.30, 0.06), (0.34, 0.18, 0.12), mat=mat_dark_carbon))
    
    # Shins & Heavy Greaves
    parts.append(create_sphere(ankle_l, 0.11, mat_dark_carbon))
    parts.append(create_limb(ankle_l, knee_l, 0.11, 0.14, mat=mat_dark_carbon))
    parts.append(create_sphere(knee_l, 0.14, mat_crimson_glow)) # Glowing Crimson Knee Joint
    
    parts.append(create_sphere(ankle_r, 0.11, mat_dark_carbon))
    parts.append(create_limb(ankle_r, knee_r, 0.11, 0.14, mat=mat_dark_carbon))
    parts.append(create_sphere(knee_r, 0.14, mat_crimson_glow))
    
    # Heavy Vanguard Knee Plates
    parts.append(create_box((knee_l[0]-0.08, knee_l[1], knee_l[2]), (0.10, 0.20, 0.18), (0, radians(-25), 0), mat_chrome_trim))
    parts.append(create_box((knee_r[0]-0.08, knee_r[1], knee_r[2]), (0.10, 0.20, 0.18), (0, radians(25), 0), mat_chrome_trim))
    
    # Reinforced Thighs
    parts.append(create_limb(knee_l, hip_l, 0.13, 0.16, mat=mat_dark_carbon))
    parts.append(create_sphere(hip_l, 0.16, mat_dark_carbon))
    # Thigh Armor Plate (Crimson)
    parts.append(create_box(((knee_l[0]+hip_l[0])/2 - 0.08, hip_l[1]-0.04, (knee_l[2]+hip_l[2])/2), (0.08, 0.18, 0.30), (0, radians(-35), 0), mat=mat_crimson_glow))
    
    parts.append(create_limb(knee_r, hip_r, 0.13, 0.16, mat=mat_dark_carbon))
    parts.append(create_sphere(hip_r, 0.16, mat_dark_carbon))
    parts.append(create_box(((knee_r[0]+hip_r[0])/2 - 0.08, hip_r[1]+0.04, (knee_r[2]+hip_r[2])/2), (0.08, 0.18, 0.30), (0, radians(35), 0), mat=mat_crimson_glow))
    
    # Pelvis & Heavy Waist Belt
    parts.append(create_sphere(pelvis, 0.24, mat_dark_carbon))
    parts.append(create_limb(pelvis, waist, 0.20, 0.18, mat=mat_dark_carbon))
    parts.append(create_box(waist, (0.44, 0.50, 0.14), mat=mat_crimson_glow))
    parts.append(create_box((waist[0]-0.22, waist[1], waist[2]), (0.04, 0.18, 0.16), mat=mat_gold_accent)) # Gold Buckle
    
    # --- Torso & Heavy Vanguard Cuirass ---
    parts.append(create_limb(waist, chest, 0.18, 0.24, mat=mat_dark_carbon))
    # Heavy Cuirass (Deep Crimson & Carbonite)
    parts.append(create_box((chest[0]-0.04, chest[1], chest[2]), (0.42, 0.54, 0.46), (0, radians(-8), 0), mat_dark_carbon))
    # Crimson Arc Core (Center Chest Reactor Turbine)
    parts.append(create_cone((chest[0]-0.24, chest[1], chest[2]+0.02), 0.14, 0.14, 0.06, (0, radians(90), 0), mat_gold_accent))
    parts.append(create_sphere((chest[0]-0.26, chest[1], chest[2]+0.02), 0.10, mat_crimson_glow))
    
    # Neck
    parts.append(create_limb(chest, neck, 0.14, 0.12, mat=mat_dark_carbon))
    parts.append(create_sphere(neck, 0.12, mat_dark_carbon))
    
    # --- Head, Valkyrie Helm & Wings ---
    parts.append(create_sphere(head, 0.24, mat_dark_carbon))
    # Helmet Shell
    parts.append(create_sphere((head[0]+0.02, head[1], head[2]+0.04), 0.26, mat_dark_carbon))
    # Glowing Angular Crimson Visor Slit
    parts.append(create_box((head[0]-0.19, head[1], head[2]+0.02), (0.08, 0.30, 0.05), (0, radians(-10), 0), mat_crimson_glow))
    
    # Iconic Valkyrie Golden Wing Crests (3 Tiered Feather Blades each side)
    # Left Wing (above left ear sweeping up and back)
    parts.append(create_limb((head[0]-0.02, head[1]-0.22, head[2]+0.10), (head[0]+0.28, head[1]-0.46, head[2]+0.48), 0.05, 0.015, mat=mat_gold_accent))
    parts.append(create_limb((head[0]+0.02, head[1]-0.22, head[2]+0.16), (head[0]+0.22, head[1]-0.42, head[2]+0.54), 0.04, 0.012, mat=mat_gold_accent))
    parts.append(create_limb((head[0]+0.06, head[1]-0.22, head[2]+0.22), (head[0]+0.18, head[1]-0.36, head[2]+0.58), 0.035, 0.01, mat=mat_gold_accent))
    
    # Right Wing (above right ear sweeping up and back)
    parts.append(create_limb((head[0]-0.02, head[1]+0.22, head[2]+0.10), (head[0]+0.28, head[1]+0.46, head[2]+0.48), 0.05, 0.015, mat=mat_gold_accent))
    parts.append(create_limb((head[0]+0.02, head[1]+0.22, head[2]+0.16), (head[0]+0.22, head[1]+0.42, head[2]+0.54), 0.04, 0.012, mat=mat_gold_accent))
    parts.append(create_limb((head[0]+0.06, head[1]+0.22, head[2]+0.22), (head[0]+0.18, head[1]+0.36, head[2]+0.58), 0.035, 0.01, mat=mat_gold_accent))
    
    # Blonde Valkyrie Ponytail Plume (Trailing out top-back of helm as in reference art!)
    plume_pts = [
        (head[0]+0.18, head[1], head[2]+0.22),
        (head[0]+0.42, head[1], head[2]+0.14),
        (head[0]+0.68, head[1], head[2]-0.02),
        (head[0]+0.92, head[1], head[2]-0.26),
    ]
    for pi in range(len(plume_pts)-1):
        parts.append(create_limb(plume_pts[pi], plume_pts[pi+1], 0.09 - pi*0.015, 0.08 - pi*0.015, mat=mat_hair_gold))
    
    # --- Heavy Pauldrons & Hydraulic Brawler Gauntlets ---
    # Left Shoulder & Massive Tiered Pauldron
    parts.append(create_sphere(shoulder_l, 0.15, mat_crimson_glow))
    parts.append(create_box((shoulder_l[0], shoulder_l[1]-0.12, shoulder_l[2]+0.10), (0.34, 0.22, 0.26), (radians(-15), 0, radians(-10)), mat_dark_carbon))
    parts.append(create_box((shoulder_l[0]-0.08, shoulder_l[1]-0.12, shoulder_l[2]+0.12), (0.18, 0.24, 0.06), (radians(-15), 0, radians(-10)), mat_crimson_glow))
    
    parts.append(create_limb(shoulder_l, elbow_l, 0.12, 0.11, mat=mat_dark_carbon))
    parts.append(create_sphere(elbow_l, 0.12, mat_crimson_glow))
    
    # Left Massive Hydraulic Gauntlet (Encasing elbow -> wrist -> fist)
    parts.append(create_limb(elbow_l, wrist_l, 0.16, 0.18, mat=mat_dark_carbon))
    # Hydraulic Piston Cylinders on top
    piston_l_a = (elbow_l[0]-0.02, elbow_l[1]-0.06, elbow_l[2]+0.14)
    piston_l_b = (wrist_l[0]-0.02, wrist_l[1]-0.06, wrist_l[2]+0.14)
    parts.append(create_limb(piston_l_a, piston_l_b, 0.045, 0.045, mat=mat_chrome_trim))
    parts.append(create_limb((piston_l_a[0], piston_l_a[1]+0.06, piston_l_a[2]), (piston_l_b[0], piston_l_b[1]+0.06, piston_l_b[2]), 0.045, 0.045, mat=mat_crimson_glow))
    # Heavy Armored Fist & Knuckle Strike Plates
    parts.append(create_box(fist_l, (0.32, 0.28, 0.28), mat=mat_dark_carbon))
    parts.append(create_box((fist_l[0]-0.16, fist_l[1], fist_l[2]), (0.04, 0.24, 0.22), mat=mat_crimson_glow)) # Glowing knuckle slot
    
    # Right Shoulder & Massive Pauldron
    parts.append(create_sphere(shoulder_r, 0.15, mat_crimson_glow))
    parts.append(create_box((shoulder_r[0], shoulder_r[1]+0.12, shoulder_r[2]+0.10), (0.34, 0.22, 0.26), (radians(15), 0, radians(10)), mat_dark_carbon))
    parts.append(create_box((shoulder_r[0]-0.08, shoulder_r[1]+0.12, shoulder_r[2]+0.12), (0.18, 0.24, 0.06), (radians(15), 0, radians(10)), mat_crimson_glow))
    
    parts.append(create_limb(shoulder_r, elbow_r, 0.12, 0.11, mat=mat_dark_carbon))
    parts.append(create_sphere(elbow_r, 0.12, mat_crimson_glow))
    
    # Right Cocked Hydraulic Gauntlet
    parts.append(create_limb(elbow_r, wrist_r, 0.16, 0.18, mat=mat_dark_carbon))
    piston_r_a = (elbow_r[0]-0.02, elbow_r[1]+0.06, elbow_r[2]+0.14)
    piston_r_b = (wrist_r[0]-0.02, wrist_r[1]+0.06, wrist_r[2]+0.14)
    parts.append(create_limb(piston_r_a, piston_r_b, 0.045, 0.045, mat=mat_chrome_trim))
    parts.append(create_limb((piston_r_a[0], piston_r_a[1]-0.06, piston_r_a[2]), (piston_r_b[0], piston_r_b[1]-0.06, piston_r_b[2]), 0.045, 0.045, mat=mat_crimson_glow))
    
    parts.append(create_box(fist_r, (0.32, 0.28, 0.28), mat=mat_dark_carbon))
    parts.append(create_box((fist_r[0]-0.16, fist_r[1], fist_r[2]), (0.04, 0.24, 0.22), mat=mat_crimson_glow))
    
    valid_parts = [p for p in parts if p is not None]
    
    bpy.ops.object.select_all(action='DESELECT')
    for p in valid_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = valid_parts[0]
    bpy.ops.object.join()
    
    valk = bpy.context.active_object
    valk.name = "Cyber_Valkyrie"
    valk.location = (0, 0, 0)
    print(">>> Cyber Valkyrie built and joined successfully into:", valk.name)
    return valk

# Run build
ronin = build_shadow_ronin()
valk = build_cyber_valkyrie()
print(">>> Both fighters built successfully with continuous, unified meshes!")

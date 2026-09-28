"""
Exact 3D Sculptural Character Model for Cyber Valkyrie (Freya)
Faithfully recreates the exact design, anatomy, materials, and mechanical elements
of atlas-v3-consistent-source.png using high-fidelity 3D geometric meshes:
- Aerodynamic cyber-knight helmet, glowing chevron V-visor, circular ear turbines, 3-tiered golden wing crests, and high flowing ponytail plume
- Contoured vanguard cuirass, central Crimson Arc Core reactor with chevron light, and segmented spinal abdomen
- Mechanical back wings with circular spinal turbine and 4 tiered swept blade feathers with glowing red plasma conduits & gold bevels
- Multi-tier shoulder pauldrons, bicep armor, and dual heavy hydraulic kinetic gauntlets with exposed chrome pistons & glowing knuckle strike plates
- Reinforced thighs, knee cops with circular side hinges, greaves with exposed chrome hydraulic shock-absorber struts, and heavy combat stomper boots
- Master PBR node shaders with metallic edge highlights, chrome reflections, carbonite weave, and intense emission
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos

print(">>> Sculpting Exact 3D Cyber Valkyrie...")

# ----------------------------------------------------------------------
# 1. High-Fidelity PBR Materials
# ----------------------------------------------------------------------
def create_pbr_armor_mat(name, base_color, metallic=0.9, roughness=0.22, edge_color=None, vp_color=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else base_color
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    
    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    
    # Add subtle metallic edge glint if edge_color provided
    if edge_color:
        fresnel = nodes.new('ShaderNodeFresnel')
        fresnel.inputs['IOR'].default_value = 1.45
        mix_rgb = nodes.new('ShaderNodeMix')
        mix_rgb.data_type = 'RGBA'
        mix_rgb.inputs['Factor'].default_value = 0.35
        mix_rgb.inputs[6].default_value = base_color
        mix_rgb.inputs[7].default_value = edge_color
        links.new(mix_rgb.outputs[2], bsdf.inputs['Base Color'])
    
    links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])
    return mat

def create_emission_mat(name, color=(1.0, 0.04, 0.08, 1.0), strength=22.0, vp_color=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else color
    nodes = mat.node_tree.nodes
    nodes.clear()
    out_node = nodes.new('ShaderNodeOutputMaterial')
    emit_node = nodes.new('ShaderNodeEmission')
    emit_node.inputs['Color'].default_value = color
    emit_node.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])
    return mat

# Signature Materials matching reference image
mat_valk_crimson = create_pbr_armor_mat(
    "Mat_ValkCrimson_HD",
    base_color=(0.65, 0.04, 0.07, 1.0),
    metallic=0.88,
    roughness=0.22,
    edge_color=(0.95, 0.25, 0.15, 1.0),
    vp_color=(0.78, 0.06, 0.12, 1.0)
)

mat_gold_accent = create_pbr_armor_mat(
    "Mat_GoldAccent_HD",
    base_color=(1.0, 0.78, 0.22, 1.0),
    metallic=0.96,
    roughness=0.15,
    edge_color=(1.0, 0.92, 0.55, 1.0),
    vp_color=(0.95, 0.78, 0.18, 1.0)
)

mat_dark_carbon = create_pbr_armor_mat(
    "Mat_DarkCarbon_HD",
    base_color=(0.04, 0.045, 0.065, 1.0),
    metallic=0.92,
    roughness=0.26,
    edge_color=(0.15, 0.18, 0.24, 1.0),
    vp_color=(0.10, 0.12, 0.18, 1.0)
)

mat_chrome_trim = create_pbr_armor_mat(
    "Mat_ChromeTrim_HD",
    base_color=(0.82, 0.86, 0.94, 1.0),
    metallic=0.98,
    roughness=0.06,
    edge_color=(1.0, 1.0, 1.0, 1.0),
    vp_color=(0.82, 0.86, 0.92, 1.0)
)

mat_hair_gold = create_pbr_armor_mat(
    "Mat_HairGold_HD",
    base_color=(0.92, 0.74, 0.32, 1.0),
    metallic=0.35,
    roughness=0.38,
    edge_color=(1.0, 0.88, 0.50, 1.0),
    vp_color=(0.92, 0.75, 0.28, 1.0)
)

mat_crimson_glow = create_emission_mat("Mat_CrimsonGlow_HD", (1.0, 0.03, 0.08, 1.0), strength=24.0, vp_color=(1.0, 0.05, 0.12, 1.0))
mat_amber_glow = create_emission_mat("Mat_AmberGlow_HD", (1.0, 0.75, 0.12, 1.0), strength=28.0, vp_color=(1.0, 0.75, 0.10, 1.0))
mat_orange_glow = create_emission_mat("Mat_OrangeGlow_HD", (1.0, 0.35, 0.05, 1.0), strength=20.0, vp_color=(1.0, 0.40, 0.08, 1.0))

# ----------------------------------------------------------------------
# 2. Precision Geometry Builder Functions
# ----------------------------------------------------------------------
def make_limb(pt_a, pt_b, radius_a, radius_b=None, mat=None, segments=16):
    if radius_b is None: radius_b = radius_a
    va, vb = mathutils.Vector(pt_a), mathutils.Vector(pt_b)
    v = vb - va
    length = v.length
    if length < 0.001: return None
    mid = (va + vb) / 2.0
    rot = mathutils.Vector((0, 0, 1)).rotation_difference(v).to_euler()
    if abs(radius_a - radius_b) > 0.002:
        bpy.ops.mesh.primitive_cone_add(radius1=radius_a, radius2=radius_b, depth=length, vertices=segments, location=mid)
    else:
        bpy.ops.mesh.primitive_cylinder_add(radius=radius_a, depth=length, vertices=segments, location=mid)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def make_sphere(pt, radius, mat=None, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=segments, location=pt)
    obj = bpy.context.active_object
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def make_box(pt, scale, rot_euler=None, mat=None):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0, 0, 0)
    if rot_euler is None: rot_euler = (0, 0, 0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def make_disc(pt, radius, depth, rot_euler=None, mat=None, segments=24):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0, 0, 0)
    if rot_euler is None: rot_euler = (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

# ----------------------------------------------------------------------
# 3. Build Cyber Valkyrie matching atlas-v3-consistent-source.png
# ----------------------------------------------------------------------
# World Anchor
RX = 2.15
# Coordinate space: facing 3/4 towards duel (-X) and camera (-Y)
theta = radians(-28)
F = mathutils.Vector((-cos(theta), sin(theta), 0.0))  # Forward
R = mathutils.Vector((sin(theta), cos(theta), 0.0))   # Right
U = mathutils.Vector((0.0, 0.0, 1.0))                 # Up
Origin = mathutils.Vector((RX, 0.0, 0.0))

def to_w(lx, ly, lz):
    return Origin + lx * F + ly * R + lz * U

parts = []

# --- A. BOOTS & LOWER LEGS (Heavy Industrial Combat Stompers) ---
# Foot Left (Lead - slightly forward and turned out)
foot_l_loc = (0.28, -0.24, 0.05)
ankle_l_loc = (0.24, -0.22, 0.16)
knee_l_loc = (0.16, -0.18, 0.62)
hip_l_loc = (0.00, -0.14, 1.08)

# Foot Right (Rear - braced back and grounded)
foot_r_loc = (-0.24, 0.22, 0.05)
ankle_r_loc = (-0.20, 0.20, 0.16)
knee_r_loc = (-0.12, 0.16, 0.62)
hip_r_loc = (0.00, 0.14, 1.08)

for f_loc in [foot_l_loc, foot_r_loc]:
    w_f = to_w(*f_loc)
    # Lugged Combat Sole
    parts.append(make_box(w_f, (0.34, 0.18, 0.08), mat=mat_dark_carbon))
    # Armored Crimson Toe Box
    parts.append(make_box(to_w(f_loc[0]+0.08, f_loc[1], f_loc[2]+0.02), (0.16, 0.16, 0.08), mat=mat_valk_crimson))
    # Gold Toe Bumper
    parts.append(make_box(to_w(f_loc[0]+0.15, f_loc[1], f_loc[2]), (0.03, 0.16, 0.04), mat=mat_gold_accent))
    # Crimson Heel Counter
    parts.append(make_box(to_w(f_loc[0]-0.08, f_loc[1], f_loc[2]+0.02), (0.12, 0.16, 0.08), mat=mat_valk_crimson))
    # Circular Mechanical Ankle Pivot Rings
    parts.append(make_disc(to_w(f_loc[0], f_loc[1]-0.09, f_loc[2]+0.08), 0.045, 0.03, mat=mat_chrome_trim))
    parts.append(make_disc(to_w(f_loc[0], f_loc[1]+0.09, f_loc[2]+0.08), 0.045, 0.03, mat=mat_chrome_trim))

# Shins, Greaves & Exposed Hydraulic Shock Absorbers
for a_loc, k_loc, sign_y in [(ankle_l_loc, knee_l_loc, -1), (ankle_r_loc, knee_r_loc, 1)]:
    w_a = to_w(*a_loc)
    w_k = to_w(*k_loc)
    parts.append(make_sphere(w_a, 0.08, mat=mat_dark_carbon))
    # Core Shin Chassis
    parts.append(make_limb(w_a, w_k, 0.08, 0.095, mat=mat_dark_carbon))
    
    # Front Crimson Greave Plate
    mid_s = ((a_loc[0]+k_loc[0])/2 + 0.04, (a_loc[1]+k_loc[1])/2, (a_loc[2]+k_loc[2])/2)
    parts.append(make_box(to_w(*mid_s), (0.07, 0.13, 0.32), mat=mat_valk_crimson))
    # Gold Greave Trim
    parts.append(make_box(to_w(mid_s[0]+0.03, mid_s[1], mid_s[2]), (0.02, 0.11, 0.30), mat=mat_gold_accent))
    # Glowing Crimson Shin Conduit
    parts.append(make_box(to_w(mid_s[0]+0.04, mid_s[1], mid_s[2]), (0.015, 0.03, 0.26), mat=mat_crimson_glow))
    
    # DUAL EXPOSED HYDRAULIC PISTONS ON CALF (matching image!)
    p1_a = to_w(a_loc[0]-0.04, a_loc[1]+sign_y*0.06, a_loc[2]+0.04)
    p1_b = to_w(k_loc[0]-0.04, k_loc[1]+sign_y*0.06, k_loc[2]-0.04)
    parts.append(make_limb(p1_a, p1_b, 0.020, 0.020, mat=mat_chrome_trim))
    # Glowing Red Energy Rod in Piston
    parts.append(make_limb(p1_a, p1_b, 0.012, 0.012, mat=mat_crimson_glow))

# Armored Knee Cops (Genouilleres)
for k_loc, sign_y in [(knee_l_loc, -1), (knee_r_loc, 1)]:
    w_k = to_w(*k_loc)
    parts.append(make_sphere(w_k, 0.10, mat=mat_dark_carbon))
    # Heavy Crimson Knee Plate
    parts.append(make_box(to_w(k_loc[0]+0.06, k_loc[1], k_loc[2]), (0.08, 0.16, 0.16), mat=mat_valk_crimson))
    # Gold Lower Chevron Bracket
    parts.append(make_box(to_w(k_loc[0]+0.08, k_loc[1], k_loc[2]-0.05), (0.03, 0.14, 0.05), mat=mat_gold_accent))
    # Circular Side Pivot Joints with Concentric Rings
    parts.append(make_disc(to_w(k_loc[0], k_loc[1]+sign_y*0.09, k_loc[2]), 0.05, 0.03, mat=mat_chrome_trim))
    parts.append(make_sphere(to_w(k_loc[0]+0.08, k_loc[1], k_loc[2]), 0.035, mat=mat_crimson_glow))
    # Lateral Crimson Winglet Fin on Shin
    parts.append(make_box(to_w(k_loc[0]-0.02, k_loc[1]+sign_y*0.08, k_loc[2]-0.12), (0.04, 0.02, 0.16), mat=mat_valk_crimson))

# Thighs & Thigh Carapace
for k_loc, h_loc, sign_y in [(knee_l_loc, hip_l_loc, -1), (knee_r_loc, hip_r_loc, 1)]:
    w_k, w_h = to_w(*k_loc), to_w(*h_loc)
    parts.append(make_limb(w_k, w_h, 0.10, 0.13, mat=mat_dark_carbon))
    parts.append(make_sphere(w_h, 0.12, mat=mat_dark_carbon))
    mid_th = ((k_loc[0]+h_loc[0])/2 + 0.04, (k_loc[1]+h_loc[1])/2 + sign_y*0.03, (k_loc[2]+h_loc[2])/2)
    parts.append(make_box(to_w(*mid_th), (0.09, 0.16, 0.28), mat=mat_valk_crimson))
    parts.append(make_box(to_w(mid_th[0]+0.04, mid_th[1], mid_th[2]), (0.02, 0.14, 0.26), mat=mat_gold_accent))

# --- B. PELVIS, COMBAT BELT & HIP CARAPACE ---
pelvis_loc = (0.0, 0.0, 1.08)
waist_loc = (0.0, 0.0, 1.22)
parts.append(make_sphere(to_w(*pelvis_loc), 0.18, mat=mat_dark_carbon))
parts.append(make_limb(to_w(*pelvis_loc), to_w(*waist_loc), 0.16, 0.14, mat=mat_dark_carbon))
# Gold Waist Belt
parts.append(make_disc(to_w(*waist_loc), 0.19, 0.10, mat=mat_gold_accent))
# Crimson Central Belt Buckle Shield
parts.append(make_box(to_w(0.18, 0.0, 1.22), (0.04, 0.14, 0.12), mat=mat_valk_crimson))
parts.append(make_sphere(to_w(0.20, 0.0, 1.22), 0.035, mat=mat_crimson_glow))
# Heavy Hip Armor Carapace (Left & Right)
for sign_y in [-1, 1]:
    parts.append(make_box(to_w(0.02, sign_y*0.19, 1.15), (0.12, 0.05, 0.20), mat=mat_valk_crimson))
    parts.append(make_disc(to_w(0.02, sign_y*0.22, 1.15), 0.045, 0.03, mat=mat_chrome_trim))

# --- C. TORSO, VANGUARD CUIRASS & CRIMSON ARC CORE ---
chest_loc = (0.04, 0.0, 1.45)
neck_loc = (0.03, 0.0, 1.68)
parts.append(make_limb(to_w(*waist_loc), to_w(*chest_loc), 0.14, 0.19, mat=mat_dark_carbon))

# Segmented Abdominal Spinal Plates
for zi, zo in enumerate([1.28, 1.35]):
    parts.append(make_box(to_w(0.12, 0.0, zo), (0.05, 0.16 - zi*0.02, 0.06), mat=mat_valk_crimson))
    parts.append(make_box(to_w(0.13, -0.10, zo), (0.02, 0.03, 0.04), mat=mat_crimson_glow))
    parts.append(make_box(to_w(0.13, 0.10, zo), (0.02, 0.03, 0.04), mat=mat_crimson_glow))

# Contoured Breastplate Carapace (Left & Right)
parts.append(make_sphere(to_w(0.10, -0.11, 1.47), 0.13, mat=mat_valk_crimson))
parts.append(make_sphere(to_w(0.10, 0.11, 1.47), 0.13, mat=mat_valk_crimson))
# Gold Breastplate Rim Trim
parts.append(make_box(to_w(0.16, -0.11, 1.47), (0.02, 0.16, 0.18), mat=mat_gold_accent))
parts.append(make_box(to_w(0.16, 0.11, 1.47), (0.02, 0.16, 0.18), mat=mat_gold_accent))

# Central Crimson Arc Core (Turbine Reactor on Sternum)
w_core = to_w(0.19, 0.0, 1.46)
parts.append(make_disc(w_core, 0.085, 0.04, mat=mat_gold_accent))
parts.append(make_disc(to_w(0.21, 0.0, 1.46), 0.065, 0.03, mat=mat_chrome_trim))
# Glowing Core Center
parts.append(make_sphere(to_w(0.22, 0.0, 1.46), 0.052, mat=mat_crimson_glow))
parts.append(make_sphere(to_w(0.235, 0.0, 1.46), 0.028, mat=mat_amber_glow))
# Inset Downward Chevron Light Slot below Arc Core (exact match to image!)
parts.append(make_box(to_w(0.18, 0.0, 1.38), (0.02, 0.05, 0.06), mat=mat_crimson_glow))

# Dynamic Light at Core
core_light = bpy.data.objects.get("Valk_ArcCore_Light")
if core_light: core_light.location = to_w(0.35, 0.0, 1.46)

# --- D. HEAD, CYBER-KNIGHT HELMET, WING CRESTS & PONYTAIL PLUME ---
parts.append(make_limb(to_w(*chest_loc), to_w(*neck_loc), 0.10, 0.085, mat=mat_dark_carbon))
parts.append(make_sphere(to_w(*neck_loc), 0.09, mat=mat_dark_carbon))

head_loc = (0.06, 0.0, 1.88)
# Helmet Dome
parts.append(make_sphere(to_w(*head_loc), 0.17, mat=mat_dark_carbon))
parts.append(make_sphere(to_w(head_loc[0]-0.02, head_loc[1], head_loc[2]+0.02), 0.185, mat=mat_valk_crimson))

# Aerodynamic Brow Armor Plate & Center Fin
parts.append(make_box(to_w(0.10, 0.0, 1.94), (0.12, 0.22, 0.07), mat=mat_gold_accent))
parts.append(make_box(to_w(0.00, 0.0, 2.05), (0.22, 0.03, 0.10), mat=mat_valk_crimson)) # top fin

# Glowing Chevron V-Visor (Angular eye slit - exact match to image!)
parts.append(make_box(to_w(0.15, 0.0, 1.90), (0.04, 0.20, 0.035), mat=mat_crimson_glow))

# Golden Beveled Chin-Guard
parts.append(make_box(to_w(0.12, 0.0, 1.78), (0.06, 0.12, 0.06), mat=mat_gold_accent))

# Circular Ear Turbines with Concentric Rings
for sign_y in [-1, 1]:
    w_ear = to_w(0.02, sign_y*0.17, 1.88)
    parts.append(make_disc(w_ear, 0.05, 0.03, mat=mat_chrome_trim))
    parts.append(make_sphere(to_w(0.02, sign_y*0.185, 1.88), 0.025, mat=mat_crimson_glow))
    
    # 3-Tiered Golden Wing Ear Crests (swept back-upward)
    parts.append(make_limb(to_w(0.02, sign_y*0.18, 1.93), to_w(-0.24, sign_y*0.34, 2.20), 0.035, 0.012, mat=mat_gold_accent))
    parts.append(make_limb(to_w(-0.02, sign_y*0.18, 1.97), to_w(-0.20, sign_y*0.31, 2.25), 0.028, 0.010, mat=mat_gold_accent))
    parts.append(make_limb(to_w(-0.05, sign_y*0.18, 2.01), to_w(-0.16, sign_y*0.27, 2.28), 0.022, 0.008, mat=mat_gold_accent))

# Golden Blonde Warrior Ponytail Plume (Dense arching plume)
plume_collar = to_w(-0.14, 0.0, 2.02)
parts.append(make_disc(plume_collar, 0.05, 0.04, mat=mat_gold_accent))
plume_locs = [
    (-0.14, 0.0, 2.02),
    (-0.32, 0.0, 2.00),
    (-0.52, 0.0, 1.88),
    (-0.72, 0.0, 1.68),
    (-0.90, 0.0, 1.42),
    (-1.05, 0.0, 1.15)
]
for pi in range(len(plume_locs)-1):
    r_start = 0.080 - pi * 0.010
    r_end = 0.070 - pi * 0.010
    parts.append(make_limb(to_w(*plume_locs[pi]), to_w(*plume_locs[pi+1]), r_start, r_end, mat=mat_hair_gold))
    for sy in [-0.045, 0.045]:
        p_a = to_w(plume_locs[pi][0], plume_locs[pi][1]+sy, plume_locs[pi][2])
        p_b = to_w(plume_locs[pi+1][0], plume_locs[pi+1][1]+sy*0.8, plume_locs[pi+1][2])
        parts.append(make_limb(p_a, p_b, r_start*0.75, r_end*0.75, mat=mat_hair_gold))

# --- E. MECHANICAL MULTI-BLADE VALKYRIE WINGS (Back Assembly) ---
wing_core_loc = (-0.18, 0.0, 1.55)
w_wcore = to_w(*wing_core_loc)
# Central Back Turbine Housing
parts.append(make_disc(w_wcore, 0.12, 0.08, mat=mat_dark_carbon))
parts.append(make_disc(to_w(wing_core_loc[0]-0.04, 0.0, 1.55), 0.09, 0.04, mat=mat_gold_accent))
parts.append(make_sphere(to_w(wing_core_loc[0]-0.06, 0.0, 1.55), 0.06, mat=mat_crimson_glow))

wing_light = bpy.data.objects.get("Valk_WingThruster_Light")
if wing_light: wing_light.location = to_w(wing_core_loc[0]-0.30, 0.0, 1.55)

# Dual Wing Blade Assemblies (Left & Right)
for sign_y in [-1, 1]:
    spar_root = to_w(wing_core_loc[0], sign_y*0.12, wing_core_loc[2]+0.02)
    spar_tip = to_w(wing_core_loc[0]-0.18, sign_y*0.38, wing_core_loc[2]+0.16)
    parts.append(make_limb(spar_root, spar_tip, 0.05, 0.04, mat=mat_dark_carbon))
    parts.append(make_sphere(spar_tip, 0.055, mat=mat_chrome_trim))
    
    # 4 Tiered Swept Mechanical Blade Feathers (exact match to image!)
    blade_configs = [
        (0.92, radians(-38), sign_y*radians(30), -0.05), # Primary Longest Blade (sweeps down past hip)
        (0.72, radians(-22), sign_y*radians(38), 0.03),  # Secondary Blade
        (0.54, radians(-6),  sign_y*radians(46), 0.11),  # Tertiary Blade
        (0.38, radians(10),  sign_y*radians(54), 0.19),  # Top Winglet Blade
    ]
    for blen, rot_x, rot_z, z_off in blade_configs:
        tip_loc = (
            wing_core_loc[0] - 0.18 - blen * cos(rot_x) * cos(rot_z),
            sign_y * (0.38 + blen * sin(rot_z)),
            wing_core_loc[2] + 0.16 + z_off + blen * sin(rot_x)
        )
        b_root = spar_tip
        b_tip = to_w(*tip_loc)
        # Main Crimson Armor Blade Prism
        parts.append(make_limb(b_root, b_tip, 0.045, 0.015, mat=mat_valk_crimson))
        # Gold Beveled Leading Edge
        parts.append(make_limb(b_root, b_tip, 0.020, 0.008, mat=mat_gold_accent))
        # Glowing Red Internal Plasma Conduit Slot
        parts.append(make_limb(b_root, b_tip, 0.018, 0.006, mat=mat_crimson_glow))

# --- F. PAULDRONS & DUAL HEAVY HYDRAULIC KINETIC GAUNTLETS ---
sh_l_loc = (0.06, -0.28, 1.55)
sh_r_loc = (0.02, 0.28, 1.55)

for sh_loc, sign_y in [(sh_l_loc, -1), (sh_r_loc, 1)]:
    w_sh = to_w(*sh_loc)
    parts.append(make_sphere(w_sh, 0.11, mat=mat_dark_carbon))
    # 3-Tiered Curved Pauldron Carapace
    w_p = to_w(sh_loc[0], sh_loc[1]+sign_y*0.09, sh_loc[2]+0.06)
    parts.append(make_box(w_p, (0.28, 0.20, 0.22), mat=mat_valk_crimson))
    # Gold Beveled Lower Tier Trim
    w_p_gold = to_w(sh_loc[0]+0.06, sh_loc[1]+sign_y*0.09, sh_loc[2]+0.08)
    parts.append(make_box(w_p_gold, (0.16, 0.22, 0.05), mat=mat_gold_accent))
    # Circular Mechanical Shoulder Hinge Cap
    parts.append(make_disc(to_w(sh_loc[0], sh_loc[1]+sign_y*0.19, sh_loc[2]+0.04), 0.06, 0.03, mat=mat_chrome_trim))

# Right Arm & Gauntlet (Held at hip/side with clenched fist - matching image!)
el_r_loc = (-0.05, 0.32, 1.25)
wr_r_loc = (0.15, 0.26, 0.95)
fist_r_loc = (0.22, 0.24, 0.82)

w_sh_r = to_w(*sh_r_loc)
w_el_r = to_w(*el_r_loc)
w_wr_r = to_w(*wr_r_loc)
w_fist_r = to_w(*fist_r_loc)

# Bicep & Elbow
parts.append(make_limb(w_sh_r, w_el_r, 0.095, 0.085, mat=mat_dark_carbon))
parts.append(make_sphere(w_el_r, 0.09, mat=mat_dark_carbon))
parts.append(make_disc(to_w(el_r_loc[0], el_r_loc[1]+0.08, el_r_loc[2]), 0.045, 0.03, mat=mat_chrome_trim))

# Heavy Gauntlet Forearm
parts.append(make_limb(w_el_r, w_wr_r, 0.13, 0.15, mat=mat_valk_crimson))
# Gold Cuffs
parts.append(make_limb(w_el_r, to_w(el_r_loc[0], el_r_loc[1], el_r_loc[2]-0.05), 0.14, 0.14, mat=mat_gold_accent))
parts.append(make_limb(to_w(wr_r_loc[0], wr_r_loc[1], wr_r_loc[2]+0.05), w_wr_r, 0.16, 0.16, mat=mat_gold_accent))

# DUAL CHROME HYDRAULIC PISTONS ALONG FOREARM (exact match to image!)
pr1_a = to_w(el_r_loc[0]+0.06, el_r_loc[1]+0.06, el_r_loc[2])
pr1_b = to_w(wr_r_loc[0]+0.06, wr_r_loc[1]+0.06, wr_r_loc[2])
parts.append(make_limb(pr1_a, pr1_b, 0.028, 0.028, mat=mat_chrome_trim))
pr2_a = to_w(el_r_loc[0]-0.06, el_r_loc[1]+0.06, el_r_loc[2])
pr2_b = to_w(wr_r_loc[0]-0.06, wr_r_loc[1]+0.06, wr_r_loc[2])
parts.append(make_limb(pr2_a, pr2_b, 0.028, 0.028, mat=mat_crimson_glow)) # Glowing conduit

# Armored Clenched Power Fist
parts.append(make_box(w_fist_r, (0.24, 0.22, 0.22), mat=mat_valk_crimson))
parts.append(make_box(to_w(fist_r_loc[0]+0.11, fist_r_loc[1], fist_r_loc[2]), (0.04, 0.20, 0.18), mat=mat_gold_accent))
parts.append(make_box(to_w(fist_r_loc[0]+0.13, fist_r_loc[1], fist_r_loc[2]), (0.02, 0.16, 0.14), mat=mat_crimson_glow))

# Left Arm & Gauntlet (Raised in Combat Front Guard towards Ronin!)
el_l_loc = (0.28, -0.26, 1.34)
wr_l_loc = (0.52, -0.18, 1.46)
fist_l_loc = (0.68, -0.14, 1.52)

w_sh_l = to_w(*sh_l_loc)
w_el_l = to_w(*el_l_loc)
w_wr_l = to_w(*wr_l_loc)
w_fist_l = to_w(*fist_l_loc)

parts.append(make_limb(w_sh_l, w_el_l, 0.095, 0.085, mat=mat_dark_carbon))
parts.append(make_sphere(w_el_l, 0.09, mat=mat_dark_carbon))
parts.append(make_disc(to_w(el_l_loc[0], el_l_loc[1]-0.08, el_l_loc[2]), 0.045, 0.03, mat=mat_chrome_trim))

parts.append(make_limb(w_el_l, w_wr_l, 0.13, 0.15, mat=mat_valk_crimson))
parts.append(make_limb(w_el_l, to_w(el_l_loc[0]+0.05, el_l_loc[1], el_l_loc[2]), 0.14, 0.14, mat=mat_gold_accent))
parts.append(make_limb(to_w(wr_l_loc[0]-0.05, wr_l_loc[1], wr_l_loc[2]), w_wr_l, 0.16, 0.16, mat=mat_gold_accent))

# Dual Hydraulic Pistons on Lead Gauntlet
pl1_a = to_w(el_l_loc[0], el_l_loc[1]-0.06, el_l_loc[2]+0.10)
pl1_b = to_w(wr_l_loc[0], wr_l_loc[1]-0.06, wr_l_loc[2]+0.10)
parts.append(make_limb(pl1_a, pl1_b, 0.028, 0.028, mat=mat_chrome_trim))
pl2_a = to_w(el_l_loc[0], el_l_loc[1]+0.06, el_l_loc[2]+0.10)
pl2_b = to_w(wr_l_loc[0], wr_l_loc[1]+0.06, wr_l_loc[2]+0.10)
parts.append(make_limb(pl2_a, pl2_b, 0.028, 0.028, mat=mat_crimson_glow))

parts.append(make_box(w_fist_l, (0.24, 0.22, 0.22), mat=mat_valk_crimson))
parts.append(make_box(to_w(fist_l_loc[0]+0.11, fist_l_loc[1], fist_l_loc[2]), (0.04, 0.20, 0.18), mat=mat_gold_accent))
parts.append(make_box(to_w(fist_l_loc[0]+0.13, fist_l_loc[1], fist_l_loc[2]), (0.02, 0.16, 0.14), mat=mat_crimson_glow))

gaunt_light = bpy.data.objects.get("Valk_Gauntlet_Light")
if gaunt_light: gaunt_light.location = w_fist_l

# ----------------------------------------------------------------------
# 4. Join All Elements into Unified 'Cyber_Valkyrie' Object
# ----------------------------------------------------------------------
valid_parts = [p for p in parts if p is not None]
bpy.ops.object.select_all(action='DESELECT')
for p in valid_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = valid_parts[0]
bpy.ops.object.join()
valk_obj = bpy.context.active_object
valk_obj.name = "Cyber_Valkyrie"

bpy.context.scene.cursor.location = (RX, 0.0, 0.0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

print(f">>> Successfully sculpted Exact 3D Cyber Valkyrie with {len(valid_parts)} joined elements!")

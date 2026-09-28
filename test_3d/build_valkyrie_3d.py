"""
Full 3D Sculptural Mesh Generator for Cyber Valkyrie (Freya)
Constructs a 100% true 3D character model matching atlas-v3-consistent-source.png:
- Mechanical 4-blade swept Valkyrie wings with glowing red thrusters & gold bevels
- Aerodynamic cyber-knight helmet with angular ruby visor & 3-tiered golden ear winglets
- High golden warrior ponytail plume arching gracefully down the back
- Heavy vanguard cuirass with central Crimson Arc Core turbine reactor
- Multi-tier shoulder pauldrons with gold trim
- Dual heavy hydraulic brawler gauntlets with twin chrome pistons & knuckle strike plates
- Reinforced thighs, armored knee cops, hydraulic greaves, and heavy stomper boots
- 100% true 3D geometry - ZERO flat image planes!
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos

print(">>> Building 100% True 3D Cyber Valkyrie...")

def get_or_make_mat(name, base_color=(0.1, 0.1, 0.1, 1.0), metallic=0.0, roughness=0.5, emission_color=(0,0,0,1), emission_strength=0.0, vp_color=None):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else base_color
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emission_color
            bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat

def get_or_make_emission(name, color=(1.0, 0.05, 0.1, 1.0), strength=16.0, vp_color=None):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else color
    nodes = mat.node_tree.nodes
    nodes.clear()
    out_node = nodes.new(type='ShaderNodeOutputMaterial')
    emit_node = nodes.new(type='ShaderNodeEmission')
    emit_node.inputs['Color'].default_value = color
    emit_node.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])
    return mat

mat_dark_carbon = get_or_make_mat("Mat_DarkCarbon", (0.035, 0.04, 0.065, 1.0), metallic=0.9, roughness=0.22, vp_color=(0.10, 0.12, 0.18, 1.0))
mat_valk_crimson = get_or_make_mat("Mat_ValkCrimson", (0.68, 0.04, 0.07, 1.0), metallic=0.88, roughness=0.22, vp_color=(0.78, 0.06, 0.12, 1.0))
mat_gold_accent = get_or_make_mat("Mat_GoldAccent", (1.0, 0.78, 0.22, 1.0), metallic=0.95, roughness=0.15, vp_color=(0.95, 0.78, 0.18, 1.0))
mat_chrome_trim = get_or_make_mat("Mat_ChromeTrim", (0.78, 0.82, 0.90, 1.0), metallic=0.98, roughness=0.08, vp_color=(0.82, 0.86, 0.92, 1.0))
mat_hair_gold = get_or_make_mat("Mat_HairGold", (0.92, 0.72, 0.28, 1.0), metallic=0.35, roughness=0.40, vp_color=(0.92, 0.75, 0.28, 1.0))

mat_crimson_glow = get_or_make_emission("Mat_CrimsonGlow", (1.0, 0.02, 0.08, 1.0), strength=18.0, vp_color=(1.0, 0.05, 0.12, 1.0))
mat_amber_glow = get_or_make_emission("Mat_AmberGlow", (1.0, 0.65, 0.05, 1.0), strength=14.0, vp_color=(1.0, 0.70, 0.10, 1.0))

# Geometry generation helpers
def create_cylinder_limb(pt_a, pt_b, radius_a, radius_b=None, mat=None, segments=16):
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

def create_sphere(pt, radius, mat=None, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segments, ring_count=segments, location=pt)
    obj = bpy.context.active_object
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_box(pt, scale, rot_euler=None, mat=None):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0,0,0)
    if rot_euler is None:
        rot_euler = (0,0,0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_disc(pt, radius, depth, rot_euler=None, mat=None, segments=24):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0,0,0)
    if rot_euler is None:
        rot_euler = (0,0,0)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def build_cyber_valkyrie_3d():
    parts = []
    
    # Root Center: X = 2.0, Y = 0.0, Z = 0.0
    # Facing Left (-X) towards Shadow Ronin
    RX = 2.0
    
    # -------------------------------------------------------------
    # 1. LEGS & COMBAT STOMPER BOOTS (Grounded Athletic Stance)
    # -------------------------------------------------------------
    # Lead Leg (Left): Stepped forward towards opponent (-X, -Y)
    foot_l = (RX - 0.55, -0.22, 0.05)
    ankle_l = (RX - 0.50, -0.22, 0.16)
    knee_l = (RX - 0.40, -0.20, 0.62)
    hip_l = (RX - 0.12, -0.16, 1.08)
    
    # Rear Leg (Right): Braced back (+X, +Y)
    foot_r = (RX + 0.55, 0.24, 0.05)
    ankle_r = (RX + 0.50, 0.24, 0.16)
    knee_r = (RX + 0.38, 0.22, 0.62)
    hip_r = (RX + 0.12, 0.16, 1.08)
    
    # Heavy Treaded Stomper Boots
    for f_pt, rot_z in [(foot_l, radians(15)), (foot_r, radians(-20))]:
        # Sole & Tread
        parts.append(create_box((f_pt[0], f_pt[1], 0.04), (0.34, 0.18, 0.08), (0, 0, rot_z), mat_dark_carbon))
        # Crimson Armored Toe Cap
        parts.append(create_box((f_pt[0]-0.08, f_pt[1], 0.07), (0.16, 0.16, 0.08), (0, radians(-15), rot_z), mat_valk_crimson))
        # Gold Toe Bumper Rim
        parts.append(create_box((f_pt[0]-0.15, f_pt[1], 0.05), (0.04, 0.16, 0.04), (0, 0, rot_z), mat_gold_accent))
        # Ankle Brace Armor
        parts.append(create_disc((f_pt[0]+0.06, f_pt[1], 0.14), 0.09, 0.12, (0, 0, rot_z), mat_dark_carbon))
        parts.append(create_disc((f_pt[0]+0.06, f_pt[1]-0.08, 0.14), 0.045, 0.04, (radians(90), 0, rot_z), mat_chrome_trim)) # side pivot
        parts.append(create_disc((f_pt[0]+0.06, f_pt[1]+0.08, 0.14), 0.045, 0.04, (radians(90), 0, rot_z), mat_chrome_trim))
    
    # Lower Legs & Greaves (Ankle -> Knee)
    for a_pt, k_pt, sign_y in [(ankle_l, knee_l, -1), (ankle_r, knee_r, 1)]:
        parts.append(create_sphere(a_pt, 0.08, mat_dark_carbon))
        # Core Shin Limb
        parts.append(create_cylinder_limb(a_pt, k_pt, 0.08, 0.10, mat_dark_carbon))
        # Front Crimson Greave Plate
        mid_shin = ((a_pt[0]+k_pt[0])/2 - 0.04, (a_pt[1]+k_pt[1])/2, (a_pt[2]+k_pt[2])/2)
        parts.append(create_box(mid_shin, (0.07, 0.13, 0.32), (0, radians(-10), 0), mat_valk_crimson))
        # Gold Greave Trim & Bevel
        parts.append(create_box((mid_shin[0]-0.03, mid_shin[1], mid_shin[2]), (0.02, 0.11, 0.30), (0, radians(-10), 0), mat_gold_accent))
        # Glowing Red Shin Conduit
        parts.append(create_box((mid_shin[0]-0.04, mid_shin[1], mid_shin[2]), (0.015, 0.03, 0.26), (0, radians(-10), 0), mat_crimson_glow))
        # Hydraulic Shock Absorber Pistons along rear calf
        piston_a = (a_pt[0]+0.06, a_pt[1]+sign_y*0.06, a_pt[2]+0.04)
        piston_b = (k_pt[0]+0.06, k_pt[1]+sign_y*0.06, k_pt[2]-0.04)
        parts.append(create_cylinder_limb(piston_a, piston_b, 0.022, 0.022, mat_chrome_trim))
    
    # Armored Knee Cops (Genouilleres)
    for k_pt, rot_x in [(knee_l, radians(-15)), (knee_r, radians(15))]:
        parts.append(create_sphere(k_pt, 0.10, mat_dark_carbon))
        # Heavy Crimson Knee Plate
        parts.append(create_box((k_pt[0]-0.06, k_pt[1], k_pt[2]), (0.08, 0.16, 0.16), (0, radians(-20), rot_x), mat_valk_crimson))
        # Gold Knee Rim
        parts.append(create_box((k_pt[0]-0.09, k_pt[1], k_pt[2]), (0.03, 0.14, 0.14), (0, radians(-20), rot_x), mat_gold_accent))
        # Glowing Red Knee Energy Node
        parts.append(create_disc((k_pt[0]-0.11, k_pt[1], k_pt[2]), 0.04, 0.02, (0, radians(70), rot_x), mat_crimson_glow))
        # Side Mechanical Pivot Discs
        parts.append(create_disc((k_pt[0], k_pt[1]-0.10, k_pt[2]), 0.045, 0.03, (radians(90), 0, 0), mat_chrome_trim))
        parts.append(create_disc((k_pt[0], k_pt[1]+0.10, k_pt[2]), 0.045, 0.03, (radians(90), 0, 0), mat_chrome_trim))
    
    # Thighs (Knee -> Hip)
    for k_pt, h_pt, sign_y in [(knee_l, hip_l, -1), (knee_r, hip_r, 1)]:
        parts.append(create_cylinder_limb(k_pt, h_pt, 0.10, 0.13, mat_dark_carbon))
        parts.append(create_sphere(h_pt, 0.12, mat_dark_carbon))
        # Massive Crimson Outer Thigh Armor Carapace
        mid_thigh = ((k_pt[0]+h_pt[0])/2 - 0.04, (k_pt[1]+h_pt[1])/2 + sign_y*0.04, (k_pt[2]+h_pt[2])/2)
        parts.append(create_box(mid_thigh, (0.08, 0.16, 0.30), (0, radians(-15), sign_y*radians(18)), mat_valk_crimson))
        # Gold Armor Bevel Strip
        parts.append(create_box((mid_thigh[0]-0.04, mid_thigh[1], mid_thigh[2]), (0.02, 0.14, 0.28), (0, radians(-15), sign_y*radians(18)), mat_gold_accent))
    
    # -------------------------------------------------------------
    # 2. PELVIS & COMBAT WAIST BELT
    # -------------------------------------------------------------
    pelvis = (RX, 0.0, 1.08)
    waist = (RX - 0.02, 0.0, 1.22)
    parts.append(create_sphere(pelvis, 0.18, mat_dark_carbon))
    parts.append(create_cylinder_limb(pelvis, waist, 0.16, 0.14, mat_dark_carbon))
    # Heavy Gold Combat Belt
    parts.append(create_disc((waist[0], waist[1], waist[2]), 0.19, 0.10, (0, 0, 0), mat_gold_accent))
    # Crimson Central Buckle Shield
    parts.append(create_box((waist[0]-0.19, waist[1], waist[2]), (0.04, 0.14, 0.12), (0, radians(-8), 0), mat_valk_crimson))
    parts.append(create_disc((waist[0]-0.21, waist[1], waist[2]), 0.035, 0.02, (0, radians(90), 0), mat_crimson_glow))
    # Hip Power Canisters (Left & Right)
    parts.append(create_cylinder_limb((waist[0], -0.20, waist[2]-0.06), (waist[0], -0.20, waist[2]+0.06), 0.035, 0.035, mat_chrome_trim))
    parts.append(create_cylinder_limb((waist[0], 0.20, waist[2]-0.06), (waist[0], 0.20, waist[2]+0.06), 0.035, 0.035, mat_chrome_trim))
    
    # -------------------------------------------------------------
    # 3. TORSO, HEAVY VANGUARD CUIRASS & CRIMSON ARC CORE
    # -------------------------------------------------------------
    chest = (RX - 0.06, 0.0, 1.45)
    neck = (RX - 0.08, 0.0, 1.68)
    parts.append(create_cylinder_limb(waist, chest, 0.14, 0.19, mat_dark_carbon))
    
    # Segmented Abdominal Spinal Plates
    parts.append(create_box((waist[0]-0.12, waist[1], waist[2]+0.10), (0.05, 0.18, 0.08), (0, radians(-10), 0), mat_valk_crimson))
    parts.append(create_box((waist[0]-0.13, waist[1]-0.11, waist[2]+0.08), (0.03, 0.03, 0.05), mat_crimson_glow)) # lateral status light
    parts.append(create_box((waist[0]-0.13, waist[1]+0.11, waist[2]+0.08), (0.03, 0.03, 0.05), mat_crimson_glow))
    
    # Heavy Vanguard Cuirass (Breastplate Carapace)
    # Pectoral plates (Left & Right)
    parts.append(create_box((chest[0]-0.08, -0.11, chest[2]+0.03), (0.16, 0.18, 0.22), (0, radians(-12), radians(-10)), mat_valk_crimson))
    parts.append(create_box((chest[0]-0.08, 0.11, chest[2]+0.03), (0.16, 0.18, 0.22), (0, radians(-12), radians(10)), mat_valk_crimson))
    # Gold Breastplate Rim & Filigree
    parts.append(create_box((chest[0]-0.16, -0.11, chest[2]+0.03), (0.02, 0.16, 0.20), (0, radians(-12), radians(-10)), mat_gold_accent))
    parts.append(create_box((chest[0]-0.16, 0.11, chest[2]+0.03), (0.02, 0.16, 0.20), (0, radians(-12), radians(10)), mat_gold_accent))
    
    # Central Crimson Arc Core (Turbine Reactor on Sternum)
    core_loc = (chest[0]-0.17, 0.0, chest[2]+0.02)
    # Gold Outer Turbine Ring
    parts.append(create_disc(core_loc, 0.085, 0.04, (0, radians(78), 0), mat_gold_accent))
    # Secondary Inner Chrome Ring
    parts.append(create_disc((core_loc[0]-0.02, core_loc[1], core_loc[2]), 0.065, 0.03, (0, radians(78), 0), mat_chrome_trim))
    # Glowing Reactor Turbine Center
    parts.append(create_sphere((core_loc[0]-0.03, core_loc[1], core_loc[2]), 0.052, mat_crimson_glow))
    # Inset Amber Core Spark
    parts.append(create_sphere((core_loc[0]-0.045, core_loc[1], core_loc[2]), 0.028, mat_amber_glow))
    
    # -------------------------------------------------------------
    # 4. HEAD, HELMET, WING CRESTS & PONYTAIL PLUME
    # -------------------------------------------------------------
    parts.append(create_cylinder_limb(chest, neck, 0.10, 0.085, mat_dark_carbon))
    parts.append(create_sphere(neck, 0.09, mat_dark_carbon))
    
    head = (RX - 0.10, 0.0, 1.88)
    # Base Head Core
    parts.append(create_sphere(head, 0.17, mat_dark_carbon))
    # Cyber Valkyrie Helmet Shell (Crimson)
    parts.append(create_sphere((head[0]+0.02, head[1], head[2]+0.02), 0.185, mat_valk_crimson))
    # Brow Armor Plate (Gold)
    parts.append(create_box((head[0]-0.08, head[1], head[2]+0.06), (0.12, 0.24, 0.07), (0, radians(-15), 0), mat_gold_accent))
    # Angular Glowing Ruby-Red Visor Slit
    parts.append(create_box((head[0]-0.14, head[1], head[2]+0.02), (0.05, 0.22, 0.035), (0, radians(-15), 0), mat_crimson_glow))
    # Helmet Crest Fin (Top Center Gold Spine)
    parts.append(create_box((head[0]+0.02, head[1], head[2]+0.19), (0.24, 0.03, 0.08), (0, radians(-25), 0), mat_gold_accent))
    
    # Ear Modules with Glowing Centers
    for sign_y in [-1, 1]:
        ear_pt = (head[0]-0.02, sign_y*0.17, head[2])
        parts.append(create_disc(ear_pt, 0.05, 0.03, (radians(90), 0, 0), mat_chrome_trim))
        parts.append(create_disc((ear_pt[0], ear_pt[1]+sign_y*0.015, ear_pt[2]), 0.025, 0.02, (radians(90), 0, 0), mat_crimson_glow))
        
        # 3-Tiered Golden Valkyrie Wing Ear Crests
        # Feather 1 (Primary - Sweeping Up & Back)
        f1_a = (head[0]-0.02, sign_y*0.18, head[2]+0.05)
        f1_b = (head[0]+0.24, sign_y*0.34, head[2]+0.32)
        parts.append(create_cylinder_limb(f1_a, f1_b, 0.035, 0.012, mat_gold_accent))
        # Feather 2 (Mid)
        f2_a = (head[0]+0.02, sign_y*0.18, head[2]+0.09)
        f2_b = (head[0]+0.20, sign_y*0.31, head[2]+0.37)
        parts.append(create_cylinder_limb(f2_a, f2_b, 0.028, 0.010, mat_gold_accent))
        # Feather 3 (Top)
        f3_a = (head[0]+0.05, sign_y*0.18, head[2]+0.13)
        f3_b = (head[0]+0.16, sign_y*0.27, head[2]+0.40)
        parts.append(create_cylinder_limb(f3_a, f3_b, 0.022, 0.008, mat_gold_accent))
    
    # Warrior Golden Blonde Ponytail Plume (Graceful Arching S-Curve)
    plume_collar = (head[0]+0.14, 0.0, head[2]+0.14)
    parts.append(create_disc(plume_collar, 0.05, 0.04, (0, radians(-30), 0), mat_gold_accent)) # gold hair collar
    plume_pts = [
        plume_collar,
        (head[0]+0.32, 0.0, head[2]+0.12),
        (head[0]+0.50, 0.0, head[2]+0.02),
        (head[0]+0.68, 0.0, head[2]-0.15),
        (head[0]+0.84, 0.0, head[2]-0.35),
    ]
    for pi in range(len(plume_pts)-1):
        r_start = 0.075 - pi * 0.012
        r_end = 0.065 - pi * 0.012
        parts.append(create_cylinder_limb(plume_pts[pi], plume_pts[pi+1], r_start, r_end, mat_hair_gold))
        # Add lateral strand volume
        for sy in [-0.04, 0.04]:
            p_a = (plume_pts[pi][0], plume_pts[pi][1]+sy, plume_pts[pi][2])
            p_b = (plume_pts[pi+1][0], plume_pts[pi+1][1]+sy*0.8, plume_pts[pi+1][2])
            parts.append(create_cylinder_limb(p_a, p_b, r_start*0.7, r_end*0.7, mat_hair_gold))
    
    # -------------------------------------------------------------
    # 5. VALKYRIE MECHANICAL WINGS (True 3D Back Assembly)
    # -------------------------------------------------------------
    wing_core = (RX + 0.16, 0.0, 1.55)
    # Central Wing Turbine Housing
    parts.append(create_disc(wing_core, 0.12, 0.08, (0, radians(90), 0), mat_dark_carbon))
    parts.append(create_disc((wing_core[0]+0.04, wing_core[1], wing_core[2]), 0.09, 0.04, (0, radians(90), 0), mat_gold_accent))
    parts.append(create_sphere((wing_core[0]+0.06, wing_core[1], wing_core[2]), 0.06, mat_crimson_glow)) # Glowing Wing Core
    
    # Left & Right Wing Assemblies
    for sign_y in [-1, 1]:
        # Wing Anchor Spar
        spar_root = (wing_core[0], sign_y*0.12, wing_core[2]+0.02)
        spar_tip = (wing_core[0]+0.18, sign_y*0.38, wing_core[2]+0.16)
        parts.append(create_cylinder_limb(spar_root, spar_tip, 0.05, 0.04, mat_dark_carbon))
        parts.append(create_sphere(spar_tip, 0.055, mat_chrome_trim))
        
        # 4 Tiered Swept Mechanical Blade Feathers
        # Blade Specs: (length, angle_x_deg, angle_z_deg, z_offset)
        blade_configs = [
            (0.85, radians(-35), sign_y*radians(32), -0.04), # Primary Long Blade (sweeps down past hip)
            (0.68, radians(-20), sign_y*radians(40), 0.04),  # Secondary Blade
            (0.50, radians(-5),  sign_y*radians(48), 0.12),  # Tertiary Blade
            (0.35, radians(12),  sign_y*radians(55), 0.20),  # Top Winglet
        ]
        
        for blen, rot_x, rot_z, z_off in blade_configs:
            b_root = (spar_tip[0], spar_tip[1], spar_tip[2]+z_off)
            # Blade vector pointing backwards (+X), outwards (sign_y * +Y), and downwards/upwards
            b_tip = (
                b_root[0] + blen * cos(rot_x) * cos(rot_z),
                b_root[1] + blen * sin(rot_z),
                b_root[2] + blen * sin(rot_x)
            )
            # Main Crimson Armor Blade Prism
            parts.append(create_cylinder_limb(b_root, b_tip, 0.045, 0.015, mat_valk_crimson))
            # Gold Bevel Leading Edge
            edge_root = (b_root[0]-0.015, b_root[1]-sign_y*0.01, b_root[2])
            edge_tip = (b_tip[0]-0.005, b_tip[1]-sign_y*0.005, b_tip[2])
            parts.append(create_cylinder_limb(edge_root, edge_tip, 0.02, 0.008, mat_gold_accent))
            # Glowing Red Internal Energy Plasma Slot
            slot_root = (b_root[0]+0.015, b_root[1]+sign_y*0.01, b_root[2])
            slot_tip = (b_tip[0]+0.005, b_tip[1]+sign_y*0.005, b_tip[2])
            parts.append(create_cylinder_limb(slot_root, slot_tip, 0.018, 0.006, mat_crimson_glow))
    
    # -------------------------------------------------------------
    # 6. HEAVY PAULDRONS & DUAL HYDRAULIC KINETIC BRAWLER GAUNTLETS
    # -------------------------------------------------------------
    shoulder_l = (RX - 0.08, -0.28, 1.55) # Lead Shoulder
    shoulder_r = (RX + 0.06, 0.28, 1.55)  # Rear Shoulder
    
    # Heavy Vanguard Pauldrons
    for sh_pt, sign_y, rot_y in [(shoulder_l, -1, radians(-15)), (shoulder_r, 1, radians(15))]:
        parts.append(create_sphere(sh_pt, 0.11, mat_dark_carbon))
        # Primary Curved Crimson Pauldron Carapace
        p_loc = (sh_pt[0], sh_pt[1]+sign_y*0.09, sh_pt[2]+0.06)
        parts.append(create_box(p_loc, (0.28, 0.20, 0.22), (0, rot_y, sign_y*radians(12)), mat_valk_crimson))
        # Gold Pauldron Rim & Hazard Trim
        parts.append(create_box((p_loc[0]-0.06, p_loc[1], p_loc[2]+0.02), (0.16, 0.22, 0.05), (0, rot_y, sign_y*radians(12)), mat_gold_accent))
        # Pauldron Side Mechanical Pivot Disc
        parts.append(create_disc((sh_pt[0], sh_pt[1]+sign_y*0.19, sh_pt[2]+0.04), 0.06, 0.03, (radians(90), 0, 0), mat_chrome_trim))
    
    # --- LEAD ARM & GAUNTLET (Raised in Front Guard) ---
    elbow_l = (RX - 0.48, -0.24, 1.35)
    wrist_l = (RX - 0.88, -0.16, 1.48)
    fist_l = (RX - 1.10, -0.12, 1.55)
    
    # Upper Arm
    parts.append(create_cylinder_limb(shoulder_l, elbow_l, 0.095, 0.085, mat_dark_carbon))
    parts.append(create_sphere(elbow_l, 0.09, mat_dark_carbon))
    parts.append(create_disc((elbow_l[0], elbow_l[1]-0.08, elbow_l[2]), 0.045, 0.03, (radians(90), 0, 0), mat_chrome_trim))
    
    # Forearm Gauntlet Casing (Crimson)
    parts.append(create_cylinder_limb(elbow_l, wrist_l, 0.13, 0.15, mat_valk_crimson))
    # Gold Gauntlet Trim Cuffs
    parts.append(create_cylinder_limb(elbow_l, (elbow_l[0]-0.06, elbow_l[1], elbow_l[2]), 0.14, 0.14, mat_gold_accent))
    parts.append(create_cylinder_limb((wrist_l[0]+0.06, wrist_l[1], wrist_l[2]), wrist_l, 0.16, 0.16, mat_gold_accent))
    
    # Twin Chrome Hydraulic Pistons along top of Gauntlet
    p1_a = (elbow_l[0], elbow_l[1]-0.06, elbow_l[2]+0.11)
    p1_b = (wrist_l[0], wrist_l[1]-0.06, wrist_l[2]+0.12)
    parts.append(create_cylinder_limb(p1_a, p1_b, 0.030, 0.030, mat_chrome_trim))
    p2_a = (elbow_l[0], elbow_l[1]+0.06, elbow_l[2]+0.11)
    p2_b = (wrist_l[0], wrist_l[1]+0.06, wrist_l[2]+0.12)
    parts.append(create_cylinder_limb(p2_a, p2_b, 0.030, 0.030, mat_crimson_glow)) # Glowing red hydraulic conduit
    
    # Heavy Armored Brawler Fist (Lead)
    parts.append(create_box(fist_l, (0.24, 0.22, 0.22), mat_valk_crimson))
    # Knuckle Strike Plates with Glowing Impact Slots
    parts.append(create_box((fist_l[0]-0.11, fist_l[1], fist_l[2]), (0.04, 0.20, 0.18), mat_gold_accent))
    parts.append(create_box((fist_l[0]-0.13, fist_l[1], fist_l[2]), (0.02, 0.16, 0.14), mat_crimson_glow))
    
    # --- REAR ARM & GAUNTLET (Cocked Near Ribs Ready to Smash) ---
    elbow_r = (RX + 0.25, 0.36, 1.25)
    wrist_r = (RX - 0.15, 0.24, 1.38)
    fist_r = (RX - 0.38, 0.18, 1.44)
    
    parts.append(create_cylinder_limb(shoulder_r, elbow_r, 0.095, 0.085, mat_dark_carbon))
    parts.append(create_sphere(elbow_r, 0.09, mat_dark_carbon))
    parts.append(create_disc((elbow_r[0], elbow_r[1]+0.08, elbow_r[2]), 0.045, 0.03, (radians(90), 0, 0), mat_chrome_trim))
    
    parts.append(create_cylinder_limb(elbow_r, wrist_r, 0.13, 0.15, mat_valk_crimson))
    parts.append(create_cylinder_limb(elbow_r, (elbow_r[0]-0.06, elbow_r[1], elbow_r[2]), 0.14, 0.14, mat_gold_accent))
    parts.append(create_cylinder_limb((wrist_r[0]+0.06, wrist_r[1], wrist_r[2]), wrist_r, 0.16, 0.16, mat_gold_accent))
    
    pr1_a = (elbow_r[0], elbow_r[1]+0.06, elbow_r[2]+0.11)
    pr1_b = (wrist_r[0], wrist_r[1]+0.06, wrist_r[2]+0.12)
    parts.append(create_cylinder_limb(pr1_a, pr1_b, 0.030, 0.030, mat_chrome_trim))
    pr2_a = (elbow_r[0], elbow_r[1]-0.06, elbow_r[2]+0.11)
    pr2_b = (wrist_r[0], wrist_r[1]-0.06, wrist_r[2]+0.12)
    parts.append(create_cylinder_limb(pr2_a, pr2_b, 0.030, 0.030, mat_crimson_glow))
    
    parts.append(create_box(fist_r, (0.24, 0.22, 0.22), mat_valk_crimson))
    parts.append(create_box((fist_r[0]-0.11, fist_r[1], fist_r[2]), (0.04, 0.20, 0.18), mat_gold_accent))
    parts.append(create_box((fist_r[0]-0.13, fist_r[1], fist_r[2]), (0.02, 0.16, 0.14), mat_crimson_glow))
    
    # -------------------------------------------------------------
    # 7. UNIFY INTO SINGLE 3D MESH OBJECT
    # -------------------------------------------------------------
    valid_parts = [p for p in parts if p is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for p in valid_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = valid_parts[0]
    bpy.ops.object.join()
    valk_3d = bpy.context.active_object
    valk_3d.name = "Cyber_Valkyrie"
    
    # Set origin to floor center (RX, 0, 0)
    bpy.context.scene.cursor.location = (RX, 0.0, 0.0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    print(f">>> Cyber Valkyrie 100% True 3D Mesh successfully built with {len(valid_parts)} joined elements!")
    return valk_3d

# Execute build
old_v = bpy.data.objects.get("Cyber_Valkyrie")
if old_v: bpy.data.objects.remove(old_v)
old_v3d = bpy.data.objects.get("Cyber_Valkyrie_3D")
if old_v3d: bpy.data.objects.remove(old_v3d)

valk = build_cyber_valkyrie_3d()

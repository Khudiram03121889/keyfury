"""
Master True 3D Volumetric Builder for Cyber Valkyrie (Freya).
Constructs a complete, 100% volumetric 3D character with:
- 3D Aerodynamic Valkyrie Helmet, ruby energy visor, 3-tiered golden ear winglets, and golden hair collar
- 3D Multi-strand flowing blonde ponytail plume arching gracefully down the back
- 3D Contoured Vanguard Cuirass with dual pectoral shells, golden filigree, and glowing Crimson Arc Core
- 3D Segmented abdominal chassis and golden combat fauld belt with crimson buckle
- 3D Dual-blade / 4-blade swept mechanical wings with chrome thruster sockets and ruby plasma channels
- 3D Tiered shoulder pauldrons with gold hazard trim and mechanical pivot hubs
- 3D Cybernetic arms with bicep hydraulics, elbow hinge discs, heavy brawler gauntlets with twin chrome pistons
- 3D Articulated mecha fists with gold knuckle strike plates and glowing impact nodes
- 3D Volumetric athletic legs: cylindrical thighs with crimson armor carapaces, mechanical knee hubs,
  shin greaves with rear calf hydraulic shock absorbers, and heavy treaded stomper boots
- 100% TRUE 3D VOLUMETRIC GEOMETRY with real depth from every single angle (360 degrees).
"""

import bpy
import mathutils
import math
from math import radians, sin, cos

print(">>> Building Master True 3D Volumetric Cyber Valkyrie...")

# 1. Setup Materials
def get_or_make_mat(name, base_color, metallic=0.0, roughness=0.5, vp_color=None):
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
    return mat

def get_or_make_emission(name, color, strength=16.0, vp_color=None):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else color
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    emit = nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_crimson = get_or_make_mat("Mat_Valk_Crimson", (0.68, 0.05, 0.08, 1.0), metallic=0.88, roughness=0.24, vp_color=(0.78, 0.06, 0.12, 1.0))
mat_gold = get_or_make_mat("Mat_Valk_Gold", (1.0, 0.78, 0.20, 1.0), metallic=0.95, roughness=0.16, vp_color=(0.95, 0.78, 0.18, 1.0))
mat_carbon = get_or_make_mat("Mat_Valk_Carbon", (0.04, 0.045, 0.065, 1.0), metallic=0.82, roughness=0.35, vp_color=(0.10, 0.12, 0.18, 1.0))
mat_chrome = get_or_make_mat("Mat_Valk_Chrome", (0.85, 0.88, 0.94, 1.0), metallic=0.98, roughness=0.06, vp_color=(0.85, 0.88, 0.94, 1.0))
mat_hair = get_or_make_mat("Mat_Valk_Hair", (0.92, 0.75, 0.32, 1.0), metallic=0.30, roughness=0.42, vp_color=(0.92, 0.75, 0.32, 1.0))

mat_plasma_glow = get_or_make_emission("Mat_Valk_PlasmaGlow", (1.0, 0.04, 0.08, 1.0), strength=18.0, vp_color=(1.0, 0.05, 0.12, 1.0))
mat_arc_core_glow = get_or_make_emission("Mat_Valk_ArcCoreGlow", (1.0, 0.70, 0.12, 1.0), strength=22.0, vp_color=(1.0, 0.72, 0.15, 1.0))

# 2. Cleanup old objects
for o in list(bpy.data.objects):
    if "Cyber_Valkyrie" in o.name or "Valk_" in o.name:
        if o.type != 'CAMERA' and o.type != 'LIGHT':
            bpy.data.objects.remove(o)

# 3. Geometry Helpers
valk_parts = []

def add_box(loc, size, rot=(0,0,0), mat=None, bevel=0.0):
    if isinstance(rot, bpy.types.Material):
        mat = rot
        rot = (0, 0, 0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.scale = size
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bevel > 0.001:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier='Bevel')
    bpy.ops.object.shade_smooth()
    if mat: obj.data.materials.append(mat)
    valk_parts.append(obj)
    return obj

def add_sphere(loc, radius, scale=(1,1,1), rot=(0,0,0), mat=None):
    if isinstance(scale, bpy.types.Material):
        mat = scale
        scale = (1, 1, 1)
    if isinstance(rot, bpy.types.Material):
        mat = rot
        rot = (0, 0, 0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=20, ring_count=16, location=loc)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    bpy.ops.object.shade_smooth()
    if mat: obj.data.materials.append(mat)
    valk_parts.append(obj)
    return obj

def add_cylinder(loc, radius, depth, rot=(0,0,0), mat=None, segments=20):
    if isinstance(rot, bpy.types.Material):
        mat = rot
        rot = (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=loc)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.shade_smooth()
    if mat: obj.data.materials.append(mat)
    valk_parts.append(obj)
    return obj

def add_limb(p1, p2, r1, r2, mat=None, segments=16):
    v1 = mathutils.Vector(p1)
    v2 = mathutils.Vector(p2)
    vec = v2 - v1
    length = vec.length
    if length < 1e-4: return None
    mid = (v1 + v2) / 2.0
    rot = mathutils.Vector((0,0,1)).rotation_difference(vec).to_euler()
    if abs(r1 - r2) > 0.002:
        bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=length, vertices=segments, location=mid)
    else:
        bpy.ops.mesh.primitive_cylinder_add(radius=r1, depth=length, vertices=segments, location=mid)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.shade_smooth()
    if mat: obj.data.materials.append(mat)
    valk_parts.append(obj)
    return obj

def add_torus(loc, r_major, r_minor, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=r_major, minor_radius=r_minor, major_segments=24, minor_segments=12, location=loc)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.shade_smooth()
    if mat: obj.data.materials.append(mat)
    valk_parts.append(obj)
    return obj

# Base Position in Arena
RX = 2.15

# -------------------------------------------------------------
# A. LEGS & HEAVY STOMPER COMBAT BOOTS (Grounded Athletic Stance)
# -------------------------------------------------------------
# Lead Leg (Left, facing opponent): stepped forward (-X, -Y)
foot_l = (RX - 0.38, -0.16, 0.06)
ankle_l = (RX - 0.32, -0.14, 0.20)
knee_l = (RX - 0.22, -0.10, 0.62)
hip_l = (RX - 0.08, -0.12, 1.06)

# Rear Leg (Right): braced back (+X, +Y)
foot_r = (RX + 0.38, 0.16, 0.06)
ankle_r = (RX + 0.32, 0.14, 0.20)
knee_r = (RX + 0.20, 0.10, 0.62)
hip_r = (RX + 0.08, 0.12, 1.06)

# 1. Combat Boots (Solid 3D treaded sole + crimson armor cap + gold toe bumper + ankle discs)
for ft, rot_z in [(foot_l, radians(12)), (foot_r, radians(-15))]:
    # Treaded Rubber Platform Sole (30cm length, 16cm width, 6cm height)
    add_box(ft, (0.32, 0.17, 0.06), (0, 0, rot_z), mat_carbon, bevel=0.012)
    # Midsole Cushion Layer
    add_box((ft[0], ft[1], ft[2] + 0.04), (0.30, 0.16, 0.03), (0, 0, rot_z), mat_chrome)
    # Crimson Reinforced Toe Cap
    add_box((ft[0] - 0.07, ft[1], ft[2] + 0.06), (0.16, 0.15, 0.07), (0, radians(-12), rot_z), mat_crimson, bevel=0.015)
    # Gold Toe Bumper Rim
    add_box((ft[0] - 0.14, ft[1], ft[2] + 0.03), (0.04, 0.14, 0.04), (0, 0, rot_z), mat_gold, bevel=0.008)
    # Heel Armor Spur
    add_box((ft[0] + 0.12, ft[1], ft[2] + 0.06), (0.08, 0.14, 0.08), (0, radians(10), rot_z), mat_crimson, bevel=0.012)
    # Ankle Articulation Hubs (Side pivot discs)
    add_cylinder((ft[0] + 0.04, ft[1] - 0.09, ft[2] + 0.12), 0.045, 0.03, (radians(90), 0, rot_z), mat_gold)
    add_cylinder((ft[0] + 0.04, ft[1] + 0.09, ft[2] + 0.12), 0.045, 0.03, (radians(90), 0, rot_z), mat_gold)

# 2. Shins, Calves & Greaves (Ankle -> Knee)
for a_pt, k_pt, sign_y in [(ankle_l, knee_l, -1), (ankle_r, knee_r, 1)]:
    # Ankle Ball Joint
    add_sphere(a_pt, 0.075, mat=mat_carbon)
    # Core Cybernetic Shin Cylinder (diameter 15cm)
    add_limb(a_pt, k_pt, 0.075, 0.095, mat=mat_carbon)
    # Front Crimson Shin Armor Greave (contoured curved plate)
    mid_shin = ((a_pt[0] + k_pt[0]) / 2.0 - 0.03, (a_pt[1] + k_pt[1]) / 2.0, (a_pt[2] + k_pt[2]) / 2.0)
    add_box(mid_shin, (0.08, 0.13, 0.32), (0, radians(-10), 0), mat_crimson, bevel=0.02)
    # Gold Greave Side Filigree Trim
    add_box((mid_shin[0] - 0.03, mid_shin[1], mid_shin[2]), (0.025, 0.11, 0.30), (0, radians(-10), 0), mat_gold, bevel=0.008)
    # Ruby Shin Energy Conduit
    add_box((mid_shin[0] - 0.045, mid_shin[1], mid_shin[2]), (0.015, 0.03, 0.24), (0, radians(-10), 0), mat_plasma_glow)
    # Rear Calf Hydraulic Shock Absorber Pistons
    p_a = (a_pt[0] + 0.05, a_pt[1] + sign_y * 0.05, a_pt[2] + 0.04)
    p_b = (k_pt[0] + 0.05, k_pt[1] + sign_y * 0.05, k_pt[2] - 0.04)
    add_limb(p_a, p_b, 0.018, 0.018, mat=mat_chrome)

# 3. Articulated Knee Hubs (Genouilleres)
for k_pt, rot_y in [(knee_l, radians(-12)), (knee_r, radians(10))]:
    # Knee Core Spherical Joint
    add_sphere(k_pt, 0.095, mat=mat_carbon)
    # Heavy Contoured Crimson Knee Guard
    add_box((k_pt[0] - 0.05, k_pt[1], k_pt[2]), (0.09, 0.16, 0.16), (0, rot_y, 0), mat_crimson, bevel=0.025)
    # Gold Knee Bevel Frame
    add_box((k_pt[0] - 0.08, k_pt[1], k_pt[2]), (0.03, 0.14, 0.14), (0, rot_y, 0), mat_gold, bevel=0.01)
    # Central Ruby Impact Core
    add_sphere((k_pt[0] - 0.10, k_pt[1], k_pt[2]), 0.035, mat=mat_plasma_glow)
    # Lateral Mechanical Pivot Discs
    add_cylinder((k_pt[0], k_pt[1] - 0.10, k_pt[2]), 0.045, 0.025, (radians(90), 0, 0), mat_gold)
    add_cylinder((k_pt[0], k_pt[1] + 0.10, k_pt[2]), 0.045, 0.025, (radians(90), 0, 0), mat_gold)

# 4. Thighs (Knee -> Hip) - Full 20cm cylindrical muscular cybernetic limbs
for k_pt, h_pt, sign_y in [(knee_l, hip_l, -1), (knee_r, hip_r, 1)]:
    # Core Muscular Thigh Cylinder (diameter 20cm)
    add_limb(k_pt, h_pt, 0.095, 0.125, mat=mat_carbon)
    # Large Curved Crimson Outer Thigh Carapace Plate
    mid_th = ((k_pt[0] + h_pt[0]) / 2.0 - 0.03, (k_pt[1] + h_pt[1]) / 2.0 + sign_y * 0.04, (k_pt[2] + h_pt[2]) / 2.0)
    add_box(mid_th, (0.09, 0.16, 0.30), (0, radians(-15), sign_y * radians(15)), mat_crimson, bevel=0.025)
    # Gold Armor Bevel Border Strip
    add_box((mid_th[0] - 0.035, mid_th[1], mid_th[2]), (0.02, 0.14, 0.28), (0, radians(-15), sign_y * radians(15)), mat_gold, bevel=0.008)
    # Hip Joint Spherical Bearing
    add_sphere(h_pt, 0.115, mat=mat_carbon)

# -------------------------------------------------------------
# B. PELVIS & COMBAT FAULD BELT (Solid 3D Core, depth 24cm)
# -------------------------------------------------------------
pelvis = (RX, 0.0, 1.08)
waist = (RX - 0.02, 0.0, 1.22)

# Armored Pelvic Core (ellipsoid width 32cm, depth 24cm)
add_sphere(pelvis, 0.16, scale=(1.1, 1.3, 0.95), mat=mat_carbon)
# Abdominal Core Pillar
add_limb(pelvis, waist, 0.15, 0.13, mat=mat_carbon)

# Golden Combat Belt (Torus / Ring width 34cm, depth 26cm)
add_torus(waist, 0.17, 0.035, (0, 0, 0), mat_gold)
# Central Crimson Chevron Buckle Shield
add_box((waist[0] - 0.18, waist[1], waist[2]), (0.05, 0.13, 0.11), (0, radians(-8), 0), mat_crimson, bevel=0.015)
# Glowing Ruby Core on Belt
add_sphere((waist[0] - 0.21, waist[1], waist[2]), 0.03, mat=mat_plasma_glow)
# Hip Energy Canisters (Chrome cylinders along lateral flanks)
add_cylinder((waist[0], -0.19, waist[2] - 0.02), 0.032, 0.12, (0, 0, 0), mat_chrome)
add_cylinder((waist[0], 0.19, waist[2] - 0.02), 0.032, 0.12, (0, 0, 0), mat_chrome)

# -------------------------------------------------------------
# C. TORSO, VANGUARD CUIRASS & RADIANT ARC CORE (depth 30cm)
# -------------------------------------------------------------
chest = (RX - 0.05, 0.0, 1.44)
neck = (RX - 0.06, 0.0, 1.68)

# Core Ribcage (muscular mecha torso, width 34cm, depth 26cm)
add_limb(waist, chest, 0.13, 0.17, mat=mat_carbon)
add_sphere(chest, 0.17, scale=(1.15, 1.25, 1.0), mat=mat_carbon)

# Segmented Abdominal Spinal Plates (curved plates wrapping around waist)
for z_off, scale_w in [(0.06, 0.20), (0.13, 0.22), (0.20, 0.24)]:
    add_box((waist[0] - 0.12, waist[1], waist[2] + z_off), (0.04, scale_w, 0.05), (0, radians(-10), 0), mat_crimson, bevel=0.01)
    # Lateral status lights
    add_sphere((waist[0] - 0.13, waist[1] - scale_w / 2.0, waist[2] + z_off), 0.015, mat=mat_plasma_glow)
    add_sphere((waist[0] - 0.13, waist[1] + scale_w / 2.0, waist[2] + z_off), 0.015, mat=mat_plasma_glow)

# Contoured Vanguard Cuirass (Two sculpted curved breastplates)
cuirass_y_dist = 0.09
for sign_y in [-1, 1]:
    bp_loc = (chest[0] - 0.07, sign_y * cuirass_y_dist, chest[2] + 0.03)
    # Rounded contoured breastplate shell (radius 11cm)
    add_sphere(bp_loc, 0.105, scale=(1.2, 1.0, 1.0), rot=(0, radians(-12), sign_y * radians(12)), mat=mat_crimson)
    # Gold Beveled Filigree Trim along upper breastplate
    add_box((bp_loc[0] - 0.08, bp_loc[1], bp_loc[2] + 0.02), (0.02, 0.14, 0.14), (0, radians(-12), sign_y * radians(12)), mat_gold, bevel=0.008)

# Radiant Crimson Arc Core (Turbine Reactor on Sternum)
core_pt = (chest[0] - 0.18, 0.0, chest[2] + 0.02)
# Gold Outer Turbine Ring
add_torus(core_pt, 0.065, 0.014, (0, radians(78), 0), mat_gold)
# Inner Chrome Stepped Housing
add_cylinder((core_pt[0] + 0.01, core_pt[1], core_pt[2]), 0.052, 0.025, (0, radians(78), 0), mat_chrome)
# Glowing Arc Core Turbine Center (Radiant Amber Spark)
add_sphere((core_pt[0] - 0.015, core_pt[1], core_pt[2]), 0.042, mat=mat_arc_core_glow)
# Inset Ruby Plasma Ring
add_torus((core_pt[0] - 0.01, core_pt[1], core_pt[2]), 0.032, 0.008, (0, radians(78), 0), mat_plasma_glow)

# Arc Core Dynamic Light
core_light = bpy.data.objects.get("Valk_ArcCore_Light")
if core_light:
    core_light.location = (core_pt[0] - 0.15, core_pt[1], core_pt[2])
    core_light.data.energy = 40.0
    core_light.data.color = (1.0, 0.65, 0.15)

# -------------------------------------------------------------
# D. HEAD, AERODYNAMIC HELMET & BLONDE PONYTAIL PLUME (depth 26cm)
# -------------------------------------------------------------
add_limb(chest, neck, 0.11, 0.085, mat=mat_carbon)
add_sphere(neck, 0.085, mat=mat_carbon)

head = (RX - 0.08, 0.0, 1.88)
# Helmet Cranium (smooth 3D mecha sphere, diameter 24cm)
add_sphere(head, 0.165, scale=(1.1, 1.0, 1.05), mat=mat_crimson)
# Chin & Jaw Face Guard
add_box((head[0] - 0.06, head[1], head[2] - 0.06), (0.12, 0.16, 0.10), (0, radians(-18), 0), mat_crimson, bevel=0.02)
# Golden Brow Armor Crest
add_box((head[0] - 0.08, head[1], head[2] + 0.06), (0.10, 0.22, 0.06), (0, radians(-15), 0), mat_gold, bevel=0.012)
# Angular Ruby Energy Visor (glowing red curved arc)
add_box((head[0] - 0.13, head[1], head[2] + 0.01), (0.04, 0.20, 0.035), (0, radians(-15), 0), mat_plasma_glow, bevel=0.008)
# Central Helmet Fin (Gold Spine running front to back)
add_box((head[0] + 0.01, head[1], head[2] + 0.18), (0.22, 0.03, 0.07), (0, radians(-22), 0), mat_gold, bevel=0.01)

# Ear Modules & 3-Tiered Golden Wing Ear Crests (Left & Right)
for sign_y in [-1, 1]:
    ear_loc = (head[0] - 0.02, sign_y * 0.16, head[2])
    # Ear Hub Disc
    add_cylinder(ear_loc, 0.045, 0.025, (radians(90), 0, 0), mat_chrome)
    add_sphere((ear_loc[0], ear_loc[1] + sign_y * 0.015, ear_loc[2]), 0.022, mat=mat_plasma_glow)
    
    # 3-Tiered Wing Ear Crest Feathers (sweeping back and up!)
    # Feather 1 (Primary bottom)
    add_limb((ear_loc[0], ear_loc[1] + sign_y * 0.02, ear_loc[2] + 0.03),
             (ear_loc[0] + 0.22, ear_loc[1] + sign_y * 0.18, ear_loc[2] + 0.28),
             0.028, 0.008, mat_gold)
    # Feather 2 (Mid)
    add_limb((ear_loc[0] + 0.03, ear_loc[1] + sign_y * 0.02, ear_loc[2] + 0.07),
             (ear_loc[0] + 0.18, ear_loc[1] + sign_y * 0.15, ear_loc[2] + 0.32),
             0.022, 0.007, mat_gold)
    # Feather 3 (Top)
    add_limb((ear_loc[0] + 0.06, ear_loc[1] + sign_y * 0.02, ear_loc[2] + 0.10),
             (ear_loc[0] + 0.14, ear_loc[1] + sign_y * 0.12, ear_loc[2] + 0.35),
             0.018, 0.006, mat_gold)

# Golden Warrior Ponytail Plume (Arching gracefully backward into +Y in thick volumetric strands)
plume_collar = (head[0] + 0.13, 0.0, head[2] + 0.12)
add_torus(plume_collar, 0.045, 0.015, (0, radians(-30), 0), mat_gold)

# Multi-strand curved ponytail spine
plume_spine = [
    plume_collar,
    (head[0] + 0.28, 0.0, head[2] + 0.12),
    (head[0] + 0.44, 0.0, head[2] + 0.04),
    (head[0] + 0.58, 0.0, head[2] - 0.12),
    (head[0] + 0.70, 0.0, head[2] - 0.32),
]

for pi in range(len(plume_spine) - 1):
    r_a = 0.070 - pi * 0.010
    r_b = 0.060 - pi * 0.010
    # Central thick hair strand
    add_limb(plume_spine[pi], plume_spine[pi + 1], r_a, r_b, mat=mat_hair)
    # Flanking side strands for rich flowing volume
    for sy in [-0.04, 0.04]:
        p_a = (plume_spine[pi][0], plume_spine[pi][1] + sy, plume_spine[pi][2])
        p_b = (plume_spine[pi + 1][0], plume_spine[pi + 1][1] + sy * 0.7, plume_spine[pi + 1][2])
        add_limb(p_a, p_b, r_a * 0.75, r_b * 0.75, mat=mat_hair)

# -------------------------------------------------------------
# E. VALKYRIE MECHANICAL WINGS (True 3D Back Pack, depth 50cm)
# -------------------------------------------------------------
wing_dock = (RX + 0.14, 0.0, 1.56)
# Central Back Wing Turbine Housing (Chrome & Dark Carbon)
add_cylinder(wing_dock, 0.11, 0.08, (0, radians(90), 0), mat_carbon)
add_torus((wing_dock[0] + 0.04, wing_dock[1], wing_dock[2]), 0.085, 0.015, (0, radians(90), 0), mat_gold)
add_sphere((wing_dock[0] + 0.05, wing_dock[1], wing_dock[2]), 0.055, mat=mat_plasma_glow)

# Wing Thruster Dynamic Light
wing_light = bpy.data.objects.get("Valk_WingThruster_Light")
if wing_light:
    wing_light.location = (wing_dock[0] + 0.20, wing_dock[1], wing_dock[2])
    wing_light.data.energy = 55.0
    wing_light.data.color = (1.0, 0.15, 0.08)

# Left & Right Wing Blade Assemblies
for sign_y in [-1, 1]:
    # Structural Anchor Spar
    spar_root = (wing_dock[0], sign_y * 0.11, wing_dock[2] + 0.02)
    spar_tip = (wing_dock[0] + 0.16, sign_y * 0.36, wing_dock[2] + 0.14)
    add_limb(spar_root, spar_tip, 0.045, 0.035, mat_carbon)
    add_sphere(spar_tip, 0.05, mat_chrome)
    
    # 4 Tiered Swept Mechanical Blade Feathers
    # (length, pitch_deg, yaw_deg, z_offset)
    blade_specs = [
        (0.82, radians(-36), sign_y * radians(30), -0.05), # Primary Long Blade (sweeps down past hips)
        (0.66, radians(-22), sign_y * radians(38), 0.03),  # Secondary Blade
        (0.48, radians(-6),  sign_y * radians(46), 0.11),  # Tertiary Blade
        (0.32, radians(12),  sign_y * radians(52), 0.18),  # Top Winglet
    ]
    
    for blen, rot_x, rot_z, z_off in blade_specs:
        b_root = (spar_tip[0], spar_tip[1], spar_tip[2] + z_off)
        b_tip = (
            b_root[0] + blen * cos(rot_x) * cos(rot_z),
            b_root[1] + blen * sin(rot_z),
            b_root[2] + blen * sin(rot_x)
        )
        # Main Crimson Armor Blade Prism
        add_limb(b_root, b_tip, 0.040, 0.012, mat=mat_crimson)
        # Gold Beveled Leading Edge
        edge_root = (b_root[0] - 0.012, b_root[1] - sign_y * 0.008, b_root[2])
        edge_tip = (b_tip[0] - 0.004, b_tip[1] - sign_y * 0.004, b_tip[2])
        add_limb(edge_root, edge_tip, 0.016, 0.006, mat_gold)
        # Glowing Ruby Plasma Channel
        slot_root = (b_root[0] + 0.012, b_root[1] + sign_y * 0.008, b_root[2])
        slot_tip = (b_tip[0] + 0.004, b_tip[1] + sign_y * 0.004, b_tip[2])
        add_limb(slot_root, slot_tip, 0.014, 0.005, mat_plasma_glow)

# -------------------------------------------------------------
# F. SHOULDERS & HYDRAULIC KINETIC GAUNTLETS
# -------------------------------------------------------------
shoulder_l = (RX - 0.06, -0.26, 1.54) # Lead Shoulder
shoulder_r = (RX + 0.04, 0.26, 1.54)  # Rear Shoulder

# Vanguard Pauldrons (Curved shoulder bells with gold trim and mechanical pivots)
for sh_pt, sign_y, rot_y in [(shoulder_l, -1, radians(-15)), (shoulder_r, 1, radians(15))]:
    add_sphere(sh_pt, 0.105, mat=mat_carbon)
    p_loc = (sh_pt[0], sh_pt[1] + sign_y * 0.08, sh_pt[2] + 0.05)
    # Crimson Pauldron Bell
    add_box(p_loc, (0.24, 0.18, 0.18), (0, rot_y, sign_y * radians(12)), mat_crimson, bevel=0.03)
    # Gold Beveled Rim
    add_box((p_loc[0] - 0.05, p_loc[1], p_loc[2] + 0.02), (0.14, 0.20, 0.04), (0, rot_y, sign_y * radians(12)), mat_gold, bevel=0.01)
    # Side Pivot Disc
    add_cylinder((sh_pt[0], sh_pt[1] + sign_y * 0.17, sh_pt[2] + 0.03), 0.05, 0.025, (radians(90), 0, 0), mat_chrome)

# 1. Lead Arm & Gauntlet (Raised in Front Combat Guard: -X, -Y)
elbow_l = (RX - 0.38, -0.22, 1.35)
wrist_l = (RX - 0.70, -0.16, 1.46)
fist_l = (RX - 0.88, -0.12, 1.50)

# Bicep Cylinder (diameter 17cm)
add_limb(shoulder_l, elbow_l, 0.09, 0.08, mat=mat_carbon)
# Elbow Mechanical Hinge
add_sphere(elbow_l, 0.085, mat=mat_carbon)
add_cylinder((elbow_l[0], elbow_l[1] - 0.07, elbow_l[2]), 0.04, 0.025, (radians(90), 0, 0), mat_gold)

# Heavy Brawler Forearm Gauntlet Casing (diameter 22cm)
add_limb(elbow_l, wrist_l, 0.11, 0.13, mat=mat_crimson)
# Gold Gauntlet Cuff Rings
add_cylinder(elbow_l, 0.12, 0.04, (0, 0, 0), mat_gold)
add_cylinder(wrist_l, 0.14, 0.04, (0, 0, 0), mat_gold)

# Twin Chrome Hydraulic Shock Pistons along top of Gauntlet
p1_a = (elbow_l[0], elbow_l[1] - 0.05, elbow_l[2] + 0.10)
p1_b = (wrist_l[0], wrist_l[1] - 0.05, wrist_l[2] + 0.10)
add_limb(p1_a, p1_b, 0.024, 0.024, mat=mat_chrome)
p2_a = (elbow_l[0], elbow_l[1] + 0.05, elbow_l[2] + 0.10)
p2_b = (wrist_l[0], wrist_l[1] + 0.05, wrist_l[2] + 0.10)
add_limb(p2_a, p2_b, 0.024, 0.024, mat=mat_plasma_glow) # Ruby power conduit

# Armored Mecha Brawler Fist (Lead)
add_box(fist_l, (0.20, 0.18, 0.18), mat=mat_crimson, bevel=0.025)
# Gold Knuckle Strike Plate
add_box((fist_l[0] - 0.09, fist_l[1], fist_l[2]), (0.035, 0.16, 0.15), mat=mat_gold, bevel=0.01)
# Glowing Ruby Impact Nodes
add_box((fist_l[0] - 0.11, fist_l[1], fist_l[2]), (0.015, 0.13, 0.11), mat=mat_plasma_glow)

# Gauntlet Dynamic Light
gaunt_light = bpy.data.objects.get("Valk_Gauntlet_Light")
if gaunt_light:
    gaunt_light.location = (fist_l[0] - 0.12, fist_l[1], fist_l[2])
    gaunt_light.data.energy = 30.0

# 2. Rear Arm & Gauntlet (Cocked at Ribs Ready to Strike)
elbow_r = (RX + 0.20, 0.30, 1.26)
wrist_r = (RX - 0.10, 0.22, 1.34)
fist_r = (RX - 0.28, 0.18, 1.38)

add_limb(shoulder_r, elbow_r, 0.09, 0.08, mat=mat_carbon)
add_sphere(elbow_r, 0.085, mat=mat_carbon)
add_cylinder((elbow_r[0], elbow_r[1] + 0.07, elbow_r[2]), 0.04, 0.025, (radians(90), 0, 0), mat_gold)

add_limb(elbow_r, wrist_r, 0.11, 0.13, mat=mat_crimson)
add_cylinder(elbow_r, 0.12, 0.04, (0, 0, 0), mat_gold)
add_cylinder(wrist_r, 0.14, 0.04, (0, 0, 0), mat_gold)

pr1_a = (elbow_r[0], elbow_r[1] + 0.05, elbow_r[2] + 0.10)
pr1_b = (wrist_r[0], wrist_r[1] + 0.05, wrist_r[2] + 0.10)
add_limb(pr1_a, pr1_b, 0.024, 0.024, mat=mat_chrome)
pr2_a = (elbow_r[0], elbow_r[1] - 0.05, elbow_r[2] + 0.10)
pr2_b = (wrist_r[0], wrist_r[1] - 0.05, wrist_r[2] + 0.10)
add_limb(pr2_a, pr2_b, 0.024, 0.024, mat=mat_plasma_glow)

add_box(fist_r, (0.20, 0.18, 0.18), mat=mat_crimson, bevel=0.025)
add_box((fist_r[0] - 0.09, fist_r[1], fist_r[2]), (0.035, 0.16, 0.15), mat=mat_gold, bevel=0.01)
add_box((fist_r[0] - 0.11, fist_r[1], fist_r[2]), (0.015, 0.13, 0.11), mat=mat_plasma_glow)

# -------------------------------------------------------------
# G. UNIFY ALL VOLUMETRIC ELEMENTS INTO ONE MASTER 3D MESH
# -------------------------------------------------------------
valid_parts = [p for p in valk_parts if p is not None and p.name in bpy.data.objects]
print(f'Total volumetric 3D components created: {len(valid_parts)}')

bpy.ops.object.select_all(action='DESELECT')
for p in valid_parts:
    p.select_set(True)

bpy.context.view_layer.objects.active = valid_parts[0]
bpy.ops.object.join()
valk_obj = bpy.context.active_object
valk_obj.name = "Cyber_Valkyrie"

# Set origin to floor center (RX, 0, 0)
bpy.context.scene.cursor.location = (RX, 0.0, 0.0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

print(">>> Master True 3D Volumetric Cyber Valkyrie successfully assembled!")

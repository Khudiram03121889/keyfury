"""
KeyFury 3D Arena & Fighters Generator for Blender (via Blender MCP)
Constructs:
- Cyber Neon Rooftop (Neo-Kyoto Sky Deck) Arena (Joined into 'Arena_Platform')
- Fighter 1: Shadow Ronin (Kage) - Precision Cyber-Samurai Stickman with Azure Plasma Katana & Kabuto
- Fighter 2: Cyber Valkyrie (Freya) - 100% True 3D Sculptural Character Model matching atlas-v3-consistent-source.png:
    * Mechanical 4-blade swept Valkyrie wings with gold trim & glowing red plasma conduits
    * Aerodynamic cyber-knight helmet with 3-tiered golden ear winglets & ruby visor
    * High cascading golden warrior ponytail plume arching down the back
    * Heavy vanguard cuirass with central Crimson Arc Core turbine reactor
    * Multi-tier shoulder pauldrons with gold borders
    * Dual heavy hydraulic brawler gauntlets with chrome pistons & knuckle strike plates
    * Reinforced thighs, armored knee cops, hydraulic greaves, and heavy stomper boots
- Neo-Kyoto City Skyline Backdrop (Joined into 'Arena_Skyline')
- 3D Holographic In-Game HUD (Joined into 'Combat_HUD')
- Cyberpunk dual-tone lighting, dynamic reactor glow lights, and cinematic combat camera
- Renders high-resolution still image, saves .blend file, and exports .glb model
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos
import os
import shutil

print(">>> Starting KeyFury 3D Generation in Blender...")

# ----------------------------------------------------------------------
# 1. Clean existing scene objects & orphan data
# ----------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0:
        bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0:
        bpy.data.materials.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
if hasattr(scene.eevee, 'use_raytracing'):
    scene.eevee.use_raytracing = True
if hasattr(scene.eevee, 'use_fast_gi'):
    scene.eevee.use_fast_gi = True

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.frame_start = 1
scene.frame_end = 60
scene.frame_current = 1

# ----------------------------------------------------------------------
# 2. Material Helper Functions (With Viewport Solid Colors!)
# ----------------------------------------------------------------------
def make_principled_mat(name, base_color=(0.1, 0.1, 0.1, 1.0), metallic=0.0, roughness=0.5, emission_color=(0,0,0,1), emission_strength=0.0, vp_color=None):
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

def make_emission_mat(name, color=(0.0, 0.94, 1.0, 1.0), strength=8.0, vp_color=None):
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

# Base Materials
mat_dark_carbon = make_principled_mat("Mat_DarkCarbon", (0.035, 0.04, 0.065, 1.0), metallic=0.9, roughness=0.22, vp_color=(0.10, 0.12, 0.18, 1.0))
mat_rain_platform = make_principled_mat("Mat_RainPlatform", (0.03, 0.035, 0.055, 1.0), metallic=0.94, roughness=0.15, vp_color=(0.06, 0.08, 0.12, 1.0))
mat_chrome_trim = make_principled_mat("Mat_ChromeTrim", (0.75, 0.8, 0.88, 1.0), metallic=0.98, roughness=0.1, vp_color=(0.80, 0.84, 0.90, 1.0))
mat_gold_accent = make_principled_mat("Mat_GoldAccent", (1.0, 0.78, 0.22, 1.0), metallic=0.95, roughness=0.15, vp_color=(0.95, 0.78, 0.18, 1.0))
mat_valk_crimson = make_principled_mat("Mat_ValkCrimson", (0.68, 0.04, 0.07, 1.0), metallic=0.88, roughness=0.22, vp_color=(0.78, 0.06, 0.12, 1.0))
mat_hair_gold = make_principled_mat("Mat_HairGold", (0.92, 0.72, 0.28, 1.0), metallic=0.35, roughness=0.40, vp_color=(0.92, 0.75, 0.28, 1.0))

# Emissive Materials
mat_cyan_glow = make_emission_mat("Mat_CyanGlow", (0.0, 0.95, 1.0, 1.0), strength=14.0, vp_color=(0.0, 0.90, 1.0, 1.0))
mat_magenta_glow = make_emission_mat("Mat_MagentaGlow", (1.0, 0.05, 0.6, 1.0), strength=14.0, vp_color=(1.0, 0.10, 0.65, 1.0))
mat_crimson_glow = make_emission_mat("Mat_CrimsonGlow", (1.0, 0.02, 0.08, 1.0), strength=18.0, vp_color=(1.0, 0.05, 0.12, 1.0))
mat_amber_glow = make_emission_mat("Mat_AmberGlow", (1.0, 0.65, 0.05, 1.0), strength=12.0, vp_color=(1.0, 0.70, 0.10, 1.0))
mat_white_glow = make_emission_mat("Mat_WhiteGlow", (0.95, 0.98, 1.0, 1.0), strength=8.0, vp_color=(0.95, 0.98, 1.0, 1.0))

# ----------------------------------------------------------------------
# 3. World & Cyberpunk Lighting
# ----------------------------------------------------------------------
world = bpy.data.worlds.new("CyberWorld")
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.008, 0.012, 0.028, 1.0)
    bg_node.inputs['Strength'].default_value = 0.5
scene.world = world

def add_light(name, ltype, energy, color, loc, rot=(0,0,0), size=None):
    ldata = bpy.data.lights.new(name=name, type=ltype)
    ldata.energy = energy
    ldata.color = color
    if size is not None and hasattr(ldata, 'size'):
        ldata.size = size
    obj = bpy.data.objects.new(name, ldata)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    return obj

# Key Light (Cyan) - front left
add_light("Key_Light_Cyan", 'AREA', 650, (0.15, 0.85, 1.0), (-6.5, -6.5, 4.8), (radians(55), radians(15), radians(-45)), size=5.0)
# Rim Light (Magenta/Crimson) - back right
add_light("Rim_Light_Magenta", 'AREA', 600, (1.0, 0.1, 0.6), (6.5, 5.5, 4.8), (radians(-45), radians(-15), radians(135)), size=4.5)
# Top Arena Overhead Fill
add_light("Top_Arena_Fill", 'AREA', 350, (0.7, 0.85, 1.0), (0.0, -0.5, 8.0), (radians(10), 0, 0), size=9.0)
# Front Duel Fill
add_light("Front_Duel_Fill", 'AREA', 450, (0.85, 0.92, 1.0), (0.0, -8.0, 2.5), (radians(75), 0, 0), size=7.0)
# Ground Uplight (Cyan)
add_light("Ground_Uplight", 'POINT', 180, (0.0, 0.8, 1.0), (0.0, 0.0, -0.6))

# ----------------------------------------------------------------------
# 4. Geometry Helpers (Kinematic Mesh Construction)
# ----------------------------------------------------------------------
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

def create_box(pt, scale, rot_euler=None, mat=None):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0, 0, 0)
    if rot_euler is None:
        rot_euler = (0, 0, 0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot_euler
    if mat:
        obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_disc(pt, radius, depth, rot_euler=None, mat=None, segments=24):
    if isinstance(rot_euler, bpy.types.Material):
        mat = rot_euler
        rot_euler = (0, 0, 0)
    if rot_euler is None:
        rot_euler = (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=segments, location=pt)
    obj = bpy.context.active_object
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
# 5. Arena: Cyber Neon Rooftop (Joined into 'Arena_Platform')
# ----------------------------------------------------------------------
arena_parts = []

arena_parts.append(create_box((0, 0, -0.25), (16.0, 8.5, 0.5), mat=mat_rain_platform))
arena_parts.append(create_box((0, 0, -0.52), (16.6, 9.1, 0.2), mat=mat_dark_carbon))

arena_parts.append(create_box((0, -4.24, 0.01), (15.8, 0.08, 0.04), mat=mat_cyan_glow))
arena_parts.append(create_box((0, 4.24, 0.01), (15.8, 0.08, 0.04), mat=mat_magenta_glow))
arena_parts.append(create_box((-7.98, 0, 0.01), (0.08, 8.4, 0.04), mat=mat_cyan_glow))
arena_parts.append(create_box((7.98, 0, 0.01), (0.08, 8.4, 0.04), mat=mat_magenta_glow))

bpy.ops.mesh.primitive_cylinder_add(radius=2.8, depth=0.03, vertices=48, location=(0, 0, 0.01))
ring_outer = bpy.context.active_object
ring_outer.data.materials.append(mat_cyan_glow)
arena_parts.append(ring_outer)

bpy.ops.mesh.primitive_cylinder_add(radius=2.65, depth=0.04, vertices=48, location=(0, 0, 0.015))
ring_inner = bpy.context.active_object
ring_inner.data.materials.append(mat_rain_platform)
arena_parts.append(ring_inner)

arena_parts.append(create_box((0, 0, 0.02), (3.4, 0.12, 0.02), mat=mat_magenta_glow))
arena_parts.append(create_box((0, 0, 0.02), (0.12, 3.4, 0.02), mat=mat_cyan_glow))

pylon_positions = [
    (-7.5, -3.8), (-3.8, -3.8), (3.8, -3.8), (7.5, -3.8),
    (-7.5, 3.8), (-3.8, 3.8), (3.8, 3.8), (7.5, 3.8),
]
for i, (px, py) in enumerate(pylon_positions):
    arena_parts.append(create_limb((px, py, 0.0), (px, py, 1.1), 0.12, 0.12, mat=mat_dark_carbon))
    arena_parts.append(create_sphere((px, py, 1.12), 0.14, mat=mat_cyan_glow if px < 0 else mat_magenta_glow))

arena_parts.append(create_limb((-7.5, 3.8, 0.85), (7.5, 3.8, 0.85), 0.03, 0.03, mat=mat_magenta_glow))
arena_parts.append(create_limb((-7.5, -3.8, 0.85), (-7.5, 3.8, 0.85), 0.03, 0.03, mat=mat_cyan_glow))
arena_parts.append(create_limb((7.5, -3.8, 0.85), (7.5, 3.8, 0.85), 0.03, 0.03, mat=mat_magenta_glow))

for sx, sname in [(-6.8, "Left"), (6.8, "Right")]:
    arena_parts.append(create_box((sx, 3.2, 1.1), (1.4, 1.0, 2.2), mat=mat_dark_carbon))
    arena_parts.append(create_box((sx, 2.68, 1.1), (1.1, 0.04, 1.8), mat=mat_cyan_glow if sx < 0 else mat_crimson_glow))

bpy.ops.object.select_all(action='DESELECT')
for p in arena_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = arena_parts[0]
bpy.ops.object.join()
arena_obj = bpy.context.active_object
arena_obj.name = "Arena_Platform"

# ----------------------------------------------------------------------
# 6. Neo-Kyoto Cyberpunk City Skyline (Joined into 'Arena_Skyline')
# ----------------------------------------------------------------------
skyline_parts = []
tower_configs = [
    (-14.0, 14.0, 18.0, 4.0, 4.0, mat_cyan_glow),
    (-9.0, 12.0, 14.0, 3.5, 3.0, mat_amber_glow),
    (-4.5, 16.0, 22.0, 4.5, 4.5, mat_magenta_glow),
    (0.0, 18.0, 26.0, 5.5, 5.0, mat_cyan_glow),
    (5.0, 15.0, 20.0, 4.0, 4.0, mat_cyan_glow),
    (9.5, 13.0, 15.0, 3.2, 3.5, mat_amber_glow),
    (14.5, 14.0, 17.0, 4.2, 4.0, mat_magenta_glow),
    (-18.0, 10.0, 11.0, 3.0, 3.0, mat_dark_carbon),
    (18.0, 10.0, 12.0, 3.0, 3.0, mat_dark_carbon),
]

for i, (tx, ty, th, tw, td, tmat) in enumerate(tower_configs):
    skyline_parts.append(create_box((tx, ty, th / 2.0 - 5.0), (tw, td, th), mat=mat_dark_carbon))
    skyline_parts.append(create_limb((tx, ty, th - 5.0), (tx, ty, th - 5.0 + 3.5), 0.08, 0.04, mat=mat_chrome_trim))
    skyline_parts.append(create_sphere((tx, ty, th - 5.0 + 3.5), 0.2, mat=mat_crimson_glow if i % 2 == 0 else mat_cyan_glow))
    for floor_idx in range(5):
        w_z = (th * 0.2) + floor_idx * (th * 0.12) - 5.0
        skyline_parts.append(create_box((tx, ty - td * 0.51, w_z), (tw * 0.8, 0.04, 0.35), mat=tmat))

skyline_parts.append(create_box((0.0, 7.5, 4.3), (7.5, 0.15, 1.6), mat=mat_dark_carbon))
skyline_parts.append(create_box((0.0, 7.4, 4.3), (7.7, 0.05, 1.75), mat=mat_magenta_glow))

bpy.ops.object.text_add(location=(-2.4, 7.25, 3.85))
txt_kf = bpy.context.active_object
txt_kf.name = "Holo_Text_KEYFURY"
txt_kf.data.body = "KEYFURY"
txt_kf.data.size = 0.85
txt_kf.data.extrude = 0.10
txt_kf.rotation_euler = (radians(90), 0, 0)
txt_kf.data.materials.append(mat_cyan_glow)

bpy.ops.object.text_add(location=(-2.2, 7.25, 4.65))
txt_sub = bpy.context.active_object
txt_sub.name = "Holo_Text_NeoKyoto"
txt_sub.data.body = "NEO-KYOTO // SKY DECK 80F"
txt_sub.data.size = 0.24
txt_sub.data.extrude = 0.03
txt_sub.rotation_euler = (radians(90), 0, 0)
txt_sub.data.materials.append(mat_white_glow)

bpy.ops.object.text_add(location=(3.8, 6.2, 3.2))
kanji_duel = bpy.context.active_object
kanji_duel.name = "Neon_Kanji_Duel"
kanji_duel.data.body = "決闘"
kanji_duel.data.size = 0.95
kanji_duel.data.extrude = 0.08
kanji_duel.rotation_euler = (radians(90), 0, radians(-15))
kanji_duel.data.materials.append(mat_magenta_glow)

bpy.ops.object.select_all(action='DESELECT')
for p in skyline_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = skyline_parts[0]
bpy.ops.object.join()
skyline_obj = bpy.context.active_object
skyline_obj.name = "Arena_Skyline"

# ----------------------------------------------------------------------
# 7. BUILD SHADOW RONIN (KAGE) - CHUDAN SAMURAI POISE (CENTER AT X = -2.0)
# ----------------------------------------------------------------------
ronin_parts = []

pelvis_r = (-2.00, 0.0, 1.00)
waist_r = (-1.98, 0.0, 1.15)
chest_r = (-1.95, 0.0, 1.35)
neck_r = (-1.92, 0.0, 1.62)
head_r = (-1.90, 0.0, 1.85)

hip_rr = (-1.92, -0.16, 1.00)
knee_rr = (-1.62, -0.16, 0.55)
ankle_rr = (-1.55, -0.16, 0.12)
foot_rr = (-1.50, -0.16, 0.05)

hip_rl = (-2.08, 0.16, 1.00)
knee_rl = (-2.30, 0.18, 0.55)
ankle_rl = (-2.35, 0.20, 0.12)
foot_rl = (-2.35, 0.20, 0.05)

# Tabi Combat Boots
ronin_parts.append(create_box((foot_rr[0]+0.06, foot_rr[1], foot_rr[2]), (0.26, 0.12, 0.09), mat=mat_dark_carbon))
ronin_parts.append(create_box((foot_rl[0]+0.06, foot_rl[1], foot_rl[2]), (0.26, 0.12, 0.09), mat=mat_dark_carbon))

# Shins & Concentric Joints
ronin_parts.append(create_sphere(ankle_rr, 0.07, mat_dark_carbon))
ronin_parts.append(create_limb(ankle_rr, knee_rr, 0.065, 0.08, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(knee_rr, 0.09, mat_cyan_glow))

ronin_parts.append(create_sphere(ankle_rl, 0.07, mat_dark_carbon))
ronin_parts.append(create_limb(ankle_rl, knee_rl, 0.065, 0.08, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(knee_rl, 0.09, mat_cyan_glow))

ronin_parts.append(create_box((knee_rr[0]+0.05, knee_rr[1], knee_rr[2]), (0.06, 0.13, 0.12), (0, radians(25), 0), mat_chrome_trim))
ronin_parts.append(create_box((knee_rl[0]+0.05, knee_rl[1], knee_rl[2]), (0.06, 0.13, 0.12), (0, radians(-20), 0), mat_chrome_trim))

# Thighs
ronin_parts.append(create_limb(knee_rr, hip_rr, 0.08, 0.10, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(hip_rr, 0.10, mat_dark_carbon))

ronin_parts.append(create_limb(knee_rl, hip_rl, 0.08, 0.10, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(hip_rl, 0.10, mat_dark_carbon))

# Pelvis & Belt
ronin_parts.append(create_sphere(pelvis_r, 0.16, mat_dark_carbon))
ronin_parts.append(create_limb(pelvis_r, waist_r, 0.14, 0.13, mat_dark_carbon))
ronin_parts.append(create_limb((waist_r[0], waist_r[1], waist_r[2]-0.05), (waist_r[0], waist_r[1], waist_r[2]+0.05), 0.17, 0.17, mat=mat_cyan_glow))

# Torso & Samurai Cuirass
ronin_parts.append(create_limb(waist_r, chest_r, 0.13, 0.17, mat_dark_carbon))
ronin_parts.append(create_box((chest_r[0]+0.03, chest_r[1], chest_r[2]), (0.26, 0.36, 0.34), (0, radians(6), 0), mat_dark_carbon))
ronin_parts.append(create_box((chest_r[0]+0.16, chest_r[1], chest_r[2]), (0.03, 0.06, 0.26), (0, radians(6), 0), mat_cyan_glow))
ronin_parts.append(create_limb(chest_r, neck_r, 0.09, 0.08, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(neck_r, 0.09, mat_dark_carbon))

# Head & Kabuto Helmet
ronin_parts.append(create_sphere(head_r, 0.18, mat_dark_carbon))
ronin_parts.append(create_sphere((head_r[0]-0.02, head_r[1], head_r[2]+0.03), 0.19, mat_dark_carbon))
ronin_parts.append(create_box((head_r[0]+0.10, head_r[1], head_r[2]+0.03), (0.09, 0.30, 0.06), (0, radians(8), 0), mat_gold_accent))
ronin_parts.append(create_box((head_r[0]+0.15, head_r[1], head_r[2]+0.01), (0.05, 0.22, 0.03), (0, radians(8), 0), mat_cyan_glow))

# Kuwasagata Samurai Crest Horns
ronin_parts.append(create_limb((head_r[0]+0.11, head_r[1]-0.06, head_r[2]+0.10), (head_r[0]+0.06, head_r[1]-0.25, head_r[2]+0.35), 0.032, 0.012, mat_gold_accent))
ronin_parts.append(create_limb((head_r[0]+0.11, head_r[1]+0.06, head_r[2]+0.10), (head_r[0]+0.06, head_r[1]+0.25, head_r[2]+0.35), 0.032, 0.012, mat_gold_accent))

# Dynamic Energy Scarf
scarf_pts = [
    (neck_r[0]-0.06, neck_r[1]-0.04, neck_r[2]+0.04),
    (neck_r[0]-0.30, neck_r[1]-0.10, neck_r[2]+0.06),
    (neck_r[0]-0.60, neck_r[1]-0.16, neck_r[2]+0.01),
    (neck_r[0]-0.90, neck_r[1]-0.22, neck_r[2]-0.08),
    (neck_r[0]-1.20, neck_r[1]-0.28, neck_r[2]-0.20),
]
for si in range(len(scarf_pts)-1):
    ronin_parts.append(create_limb(scarf_pts[si], scarf_pts[si+1], 0.08 - si*0.01, 0.07 - si*0.01, mat=mat_cyan_glow))

# Arms & Two-Handed Katana Guard
shoulder_rr = (-1.85, -0.25, 1.55)
elbow_rr = (-1.55, -0.22, 1.35)
hand_rr = (-1.25, -0.10, 1.45)

shoulder_rl = (-2.05, 0.25, 1.55)
elbow_rl = (-1.75, 0.20, 1.30)
hand_rl = (-1.40, -0.05, 1.38)

ronin_parts.append(create_sphere(shoulder_rr, 0.10, mat_cyan_glow))
ronin_parts.append(create_box((shoulder_rr[0], shoulder_rr[1]-0.06, shoulder_rr[2]+0.05), (0.20, 0.10, 0.16), (radians(20), 0, radians(15)), mat_dark_carbon))
ronin_parts.append(create_box((shoulder_rr[0], shoulder_rr[1]-0.09, shoulder_rr[2]+0.06), (0.16, 0.03, 0.13), (radians(20), 0, radians(15)), mat_cyan_glow))

ronin_parts.append(create_limb(shoulder_rr, elbow_rr, 0.075, 0.065, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(elbow_rr, 0.075, mat_cyan_glow))
ronin_parts.append(create_limb(elbow_rr, hand_rr, 0.065, 0.06, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(hand_rr, 0.075, mat_chrome_trim))

ronin_parts.append(create_sphere(shoulder_rl, 0.10, mat_cyan_glow))
ronin_parts.append(create_box((shoulder_rl[0], shoulder_rl[1]+0.06, shoulder_rl[2]+0.05), (0.20, 0.10, 0.16), (radians(-20), 0, radians(-15)), mat_dark_carbon))
ronin_parts.append(create_box((shoulder_rl[0], shoulder_rl[1]+0.09, shoulder_rl[2]+0.06), (0.16, 0.03, 0.13), (radians(-20), 0, radians(-15)), mat_cyan_glow))

ronin_parts.append(create_limb(shoulder_rl, elbow_rl, 0.075, 0.065, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(elbow_rl, 0.075, mat_cyan_glow))
ronin_parts.append(create_limb(elbow_rl, hand_rl, 0.065, 0.06, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(hand_rl, 0.075, mat_chrome_trim))

# Azure Plasma Katana (Blade points across the center ring)
hilt_rear = (-1.45, -0.03, 1.35)
hilt_tsuba = (-1.15, -0.12, 1.50)
ronin_parts.append(create_limb(hilt_rear, hilt_tsuba, 0.03, 0.03, mat=mat_dark_carbon))
ronin_parts.append(create_sphere(hilt_rear, 0.04, mat_gold_accent))

tsuba_norm = mathutils.Vector(hilt_tsuba) - mathutils.Vector(hilt_rear)
rot_tsuba = mathutils.Vector((0,0,1)).rotation_difference(tsuba_norm).to_euler()
ronin_parts.append(create_cone(hilt_tsuba, 0.09, 0.09, 0.02, rot_tsuba, mat=mat_gold_accent))

blade_mid = (-0.52, -0.10, 1.68)
blade_tip = (0.10, -0.08, 1.85)
ronin_parts.append(create_limb(hilt_tsuba, blade_mid, 0.035, 0.03, mat=mat_cyan_glow))
ronin_parts.append(create_limb(blade_mid, blade_tip, 0.03, 0.012, mat=mat_cyan_glow))

add_light("Ronin_Katana_GlowLight", 'POINT', 100, (0.0, 0.95, 1.0), blade_mid)

# Join Shadow Ronin into a single unified mesh
bpy.ops.object.select_all(action='DESELECT')
for p in ronin_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = ronin_parts[0]
bpy.ops.object.join()
ronin_obj = bpy.context.active_object
ronin_obj.name = "Shadow_Ronin"

# Set origin to cursor (0,0,0) to keep position clean
scene.cursor.location = (0, 0, 0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ----------------------------------------------------------------------
# 8. BUILD CYBER VALKYRIE (FREYA) - 100% TRUE 3D SCULPTURAL CHARACTER (HEROIC 3/4)
# ----------------------------------------------------------------------
RX = 2.25
theta = radians(-32) # facing -X and -Y (towards Ronin & Camera!)
F = mathutils.Vector((-cos(theta), sin(theta), 0.0))  # Forward vector
R = mathutils.Vector((sin(theta), cos(theta), 0.0))   # Right vector
U = mathutils.Vector((0.0, 0.0, 1.0))                 # Up vector
Origin = mathutils.Vector((RX, 0.0, 0.0))

def to_w(lx, ly, lz):
    return Origin + lx * F + ly * R + lz * U

valk_parts = []

# --- LEGS & COMBAT BOOTS ---
hip_l_loc = (0.0, -0.16, 1.08)
knee_l_loc = (0.34, -0.24, 0.60)
ankle_l_loc = (0.42, -0.28, 0.16)
foot_l_loc = (0.48, -0.30, 0.05)

hip_r_loc = (0.0, 0.16, 1.08)
knee_r_loc = (-0.28, 0.22, 0.60)
ankle_r_loc = (-0.42, 0.26, 0.16)
foot_r_loc = (-0.48, 0.28, 0.05)

for ft_loc, ft_rot in [(foot_l_loc, 15), (foot_r_loc, -20)]:
    w_ft = to_w(*ft_loc)
    valk_parts.append(create_box(w_ft, (0.34, 0.18, 0.08), mat=mat_dark_carbon))
    w_toe = to_w(ft_loc[0]+0.08, ft_loc[1], ft_loc[2]+0.02)
    valk_parts.append(create_box(w_toe, (0.16, 0.16, 0.08), mat=mat_valk_crimson))
    w_rim = to_w(ft_loc[0]+0.15, ft_loc[1], ft_loc[2])
    valk_parts.append(create_box(w_rim, (0.04, 0.16, 0.04), mat=mat_gold_accent))

for a_loc, k_loc, sign_y in [(ankle_l_loc, knee_l_loc, -1), (ankle_r_loc, knee_r_loc, 1)]:
    w_a = to_w(*a_loc)
    w_k = to_w(*k_loc)
    valk_parts.append(create_sphere(w_a, 0.08, mat=mat_dark_carbon))
    valk_parts.append(create_limb(w_a, w_k, 0.08, 0.10, mat=mat_dark_carbon))
    mid_loc = ((a_loc[0]+k_loc[0])/2 + 0.04, (a_loc[1]+k_loc[1])/2, (a_loc[2]+k_loc[2])/2)
    w_mid = to_w(*mid_loc)
    valk_parts.append(create_box(w_mid, (0.07, 0.13, 0.32), mat=mat_valk_crimson))
    w_gold = to_w(mid_loc[0]+0.03, mid_loc[1], mid_loc[2])
    valk_parts.append(create_box(w_gold, (0.02, 0.11, 0.30), mat=mat_gold_accent))
    w_glow = to_w(mid_loc[0]+0.04, mid_loc[1], mid_loc[2])
    valk_parts.append(create_box(w_glow, (0.015, 0.03, 0.26), mat=mat_crimson_glow))

for k_loc in [knee_l_loc, knee_r_loc]:
    w_k = to_w(*k_loc)
    valk_parts.append(create_sphere(w_k, 0.10, mat=mat_dark_carbon))
    w_kplate = to_w(k_loc[0]+0.06, k_loc[1], k_loc[2])
    valk_parts.append(create_box(w_kplate, (0.08, 0.16, 0.16), mat=mat_valk_crimson))
    w_krim = to_w(k_loc[0]+0.09, k_loc[1], k_loc[2])
    valk_parts.append(create_box(w_krim, (0.03, 0.14, 0.14), mat=mat_gold_accent))
    w_knode = to_w(k_loc[0]+0.11, k_loc[1], k_loc[2])
    valk_parts.append(create_sphere(w_knode, 0.04, mat=mat_crimson_glow))

for k_loc, h_loc in [(knee_l_loc, hip_l_loc), (knee_r_loc, hip_r_loc)]:
    w_k = to_w(*k_loc)
    w_h = to_w(*h_loc)
    valk_parts.append(create_limb(w_k, w_h, 0.10, 0.13, mat=mat_dark_carbon))
    valk_parts.append(create_sphere(w_h, 0.12, mat_dark_carbon))
    mid_th = ((k_loc[0]+h_loc[0])/2 + 0.04, (k_loc[1]+h_loc[1])/2, (k_loc[2]+h_loc[2])/2)
    w_th = to_w(*mid_th)
    valk_parts.append(create_box(w_th, (0.08, 0.16, 0.30), mat=mat_valk_crimson))
    w_th_gold = to_w(mid_th[0]+0.04, mid_th[1], mid_th[2])
    valk_parts.append(create_box(w_th_gold, (0.02, 0.14, 0.28), mat=mat_gold_accent))

# --- PELVIS & WAIST BELT ---
pelvis_loc = (0.0, 0.0, 1.08)
waist_loc = (0.0, 0.0, 1.22)
valk_parts.append(create_sphere(to_w(*pelvis_loc), 0.18, mat=mat_dark_carbon))
valk_parts.append(create_limb(to_w(*pelvis_loc), to_w(*waist_loc), 0.16, 0.14, mat=mat_dark_carbon))
valk_parts.append(create_disc(to_w(*waist_loc), 0.19, 0.10, mat=mat_gold_accent))
valk_parts.append(create_box(to_w(0.19, 0.0, 1.22), (0.04, 0.14, 0.12), mat=mat_valk_crimson))
valk_parts.append(create_sphere(to_w(0.21, 0.0, 1.22), 0.035, mat=mat_crimson_glow))

# --- TORSO, CUIRASS & CRIMSON ARC CORE ---
chest_loc = (0.04, 0.0, 1.45)
neck_loc = (0.03, 0.0, 1.68)
valk_parts.append(create_limb(to_w(*waist_loc), to_w(*chest_loc), 0.14, 0.19, mat=mat_dark_carbon))
valk_parts.append(create_box(to_w(0.12, 0.0, 1.32), (0.05, 0.18, 0.08), mat=mat_valk_crimson))

# Breastplate Carapace
valk_parts.append(create_box(to_w(0.08, -0.11, 1.48), (0.16, 0.18, 0.22), mat=mat_valk_crimson))
valk_parts.append(create_box(to_w(0.08, 0.11, 1.48), (0.16, 0.18, 0.22), mat=mat_valk_crimson))
valk_parts.append(create_box(to_w(0.16, -0.11, 1.48), (0.02, 0.16, 0.20), mat=mat_gold_accent))
valk_parts.append(create_box(to_w(0.16, 0.11, 1.48), (0.02, 0.16, 0.20), mat=mat_gold_accent))

# Crimson Arc Core
w_core = to_w(0.18, 0.0, 1.47)
valk_parts.append(create_disc(w_core, 0.085, 0.04, mat=mat_gold_accent))
valk_parts.append(create_disc(to_w(0.20, 0.0, 1.47), 0.065, 0.03, mat=mat_chrome_trim))
valk_parts.append(create_sphere(to_w(0.21, 0.0, 1.47), 0.052, mat=mat_crimson_glow))
valk_parts.append(create_sphere(to_w(0.225, 0.0, 1.47), 0.028, mat=mat_amber_glow))

add_light("Valk_ArcCore_Light", 'POINT', 180, (1.0, 0.1, 0.05), to_w(0.35, 0.0, 1.47))

# --- HEAD, HELMET, WING CRESTS & PONYTAIL PLUME ---
valk_parts.append(create_limb(to_w(*chest_loc), to_w(*neck_loc), 0.10, 0.085, mat=mat_dark_carbon))
valk_parts.append(create_sphere(to_w(*neck_loc), 0.09, mat=mat_dark_carbon))

head_loc = (0.05, 0.0, 1.88)
valk_parts.append(create_sphere(to_w(*head_loc), 0.17, mat=mat_dark_carbon))
valk_parts.append(create_sphere(to_w(head_loc[0]-0.02, head_loc[1], head_loc[2]+0.02), 0.185, mat=mat_valk_crimson))
valk_parts.append(create_box(to_w(0.08, 0.0, 1.94), (0.12, 0.24, 0.07), mat=mat_gold_accent))
valk_parts.append(create_box(to_w(0.14, 0.0, 1.90), (0.05, 0.22, 0.035), mat=mat_crimson_glow))

for sign_y in [-1, 1]:
    w_ear = to_w(0.02, sign_y*0.17, 1.88)
    valk_parts.append(create_disc(w_ear, 0.05, 0.03, mat=mat_chrome_trim))
    valk_parts.append(create_sphere(to_w(0.02, sign_y*0.185, 1.88), 0.025, mat=mat_crimson_glow))
    valk_parts.append(create_limb(to_w(0.02, sign_y*0.18, 1.93), to_w(-0.24, sign_y*0.34, 2.20), 0.035, 0.012, mat=mat_gold_accent))
    valk_parts.append(create_limb(to_w(-0.02, sign_y*0.18, 1.97), to_w(-0.20, sign_y*0.31, 2.25), 0.028, 0.010, mat=mat_gold_accent))
    valk_parts.append(create_limb(to_w(-0.05, sign_y*0.18, 2.01), to_w(-0.16, sign_y*0.27, 2.28), 0.022, 0.008, mat=mat_gold_accent))

plume_collar = to_w(-0.14, 0.0, 2.02)
valk_parts.append(create_disc(plume_collar, 0.05, 0.04, mat=mat_gold_accent))
plume_locs = [
    (-0.14, 0.0, 2.02),
    (-0.32, 0.0, 2.00),
    (-0.52, 0.0, 1.88),
    (-0.72, 0.0, 1.68),
    (-0.90, 0.0, 1.42),
]
for pi in range(len(plume_locs)-1):
    r_start = 0.075 - pi * 0.012
    r_end = 0.065 - pi * 0.012
    valk_parts.append(create_limb(to_w(*plume_locs[pi]), to_w(*plume_locs[pi+1]), r_start, r_end, mat=mat_hair_gold))
    for sy in [-0.04, 0.04]:
        p_a = to_w(plume_locs[pi][0], plume_locs[pi][1]+sy, plume_locs[pi][2])
        p_b = to_w(plume_locs[pi+1][0], plume_locs[pi+1][1]+sy*0.8, plume_locs[pi+1][2])
        valk_parts.append(create_limb(p_a, p_b, r_start*0.7, r_end*0.7, mat=mat_hair_gold))

# --- VALKYRIE MECHANICAL BACK WINGS ---
wing_core_loc = (-0.18, 0.0, 1.55)
w_wcore = to_w(*wing_core_loc)
valk_parts.append(create_disc(w_wcore, 0.12, 0.08, mat=mat_dark_carbon))
valk_parts.append(create_disc(to_w(wing_core_loc[0]-0.04, 0.0, 1.55), 0.09, 0.04, mat=mat_gold_accent))
valk_parts.append(create_sphere(to_w(wing_core_loc[0]-0.06, 0.0, 1.55), 0.06, mat=mat_crimson_glow))

add_light("Valk_WingThruster_Light", 'POINT', 240, (1.0, 0.05, 0.2), to_w(wing_core_loc[0]-0.25, 0.0, 1.55))

for sign_y in [-1, 1]:
    spar_root = to_w(wing_core_loc[0], sign_y*0.12, wing_core_loc[2]+0.02)
    spar_tip = to_w(wing_core_loc[0]-0.18, sign_y*0.38, wing_core_loc[2]+0.16)
    valk_parts.append(create_limb(spar_root, spar_tip, 0.05, 0.04, mat=mat_dark_carbon))
    valk_parts.append(create_sphere(spar_tip, 0.055, mat=mat_chrome_trim))
    
    blade_configs = [
        (0.85, radians(-35), sign_y*radians(32), -0.04),
        (0.68, radians(-20), sign_y*radians(40), 0.04),
        (0.50, radians(-5),  sign_y*radians(48), 0.12),
        (0.35, radians(12),  sign_y*radians(55), 0.20),
    ]
    for blen, rot_x, rot_z, z_off in blade_configs:
        tip_loc = (
            wing_core_loc[0] - 0.18 - blen * cos(rot_x) * cos(rot_z),
            sign_y * (0.38 + blen * sin(rot_z)),
            wing_core_loc[2] + 0.16 + z_off + blen * sin(rot_x)
        )
        b_root = spar_tip
        b_tip = to_w(*tip_loc)
        valk_parts.append(create_limb(b_root, b_tip, 0.045, 0.015, mat=mat_valk_crimson))
        valk_parts.append(create_limb(b_root, b_tip, 0.02, 0.008, mat=mat_gold_accent))
        valk_parts.append(create_limb(b_root, b_tip, 0.018, 0.006, mat=mat_crimson_glow))

# --- PAULDRONS & HYDRAULIC GAUNTLETS ---
sh_l_loc = (0.06, -0.28, 1.55)
sh_r_loc = (0.02, 0.28, 1.55)

for sh_loc, sign_y in [(sh_l_loc, -1), (sh_r_loc, 1)]:
    w_sh = to_w(*sh_loc)
    valk_parts.append(create_sphere(w_sh, 0.11, mat=mat_dark_carbon))
    w_p = to_w(sh_loc[0], sh_loc[1]+sign_y*0.09, sh_loc[2]+0.06)
    valk_parts.append(create_box(w_p, (0.28, 0.20, 0.22), mat=mat_valk_crimson))
    w_p_gold = to_w(sh_loc[0]+0.06, sh_loc[1]+sign_y*0.09, sh_loc[2]+0.08)
    valk_parts.append(create_box(w_p_gold, (0.16, 0.22, 0.05), mat=mat_gold_accent))

# Lead Arm (Guard Raised)
el_l_loc = (0.32, -0.24, 1.34)
wr_l_loc = (0.58, -0.16, 1.46)
fist_l_loc = (0.76, -0.12, 1.52)

w_sh_l = to_w(*sh_l_loc)
w_el_l = to_w(*el_l_loc)
w_wr_l = to_w(*wr_l_loc)
w_fist_l = to_w(*fist_l_loc)

valk_parts.append(create_limb(w_sh_l, w_el_l, 0.095, 0.085, mat=mat_dark_carbon))
valk_parts.append(create_sphere(w_el_l, 0.09, mat=mat_dark_carbon))
valk_parts.append(create_limb(w_el_l, w_wr_l, 0.13, 0.15, mat=mat_valk_crimson))
valk_parts.append(create_limb(w_el_l, w_wr_l, 0.03, 0.03, mat=mat_chrome_trim))
valk_parts.append(create_limb(w_el_l, w_wr_l, 0.025, 0.025, mat=mat_crimson_glow))
valk_parts.append(create_box(w_fist_l, (0.24, 0.22, 0.22), mat=mat_valk_crimson))
valk_parts.append(create_box(to_w(fist_l_loc[0]+0.11, fist_l_loc[1], fist_l_loc[2]), (0.04, 0.20, 0.18), mat=mat_gold_accent))
valk_parts.append(create_box(to_w(fist_l_loc[0]+0.13, fist_l_loc[1], fist_l_loc[2]), (0.02, 0.16, 0.14), mat=mat_crimson_glow))

add_light("Valk_Gauntlet_Light", 'POINT', 140, (1.0, 0.15, 0.05), w_fist_l)

# Rear Arm (Cocked at Ribs)
el_r_loc = (-0.15, 0.32, 1.25)
wr_r_loc = (0.16, 0.24, 1.32)
fist_r_loc = (0.34, 0.18, 1.36)

w_sh_r = to_w(*sh_r_loc)
w_el_r = to_w(*el_r_loc)
w_wr_r = to_w(*wr_r_loc)
w_fist_r = to_w(*fist_r_loc)

valk_parts.append(create_limb(w_sh_r, w_el_r, 0.095, 0.085, mat=mat_dark_carbon))
valk_parts.append(create_sphere(w_el_r, 0.09, mat=mat_dark_carbon))
valk_parts.append(create_limb(w_el_r, w_wr_r, 0.13, 0.15, mat=mat_valk_crimson))
valk_parts.append(create_limb(w_el_r, w_wr_r, 0.03, 0.03, mat=mat_chrome_trim))
valk_parts.append(create_limb(w_el_r, w_wr_r, 0.025, 0.025, mat=mat_crimson_glow))
valk_parts.append(create_box(w_fist_r, (0.24, 0.22, 0.22), mat=mat_valk_crimson))
valk_parts.append(create_box(to_w(fist_r_loc[0]+0.11, fist_r_loc[1], fist_r_loc[2]), (0.04, 0.20, 0.18), mat=mat_gold_accent))
valk_parts.append(create_box(to_w(fist_r_loc[0]+0.13, fist_r_loc[1], fist_r_loc[2]), (0.02, 0.16, 0.14), mat=mat_crimson_glow))

# Join Cyber Valkyrie into a single unified 3D mesh
valid_valk_parts = [p for p in valk_parts if p is not None]
bpy.ops.object.select_all(action='DESELECT')
for p in valid_valk_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = valid_valk_parts[0]
bpy.ops.object.join()
valk_obj = bpy.context.active_object
valk_obj.name = "Cyber_Valkyrie"

scene.cursor.location = (RX, 0.0, 0.0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
print(f">>> Cyber Valkyrie 100% True 3D Mesh successfully built with {len(valid_valk_parts)} joined elements!")

# ----------------------------------------------------------------------
# 9. 3D Floating In-Scene Holographic HUD (Joined into 'Combat_HUD')
# ----------------------------------------------------------------------
hud_parts = []
HUD_Y = -1.2
HUD_Z = 2.85

hud_parts.append(create_box((-2.5, HUD_Y, HUD_Z), (2.6, 0.04, 0.20), mat=mat_dark_carbon))
hud_parts.append(create_box((-2.7, HUD_Y - 0.02, HUD_Z), (2.2, 0.02, 0.14), mat=mat_cyan_glow))

hud_parts.append(create_box((2.5, HUD_Y, HUD_Z), (2.6, 0.04, 0.20), mat=mat_dark_carbon))
hud_parts.append(create_box((2.65, HUD_Y - 0.02, HUD_Z), (2.3, 0.02, 0.14), mat=mat_crimson_glow))

bpy.ops.object.text_add(location=(-3.7, HUD_Y - 0.04, HUD_Z + 0.16))
txt_ronin = bpy.context.active_object
txt_ronin.name = "HUD_Name_Ronin"
txt_ronin.data.body = "SHADOW RONIN // KAGE"
txt_ronin.data.size = 0.19
txt_ronin.data.extrude = 0.02
txt_ronin.rotation_euler = (radians(90), 0, 0)
txt_ronin.data.materials.append(mat_cyan_glow)

bpy.ops.object.text_add(location=(1.35, HUD_Y - 0.04, HUD_Z + 0.16))
txt_valk = bpy.context.active_object
txt_valk.name = "HUD_Name_Valk"
txt_valk.data.body = "CYBER VALKYRIE // FREYA"
txt_valk.data.size = 0.19
txt_valk.data.extrude = 0.02
txt_valk.rotation_euler = (radians(90), 0, 0)
txt_valk.data.materials.append(mat_crimson_glow)

bpy.ops.object.text_add(location=(-0.75, HUD_Y - 0.04, HUD_Z + 0.05))
txt_round = bpy.context.active_object
txt_round.name = "HUD_Text_Round"
txt_round.data.body = "ROUND 1"
txt_round.data.size = 0.30
txt_round.data.extrude = 0.03
txt_round.rotation_euler = (radians(90), 0, 0)
txt_round.data.materials.append(mat_gold_accent)

bpy.ops.object.text_add(location=(-0.45, HUD_Y - 0.04, HUD_Z - 0.24))
txt_fight = bpy.context.active_object
txt_fight.name = "HUD_Text_Fight"
txt_fight.data.body = "FIGHT!"
txt_fight.data.size = 0.22
txt_fight.data.extrude = 0.03
txt_fight.rotation_euler = (radians(90), 0, 0)
txt_fight.data.materials.append(mat_magenta_glow)

bpy.ops.object.select_all(action='DESELECT')
for p in hud_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = hud_parts[0]
bpy.ops.object.join()
hud_obj = bpy.context.active_object
hud_obj.name = "Combat_HUD"

# ----------------------------------------------------------------------
# 10. Cinematic Combat Camera (Perfect 16:9 Battle Framing)
# ----------------------------------------------------------------------
cam_data = bpy.data.cameras.new("KeyFury_Combat_Cam")
cam_data.lens = 40.0
cam_data.clip_start = 0.1
cam_data.clip_end = 200.0

cam_obj = bpy.data.objects.new("KeyFury_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -10.5, 2.3)
cam_obj.rotation_euler = (radians(82.0), 0, 0)

dof_target = bpy.data.objects.new("Cam_DOF_Target", None)
dof_target.location = (0.0, 0.0, 1.35)
bpy.context.collection.objects.link(dof_target)

cam_data.dof.use_dof = True
cam_data.dof.focus_object = dof_target
cam_data.dof.aperture_fstop = 4.5

# ----------------------------------------------------------------------
# 11. Subtle Combat Breathing Animation (Frames 1-60 Loop)
# ----------------------------------------------------------------------
for f in [1, 30, 60]:
    scene.frame_set(f)
    bob_r = 0.015 * sin((f / 60.0) * 2 * math.pi)
    ronin_obj.location = (0, 0, bob_r)
    ronin_obj.keyframe_insert(data_path="location", frame=f)
    
    bob_v = 0.015 * sin((f / 60.0) * 2 * math.pi + math.pi)
    valk_obj.location = (0, 0, bob_v)
    valk_obj.keyframe_insert(data_path="location", frame=f)

scene.frame_set(1)

# ----------------------------------------------------------------------
# 12. Save Blender Project & Export
# ----------------------------------------------------------------------
blend_output_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend"
bpy.ops.wm.save_as_mainfile(filepath=blend_output_path)
print(f">>> Saved Blender project to: {blend_output_path}")

# 1. Render EEVEE Still
render_output_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_Arena_Render.png"
scene.render.filepath = render_output_path
bpy.ops.render.render(write_still=True)
print(f">>> Rendered EEVEE still to: {render_output_path}")

# 2. Render Solid Workbench Still for Viewport verification
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.render.filepath = r"d:\Keyboard stickman warrior\test_3d\solid_viewport_test.png"
bpy.ops.render.render(write_still=True)
scene.render.engine = 'BLENDER_EEVEE'
print(">>> Rendered Solid Workbench still!")

# 3. Export GLB
glb_output_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_Arena.glb"
bpy.ops.export_scene.gltf(filepath=glb_output_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> Exported GLB model to: {glb_output_path}")

# Update index.html copy
shutil.copy(r"d:\Keyboard stickman warrior\test_3d\viewer.html", r"d:\Keyboard stickman warrior\test_3d\index.html")

print(">>> ALL GENERATION TASKS FINISHED SUCCESSFULLY!")
print(f"Total Objects in Scene: {len(bpy.data.objects)}")
print(f"Total Materials in Scene: {len(bpy.data.materials)}")

"""
KeyFury 3D: Celestial Void Shrine (100% Pure 3D Production Environment)
Authored for Blender 5.2.1 LTS - EEVEE Next Engine
Matching Reference Art: apps/web/src/assets/arenas/celestial_void.jpg

Masterpiece 3D Environment Architecture:
1. White Celestial Astral Marble Sanctuary Platform at Z = 0.0 with neon magenta edge trim.
2. 5 Intricate Glowing Sacred Summoning Circles (Center Grand Octagram in Magenta, Radiant Cyan side circles, Balcony circle, Dais pool).
3. Semicircular Front Balcony with Grand Descending Ceremonial Stairs & 4 Carved Stone Pagoda Lanterns with Warm Golden Glow.
4. Classical Stone Balustrades with Turned Urn Balusters and continuous molded handrails.
5. Sweeping Curved Secondary Staircase on the Right descending into the cosmic void with outer stone balustrade.
6. 6 Runic Monoliths / Obelisks with vertical glowing ancient glyphs and embedded cyan crystal clusters.
7. Rear Elevated Circular Shrine Dais with 7-step ceremonial staircase and fluted marble columns.
8. Triple Triumphal Gothic Archway with molded archivolts, gabled pediment, and glowing diamond crest.
9. Levitating Celestial Power Core crystal with orbiting satellite gems and dual-colored swirling energy ribbons.
10. Floating Weightless Rock Islands:
    - Left: Colossal amethyst crystal cluster with faceted spires & hanging cyan stalactites.
    - Right: Blooming Sakura cherry blossom tree with gnarled trunk, lush canopy, drifting petals, and amethyst cluster.
    - Mid-distance: Small floating island with amethyst spire.
11. Huge 3D Crescent Moon in the upper right sky with glowing silver-cyan crescent rim and shadowed earthshine lunar sphere.
12. 3D Procedural Volumetric Anime Cloud Banks billowing in the celestial void and deep chasm.
13. Dual 3D Spiral Galaxies with swirling spiral arms and continuous ribbon geometry.
14. Sparkling 3D Starfield Array inside a deep celestial space dome with painterly cosmic gradient.
15. Calibrated 16:9 Combat Camera (Platform Ratio: ~0.71, walking surface precisely at Z = 0.0).
16. Rich Anime Color Palette under 'Standard' view transform (no AgX desaturation).
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix
import math
from math import radians, sin, cos, sqrt, pi
import sys
import os
import traceback
import random

log_path = r"d:\Keyboard stickman warrior\test_3d\celestial_debug.log"
log_file = open(log_path, "w", buffering=1, encoding="utf-8")
sys.stdout = log_file
sys.stderr = log_file

print(">>> [Celestial Void 100% 3D] Initializing High-Fidelity Scene Build...")

# -----------------------------------------------------------------------------
# 1. SCENE CLEANUP & ENGINE CONFIGURATION
# -----------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0: bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0: bpy.data.materials.remove(block)
for block in bpy.data.images:
    if block.users == 0: bpy.data.images.remove(block)
for block in bpy.data.lights:
    if block.users == 0: bpy.data.lights.remove(block)
for block in bpy.data.cameras:
    if block.users == 0: bpy.data.cameras.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'High Contrast'
    scene.view_settings.exposure = 0.12

out_dir = r"d:\Keyboard stickman warrior\test_3d"

# -----------------------------------------------------------------------------
# 2. PBR SHADER & MATERIAL GENERATOR
# -----------------------------------------------------------------------------
def make_pbr_material(name, base_color=(0.9, 0.9, 0.95, 1.0), roughness=0.25, metallic=0.05, specular=0.5,
                      emission_color=(0,0,0,1), emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        if emission_strength > 0.0:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission_color
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = emission_color
    return mat

def make_emissive_material(name, color=(0.8, 0.3, 1.0, 1.0), strength=2.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

def make_moon_dark_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.016, 0.014, 0.028, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.95
        bsdf.inputs['Metallic'].default_value = 0.01
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = (0.010, 0.008, 0.020, 1.0)
            bsdf.inputs['Emission Strength'].default_value = 0.08
        tex_noise = nodes.new(type='ShaderNodeTexNoise')
        tex_noise.inputs['Scale'].default_value = 16.0
        tex_noise.inputs['Detail'].default_value = 3.5
        tex_noise.inputs['Roughness'].default_value = 0.65
        bump = nodes.new(type='ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.22
        mat.node_tree.links.new(tex_noise.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat

def make_space_dome_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    tex_coord = nodes.new(type='ShaderNodeTexCoord')
    mapping = nodes.new(type='ShaderNodeMapping')
    grad = nodes.new(type='ShaderNodeTexGradient')
    cramp = nodes.new(type='ShaderNodeValToRGB')
    
    mapping.inputs['Rotation'].default_value = (radians(90), 0, 0)
    mapping.inputs['Location'].default_value = (0, -0.2, 0)
    mapping.inputs['Scale'].default_value = (1, 2.5, 1)
    
    cramp.color_ramp.elements[0].position = 0.05
    cramp.color_ramp.elements[0].color = (0.012, 0.008, 0.032, 1.0)
    e_mid = cramp.color_ramp.elements.new(0.48)
    e_mid.color = (0.038, 0.014, 0.070, 1.0)
    cramp.color_ramp.elements[1].position = 0.95
    cramp.color_ramp.elements[1].color = (0.006, 0.004, 0.015, 1.0)
    
    mat.node_tree.links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
    mat.node_tree.links.new(mapping.outputs['Vector'], grad.inputs['Vector'])
    mat.node_tree.links.new(grad.outputs['Fac'], cramp.inputs['Fac'])
    mat.node_tree.links.new(cramp.outputs['Color'], emit.inputs['Color'])
    emit.inputs['Strength'].default_value = 0.85
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

# Architecture Materials
mat_celestial_marble = make_pbr_material("Mat_Celestial_Marble", (0.92, 0.94, 0.98, 1.0), roughness=0.15, metallic=0.04, specular=0.85)
mat_marble_trim      = make_pbr_material("Mat_Marble_Dark_Trim", (0.28, 0.29, 0.38, 1.0), roughness=0.22, metallic=0.12, specular=0.6)
mat_floating_rock    = make_pbr_material("Mat_Void_Rock",        (0.08, 0.07, 0.12, 1.0), roughness=0.85, metallic=0.02, specular=0.2)
mat_sakura_bark      = make_pbr_material("Mat_Sakura_Bark",      (0.14, 0.09, 0.10, 1.0), roughness=0.85, metallic=0.02)
mat_lantern_stone    = make_pbr_material("Mat_Lantern_Stone",    (0.22, 0.22, 0.30, 1.0), roughness=0.30, metallic=0.15)

# Sakura Blossom Foliage & Drifting Petals
mat_sakura_blossom   = make_pbr_material("Mat_Sakura_Blossom",   (0.98, 0.58, 0.78, 1.0), roughness=0.55, metallic=0.01,
                                         emission_color=(0.96, 0.44, 0.72, 1.0), emission_strength=0.45)
mat_sakura_petal     = make_emissive_material("Mat_Sakura_Petal", (1.00, 0.65, 0.85, 1.0), strength=2.4)

# Amethyst Gemstone Shader (Faceted deep royal purple crystal with inner glow)
mat_amethyst_gem     = make_pbr_material("Mat_Amethyst_Gem",     (0.20, 0.02, 0.42, 1.0), roughness=0.12, metallic=0.06, specular=0.95,
                                         emission_color=(0.65, 0.08, 0.92, 1.0), emission_strength=1.1)
mat_amethyst_glow    = make_emissive_material("Mat_Amethyst_Glow", (0.82, 0.18, 1.00, 1.0), strength=2.8)

# Magic & Celestial Glow Materials
mat_circle_magenta   = make_emissive_material("Mat_Circle_Magenta",   (0.96, 0.22, 0.86, 1.0), strength=2.8)
mat_circle_cyan      = make_emissive_material("Mat_Circle_Cyan",      (0.12, 0.88, 1.00, 1.0), strength=2.8)
mat_cyan_crystal     = make_emissive_material("Mat_Cyan_Crystal",     (0.15, 0.95, 1.00, 1.0), strength=3.0)
mat_moon_glow        = make_emissive_material("Mat_Moon_Glow",        (0.94, 0.98, 1.00, 1.0), strength=3.2)
mat_moon_halo        = make_emissive_material("Mat_Moon_Halo",        (0.35, 0.65, 0.95, 1.0), strength=0.8)
mat_moon_dark        = make_moon_dark_material("Mat_Moon_Dark")
mat_galaxy_core      = make_emissive_material("Mat_Galaxy_Core",      (0.92, 0.95, 1.00, 1.0), strength=3.5)
mat_lantern_gold     = make_emissive_material("Mat_Lantern_Gold",     (1.00, 0.80, 0.28, 1.0), strength=3.8)
mat_star_glow        = make_emissive_material("Mat_Star_Glow",        (0.95, 0.98, 1.00, 1.0), strength=2.8)
mat_space_dome       = make_space_dome_material("Mat_Space_Void")

# Procedural 3D Anime Celestial Clouds Material (Soft glowing cosmic indigo/violet)
mat_celestial_cloud  = make_pbr_material("Mat_Celestial_Cloud", (0.12, 0.08, 0.22, 1.0), roughness=0.75, metallic=0.01,
                                         specular=0.15, emission_color=(0.22, 0.10, 0.38, 1.0), emission_strength=0.55)

def add_mesh_object(name, mesh, mat=None):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj

# -----------------------------------------------------------------------------
# 3. CELESTIAL MARBLE SANCTUARY PLATFORM (Z = 0.0 Combat Grounding)
# -----------------------------------------------------------------------------
bm_plat = bmesh.new()
bm_trim = bmesh.new()
bm_neon = bmesh.new()
bm_rock = bmesh.new()
bm_lantern_stone = bmesh.new()
bm_lantern_cores = bmesh.new()

PLAT_W = 22.0
PLAT_D = 4.6
PLAT_H = 0.50

# A. Main Sanctuary Deck Slab (Top surface at Z = 0.0)
bmesh.ops.create_cube(bm_plat, size=1.0,
    matrix=Matrix.Translation((0.0, 0.0, -PLAT_H * 0.5)) @
           Matrix.Scale(PLAT_W, 4, (1,0,0)) @
           Matrix.Scale(PLAT_D, 4, (0,1,0)) @
           Matrix.Scale(PLAT_H, 4, (0,0,1)))

# Semicircular Front Balcony (radius 2.4m centered at Y = -2.3)
balcony_segments = 24
balc_radius = 2.4
balc_cx, balc_cy = 0.0, -2.3
v_center_top = bm_plat.verts.new((balc_cx, balc_cy, 0.0))
v_center_bot = bm_plat.verts.new((balc_cx, balc_cy, -PLAT_H))
top_arc, bot_arc = [], []
for i in range(balcony_segments + 1):
    ang = -pi + (pi * i / balcony_segments)
    vx = balc_cx + balc_radius * cos(ang)
    vy = balc_cy + balc_radius * sin(ang)
    vt = bm_plat.verts.new((vx, vy, 0.0))
    vb = bm_plat.verts.new((vx, vy, -PLAT_H))
    top_arc.append(vt)
    bot_arc.append(vb)
for i in range(balcony_segments):
    bm_plat.faces.new([v_center_top, top_arc[i+1], top_arc[i]])
    bm_plat.faces.new([v_center_bot, bot_arc[i], bot_arc[i+1]])
    bm_plat.faces.new([top_arc[i], top_arc[i+1], bot_arc[i+1], bot_arc[i]])

# B. Luminous Violet/Magenta Neon Edge Inset Ribbons
bmesh.ops.create_cube(bm_neon, size=1.0,
    matrix=Matrix.Translation((0.0, -PLAT_D * 0.5 - 0.02, -0.22)) @
           Matrix.Scale(PLAT_W + 0.05, 4, (1,0,0)) @
           Matrix.Scale(0.06, 4, (0,1,0)) @
           Matrix.Scale(0.10, 4, (0,0,1)))
bmesh.ops.create_cube(bm_neon, size=1.0,
    matrix=Matrix.Translation((-PLAT_W * 0.5 - 0.02, 0.0, -0.22)) @
           Matrix.Scale(0.06, 4, (1,0,0)) @
           Matrix.Scale(PLAT_D, 4, (0,1,0)) @
           Matrix.Scale(0.10, 4, (0,0,1)))
bmesh.ops.create_cube(bm_neon, size=1.0,
    matrix=Matrix.Translation((PLAT_W * 0.5 + 0.02, 0.0, -0.22)) @
           Matrix.Scale(0.06, 4, (1,0,0)) @
           Matrix.Scale(PLAT_D, 4, (0,1,0)) @
           Matrix.Scale(0.10, 4, (0,0,1)))

for i in range(balcony_segments):
    ang1 = -pi + (pi * i / balcony_segments)
    ang2 = -pi + (pi * (i + 1) / balcony_segments)
    r_n = balc_radius + 0.03
    v1 = bm_neon.verts.new((balc_cx + r_n * cos(ang1), balc_cy + r_n * sin(ang1), -0.16))
    v2 = bm_neon.verts.new((balc_cx + r_n * cos(ang2), balc_cy + r_n * sin(ang2), -0.16))
    v3 = bm_neon.verts.new((balc_cx + r_n * cos(ang2), balc_cy + r_n * sin(ang2), -0.26))
    v4 = bm_neon.verts.new((balc_cx + r_n * cos(ang1), balc_cy + r_n * sin(ang1), -0.26))
    bm_neon.faces.new([v1, v2, v3, v4])

# C. Flagstone Floor Paver Pattern Inlays (Elevated subtly above slab)
for row in range(5):
    py = -1.8 + row * 0.9
    for col in range(12):
        px = -9.9 + col * 1.8
        bmesh.ops.create_cube(bm_plat, size=1.0,
            matrix=Matrix.Translation((px, py, 0.005)) @
                   Matrix.Scale(1.72, 4, (1,0,0)) @
                   Matrix.Scale(0.82, 4, (0,1,0)) @
                   Matrix.Scale(0.010, 4, (0,0,1)))

# D. Front Descending Ceremonial Stairs (8 Steps)
num_front_steps = 8
step_w = 4.8
step_run = 0.42
step_rise = 0.15
start_y = -4.7
for s in range(num_front_steps):
    sy = start_y - s * step_run
    sz = -s * step_rise
    bmesh.ops.create_cube(bm_plat, size=1.0,
        matrix=Matrix.Translation((0.0, sy, sz - step_rise * 0.5)) @
               Matrix.Scale(step_w, 4, (1,0,0)) @
               Matrix.Scale(step_run + 0.06, 4, (0,1,0)) @
               Matrix.Scale(step_rise, 4, (0,0,1)))

# E. Sweeping Curved Secondary Staircase on the Right (Matching Concept Reference)
side_steps = 7
side_curve_cx = 7.5
side_curve_cy = 0.6
r_inner = 2.4
r_outer = 4.4
for s in range(side_steps):
    ang_start = radians(15 + s * 11)
    ang_end   = radians(15 + (s + 1) * 11)
    step_z    = -s * 0.15
    # Create curved tread quad
    v1 = bm_plat.verts.new((side_curve_cx + r_inner * cos(ang_start), side_curve_cy - r_inner * sin(ang_start), step_z))
    v2 = bm_plat.verts.new((side_curve_cx + r_outer * cos(ang_start), side_curve_cy - r_outer * sin(ang_start), step_z))
    v3 = bm_plat.verts.new((side_curve_cx + r_outer * cos(ang_end),   side_curve_cy - r_outer * sin(ang_end),   step_z))
    v4 = bm_plat.verts.new((side_curve_cx + r_inner * cos(ang_end),   side_curve_cy - r_inner * sin(ang_end),   step_z))
    bm_plat.faces.new([v1, v2, v3, v4])
    # Step riser
    v1_b = bm_plat.verts.new((side_curve_cx + r_inner * cos(ang_start), side_curve_cy - r_inner * sin(ang_start), step_z - 0.15))
    v2_b = bm_plat.verts.new((side_curve_cx + r_outer * cos(ang_start), side_curve_cy - r_outer * sin(ang_start), step_z - 0.15))
    bm_plat.faces.new([v1_b, v2_b, v2, v1])

# Outer balustrade along right curved stairs
for s in range(side_steps):
    ang_m = radians(15 + (s + 0.5) * 11)
    bx = side_curve_cx + (r_outer - 0.20) * cos(ang_m)
    by = side_curve_cy - (r_outer - 0.20) * sin(ang_m)
    bz = -s * 0.15
    bmesh.ops.create_cone(bm_plat, segments=8, radius1=0.07, radius2=0.05, depth=0.55,
        matrix=Matrix.Translation((bx, by, bz + 0.35)))

# F. Stone Balustrades with Classical Turned Urn Balusters
def build_balustrade(bm, start_pt, end_pt, num_balusters=8, height=0.75):
    p1 = Vector(start_pt)
    p2 = Vector(end_pt)
    vec = p2 - p1
    length = vec.length
    dir_v = vec.normalized()
    rot_z = math.atan2(dir_v.y, dir_v.x)
    mid = (p1 + p2) * 0.5
    
    bmesh.ops.create_cube(bm, size=1.0,
        matrix=Matrix.Translation((mid.x, mid.y, mid.z + 0.08)) @
               Matrix.Rotation(rot_z, 4, 'Z') @
               Matrix.Scale(length, 4, (1,0,0)) @
               Matrix.Scale(0.24, 4, (0,1,0)) @
               Matrix.Scale(0.16, 4, (0,0,1)))
    bmesh.ops.create_cube(bm, size=1.0,
        matrix=Matrix.Translation((mid.x, mid.y, mid.z + height - 0.06)) @
               Matrix.Rotation(rot_z, 4, 'Z') @
               Matrix.Scale(length + 0.04, 4, (1,0,0)) @
               Matrix.Scale(0.28, 4, (0,1,0)) @
               Matrix.Scale(0.12, 4, (0,0,1)))
    for b in range(num_balusters):
        frac = (b + 0.5) / num_balusters
        bpos = p1 + dir_v * (frac * length)
        bmesh.ops.create_cone(bm, segments=8, radius1=0.08, radius2=0.05, depth=height - 0.28,
            matrix=Matrix.Translation((bpos.x, bpos.y, bpos.z + height * 0.5)))
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.09,
            matrix=Matrix.Translation((bpos.x, bpos.y, bpos.z + height * 0.48)))

# Rear Balustrades
build_balustrade(bm_plat, (-10.8, 2.25, 0.0), (-2.4, 2.25, 0.0), num_balusters=10, height=0.80)
build_balustrade(bm_plat, (2.4, 2.25, 0.0), (6.8, 2.25, 0.0), num_balusters=6, height=0.80)

# Balustrades flanking front stairs
build_balustrade(bm_plat, (-2.5, -4.6, 0.0), (-2.5, -8.0, -1.15), num_balusters=6, height=0.75)
build_balustrade(bm_plat, (2.5, -4.6, 0.0), (2.5, -8.0, -1.15), num_balusters=6, height=0.75)

# Curved Balustrade along the front balcony rim with continuous handrail
balc_rail_segs = 12
balc_r_inner = balc_radius - 0.22
for b in range(balc_rail_segs):
    ang1 = -pi + (pi * b / balc_rail_segs)
    ang2 = -pi + (pi * (b + 1) / balc_rail_segs)
    ang_mid = (ang1 + ang2) * 0.5
    bx = balc_cx + balc_r_inner * cos(ang_mid)
    by = balc_cy + balc_r_inner * sin(ang_mid)
    bmesh.ops.create_cone(bm_plat, segments=8, radius1=0.07, radius2=0.05, depth=0.55,
        matrix=Matrix.Translation((bx, by, 0.35)))
    p1 = Vector((balc_cx + balc_r_inner * cos(ang1), balc_cy + balc_r_inner * sin(ang1), 0.65))
    p2 = Vector((balc_cx + balc_r_inner * cos(ang2), balc_cy + balc_r_inner * sin(ang2), 0.65))
    pmid = (p1 + p2) * 0.5
    rot = math.atan2(p2.y - p1.y, p2.x - p1.x)
    bmesh.ops.create_cube(bm_plat, size=1.0,
        matrix=Matrix.Translation(pmid) @
               Matrix.Rotation(rot, 4, 'Z') @
               Matrix.Scale((p2-p1).length + 0.02, 4, (1,0,0)) @
               Matrix.Scale(0.22, 4, (0,1,0)) @
               Matrix.Scale(0.08, 4, (0,0,1)))

# G. Four Carved Stone Pagoda Lantern Pedestals with Golden Celestial Lamps
lantern_coords = [
    (-2.55, -2.30, 0.0),   # Upper Left
    (2.55, -2.30, 0.0),    # Upper Right
    (-2.55, -8.0, -1.20),  # Lower Left
    (2.55, -8.0, -1.20)    # Lower Right
]
for lx, ly, lz in lantern_coords:
    bmesh.ops.create_cube(bm_lantern_stone, size=1.0,
        matrix=Matrix.Translation((lx, ly, lz + 0.35)) @
               Matrix.Scale(0.70, 4, (1,0,0)) @
               Matrix.Scale(0.70, 4, (0,1,0)) @
               Matrix.Scale(0.70, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_lantern_stone, size=1.0,
        matrix=Matrix.Translation((lx, ly, lz + 0.82)) @
               Matrix.Scale(0.52, 4, (1,0,0)) @
               Matrix.Scale(0.52, 4, (0,1,0)) @
               Matrix.Scale(0.35, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_lantern_stone, size=1.0,
        matrix=Matrix.Translation((lx, ly, lz + 1.05)) @
               Matrix.Scale(0.64, 4, (1,0,0)) @
               Matrix.Scale(0.64, 4, (0,1,0)) @
               Matrix.Scale(0.12, 4, (0,0,1)))
    for sx_c in [-0.22, 0.22]:
        for sy_c in [-0.22, 0.22]:
            bmesh.ops.create_cube(bm_lantern_stone, size=1.0,
                matrix=Matrix.Translation((lx + sx_c, ly + sy_c, lz + 1.25)) @
                       Matrix.Scale(0.08, 4, (1,0,0)) @
                       Matrix.Scale(0.08, 4, (0,1,0)) @
                       Matrix.Scale(0.32, 4, (0,0,1)))
    bmesh.ops.create_cone(bm_lantern_stone, segments=4, radius1=0.50, radius2=0.12, depth=0.22,
        matrix=Matrix.Translation((lx, ly, lz + 1.48)) @
               Matrix.Rotation(radians(45), 4, 'Z'))
    bmesh.ops.create_uvsphere(bm_lantern_stone, u_segments=6, v_segments=4, radius=0.09,
        matrix=Matrix.Translation((lx, ly, lz + 1.64)))
    bmesh.ops.create_uvsphere(bm_lantern_cores, u_segments=8, v_segments=6, radius=0.15,
        matrix=Matrix.Translation((lx, ly, lz + 1.25)))

# H. Floating Rock Crags & Jagged Keel Underneath Platform
under_crags = [
    (0.0, -0.8, -0.5, 4.4, 4.0),
    (-4.8, -0.5, -0.5, 3.8, 3.6),
    (4.8, -0.5, -0.5, 3.8, 3.6),
    (-8.8, 0.2, -0.5, 3.2, 3.4),
    (8.8, 0.2, -0.5, 3.2, 3.4),
    (0.0, -3.2, -0.5, 3.4, 3.2),
    (-2.4, -6.0, -1.0, 2.4, 2.6),
    (2.4, -6.0, -1.0, 2.4, 2.6),
]
for cx, cy, cz, crad, cdepth in under_crags:
    bmesh.ops.create_cone(bm_rock, segments=7, radius1=crad, radius2=0.15, depth=cdepth,
        matrix=Matrix.Translation((cx, cy, cz - cdepth * 0.5)))

bm_cyan_cryst = bmesh.new()
under_cryst = [
    (-6.5, -1.2, -3.2, 0.35, 1.8),
    (-2.8, -2.0, -3.5, 0.40, 2.2),
    (3.2, -1.8, -3.4, 0.38, 2.0),
    (7.2, -1.0, -3.0, 0.32, 1.6),
    (0.0, -5.2, -3.2, 0.42, 2.4)
]
for kx, ky, kz, krad, klen in under_cryst:
    bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=krad, radius2=0.04, depth=klen,
        matrix=Matrix.Translation((kx, ky, kz - klen * 0.5)))

plat_mesh = bpy.data.meshes.new("Celestial_Platform_Mesh")
bm_plat.to_mesh(plat_mesh)
bm_plat.free()
plat_obj = add_mesh_object("Celestial_Platform_Marble", plat_mesh, mat_celestial_marble)

neon_mesh = bpy.data.meshes.new("Celestial_Neon_Mesh")
bm_neon.to_mesh(neon_mesh)
bm_neon.free()
neon_obj = add_mesh_object("Celestial_Neon_Trim", neon_mesh, mat_circle_magenta)

lantern_stone_mesh = bpy.data.meshes.new("Celestial_Lantern_Stone_Mesh")
bm_lantern_stone.to_mesh(lantern_stone_mesh)
bm_lantern_stone.free()
lantern_stone_obj = add_mesh_object("Celestial_Lantern_Stone", lantern_stone_mesh, mat_lantern_stone)

lantern_cores_mesh = bpy.data.meshes.new("Celestial_Lantern_Cores_Mesh")
bm_lantern_cores.to_mesh(lantern_cores_mesh)
bm_lantern_cores.free()
lantern_cores_obj = add_mesh_object("Celestial_Lantern_Cores", lantern_cores_mesh, mat_lantern_gold)

# -----------------------------------------------------------------------------
# 4. INTRICATE GLOWING SACRED SUMMONING MAGIC CIRCLES (Z = 0.016)
# -----------------------------------------------------------------------------
bm_magic_mag = bmesh.new()
bm_magic_cya = bmesh.new()

def add_ring(bm, cx, cy, cz, r, width, segs=48):
    for s in range(segs):
        a1 = 2.0 * pi * s / segs
        a2 = 2.0 * pi * (s + 1) / segs
        r_in = r - width * 0.5
        r_out = r + width * 0.5
        v1 = bm.verts.new((cx + r_in * cos(a1), cy + r_in * sin(a1), cz))
        v2 = bm.verts.new((cx + r_out * cos(a1), cy + r_out * sin(a1), cz))
        v3 = bm.verts.new((cx + r_out * cos(a2), cy + r_out * sin(a2), cz))
        v4 = bm.verts.new((cx + r_in * cos(a2), cy + r_in * sin(a2), cz))
        bm.faces.new([v1, v2, v3, v4])

def add_star_polygon(bm, cx, cy, cz, r, points=6, width=0.05):
    for p in range(points):
        a1 = 2.0 * pi * p / points
        a2 = 2.0 * pi * (p + 2) / points
        p1 = Vector((cx + r * cos(a1), cy + r * sin(a1), cz))
        p2 = Vector((cx + r * cos(a2), cy + r * sin(a2), cz))
        tangent = (p2 - p1).normalized()
        normal = Vector((-tangent.y, tangent.x, 0.0)) * (width * 0.5)
        v1 = bm.verts.new(p1 - normal)
        v2 = bm.verts.new(p1 + normal)
        v3 = bm.verts.new(p2 + normal)
        v4 = bm.verts.new(p2 - normal)
        bm.faces.new([v1, v2, v3, v4])

def add_radial_runic_ticks(bm, cx, cy, cz, r_in, r_out, count=24, width=0.03):
    for c in range(count):
        ang = 2.0 * pi * c / count
        d_x = cos(ang)
        d_y = sin(ang)
        p1 = Vector((cx + r_in * d_x, cy + r_in * d_y, cz))
        p2 = Vector((cx + r_out * d_x, cy + r_out * d_y, cz))
        normal = Vector((-d_y, d_x, 0.0)) * (width * 0.5)
        v1 = bm.verts.new(p1 - normal)
        v2 = bm.verts.new(p1 + normal)
        v3 = bm.verts.new(p2 + normal)
        v4 = bm.verts.new(p2 - normal)
        bm.faces.new([v1, v2, v3, v4])

# A. Center Grand Summoning Circle (Magenta/Violet Sacred Octagram)
cz_ground = 0.016
add_ring(bm_magic_mag, 0.0, 0.0, cz_ground, 2.35, 0.07, 64)
add_ring(bm_magic_mag, 0.0, 0.0, cz_ground, 2.20, 0.04, 64)
add_radial_runic_ticks(bm_magic_mag, 0.0, 0.0, cz_ground, 2.20, 2.35, 36, 0.03)
add_ring(bm_magic_mag, 0.0, 0.0, cz_ground, 1.88, 0.05, 48)
add_star_polygon(bm_magic_mag, 0.0, 0.0, cz_ground, 1.88, points=8, width=0.04)
add_ring(bm_magic_mag, 0.0, 0.0, cz_ground, 1.18, 0.04, 36)
add_star_polygon(bm_magic_mag, 0.0, 0.0, cz_ground, 1.18, points=6, width=0.03)
add_ring(bm_magic_mag, 0.0, 0.0, cz_ground, 0.48, 0.04, 24)

# B. Left-Center Circle (Magenta/Violet Hexagram)
add_ring(bm_magic_mag, -5.0, 0.0, cz_ground, 1.50, 0.06, 40)
add_ring(bm_magic_mag, -5.0, 0.0, cz_ground, 1.35, 0.03, 40)
add_radial_runic_ticks(bm_magic_mag, -5.0, 0.0, cz_ground, 1.35, 1.50, 20, 0.025)
add_star_polygon(bm_magic_mag, -5.0, 0.0, cz_ground, 1.35, points=6, width=0.035)
add_ring(bm_magic_mag, -5.0, 0.0, cz_ground, 0.68, 0.04, 24)

# C. Right-Center Circle (Radiant Cyan Arcane Circle)
add_ring(bm_magic_cya, 5.0, 0.0, cz_ground, 1.50, 0.06, 40)
add_ring(bm_magic_cya, 5.0, 0.0, cz_ground, 1.35, 0.03, 40)
add_radial_runic_ticks(bm_magic_cya, 5.0, 0.0, cz_ground, 1.35, 1.50, 24, 0.025)
add_star_polygon(bm_magic_cya, 5.0, 0.0, cz_ground, 1.35, points=5, width=0.035)
add_ring(bm_magic_cya, 5.0, 0.0, cz_ground, 0.68, 0.04, 24)

# D. Far Left Circle (Radiant Cyan)
add_ring(bm_magic_cya, -8.6, 0.0, cz_ground, 1.18, 0.05, 32)
add_ring(bm_magic_cya, -8.6, 0.0, cz_ground, 0.78, 0.03, 24)
add_star_polygon(bm_magic_cya, -8.6, 0.0, cz_ground, 0.78, points=4, width=0.03)

# E. Far Right Circle (Magenta/Violet)
add_ring(bm_magic_mag, 8.6, 0.0, cz_ground, 1.18, 0.05, 32)
add_ring(bm_magic_mag, 8.6, 0.0, cz_ground, 0.78, 0.03, 24)
add_star_polygon(bm_magic_mag, 8.6, 0.0, cz_ground, 0.78, points=4, width=0.03)

# F. Front Balcony Landing Circle (Radiant Cyan)
add_ring(bm_magic_cya, 0.0, -3.1, cz_ground, 1.20, 0.05, 36)
add_ring(bm_magic_cya, 0.0, -3.1, cz_ground, 0.98, 0.03, 36)
add_star_polygon(bm_magic_cya, 0.0, -3.1, cz_ground, 0.98, points=6, width=0.03)
add_ring(bm_magic_cya, 0.0, -3.1, cz_ground, 0.42, 0.03, 24)

magic_mag_mesh = bpy.data.meshes.new("Magic_Circles_Magenta_Mesh")
bm_magic_mag.to_mesh(magic_mag_mesh)
bm_magic_mag.free()
magic_mag_obj = add_mesh_object("Magic_Circles_Magenta", magic_mag_mesh, mat_circle_magenta)

magic_cya_mesh = bpy.data.meshes.new("Magic_Circles_Cyan_Mesh")
bm_magic_cya.to_mesh(magic_cya_mesh)
bm_magic_cya.free()
magic_cya_obj = add_mesh_object("Magic_Circles_Cyan", magic_cya_mesh, mat_circle_cyan)

# -----------------------------------------------------------------------------
# 5. RUNIC MONOLITHS & GLOWING OBELISKS (Framing Sanctuary Pillars)
# -----------------------------------------------------------------------------
bm_obelisk = bmesh.new()
bm_runes   = bmesh.new()

obelisk_configs = [
    (-9.4, 0.6, 0.0, 4.4, 0.65, 0.55),  # Left foreground
    (-5.8, 2.5, 0.0, 3.8, 0.55, 0.45),  # Left midground balustrade post
    (5.8, 2.5, 0.0, 3.8, 0.55, 0.45),   # Right midground balustrade post
    (9.4, 0.6, 0.0, 4.4, 0.65, 0.55),   # Right foreground
    (-13.5, 5.5, 1.2, 5.2, 0.70, 0.60), # Far left cliff obelisk
    (13.5, 5.5, 1.2, 5.2, 0.70, 0.60),  # Far right cliff obelisk
    (-5.2, -3.2, -3.6, 3.6, 0.55, 0.45), # Under chasm left pillar
    (5.2, -3.2, -3.6, 3.6, 0.55, 0.45)   # Under chasm right pillar
]

for ox, oy, oz, oh, ow, od in obelisk_configs:
    bmesh.ops.create_cube(bm_obelisk, size=1.0,
        matrix=Matrix.Translation((ox, oy, oz + 0.20)) @
               Matrix.Scale(ow + 0.30, 4, (1,0,0)) @
               Matrix.Scale(od + 0.30, 4, (0,1,0)) @
               Matrix.Scale(0.40, 4, (0,0,1)))
    bmesh.ops.create_cone(bm_obelisk, segments=4, radius1=ow * 0.72, radius2=ow * 0.58, depth=oh,
        matrix=Matrix.Translation((ox, oy, oz + 0.40 + oh * 0.5)) @
               Matrix.Rotation(radians(45), 4, 'Z'))
    bmesh.ops.create_cone(bm_obelisk, segments=4, radius1=ow * 0.58, radius2=0.04, depth=0.55,
        matrix=Matrix.Translation((ox, oy, oz + 0.40 + oh + 0.25)) @
               Matrix.Rotation(radians(45), 4, 'Z'))
    
    glyph_y = oy - (od * 0.5) - 0.02
    num_glyphs = int(oh * 2.2)
    for g in range(num_glyphs):
        gy = glyph_y
        gz = oz + 0.7 + g * 0.40
        gw = random.uniform(0.12, 0.18)
        gh = random.uniform(0.18, 0.26)
        bmesh.ops.create_cube(bm_runes, size=1.0,
            matrix=Matrix.Translation((ox, gy, gz)) @
                   Matrix.Scale(gw, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(gh, 4, (0,0,1)))

    for c_i, (cx_off, cy_off, c_h, c_r) in enumerate([(0.35, -0.25, 1.4, 0.18), (-0.30, -0.22, 1.1, 0.15), (0.15, -0.38, 0.8, 0.12)]):
        bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=c_r, radius2=0.03, depth=c_h,
            matrix=Matrix.Translation((ox + cx_off, oy + cy_off, oz + c_h * 0.5)) @
                   Matrix.Rotation(radians(random.uniform(-15, 15)), 4, 'X') @
                   Matrix.Rotation(radians(random.uniform(-15, 15)), 4, 'Y'))

obelisk_mesh = bpy.data.meshes.new("Celestial_Obelisk_Mesh")
bm_obelisk.to_mesh(obelisk_mesh)
bm_obelisk.free()
obelisk_obj = add_mesh_object("Celestial_Obelisks", obelisk_mesh, mat_marble_trim)

runes_mesh = bpy.data.meshes.new("Celestial_Runes_Mesh")
bm_runes.to_mesh(runes_mesh)
bm_runes.free()
runes_obj = add_mesh_object("Celestial_Runic_Glyphs", runes_mesh, mat_circle_cyan)

# -----------------------------------------------------------------------------
# 6. ELEVATED SHRINE DAIS & TRIPLE GOTHIC TEMPLE ARCHWAY
# -----------------------------------------------------------------------------
bm_shrine    = bmesh.new()
bm_arch_glow = bmesh.new()
bm_dais_pool = bmesh.new()
bm_dais_lamps= bmesh.new()

DAIS_X = 0.0
DAIS_Y = 7.5
DAIS_Z = 1.05
DAIS_R = 4.8

# A. Elevated Circular Dais (Multi-tiered marble platform)
bmesh.ops.create_cone(bm_shrine, segments=36, radius1=DAIS_R, radius2=DAIS_R, depth=0.70,
    matrix=Matrix.Translation((DAIS_X, DAIS_Y, DAIS_Z - 0.35)))
bmesh.ops.create_cone(bm_shrine, segments=36, radius1=DAIS_R + 0.35, radius2=DAIS_R + 0.35, depth=0.35,
    matrix=Matrix.Translation((DAIS_X, DAIS_Y, DAIS_Z - 0.70)))

# Glowing Cyan Astral Pool Circle on Dais Floor
add_ring(bm_dais_pool, DAIS_X, DAIS_Y, DAIS_Z + 0.02, 2.6, 0.08, 48)
add_ring(bm_dais_pool, DAIS_X, DAIS_Y, DAIS_Z + 0.02, 2.3, 0.04, 48)
add_star_polygon(bm_dais_pool, DAIS_X, DAIS_Y, DAIS_Z + 0.02, 2.3, points=8, width=0.04)

dais_pool_mesh = bpy.data.meshes.new("Celestial_Dais_Pool_Mesh")
bm_dais_pool.to_mesh(dais_pool_mesh)
bm_dais_pool.free()
add_mesh_object("Celestial_Dais_Pool", dais_pool_mesh, mat_circle_cyan)

# Ascending Grand Stairs to Dais
num_dais_steps = 7
dais_step_w = 3.6
for s in range(num_dais_steps):
    sy = 2.4 + s * 0.40
    sz = 0.10 + s * 0.15
    bmesh.ops.create_cube(bm_shrine, size=1.0,
        matrix=Matrix.Translation((DAIS_X, sy, sz)) @
               Matrix.Scale(dais_step_w, 4, (1,0,0)) @
               Matrix.Scale(0.48, 4, (0,1,0)) @
               Matrix.Scale(0.18, 4, (0,0,1)))

# Flanking Balustrades on Dais Steps
build_balustrade(bm_shrine, (-1.9, 2.4, 0.0), (-1.9, 4.8, 0.95), num_balusters=5, height=0.68)
build_balustrade(bm_shrine, (1.9, 2.4, 0.0), (1.9, 4.8, 0.95), num_balusters=5, height=0.68)

# Dais Entrance Lantern Pedestals
for lx in [-2.1, 2.1]:
    bmesh.ops.create_cube(bm_shrine, size=1.0,
        matrix=Matrix.Translation((lx, 5.0, DAIS_Z + 0.35)) @
               Matrix.Scale(0.50, 4, (1,0,0)) @
               Matrix.Scale(0.50, 4, (0,1,0)) @
               Matrix.Scale(0.70, 4, (0,0,1)))
    bmesh.ops.create_cone(bm_shrine, segments=4, radius1=0.32, radius2=0.08, depth=0.18,
        matrix=Matrix.Translation((lx, 5.0, DAIS_Z + 0.85)) @
               Matrix.Rotation(radians(45), 4, 'Z'))
    bmesh.ops.create_uvsphere(bm_dais_lamps, u_segments=8, v_segments=6, radius=0.14,
        matrix=Matrix.Translation((lx, 5.0, DAIS_Z + 0.72)))

dais_lamps_mesh = bpy.data.meshes.new("Celestial_Dais_Lamps_Mesh")
bm_dais_lamps.to_mesh(dais_lamps_mesh)
bm_dais_lamps.free()
add_mesh_object("Celestial_Dais_Lamps", dais_lamps_mesh, mat_lantern_gold)

# B. Four Fluted Marble Columns
COL_Y = DAIS_Y + 0.6
col_x_list = [-3.2, -1.05, 1.05, 3.2]
COL_H = 4.8
for cx in col_x_list:
    bmesh.ops.create_cube(bm_shrine, size=1.0,
        matrix=Matrix.Translation((cx, COL_Y, DAIS_Z + 0.20)) @
               Matrix.Scale(0.92, 4, (1,0,0)) @
               Matrix.Scale(0.92, 4, (0,1,0)) @
               Matrix.Scale(0.40, 4, (0,0,1)))
    bmesh.ops.create_cone(bm_shrine, segments=16, radius1=0.46, radius2=0.40, depth=0.22,
        matrix=Matrix.Translation((cx, COL_Y, DAIS_Z + 0.50)))
    
    bmesh.ops.create_cone(bm_shrine, segments=18, radius1=0.35, radius2=0.32, depth=COL_H,
        matrix=Matrix.Translation((cx, COL_Y, DAIS_Z + 0.60 + COL_H * 0.5)))
    
    cap_z = DAIS_Z + 0.60 + COL_H
    bmesh.ops.create_cone(bm_shrine, segments=16, radius1=0.32, radius2=0.50, depth=0.38,
        matrix=Matrix.Translation((cx, COL_Y, cap_z + 0.18)))
    bmesh.ops.create_cube(bm_shrine, size=1.0,
        matrix=Matrix.Translation((cx, COL_Y, cap_z + 0.44)) @
               Matrix.Scale(1.00, 4, (1,0,0)) @
               Matrix.Scale(1.00, 4, (0,1,0)) @
               Matrix.Scale(0.18, 4, (0,0,1)))
    
    # Glowing Runic Inlay along column shaft
    bmesh.ops.create_cube(bm_arch_glow, size=1.0,
        matrix=Matrix.Translation((cx, COL_Y - 0.33, DAIS_Z + 1.1 + COL_H * 0.4)) @
               Matrix.Scale(0.08, 4, (1,0,0)) @
               Matrix.Scale(0.02, 4, (0,1,0)) @
               Matrix.Scale(COL_H * 0.68, 4, (0,0,1)))

# C. Triple Triumphal Archway
beam_z = DAIS_Z + 0.60 + COL_H + 0.52

bmesh.ops.create_cube(bm_shrine, size=1.0,
    matrix=Matrix.Translation((0.0, COL_Y, beam_z + 0.20)) @
           Matrix.Scale(7.8, 4, (1,0,0)) @
           Matrix.Scale(1.05, 4, (0,1,0)) @
           Matrix.Scale(0.40, 4, (0,0,1)))
bmesh.ops.create_cube(bm_shrine, size=1.0,
    matrix=Matrix.Translation((0.0, COL_Y, beam_z + 0.45)) @
           Matrix.Scale(8.1, 4, (1,0,0)) @
           Matrix.Scale(1.15, 4, (0,1,0)) @
           Matrix.Scale(0.16, 4, (0,0,1)))

def build_arch_mesh(bm, x1, x2, y, z_spring, z_apex, thickness=0.38, segs=16):
    span = abs(x2 - x1)
    for s in range(segs):
        t1 = s / segs
        t2 = (s + 1) / segs
        xa1 = x1 + span * 0.5 * (1.0 - cos(t1 * pi * 0.5))
        za1 = z_spring + (z_apex - z_spring) * sin(t1 * pi * 0.5)
        xa2 = x1 + span * 0.5 * (1.0 - cos(t2 * pi * 0.5))
        za2 = z_spring + (z_apex - z_spring) * sin(t2 * pi * 0.5)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation(((xa1 + xa2)*0.5, y, (za1 + za2)*0.5)) @
                   Matrix.Scale(abs(xa2 - xa1) + 0.04, 4, (1,0,0)) @
                   Matrix.Scale(0.65, 4, (0,1,0)) @
                   Matrix.Scale(thickness, 4, (0,0,1)))
        xb1 = x2 - span * 0.5 * (1.0 - cos(t1 * pi * 0.5))
        xb2 = x2 - span * 0.5 * (1.0 - cos(t2 * pi * 0.5))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation(((xb1 + xb2)*0.5, y, (za1 + za2)*0.5)) @
                   Matrix.Scale(abs(xb2 - xb1) + 0.04, 4, (1,0,0)) @
                   Matrix.Scale(0.65, 4, (0,1,0)) @
                   Matrix.Scale(thickness, 4, (0,0,1)))

build_arch_mesh(bm_shrine, -1.05, 1.05, COL_Y, beam_z - 1.1, beam_z + 0.75, thickness=0.36, segs=10)
build_arch_mesh(bm_shrine, -3.2, -1.05, COL_Y, beam_z - 1.4, beam_z - 0.2, thickness=0.28, segs=8)
build_arch_mesh(bm_shrine, 1.05, 3.2, COL_Y, beam_z - 1.4, beam_z - 0.2, thickness=0.28, segs=8)

ped_base_z = beam_z + 0.54
bmesh.ops.create_cone(bm_shrine, segments=3, radius1=2.2, radius2=0.08, depth=0.70,
    matrix=Matrix.Translation((0.0, COL_Y, ped_base_z + 0.70)) @
           Matrix.Rotation(radians(90), 4, 'Y') @
           Matrix.Rotation(radians(90), 4, 'X'))

# Glowing Diamond Medallion in Central Pediment
bmesh.ops.create_cone(bm_arch_glow, segments=4, radius1=0.38, radius2=0.04, depth=0.20,
    matrix=Matrix.Translation((0.0, COL_Y - 0.36, ped_base_z + 0.65)) @
           Matrix.Rotation(radians(45), 4, 'Z'))

for pend_x in [-2.15, 2.15]:
    bmesh.ops.create_cone(bm_shrine, segments=4, radius1=0.025, radius2=0.025, depth=0.95,
        matrix=Matrix.Translation((pend_x, COL_Y, beam_z - 0.55)))
    bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=0.20, radius2=0.03, depth=0.75,
        matrix=Matrix.Translation((pend_x, COL_Y, beam_z - 1.30)))
    bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=0.20, radius2=0.03, depth=0.35,
        matrix=Matrix.Translation((pend_x, COL_Y, beam_z - 1.60)) @
               Matrix.Rotation(radians(180), 4, 'X'))

shrine_mesh = bpy.data.meshes.new("Celestial_Shrine_Mesh")
bm_shrine.to_mesh(shrine_mesh)
bm_shrine.free()
shrine_obj = add_mesh_object("Celestial_Temple_Archway", shrine_mesh, mat_celestial_marble)

arch_glow_mesh = bpy.data.meshes.new("Celestial_Arch_Glow_Mesh")
bm_arch_glow.to_mesh(arch_glow_mesh)
bm_arch_glow.free()
arch_glow_obj = add_mesh_object("Celestial_Arch_Glow", arch_glow_mesh, mat_circle_magenta)

# -----------------------------------------------------------------------------
# 7. LEVITATING CELESTIAL POWER CORE & SWIRLING PARTICLE RIBBONS
# -----------------------------------------------------------------------------
bm_core    = bmesh.new()
bm_rib_cya = bmesh.new()
bm_rib_mag = bmesh.new()

CORE_X = 0.0
CORE_Y = COL_Y
CORE_Z = beam_z - 1.35

bmesh.ops.create_cone(bm_core, segments=8, radius1=0.50, radius2=0.03, depth=1.05,
    matrix=Matrix.Translation((CORE_X, CORE_Y, CORE_Z + 0.52)))
bmesh.ops.create_cone(bm_core, segments=8, radius1=0.50, radius2=0.03, depth=1.05,
    matrix=Matrix.Translation((CORE_X, CORE_Y, CORE_Z - 0.52)) @
           Matrix.Rotation(radians(180), 4, 'X'))

for a in range(4):
    ang = radians(a * 90 + 45)
    gx = CORE_X + 1.05 * cos(ang)
    gz = CORE_Z + 0.40 * sin(ang)
    bmesh.ops.create_cone(bm_core, segments=6, radius1=0.15, radius2=0.02, depth=0.40,
        matrix=Matrix.Translation((gx, CORE_Y, gz)))
    bmesh.ops.create_cone(bm_core, segments=6, radius1=0.15, radius2=0.02, depth=0.40,
        matrix=Matrix.Translation((gx, CORE_Y, gz - 0.30)) @
               Matrix.Rotation(radians(180), 4, 'X'))

# Smooth Swirling Arcane Energy Ribbons (Quad Strips)
ribbon_steps = 60
rib_w = 0.08
for r_step in range(ribbon_steps):
    t1 = r_step / ribbon_steps
    t2 = (r_step + 1) / ribbon_steps
    
    # Cyan Ribbon
    a1 = t1 * 4.0 * pi
    a2 = t2 * 4.0 * pi
    p1 = Vector((-2.2 + 4.4 * t1, CORE_Y + 0.50 * sin(a1), CORE_Z + 0.50 * cos(a1)))
    p2 = Vector((-2.2 + 4.4 * t2, CORE_Y + 0.50 * sin(a2), CORE_Z + 0.50 * cos(a2)))
    tang = (p2 - p1).normalized()
    norm = Vector((-tang.y, tang.x, 0.0)) * (rib_w * 0.5)
    v1 = bm_rib_cya.verts.new(p1 - norm)
    v2 = bm_rib_cya.verts.new(p1 + norm)
    v3 = bm_rib_cya.verts.new(p2 + norm)
    v4 = bm_rib_cya.verts.new(p2 - norm)
    bm_rib_cya.faces.new([v1, v2, v3, v4])

    # Magenta Ribbon (opposite phase)
    a1_m = a1 + pi
    a2_m = a2 + pi
    p1_m = Vector((-2.2 + 4.4 * t1, CORE_Y + 0.58 * sin(a1_m), CORE_Z + 0.58 * cos(a1_m)))
    p2_m = Vector((-2.2 + 4.4 * t2, CORE_Y + 0.58 * sin(a2_m), CORE_Z + 0.58 * cos(a2_m)))
    tang_m = (p2_m - p1_m).normalized()
    norm_m = Vector((-tang_m.y, tang_m.x, 0.0)) * (rib_w * 0.5)
    v1_m = bm_rib_mag.verts.new(p1_m - norm_m)
    v2_m = bm_rib_mag.verts.new(p1_m + norm_m)
    v3_m = bm_rib_mag.verts.new(p2_m + norm_m)
    v4_m = bm_rib_mag.verts.new(p2_m - norm_m)
    bm_rib_mag.faces.new([v1_m, v2_m, v3_m, v4_m])

core_mesh = bpy.data.meshes.new("Celestial_Core_Mesh")
bm_core.to_mesh(core_mesh)
bm_core.free()
core_obj = add_mesh_object("Celestial_Power_Core", core_mesh, mat_amethyst_glow)

rib_cya_mesh = bpy.data.meshes.new("Celestial_Ribbon_Cyan_Mesh")
bm_rib_cya.to_mesh(rib_cya_mesh)
bm_rib_cya.free()
rib_cya_obj = add_mesh_object("Celestial_Ribbon_Cyan", rib_cya_mesh, mat_circle_cyan)

rib_mag_mesh = bpy.data.meshes.new("Celestial_Ribbon_Magenta_Mesh")
bm_rib_mag.to_mesh(rib_mag_mesh)
bm_rib_mag.free()
rib_mag_obj = add_mesh_object("Celestial_Ribbon_Magenta", rib_mag_mesh, mat_circle_magenta)

# -----------------------------------------------------------------------------
# 8. FLOATING ISLANDS & MASSIVE AMETHYST CRYSTAL SPIRES
# -----------------------------------------------------------------------------
bm_amethyst = bmesh.new()

def add_crystal_cluster(bm, cx, cy, cz, count=7, base_radius=1.2, height_range=(2.5, 6.0), rad_range=(0.35, 0.90)):
    random.seed(int(abs(cx) * 100 + abs(cy)))
    for c in range(count):
        if c == 0:
            ch = height_range[1]
            cr = rad_range[1]
            c_pos = Vector((cx, cy, cz + ch * 0.5))
            tilt_x = radians(random.uniform(-6, 6))
            tilt_y = radians(random.uniform(-6, 6))
        else:
            ang = 2.0 * pi * c / (count - 1)
            dist = random.uniform(0.4 * base_radius, base_radius)
            ch = random.uniform(height_range[0], height_range[1] * 0.8)
            cr = random.uniform(rad_range[0], rad_range[1] * 0.7)
            c_pos = Vector((cx + dist * cos(ang), cy + dist * sin(ang), cz + ch * 0.5))
            tilt_x = radians(random.uniform(-20, 20))
            tilt_y = radians(random.uniform(-20, 20))
        
        bmesh.ops.create_cone(bm, segments=6, radius1=cr, radius2=0.03, depth=ch,
            matrix=Matrix.Translation(c_pos) @
                   Matrix.Rotation(tilt_x, 4, 'X') @
                   Matrix.Rotation(tilt_y, 4, 'Y') @
                   Matrix.Rotation(radians(random.uniform(0, 60)), 4, 'Z'))

# Island 1: Left Floating Island
ISL1_X, ISL1_Y, ISL1_Z = -13.0, 11.5, 2.2
ISL1_R = 4.0
ISL1_DEPTH = 7.0
bmesh.ops.create_cone(bm_rock, segments=8, radius1=ISL1_R, radius2=0.20, depth=ISL1_DEPTH,
    matrix=Matrix.Translation((ISL1_X, ISL1_Y, ISL1_Z - ISL1_DEPTH * 0.5)))
for r_i, (rx, ry, rz, rs) in enumerate([(0.8, -0.6, 0.4, 2.4), (-0.9, 0.7, 0.3, 2.6), (0.0, 1.2, 0.5, 2.0)]):
    bmesh.ops.create_cube(bm_rock, size=1.0,
        matrix=Matrix.Translation((ISL1_X + rx, ISL1_Y + ry, ISL1_Z + rz)) @
               Matrix.Scale(rs, 4, (1,0,0)) @
               Matrix.Scale(rs, 4, (0,1,0)) @
               Matrix.Scale(0.9, 4, (0,0,1)))

add_crystal_cluster(bm_amethyst, ISL1_X, ISL1_Y, ISL1_Z + 0.8, count=8, base_radius=2.0, height_range=(3.2, 6.8), rad_range=(0.45, 0.88))

for hx, hy, hz, hr, hh in [(0.5, -0.4, -4.5, 0.35, 2.2), (-0.6, 0.5, -5.0, 0.38, 2.5), (0.0, 0.0, -6.2, 0.30, 1.8)]:
    bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=hr, radius2=0.03, depth=hh,
        matrix=Matrix.Translation((ISL1_X + hx, ISL1_Y + hy, ISL1_Z + hz - hh * 0.5)))

# Island 2: Right Floating Island (Host of Sakura Tree)
ISL2_X, ISL2_Y, ISL2_Z = 13.0, 11.5, 2.2
ISL2_R = 4.0
ISL2_DEPTH = 7.0
bmesh.ops.create_cone(bm_rock, segments=8, radius1=ISL2_R, radius2=0.22, depth=ISL2_DEPTH,
    matrix=Matrix.Translation((ISL2_X, ISL2_Y, ISL2_Z - ISL2_DEPTH * 0.5)))
for r_i, (rx, ry, rz, rs) in enumerate([(-0.7, -0.5, 0.3, 2.4), (1.1, 0.6, 0.4, 2.6), (0.2, -1.1, 0.2, 2.0)]):
    bmesh.ops.create_cube(bm_rock, size=1.0,
        matrix=Matrix.Translation((ISL2_X + rx, ISL2_Y + ry, ISL2_Z + rz)) @
               Matrix.Scale(rs, 4, (1,0,0)) @
               Matrix.Scale(rs, 4, (0,1,0)) @
               Matrix.Scale(0.8, 4, (0,0,1)))

# Amethyst crystals on Island 2 beside sakura tree
add_crystal_cluster(bm_amethyst, ISL2_X - 1.6, ISL2_Y + 0.3, ISL2_Z + 0.5, count=5, base_radius=1.1, height_range=(2.2, 4.4), rad_range=(0.30, 0.58))

for hx, hy, hz, hr, hh in [(-0.4, 0.3, -4.5, 0.35, 2.2), (0.5, -0.5, -5.2, 0.32, 2.0)]:
    bmesh.ops.create_cone(bm_cyan_cryst, segments=6, radius1=hr, radius2=0.03, depth=hh,
        matrix=Matrix.Translation((ISL2_X + hx, ISL2_Y + hy, ISL2_Z + hz - hh * 0.5)))

# Island 3: Small Floating Island in Middle Distance
ISL3_X, ISL3_Y, ISL3_Z = 3.2, 17.0, 3.4
bmesh.ops.create_cone(bm_rock, segments=7, radius1=1.8, radius2=0.15, depth=4.0,
    matrix=Matrix.Translation((ISL3_X, ISL3_Y, ISL3_Z - 2.0)))
add_crystal_cluster(bm_amethyst, ISL3_X, ISL3_Y, ISL3_Z + 0.2, count=4, base_radius=0.7, height_range=(1.8, 3.4), rad_range=(0.25, 0.48))

# Distant Craggy Spires on Extreme Left and Right
for ex_x, ex_y, ex_z, ex_h in [(-19.0, 6.0, -1.0, 9.0), (19.0, 6.0, -1.0, 9.0)]:
    bmesh.ops.create_cone(bm_rock, segments=6, radius1=3.2, radius2=0.3, depth=ex_h,
        matrix=Matrix.Translation((ex_x, ex_y, ex_z + ex_h * 0.5)))
    add_crystal_cluster(bm_amethyst, ex_x, ex_y, ex_z + ex_h, count=4, base_radius=0.85, height_range=(2.2, 4.5), rad_range=(0.28, 0.55))

amethyst_mesh = bpy.data.meshes.new("Celestial_Amethyst_Mesh")
bm_amethyst.to_mesh(amethyst_mesh)
bm_amethyst.free()
amethyst_obj = add_mesh_object("Celestial_Amethyst_Crystals", amethyst_mesh, mat_amethyst_gem)

cyan_cryst_mesh = bpy.data.meshes.new("Celestial_Cyan_Cryst_Mesh")
bm_cyan_cryst.to_mesh(cyan_cryst_mesh)
bm_cyan_cryst.free()
cyan_cryst_obj = add_mesh_object("Celestial_Cyan_Crystals", cyan_cryst_mesh, mat_cyan_crystal)

rock_mesh = bpy.data.meshes.new("Celestial_Rock_Mesh")
bm_rock.to_mesh(rock_mesh)
bm_rock.free()
rock_obj = add_mesh_object("Celestial_Island_Rocks", rock_mesh, mat_floating_rock)

# -----------------------------------------------------------------------------
# 9. BLOOMING CHERRY BLOSSOM (SAKURA) TREE & DRIFTING PETALS
# -----------------------------------------------------------------------------
bm_bark    = bmesh.new()
bm_blossom = bmesh.new()
bm_petals  = bmesh.new()

TREE_X = ISL2_X + 0.6
TREE_Y = ISL2_Y - 0.2
TREE_Z = ISL2_Z + 0.5

trunk_nodes = [
    Vector((TREE_X, TREE_Y, TREE_Z)),
    Vector((TREE_X - 0.30, TREE_Y + 0.20, TREE_Z + 1.2)),
    Vector((TREE_X - 0.70, TREE_Y + 0.10, TREE_Z + 2.4)),
    Vector((TREE_X - 1.10, TREE_Y - 0.15, TREE_Z + 3.5)),
]
for t in range(len(trunk_nodes) - 1):
    pA = trunk_nodes[t]
    pB = trunk_nodes[t+1]
    mid_p = (pA + pB) * 0.5
    seg_vec = pB - pA
    seg_len = seg_vec.length
    r_a = 0.50 - t * 0.09
    r_b = 0.50 - (t + 1) * 0.09
    bmesh.ops.create_cone(bm_bark, segments=8, radius1=r_a, radius2=r_b, depth=seg_len,
        matrix=Matrix.Translation(mid_p) @
               Matrix.Rotation(math.atan2(seg_vec.y, seg_vec.x), 4, 'Z') @
               Matrix.Rotation(math.acos(seg_vec.z / seg_len), 4, 'Y'))

branch_defs = [
    (trunk_nodes[-1], Vector((TREE_X - 2.5, TREE_Y - 0.8, TREE_Z + 4.6)), 0.28, 0.14),
    (trunk_nodes[-1], Vector((TREE_X - 0.5, TREE_Y + 1.0, TREE_Z + 4.7)), 0.24, 0.12),
    (trunk_nodes[-1], Vector((TREE_X + 1.1, TREE_Y - 0.4, TREE_Z + 4.3)), 0.24, 0.11),
    (Vector((TREE_X - 2.5, TREE_Y - 0.8, TREE_Z + 4.6)), Vector((TREE_X - 3.8, TREE_Y - 1.2, TREE_Z + 5.1)), 0.14, 0.06),
    (Vector((TREE_X - 0.5, TREE_Y + 1.0, TREE_Z + 4.7)), Vector((TREE_X + 0.5, TREE_Y + 1.8, TREE_Z + 5.4)), 0.12, 0.05),
]
for pA, pB, ra, rb in branch_defs:
    mid_p = (pA + pB) * 0.5
    seg_vec = pB - pA
    seg_len = seg_vec.length
    bmesh.ops.create_cone(bm_bark, segments=6, radius1=ra, radius2=rb, depth=seg_len,
        matrix=Matrix.Translation(mid_p) @
               Matrix.Rotation(math.atan2(seg_vec.y, seg_vec.x), 4, 'Z') @
               Matrix.Rotation(math.acos(seg_vec.z / seg_len), 4, 'Y'))

# Volumetric Clustered Blossom Canopy
canopy_blobs = [
    (TREE_X - 1.8, TREE_Y - 0.3, TREE_Z + 4.5, 1.8),
    (TREE_X - 2.9, TREE_Y - 0.9, TREE_Z + 4.9, 1.6),
    (TREE_X - 0.6, TREE_Y + 0.9, TREE_Z + 5.1, 1.6),
    (TREE_X + 0.8, TREE_Y - 0.3, TREE_Z + 4.6, 1.4),
    (TREE_X - 2.1, TREE_Y + 0.5, TREE_Z + 5.7, 1.5),
    (TREE_X - 3.6, TREE_Y - 1.2, TREE_Z + 5.2, 1.3),
    (TREE_X + 0.6, TREE_Y + 1.6, TREE_Z + 5.5, 1.3),
    (TREE_X - 1.2, TREE_Y - 1.2, TREE_Z + 4.2, 1.2),
]
for bx, by, bz, br in canopy_blobs:
    bmesh.ops.create_uvsphere(bm_blossom, u_segments=12, v_segments=10, radius=br,
        matrix=Matrix.Translation((bx, by, bz)))

# Drifting Petals (Delicate 3D curved diamond petals clustered around tree & foreground)
random.seed(4242)
petal_points = []
# Petals near tree & right sky
for _ in range(45):
    petal_points.append((
        random.uniform(ISL2_X - 5.0, ISL2_X + 3.0),
        random.uniform(ISL2_Y - 8.0, ISL2_Y + 4.0),
        random.uniform(TREE_Z + 0.5, TREE_Z + 6.0),
        random.uniform(0.08, 0.14)
    ))
# Petals drifting in foreground
for _ in range(12):
    petal_points.append((
        random.uniform(-8.0, 8.0),
        random.uniform(-4.0, 2.0),
        random.uniform(0.5, 3.5),
        random.uniform(0.09, 0.16)
    ))

for px, py, pz, ps in petal_points:
    v1 = bm_petals.verts.new((px - ps, py, pz))
    v2 = bm_petals.verts.new((px, py - ps * 0.4, pz + ps * 0.6))
    v3 = bm_petals.verts.new((px + ps, py, pz))
    v4 = bm_petals.verts.new((px, py + ps * 0.4, pz - ps * 0.6))
    bm_petals.faces.new([v1, v2, v3, v4])

bark_mesh = bpy.data.meshes.new("Celestial_Bark_Mesh")
bm_bark.to_mesh(bark_mesh)
bm_bark.free()
bark_obj = add_mesh_object("Celestial_Sakura_Trunk", bark_mesh, mat_sakura_bark)

blossom_mesh = bpy.data.meshes.new("Celestial_Blossom_Mesh")
bm_blossom.to_mesh(blossom_mesh)
bm_blossom.free()
blossom_obj = add_mesh_object("Celestial_Sakura_Canopy", blossom_mesh, mat_sakura_blossom)
for poly in blossom_mesh.polygons: poly.use_smooth = True

petals_mesh = bpy.data.meshes.new("Celestial_Petals_Mesh")
bm_petals.to_mesh(petals_mesh)
bm_petals.free()
petals_obj = add_mesh_object("Celestial_Sakura_Petals", petals_mesh, mat_sakura_petal)

# -----------------------------------------------------------------------------
# 10. GIANT 3D CRESCENT MOON & SHADOWED LUNAR SPHERE
# Positioned in Upper-Right Sky (Matching anime concept reference)
# -----------------------------------------------------------------------------
bm_moon_cres = bmesh.new()
bm_moon_dark = bmesh.new()
bm_moon_halo = bmesh.new()

MOON_CX = 7.5
MOON_CY = 34.0
MOON_CZ = 13.5
MOON_R = 6.4
MOON_SEGS = 48
half_th = 0.35

cres_front_out, cres_front_in = [], []
cres_back_out, cres_back_in = [], []

# In reference art, crescent curves along the upper-right edge, opening towards bottom-left
max_cres_width = 1.95
for s in range(MOON_SEGS):
    t = s / (MOON_SEGS - 1)
    ang = radians(-40.0 + 190.0 * t)
    factor = sin(t * pi)
    
    ox = MOON_CX + MOON_R * cos(ang)
    oz = MOON_CZ + MOON_R * sin(ang)
    
    r_in = MOON_R - max_cres_width * factor
    ix = MOON_CX + r_in * cos(ang) - 0.40 * factor
    iz = MOON_CZ + r_in * sin(ang) + 0.20 * factor
    
    cres_front_out.append(bm_moon_cres.verts.new((ox, MOON_CY - half_th, oz)))
    cres_front_in.append(bm_moon_cres.verts.new((ix, MOON_CY - half_th, iz)))
    cres_back_out.append(bm_moon_cres.verts.new((ox, MOON_CY + half_th, oz)))
    cres_back_in.append(bm_moon_cres.verts.new((ix, MOON_CY + half_th, iz)))

for s in range(MOON_SEGS - 1):
    bm_moon_cres.faces.new([cres_front_out[s], cres_front_in[s], cres_front_in[s+1], cres_front_out[s+1]])
    bm_moon_cres.faces.new([cres_back_out[s], cres_back_out[s+1], cres_back_in[s+1], cres_back_in[s]])
    bm_moon_cres.faces.new([cres_front_out[s], cres_front_out[s+1], cres_back_out[s+1], cres_back_out[s]])
    bm_moon_cres.faces.new([cres_front_in[s], cres_back_in[s], cres_back_in[s+1], cres_front_in[s+1]])

bm_moon_cres.faces.new([cres_front_out[0], cres_back_out[0], cres_back_in[0], cres_front_in[0]])
bm_moon_cres.faces.new([cres_front_out[-1], cres_front_in[-1], cres_back_in[-1], cres_back_out[-1]])

# Outer Moonlight Halo
for s in range(MOON_SEGS - 1):
    t1 = s / (MOON_SEGS - 1)
    t2 = (s + 1) / (MOON_SEGS - 1)
    ang1 = radians(-40.0 + 190.0 * t1)
    ang2 = radians(-40.0 + 190.0 * t2)
    h1 = Vector((MOON_CX + MOON_R * cos(ang1), MOON_CY - 0.08, MOON_CZ + MOON_R * sin(ang1)))
    h2 = Vector((MOON_CX + (MOON_R + 0.60) * cos(ang1), MOON_CY - 0.08, MOON_CZ + (MOON_R + 0.60) * sin(ang1)))
    h3 = Vector((MOON_CX + (MOON_R + 0.60) * cos(ang2), MOON_CY - 0.08, MOON_CZ + (MOON_R + 0.60) * sin(ang2)))
    h4 = Vector((MOON_CX + MOON_R * cos(ang2), MOON_CY - 0.08, MOON_CZ + MOON_R * sin(ang2)))
    vh1 = bm_moon_halo.verts.new(h1)
    vh2 = bm_moon_halo.verts.new(h2)
    vh3 = bm_moon_halo.verts.new(h3)
    vh4 = bm_moon_halo.verts.new(h4)
    bm_moon_halo.faces.new([vh1, vh2, vh3, vh4])

# Shadowed Full Lunar Sphere behind Crescent ("Earthshine" effect)
bmesh.ops.create_uvsphere(bm_moon_dark, u_segments=28, v_segments=20, radius=MOON_R * 0.97,
    matrix=Matrix.Translation((MOON_CX - 0.35, MOON_CY + 0.40, MOON_CZ + 0.15)))

moon_cres_mesh = bpy.data.meshes.new("Celestial_Moon_Crescent_Mesh")
bm_moon_cres.to_mesh(moon_cres_mesh)
bm_moon_cres.free()
moon_cres_obj = add_mesh_object("Celestial_Crescent_Moon", moon_cres_mesh, mat_moon_glow)

moon_halo_mesh = bpy.data.meshes.new("Celestial_Moon_Halo_Mesh")
bm_moon_halo.to_mesh(moon_halo_mesh)
bm_moon_halo.free()
moon_halo_obj = add_mesh_object("Celestial_Moon_Halo", moon_halo_mesh, mat_moon_halo)

moon_dark_mesh = bpy.data.meshes.new("Celestial_Moon_Dark_Mesh")
bm_moon_dark.to_mesh(moon_dark_mesh)
bm_moon_dark.free()
moon_dark_obj = add_mesh_object("Celestial_Moon_Dark_Body", moon_dark_mesh, mat_moon_dark)
for poly in moon_dark_mesh.polygons: poly.use_smooth = True

# -----------------------------------------------------------------------------
# 11. PROCEDURAL 3D ANIME CELESTIAL CLOUD BANKS (Pure 3D Geometry)
# -----------------------------------------------------------------------------
bm_clouds = bmesh.new()

cloud_clusters = [
    # Horizon Bank behind shrine and moon
    (4.0, 26.0, 5.5, 3.8, 2.2, 1.8),
    (7.5, 28.0, 6.5, 4.2, 2.5, 2.0),
    (11.0, 27.0, 7.0, 3.6, 2.2, 1.8),
    (-2.0, 24.0, 4.8, 3.4, 2.0, 1.6),
    (-6.5, 25.0, 4.2, 3.6, 2.2, 1.7),
    # Left flank around crystal island
    (-14.0, 20.0, 6.0, 4.5, 2.8, 2.2),
    (-16.5, 16.0, 7.5, 3.8, 2.4, 1.9),
    (-10.5, 22.0, 8.5, 3.5, 2.2, 1.8),
    # Right flank around sakura island & moon
    (15.0, 22.0, 8.0, 4.6, 2.8, 2.4),
    (12.0, 29.0, 10.0, 4.0, 2.5, 2.0),
    (18.0, 25.0, 9.5, 3.8, 2.4, 1.9),
    # Deep abyss clouds under the platform
    (0.0, 4.0, -6.5, 6.0, 3.5, 2.5),
    (-8.0, 2.0, -7.0, 5.5, 3.2, 2.2),
    (8.0, 2.0, -7.0, 5.5, 3.2, 2.2),
]

for ccx, ccy, ccz, crx, cry, crz in cloud_clusters:
    # Overlapping smooth deformed spheres for billowy anime cloud look
    for sub in range(4):
        ang = sub * 1.57
        off_x = crx * 0.35 * cos(ang)
        off_y = cry * 0.35 * sin(ang)
        off_z = crz * 0.20 * sin(ang * 2)
        bmesh.ops.create_uvsphere(bm_clouds, u_segments=12, v_segments=8, radius=crx * 0.65,
            matrix=Matrix.Translation((ccx + off_x, ccy + off_y, ccz + off_z)) @
                   Matrix.Scale(1.0, 4, (1,0,0)) @
                   Matrix.Scale(cry / crx, 4, (0,1,0)) @
                   Matrix.Scale(crz / crx, 4, (0,0,1)))

cloud_mesh = bpy.data.meshes.new("Celestial_Clouds_Mesh")
bm_clouds.to_mesh(cloud_mesh)
bm_clouds.free()
cloud_obj = add_mesh_object("Celestial_Nebula_Clouds", cloud_mesh, mat_celestial_cloud)
for poly in cloud_mesh.polygons: poly.use_smooth = True

# -----------------------------------------------------------------------------
# 12. 3D SPIRAL GALAXIES
# -----------------------------------------------------------------------------
bm_galaxy = bmesh.new()

# Galaxy 1: Upper Left Majestic Spiral Galaxy
GAL1_X, GAL1_Y, GAL1_Z = -12.5, 38.0, 14.0
bmesh.ops.create_uvsphere(bm_galaxy, u_segments=16, v_segments=12, radius=1.4,
    matrix=Matrix.Translation((GAL1_X, GAL1_Y, GAL1_Z)))

for arm in [0, pi]:
    arm_pts = []
    for pt in range(28):
        t = pt / 27.0
        r_g = 1.1 + 4.4 * t
        theta = arm + 2.8 * t
        gx = GAL1_X + r_g * cos(theta) * 0.85
        gy = GAL1_Y + r_g * sin(theta) * 0.40
        gz = GAL1_Z + r_g * sin(theta) * 0.75
        gw = (0.30 + 0.65 * (1.0 - t)) * 0.5
        v_l = bm_galaxy.verts.new((gx - gw, gy, gz - gw*0.5))
        v_r = bm_galaxy.verts.new((gx + gw, gy, gz + gw*0.5))
        arm_pts.append((v_l, v_r))
    for pt in range(len(arm_pts) - 1):
        v1, v2 = arm_pts[pt]
        v3, v4 = arm_pts[pt+1]
        bm_galaxy.faces.new([v1, v2, v4, v3])

# Galaxy 2: Upper Far Right Distant Spiral Galaxy
GAL2_X, GAL2_Y, GAL2_Z = 17.5, 44.0, 18.0
bmesh.ops.create_uvsphere(bm_galaxy, u_segments=12, v_segments=8, radius=1.0,
    matrix=Matrix.Translation((GAL2_X, GAL2_Y, GAL2_Z)))
for arm in [0, pi]:
    arm_pts = []
    for pt in range(20):
        t = pt / 19.0
        r_g = 0.8 + 3.2 * t
        theta = arm + 2.5 * t
        gx = GAL2_X + r_g * cos(theta) * 0.75
        gy = GAL2_Y + r_g * sin(theta) * 0.35
        gz = GAL2_Z + r_g * sin(theta) * 0.65
        gw = (0.22 + 0.45 * (1.0 - t)) * 0.5
        v_l = bm_galaxy.verts.new((gx - gw, gy, gz - gw*0.5))
        v_r = bm_galaxy.verts.new((gx + gw, gy, gz + gw*0.5))
        arm_pts.append((v_l, v_r))
    for pt in range(len(arm_pts) - 1):
        v1, v2 = arm_pts[pt]
        v3, v4 = arm_pts[pt+1]
        bm_galaxy.faces.new([v1, v2, v4, v3])

galaxy_mesh = bpy.data.meshes.new("Celestial_Galaxy_Mesh")
bm_galaxy.to_mesh(galaxy_mesh)
bm_galaxy.free()
galaxy_obj = add_mesh_object("Celestial_Spiral_Galaxies", galaxy_mesh, mat_galaxy_core)
for poly in galaxy_mesh.polygons: poly.use_smooth = True

# -----------------------------------------------------------------------------
# 13. SPARKLING 3D STARFIELD ARRAY (Micro 3D Stars & 4-Point Cross Sparkle Stars)
# -----------------------------------------------------------------------------
bm_stars = bmesh.new()
random.seed(7771)

# Fine spherical starlight points
for _ in range(160):
    sx = random.uniform(-42.0, 42.0)
    sy = random.uniform(28.0, 56.0)
    sz = random.uniform(2.0, 30.0)
    s_rad = random.uniform(0.04, 0.08)
    bmesh.ops.create_uvsphere(bm_stars, u_segments=6, v_segments=4, radius=s_rad,
        matrix=Matrix.Translation((sx, sy, sz)))

# 6 Radiant 4-Point Diamond Sparkle Stars
sparkle_positions = [
    (-13.0, 34.0, 18.0),
    (-7.5, 32.0, 15.0),
    (-20.0, 36.0, 10.0),
    (1.5, 30.0, 20.0),
    (16.0, 36.0, 22.0),
    (22.0, 34.0, 12.0)
]
for spx, spy, spz in sparkle_positions:
    bmesh.ops.create_cone(bm_stars, segments=4, radius1=0.12, radius2=0.01, depth=1.4,
        matrix=Matrix.Translation((spx, spy, spz)) @
               Matrix.Rotation(radians(90), 4, 'Y'))
    bmesh.ops.create_cone(bm_stars, segments=4, radius1=0.12, radius2=0.01, depth=1.4,
        matrix=Matrix.Translation((spx, spy, spz)))
    bmesh.ops.create_uvsphere(bm_stars, u_segments=6, v_segments=4, radius=0.20,
        matrix=Matrix.Translation((spx, spy, spz)))

stars_mesh = bpy.data.meshes.new("Celestial_Stars_Mesh")
bm_stars.to_mesh(stars_mesh)
bm_stars.free()
stars_obj = add_mesh_object("Celestial_3D_Stars", stars_mesh, mat_star_glow)

# -----------------------------------------------------------------------------
# 14. SKY DOME & WORLD ENVIRONMENT
# -----------------------------------------------------------------------------
world = bpy.context.scene.world
if world and world.use_nodes:
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs['Color'].default_value = (0.015, 0.010, 0.035, 1.0)
        bg.inputs['Strength'].default_value = 0.65

bpy.ops.mesh.primitive_uv_sphere_add(radius=100.0, location=(0.0, 20.0, 8.0), segments=36, ring_count=24)
sky_dome = bpy.context.active_object
sky_dome.name = "Celestial_Space_Dome"
sky_dome.data.materials.append(mat_space_dome)
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

# -----------------------------------------------------------------------------
# 15. CALIBRATED 16:9 COMBAT CAMERA (Platform Ratio ~0.71, Z = 0.0 Grounding)
# -----------------------------------------------------------------------------
CAM_DIST = 18.8
CAM_HEIGHT = 5.0
CAM_PITCH = radians(78.5)

cam_data = bpy.data.cameras.new("Celestial_Combat_Cam")
cam_data.lens = 27.5
cam_data.clip_start = 0.1
cam_data.clip_end = 600.0

cam_obj = bpy.data.objects.new("Celestial_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -CAM_DIST, CAM_HEIGHT)
cam_obj.rotation_euler = (CAM_PITCH, 0.0, 0.0)

# -----------------------------------------------------------------------------
# 16. ETHEREAL CELESTIAL LIGHTING RIG (Balanced for High-Fidelity Anime Contrast)
# -----------------------------------------------------------------------------
def create_light(name, ltype, energy, color, loc, rot=(0,0,0), size=None):
    ldata = bpy.data.lights.new(name=name, type=ltype)
    ldata.energy = energy
    ldata.color = color
    if size and hasattr(ldata, 'size'): ldata.size = size
    obj = bpy.data.objects.new(name, ldata)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    return obj

# Key Moonlight (From upper right where moon shines)
create_light("Moon_Key_Light", 'AREA', 1450, (0.90, 0.95, 1.00), (8.5, 18.0, 16.0),
             (radians(38), radians(-12), radians(-25)), size=16.0)

# Rim Mystic Purple Light (From left crystal spires)
create_light("Amethyst_Rim_Light", 'AREA', 950, (0.82, 0.18, 0.95), (-16.0, 11.0, 7.0),
             (radians(28), radians(25), radians(65)), size=14.0)

# Combat Deck Fill Light (To illuminate characters & marble pavers)
create_light("Combat_Deck_Fill", 'AREA', 850, (0.96, 0.96, 1.00), (0.0, -8.0, 5.5),
             (radians(68), 0.0, 0.0), size=16.0)

# Top Astral Ambient Light (Soft indigo wash)
create_light("Top_Astral_Ambient", 'AREA', 500, (0.30, 0.20, 0.58), (0.0, 5.0, 16.0),
             (radians(15), 0.0, 0.0), size=24.0)

# Warm Golden Point Lights in the 4 Platform Lanterns
for idx, (lx, ly, lz) in enumerate(lantern_coords):
    create_light(f"Lantern_PointLight_{idx+1}", 'POINT', 280, (1.0, 0.82, 0.38), (lx, ly, lz + 1.25))

# Dais Entrance Lantern Point Lights
for idx, lx in enumerate([-2.1, 2.1]):
    create_light(f"Dais_Lantern_{idx+1}", 'POINT', 180, (1.0, 0.82, 0.38), (lx, 5.0, DAIS_Z + 0.72))

# Cyan Underglow beneath Central Arch from the Power Core
create_light("Power_Core_Cyan_Glow", 'POINT', 420, (0.15, 0.90, 1.00), (CORE_X, CORE_Y, CORE_Z))

# -----------------------------------------------------------------------------
# 17. EXPORT .BLEND, RENDER STILL, EXPORT .GLB
# -----------------------------------------------------------------------------
blend_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=False)
print(f">>> [Celestial Void 100% 3D] Saved Blender scene: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Celestial Void 100% 3D] Rendered EEVEE still: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Celestial Void 100% 3D] Exported GLB model: {glb_path}")

print(">>> [Celestial Void 100% 3D] Build & Render Completed Successfully!")

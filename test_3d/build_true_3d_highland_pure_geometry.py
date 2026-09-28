"""
KeyFury 3D: Highland Sanctuary (100% Pure Procedural 3D Polygonal Geometry)
Masterpiece Procedural & Geometric 3D Stage in Blender 5.2.1 LTS
- Walkway Platform Grounded at Z = 0.0 (Front Combat Baseline Ratio: 0.72)
- Zero 2D flat backdrop textures: 100% geometric 3D meshes throughout
- Full 360-Degree Panoramic Surroundings in all directions
- Calibrated Vibrant Anime Daylight Palette: Rich Emerald Grass, Warm Weathered Sandstone & Golden Runes
- Deep Canyon Gorge under bridge (Zero terrain clipping on bridge front wall)
- Intricate 3D carved ancient Nordic/Celtic runes with glowing golden amber emission
- Creeping 3D emerald moss and hanging ivy frills along flagstone seams and corbels
- Contoured highland valley terrain with rolling green hills, river delta, and trails
- Crystalline turquoise alpine lake with golden sandy beach shoreline
- Tiered rock cliff amphitheatre on right flank with cascading foaming waterfalls
- Medieval limestone castle fortress on left ridge with keep, bastion towers & conical roofs
- Hero alpine peak (Mount Dominant) with faceted rock arêtes, couloirs & radiant snow cap
- Full 360-degree panoramic outer mountain ridge ring and floating mist ribbons
- Billowing 3D polygonal cumulus cloud banks and procedural gradient sky dome
- 5-Camera Multi-Angle Verification Suite (Front, Left Profile, Isometric Aerial, Right Perspective, Low Angle)
"""

import bpy
import bmesh
import mathutils
from mathutils import Vector, Matrix, Euler
import math
from math import radians, sin, cos, sqrt, atan2
import os

print(">>> [Highland Sanctuary 100% 3D] Building Masterpiece Procedural 3D Stage...")

# ------------------------------------------------------------------------------
# 1. Clean Scene
# ------------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0: bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0: bpy.data.materials.remove(block)
for block in bpy.data.images:
    if block.users == 0: bpy.data.images.remove(block)
for block in bpy.data.cameras:
    if block.users == 0: bpy.data.cameras.remove(block)
for block in bpy.data.lights:
    if block.users == 0: bpy.data.lights.remove(block)

# ------------------------------------------------------------------------------
# 2. Render & Color Management Configuration
# ------------------------------------------------------------------------------
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'

# World ambient lighting (calibrated soft ambient fill)
world = scene.world
if not world:
    world = bpy.data.worlds.new("Highland_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.45, 0.72, 0.95, 1.0)
    bg_node.inputs['Strength'].default_value = 0.28

out_dir = r"d:\Keyboard stickman warrior\test_3d"
os.makedirs(out_dir, exist_ok=True)

# ------------------------------------------------------------------------------
# 3. Material Builders & Definitions
# ------------------------------------------------------------------------------
def make_shader(name, base_color=(0.5, 0.5, 0.5, 1.0), roughness=0.6, metallic=0.0, specular=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
    return mat

def make_emissive(name, color=(1.0, 0.82, 0.22, 1.0), strength=2.2):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.35
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = color
        bsdf.inputs['Emission Strength'].default_value = strength
    elif 'Emission' in bsdf.inputs:
        bsdf.inputs['Emission'].default_value = color
        if 'Emission Strength' in bsdf.inputs:
            bsdf.inputs['Emission Strength'].default_value = strength
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def make_water_shader(name, base_color=(0.04, 0.45, 0.68, 1.0), roughness=0.03, specular=0.95):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = 0.05
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
        if 'IOR' in bsdf.inputs:
            bsdf.inputs['IOR'].default_value = 1.333
    return mat

# Warm Weathered Sandstone/Limestone Palette (Authentic Anime Tones, NOT washed out white)
mat_flagstone_main = make_shader("Mat_Flagstone_Main", (0.50, 0.46, 0.38, 1.0), roughness=0.58)
mat_stone_wall     = make_shader("Mat_Stone_Wall",     (0.42, 0.38, 0.30, 1.0), roughness=0.68)
mat_stone_dark     = make_shader("Mat_Stone_Dark",     (0.25, 0.22, 0.17, 1.0), roughness=0.82)
mat_stone_trim     = make_shader("Mat_Stone_Trim",     (0.56, 0.52, 0.44, 1.0), roughness=0.50)

# Golden Ancient Runes & Magical Shaders
mat_rune_gold      = make_emissive("Mat_Rune_Gold",    (1.00, 0.76, 0.15, 1.0), strength=4.2)
mat_waterfall_foam = make_emissive("Mat_Waterfall_Foam", (0.95, 0.98, 1.00, 1.0), strength=2.8)
mat_window_warm    = make_emissive("Mat_Window_Warm",  (1.00, 0.82, 0.35, 1.0), strength=3.2)
mat_mtn_snow       = make_emissive("Mat_Mtn_Snow",     (0.96, 0.98, 1.00, 1.0), strength=1.40)
mat_cloud          = make_emissive("Mat_Cloud",        (0.96, 0.98, 1.00, 1.0), strength=1.20)
mat_mist           = make_emissive("Mat_Mist",         (0.90, 0.94, 0.98, 1.0), strength=0.95)

# Nature & Landscape Materials (Vibrant Rich Anime Greens)
mat_moss           = make_shader("Mat_Moss",           (0.18, 0.52, 0.10, 1.0), roughness=0.85)
mat_grass_highland = make_shader("Mat_Grass_Highland", (0.16, 0.50, 0.14, 1.0), roughness=0.66)
mat_grass_sunny    = make_shader("Mat_Grass_Sunny",    (0.26, 0.60, 0.16, 1.0), roughness=0.62)
mat_cliff_rock     = make_shader("Mat_Cliff_Rock",     (0.38, 0.35, 0.32, 1.0), roughness=0.78)
mat_wet_rock       = make_shader("Mat_Wet_Rock",       (0.18, 0.20, 0.22, 1.0), roughness=0.18, specular=0.88)
mat_alpine_water   = make_water_shader("Mat_Alpine_Water", (0.05, 0.44, 0.68, 1.0))
mat_shoreline_sand = make_shader("Mat_Shoreline_Sand", (0.74, 0.66, 0.48, 1.0), roughness=0.84)
mat_road           = make_shader("Mat_Road",           (0.68, 0.58, 0.44, 1.0), roughness=0.88)
mat_pine           = make_shader("Mat_Pine",           (0.06, 0.24, 0.10, 1.0), roughness=0.82)
mat_deciduous      = make_shader("Mat_Deciduous",      (0.20, 0.54, 0.12, 1.0), roughness=0.65)
mat_tree_trunk     = make_shader("Mat_Tree_Trunk",     (0.20, 0.14, 0.08, 1.0), roughness=0.88)

# Castle & Mountain Materials
mat_castle_stone   = make_shader("Mat_Castle_Stone",   (0.78, 0.76, 0.72, 1.0), roughness=0.56)
mat_castle_roof    = make_shader("Mat_Castle_Roof",    (0.20, 0.26, 0.36, 1.0), roughness=0.48)
mat_mtn_rock       = make_shader("Mat_Mtn_Rock",       (0.34, 0.38, 0.46, 1.0), roughness=0.80)
mat_distant_mtn    = make_shader("Mat_Distant_Mtn",    (0.30, 0.40, 0.56, 1.0), roughness=0.76)

def add_mesh_obj(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

# ------------------------------------------------------------------------------
# 4. Foreground Ancient Stone Bridge Platform (Z = 0.0 Grounded)
# ------------------------------------------------------------------------------
print(">>> Building Ancient Runic Stone Bridge Platform...")
# A. Main Structural Deck & Paved Flagstone Walkway Floor
bm_deck = bmesh.new()

# Base foundation slab under flagstones
bmesh.ops.create_cube(bm_deck, size=1.0,
    matrix=Matrix.Translation((0, 0, -0.32)) @
           Matrix.Scale(28.0, 4, (1,0,0)) @
           Matrix.Scale(5.2, 4, (0,1,0)) @
           Matrix.Scale(0.64, 4, (0,0,1)))

# Paving flagstone slabs on surface (Z = 0.0) with varied widths and offsets
for row in range(7):
    py = -2.00 + row * 0.66
    stagger = 0.68 if (row % 2 == 1) else 0.0
    for col in range(20):
        px = -13.0 + col * 1.38 + stagger
        if px > 13.5 or px < -13.5: continue
        pw = 1.32 + (sin(col * 3.7 + row) * 0.05)
        pd = 0.60 + (cos(col * 2.1 + row * 1.3) * 0.04)
        ph = 0.024 + (sin(col * 1.5 + row * 2.2) * 0.006)
        bmesh.ops.create_cube(bm_deck, size=1.0,
            matrix=Matrix.Translation((px, py, ph * 0.5)) @
                   Matrix.Scale(pw, 4, (1,0,0)) @
                   Matrix.Scale(pd, 4, (0,1,0)) @
                   Matrix.Scale(ph, 4, (0,0,1)))

deck_mesh = bpy.data.meshes.new("Highland_Deck_Mesh")
bm_deck.to_mesh(deck_mesh)
bm_deck.free()
deck_obj = add_mesh_obj("Highland_3D_Deck", deck_mesh)
deck_obj.data.materials.append(mat_flagstone_main)

# B. Front & Rear Multi-Course Weathered Stone Masonry Walls & Gorge Piers
bm_wall = bmesh.new()

# Courses of individual stone masonry blocks on the front wall
courses = [
    (-0.32, 0.48, 16, 0.0),
    (-0.84, 0.56, 15, 0.70),
    (-1.46, 0.66, 17, 0.35),
    (-2.20, 0.82, 14, 0.85),
    (-3.10, 0.98, 13, 0.20),
    (-4.15, 1.12, 12, 0.65),
    (-5.35, 1.28, 11, 0.10),
]
for cz, ch, num_blocks, c_stagger in courses:
    bw = 27.6 / num_blocks
    for b_idx in range(num_blocks):
        bx = -13.8 + b_idx * bw + (bw * 0.5) + c_stagger * 0.2
        if bx > 13.8 or bx < -13.8: continue
        depth_offset = sin(b_idx * 2.3 + cz) * 0.03
        bmesh.ops.create_cube(bm_wall, size=1.0,
            matrix=Matrix.Translation((bx, -2.52 + depth_offset, cz)) @
                   Matrix.Scale(bw * 0.96, 4, (1,0,0)) @
                   Matrix.Scale(0.42, 4, (0,1,0)) @
                   Matrix.Scale(ch * 0.94, 4, (0,0,1)))

# Massive bridge piers extending down into the gorge (Z = -6.0 down to -14.0)
pier_xs = [-9.5, -3.2, 3.2, 9.5]
for px in pier_xs:
    bmesh.ops.create_cube(bm_wall, size=1.0,
        matrix=Matrix.Translation((px, 0.0, -9.5)) @
               Matrix.Scale(2.6, 4, (1,0,0)) @
               Matrix.Scale(5.6, 4, (0,1,0)) @
               Matrix.Scale(7.5, 4, (0,0,1)))
    # Pier base foundation block
    bmesh.ops.create_cube(bm_wall, size=1.0,
        matrix=Matrix.Translation((px, 0.0, -13.5)) @
               Matrix.Scale(3.4, 4, (1,0,0)) @
               Matrix.Scale(6.4, 4, (0,1,0)) @
               Matrix.Scale(2.0, 4, (0,0,1)))

# Continuous foundation backplane closing any gaps below frame
bmesh.ops.create_cube(bm_wall, size=1.0,
    matrix=Matrix.Translation((0, -2.45, -8.0)) @
           Matrix.Scale(28.5, 4, (1,0,0)) @
           Matrix.Scale(0.9, 4, (0,1,0)) @
           Matrix.Scale(8.0, 4, (0,0,1)))

wall_mesh = bpy.data.meshes.new("Highland_Wall_Mesh")
bm_wall.to_mesh(wall_mesh)
bm_wall.free()
wall_obj = add_mesh_obj("Highland_3D_Wall", wall_mesh)
wall_obj.data.materials.append(mat_stone_wall)

# C. Stone Buttress Piers, Corbels, Trim Coping & Balustrades
bm_trim = bmesh.new()

# Top coping trim cantilever overhang under walkway front edge
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=Matrix.Translation((0, -2.56, -0.06)) @
           Matrix.Scale(28.4, 4, (1,0,0)) @
           Matrix.Scale(0.28, 4, (0,1,0)) @
           Matrix.Scale(0.14, 4, (0,0,1)))

# Front coping decorative corbels supporting the overhang
for cb_x in range(-13, 14, 2):
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((cb_x * 0.98, -2.62, -0.18)) @
               Matrix.Scale(0.38, 4, (1,0,0)) @
               Matrix.Scale(0.30, 4, (0,1,0)) @
               Matrix.Scale(0.20, 4, (0,0,1)))

# Front Parapet curb wall
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=Matrix.Translation((0, -2.46, 0.18)) @
           Matrix.Scale(27.8, 4, (1,0,0)) @
           Matrix.Scale(0.34, 4, (0,1,0)) @
           Matrix.Scale(0.36, 4, (0,0,1)))

# Front Buttress Pilasters and Decorative Pillars
buttress_xs = [-10.2, -6.2, -2.2, 2.2, 6.2, 10.2]
for bx in buttress_xs:
    # Buttress base plinth
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((bx, -2.72, -3.2)) @
               Matrix.Scale(1.30, 4, (1,0,0)) @
               Matrix.Scale(0.50, 4, (0,1,0)) @
               Matrix.Scale(0.80, 4, (0,0,1)))
    # Buttress main shaft
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((bx, -2.70, -1.45)) @
               Matrix.Scale(1.12, 4, (1,0,0)) @
               Matrix.Scale(0.44, 4, (0,1,0)) @
               Matrix.Scale(2.80, 4, (0,0,1)))
    # Stepped moulded capital cap
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((bx, -2.68, 0.06)) @
               Matrix.Scale(1.24, 4, (1,0,0)) @
               Matrix.Scale(0.48, 4, (0,1,0)) @
               Matrix.Scale(0.28, 4, (0,0,1)))
    # Front parapet pillar extension
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((bx, -2.56, 0.32)) @
               Matrix.Scale(0.96, 4, (1,0,0)) @
               Matrix.Scale(0.46, 4, (0,1,0)) @
               Matrix.Scale(0.36, 4, (0,0,1)))
    # Rounded decorative capstone
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((bx, -2.56, 0.54)) @
               Matrix.Scale(1.08, 4, (1,0,0)) @
               Matrix.Scale(0.52, 4, (0,1,0)) @
               Matrix.Scale(0.12, 4, (0,0,1)))

# Rear Stone Balustrade Curb, Rail & Pillars
rear_y = 2.30
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=Matrix.Translation((0, rear_y, 0.18)) @
           Matrix.Scale(27.8, 4, (1,0,0)) @
           Matrix.Scale(0.34, 4, (0,1,0)) @
           Matrix.Scale(0.36, 4, (0,0,1)))
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=Matrix.Translation((0, rear_y, 0.40)) @
           Matrix.Scale(28.0, 4, (1,0,0)) @
           Matrix.Scale(0.40, 4, (0,1,0)) @
           Matrix.Scale(0.10, 4, (0,0,1)))

# Rear Ornate Carved Stone Pillars with Rounded Moulded Caps
pillar_xs = [-10.8, -6.8, -2.4, 2.4, 6.8, 10.8]
for px in pillar_xs:
    # Pillar base
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((px, rear_y, 0.24)) @
               Matrix.Scale(1.02, 4, (1,0,0)) @
               Matrix.Scale(0.52, 4, (0,1,0)) @
               Matrix.Scale(0.48, 4, (0,0,1)))
    # Shaft
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((px, rear_y, 0.56)) @
               Matrix.Scale(0.90, 4, (1,0,0)) @
               Matrix.Scale(0.46, 4, (0,1,0)) @
               Matrix.Scale(0.36, 4, (0,0,1)))
    # Stepped moulded capital
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((px, rear_y, 0.78)) @
               Matrix.Scale(1.05, 4, (1,0,0)) @
               Matrix.Scale(0.54, 4, (0,1,0)) @
               Matrix.Scale(0.10, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=Matrix.Translation((px, rear_y, 0.86)) @
               Matrix.Scale(0.82, 4, (1,0,0)) @
               Matrix.Scale(0.42, 4, (0,1,0)) @
               Matrix.Scale(0.08, 4, (0,0,1)))

# Recessed dark stone panels in rear pillars and front buttresses
bm_dark = bmesh.new()
for px in pillar_xs:
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=Matrix.Translation((px, rear_y - 0.21, 0.54)) @
               Matrix.Scale(0.60, 4, (1,0,0)) @
               Matrix.Scale(0.06, 4, (0,1,0)) @
               Matrix.Scale(0.28, 4, (0,0,1)))

for bx in buttress_xs:
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=Matrix.Translation((bx, -2.91, -1.45)) @
               Matrix.Scale(0.74, 4, (1,0,0)) @
               Matrix.Scale(0.06, 4, (0,1,0)) @
               Matrix.Scale(2.30, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=Matrix.Translation((bx, -2.78, 0.32)) @
               Matrix.Scale(0.64, 4, (1,0,0)) @
               Matrix.Scale(0.06, 4, (0,1,0)) @
               Matrix.Scale(0.26, 4, (0,0,1)))

trim_mesh = bpy.data.meshes.new("Highland_Trim_Mesh")
bm_trim.to_mesh(trim_mesh)
bm_trim.free()
trim_obj = add_mesh_obj("Highland_3D_Trim", trim_mesh)
trim_obj.data.materials.append(mat_stone_trim)

dark_mesh = bpy.data.meshes.new("Highland_Dark_Mesh")
bm_dark.to_mesh(dark_mesh)
bm_dark.free()
dark_obj = add_mesh_obj("Highland_3D_Dark_Panels", dark_mesh)
dark_obj.data.materials.append(mat_stone_dark)

# ------------------------------------------------------------------------------
# 5. Dedicated 3D Runes Mesh (Authentic Carved Ancient Glyphs & Sigils)
# ------------------------------------------------------------------------------
print(">>> Modeling Intricate 3D Carved Nordic/Celtic Runes...")
bm_runes = bmesh.new()

def add_runic_sigil(bm, cx, cy, cz, size=0.22, glyph_type=0):
    g = glyph_type % 7
    if g == 0:  # Fehu (ᚠ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.05, cy, cz + 0.04)) @
                   Matrix.Rotation(radians(35), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.05, cy, cz - 0.02)) @
                   Matrix.Rotation(radians(35), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
    elif g == 1: # Raido (ᚱ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.05, cy, cz + 0.04)) @
                   Matrix.Rotation(radians(40), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.5, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.05, cy, cz - 0.04)) @
                   Matrix.Rotation(radians(-40), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.5, 4, (0,0,1)))
    elif g == 2: # Tiwaz (ᛏ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx - 0.04, cy, cz + 0.06)) @
                   Matrix.Rotation(radians(35), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.04, cy, cz + 0.06)) @
                   Matrix.Rotation(radians(-35), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
    elif g == 3: # Gebo (ᚷ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Rotation(radians(45), 4, 'Y') @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Rotation(radians(-45), 4, 'Y') @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
    elif g == 4: # Algiz (ᛉ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx - 0.05, cy, cz + 0.03)) @
                   Matrix.Rotation(radians(-40), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.55, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.05, cy, cz + 0.03)) @
                   Matrix.Rotation(radians(40), 4, 'Y') @
                   Matrix.Scale(0.03, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.55, 4, (0,0,1)))
    elif g == 5: # Sowilo (ᛋ)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx - 0.04, cy, cz + 0.06)) @
                   Matrix.Rotation(radians(30), 4, 'Y') @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx, cy, cz)) @
                   Matrix.Rotation(radians(-45), 4, 'Y') @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.55, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=Matrix.Translation((cx + 0.04, cy, cz - 0.06)) @
                   Matrix.Rotation(radians(30), 4, 'Y') @
                   Matrix.Scale(0.035, 4, (1,0,0)) @
                   Matrix.Scale(0.02, 4, (0,1,0)) @
                   Matrix.Scale(size * 0.45, 4, (0,0,1)))
    else: # Othala (ᛟ)
        for ang in [radians(45), radians(-45)]:
            bmesh.ops.create_cube(bm, size=1.0,
                matrix=Matrix.Translation((cx, cy, cz + 0.02)) @
                       Matrix.Rotation(ang, 4, 'Y') @
                       Matrix.Scale(0.032, 4, (1,0,0)) @
                       Matrix.Scale(0.02, 4, (0,1,0)) @
                       Matrix.Scale(size * 0.65, 4, (0,0,1)))

# Buttress pier vertical carved ancient runes (3 authentic sigils stacked on each pier)
for b_i, bx in enumerate(buttress_xs):
    add_runic_sigil(bm_runes, bx, -2.94, -0.85, size=0.26, glyph_type=b_i)
    add_runic_sigil(bm_runes, bx, -2.94, -1.45, size=0.28, glyph_type=b_i + 1)
    add_runic_sigil(bm_runes, bx, -2.94, -2.05, size=0.26, glyph_type=b_i + 2)
    # Parapet post glyph
    add_runic_sigil(bm_runes, bx, -2.81, 0.32, size=0.20, glyph_type=b_i + 3)

# Rear balustrade pillar carved runes
for p_i, px in enumerate(pillar_xs):
    add_runic_sigil(bm_runes, px, rear_y - 0.24, 0.54, size=0.24, glyph_type=p_i + 4)

# Continuous horizontal runic frieze lines along front parapet curb
for seg in range(48):
    sx = -12.5 + seg * 0.53
    gw = 0.34 + (sin(seg * 2.7) * 0.08)
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=Matrix.Translation((sx, -2.61, 0.18)) @
               Matrix.Scale(gw, 4, (1,0,0)) @
               Matrix.Scale(0.02, 4, (0,1,0)) @
               Matrix.Scale(0.08, 4, (0,0,1)))

# Continuous horizontal runic frieze lines along rear balustrade curb
for seg in range(48):
    sx = -12.5 + seg * 0.53
    gw = 0.34 + (sin(seg * 3.1) * 0.08)
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=Matrix.Translation((sx, rear_y - 0.17, 0.22)) @
               Matrix.Scale(gw, 4, (1,0,0)) @
               Matrix.Scale(0.02, 4, (0,1,0)) @
               Matrix.Scale(0.08, 4, (0,0,1)))

# Floor runic inlay border ribbons along front and rear walkway margins
for col in range(36):
    gx = -12.5 + col * 0.70
    gw = 0.44 + (sin(col * 2.3) * 0.10)
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=Matrix.Translation((gx, -2.15, 0.025)) @
               Matrix.Scale(gw, 4, (1,0,0)) @
               Matrix.Scale(0.08, 4, (0,1,0)) @
               Matrix.Scale(0.012, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=Matrix.Translation((gx, 2.05, 0.025)) @
               Matrix.Scale(gw, 4, (1,0,0)) @
               Matrix.Scale(0.08, 4, (0,1,0)) @
               Matrix.Scale(0.012, 4, (0,0,1)))

# Center combat magic rune circle inlay
circ_segs = 32
for s in range(circ_segs):
    ang = 2.0 * math.pi * s / circ_segs
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=Matrix.Translation((cos(ang) * 2.8, sin(ang) * 1.4, 0.026)) @
               Matrix.Rotation(ang, 4, 'Z') @
               Matrix.Scale(0.28, 4, (1,0,0)) @
               Matrix.Scale(0.05, 4, (0,1,0)) @
               Matrix.Scale(0.012, 4, (0,0,1)))

runes_mesh = bpy.data.meshes.new("Highland_Runes_Mesh")
bm_runes.to_mesh(runes_mesh)
bm_runes.free()
runes_obj = add_mesh_obj("Highland_3D_Runes", runes_mesh)
runes_obj.data.materials.append(mat_rune_gold)

# ------------------------------------------------------------------------------
# 6. Dedicated 3D Moss & Creeping Foliage Mesh
# ------------------------------------------------------------------------------
print(">>> Modeling Creeping 3D Moss & Hanging Ivy...")
bm_moss = bmesh.new()

moss_coping_spots = [
    (-11.5, -2.58, 0.06, 0.55, 0.24, 0.08),
    (-9.0,  -2.58, 0.03, 0.65, 0.26, 0.09),
    (-5.5,  -2.60, 0.05, 0.70, 0.24, 0.08),
    (-3.8,  -2.58, 0.03, 0.45, 0.20, 0.07),
    (-0.8,  -2.60, 0.06, 0.80, 0.28, 0.10),
    (1.5,   -2.58, 0.04, 0.60, 0.22, 0.07),
    (4.5,   -2.60, 0.05, 0.75, 0.26, 0.09),
    (7.5,   -2.58, 0.06, 0.85, 0.30, 0.11),
    (9.8,   -2.58, 0.03, 0.58, 0.24, 0.07),
    (12.0,  -2.58, 0.05, 0.62, 0.26, 0.08)
]
for mx, my, mz, mw, md, mh in moss_coping_spots:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=Matrix.Translation((mx, my, mz)) @
               Matrix.Scale(mw, 4, (1,0,0)) @
               Matrix.Scale(md, 4, (0,1,0)) @
               Matrix.Scale(mh, 4, (0,0,1)))

hanging_ivy = [
    (-11.8, -2.66, -0.45, 0.22, 0.06, 0.55),
    (-8.5,  -2.66, -0.55, 0.26, 0.06, 0.65),
    (-5.0,  -2.66, -0.48, 0.24, 0.06, 0.58),
    (-0.5,  -2.66, -0.60, 0.28, 0.06, 0.72),
    (3.8,   -2.66, -0.46, 0.22, 0.06, 0.54),
    (8.2,   -2.66, -0.62, 0.28, 0.06, 0.75),
    (11.5,  -2.66, -0.50, 0.25, 0.06, 0.60)
]
for ix, iy, iz, iw, idp, ih in hanging_ivy:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=Matrix.Translation((ix, iy, iz)) @
               Matrix.Scale(iw, 4, (1,0,0)) @
               Matrix.Scale(idp, 4, (0,1,0)) @
               Matrix.Scale(ih, 4, (0,0,1)))

for px in pillar_xs:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=Matrix.Translation((px + 0.30, rear_y - 0.05, 0.86)) @
               Matrix.Scale(0.42, 4, (1,0,0)) @
               Matrix.Scale(0.24, 4, (0,1,0)) @
               Matrix.Scale(0.06, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=Matrix.Translation((px - 0.30, rear_y - 0.10, 0.04)) @
               Matrix.Scale(0.48, 4, (1,0,0)) @
               Matrix.Scale(0.26, 4, (0,1,0)) @
               Matrix.Scale(0.05, 4, (0,0,1)))

moss_mesh = bpy.data.meshes.new("Highland_Moss_Mesh")
bm_moss.to_mesh(moss_mesh)
bm_moss.free()
moss_obj = add_mesh_obj("Highland_3D_Moss", moss_mesh)
moss_obj.data.materials.append(mat_moss)

# ------------------------------------------------------------------------------
# 7. 360-Degree Panoramic Highland Valley & Deep Canyon Gorge Terrain
# ------------------------------------------------------------------------------
print(">>> Modeling 360-Degree Panoramic Highland Terrain & Gorge...")
bm_terrain = bmesh.new()

res_x, res_y = 80, 72
min_x, max_x = -85.0, 85.0
min_y, max_y = -65.0, 85.0

def highland_elevation_360(x, y):
    # DEEP CANYON GORGE: Between camera (Y = -18) and bridge (Y = 0),
    # terrain MUST drop down so it never clips or obscures the bridge front wall!
    if -22.0 <= y <= 1.5:
        # Canyon gorge floor at Z = -6.0 to -12.0m, rising only at the left/right bridge abutments (|X| > 13.5)
        abutment_factor = max(0.0, (abs(x) - 13.0) / 8.0)
        z = -7.5 - 3.5 * math.exp(-(x**2)/120.0) + abutment_factor * 6.5
        return z

    z = -1.0
    if y > 1.5:
        norm_y = y / 85.0
        z += norm_y * 4.2
    else: # South terrain behind camera (Y < -22)
        norm_y = abs(y) / 65.0
        z += norm_y * 3.2

    # Left castle hill ridge (peaks around X = -13, Y = 36)
    dx_cas = (x + 13.0) / 10.0
    dy_cas = (y - 36.0) / 9.0
    dist_cas = dx_cas**2 + dy_cas**2
    if dist_cas < 3.0:
        z += 6.5 * math.exp(-dist_cas * 1.0)

    # Left foreground framing bluff (X = -18, Y = 10)
    dx_lfg = (x + 18.0) / 8.0
    dy_lfg = (y - 10.0) / 6.0
    z += 4.2 * math.exp(-(dx_lfg**2 + dy_lfg**2))

    # Right waterfall rocky cliff plateau (X = 14.0 to 20.0, Y = 24.0 to 30.0)
    dx_fall = (x - 16.0) / 7.0
    dy_fall = (y - 26.0) / 7.0
    dist_fall = dx_fall**2 + dy_fall**2
    if dist_fall < 2.5:
        z += 5.2 * math.exp(-dist_fall * 1.0)

    # Central lake depression (X = 3.0, Y = 30.0)
    dx_lake = (x - 3.0) / 13.0
    dy_lake = (y - 30.0) / 8.5
    dist_lake = dx_lake**2 + dy_lake**2
    if dist_lake < 1.0:
        z -= (1.0 - dist_lake) * 3.2

    # Rolling background north hills
    z += 4.8 * math.exp(-((x + 32.0)**2 + (y - 52.0)**2) / 220.0)
    z += 5.0 * math.exp(-((x - 32.0)**2 + (y - 52.0)**2) / 220.0)
    z += 3.2 * math.exp(-((x - 3.0)**2 + (y - 58.0)**2) / 180.0)

    # Rolling south hills behind camera (Y < -25)
    if y < -25.0:
        z += 4.2 * math.exp(-((x + 25.0)**2 + (y + 45.0)**2) / 220.0)
        z += 4.5 * math.exp(-((x - 25.0)**2 + (y + 45.0)**2) / 220.0)

    # Gentle natural undulating knolls
    z += sin(x * 0.16) * cos(y * 0.13) * 0.45
    return z

verts_grid = []
for j in range(res_y):
    v_row = []
    y = min_y + (j / (res_y - 1)) * (max_y - min_y)
    for i in range(res_x):
        x = min_x + (i / (res_x - 1)) * (max_x - min_x)
        z = highland_elevation_360(x, y)
        v = bm_terrain.verts.new((x, y, z))
        v_row.append(v)
    verts_grid.append(v_row)

for j in range(res_y - 1):
    for i in range(res_x - 1):
        v1 = verts_grid[j][i]
        v2 = verts_grid[j][i+1]
        v3 = verts_grid[j+1][i+1]
        v4 = verts_grid[j+1][i]
        bm_terrain.faces.new([v1, v2, v3, v4])

terrain_mesh = bpy.data.meshes.new("Highland_Terrain_Mesh")
bm_terrain.to_mesh(terrain_mesh)
bm_terrain.free()
terrain_obj = add_mesh_obj("Highland_3D_Terrain", terrain_mesh)
terrain_obj.data.materials.append(mat_grass_highland)
for poly in terrain_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 8. Stratified Rock Cliffs (Under Castle & Behind Waterfall)
# ------------------------------------------------------------------------------
print(">>> Modeling Stratified Rock Cliff Escarpments...")
bm_cliffs = bmesh.new()

# Left Castle Ridge stratified cliff ledges
castle_cliff_steps = [
    (-10.5, 33.5, 4.2, 4.8, 2.8, 1.8),
    (-8.5,  35.5, 3.8, 4.4, 3.0, 1.9),
    (-13.0, 31.5, 4.0, 4.6, 2.6, 1.7),
    (-7.5,  30.0, 2.6, 4.0, 2.4, 1.5),
]
for cx, cy, cz, cw, cd, ch in castle_cliff_steps:
    bmesh.ops.create_cube(bm_cliffs, size=1.0,
        matrix=Matrix.Translation((cx, cy, cz)) @
               Matrix.Rotation(radians(18), 4, 'Z') @
               Matrix.Scale(cw, 4, (1,0,0)) @
               Matrix.Scale(cd, 4, (0,1,0)) @
               Matrix.Scale(ch, 4, (0,0,1)))

# Right Waterfall tiered rock ledges & crags (At X = 13.5 to 17.5, Y = 23 to 29)
fall_cliffs = [
    (15.5, 27.5, 5.0, 5.2, 3.8, 2.2),
    (16.8, 25.5, 3.8, 4.8, 3.4, 2.4),
    (14.2, 28.5, 3.0, 4.4, 3.2, 2.0),
    (16.0, 23.0, 2.0, 5.0, 3.0, 1.8),
    (13.5, 25.5, 1.2, 4.5, 2.8, 1.6),
    (12.5, 23.5, 0.5, 4.2, 2.6, 1.4)
]
for fx, fy, fz, fw, fd, fh in fall_cliffs:
    bmesh.ops.create_cube(bm_cliffs, size=1.0,
        matrix=Matrix.Translation((fx, fy, fz)) @
               Matrix.Rotation(radians(-14), 4, 'Z') @
               Matrix.Scale(fw, 4, (1,0,0)) @
               Matrix.Scale(fd, 4, (0,1,0)) @
               Matrix.Scale(fh, 4, (0,0,1)))

# Gorge rock cliff flanks (supporting bridge landings on left and right)
bmesh.ops.create_cube(bm_cliffs, size=1.0,
    matrix=Matrix.Translation((-16.0, 0.0, -3.5)) @
           Matrix.Scale(6.5, 4, (1,0,0)) @
           Matrix.Scale(9.5, 4, (0,1,0)) @
           Matrix.Scale(8.0, 4, (0,0,1)))
bmesh.ops.create_cube(bm_cliffs, size=1.0,
    matrix=Matrix.Translation((16.0, 0.0, -3.5)) @
           Matrix.Scale(6.5, 4, (1,0,0)) @
           Matrix.Scale(9.5, 4, (0,1,0)) @
           Matrix.Scale(8.0, 4, (0,0,1)))

cliffs_mesh = bpy.data.meshes.new("Highland_Cliffs_Mesh")
bm_cliffs.to_mesh(cliffs_mesh)
bm_cliffs.free()
cliffs_obj = add_mesh_obj("Highland_3D_Cliffs", cliffs_mesh)
cliffs_obj.data.materials.append(mat_cliff_rock)
for poly in cliffs_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 9. Winding Mountain Trail / Road (Connecting Castle to Lake)
# ------------------------------------------------------------------------------
print(">>> Modeling Winding Mountain Trails...")
bm_road = bmesh.new()
road_pts = [
    (-12.5, 35.0, 5.5), (-10.5, 32.0, 4.4), (-9.0,  28.5, 3.4),
    (-7.0,  25.5, 2.3), (-5.0,  23.8, 1.5), (-2.5,  24.2, 0.9),
    (0.0,   25.5, 0.5), (2.5,   27.0, 0.35)
]
for idx in range(len(road_pts) - 1):
    p1 = road_pts[idx]
    p2 = road_pts[idx + 1]
    mx = (p1[0] + p2[0]) * 0.5
    my = (p1[1] + p2[1]) * 0.5
    mz = (p1[2] + p2[2]) * 0.5 + 0.04
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = sqrt(dx*dx + dy*dy)
    angle = math.atan2(dy, dx)
    bmesh.ops.create_cube(bm_road, size=1.0,
        matrix=Matrix.Translation((mx, my, mz)) @
               Matrix.Rotation(angle, 4, 'Z') @
               Matrix.Scale(length * 1.05, 4, (1,0,0)) @
               Matrix.Scale(0.95, 4, (0,1,0)) @
               Matrix.Scale(0.05, 4, (0,0,1)))

road_mesh = bpy.data.meshes.new("Highland_Road_Mesh")
bm_road.to_mesh(road_mesh)
bm_road.free()
road_obj = add_mesh_obj("Highland_3D_Road", road_mesh)
road_obj.data.materials.append(mat_road)

# ------------------------------------------------------------------------------
# 10. Alpine Lake, Shoreline Beach & S-Curve River System
# ------------------------------------------------------------------------------
print(">>> Modeling Alpine Lake, Shoreline Beach & River...")
bm_water = bmesh.new()

# Alpine Lake Surface (Z = 0.30)
lake_cx, lake_cy, lake_cz = 3.0, 30.0, 0.30
lake_rx, lake_ry = 13.0, 8.8
lake_segs = 40
v_l_center = bm_water.verts.new((lake_cx, lake_cy, lake_cz))
rim_verts = []
for s in range(lake_segs):
    ang = 2.0 * math.pi * s / lake_segs
    rad_mod = 1.0 + 0.18 * sin(ang * 3.0) + 0.09 * cos(ang * 5.0)
    vx = lake_cx + (lake_rx * rad_mod) * cos(ang)
    vy = lake_cy + (lake_ry * rad_mod) * sin(ang)
    rim_verts.append(bm_water.verts.new((vx, vy, lake_cz)))

for s in range(lake_segs):
    v_next = rim_verts[(s + 1) % lake_segs]
    bm_water.faces.new([v_l_center, rim_verts[s], v_next])

# Meandering S-Curve River connecting waterfall basin to lake
river_pts = [
    (2.5,  22.0, 0.30, 3.2),
    (4.8,  20.2, 0.32, 3.0),
    (7.8,  19.5, 0.34, 2.9),
    (10.5, 20.8, 0.36, 3.2),
    (12.8, 22.8, 0.38, 3.6),
    (14.8, 25.0, 0.40, 4.0)
]
for idx in range(len(river_pts) - 1):
    p1 = river_pts[idx]
    p2 = river_pts[idx + 1]
    mx = (p1[0] + p2[0]) * 0.5
    my = (p1[1] + p2[1]) * 0.5
    mz = (p1[2] + p2[2]) * 0.5
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = sqrt(dx*dx + dy*dy)
    angle = math.atan2(dy, dx)
    rw = (p1[3] + p2[3]) * 0.5
    bmesh.ops.create_cube(bm_water, size=1.0,
        matrix=Matrix.Translation((mx, my, mz)) @
               Matrix.Rotation(angle, 4, 'Z') @
               Matrix.Scale(length * 1.05, 4, (1,0,0)) @
               Matrix.Scale(rw, 4, (0,1,0)) @
               Matrix.Scale(0.05, 4, (0,0,1)))

# Gorge deep river stream directly under the bridge (Z = -9.8)
bmesh.ops.create_cube(bm_water, size=1.0,
    matrix=Matrix.Translation((0, 0, -9.8)) @
           Matrix.Scale(6.5, 4, (1,0,0)) @
           Matrix.Scale(26.0, 4, (0,1,0)) @
           Matrix.Scale(0.2, 4, (0,0,1)))

water_mesh = bpy.data.meshes.new("Highland_Water_Mesh")
bm_water.to_mesh(water_mesh)
bm_water.free()
water_obj = add_mesh_obj("Highland_3D_Lake", water_mesh)
water_obj.data.materials.append(mat_alpine_water)
for poly in water_mesh.polygons: poly.use_smooth = True

# Sandy Beach Shoreline Ring encircling the lake
bm_shore = bmesh.new()
for s in range(lake_segs):
    ang = 2.0 * math.pi * s / lake_segs
    rad_mod = 1.0 + 0.18 * sin(ang * 3.0) + 0.09 * cos(ang * 5.0)
    vx = lake_cx + (lake_rx * rad_mod + 0.8) * cos(ang)
    vy = lake_cy + (lake_ry * rad_mod + 0.8) * sin(ang)
    bmesh.ops.create_cube(bm_shore, size=1.0,
        matrix=Matrix.Translation((vx, vy, 0.31)) @
               Matrix.Rotation(ang, 4, 'Z') @
               Matrix.Scale(1.6, 4, (1,0,0)) @
               Matrix.Scale(1.3, 4, (0,1,0)) @
               Matrix.Scale(0.08, 4, (0,0,1)))

shore_mesh = bpy.data.meshes.new("Highland_Shoreline_Mesh")
bm_shore.to_mesh(shore_mesh)
bm_shore.free()
shore_obj = add_mesh_obj("Highland_3D_Shoreline", shore_mesh)
shore_obj.data.materials.append(mat_shoreline_sand)
for poly in shore_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 11. Cascading Multi-Tier Foaming Waterfall on Right Cliff
# ------------------------------------------------------------------------------
print(">>> Modeling Cascading Foaming Waterfalls & Plunge Pools...")
bm_falls = bmesh.new()

# Tier 1 (Upper Fall): Z = 5.2 down to 3.6
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=Matrix.Translation((15.8, 28.5, 4.4)) @
           Matrix.Rotation(radians(8), 4, 'Y') @
           Matrix.Scale(2.8, 4, (1,0,0)) @
           Matrix.Scale(0.50, 4, (0,1,0)) @
           Matrix.Scale(1.8, 4, (0,0,1)))

# Tier 2 (Mid Shelf Cascade): Z = 3.6 down to 1.8
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=Matrix.Translation((15.0, 27.0, 2.7)) @
           Matrix.Rotation(radians(-6), 4, 'Y') @
           Matrix.Scale(3.4, 4, (1,0,0)) @
           Matrix.Scale(0.55, 4, (0,1,0)) @
           Matrix.Scale(1.9, 4, (0,0,1)))

# Tier 3 (Lower Plunge & Rapids into River): Z = 1.8 down to 0.40
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=Matrix.Translation((14.2, 25.5, 1.1)) @
           Matrix.Scale(4.4, 4, (1,0,0)) @
           Matrix.Scale(0.60, 4, (0,1,0)) @
           Matrix.Scale(1.6, 4, (0,0,1)))

# Foaming splash churning discs at plunge basins
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=Matrix.Translation((15.0, 26.8, 3.5)) @
           Matrix.Scale(3.2, 4, (1,0,0)) @
           Matrix.Scale(1.6, 4, (0,1,0)) @
           Matrix.Scale(0.16, 4, (0,0,1)))
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=Matrix.Translation((14.0, 25.0, 0.44)) @
           Matrix.Scale(4.8, 4, (1,0,0)) @
           Matrix.Scale(2.4, 4, (0,1,0)) @
           Matrix.Scale(0.20, 4, (0,0,1)))

falls_mesh = bpy.data.meshes.new("Highland_Waterfall_Mesh")
bm_falls.to_mesh(falls_mesh)
bm_falls.free()
falls_obj = add_mesh_obj("Highland_3D_Waterfall", falls_mesh)
falls_obj.data.materials.append(mat_waterfall_foam)

# Dark wet rocks around waterfall splash zone
bm_wet = bmesh.new()
wet_spots = [
    (17.2, 28.5, 4.2, 1.5, 1.3, 1.1),
    (13.5, 27.5, 3.0, 1.6, 1.4, 1.2),
    (16.5, 26.0, 2.0, 1.8, 1.5, 1.1),
    (12.5, 25.0, 0.8, 1.6, 1.6, 0.9),
    (15.8, 24.0, 0.5, 2.0, 1.6, 0.8)
]
for wx, wy, wz, ww, wd, wh in wet_spots:
    bmesh.ops.create_cube(bm_wet, size=1.0,
        matrix=Matrix.Translation((wx, wy, wz)) @
               Matrix.Scale(ww, 4, (1,0,0)) @
               Matrix.Scale(wd, 4, (0,1,0)) @
               Matrix.Scale(wh, 4, (0,0,1)))

wet_mesh = bpy.data.meshes.new("Highland_Wet_Rocks_Mesh")
bm_wet.to_mesh(wet_mesh)
bm_wet.free()
wet_obj = add_mesh_obj("Highland_3D_Wet_Rocks", wet_mesh)
wet_obj.data.materials.append(mat_wet_rock)

# ------------------------------------------------------------------------------
# 12. Castle Fortress on Left Hill Ridge (Proudly Visible & Framed)
# ------------------------------------------------------------------------------
print(">>> Modeling Medieval Limestone Castle Fortress...")
cas_x, cas_y, cas_z = -13.0, 36.0, 5.8

bm_castle = bmesh.new()

# Main Great Keep
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x, cas_y, cas_z + 2.2)) @
           Matrix.Scale(4.2, 4, (1,0,0)) @
           Matrix.Scale(3.8, 4, (0,1,0)) @
           Matrix.Scale(4.8, 4, (0,0,1)))

# Keep crenellated parapet trim
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x, cas_y, cas_z + 4.8)) @
           Matrix.Scale(4.6, 4, (1,0,0)) @
           Matrix.Scale(4.2, 4, (0,1,0)) @
           Matrix.Scale(0.35, 4, (0,0,1)))

# Keep individual merlons along battlements
for mx in [-1.9, -0.6, 0.6, 1.9]:
    for my in [-1.8, 1.8]:
        bmesh.ops.create_cube(bm_castle, size=1.0,
            matrix=Matrix.Translation((cas_x + mx, cas_y + my, cas_z + 5.1)) @
                   Matrix.Scale(0.52, 4, (1,0,0)) @
                   Matrix.Scale(0.35, 4, (0,1,0)) @
                   Matrix.Scale(0.48, 4, (0,0,1)))

# 4 Corner Bastion Cylindrical Towers
tower_offsets = [(-2.2, -2.0), (2.2, -2.0), (-2.2, 2.0), (2.2, 2.0)]
for tox, toy in tower_offsets:
    bmesh.ops.create_cone(bm_castle, segments=14, radius1=1.15, radius2=1.15, depth=4.6,
        matrix=Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 2.0)))
    bmesh.ops.create_cone(bm_castle, segments=14, radius1=1.35, radius2=1.15, depth=0.40,
        matrix=Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 4.4)))

# Connecting Curtain Walls
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x, cas_y - 2.0, cas_z + 1.4)) @
           Matrix.Scale(4.0, 4, (1,0,0)) @
           Matrix.Scale(0.60, 4, (0,1,0)) @
           Matrix.Scale(3.0, 4, (0,0,1)))
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x - 2.2, cas_y, cas_z + 1.4)) @
           Matrix.Scale(0.60, 4, (1,0,0)) @
           Matrix.Scale(3.8, 4, (0,1,0)) @
           Matrix.Scale(3.0, 4, (0,0,1)))
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x + 2.2, cas_y, cas_z + 1.4)) @
           Matrix.Scale(0.60, 4, (1,0,0)) @
           Matrix.Scale(3.8, 4, (0,1,0)) @
           Matrix.Scale(3.0, 4, (0,0,1)))

# Outer bailey rampart wall extending downhill toward lake
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=Matrix.Translation((cas_x + 4.0, cas_y - 1.4, cas_z + 0.7)) @
           Matrix.Rotation(radians(-28), 4, 'Z') @
           Matrix.Scale(3.2, 4, (1,0,0)) @
           Matrix.Scale(0.55, 4, (0,1,0)) @
           Matrix.Scale(2.2, 4, (0,0,1)))

castle_mesh = bpy.data.meshes.new("Highland_Castle_Mesh")
bm_castle.to_mesh(castle_mesh)
bm_castle.free()
castle_obj = add_mesh_obj("Highland_3D_Castle", castle_mesh)
castle_obj.data.materials.append(mat_castle_stone)
for poly in castle_mesh.polygons: poly.use_smooth = True

# Castle Conical Turret Roofs (Slate Blue)
bm_roofs = bmesh.new()
# Keep central high roof turret
bmesh.ops.create_cone(bm_roofs, segments=14, radius1=1.9, radius2=0.04, depth=2.8,
    matrix=Matrix.Translation((cas_x, cas_y, cas_z + 6.3)))

# Corner tower conical roofs
for tox, toy in tower_offsets:
    bmesh.ops.create_cone(bm_roofs, segments=14, radius1=1.40, radius2=0.04, depth=2.1,
        matrix=Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 5.5)))

# Bailey outpost turret roof
bmesh.ops.create_cone(bm_roofs, segments=12, radius1=1.00, radius2=0.04, depth=1.6,
    matrix=Matrix.Translation((cas_x + 5.0, cas_y - 2.1, cas_z + 2.1)))

roofs_mesh = bpy.data.meshes.new("Highland_Roofs_Mesh")
bm_roofs.to_mesh(roofs_mesh)
bm_roofs.free()
roofs_obj = add_mesh_obj("Highland_3D_Castle_Roofs", roofs_mesh)
roofs_obj.data.materials.append(mat_castle_roof)

# Warm Glowing Castle Windows
bm_cwindows = bmesh.new()
win_coords = [
    (cas_x,       cas_y - 1.92, cas_z + 3.2),
    (cas_x - 1.0, cas_y - 1.92, cas_z + 3.2),
    (cas_x + 1.0, cas_y - 1.92, cas_z + 3.2),
    (cas_x,       cas_y - 1.92, cas_z + 1.8),
    (cas_x - 2.2, cas_y - 3.1,  cas_z + 3.0),
    (cas_x + 2.2, cas_y - 3.1,  cas_z + 3.0)
]
for wx, wy, wz in win_coords:
    bmesh.ops.create_cube(bm_cwindows, size=1.0,
        matrix=Matrix.Translation((wx, wy, wz)) @
               Matrix.Scale(0.25, 4, (1,0,0)) @
               Matrix.Scale(0.05, 4, (0,1,0)) @
               Matrix.Scale(0.50, 4, (0,0,1)))

cwin_mesh = bpy.data.meshes.new("Highland_Castle_Windows_Mesh")
bm_cwindows.to_mesh(cwin_mesh)
bm_cwindows.free()
cwin_obj = add_mesh_obj("Highland_3D_Castle_Windows", cwin_mesh)
cwin_obj.data.materials.append(mat_window_warm)

# ------------------------------------------------------------------------------
# 13. Trees & Foliage (Lush Deciduous Framing & Alpine Conifer Groves)
# ------------------------------------------------------------------------------
print(">>> Modeling Alpine Pine Groves & Deciduous Framing Foliage...")
bm_pines = bmesh.new()
bm_decid = bmesh.new()
bm_trunks = bmesh.new()

def add_pine(bm_p, bm_t, px, py, pz, scale=1.0):
    bmesh.ops.create_cone(bm_t, segments=6, radius1=0.25*scale, radius2=0.14*scale, depth=2.0*scale,
        matrix=Matrix.Translation((px, py, pz + 1.0*scale)))
    tiers = [(1.6, 1.65, 1.8), (2.6, 1.35, 1.6), (3.5, 1.05, 1.4), (4.3, 0.70, 1.2)]
    for tz, r, d in tiers:
        bmesh.ops.create_cone(bm_p, segments=8, radius1=r*scale, radius2=0.06*scale, depth=d*scale,
            matrix=Matrix.Translation((px, py, pz + tz*scale)))

def add_deciduous(bm_d, bm_t, px, py, pz, scale=1.0):
    bmesh.ops.create_cone(bm_t, segments=6, radius1=0.36*scale, radius2=0.20*scale, depth=2.2*scale,
        matrix=Matrix.Translation((px, py, pz + 1.1*scale)))
    canopy_blobs = [
        (0.0,  0.0, 2.8, 1.5),
        (0.8,  0.3, 3.0, 1.3),
        (-0.7, -0.3, 2.9, 1.2),
        (0.3,  0.5, 3.8, 1.1),
        (-0.4, 0.4, 3.7, 1.05)
    ]
    for bx, by, bz, br in canopy_blobs:
        bmesh.ops.create_uvsphere(bm_d, u_segments=8, v_segments=6, radius=br*scale,
            matrix=Matrix.Translation((px + bx*scale, py + by*scale, pz + bz*scale)))

# Prominent Left Foreground Framing Trees (Matching Concept Art on Left Bluff)
left_framing_trees = [
    (-17.5, 9.0,  2.0), (-19.5, 11.5, 2.3), (-15.5, 12.5, 1.8),
    (-22.0, 8.5,  2.5), (-18.5, 14.5, 1.9), (-22.5, 13.5, 2.4),
    (-14.5, 8.0,  1.6)
]
for tx, ty, tscale in left_framing_trees:
    tz = highland_elevation_360(tx, ty)
    add_deciduous(bm_decid, bm_trunks, tx, ty, tz, tscale)

# Left Valley Pocket Pines (between bridge and castle hill)
left_valley_trees = [
    (-13.0, 16.5, 1.5), (-15.0, 19.0, 1.6), (-11.5, 20.5, 1.4),
    (-16.5, 22.0, 1.7), (-13.5, 24.0, 1.5), (-10.5, 25.5, 1.4),
    (-18.0, 26.0, 1.8), (-16.0, 28.0, 1.6), (-18.5, 31.0, 1.7),
    (-20.5, 35.0, 1.9), (-17.5, 38.0, 1.7), (-14.0, 41.0, 1.5)
]
for px, py, pscale in left_valley_trees:
    pz = highland_elevation_360(px, py)
    add_pine(bm_pines, bm_trunks, px, py, pz, pscale)

# Low valley meadow grove near lake
valley_meadow_trees = [
    (-7.5, 16.5, 1.3), (-5.0, 18.5, 1.4), (-8.5, 19.5, 1.4),
    (-5.5, 21.5, 1.2), (-7.5, 22.8, 1.3)
]
for px, py, pscale in valley_meadow_trees:
    pz = highland_elevation_360(px, py)
    add_pine(bm_pines, bm_trunks, px, py, pz, pscale)

# Right Cliff & Background Upper Plateau Pines
right_cliff_trees = [
    (19.5, 24.0, 1.5), (22.0, 26.5, 1.6), (24.0, 29.0, 1.7),
    (19.0, 32.0, 1.6), (21.5, 34.5, 1.7), (24.5, 37.0, 1.8),
    (16.5, 36.0, 1.4), (19.5, 39.0, 1.5)
]
for px, py, pscale in right_cliff_trees:
    pz = highland_elevation_360(px, py)
    add_pine(bm_pines, bm_trunks, px, py, pz, pscale)

pines_mesh = bpy.data.meshes.new("Highland_Pines_Mesh")
bm_pines.to_mesh(pines_mesh)
bm_pines.free()
pines_obj = add_mesh_obj("Highland_3D_Pines", pines_mesh)
pines_obj.data.materials.append(mat_pine)

decid_mesh = bpy.data.meshes.new("Highland_Deciduous_Mesh")
bm_decid.to_mesh(decid_mesh)
bm_decid.free()
decid_obj = add_mesh_obj("Highland_3D_Deciduous", decid_mesh)
decid_obj.data.materials.append(mat_deciduous)
for poly in decid_mesh.polygons: poly.use_smooth = True

trunks_mesh = bpy.data.meshes.new("Highland_Trunks_Mesh")
bm_trunks.to_mesh(trunks_mesh)
bm_trunks.free()
trunks_obj = add_mesh_obj("Highland_3D_Trunks", trunks_mesh)
trunks_obj.data.materials.append(mat_tree_trunk)

# ------------------------------------------------------------------------------
# 14. Majestic Alpine Mountain Range & Hero Peak (Mount Dominant)
# ------------------------------------------------------------------------------
print(">>> Modeling Hero Peak (Mount Dominant) & 360-Degree Mountain Ridges...")
bm_mountains = bmesh.new()
bm_snow = bmesh.new()

# A. Mount Dominant (Center-Right Hero Peak: X = 14.0, Y = 62.0, Peak Z = 26.0)
# Main pyramid Matterhorn horn
bmesh.ops.create_cone(bm_mountains, segments=12, radius1=20.0, radius2=0.7, depth=26.0,
    matrix=Matrix.Translation((14.0, 62.0, 13.0)))
# Southwest spur ridge
bmesh.ops.create_cone(bm_mountains, segments=10, radius1=13.0, radius2=0.5, depth=19.0,
    matrix=Matrix.Translation((7.0, 56.0, 9.5)))
# Southeast spur ridge
bmesh.ops.create_cone(bm_mountains, segments=10, radius1=14.0, radius2=0.5, depth=21.0,
    matrix=Matrix.Translation((21.0, 63.0, 10.5)))

# Craggy rock facets & arêtes
facet_crags = [
    (11.8, 59.5, 15.0, 4.8, 2.8, 7.5, 25),
    (16.5, 60.5, 15.5, 5.0, 2.6, 7.8, -22),
    (13.6, 57.8, 11.0, 5.5, 3.0, 6.8, 10),
    (8.5,  55.5, 10.5, 4.5, 2.4, 6.2, 30),
    (18.8, 61.2, 12.2, 5.0, 2.8, 7.2, -18)
]
for cx, cy, cz, cw, cd, ch, rot in facet_crags:
    bmesh.ops.create_cube(bm_mountains, size=1.0,
        matrix=Matrix.Translation((cx, cy, cz)) @
               Matrix.Rotation(radians(rot), 4, 'Z') @
               Matrix.Rotation(radians(20), 4, 'X') @
               Matrix.Scale(cw, 4, (1,0,0)) @
               Matrix.Scale(cd, 4, (0,1,0)) @
               Matrix.Scale(ch, 4, (0,0,1)))

# Mount Dominant Dedicated Radiant Snow Cap & Snow Couloirs
bmesh.ops.create_cone(bm_snow, segments=12, radius1=7.8, radius2=0.05, depth=6.8,
    matrix=Matrix.Translation((14.0, 62.0, 22.5)))

# Snow couloir running down southwest face
bmesh.ops.create_cube(bm_snow, size=1.0,
    matrix=Matrix.Translation((11.5, 59.2, 16.5)) @
           Matrix.Rotation(radians(38), 4, 'Y') @
           Matrix.Rotation(radians(-25), 4, 'Z') @
           Matrix.Scale(1.8, 4, (1,0,0)) @
           Matrix.Scale(0.65, 4, (0,1,0)) @
           Matrix.Scale(6.8, 4, (0,0,1)))

# Snow couloir running down southeast face
bmesh.ops.create_cube(bm_snow, size=1.0,
    matrix=Matrix.Translation((16.8, 61.0, 17.0)) @
           Matrix.Rotation(radians(-35), 4, 'Y') @
           Matrix.Rotation(radians(20), 4, 'Z') @
           Matrix.Scale(2.0, 4, (1,0,0)) @
           Matrix.Scale(0.65, 4, (0,1,0)) @
           Matrix.Scale(7.0, 4, (0,0,1)))

# Secondary spur snow caps
bmesh.ops.create_cone(bm_snow, segments=10, radius1=4.6, radius2=0.04, depth=4.4,
    matrix=Matrix.Translation((7.0, 56.0, 16.8)))
bmesh.ops.create_cone(bm_snow, segments=10, radius1=5.2, radius2=0.04, depth=4.6,
    matrix=Matrix.Translation((21.0, 63.0, 18.5)))

# B. 360-Degree Panoramic Outer Mountain Ridge Ring
bm_dist_mtns = bmesh.new()

# North background ridges (Y > 0)
north_ridges = [
    (-23.0, 68.0, 11.0, 17.0, 20.0, 5.5),   # Behind Castle
    (-40.0, 70.0, 9.5,  18.0, 18.0, 4.5),   # Far-Left North
    (34.0,  68.0, 11.0, 16.0, 19.0, 4.8),   # Far-Right North
    (-3.0,  74.0, 8.5,  15.0, 16.0, 3.8),   # North Gap Horizon
]
for rx, ry, rz, rw, rh, srad in north_ridges:
    bmesh.ops.create_cone(bm_dist_mtns, segments=10, radius1=rw, radius2=0.8, depth=rh,
        matrix=Matrix.Translation((rx, ry, rz)))
    bmesh.ops.create_cone(bm_snow, segments=10, radius1=srad, radius2=0.04, depth=srad * 0.8,
        matrix=Matrix.Translation((rx, ry, rz + rh * 0.4)))

# East, South and West 360-degree enclosing mountain ridges
surround_ridges = [
    (70.0,   25.0, 9.0, 18.0, 17.0),   # East Ridge
    (65.0,  -30.0, 8.5, 17.0, 16.0),   # South-East Ridge
    (0.0,   -70.0, 10.0, 20.0, 19.0),  # South Ridge (Behind camera)
    (-65.0, -30.0, 8.5, 17.0, 16.0),   # South-West Ridge
    (-70.0,  25.0, 9.5, 18.0, 18.0),   # West Ridge
]
for sx, sy, sz, sw, sh in surround_ridges:
    bmesh.ops.create_cone(bm_dist_mtns, segments=10, radius1=sw, radius2=0.8, depth=sh,
        matrix=Matrix.Translation((sx, sy, sz)))

mountains_mesh = bpy.data.meshes.new("Highland_Mountains_Mesh")
bm_mountains.to_mesh(mountains_mesh)
bm_mountains.free()
mountains_obj = add_mesh_obj("Highland_3D_Mountains", mountains_mesh)
mountains_obj.data.materials.append(mat_mtn_rock)

dist_mtns_mesh = bpy.data.meshes.new("Highland_Distant_Mtns_Mesh")
bm_dist_mtns.to_mesh(dist_mtns_mesh)
bm_dist_mtns.free()
dist_mtns_obj = add_mesh_obj("Highland_3D_Distant_Mtns", dist_mtns_mesh)
dist_mtns_obj.data.materials.append(mat_distant_mtn)

snow_mesh = bpy.data.meshes.new("Highland_Snow_Peaks_Mesh")
bm_snow.to_mesh(snow_mesh)
bm_snow.free()
snow_obj = add_mesh_obj("Highland_3D_Snow_Peaks", snow_mesh)
snow_obj.data.materials.append(mat_mtn_snow)

# ------------------------------------------------------------------------------
# 15. 3D Wispy Alpine Mist & Mountain Cloud Bands
# ------------------------------------------------------------------------------
print(">>> Modeling 3D Wispy Alpine Mist Bands...")
bm_mist = bmesh.new()
mist_ribbons = [
    (11.0, 58.0, 9.5,  15.0, 3.8, 1.2),
    (19.0, 61.0, 10.5, 13.0, 4.0, 1.0),
    (4.5,  55.0, 9.0,  11.0, 3.4, 0.9),
    (-10.0, 60.0, 8.5, 13.0, 3.6, 1.0),
    (-22.0, 62.0, 8.0, 12.0, 3.8, 0.9)
]
for mx, my, mz, mw, md, mh in mist_ribbons:
    bmesh.ops.create_uvsphere(bm_mist, u_segments=12, v_segments=8, radius=1.0,
        matrix=Matrix.Translation((mx, my, mz)) @
               Matrix.Scale(mw * 0.5, 4, (1,0,0)) @
               Matrix.Scale(md * 0.5, 4, (0,1,0)) @
               Matrix.Scale(mh * 0.5, 4, (0,0,1)))

mist_mesh = bpy.data.meshes.new("Highland_Mist_Mesh")
bm_mist.to_mesh(mist_mesh)
bm_mist.free()
mist_obj = add_mesh_obj("Highland_3D_Mist", mist_mesh)
mist_obj.data.materials.append(mat_mist)
for poly in mist_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 16. 3D Billowing Cumulus Sky Clouds
# ------------------------------------------------------------------------------
print(">>> Modeling 3D Billowing Cumulus Sky Clouds...")
bm_clouds = bmesh.new()

def add_cumulus_cloud(bm, cx, cy, cz, scale=1.0):
    blobs = [
        (0.0,  0.0, 0.0, 3.6),
        (2.8,  0.0, -0.3, 2.9),
        (-2.6, 0.0, -0.2, 2.7),
        (1.4,  0.0, 1.5, 2.4),
        (-1.3, 0.0, 1.4, 2.3),
        (4.4,  0.0, -0.8, 2.0),
        (-4.0, 0.0, -0.7, 1.9)
    ]
    for bx, by, bz, br in blobs:
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=10, radius=br * scale,
            matrix=Matrix.Translation((cx + bx * scale, cy + by * scale, cz + bz * scale)))

add_cumulus_cloud(bm_clouds, -22.0, 56.0, 22.0, 1.40)
add_cumulus_cloud(bm_clouds,  -4.0, 58.0, 23.5, 1.50)
add_cumulus_cloud(bm_clouds,  16.0, 58.0, 24.5, 1.45)
add_cumulus_cloud(bm_clouds,  32.0, 57.0, 22.5, 1.35)
add_cumulus_cloud(bm_clouds, -36.0, 60.0, 20.5, 1.30)

clouds_mesh = bpy.data.meshes.new("Highland_Clouds_Mesh")
bm_clouds.to_mesh(clouds_mesh)
bm_clouds.free()
clouds_obj = add_mesh_obj("Highland_3D_Clouds", clouds_mesh)
clouds_obj.data.materials.append(mat_cloud)
for poly in clouds_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 17. 3D Procedural Gradient Sky Dome (Full 360 Enclosure, Non-Shadow-Casting)
# ------------------------------------------------------------------------------
print(">>> Building 360-Degree Gradient Sky Dome...")
bpy.ops.mesh.primitive_uv_sphere_add(radius=120.0, location=(0.0, 0.0, 0.0), segments=40, ring_count=28)
sky_dome = bpy.context.active_object
sky_dome.name = "Highland_3D_Sky_Dome"

if hasattr(sky_dome, 'visible_shadow'):
    sky_dome.visible_shadow = False

mat_sky_gradient = bpy.data.materials.new("Mat_Sky_Gradient")
mat_sky_gradient.use_nodes = True
s_nodes = mat_sky_gradient.node_tree.nodes
s_links = mat_sky_gradient.node_tree.links
s_nodes.clear()

s_out  = s_nodes.new('ShaderNodeOutputMaterial')
s_bsdf = s_nodes.new('ShaderNodeBsdfPrincipled')
s_bsdf.inputs['Roughness'].default_value = 1.0
s_geom = s_nodes.new('ShaderNodeNewGeometry')
s_sep  = s_nodes.new('ShaderNodeSeparateXYZ')
s_ramp = s_nodes.new('ShaderNodeValToRGB')
s_ramp.color_ramp.interpolation = 'EASE'
s_ramp.color_ramp.elements[0].position = 0.0
s_ramp.color_ramp.elements[0].color = (0.55, 0.82, 0.98, 1.0) # Warm horizon cyan-white
s_ramp.color_ramp.elements.new(0.35)
s_ramp.color_ramp.elements[1].position = 0.35
s_ramp.color_ramp.elements[1].color = (0.22, 0.55, 0.92, 1.0) # Radiant anime sky blue
s_ramp.color_ramp.elements[2].position = 1.0
s_ramp.color_ramp.elements[2].color = (0.08, 0.28, 0.78, 1.0) # Zenith deep saturated cerulean

s_map = s_nodes.new('ShaderNodeMapRange')
s_map.inputs['From Min'].default_value = -5.0
s_map.inputs['From Max'].default_value = 110.0
s_map.inputs['To Min'].default_value = 0.0
s_map.inputs['To Max'].default_value = 1.0

s_links.new(s_geom.outputs['Position'], s_sep.inputs['Vector'])
s_links.new(s_sep.outputs['Z'], s_map.inputs['Value'])
s_links.new(s_map.outputs['Result'], s_ramp.inputs['Factor'])
s_links.new(s_ramp.outputs['Color'], s_bsdf.inputs['Base Color'])
if 'Emission Color' in s_bsdf.inputs:
    s_links.new(s_ramp.outputs['Color'], s_bsdf.inputs['Emission Color'])
    s_bsdf.inputs['Emission Strength'].default_value = 1.0
elif 'Emission' in s_bsdf.inputs:
    s_links.new(s_ramp.outputs['Color'], s_bsdf.inputs['Emission'])
s_links.new(s_bsdf.outputs['BSDF'], s_out.inputs['Surface'])

sky_dome.data.materials.append(mat_sky_gradient)
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

# ------------------------------------------------------------------------------
# 18. Multi-Angle 5-Camera Verification Rig
# ------------------------------------------------------------------------------
print(">>> Constructing 5-Camera Verification Rig...")

cameras_data = [
    {
        "name": "Highland_Cam_Front",
        "lens": 38.0,
        "loc": (0.0, -18.0, 3.4),
        "rot": (radians(83.5), 0, 0),
        "file": "highland_sanctuary_render_front.png",
        "desc": "Front Combat View (16:9, Platform Ratio: 0.72)"
    },
    {
        "name": "Highland_Cam_Left_Profile",
        "lens": 35.0,
        "loc": (-18.0, 0.0, 3.4),
        "rot": (radians(78.0), 0, radians(-90.0)),
        "file": "highland_sanctuary_render_left_profile.png",
        "desc": "Left Flank Profile View (Deck Traverse)"
    },
    {
        "name": "Highland_Cam_Isometric_Aerial",
        "lens": 32.0,
        "loc": (-22.0, -22.0, 16.0),
        "rot": (radians(62.0), 0, radians(-45.0)),
        "file": "highland_sanctuary_render_isometric_aerial.png",
        "desc": "Elevated 3/4 Isometric Aerial Overview"
    },
    {
        "name": "Highland_Cam_Right_Perspective",
        "lens": 35.0,
        "loc": (18.0, -16.0, 5.0),
        "rot": (radians(80.0), 0, radians(42.0)),
        "file": "highland_sanctuary_render_right_perspective.png",
        "desc": "Right Perspective View (Waterfall & Lake Angle)"
    },
    {
        "name": "Highland_Cam_Low_Angle_Hero",
        "lens": 28.0,
        "loc": (0.0, -11.0, 0.6),
        "rot": (radians(95.0), 0, 0),
        "file": "highland_sanctuary_render_low_angle.png",
        "desc": "Low-Angle Dramatic Hero View (Peaks & Sky)"
    }
]

created_cameras = []
for c_info in cameras_data:
    cdata = bpy.data.cameras.new(c_info["name"])
    cdata.lens = c_info["lens"]
    cdata.clip_start = 0.1
    cdata.clip_end = 600.0
    cobj = bpy.data.objects.new(c_info["name"], cdata)
    cobj.location = c_info["loc"]
    cobj.rotation_euler = c_info["rot"]
    bpy.context.collection.objects.link(cobj)
    created_cameras.append((cobj, c_info))

# ------------------------------------------------------------------------------
# 19. Radiant Daylight Sun & Calibrated Anime Lighting Rig
# ------------------------------------------------------------------------------
print(">>> Calibrating Radiant Anime Daylight Lighting Rig...")
def add_light(name, ltype, energy, color, loc, rot=(0,0,0), size=None):
    ldata = bpy.data.lights.new(name=name, type=ltype)
    ldata.energy = energy
    ldata.color = color
    if size and hasattr(ldata, 'size'): ldata.size = size
    obj = bpy.data.objects.new(name, ldata)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    return obj

# Primary warm sun light casting anime directional highlights
add_light("Sun_Alpine_Daylight", 'SUN', 3.6, (1.00, 0.96, 0.88), (20.0, -10.0, 42.0), (radians(48), radians(-12), radians(-32)))

# Soft sky ambient fill
add_light("Sky_Ambient_Fill", 'AREA', 32, (0.55, 0.78, 1.00), (0.0, 18.0, 24.0), (radians(25), 0, 0), size=28.0)

# Front combat duel fill light for characters on platform
add_light("Front_Duel_Fill", 'AREA', 28, (1.00, 0.95, 0.88), (0.0, -10.0, 3.6), (radians(75), 0, 0), size=18.0)

# Bridge front wall fill light (reveals warm stone masonry relief & moss)
add_light("Bridge_Wall_Fill", 'AREA', 38, (0.96, 0.92, 0.84), (0.0, -8.0, -1.0), (radians(80), 0, 0), size=22.0)

# Castle accent fill light
add_light("Castle_Accent_Fill", 'AREA', 24, (1.00, 0.96, 0.90), (-13.0, 28.0, 8.5), (radians(35), radians(-15), 0), size=12.0)

# Waterfall sparkling rim light
add_light("Waterfall_Rim_Light", 'AREA', 26, (0.85, 0.95, 1.00), (14.5, 21.0, 6.5), (radians(40), radians(15), 0), size=9.0)

# Soft point lights for balustrade golden runes
for rx in [-10.8, -6.8, -2.4, 2.4, 6.8, 10.8]:
    add_light(f"Rune_Glow_{rx}", 'POINT', 16, (1.00, 0.80, 0.18), (rx, 2.1, 0.55))

# ------------------------------------------------------------------------------
# 20. Execute Multi-Angle Rendering & Save
# ------------------------------------------------------------------------------
print(">>> Rendering Multi-Angle Camera Suite...")

for cobj, c_info in created_cameras:
    scene.camera = cobj
    r_path = os.path.join(out_dir, c_info["file"])
    scene.render.filepath = r_path
    print(f"    -> Rendering {c_info['desc']} to {c_info['file']}...")
    bpy.ops.render.render(write_still=True)

# Also update master KeyFury_3D_HighlandSanctuary_Render.png for web / game engine
scene.camera = created_cameras[0][0]
main_render_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_Render.png")
scene.render.filepath = main_render_path
bpy.ops.render.render(write_still=True)

# Save Master .blend Files
blend_path_pure = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_PureGeometry.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path_pure, compress=False)
print(f">>> [Highland Sanctuary 100% 3D] Saved PureGeometry Blend: {blend_path_pure}")

blend_path_main = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path_main, compress=False)
print(f">>> [Highland Sanctuary 100% 3D] Saved Main Blend: {blend_path_main}")

# Export 100% Pure Procedural 3D Polygonal Geometry to GLB
import shutil

glb_out_test = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.glb")
print(f">>> [Highland Sanctuary 100% 3D] Exporting GLB to: {glb_out_test}...")
bpy.ops.export_scene.gltf(
    filepath=glb_out_test,
    export_format='GLB',
    export_cameras=True,
    export_lights=True,
    export_apply=True
)
print(f">>> [Highland Sanctuary 100% 3D] Exported GLB successfully! Size: {os.path.getsize(glb_out_test)} bytes")

# Copy GLB to web public directories
web_glb_targets = [
    r"d:\Keyboard stickman warrior\apps\web\public\assets\3d\KeyFury_3D_HighlandSanctuary.glb",
    r"d:\Keyboard stickman warrior\apps\web\public\assets\3d\KeyFury_3D_HighlandSanctuary_True3D.glb",
    r"d:\Keyboard stickman warrior\apps\web\public\3d\KeyFury_3D_HighlandSanctuary.glb",
]
for t in web_glb_targets:
    os.makedirs(os.path.dirname(t), exist_ok=True)
    shutil.copyfile(glb_out_test, t)
    print(f">>> Copied GLB to web asset: {t} ({os.path.getsize(t)} bytes)")

# Copy main render to arena select preview
web_preview_target = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\highland_sanctuary.jpg"
if os.path.exists(main_render_path):
    shutil.copyfile(main_render_path, web_preview_target)
    print(f">>> Copied preview render to: {web_preview_target}")

print(f">>> [Highland Sanctuary 100% 3D] All 5 Renders, Blends, and GLBs Saved Successfully!")

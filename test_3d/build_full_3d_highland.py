"""
KeyFury 3D: Highland Sanctuary (100% Pure 3D Production Environment)
Masterpiece Procedural & Geometric 3D Stage in Blender 5.2.1 LTS
- Walkway Platform Grounded at Z = 0.0 (Platform Ratio: 0.72)
- Zero 2D flat backdrop textures: 100% geometric 3D meshes
- Multi-course weathered stone masonry with individual blocks, bevels, buttress piers & corbels
- Dedicated 3D Runes mesh with glowing golden ancient glyphs (chevrons, sigils, letterforms)
- Dedicated 3D Moss & Hanging Vines mesh creeping over flagstones, coping, and buttresses
- Contoured highland valley with rolling emerald hills, rock cliffs, and winding mountain trail
- Medieval limestone castle fortress with keep, cylindrical bastion towers, battlements & warm windows
- Sprawling alpine lake with golden sandy shoreline beach, shallow turquoise fringe, and S-curve river
- Cascading multi-tier foaming waterfall spilling over craggy cliff ledges into the river basin
- Clustered alpine pine groves and lush deciduous framing trees
- Mount Dominant (hero peak at Z = 13.8m) with craggy rock facets, snow couloirs & radiant snow cap
- Flanking distant atmospheric mountain ridges and floating wispy alpine mist bands
- 3D billowing cumulus sky clouds and radiant azure sky dome
- Standard View Transform with calibrated warm golden sunlight and rich anime daylight colors
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos, sqrt
import os

print(">>> [Highland Sanctuary 100% 3D] Building Production Masterpiece...")

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

world = scene.world
if not world:
    world = bpy.data.worlds.new("Highland_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.45, 0.70, 0.95, 1.0)
    bg_node.inputs['Strength'].default_value = 0.50

out_dir = r"d:\Keyboard stickman warrior\test_3d"

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
    emit = nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

def make_water_shader(name, base_color=(0.08, 0.46, 0.76, 1.0), roughness=0.03, specular=0.95):
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

# Warm Weathered Stone & Terrace Materials
mat_flagstone_main = make_shader("Mat_Flagstone_Main", (0.66, 0.62, 0.54, 1.0), roughness=0.60)
mat_stone_wall     = make_shader("Mat_Stone_Wall",     (0.56, 0.52, 0.45, 1.0), roughness=0.70)
mat_stone_dark     = make_shader("Mat_Stone_Dark",     (0.40, 0.36, 0.30, 1.0), roughness=0.80)
mat_stone_trim     = make_shader("Mat_Stone_Trim",     (0.70, 0.66, 0.58, 1.0), roughness=0.52)

# Magic & Emissive Details
mat_rune_gold      = make_emissive("Mat_Rune_Gold",    (1.00, 0.84, 0.22, 1.0), strength=2.5)
mat_waterfall_foam = make_emissive("Mat_Waterfall_Foam", (0.95, 0.98, 1.00, 1.0), strength=2.4)
mat_window_warm    = make_emissive("Mat_Window_Warm",  (1.00, 0.84, 0.42, 1.0), strength=2.8)
mat_mtn_snow       = make_emissive("Mat_Mtn_Snow",     (0.98, 0.99, 1.00, 1.0), strength=1.35)
mat_cloud          = make_emissive("Mat_Cloud",        (0.97, 0.98, 1.00, 1.0), strength=1.15)
mat_mist           = make_emissive("Mat_Mist",         (0.92, 0.95, 0.98, 1.0), strength=0.95)
mat_sky_zenith     = make_emissive("Mat_Sky_Zenith",   (0.22, 0.52, 0.94, 1.0), strength=1.00)

# Nature & Environment Materials (Lush Anime Greens & Clean Turquoises)
mat_moss           = make_shader("Mat_Moss",           (0.28, 0.56, 0.12, 1.0), roughness=0.85)
mat_grass_highland = make_shader("Mat_Grass_Highland", (0.30, 0.64, 0.15, 1.0), roughness=0.68)
mat_grass_sunny    = make_shader("Mat_Grass_Sunny",    (0.42, 0.72, 0.18, 1.0), roughness=0.64)
mat_cliff_rock     = make_shader("Mat_Cliff_Rock",     (0.52, 0.48, 0.42, 1.0), roughness=0.80)
mat_wet_rock       = make_shader("Mat_Wet_Rock",       (0.20, 0.22, 0.25, 1.0), roughness=0.20, specular=0.85)
mat_alpine_water   = make_water_shader("Mat_Alpine_Water", (0.08, 0.46, 0.76, 1.0))
mat_shoreline_sand = make_shader("Mat_Shoreline_Sand", (0.76, 0.70, 0.54, 1.0), roughness=0.85)
mat_road           = make_shader("Mat_Road",           (0.74, 0.66, 0.52, 1.0), roughness=0.88)
mat_pine           = make_shader("Mat_Pine",           (0.08, 0.28, 0.12, 1.0), roughness=0.85)
mat_deciduous      = make_shader("Mat_Deciduous",      (0.26, 0.58, 0.14, 1.0), roughness=0.66)
mat_tree_trunk     = make_shader("Mat_Tree_Trunk",     (0.26, 0.18, 0.12, 1.0), roughness=0.88)

# Architecture & Mountain Materials
mat_castle_stone   = make_shader("Mat_Castle_Stone",   (0.84, 0.82, 0.78, 1.0), roughness=0.58)
mat_castle_roof    = make_shader("Mat_Castle_Roof",    (0.26, 0.32, 0.42, 1.0), roughness=0.52)
mat_mtn_rock       = make_shader("Mat_Mtn_Rock",       (0.44, 0.48, 0.56, 1.0), roughness=0.80)
mat_distant_mtn    = make_shader("Mat_Distant_Mtn",    (0.38, 0.48, 0.64, 1.0), roughness=0.78)

def add_mesh_obj(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

# ------------------------------------------------------------------------------
# 4. Foreground Ancient Stone Bridge Platform (Z = 0.0 Grounded)
# ------------------------------------------------------------------------------
# A. Main Structural Deck & Flagstone Walkway Floor
bm_deck = bmesh.new()
bmesh.ops.create_cube(bm_deck, size=1.0,
    matrix=mathutils.Matrix.Translation((0, 0, -0.30)) @
           mathutils.Matrix.Scale(23.0, 4, (1,0,0)) @
           mathutils.Matrix.Scale(4.6, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.60, 4, (0,0,1)))

# Paving flagstone slabs on surface (Z = 0.0) with varied widths and offsets
for row in range(6):
    py = -1.82 + row * 0.73
    stagger = 0.65 if (row % 2 == 1) else 0.0
    for col in range(16):
        px = -11.0 + col * 1.45 + stagger
        if px > 11.2 or px < -11.2: continue
        pw = 1.38 + (sin(col * 3.7 + row) * 0.05)
        pd = 0.67 + (cos(col * 2.1 + row * 1.3) * 0.04)
        ph = 0.022 + (sin(col * 1.5 + row * 2.2) * 0.005)
        bmesh.ops.create_cube(bm_deck, size=1.0,
            matrix=mathutils.Matrix.Translation((px, py, ph * 0.5)) @
                   mathutils.Matrix.Scale(pw, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(pd, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(ph, 4, (0,0,1)))

deck_mesh = bpy.data.meshes.new("Highland_Deck_Mesh")
bm_deck.to_mesh(deck_mesh)
bm_deck.free()
deck_obj = add_mesh_obj("Highland_3D_Deck", deck_mesh)
deck_obj.data.materials.append(mat_flagstone_main)

# B. Front Multi-Tier Weathered Stone Masonry Wall (Courses of individual blocks)
bm_wall = bmesh.new()

courses = [
    (-0.30, 0.50, 14, 0.0),
    (-0.85, 0.60, 13, 0.75),
    (-1.50, 0.70, 15, 0.35),
    (-2.25, 0.80, 12, 0.85),
]
for cz, ch, num_blocks, c_stagger in courses:
    bw = 22.8 / num_blocks
    for b_idx in range(num_blocks):
        bx = -11.4 + b_idx * bw + (bw * 0.5) + c_stagger * 0.2
        if bx > 11.4 or bx < -11.4: continue
        depth_offset = sin(b_idx * 2.3 + cz) * 0.025
        bmesh.ops.create_cube(bm_wall, size=1.0,
            matrix=mathutils.Matrix.Translation((bx, -2.32 + depth_offset, cz)) @
                   mathutils.Matrix.Scale(bw * 0.96, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.38, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(ch * 0.94, 4, (0,0,1)))

bmesh.ops.create_cube(bm_wall, size=1.0,
    matrix=mathutils.Matrix.Translation((0, -2.25, -4.5)) @
           mathutils.Matrix.Scale(23.2, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.8, 4, (0,1,0)) @
           mathutils.Matrix.Scale(3.8, 4, (0,0,1)))

wall_mesh = bpy.data.meshes.new("Highland_Wall_Mesh")
bm_wall.to_mesh(wall_mesh)
bm_wall.free()
wall_obj = add_mesh_obj("Highland_3D_Wall", wall_mesh)
wall_obj.data.materials.append(mat_stone_wall)

# C. Stone Buttress Piers, Corbels, Trim Coping & Balustrades
bm_trim = bmesh.new()

# Top coping trim cantilever overhang under walkway edge
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=mathutils.Matrix.Translation((0, -2.36, -0.05)) @
           mathutils.Matrix.Scale(23.2, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.24, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.12, 4, (0,0,1)))

# Stone corbels / brackets supporting the overhang
for cb_x in range(-11, 12, 2):
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((cb_x * 0.95, -2.42, -0.16)) @
               mathutils.Matrix.Scale(0.35, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.26, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.18, 4, (0,0,1)))

# Front Parapet curb wall
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=mathutils.Matrix.Translation((0, -2.26, 0.16)) @
           mathutils.Matrix.Scale(22.6, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.30, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.32, 4, (0,0,1)))

buttress_xs = [-8.8, -5.2, -1.8, 1.8, 5.2, 8.8]
for bx in buttress_xs:
    # Buttress base plinth
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.52, -2.4)) @
               mathutils.Matrix.Scale(1.10, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.45, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.50, 4, (0,0,1)))
    # Buttress main shaft
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.50, -1.15)) @
               mathutils.Matrix.Scale(0.96, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.40, 4, (0,1,0)) @
               mathutils.Matrix.Scale(2.10, 4, (0,0,1)))
    # Stepped moulded capital cap
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.48, 0.05)) @
               mathutils.Matrix.Scale(1.08, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.44, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.24, 4, (0,0,1)))
    # Front parapet post extension
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.36, 0.28)) @
               mathutils.Matrix.Scale(0.82, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.42, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.28, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.36, 0.44)) @
               mathutils.Matrix.Scale(0.92, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.46, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.08, 4, (0,0,1)))

# Rear Stone Balustrade Rail & Pillars
rear_y = 2.18
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=mathutils.Matrix.Translation((0, rear_y, 0.18)) @
           mathutils.Matrix.Scale(22.6, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.30, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.36, 4, (0,0,1)))
bmesh.ops.create_cube(bm_trim, size=1.0,
    matrix=mathutils.Matrix.Translation((0, rear_y, 0.38)) @
           mathutils.Matrix.Scale(22.8, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.36, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.08, 4, (0,0,1)))

# Rear Ornate Stone Pillars with Stepped Caps
pillar_xs = [-9.2, -5.5, -1.8, 1.8, 5.5, 9.2]
for px in pillar_xs:
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((px, rear_y, 0.22)) @
               mathutils.Matrix.Scale(0.88, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.46, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.44, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((px, rear_y, 0.52)) @
               mathutils.Matrix.Scale(0.78, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.42, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.32, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((px, rear_y, 0.70)) @
               mathutils.Matrix.Scale(0.92, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.48, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.08, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_trim, size=1.0,
        matrix=mathutils.Matrix.Translation((px, rear_y, 0.76)) @
               mathutils.Matrix.Scale(0.70, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.38, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,0,1)))

# Recessed dark panels in rear pillars and front buttresses
bm_dark = bmesh.new()
for px in pillar_xs:
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=mathutils.Matrix.Translation((px, rear_y - 0.18, 0.50)) @
               mathutils.Matrix.Scale(0.52, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.24, 4, (0,0,1)))

for bx in buttress_xs:
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.68, -1.15)) @
               mathutils.Matrix.Scale(0.64, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,1,0)) @
               mathutils.Matrix.Scale(1.80, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_dark, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, -2.55, 0.28)) @
               mathutils.Matrix.Scale(0.54, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.22, 4, (0,0,1)))

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
bm_runes = bmesh.new()

def add_runic_sigil(bm, cx, cy, cz, size=0.20, glyph_type=0):
    """Generates authentic geometric rune shapes like <, >, |, X, +, ^"""
    g = glyph_type % 6
    if g == 0:  # Diamond / Sigil shape
        for ang in [radians(45), radians(-45)]:
            bmesh.ops.create_cube(bm, size=1.0,
                matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                       mathutils.Matrix.Rotation(ang, 4, 'Y') @
                       mathutils.Matrix.Scale(0.03, 4, (1,0,0)) @
                       mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                       mathutils.Matrix.Scale(size, 4, (0,0,1)))
    elif g == 1: # Vertical bar with chevron (< |)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                   mathutils.Matrix.Scale(0.04, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx - 0.05, cy, cz + 0.03)) @
                   mathutils.Matrix.Rotation(radians(35), 4, 'Y') @
                   mathutils.Matrix.Scale(0.03, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size * 0.6, 4, (0,0,1)))
    elif g == 2: # Chevron (>)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz + 0.04)) @
                   mathutils.Matrix.Rotation(radians(40), 4, 'Y') @
                   mathutils.Matrix.Scale(0.035, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size * 0.55, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz - 0.04)) @
                   mathutils.Matrix.Rotation(radians(-40), 4, 'Y') @
                   mathutils.Matrix.Scale(0.035, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size * 0.55, 4, (0,0,1)))
    elif g == 3: # Cross / Star (X)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                   mathutils.Matrix.Rotation(radians(45), 4, 'Y') @
                   mathutils.Matrix.Scale(0.03, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                   mathutils.Matrix.Rotation(radians(-45), 4, 'Y') @
                   mathutils.Matrix.Scale(0.03, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size, 4, (0,0,1)))
    elif g == 4: # Arrowhead / Rune (^)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx - 0.04, cy, cz)) @
                   mathutils.Matrix.Rotation(radians(30), 4, 'Y') @
                   mathutils.Matrix.Scale(0.035, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size * 0.7, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx + 0.04, cy, cz)) @
                   mathutils.Matrix.Rotation(radians(-30), 4, 'Y') @
                   mathutils.Matrix.Scale(0.035, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size * 0.7, 4, (0,0,1)))
    else: # Ancient glyph (vertical bar with crosses)
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                   mathutils.Matrix.Scale(0.04, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(size, 4, (0,0,1)))
        bmesh.ops.create_cube(bm, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                   mathutils.Matrix.Scale(size * 0.7, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(0.035, 4, (0,0,1)))

# Buttress pier carved ancient runes (3 vertical authentic sigils in each pier panel)
for b_i, bx in enumerate(buttress_xs):
    add_runic_sigil(bm_runes, bx, -2.71, -0.65, size=0.22, glyph_type=b_i)
    add_runic_sigil(bm_runes, bx, -2.71, -1.15, size=0.24, glyph_type=b_i + 1)
    add_runic_sigil(bm_runes, bx, -2.71, -1.65, size=0.22, glyph_type=b_i + 2)
    # Parapet post glyph
    add_runic_sigil(bm_runes, bx, -2.58, 0.28, size=0.18, glyph_type=b_i + 3)

# Rear balustrade pillar carved runes
for p_i, px in enumerate(pillar_xs):
    add_runic_sigil(bm_runes, px, rear_y - 0.20, 0.50, size=0.20, glyph_type=p_i + 4)

# Walkway floor runic border inlays (segmented ancient glyphs)
for col in range(28):
    gx = -10.5 + col * 0.76
    gw = 0.45 + (sin(col * 2.3) * 0.12)
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=mathutils.Matrix.Translation((gx, -2.04, 0.024)) @
               mathutils.Matrix.Scale(gw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.012, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=mathutils.Matrix.Translation((gx, 1.98, 0.024)) @
               mathutils.Matrix.Scale(gw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.012, 4, (0,0,1)))

# Center decorative floor rune circle & markings
segments = 24
for s in range(segments):
    ang = 2.0 * math.pi * s / segments
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=mathutils.Matrix.Translation((cos(ang) * 2.2, sin(ang) * 1.1, 0.024)) @
               mathutils.Matrix.Rotation(ang, 4, 'Z') @
               mathutils.Matrix.Scale(0.24, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.012, 4, (0,0,1)))

# Front parapet horizontal rune frieze glyphs
for fx in [-7.2, -6.4, -3.8, -3.0, -0.5, 0.5, 3.0, 3.8, 6.4, 7.2]:
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=mathutils.Matrix.Translation((fx, -2.42, 0.16)) @
               mathutils.Matrix.Scale(0.48, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.07, 4, (0,0,1)))

# Rear railing carved runes
for rx in [-7.5, -6.8, -4.0, -3.3, -0.4, 0.4, 3.3, 4.0, 6.8, 7.5]:
    bmesh.ops.create_cube(bm_runes, size=1.0,
        matrix=mathutils.Matrix.Translation((rx, rear_y - 0.16, 0.24)) @
               mathutils.Matrix.Scale(0.40, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.02, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.08, 4, (0,0,1)))

runes_mesh = bpy.data.meshes.new("Highland_Runes_Mesh")
bm_runes.to_mesh(runes_mesh)
bm_runes.free()
runes_obj = add_mesh_obj("Highland_3D_Runes", runes_mesh)
runes_obj.data.materials.append(mat_rune_gold)

# ------------------------------------------------------------------------------
# 6. Dedicated 3D Moss & Creeping Foliage Mesh (Organic Clumps & Vines)
# ------------------------------------------------------------------------------
bm_moss = bmesh.new()

# Creeping moss clumps along coping edges & seams
moss_coping_spots = [
    (-9.5, -2.40, 0.05, 0.45, 0.22, 0.06),
    (-7.2, -2.40, 0.02, 0.55, 0.24, 0.08),
    (-4.0, -2.42, 0.04, 0.60, 0.22, 0.07),
    (-2.8, -2.40, 0.02, 0.40, 0.18, 0.06),
    (-0.5, -2.42, 0.05, 0.65, 0.26, 0.09),
    (1.2, -2.40, 0.03, 0.50, 0.20, 0.06),
    (3.5, -2.42, 0.04, 0.60, 0.24, 0.08),
    (6.5, -2.40, 0.05, 0.70, 0.28, 0.09),
    (8.2, -2.40, 0.02, 0.48, 0.22, 0.06),
    (10.0, -2.40, 0.04, 0.52, 0.24, 0.07)
]
for mx, my, mz, mw, md, mh in moss_coping_spots:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=mathutils.Matrix.Translation((mx, my, mz)) @
               mathutils.Matrix.Scale(mw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(md, 4, (0,1,0)) @
               mathutils.Matrix.Scale(mh, 4, (0,0,1)))

# Delicate hanging ivy frills dripping down the front wall joints
hanging_ivy = [
    (-9.8, -2.46, -0.32, 0.18, 0.05, 0.40),
    (-7.0, -2.46, -0.38, 0.22, 0.05, 0.48),
    (-4.2, -2.46, -0.35, 0.20, 0.05, 0.42),
    (-0.2, -2.46, -0.42, 0.24, 0.05, 0.52),
    (3.2, -2.46, -0.34, 0.20, 0.05, 0.40),
    (6.8, -2.46, -0.45, 0.24, 0.05, 0.55),
    (9.6, -2.46, -0.36, 0.22, 0.05, 0.45)
]
for ix, iy, iz, iw, idp, ih in hanging_ivy:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=mathutils.Matrix.Translation((ix, iy, iz)) @
               mathutils.Matrix.Scale(iw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(idp, 4, (0,1,0)) @
               mathutils.Matrix.Scale(ih, 4, (0,0,1)))

# Moss on rear balustrade caps & bases
for px in pillar_xs:
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=mathutils.Matrix.Translation((px + 0.25, rear_y - 0.04, 0.76)) @
               mathutils.Matrix.Scale(0.35, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.20, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.05, 4, (0,0,1)))
    bmesh.ops.create_cube(bm_moss, size=1.0,
        matrix=mathutils.Matrix.Translation((px - 0.25, rear_y - 0.08, 0.03)) @
               mathutils.Matrix.Scale(0.40, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.22, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,0,1)))

moss_mesh = bpy.data.meshes.new("Highland_Moss_Mesh")
bm_moss.to_mesh(moss_mesh)
bm_moss.free()
moss_obj = add_mesh_obj("Highland_3D_Moss", moss_mesh)
moss_obj.data.materials.append(mat_moss)

# ------------------------------------------------------------------------------
# 7. 3D Highland Valley Landscape (Contoured Terrain Grid)
# ------------------------------------------------------------------------------
bm_terrain = bmesh.new()
res_x, res_y = 64, 50
min_x, max_x = -52.0, 52.0
min_y, max_y = 3.6, 54.0

def highland_elevation(x, y):
    norm_y = (y - 3.6) / (54.0 - 3.6)
    z = -1.6 + norm_y * 1.8

    # Left castle hill ridge (peaks around X = -11, Y = 34)
    dx_cas = (x + 11.0) / 9.0
    dy_cas = (y - 34.0) / 8.0
    dist_cas = dx_cas**2 + dy_cas**2
    if dist_cas < 2.5:
        z += 4.8 * math.exp(-dist_cas * 1.2)

    # Left foreground framing bluff (X = -18, Y = 10)
    dx_lfg = (x + 18.0) / 7.0
    dy_lfg = (y - 10.0) / 5.5
    z += 3.8 * math.exp(-(dx_lfg**2 + dy_lfg**2))

    # Right waterfall rocky cliff plateau (X = 12.0 to 18.0, Y = 22.0 to 28.0)
    dx_fall = (x - 14.5) / 6.0
    dy_fall = (y - 25.0) / 6.0
    dist_fall = dx_fall**2 + dy_fall**2
    if dist_fall < 2.2:
        z += 4.2 * math.exp(-dist_fall * 1.1)

    # Central lake depression (X = 2.0, Y = 28.0)
    dx_lake = (x - 2.0) / 11.0
    dy_lake = (y - 28.0) / 7.5
    dist_lake = dx_lake**2 + dy_lake**2
    if dist_lake < 1.0:
        z -= (1.0 - dist_lake) * 2.8

    # Rolling background hills
    z += 3.2 * math.exp(-((x + 28.0)**2 + (y - 40.0)**2) / 160.0)
    z += 3.6 * math.exp(-((x - 28.0)**2 + (y - 40.0)**2) / 160.0)
    z += 2.4 * math.exp(-((x - 2.0)**2 + (y - 44.0)**2) / 140.0)

    # Gentle natural undulating knolls
    z += sin(x * 0.18) * cos(y * 0.14) * 0.45
    return z

verts_grid = []
for j in range(res_y):
    v_row = []
    y = min_y + (j / (res_y - 1)) * (max_y - min_y)
    for i in range(res_x):
        x = min_x + (i / (res_x - 1)) * (max_x - min_x)
        z = highland_elevation(x, y)
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
bm_cliffs = bmesh.new()

# Left Castle Ridge stratified cliff ledges
castle_cliff_steps = [
    (-8.5, 31.5, 3.4, 4.2, 2.2, 1.4),
    (-7.0, 33.5, 3.0, 3.8, 2.4, 1.5),
    (-10.5, 29.5, 3.2, 4.0, 2.0, 1.3),
    (-6.0, 28.5, 2.0, 3.5, 1.8, 1.2),
]
for cx, cy, cz, cw, cd, ch in castle_cliff_steps:
    bmesh.ops.create_cube(bm_cliffs, size=1.0,
        matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
               mathutils.Matrix.Rotation(radians(15), 4, 'Z') @
               mathutils.Matrix.Scale(cw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(cd, 4, (0,1,0)) @
               mathutils.Matrix.Scale(ch, 4, (0,0,1)))

# Right Waterfall tiered rock ledges & crags (At X = 11.5 to 14.5, Y = 23 to 27)
fall_cliffs = [
    (13.2, 26.5, 4.0, 4.2, 3.0, 1.6),
    (14.5, 24.5, 2.8, 3.8, 2.8, 1.8),
    (12.0, 27.5, 2.2, 3.4, 2.6, 1.5),
    (13.8, 22.5, 1.6, 4.2, 2.4, 1.4),
    (11.2, 25.0, 1.0, 3.6, 2.2, 1.2)
]
for fx, fy, fz, fw, fd, fh in fall_cliffs:
    bmesh.ops.create_cube(bm_cliffs, size=1.0,
        matrix=mathutils.Matrix.Translation((fx, fy, fz)) @
               mathutils.Matrix.Rotation(radians(-12), 4, 'Z') @
               mathutils.Matrix.Scale(fw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(fd, 4, (0,1,0)) @
               mathutils.Matrix.Scale(fh, 4, (0,0,1)))

cliffs_mesh = bpy.data.meshes.new("Highland_Cliffs_Mesh")
bm_cliffs.to_mesh(cliffs_mesh)
bm_cliffs.free()
cliffs_obj = add_mesh_obj("Highland_3D_Cliffs", cliffs_mesh)
cliffs_obj.data.materials.append(mat_cliff_rock)
for poly in cliffs_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 9. Winding Mountain Trail / Road (Connecting Castle to Lake)
# ------------------------------------------------------------------------------
bm_road = bmesh.new()
road_pts = [
    (-10.5, 33.0, 4.6), (-9.0, 30.5, 3.8), (-7.5, 27.5, 2.8),
    (-6.0, 24.5, 1.9),  (-4.2, 23.0, 1.3),  (-2.0, 23.5, 0.7),
    (0.0, 24.8, 0.40),  (2.0, 26.0, 0.28)
]
for idx in range(len(road_pts) - 1):
    p1 = road_pts[idx]
    p2 = road_pts[idx + 1]
    mx = (p1[0] + p2[0]) * 0.5
    my = (p1[1] + p2[1]) * 0.5
    mz = (p1[2] + p2[2]) * 0.5 + 0.03
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = sqrt(dx*dx + dy*dy)
    angle = math.atan2(dy, dx)
    bmesh.ops.create_cube(bm_road, size=1.0,
        matrix=mathutils.Matrix.Translation((mx, my, mz)) @
               mathutils.Matrix.Rotation(angle, 4, 'Z') @
               mathutils.Matrix.Scale(length * 1.05, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.85, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,0,1)))

road_mesh = bpy.data.meshes.new("Highland_Road_Mesh")
bm_road.to_mesh(road_mesh)
bm_road.free()
road_obj = add_mesh_obj("Highland_3D_Road", road_mesh)
road_obj.data.materials.append(mat_road)

# ------------------------------------------------------------------------------
# 10. Alpine Lake, Shoreline Beach & S-Curve River System (OPEN Sightline)
# ------------------------------------------------------------------------------
# A. Alpine Lake Surface (Z = 0.24)
bm_water = bmesh.new()
lake_cx, lake_cy, lake_cz = 2.0, 28.0, 0.24
lake_rx, lake_ry = 11.5, 7.8
lake_segs = 36
v_l_center = bm_water.verts.new((lake_cx, lake_cy, lake_cz))
rim_verts = []
for s in range(lake_segs):
    ang = 2.0 * math.pi * s / lake_segs
    rad_mod = 1.0 + 0.16 * sin(ang * 3.0) + 0.08 * cos(ang * 5.0)
    vx = lake_cx + (lake_rx * rad_mod) * cos(ang)
    vy = lake_cy + (lake_ry * rad_mod) * sin(ang)
    rim_verts.append(bm_water.verts.new((vx, vy, lake_cz)))

for s in range(lake_segs):
    v_next = rim_verts[(s + 1) % lake_segs]
    bm_water.faces.new([v_l_center, rim_verts[s], v_next])

# Meandering S-Curve River winding across the foreground meadow
river_pts = [
    (1.5, 21.0, 0.24, 2.8),
    (3.5, 19.2, 0.25, 2.6),
    (6.0, 18.0, 0.26, 2.5),
    (8.5, 18.8, 0.27, 2.8),
    (10.8, 20.5, 0.28, 3.2),
    (12.5, 22.8, 0.30, 3.6)
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
        matrix=mathutils.Matrix.Translation((mx, my, mz)) @
               mathutils.Matrix.Rotation(angle, 4, 'Z') @
               mathutils.Matrix.Scale(length * 1.05, 4, (1,0,0)) @
               mathutils.Matrix.Scale(rw, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,0,1)))

# Distant inlet stream from north mountains
inlet_pts = [
    (-3.0, 34.5, 0.35, 1.8),
    (-4.2, 37.5, 0.50, 1.6),
    (-5.6, 40.5, 0.68, 1.4)
]
for idx in range(len(inlet_pts) - 1):
    p1 = inlet_pts[idx]
    p2 = inlet_pts[idx + 1]
    mx = (p1[0] + p2[0]) * 0.5
    my = (p1[1] + p2[1]) * 0.5
    mz = (p1[2] + p2[2]) * 0.5
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = sqrt(dx*dx + dy*dy)
    angle = math.atan2(dy, dx)
    rw = (p1[3] + p2[3]) * 0.5
    bmesh.ops.create_cube(bm_water, size=1.0,
        matrix=mathutils.Matrix.Translation((mx, my, mz)) @
               mathutils.Matrix.Rotation(angle, 4, 'Z') @
               mathutils.Matrix.Scale(length * 1.05, 4, (1,0,0)) @
               mathutils.Matrix.Scale(rw, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,0,1)))

water_mesh = bpy.data.meshes.new("Highland_Water_Mesh")
bm_water.to_mesh(water_mesh)
bm_water.free()
water_obj = add_mesh_obj("Highland_3D_Lake", water_mesh)
water_obj.data.materials.append(mat_alpine_water)
for poly in water_mesh.polygons: poly.use_smooth = True

# B. Sandy Beach Shoreline Ring encircling the lake
bm_shore = bmesh.new()
for s in range(lake_segs):
    ang = 2.0 * math.pi * s / lake_segs
    rad_mod = 1.0 + 0.16 * sin(ang * 3.0) + 0.08 * cos(ang * 5.0)
    vx = lake_cx + (lake_rx * rad_mod + 0.7) * cos(ang)
    vy = lake_cy + (lake_ry * rad_mod + 0.7) * sin(ang)
    bmesh.ops.create_cube(bm_shore, size=1.0,
        matrix=mathutils.Matrix.Translation((vx, vy, 0.25)) @
               mathutils.Matrix.Rotation(ang, 4, 'Z') @
               mathutils.Matrix.Scale(1.5, 4, (1,0,0)) @
               mathutils.Matrix.Scale(1.2, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.06, 4, (0,0,1)))

shore_mesh = bpy.data.meshes.new("Highland_Shoreline_Mesh")
bm_shore.to_mesh(shore_mesh)
bm_shore.free()
shore_obj = add_mesh_obj("Highland_3D_Shoreline", shore_mesh)
shore_obj.data.materials.append(mat_shoreline_sand)
for poly in shore_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 11. Cascading Multi-Tier Foaming Waterfall on Right Cliff (In Frame)
# ------------------------------------------------------------------------------
bm_falls = bmesh.new()
# Tier 1 (Upper Fall): Z = 4.2 down to 2.8
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=mathutils.Matrix.Translation((13.2, 26.0, 3.5)) @
           mathutils.Matrix.Rotation(radians(8), 4, 'Y') @
           mathutils.Matrix.Scale(2.4, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.40, 4, (0,1,0)) @
           mathutils.Matrix.Scale(1.6, 4, (0,0,1)))

# Tier 2 (Mid Shelf Churning Cascade): Z = 2.8 down to 1.4
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=mathutils.Matrix.Translation((12.6, 24.8, 2.1)) @
           mathutils.Matrix.Rotation(radians(-6), 4, 'Y') @
           mathutils.Matrix.Scale(3.0, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.45, 4, (0,1,0)) @
           mathutils.Matrix.Scale(1.7, 4, (0,0,1)))

# Tier 3 (Lower Plunge & Rapids into River): Z = 1.4 down to 0.28
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=mathutils.Matrix.Translation((12.0, 23.6, 0.85)) @
           mathutils.Matrix.Scale(3.8, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.50, 4, (0,1,0)) @
           mathutils.Matrix.Scale(1.4, 4, (0,0,1)))

# Foaming splash churning discs at plunge basins
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=mathutils.Matrix.Translation((12.6, 24.6, 2.75)) @
           mathutils.Matrix.Scale(2.8, 4, (1,0,0)) @
           mathutils.Matrix.Scale(1.3, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.12, 4, (0,0,1)))
bmesh.ops.create_cube(bm_falls, size=1.0,
    matrix=mathutils.Matrix.Translation((11.8, 23.2, 0.32)) @
           mathutils.Matrix.Scale(4.2, 4, (1,0,0)) @
           mathutils.Matrix.Scale(2.0, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.14, 4, (0,0,1)))

falls_mesh = bpy.data.meshes.new("Highland_Waterfall_Mesh")
bm_falls.to_mesh(falls_mesh)
bm_falls.free()
falls_obj = add_mesh_obj("Highland_3D_Waterfall", falls_mesh)
falls_obj.data.materials.append(mat_waterfall_foam)

# Dark wet rocks around the waterfall splash zone
bm_wet = bmesh.new()
wet_spots = [
    (14.4, 26.0, 3.4, 1.3, 1.1, 0.9),
    (11.4, 25.5, 2.4, 1.5, 1.2, 1.0),
    (13.8, 24.0, 1.6, 1.6, 1.3, 1.0),
    (10.5, 23.4, 0.6, 1.4, 1.4, 0.8),
    (13.2, 22.4, 0.4, 1.8, 1.5, 0.7)
]
for wx, wy, wz, ww, wd, wh in wet_spots:
    bmesh.ops.create_cube(bm_wet, size=1.0,
        matrix=mathutils.Matrix.Translation((wx, wy, wz)) @
               mathutils.Matrix.Scale(ww, 4, (1,0,0)) @
               mathutils.Matrix.Scale(wd, 4, (0,1,0)) @
               mathutils.Matrix.Scale(wh, 4, (0,0,1)))

wet_mesh = bpy.data.meshes.new("Highland_Wet_Rocks_Mesh")
bm_wet.to_mesh(wet_mesh)
bm_wet.free()
wet_obj = add_mesh_obj("Highland_3D_Wet_Rocks", wet_mesh)
wet_obj.data.materials.append(mat_wet_rock)

# ------------------------------------------------------------------------------
# 12. Castle Fortress on Left Hill Ridge (Fully Framed In-Shot)
# ------------------------------------------------------------------------------
cas_x, cas_y, cas_z = -11.0, 34.0, 4.6

# A. Castle Limestone Walls, Keep & Battlements
bm_castle = bmesh.new()

# Main Great Keep
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x, cas_y, cas_z + 2.0)) @
           mathutils.Matrix.Scale(3.6, 4, (1,0,0)) @
           mathutils.Matrix.Scale(3.2, 4, (0,1,0)) @
           mathutils.Matrix.Scale(4.2, 4, (0,0,1)))

# Keep crenellated parapet trim
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x, cas_y, cas_z + 4.2)) @
           mathutils.Matrix.Scale(3.9, 4, (1,0,0)) @
           mathutils.Matrix.Scale(3.5, 4, (0,1,0)) @
           mathutils.Matrix.Scale(0.30, 4, (0,0,1)))

# Keep individual merlons along battlements
for mx in [-1.6, -0.5, 0.5, 1.6]:
    for my in [-1.5, 1.5]:
        bmesh.ops.create_cube(bm_castle, size=1.0,
            matrix=mathutils.Matrix.Translation((cas_x + mx, cas_y + my, cas_z + 4.5)) @
                   mathutils.Matrix.Scale(0.46, 4, (1,0,0)) @
                   mathutils.Matrix.Scale(0.32, 4, (0,1,0)) @
                   mathutils.Matrix.Scale(0.44, 4, (0,0,1)))

# 4 Corner Bastion Cylindrical Towers
tower_offsets = [(-2.0, -1.8), (2.0, -1.8), (-2.0, 1.8), (2.0, 1.8)]
for tox, toy in tower_offsets:
    bmesh.ops.create_cone(bm_castle, segments=12, radius1=0.95, radius2=0.95, depth=4.0,
        matrix=mathutils.Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 1.8)))
    bmesh.ops.create_cone(bm_castle, segments=12, radius1=1.10, radius2=0.95, depth=0.35,
        matrix=mathutils.Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 3.9)))

# Connecting Curtain Walls
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x, cas_y - 1.8, cas_z + 1.3)) @
           mathutils.Matrix.Scale(3.4, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.55, 4, (0,1,0)) @
           mathutils.Matrix.Scale(2.6, 4, (0,0,1)))
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x - 2.0, cas_y, cas_z + 1.3)) @
           mathutils.Matrix.Scale(0.55, 4, (1,0,0)) @
           mathutils.Matrix.Scale(3.2, 4, (0,1,0)) @
           mathutils.Matrix.Scale(2.6, 4, (0,0,1)))
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x + 2.0, cas_y, cas_z + 1.3)) @
           mathutils.Matrix.Scale(0.55, 4, (1,0,0)) @
           mathutils.Matrix.Scale(3.2, 4, (0,1,0)) @
           mathutils.Matrix.Scale(2.6, 4, (0,0,1)))

# Outer bailey wall wing extending downhill
bmesh.ops.create_cube(bm_castle, size=1.0,
    matrix=mathutils.Matrix.Translation((cas_x + 3.4, cas_y - 1.2, cas_z + 0.6)) @
           mathutils.Matrix.Rotation(radians(-25), 4, 'Z') @
           mathutils.Matrix.Scale(2.6, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.50, 4, (0,1,0)) @
           mathutils.Matrix.Scale(1.9, 4, (0,0,1)))

castle_mesh = bpy.data.meshes.new("Highland_Castle_Mesh")
bm_castle.to_mesh(castle_mesh)
bm_castle.free()
castle_obj = add_mesh_obj("Highland_3D_Castle", castle_mesh)
castle_obj.data.materials.append(mat_castle_stone)
for poly in castle_mesh.polygons: poly.use_smooth = True

# B. Castle Conical Turret Roofs (Slate Blue-Grey)
bm_roofs = bmesh.new()
# Keep central high roof turret
bmesh.ops.create_cone(bm_roofs, segments=12, radius1=1.65, radius2=0.04, depth=2.4,
    matrix=mathutils.Matrix.Translation((cas_x, cas_y, cas_z + 5.5)))

# Corner tower conical roofs
for tox, toy in tower_offsets:
    bmesh.ops.create_cone(bm_roofs, segments=12, radius1=1.18, radius2=0.04, depth=1.8,
        matrix=mathutils.Matrix.Translation((cas_x + tox, cas_y + toy, cas_z + 4.9)))

# Bailey outpost roof
bmesh.ops.create_cone(bm_roofs, segments=10, radius1=0.85, radius2=0.04, depth=1.4,
    matrix=mathutils.Matrix.Translation((cas_x + 4.2, cas_y - 1.8, cas_z + 1.8)))

roofs_mesh = bpy.data.meshes.new("Highland_Roofs_Mesh")
bm_roofs.to_mesh(roofs_mesh)
bm_roofs.free()
roofs_obj = add_mesh_obj("Highland_3D_Castle_Roofs", roofs_mesh)
roofs_obj.data.materials.append(mat_castle_roof)

# C. Glowing Castle Windows
bm_cwindows = bmesh.new()
win_coords = [
    (cas_x, cas_y - 1.62, cas_z + 2.8),
    (cas_x - 0.9, cas_y - 1.62, cas_z + 2.8),
    (cas_x + 0.9, cas_y - 1.62, cas_z + 2.8),
    (cas_x, cas_y - 1.62, cas_z + 1.6),
    (cas_x - 2.0, cas_y - 2.7, cas_z + 2.6),
    (cas_x + 2.0, cas_y - 2.7, cas_z + 2.6)
]
for wx, wy, wz in win_coords:
    bmesh.ops.create_cube(bm_cwindows, size=1.0,
        matrix=mathutils.Matrix.Translation((wx, wy, wz)) @
               mathutils.Matrix.Scale(0.22, 4, (1,0,0)) @
               mathutils.Matrix.Scale(0.04, 4, (0,1,0)) @
               mathutils.Matrix.Scale(0.42, 4, (0,0,1)))

cwin_mesh = bpy.data.meshes.new("Highland_Castle_Windows_Mesh")
bm_cwindows.to_mesh(cwin_mesh)
bm_cwindows.free()
cwin_obj = add_mesh_obj("Highland_3D_Castle_Windows", cwin_mesh)
cwin_obj.data.materials.append(mat_window_warm)

# ------------------------------------------------------------------------------
# 13. Trees & Foliage (Natural Clusters Leaving Horizon & Lake Open)
# ------------------------------------------------------------------------------
bm_pines = bmesh.new()
bm_decid = bmesh.new()
bm_trunks = bmesh.new()

def add_pine(bm_p, bm_t, px, py, pz, scale=1.0):
    bmesh.ops.create_cone(bm_t, segments=6, radius1=0.22*scale, radius2=0.12*scale, depth=1.8*scale,
        matrix=mathutils.Matrix.Translation((px, py, pz + 0.9*scale)))
    tiers = [(1.4, 1.45, 1.6), (2.3, 1.20, 1.4), (3.1, 0.90, 1.2), (3.8, 0.60, 1.0)]
    for tz, r, d in tiers:
        bmesh.ops.create_cone(bm_p, segments=7, radius1=r*scale, radius2=0.06*scale, depth=d*scale,
            matrix=mathutils.Matrix.Translation((px, py, pz + tz*scale)))

def add_deciduous(bm_d, bm_t, px, py, pz, scale=1.0):
    bmesh.ops.create_cone(bm_t, segments=6, radius1=0.32*scale, radius2=0.18*scale, depth=2.0*scale,
        matrix=mathutils.Matrix.Translation((px, py, pz + 1.0*scale)))
    canopy_blobs = [
        (0.0, 0.0, 2.5, 1.4),
        (0.7, 0.2, 2.7, 1.2),
        (-0.6, -0.2, 2.6, 1.1),
        (0.2, 0.5, 3.4, 1.0),
        (-0.3, 0.4, 3.3, 0.95)
    ]
    for bx, by, bz, br in canopy_blobs:
        bmesh.ops.create_uvsphere(bm_d, u_segments=8, v_segments=6, radius=br*scale,
            matrix=mathutils.Matrix.Translation((px + bx*scale, py + by*scale, pz + bz*scale)))

# Prominent Left Foreground Framing Trees (Matching Reference Art on Left Bluff)
left_framing_trees = [
    (-16.5, 9.0, 1.8), (-18.5, 11.5, 2.1), (-15.0, 12.0, 1.6),
    (-20.5, 8.5, 2.3), (-17.5, 14.0, 1.7), (-21.5, 13.0, 2.2),
    (-14.0, 8.0, 1.5)
]
for tx, ty, tscale in left_framing_trees:
    tz = highland_elevation(tx, ty)
    add_deciduous(bm_decid, bm_trunks, tx, ty, tz, tscale)

# Left Valley Pocket (between bridge and castle hill)
left_valley_trees = [
    (-12.0, 16.0, 1.4), (-14.0, 18.0, 1.5), (-10.5, 19.5, 1.3),
    (-15.5, 21.0, 1.6), (-12.5, 22.5, 1.4), (-9.5, 24.0, 1.3),
    (-17.0, 24.0, 1.7), (-15.0, 26.0, 1.5), (-17.5, 28.0, 1.6),
    (-19.0, 32.0, 1.8), (-16.0, 35.0, 1.6), (-13.0, 37.0, 1.4)
]
for px, py, pscale in left_valley_trees:
    pz = highland_elevation(px, py)
    add_pine(bm_pines, bm_trunks, px, py, pz, pscale)

# Low valley meadow grove (between bridge and lake, tucked in depression)
valley_meadow_trees = [
    (-6.5, 15.5, 1.2), (-4.5, 17.0, 1.3), (-8.0, 17.5, 1.3),
    (-5.0, 19.5, 1.1), (-7.0, 20.5, 1.2)
]
for px, py, pscale in valley_meadow_trees:
    pz = highland_elevation(px, py)
    add_pine(bm_pines, bm_trunks, px, py, pz, pscale)

# Right Cliff & Background Upper Plateau (Away from Waterfall and Lake)
right_cliff_trees = [
    (18.5, 23.0, 1.4), (20.5, 25.0, 1.5), (22.0, 27.5, 1.6),
    (18.0, 30.0, 1.5), (20.0, 32.5, 1.6), (22.5, 35.0, 1.7),
    (16.0, 34.0, 1.3), (18.5, 36.5, 1.4)
]
for px, py, pscale in right_cliff_trees:
    pz = highland_elevation(px, py)
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
# 14. Majestic Mountain Range & Dedicated Snow Peaks (Framed Perfectly)
# ------------------------------------------------------------------------------
bm_mountains = bmesh.new()
bm_snow = bmesh.new()

# A. Mount Dominant (Hero Peak, Center-Right: X = 12.5, Y = 60.0, Peak Z = 13.8)
# Sharp craggy Matterhorn pyramid horn
bmesh.ops.create_cone(bm_mountains, segments=10, radius1=17.0, radius2=0.6, depth=16.5,
    matrix=mathutils.Matrix.Translation((12.5, 60.0, 5.8)))
# Southwest flanking spur ridge
bmesh.ops.create_cone(bm_mountains, segments=8, radius1=11.0, radius2=0.5, depth=12.5,
    matrix=mathutils.Matrix.Translation((6.2, 55.0, 4.5)))
# Southeast flanking spur ridge
bmesh.ops.create_cone(bm_mountains, segments=8, radius1=12.0, radius2=0.5, depth=13.5,
    matrix=mathutils.Matrix.Translation((19.5, 61.0, 5.2)))

# Craggy rock facets & arêtes
facet_crags = [
    (10.5, 57.5, 8.0, 4.0, 2.4, 5.8, 25),
    (14.8, 58.5, 8.2, 4.2, 2.3, 6.0, -22),
    (12.2, 56.0, 6.0, 4.8, 2.6, 5.2, 10),
    (7.8, 54.5, 5.8, 3.8, 2.1, 4.8, 30),
    (17.2, 59.0, 6.8, 4.2, 2.3, 5.5, -18)
]
for cx, cy, cz, cw, cd, ch, rot in facet_crags:
    bmesh.ops.create_cube(bm_mountains, size=1.0,
        matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
               mathutils.Matrix.Rotation(radians(rot), 4, 'Z') @
               mathutils.Matrix.Rotation(radians(18), 4, 'X') @
               mathutils.Matrix.Scale(cw, 4, (1,0,0)) @
               mathutils.Matrix.Scale(cd, 4, (0,1,0)) @
               mathutils.Matrix.Scale(ch, 4, (0,0,1)))

# B. Mount Dominant Dedicated Radiant Snow Cap & Snow Couloirs
# Solid summit radiant snow cap covering the peak
bmesh.ops.create_cone(bm_snow, segments=10, radius1=6.4, radius2=0.04, depth=4.8,
    matrix=mathutils.Matrix.Translation((12.5, 60.0, 11.6)))

# Snow couloir running down southwest face
bmesh.ops.create_cube(bm_snow, size=1.0,
    matrix=mathutils.Matrix.Translation((10.2, 57.5, 8.8)) @
           mathutils.Matrix.Rotation(radians(38), 4, 'Y') @
           mathutils.Matrix.Rotation(radians(-25), 4, 'Z') @
           mathutils.Matrix.Scale(1.5, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.55, 4, (0,1,0)) @
           mathutils.Matrix.Scale(4.6, 4, (0,0,1)))

# Snow couloir running down southeast face
bmesh.ops.create_cube(bm_snow, size=1.0,
    matrix=mathutils.Matrix.Translation((15.0, 59.2, 9.0)) @
           mathutils.Matrix.Rotation(radians(-35), 4, 'Y') @
           mathutils.Matrix.Rotation(radians(20), 4, 'Z') @
           mathutils.Matrix.Scale(1.7, 4, (1,0,0)) @
           mathutils.Matrix.Scale(0.55, 4, (0,1,0)) @
           mathutils.Matrix.Scale(4.8, 4, (0,0,1)))

# Secondary spur snow caps
bmesh.ops.create_cone(bm_snow, segments=8, radius1=3.8, radius2=0.04, depth=3.6,
    matrix=mathutils.Matrix.Translation((6.2, 55.0, 8.8)))
bmesh.ops.create_cone(bm_snow, segments=8, radius1=4.2, radius2=0.04, depth=3.8,
    matrix=mathutils.Matrix.Translation((19.5, 61.0, 10.0)))

# C. Distant Flanking Mountain Ridges
bm_dist_mtns = bmesh.new()

# Left Craggy Ridge (behind Castle, X = -21.0, Y = 62.0, peak Z = 11.6)
bmesh.ops.create_cone(bm_dist_mtns, segments=9, radius1=15.0, radius2=0.8, depth=13.5,
    matrix=mathutils.Matrix.Translation((-21.0, 62.0, 5.0)))
bmesh.ops.create_cone(bm_snow, segments=9, radius1=4.8, radius2=0.04, depth=4.0,
    matrix=mathutils.Matrix.Translation((-21.0, 62.0, 9.8)))

# Far-Left Mountain Ridge (X = -36.0, Y = 64.0, peak Z = 9.8)
bmesh.ops.create_cone(bm_dist_mtns, segments=8, radius1=14.0, radius2=0.8, depth=11.5,
    matrix=mathutils.Matrix.Translation((-36.0, 64.0, 4.2)))

# Far-Right Mountain Crest (X = 30.0, Y = 62.0, peak Z = 10.8)
bmesh.ops.create_cone(bm_dist_mtns, segments=8, radius1=12.5, radius2=0.7, depth=12.0,
    matrix=mathutils.Matrix.Translation((30.0, 62.0, 5.0)))
bmesh.ops.create_cone(bm_snow, segments=8, radius1=3.8, radius2=0.04, depth=3.6,
    matrix=mathutils.Matrix.Translation((30.0, 62.0, 9.2)))

# Center Distant Gap Horizon Ridge (X = -3.0, Y = 68.0, peak Z = 8.2)
bmesh.ops.create_cone(bm_dist_mtns, segments=8, radius1=13.0, radius2=0.8, depth=9.5,
    matrix=mathutils.Matrix.Translation((-3.0, 68.0, 3.6)))

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
bm_mist = bmesh.new()
mist_ribbons = [
    (10.0, 54.0, 6.8, 13.0, 3.0, 0.8),
    (17.0, 57.0, 7.4, 11.0, 3.2, 0.7),
    (4.5, 52.0, 6.4, 9.0, 2.6, 0.6),
    (-9.0, 56.0, 6.2, 11.0, 2.8, 0.7),
    (-21.0, 57.0, 6.0, 10.0, 3.0, 0.6)
]
for mx, my, mz, mw, md, mh in mist_ribbons:
    bmesh.ops.create_uvsphere(bm_mist, u_segments=10, v_segments=6, radius=1.0,
        matrix=mathutils.Matrix.Translation((mx, my, mz)) @
               mathutils.Matrix.Scale(mw * 0.5, 4, (1,0,0)) @
               mathutils.Matrix.Scale(md * 0.5, 4, (0,1,0)) @
               mathutils.Matrix.Scale(mh * 0.5, 4, (0,0,1)))

mist_mesh = bpy.data.meshes.new("Highland_Mist_Mesh")
bm_mist.to_mesh(mist_mesh)
bm_mist.free()
mist_obj = add_mesh_obj("Highland_3D_Mist", mist_mesh)
mist_obj.data.materials.append(mat_mist)
for poly in mist_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 16. 3D Billowing Cumulus Sky Clouds
# ------------------------------------------------------------------------------
bm_clouds = bmesh.new()
def add_cumulus_cloud(bm, cx, cy, cz, scale=1.0):
    blobs = [
        (0.0, 0.0, 0.0, 2.8),
        (2.2, 0.0, -0.3, 2.3),
        (-2.0, 0.0, -0.2, 2.1),
        (1.1, 0.0, 1.2, 1.9),
        (-1.0, 0.0, 1.1, 1.8),
        (3.4, 0.0, -0.7, 1.6),
        (-3.2, 0.0, -0.6, 1.5)
    ]
    for bx, by, bz, br in blobs:
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=br * scale,
            matrix=mathutils.Matrix.Translation((cx + bx * scale, cy + by * scale, cz + bz * scale)))

add_cumulus_cloud(bm_clouds, -18.0, 50.0, 14.8, 1.35)
add_cumulus_cloud(bm_clouds,  -4.0, 52.0, 15.6, 1.45)
add_cumulus_cloud(bm_clouds,  13.0, 52.0, 16.8, 1.40)
add_cumulus_cloud(bm_clouds,  25.0, 52.0, 15.2, 1.30)
add_cumulus_cloud(bm_clouds, -28.0, 54.0, 13.8, 1.25)

clouds_mesh = bpy.data.meshes.new("Highland_Clouds_Mesh")
bm_clouds.to_mesh(clouds_mesh)
bm_clouds.free()
clouds_obj = add_mesh_obj("Highland_3D_Clouds", clouds_mesh)
clouds_obj.data.materials.append(mat_cloud)
for poly in clouds_mesh.polygons: poly.use_smooth = True

# ------------------------------------------------------------------------------
# 17. 3D Inverted Sky Dome
# ------------------------------------------------------------------------------
bpy.ops.mesh.primitive_uv_sphere_add(radius=100.0, location=(0.0, 30.0, 5.0), segments=36, ring_count=24)
sky_dome = bpy.context.active_object
sky_dome.name = "Highland_3D_Sky_Dome"
sky_dome.data.materials.append(mat_sky_zenith)
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

# ------------------------------------------------------------------------------
# 18. Combat Camera (Calibrated to Platform Ratio: 0.72)
# ------------------------------------------------------------------------------
cam_dist = 18.0
lens = 38.0
cam_data = bpy.data.cameras.new("Highland_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Highland_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, 3.4)
cam_obj.rotation_euler = (radians(83.5), 0, 0)

# ------------------------------------------------------------------------------
# 19. Radiant Daylight Sun & Calibrated Ambient Lighting
# ------------------------------------------------------------------------------
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

# Warm direct sunlight streaming from upper right (casting warm anime highlights)
add_light("Sun_Alpine_Daylight", 'SUN', 5.6, (1.00, 0.96, 0.88), (18.0, -8.0, 38.0), (radians(48), radians(-12), radians(-32)))

# Soft ambient sky fill light
add_light("Sky_Ambient_Fill", 'AREA', 300, (0.60, 0.76, 0.98), (0.0, 18.0, 22.0), (radians(25), 0, 0), size=28.0)

# Front combat duel fill light for characters on platform
add_light("Front_Duel_Fill", 'AREA', 360, (1.00, 0.95, 0.88), (0.0, -10.0, 3.6), (radians(75), 0, 0), size=18.0)

# Bridge front wall dedicated fill light (reveals warm stone masonry relief & moss)
add_light("Bridge_Wall_Fill", 'AREA', 400, (0.95, 0.92, 0.86), (0.0, -8.0, -1.0), (radians(80), 0, 0), size=20.0)

# Castle accent fill light
add_light("Castle_Accent_Fill", 'AREA', 220, (1.00, 0.96, 0.90), (-11.0, 26.0, 7.5), (radians(35), radians(-15), 0), size=10.0)

# Waterfall sparkling rim light
add_light("Waterfall_Rim_Light", 'AREA', 260, (0.85, 0.95, 1.00), (12.5, 19.0, 5.5), (radians(40), radians(15), 0), size=8.0)

# Soft point lights for balustrade golden runes
for rx in [-9.2, -5.5, -1.8, 1.8, 5.5, 9.2]:
    add_light(f"Rune_Glow_{rx}", 'POINT', 25, (1.00, 0.84, 0.22), (rx, 2.0, 0.50))

# ------------------------------------------------------------------------------
# 20. Save & Export (.blend, .png, .glb)
# ------------------------------------------------------------------------------
blend_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=False)

render_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)

glb_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)

print(">>> [Highland Sanctuary 100% 3D] Completed Successfully!")

"""
KeyFury 3D: Celestial Void Shrine - Master 100% Pure 3D Geometry Builder (Version 4 - Perfected Polish)
Blender 5.2.1 LTS // EEVEE Next Engine
100% Pure Procedural 3D Polygonal Geometry // Zero 2D Billboards
Features:
  1. Elegant Curved Side Staircase on Right Flank with Continuous Sloping Balustrades & Newel Lantern
  2. Translucent Gem Glass Crystals with Fresnel / LayerWeight Glowing Rim & Facet Highlights (Saturated Glow, No Blowouts)
  3. Radiant Celestial Crescent Moon with Outer Rim Bloom & Ethereal Lunar Gradient
  4. Flagstone Paving Tile Detail on Marble Arena Floor (Procedural Masonry & Bump Seams)
  5. Dual-Material Floating Islands (Dark Celestial Velvet Moss/Soil on Top, Craggy Basalt Keel Underneath)
  6. Refined Side Monolith Rune Pillars, Pagoda Lanterns with Warm Firelight, and Classical Temple Archway
"""

import bpy
import bmesh
import math
from math import radians, sin, cos, pi, sqrt, asin, atan2
import os
import sys
import random

out_dir = r"d:\Keyboard stickman warrior\test_3d"
os.makedirs(out_dir, exist_ok=True)

print(">>> [KeyFury 3D Celestial Void v4] Initializing clean Blender environment...")

# 1. CLEAN SCENE
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for col in [bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.lights, bpy.data.cameras, bpy.data.curves]:
    for block in list(col):
        if block.users == 0:
            col.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'High Contrast'

if hasattr(scene, 'eevee'):
    if hasattr(scene.eevee, 'use_raytracing'):
        scene.eevee.use_raytracing = True
    if hasattr(scene.eevee, 'use_shadows'):
        scene.eevee.use_shadows = True

# 2. COSMIC SPACE WORLD ATMOSPHERE (Zero 2D Cards - Pure Procedural Stars & Nebula)
print(">>> Setting up Procedural Cosmic Space Dome & Nebula Shader...")
world = scene.world
if not world:
    world = bpy.data.worlds.new("Celestial_Cosmic_World")
    scene.world = world
world.use_nodes = True
tree_w = world.node_tree
tree_w.nodes.clear()

out_w = tree_w.nodes.new(type='ShaderNodeOutputWorld')
bg_w = tree_w.nodes.new(type='ShaderNodeBackground')
coord_w = tree_w.nodes.new(type='ShaderNodeTexCoord')

# Nebula layer: Cosmic violet & astral magenta swirl
noise_w = tree_w.nodes.new(type='ShaderNodeTexNoise')
noise_w.inputs['Scale'].default_value = 1.8
noise_w.inputs['Detail'].default_value = 4.0
noise_w.inputs['Roughness'].default_value = 0.55

ramp_nebula = tree_w.nodes.new(type='ShaderNodeValToRGB')
ramp_nebula.color_ramp.elements[0].position = 0.22
ramp_nebula.color_ramp.elements[0].color = (0.008, 0.004, 0.022, 1.0) # Abyss midnight indigo
ramp_nebula.color_ramp.elements[1].position = 0.60
ramp_nebula.color_ramp.elements[1].color = (0.052, 0.012, 0.105, 1.0) # Cosmic violet dust
elem_mag = ramp_nebula.color_ramp.elements.new(0.84)
elem_mag.color = (0.115, 0.018, 0.095, 1.0) # Magenta celestial nebula

tree_w.links.new(coord_w.outputs['Generated'], noise_w.inputs['Vector'])
tree_w.links.new(noise_w.outputs['Fac'], ramp_nebula.inputs['Fac'])

# Stars layer: Thresholded Voronoi pinpoint stars
vor_stars = tree_w.nodes.new(type='ShaderNodeTexVoronoi')
vor_stars.inputs['Scale'].default_value = 150.0

math_stars = tree_w.nodes.new(type='ShaderNodeMath')
math_stars.operation = 'LESS_THAN'
math_stars.inputs[1].default_value = 0.042

mult_stars = tree_w.nodes.new(type='ShaderNodeMath')
mult_stars.operation = 'MULTIPLY'
mult_stars.inputs[1].default_value = 4.5

tree_w.links.new(coord_w.outputs['Generated'], vor_stars.inputs['Vector'])
tree_w.links.new(vor_stars.outputs['Distance'], math_stars.inputs[0])
tree_w.links.new(math_stars.outputs['Value'], mult_stars.inputs[0])

# Add stars to nebula
mix_stars = tree_w.nodes.new(type='ShaderNodeMix')
mix_stars.data_type = 'RGBA'
mix_stars.blend_type = 'ADD'
mix_stars.inputs['Factor'].default_value = 1.0

tree_w.links.new(ramp_nebula.outputs['Color'], mix_stars.inputs[6])
tree_w.links.new(mult_stars.outputs['Value'], mix_stars.inputs[7])

tree_w.links.new(mix_stars.outputs[2], bg_w.inputs['Color'])
bg_w.inputs['Strength'].default_value = 1.0
tree_w.links.new(bg_w.outputs['Background'], out_w.inputs['Surface'])

# 3. TEXTURES & PROCEDURAL MATERIALS
def load_img(name):
    p = os.path.join(out_dir, name)
    if os.path.exists(p):
        return bpy.data.images.load(p)
    return None

img_floor = load_img("tex_celestial_magic_floor.png")
img_temple = load_img("tex_celestial_temple_seal.png")
img_obelisk = load_img("tex_celestial_obelisk_runes.png")

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, specular=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def create_pure_emission(name, color, strength=10.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

# --- FLAGSTONE MARBLE PAVING MATERIAL (Item 4) ---
def create_flagstone_marble_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    
    brick = tree.nodes.new(type='ShaderNodeTexBrick')
    brick.inputs['Scale'].default_value = 0.95
    brick.inputs['Mortar Size'].default_value = 0.016
    brick.inputs['Mortar Smooth'].default_value = 0.06
    brick.inputs['Bias'].default_value = 0.15
    brick.inputs['Brick Width'].default_value = 1.6
    brick.inputs['Row Height'].default_value = 0.8
    brick.inputs['Color1'].default_value = (0.28, 0.25, 0.38, 1.0)
    brick.inputs['Color2'].default_value = (0.21, 0.19, 0.30, 1.0)
    brick.inputs['Mortar'].default_value = (0.08, 0.07, 0.12, 1.0)
    
    noise = tree.nodes.new(type='ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 24.0
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.55
    
    mix_color = tree.nodes.new(type='ShaderNodeMix')
    mix_color.data_type = 'RGBA'
    mix_color.blend_type = 'MULTIPLY'
    mix_color.inputs['Factor'].default_value = 0.22
    
    bump = tree.nodes.new(type='ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.40
    bump.inputs['Distance'].default_value = 0.04
    
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.12
    bsdf.inputs['Roughness'].default_value = 0.24
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.85
        
    tree.links.new(coord.outputs['Object'], brick.inputs['Vector'])
    tree.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    tree.links.new(brick.outputs['Color'], mix_color.inputs[6])
    tree.links.new(noise.outputs['Color'], mix_color.inputs[7])
    tree.links.new(mix_color.outputs[2], bsdf.inputs['Base Color'])
    
    tree.links.new(brick.outputs['Factor'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# --- CELESTIAL MOSS / SOIL MATERIAL (Item 5) ---
def create_celestial_moss_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    noise = tree.nodes.new(type='ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 14.0
    noise.inputs['Detail'].default_value = 5.0
    noise.inputs['Roughness'].default_value = 0.65
    
    ramp = tree.nodes.new(type='ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (0.05, 0.08, 0.14, 1.0) # Deep midnight indigo soil
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.12, 0.22, 0.26, 1.0) # Ethereal cyan-moss loam
    
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.02
    bsdf.inputs['Roughness'].default_value = 0.72
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.30
        
    tree.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    tree.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# --- CRAGGY BASALT STONE MATERIAL WITH BUMP (Item 5) ---
def create_crag_stone_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    noise = tree.nodes.new(type='ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 10.0
    noise.inputs['Detail'].default_value = 6.0
    noise.inputs['Roughness'].default_value = 0.75
    
    ramp = tree.nodes.new(type='ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (0.045, 0.038, 0.070, 1.0)
    ramp.color_ramp.elements[1].position = 0.8
    ramp.color_ramp.elements[1].color = (0.095, 0.080, 0.135, 1.0)
    
    bump = tree.nodes.new(type='ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.65
    bump.inputs['Distance'].default_value = 0.08
    
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.10
    bsdf.inputs['Roughness'].default_value = 0.82
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.40
        
    tree.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    tree.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# --- MAGIC EMISSIVE OVERLAY WITH PROCEDURAL FLAGSTONE BACKGROUND (Item 4) ---
def create_magic_emissive_material(name, img, emission_fac=5.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    
    brick = tree.nodes.new(type='ShaderNodeTexBrick')
    brick.inputs['Scale'].default_value = 0.95
    brick.inputs['Mortar Size'].default_value = 0.016
    brick.inputs['Mortar Smooth'].default_value = 0.06
    brick.inputs['Color1'].default_value = (0.28, 0.25, 0.38, 1.0)
    brick.inputs['Color2'].default_value = (0.21, 0.19, 0.30, 1.0)
    brick.inputs['Mortar'].default_value = (0.08, 0.07, 0.12, 1.0)
    
    bump = tree.nodes.new(type='ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.035
    
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = 0.12
    bsdf.inputs['Roughness'].default_value = 0.24
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.85
        
    tree.links.new(coord.outputs['Object'], brick.inputs['Vector'])
    tree.links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
    tree.links.new(brick.outputs['Factor'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = emission_fac
    
    mix = tree.nodes.new(type='ShaderNodeMixShader')
    
    if img:
        tex = tree.nodes.new(type='ShaderNodeTexImage')
        tex.image = img
        tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
        tree.links.new(tex.outputs['Alpha'], mix.inputs['Fac'])
    else:
        mix.inputs['Fac'].default_value = 0.5
    
    tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    tree.links.new(emit.outputs['Emission'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

# --- FRESNEL / LAYER WEIGHT GEM GLASS CRYSTAL SHADER (Item 2) ---
# Calibrated for rich deep jewel transmission body and luminous electric neon rim
def create_glowing_crystal_material(name, crystal_color=(0.42, 0.05, 0.82, 1.0), rim_color=(0.88, 0.12, 1.0, 1.0), rim_strength=3.2, body_strength=0.35):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    if hasattr(mat, 'use_raytrace_refraction'):
        mat.use_raytrace_refraction = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    # Translucent refractive gem glass body
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = crystal_color
    bsdf.inputs['Roughness'].default_value = 0.08
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['IOR'].default_value = 1.54
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.82
    elif 'Transmission' in bsdf.inputs:
        bsdf.inputs['Transmission'].default_value = 0.82
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.95
        
    # LayerWeight (Facing) driving rim / facet glow
    layer_weight = tree.nodes.new(type='ShaderNodeLayerWeight')
    layer_weight.inputs['Blend'].default_value = 0.28
    
    ramp = tree.nodes.new(type='ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = rim_color # Radiant outer facet bloom (saturated)
    ramp.color_ramp.elements[1].position = 0.60
    ramp.color_ramp.elements[1].color = crystal_color # Saturated gem body
    elem_cen = ramp.color_ramp.elements.new(0.95)
    elem_cen.color = (crystal_color[0]*0.25, crystal_color[1]*0.25, crystal_color[2]*0.25, 1.0)
    
    tree.links.new(layer_weight.outputs['Facing'], ramp.inputs['Fac'])
    
    # Invert Facing for strength multiplier
    math_inv = tree.nodes.new(type='ShaderNodeMath')
    math_inv.operation = 'SUBTRACT'
    math_inv.inputs[0].default_value = 1.0
    tree.links.new(layer_weight.outputs['Facing'], math_inv.inputs[1])
    
    math_scale = tree.nodes.new(type='ShaderNodeMath')
    math_scale.operation = 'MULTIPLY'
    math_scale.inputs[1].default_value = rim_strength
    tree.links.new(math_inv.outputs['Value'], math_scale.inputs[0])
    
    math_add = tree.nodes.new(type='ShaderNodeMath')
    math_add.operation = 'ADD'
    math_add.inputs[1].default_value = body_strength
    tree.links.new(math_scale.outputs['Value'], math_add.inputs[0])
    
    emit = tree.nodes.new(type='ShaderNodeEmission')
    tree.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    tree.links.new(math_add.outputs['Value'], emit.inputs['Strength'])
    
    add_sh = tree.nodes.new(type='ShaderNodeAddShader')
    tree.links.new(bsdf.outputs['BSDF'], add_sh.inputs[0])
    tree.links.new(emit.outputs['Emission'], add_sh.inputs[1])
    tree.links.new(add_sh.outputs['Shader'], out.inputs['Surface'])
    return mat

# --- CELESTIAL CRESCENT MOON SHADER (Item 3) ---
def create_crescent_moon_material(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    sep = tree.nodes.new(type='ShaderNodeSeparateXYZ')
    tree.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    
    # Gradient across moon body from inner cusp to outer rim
    map_x = tree.nodes.new(type='ShaderNodeMapRange')
    map_x.inputs['From Min'].default_value = -1.2
    map_x.inputs['From Max'].default_value = 4.5
    map_x.inputs['To Min'].default_value = 0.0
    map_x.inputs['To Max'].default_value = 1.0
    tree.links.new(sep.outputs['X'], map_x.inputs['Value'])
    
    ramp_body = tree.nodes.new(type='ShaderNodeValToRGB')
    ramp_body.color_ramp.elements[0].position = 0.05
    ramp_body.color_ramp.elements[0].color = (0.22, 0.28, 0.58, 1.0) # Astral deep periwinkle
    ramp_body.color_ramp.elements[1].position = 0.55
    ramp_body.color_ramp.elements[1].color = (0.58, 0.78, 0.96, 1.0) # Lunar cyan silver
    elem_rim = ramp_body.color_ramp.elements.new(0.92)
    elem_rim.color = (0.95, 0.98, 1.0, 1.0) # Radiant moonbeam white
    tree.links.new(map_x.outputs['Result'], ramp_body.inputs['Fac'])
    
    # LayerWeight for outer rim grazing bloom
    lw = tree.nodes.new(type='ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.22
    
    math_inv = tree.nodes.new(type='ShaderNodeMath')
    math_inv.operation = 'SUBTRACT'
    math_inv.inputs[0].default_value = 1.0
    tree.links.new(lw.outputs['Facing'], math_inv.inputs[1])
    
    math_scale = tree.nodes.new(type='ShaderNodeMath')
    math_scale.operation = 'MULTIPLY'
    math_scale.inputs[1].default_value = 2.8
    tree.links.new(math_inv.outputs['Value'], math_scale.inputs[0])
    
    math_total_emit = tree.nodes.new(type='ShaderNodeMath')
    math_total_emit.operation = 'ADD'
    math_total_emit.inputs[1].default_value = 1.6
    tree.links.new(math_scale.outputs['Value'], math_total_emit.inputs[0])
    
    emit = tree.nodes.new(type='ShaderNodeEmission')
    tree.links.new(ramp_body.outputs['Color'], emit.inputs['Color'])
    tree.links.new(math_total_emit.outputs['Value'], emit.inputs['Strength'])
    
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

# Instantiate Materials
mat_marble_floor = create_flagstone_marble_material('Mat_Marble_Floor')
mat_celestial_soil_moss = create_celestial_moss_material('Mat_Celestial_Soil_Moss')
mat_rock_crag = create_crag_stone_material('Mat_Rock_Crag')

mat_stone_dark = create_pbr_material('Mat_Stone_Dark', (0.12, 0.11, 0.18, 1.0), metallic=0.2, roughness=0.45)
mat_stone_trim = create_pbr_material('Mat_Stone_Trim', (0.18, 0.16, 0.25, 1.0), metallic=0.15, roughness=0.35)
mat_bronze = create_pbr_material('Mat_Bronze', (0.46, 0.35, 0.18, 1.0), metallic=0.88, roughness=0.28)
mat_sakura_canopy = create_pbr_material('Mat_Sakura_Canopy', (0.96, 0.58, 0.80, 1.0), metallic=0.02, roughness=0.45)
mat_emerald_canopy = create_pbr_material('Mat_Emerald_Canopy', (0.10, 0.42, 0.26, 1.0), metallic=0.02, roughness=0.55)
mat_wood = create_pbr_material('Mat_Wood', (0.11, 0.08, 0.05, 1.0), metallic=0.0, roughness=0.75)

# Glowing Emissive Crystal Materials (Fresnel / Layer Weight Rim Glow)
mat_amethyst_crystal = create_glowing_crystal_material('Mat_Amethyst_Crystal', crystal_color=(0.42, 0.05, 0.82, 1.0), rim_color=(0.88, 0.12, 1.0, 1.0), rim_strength=3.2, body_strength=0.35)
mat_cyan_crystal = create_glowing_crystal_material('Mat_Cyan_Crystal', crystal_color=(0.02, 0.72, 0.98, 1.0), rim_color=(0.0, 0.95, 1.0, 1.0), rim_strength=3.5, body_strength=0.40)
mat_magenta_crystal = create_glowing_crystal_material('Mat_Magenta_Crystal', crystal_color=(0.90, 0.08, 0.65, 1.0), rim_color=(1.0, 0.10, 0.70, 1.0), rim_strength=3.2, body_strength=0.35)

mat_neon_violet = create_pure_emission('Mat_Neon_Violet', (0.75, 0.18, 1.0, 1.0), strength=8.0)
mat_neon_cyan = create_pure_emission('Mat_Neon_Cyan', (0.0, 0.94, 1.0, 1.0), strength=8.0)
mat_neon_magenta = create_pure_emission('Mat_Neon_Magenta', (1.0, 0.10, 0.70, 1.0), strength=8.0)
mat_lantern_flame = create_pure_emission('Mat_Lantern_Flame', (1.0, 0.68, 0.20, 1.0), strength=5.0)
mat_moon_glow = create_crescent_moon_material('Mat_Moon_Glow')
mat_moon_ghost = create_pure_emission('Mat_Moon_Ghost', (0.06, 0.08, 0.20, 1.0), strength=0.6)
mat_sakura_petal = create_pure_emission('Mat_Sakura_Petal', (0.98, 0.65, 0.85, 1.0), strength=3.0)

# Textured Emissive Decals
mat_magic_floor = create_magic_emissive_material('Mat_Magic_Floor', img_floor, emission_fac=5.5)
mat_temple_seal = create_magic_emissive_material('Mat_Temple_Seal', img_temple, emission_fac=5.0)
mat_obelisk = create_magic_emissive_material('Mat_Obelisk', img_obelisk, emission_fac=6.0)

# Mesh helper functions
def add_cube(name, loc, scale, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

def add_cylinder(name, loc, radius, depth, rot=(0,0,0), mat=None, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

def add_plane(name, loc, scale, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

# 4. POINTED FACETED SINGLE CRYSTAL MESH
def create_single_crystal(name, loc, scale, rot_euler, mat=mat_amethyst_crystal, sides=6, h_body=1.0, h_top=1.8, h_bot=0.8):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    
    rx = 0.35 * scale[0]
    ry = 0.35 * scale[1]
    zb_top = h_body * scale[2]
    zb_bot = -h_bot * scale[2]
    zt_apex = h_top * scale[2]
    zb_apex = -(h_bot + 0.5) * scale[2]
    
    verts_top = []
    verts_bot = []
    for i in range(sides):
        th = 2 * pi * i / sides
        verts_top.append(bm.verts.new((rx * cos(th), ry * sin(th), zb_top)))
        verts_bot.append(bm.verts.new((rx * cos(th), ry * sin(th), zb_bot)))
        
    apex_t = bm.verts.new((0, 0, zt_apex))
    apex_b = bm.verts.new((0, 0, zb_apex))
    
    bm.verts.ensure_lookup_table()
    for i in range(sides):
        i_next = (i + 1) % sides
        bm.faces.new([verts_bot[i], verts_bot[i_next], verts_top[i_next], verts_top[i]])
        bm.faces.new([verts_top[i], verts_top[i_next], apex_t])
        bm.faces.new([verts_bot[i_next], verts_bot[i], apex_b])
        
    bm.to_mesh(mesh)
    bm.free()
    
    for p in mesh.polygons:
        p.use_smooth = False
        
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    return obj

# Realistic Mineral Geode / Crystal Cluster (Central tall spire + tightly nested companions)
def create_crystal_geode_cluster(base_name, center_loc, base_height=3.4, num_shards=4, mat=mat_amethyst_crystal, seed=101):
    random.seed(seed)
    cx, cy, cz = center_loc
    # Primary central crystal
    create_single_crystal(f"{base_name}_Center", (cx, cy, cz), (1.1, 1.1, base_height / 2.0), (radians(random.uniform(-4, 4)), radians(random.uniform(-4, 4)), radians(random.uniform(0, 360))), mat=mat)
    
    # Secondary companion crystals tightly clustered at base
    for i in range(num_shards):
        ang = 2 * pi * i / num_shards + random.uniform(-0.25, 0.25)
        dist = random.uniform(0.40, 0.65)
        px = cx + dist * cos(ang)
        py = cy + dist * sin(ang)
        h_factor = random.uniform(0.38, 0.68)
        tilt = radians(random.uniform(7, 14))
        rx = tilt * sin(ang)
        ry = -tilt * cos(ang)
        sub_mat = mat_cyan_crystal if (i == 1 and num_shards > 2) else mat
        create_single_crystal(f"{base_name}_Sub_{i}", (px, py, cz - 0.15), (0.65 * h_factor, 0.65 * h_factor, base_height * h_factor / 2.0), (rx, ry, radians(random.uniform(0, 360))), mat=sub_mat)

# 5. DUAL-MATERIAL ORGANIC SCULPTED FLOATING ISLAND GENERATOR (Item 5)
print(">>> Modeling Dual-Material Organic Sculpted Floating Islands...")
def create_organic_floating_island(name, loc, rx=3.5, ry=3.0, depth=6.5, seed=42, mat_soil=mat_celestial_soil_moss, mat_crag=mat_rock_crag):
    random.seed(seed)
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    segments = 24
    
    # Tier 0: Center mound
    center_top = bm.verts.new((0, 0, 0.35))
    
    # Tier 1: Inner plateau ring
    rim1_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        var = 0.85 + 0.25 * sin(th * 2 + seed) + 0.15 * cos(th * 3)
        x = rx * 0.75 * var * cos(th)
        y = ry * 0.75 * var * sin(th)
        z = 0.15 + 0.08 * sin(th * 4)
        rim1_verts.append(bm.verts.new((x, y, z)))
        
    # Tier 2: Outer plateau cliff rim
    rim2_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        var = 0.90 + 0.20 * cos(th * 3 + seed) + 0.12 * sin(th * 5)
        x = rx * var * cos(th)
        y = ry * var * sin(th)
        z = -0.35 + 0.12 * cos(th * 2)
        rim2_verts.append(bm.verts.new((x, y, z)))
        
    # Tier 3: Upper crag shelf
    rim3_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        var = 0.75 + 0.18 * sin(th * 3 + 1)
        x = rx * 0.75 * var * cos(th)
        y = ry * 0.75 * var * sin(th)
        z = -depth * 0.28 + 0.25 * sin(th * 3)
        rim3_verts.append(bm.verts.new((x, y, z)))
        
    # Tier 4: Mid crag taper
    rim4_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        var = 0.50 + 0.20 * cos(th * 2 + 2)
        x = rx * 0.45 * var * cos(th)
        y = ry * 0.45 * var * sin(th)
        z = -depth * 0.62 + 0.35 * cos(th * 2)
        rim4_verts.append(bm.verts.new((x, y, z)))
        
    # Tier 5: Bottom stalactite tip
    bottom_tip = bm.verts.new((0.15 * cos(seed), 0.15 * sin(seed), -depth))
    
    bm.verts.ensure_lookup_table()
    for i in range(segments):
        i_next = (i + 1) % segments
        # Top plateau (Slot 0: celestial moss/soil)
        f0 = bm.faces.new([center_top, rim1_verts[i], rim1_verts[i_next]])
        f0.material_index = 0
        f1 = bm.faces.new([rim1_verts[i], rim2_verts[i], rim2_verts[i_next], rim1_verts[i_next]])
        f1.material_index = 0
        
        # Lower crags & stalactite underbody (Slot 1: dark crag basalt)
        f2 = bm.faces.new([rim2_verts[i], rim3_verts[i], rim3_verts[i_next], rim2_verts[i_next]])
        f2.material_index = 1
        f3 = bm.faces.new([rim3_verts[i], rim4_verts[i], rim4_verts[i_next], rim3_verts[i_next]])
        f3.material_index = 1
        f4 = bm.faces.new([rim4_verts[i], bottom_tip, rim4_verts[i_next]])
        f4.material_index = 1
        
    bm.to_mesh(mesh)
    bm.free()
    
    for p in mesh.polygons:
        p.use_smooth = False
        
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.data.materials.append(mat_soil) # Slot 0
    obj.data.materials.append(mat_crag) # Slot 1
    return obj

# 6. AUTHENTIC JAPANESE CLOUD BONSAI TREE GENERATOR
def create_branch_segment(name, pts, radii, mat=mat_wood):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    sides = 10
    rings = []
    for pt, r in zip(pts, radii):
        x, y, z = pt
        ring = [bm.verts.new((x + r * cos(2 * pi * i / sides), y + r * sin(2 * pi * i / sides), z)) for i in range(sides)]
        rings.append(ring)
        
    bm.verts.ensure_lookup_table()
    for j in range(len(rings) - 1):
        for i in range(sides):
            i_next = (i + 1) % sides
            bm.faces.new([rings[j][i], rings[j][i_next], rings[j+1][i_next], rings[j+1][i]])
            
    bot_c = bm.verts.new(pts[0])
    top_c = bm.verts.new(pts[-1])
    for i in range(sides):
        i_next = (i + 1) % sides
        bm.faces.new([bot_c, rings[0][i_next], rings[0][i]])
        bm.faces.new([top_c, rings[-1][i], rings[-1][i_next]])
        
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons: p.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat: obj.data.materials.append(mat)
    return obj

def create_cloud_canopy(name, loc, scale=(1.2, 1.0, 0.45), mat=mat_sakura_canopy):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    for p in obj.data.polygons: p.use_smooth = True
    if mat: obj.data.materials.append(mat)
    return obj

def create_celestial_bonsai_tree(name, loc, scale=1.0, foliage_mat=mat_sakura_canopy):
    lx, ly, lz = loc
    pts_main = [
        (lx, ly, lz),
        (lx + 0.15 * scale, ly + 0.10 * scale, lz + 0.6 * scale),
        (lx + 0.40 * scale, ly + 0.22 * scale, lz + 1.2 * scale),
        (lx + 0.55 * scale, ly + 0.12 * scale, lz + 1.8 * scale),
        (lx + 0.60 * scale, ly - 0.08 * scale, lz + 2.3 * scale)
    ]
    radii_main = [0.28 * scale, 0.22 * scale, 0.17 * scale, 0.12 * scale, 0.09 * scale]
    create_branch_segment(f"{name}_Trunk_Main", pts_main, radii_main, mat=mat_wood)
    
    pts_side = [
        (lx + 0.40 * scale, ly + 0.22 * scale, lz + 1.2 * scale),
        (lx + 0.75 * scale, ly + 0.48 * scale, lz + 1.5 * scale),
        (lx + 1.10 * scale, ly + 0.60 * scale, lz + 1.65 * scale)
    ]
    radii_side = [0.13 * scale, 0.09 * scale, 0.05 * scale]
    create_branch_segment(f"{name}_Branch_Side", pts_side, radii_side, mat=mat_wood)
    
    create_cloud_canopy(f"{name}_Canopy_Apex", (lx + 0.60 * scale, ly - 0.08 * scale, lz + 2.5 * scale), scale=(1.15 * scale, 0.95 * scale, 0.45 * scale), mat=foliage_mat)
    create_cloud_canopy(f"{name}_Canopy_Side", (lx + 1.20 * scale, ly + 0.65 * scale, lz + 1.75 * scale), scale=(0.95 * scale, 0.80 * scale, 0.38 * scale), mat=foliage_mat)
    create_cloud_canopy(f"{name}_Canopy_Mid", (lx + 0.30 * scale, ly + 0.05 * scale, lz + 2.05 * scale), scale=(0.85 * scale, 0.75 * scale, 0.35 * scale), mat=foliage_mat)

# 7. MATHEMATICAL 3D CELESTIAL CRESCENT MOON (Item 3)
print(">>> Modeling Mathematical 3D Celestial Crescent Moon...")
def create_3d_crescent_moon(name, loc, R=4.5, d=3.1, depth=0.9, rot_euler=(0, radians(-18), 0), mat=mat_moon_glow):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    r_in = sqrt(d * d + R * R)
    alpha = asin(R / r_in)
    steps = 48
    
    verts_out_f, verts_in_f = [], []
    verts_out_b, verts_in_b = [], []
    
    for i in range(steps + 1):
        t = -1.0 + 2.0 * (i / steps)
        th = (pi / 2.0) * t
        xo = R * cos(th)
        zo = R * sin(th)
        
        phi = alpha * t
        xi = r_in * cos(phi) - d
        zi = r_in * sin(phi)
        
        verts_out_f.append(bm.verts.new((xo, depth / 2.0, zo)))
        verts_out_b.append(bm.verts.new((xo, -depth / 2.0, zo)))
        verts_in_f.append(bm.verts.new((xi, depth / 2.0, zi)))
        verts_in_b.append(bm.verts.new((xi, -depth / 2.0, zi)))
        
    bm.verts.ensure_lookup_table()
    for i in range(steps):
        bm.faces.new([verts_out_f[i], verts_out_f[i+1], verts_in_f[i+1], verts_in_f[i]])
        bm.faces.new([verts_out_b[i+1], verts_out_b[i], verts_in_b[i], verts_in_b[i+1]])
        bm.faces.new([verts_out_f[i], verts_out_b[i], verts_out_b[i+1], verts_out_f[i+1]])
        bm.faces.new([verts_in_f[i+1], verts_in_b[i+1], verts_in_b[i], verts_in_f[i]])
        
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons: p.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot_euler
    if mat: obj.data.materials.append(mat)
    return obj

# Crescent moon + subtle ethereal ghost sphere of full moon behind crescent
create_3d_crescent_moon('Celestial_Crescent_Moon', (7.8, 27.0, 9.4), R=4.5, d=3.1, depth=0.9, rot_euler=(radians(8), radians(-18), radians(-10)))

bpy.ops.mesh.primitive_uv_sphere_add(radius=4.40, location=(6.4, 27.2, 9.4), segments=32, ring_count=16)
ghost_moon = bpy.context.active_object
ghost_moon.name = 'Celestial_Moon_Ghost_Sphere'
ghost_moon.scale = (1.0, 0.05, 1.0)
ghost_moon.rotation_euler = (radians(8), radians(-18), radians(-10))
bpy.ops.object.transform_apply(scale=True)
ghost_moon.data.materials.append(mat_moon_ghost)

# 8. CENTRAL COMBAT ARENA PLATFORM (18m x 7.2m)
print(">>> Constructing Floating Marble Arena Deck & Magic Seals...")
add_cube('Arena_Base_Slab', (0.0, 0.0, 0.15), (18.4, 7.6, 0.30), mat_stone_trim)
add_cube('Arena_Upper_Deck', (0.0, 0.0, 0.32), (18.0, 7.2, 0.15), mat_marble_floor)

# Outer Neon Border
add_cube('Neon_Rim_Outer_F_L', (-5.5, -3.65, 0.38), (7.0, 0.08, 0.05), mat_neon_violet)
add_cube('Neon_Rim_Outer_F_R', (6.5, -3.65, 0.38), (5.0, 0.08, 0.05), mat_neon_violet)
add_cube('Neon_Rim_Outer_B', (0.0, 3.65, 0.38), (18.2, 0.08, 0.05), mat_neon_violet)
add_cube('Neon_Rim_Outer_L', (-9.05, 0.0, 0.38), (0.08, 7.4, 0.05), mat_neon_violet)
add_cube('Neon_Rim_Outer_R', (9.05, 0.0, 0.38), (0.08, 7.4, 0.05), mat_neon_violet)

# Inner Magenta Inset Channel
add_cube('Neon_Rim_Inner_F', (0.0, -3.2, 0.39), (17.2, 0.04, 0.02), mat_neon_magenta)
add_cube('Neon_Rim_Inner_B', (0.0, 3.2, 0.39), (17.2, 0.04, 0.02), mat_neon_magenta)
add_cube('Neon_Rim_Inner_L', (-8.55, 0.0, 0.39), (0.04, 6.4, 0.02), mat_neon_magenta)
add_cube('Neon_Rim_Inner_R', (8.55, 0.0, 0.39), (0.04, 6.4, 0.02), mat_neon_magenta)

# Top Deck Magic Summoning Texture Overlay Plane with Flagstone Underlay
add_plane('Arena_Magic_Floor_Plane', (0.0, 0.0, 0.405), (17.8, 7.0, 1.0), mat=mat_magic_floor)

# Arena Underside Crag
def create_arena_underside_crag(name, top_loc, top_size, depth, mat=mat_rock_crag):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    wx, wy = top_size[0] / 2.0, top_size[1] / 2.0
    segments = 20
    top_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        rx = wx * (0.88 + 0.12 * cos(th * 3))
        ry = wy * (0.88 + 0.12 * sin(th * 2))
        top_verts.append(bm.verts.new((rx * cos(th), ry * sin(th), 0.0)))
    
    mid_verts = []
    for i in range(segments):
        th = 2 * pi * i / segments
        rx = wx * 0.65 * (0.85 + 0.15 * sin(th * 4))
        ry = wy * 0.65 * (0.85 + 0.15 * cos(th * 3))
        mid_verts.append(bm.verts.new((rx * cos(th), ry * sin(th), -depth * 0.45)))
        
    bottom_tip = bm.verts.new((0.0, 0.0, -depth))
    bm.verts.ensure_lookup_table()
    for i in range(segments):
        i_next = (i + 1) % segments
        bm.faces.new([top_verts[i], top_verts[i_next], mid_verts[i_next], mid_verts[i]])
        bm.faces.new([mid_verts[i], mid_verts[i_next], bottom_tip])
        
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons: p.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = top_loc
    if mat: obj.data.materials.append(mat)
    return obj

create_arena_underside_crag('Arena_Rock_Underside', (0.0, 0.0, 0.0), (18.0, 7.2), depth=14.0)

# Natural hanging crystal clusters under platform
for i, (cx, cy, cz) in enumerate([(-6.8, -1.2, -3.2), (-4.0, 1.8, -4.5), (0.0, -2.0, -5.8), (4.0, 1.5, -4.6), (6.5, -1.0, -3.4)]):
    create_single_crystal(f'Underside_Amethyst_{i}', (cx, cy, cz), (0.9, 0.9, 1.4), (radians(20), radians(-12 * i), radians(40 * i)), mat=mat_amethyst_crystal)
    create_single_crystal(f'Underside_Cyan_{i}', (cx + 0.5, cy + 0.3, cz - 0.3), (0.6, 0.6, 1.0), (radians(-30), radians(15), radians(55)), mat=mat_cyan_crystal)

# 9. STONE BALUSTRADES & ORNATE CORNER PEDESTAL LANTERNS (Item 6)
print(">>> Modeling Balustrades & Refined Pagoda Pedestal Lanterns...")
def create_balustrade(name, p_start, p_end):
    dx, dy = p_end[0] - p_start[0], p_end[1] - p_start[1]
    length = math.hypot(dx, dy)
    angle = math.atan2(dy, dx)
    cx, cy = (p_start[0] + p_end[0]) / 2.0, (p_start[1] + p_end[1]) / 2.0
    top_rail = add_cube(f'{name}_Top', (cx, cy, 1.15), (length, 0.18, 0.12), mat_stone_trim)
    top_rail.rotation_euler = (0, 0, angle)
    bot_rail = add_cube(f'{name}_Bot', (cx, cy, 0.48), (length, 0.22, 0.14), mat_stone_trim)
    bot_rail.rotation_euler = (0, 0, angle)
    num_posts = max(2, int(length / 0.85) + 1)
    for i in range(num_posts):
        t = i / (num_posts - 1)
        px = p_start[0] + dx * t
        py = p_start[1] + dy * t
        add_cylinder(f'{name}_Baluster_{i}', (px, py, 0.82), radius=0.08, depth=0.58, mat=mat_stone_dark, vertices=12)

create_balustrade('Balustrade_Left', (-8.9, -3.5), (-8.9, 3.5))
create_balustrade('Balustrade_Right', (8.9, -3.5), (8.9, 3.5))
create_balustrade('Balustrade_Rear_L', (-8.9, 3.55), (-3.2, 3.55))
create_balustrade('Balustrade_Rear_R', (3.2, 3.55), (8.9, 3.55))

# Front balustrade sections flanking central stairs
create_balustrade('Balustrade_Front_L', (-8.9, -3.55), (-3.6, -3.55))
create_balustrade('Balustrade_Front_R', (6.2, -3.55), (8.9, -3.55))

# Refined Authentic Pagoda Pedestal Lantern with warm golden radiance (calibrated energy)
def create_pedestal_lantern(name, loc, light_energy=55):
    x, y, z = loc
    # Stepped square stone foundation
    add_cube(f'{name}_Base_Plinth', (x, y, z + 0.15), (0.70, 0.70, 0.30), mat_stone_dark)
    add_cube(f'{name}_Shaft', (x, y, z + 0.55), (0.50, 0.50, 0.50), mat_stone_trim)
    add_cube(f'{name}_Bracket_Capital', (x, y, z + 0.88), (0.64, 0.64, 0.16), mat_stone_dark)
    
    # Fire cage with bronze corner posts
    for cx_sign in [-1, 1]:
        for cy_sign in [-1, 1]:
            add_cylinder(f'{name}_Post_{cx_sign}_{cy_sign}', (x + cx_sign*0.18, y + cy_sign*0.18, z + 1.20), radius=0.035, depth=0.50, mat=mat_bronze, vertices=8)
            
    # Glowing warm flame core
    add_cube(f'{name}_Flame', (x, y, z + 1.20), (0.24, 0.24, 0.32), mat_lantern_flame)
    
    # Pagoda tiered hip roof with flared eaves
    add_cube(f'{name}_Eaves_Tier1', (x, y, z + 1.50), (0.78, 0.78, 0.10), mat_stone_trim)
    add_cube(f'{name}_Eaves_Tier2', (x, y, z + 1.60), (0.54, 0.54, 0.10), mat_stone_dark)
    add_cylinder(f'{name}_Finial_Orb', (x, y, z + 1.72), radius=0.08, depth=0.14, mat=mat_bronze, vertices=12)
    
    # Atmospheric warm amber point light
    p_light = bpy.data.lights.new(name=f'{name}_Light', type='POINT')
    p_light.energy = light_energy
    p_light.color = (1.0, 0.72, 0.28)
    if hasattr(p_light, 'shadow_soft_size'): p_light.shadow_soft_size = 0.55
    obj_l = bpy.data.objects.new(f'{name}_Light', p_light)
    obj_l.location = (x, y, z + 1.20)
    bpy.context.collection.objects.link(obj_l)

for p_loc in [(-8.9, -3.5, 0.3), (-8.9, 3.55, 0.3), (8.9, -3.5, 0.3), (8.9, 3.55, 0.3), (-3.2, 3.55, 0.3), (3.2, 3.55, 0.3)]:
    create_pedestal_lantern(f'Lantern_{p_loc[0]}_{p_loc[1]}', p_loc, light_energy=50)

# 10. REFINED FLANKING MONOLITH RUNE PILLARS & CRYSTAL CROWNS (Item 6)
print(">>> Adding Refined Flanking Monolith Rune Pillars with Glowing Runes...")
def create_rune_monolith(name, loc, height=3.2, mat_body=mat_obelisk, crystal_mat=mat_cyan_crystal):
    x, y, z = loc
    # Stepped double plinth
    add_cube(f'{name}_Plinth_Lower', (x, y, z + 0.18), (1.10, 1.10, 0.36), mat_stone_dark)
    add_cube(f'{name}_Plinth_Upper', (x, y, z + 0.44), (0.92, 0.92, 0.20), mat_stone_trim)
    
    # Column body with glowing carved runes
    add_cube(f'{name}_Body', (x, y, z + 0.54 + height/2.0), (0.72, 0.72, height), mat_body)
    
    # Capital cornice & pyramidal apex
    add_cube(f'{name}_Collar', (x, y, z + 0.54 + height + 0.10), (0.84, 0.84, 0.20), mat_stone_trim)
    add_cube(f'{name}_Cornice', (x, y, z + 0.54 + height + 0.25), (0.98, 0.98, 0.12), mat_stone_dark)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.60, depth=0.55, location=(x, y, z + 0.54 + height + 0.58), rotation=(0,0,radians(45)))
    c_obj = bpy.context.active_object
    c_obj.name = f'{name}_Cap'
    c_obj.data.materials.append(mat_stone_dark)
    
    # Floating crown crystal gem (no internal light blowout)
    if crystal_mat:
        create_single_crystal(f'{name}_Crown_Gem', (x, y, z + 0.54 + height + 1.15), (0.50, 0.50, 0.80), (0, 0, radians(22)), mat=crystal_mat)

# Left stage side rune monolith
create_rune_monolith('Left_Stage_Monolith', (-8.8, 1.2, 0.4), height=2.8, mat_body=mat_obelisk, crystal_mat=mat_cyan_crystal)

# Right stage side rune monoliths
create_rune_monolith('Right_Stage_Monolith_1', (8.8, 1.2, 0.4), height=2.8, mat_body=mat_obelisk, crystal_mat=mat_cyan_crystal)
create_rune_monolith('Right_Stage_Monolith_2', (8.8, -1.5, 0.4), height=2.4, mat_body=mat_obelisk, crystal_mat=mat_amethyst_crystal)
create_crystal_geode_cluster('Right_Side_Crystals', (8.7, -0.1, 0.45), base_height=1.8, num_shards=3, mat=mat_cyan_crystal, seed=77)

# 11. GRAND FRONT STAIRCASE & SEMICIRCULAR BALCONY
print(">>> Modeling Grand Front Staircase & Semicircular Balcony...")
num_front_steps = 7
for s in range(num_front_steps):
    sy = -3.7 - s * 0.75
    sz = 0.30 - s * 0.45
    sw = 5.2 + s * 0.35
    add_cube(f'Front_Step_{s}', (0.0, sy, sz), (sw, 0.78, 0.46), mat_marble_floor)

# Semicircular landing dais on front stairs
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=2.5, depth=0.35, location=(0.0, -3.9, 0.15))
mid_dais = bpy.context.active_object
mid_dais.name = 'Front_Mid_Dais'
mid_dais.data.materials.append(mat_stone_trim)
add_plane('Front_Mid_Seal', (0.0, -3.9, 0.34), (2.2, 2.2, 1.0), mat=mat_temple_seal)

# Front semicircular balcony curved balustrades
def create_curved_balustrade(name, center_xy, radius, a_start, a_end, z_base, num_balusters=5):
    cx, cy = center_xy
    d_ang = a_end - a_start
    segs = 16
    wr = 0.14
    hr = 0.10
    for s in range(segs):
        t0 = s / segs
        t1 = (s + 1) / segs
        ang0 = a_start + d_ang * t0
        ang1 = a_start + d_ang * t1
        
        x0, y0 = cx + radius * cos(ang0), cy + radius * sin(ang0)
        x1, y1 = cx + radius * cos(ang1), cy + radius * sin(ang1)
        
        mx, my = (x0 + x1) / 2.0, (y0 + y1) / 2.0
        seg_len = math.hypot(x1 - x0, y1 - y0)
        seg_ang = math.atan2(y1 - y0, x1 - x0)
        
        top_cube = add_cube(f"{name}_TopSeg_{s}", (mx, my, z_base + 0.85), (seg_len, wr, hr), mat_stone_trim)
        top_cube.rotation_euler = (0, 0, seg_ang)
        bot_cube = add_cube(f"{name}_BotSeg_{s}", (mx, my, z_base + 0.18), (seg_len, wr*1.1, hr*1.2), mat_stone_trim)
        bot_cube.rotation_euler = (0, 0, seg_ang)
        
    for i in range(num_balusters):
        ti = i / (num_balusters - 1)
        ai = a_start + d_ang * ti
        bx = cx + radius * cos(ai)
        by = cy + radius * sin(ai)
        add_cylinder(f"{name}_Baluster_{i}", (bx, by, z_base + 0.52), radius=0.07, depth=0.55, mat=mat_stone_dark, vertices=10)

# Curved balustrade wings on front mid dais
create_curved_balustrade('Balustrade_MidDais_L', (0.0, -3.9), 2.5, radians(185), radians(235), 0.15, num_balusters=4)
create_curved_balustrade('Balustrade_MidDais_R', (0.0, -3.9), 2.5, radians(305), radians(355), 0.15, num_balusters=4)

# Mid dais side lanterns (flanking balcony corners)
create_pedestal_lantern('Lantern_Front_Mid_L', (-2.4, -4.5, 0.15), light_energy=45)
create_pedestal_lantern('Lantern_Front_Mid_R', (2.4, -4.5, 0.15), light_energy=45)

# Lower grand landing dais
add_cube('Front_Landing_Dais', (0.0, -8.6, -3.0), (7.5, 2.2, 0.4), mat_stone_trim)
add_plane('Front_Landing_Seal', (0.0, -8.6, -2.78), (2.1, 2.1, 1.0), mat=mat_temple_seal)
create_pedestal_lantern('Lantern_Front_Bottom_L', (-3.4, -8.6, -2.9), light_energy=40)
create_pedestal_lantern('Lantern_Front_Bottom_R', (3.4, -8.6, -2.9), light_energy=40)

# 12. ELEGANT CURVED SIDE STAIRCASE ON RIGHT FLANK (Item 1)
print(">>> Constructing Elegant Curved Stone Staircase on Right Flank with Continuous Sloping Rails...")
def create_curved_flank_staircase(base_name, center_xy, r_in, r_out, a_start_deg, a_end_deg, z_top, z_bot, num_steps=11):
    cx, cy = center_xy
    a_start = radians(a_start_deg)
    a_end = radians(a_end_deg)
    total_ang = a_end - a_start
    total_dz = z_bot - z_top
    
    # 1. Treads
    for s in range(num_steps):
        t0 = s / num_steps
        t1 = (s + 1) / num_steps
        ang0 = a_start + total_ang * t0
        ang1 = a_start + total_ang * t1
        z_tread = z_top + total_dz * t0
        step_thick = abs(total_dz / num_steps) * 1.5
        
        mesh = bpy.data.meshes.new(f"{base_name}_Step_{s}")
        bm = bmesh.new()
        
        v_in0 = bm.verts.new((cx + r_in * cos(ang0), cy + r_in * sin(ang0), z_tread))
        v_in1 = bm.verts.new((cx + r_in * cos(ang1), cy + r_in * sin(ang1), z_tread))
        v_out0 = bm.verts.new((cx + r_out * cos(ang0), cy + r_out * sin(ang0), z_tread))
        v_out1 = bm.verts.new((cx + r_out * cos(ang1), cy + r_out * sin(ang1), z_tread))
        
        v_in0_b = bm.verts.new((cx + r_in * cos(ang0), cy + r_in * sin(ang0), z_tread - step_thick))
        v_in1_b = bm.verts.new((cx + r_in * cos(ang1), cy + r_in * sin(ang1), z_tread - step_thick))
        v_out0_b = bm.verts.new((cx + r_out * cos(ang0), cy + r_out * sin(ang0), z_tread - step_thick))
        v_out1_b = bm.verts.new((cx + r_out * cos(ang1), cy + r_out * sin(ang1), z_tread - step_thick))
        
        bm.verts.ensure_lookup_table()
        bm.faces.new([v_in0, v_out0, v_out1, v_in1])
        bm.faces.new([v_in0_b, v_in1_b, v_out1_b, v_out0_b])
        bm.faces.new([v_in1, v_out1, v_out1_b, v_in1_b])
        bm.faces.new([v_in0, v_in0_b, v_out0_b, v_out0])
        bm.faces.new([v_in0, v_in1, v_in1_b, v_in0_b])
        bm.faces.new([v_out0, v_out0_b, v_out1_b, v_out1])
        
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons: p.use_smooth = False
        step_obj = bpy.data.objects.new(f"{base_name}_Step_{s}", mesh)
        bpy.context.collection.objects.link(step_obj)
        step_obj.data.materials.append(mat_marble_floor)
        
        # Outer baluster post standing on this step
        r_bal = r_out - 0.12
        bx = cx + r_bal * cos(ang0)
        by = cy + r_bal * sin(ang0)
        add_cylinder(f"{base_name}_Baluster_{s}", (bx, by, z_tread + 0.45), radius=0.07, depth=0.60, mat=mat_stone_dark, vertices=10)

    # 2. Continuous Sloping Curved Handrail & Bottom Rail
    r_rail = r_out - 0.12
    rail_segs = num_steps * 3
    for k in range(rail_segs):
        tk0 = k / rail_segs
        tk1 = (k + 1) / rail_segs
        a0 = a_start + total_ang * tk0
        a1 = a_start + total_ang * tk1
        z0 = z_top + total_dz * tk0
        z1 = z_top + total_dz * tk1
        
        p0x, p0y = cx + r_rail * cos(a0), cy + r_rail * sin(a0)
        p1x, p1y = cx + r_rail * cos(a1), cy + r_rail * sin(a1)
        
        dx, dy, dz = p1x - p0x, p1y - p0y, z1 - z0
        seg_len_2d = math.hypot(dx, dy)
        seg_len_3d = math.hypot(seg_len_2d, dz)
        
        yaw = math.atan2(dy, dx)
        pitch = -math.atan2(dz, seg_len_2d)
        
        mx = (p0x + p1x) / 2.0
        my = (p0y + p1y) / 2.0
        mz = (z0 + z1) / 2.0
        
        top_cube = add_cube(f"{base_name}_TopRail_{k}", (mx, my, mz + 0.80), (seg_len_3d, 0.16, 0.10), mat_stone_trim)
        top_cube.rotation_euler = (0, pitch, yaw)
        
        bot_cube = add_cube(f"{base_name}_BotRail_{k}", (mx, my, mz + 0.15), (seg_len_3d, 0.20, 0.10), mat_stone_trim)
        bot_cube.rotation_euler = (0, pitch, yaw)

# Build curved side staircase sweeping down right flank
create_curved_flank_staircase('Curved_Stairs_Right', center_xy=(2.2, -6.5), r_in=1.6, r_out=3.5, a_start_deg=55.0, a_end_deg=-35.0, z_top=0.32, z_bot=-2.65, num_steps=11)

# Bottom newel post & lantern for curved stairs
curved_bottom_ang = radians(-35.0)
curved_bot_x = 2.2 + 3.5 * cos(curved_bottom_ang)
curved_bot_y = -6.5 + 3.5 * sin(curved_bottom_ang)
create_pedestal_lantern('Lantern_Curved_Stairs_Bottom', (curved_bot_x, curved_bot_y, -2.65), light_energy=40)

# 13. REAR ELEVATED ASTRAL TEMPLE PAVILION & ARCHWAY
print(">>> Constructing Rear Elevated Temple Pavilion, Classical Archway & Colonnade...")
for s in range(5):
    sy = 3.8 + s * 0.65
    sz = 0.45 + s * 0.32
    add_cube(f'Rear_Step_{s}', (0.0, sy, sz), (4.8, 0.68, 0.34), mat_marble_floor)

bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=5.8, depth=0.42, location=(0.0, 11.5, 1.8))
terrace = bpy.context.active_object
terrace.name = 'Temple_Terrace_Deck'
terrace.data.materials.append(mat_marble_floor)

add_plane('Temple_Seal_Plane', (0.0, 11.5, 2.02), (4.8, 4.8, 1.0), mat=mat_temple_seal)

# Curved balustrades on temple circular terrace
create_curved_balustrade('Balustrade_Temple_L', (0.0, 11.5), 5.6, radians(185), radians(245), 1.8, num_balusters=5)
create_curved_balustrade('Balustrade_Temple_R', (0.0, 11.5), 5.6, radians(295), radians(355), 1.8, num_balusters=5)

# Temple Colonnade (flanking circular terrace)
col_rad = 4.8
num_cols = 6
for c in range(num_cols):
    ang = pi * (0.15 + 0.70 * c / (num_cols - 1))
    cx = col_rad * cos(ang)
    cy = 11.5 + col_rad * sin(ang)
    add_cube(f'Temple_Col_Base_{c}', (cx, cy, 2.2), (0.95, 0.95, 0.4), mat_stone_dark)
    add_cylinder(f'Temple_Col_Shaft_{c}', (cx, cy, 5.2), radius=0.42, depth=5.6, mat=mat_marble_floor, vertices=18)
    add_cube(f'Temple_Col_Cap_{c}', (cx, cy, 8.1), (0.98, 0.98, 0.4), mat_stone_trim)

add_cylinder('Temple_Entablature_Ring', (0.0, 11.5, 8.4), radius=col_rad, depth=0.45, mat=mat_stone_dark, vertices=36)

# Central Classical Monumental Archway
print(">>> Constructing Classical Curved Temple Archway...")
add_cube('Temple_Arch_Col_L', (-2.2, 9.2, 5.4), (0.90, 0.90, 6.6), mat_stone_dark)
add_cube('Temple_Arch_Col_R', (2.2, 9.2, 5.4), (0.90, 0.90, 6.6), mat_stone_dark)

# Semicircular Classical Arch Mesh
def create_semicircular_arch(name, center_xyz, r_inner, r_outer, depth_y, mat=mat_stone_trim):
    cx, cy, cz = center_xyz
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    segs = 24
    
    verts_in_f, verts_out_f = [], []
    verts_in_b, verts_out_b = [], []
    
    for i in range(segs + 1):
        th = pi * i / segs
        xi = cx + r_inner * cos(th)
        zi = cz + r_inner * sin(th)
        xo = cx + r_outer * cos(th)
        zo = cz + r_outer * sin(th)
        
        verts_in_f.append(bm.verts.new((xi, cy - depth_y/2.0, zi)))
        verts_in_b.append(bm.verts.new((xi, cy + depth_y/2.0, zi)))
        verts_out_f.append(bm.verts.new((xo, cy - depth_y/2.0, zo)))
        verts_out_b.append(bm.verts.new((xo, cy + depth_y/2.0, zo)))
        
    bm.verts.ensure_lookup_table()
    for i in range(segs):
        bm.faces.new([verts_in_f[i], verts_out_f[i], verts_out_f[i+1], verts_in_f[i+1]])
        bm.faces.new([verts_in_b[i+1], verts_out_b[i+1], verts_out_b[i], verts_in_b[i]])
        bm.faces.new([verts_out_f[i], verts_out_b[i], verts_out_b[i+1], verts_out_f[i+1]])
        bm.faces.new([verts_in_f[i+1], verts_in_b[i+1], verts_in_b[i], verts_in_f[i]])
        
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons: p.use_smooth = False
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat: obj.data.materials.append(mat)
    return obj

create_semicircular_arch('Temple_Arch_Curved_Vault', (0.0, 9.2, 8.4), r_inner=1.75, r_outer=2.45, depth_y=0.85, mat=mat_stone_trim)

add_cube('Temple_Arch_Lintel', (0.0, 9.2, 9.2), (5.4, 0.95, 0.55), mat_stone_dark)

bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=3.0, depth=1.5, location=(0.0, 9.2, 10.1), rotation=(0, 0, radians(45)))
pediment = bpy.context.active_object
pediment.name = 'Temple_Pediment_Peak'
pediment.scale = (1.0, 0.45, 1.0)
bpy.ops.object.transform_apply(scale=True)
pediment.data.materials.append(mat_stone_dark)

# Cyan Faceted Gem Crystal Pendant & Bronze Chain hanging from arch
create_single_crystal('Temple_Arch_Pendant', (0.0, 9.2, 7.8), (0.75, 0.75, 1.8), (0, 0, radians(15)), mat=mat_cyan_crystal)
add_cylinder('Pendant_Chain', (0.0, 9.2, 8.8), radius=0.035, depth=0.85, mat=mat_bronze)

# Small amethyst diamond inset on pediment
create_single_crystal('Pediment_Amethyst_Gem', (0.0, 8.95, 9.8), (0.42, 0.42, 0.75), (radians(45), 0, 0), mat=mat_amethyst_crystal)

# 4 Temple Stairs Obelisks
obelisk_coords = [(-3.2, 5.5), (-5.8, 8.0), (3.2, 5.5), (5.8, 8.0)]
for i, (ox, oy) in enumerate(obelisk_coords):
    create_rune_monolith(f'Temple_Obelisk_{i}', (ox, oy, 0.8), height=2.6, crystal_mat=mat_cyan_crystal if i % 2 == 0 else mat_amethyst_crystal)

# 14. REALISTIC 360-DEGREE SURROUNDINGS (Dual-Material Floating Islands, Mineral Geodes & Sakura Tree)
print(">>> Constructing Dual-Material Floating Islands & Natural Geodes...")

# --- LEFT FLANK PRIMARY ISLAND: The Amethyst Geode Sanctuary ---
create_organic_floating_island('Island_Left_Primary', (-13.2, 4.5, 3.2), rx=3.8, ry=3.4, depth=7.0, seed=42)
create_crystal_geode_cluster('Left_Geode_Main', (-13.2, 4.5, 3.6), base_height=4.0, num_shards=5, mat=mat_amethyst_crystal, seed=12)
create_single_crystal('Left_Hanging_Cyan_1', (-13.0, 4.8, -0.5), (0.55, 0.55, 1.0), (radians(15), radians(-10), radians(30)), mat=mat_cyan_crystal)
create_single_crystal('Left_Hanging_Cyan_2', (-13.5, 4.2, -1.2), (0.45, 0.45, 0.8), (radians(-20), radians(15), radians(-40)), mat=mat_cyan_crystal)

# Left Forward Satellite Rock
create_organic_floating_island('Island_Left_Forward', (-12.8, -6.5, -2.5), rx=2.6, ry=2.3, depth=4.8, seed=67)
create_crystal_geode_cluster('Left_Forward_Geode', (-12.8, -6.5, -2.3), base_height=2.4, num_shards=3, mat=mat_amethyst_crystal, seed=44)
create_pedestal_lantern('Lantern_Island_Left', (-13.2, -6.0, -2.4), light_energy=35)

# Left Distant High Asteroid
create_organic_floating_island('Island_Left_High', (-17.5, 15.0, 8.5), rx=3.0, ry=2.6, depth=5.6, seed=89)
create_celestial_bonsai_tree('Left_Distant_Tree', (-17.5, 15.0, 8.8), scale=0.95, foliage_mat=mat_emerald_canopy)
create_single_crystal('Left_Distant_Spire', (-16.8, 15.4, 9.0), (0.75, 0.75, 2.4), (radians(5), radians(-5), radians(15)), mat=mat_amethyst_crystal)

# --- RIGHT FLANK PRIMARY ISLAND: The Celestial Sakura Sanctuary ---
create_organic_floating_island('Island_Right_Primary', (13.5, 4.5, 3.4), rx=4.2, ry=3.6, depth=7.4, seed=55)
create_celestial_bonsai_tree('Right_Sakura_Tree', (13.5, 4.8, 3.8), scale=1.15, foliage_mat=mat_sakura_canopy)
create_crystal_geode_cluster('Right_Geode_Main', (12.2, 3.8, 3.8), base_height=3.8, num_shards=4, mat=mat_amethyst_crystal, seed=88)
create_pedestal_lantern('Lantern_Island_Right', (14.2, 3.2, 3.7), light_energy=35)
create_single_crystal('Right_Hanging_Cyan_1', (13.5, 4.8, -0.6), (0.55, 0.55, 1.1), (radians(-15), radians(12), radians(-25)), mat=mat_cyan_crystal)
create_single_crystal('Right_Hanging_Cyan_2', (14.0, 4.2, -1.3), (0.45, 0.45, 0.85), (radians(22), radians(-18), radians(45)), mat=mat_cyan_crystal)

# Right Forward Satellite Rock
create_organic_floating_island('Island_Right_Forward', (13.0, -6.8, -2.8), rx=2.7, ry=2.3, depth=5.0, seed=33)
create_crystal_geode_cluster('Right_Forward_Geode', (13.0, -6.8, -2.6), base_height=2.4, num_shards=3, mat=mat_cyan_crystal, seed=29)

# Right Distant High Asteroid
create_organic_floating_island('Island_Right_High', (18.0, 16.0, 8.2), rx=3.2, ry=2.8, depth=6.0, seed=73)
create_single_crystal('Right_Distant_Crystal', (18.0, 16.0, 8.5), (0.90, 0.90, 3.0), (radians(6), radians(4), radians(-20)), mat=mat_magenta_crystal)

# Floating Cosmic Sakura Petals
def create_floating_petal(name, loc, rot):
    bpy.ops.mesh.primitive_circle_add(vertices=6, radius=0.18, fill_type='NGON', location=loc, rotation=rot)
    petal = bpy.context.active_object
    petal.name = name
    petal.scale = (1.0, 0.5, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    petal.data.materials.append(mat_sakura_petal)

petal_locs = [
    (11.5, 2.5, 2.8), (12.2, -1.0, 1.8), (9.8, 0.5, 2.2), (13.0, 1.2, 3.5),
    (10.5, -2.8, 1.2), (-10.2, 1.5, 2.5), (-11.5, -1.0, 2.0), (6.5, 3.2, 2.6)
]
for p_idx, ploc in enumerate(petal_locs):
    create_floating_petal(f"Sakura_Petal_{p_idx}", ploc, (radians(random.uniform(0, 360)), radians(random.uniform(0, 360)), radians(random.uniform(0, 360))))

# 15. LIGHTING RIG (Balanced cinematic illumination)
print(">>> Configuring 3D Celestial Lighting Rig...")
l_moon = bpy.data.lights.new(name='Light_Moon_Sun', type='SUN')
l_moon.energy = 2.0
l_moon.color = (0.85, 0.94, 1.0)
obj_moon_light = bpy.data.objects.new('Light_Moon_Sun', l_moon)
obj_moon_light.rotation_euler = (radians(48), radians(-22), radians(-35))
bpy.context.collection.objects.link(obj_moon_light)

l_key = bpy.data.lights.new(name='Light_Violet_Key', type='AREA')
l_key.energy = 2200
l_key.color = (0.82, 0.20, 1.0)
if hasattr(l_key, 'size'): l_key.size = 20.0
obj_l_key = bpy.data.objects.new('Light_Violet_Key', l_key)
obj_l_key.location = (-7.0, -8.0, 10.0)
obj_l_key.rotation_euler = (radians(45), radians(-18), radians(15))
bpy.context.collection.objects.link(obj_l_key)

l_fill = bpy.data.lights.new(name='Light_Cyan_Fill', type='AREA')
l_fill.energy = 1800
l_fill.color = (0.10, 0.85, 1.0)
if hasattr(l_fill, 'size'): l_fill.size = 20.0
obj_l_fill = bpy.data.objects.new('Light_Cyan_Fill', l_fill)
obj_l_fill.location = (8.0, 6.0, 9.0)
obj_l_fill.rotation_euler = (radians(55), radians(20), radians(-25))
bpy.context.collection.objects.link(obj_l_fill)

l_chasm = bpy.data.lights.new(name='Light_Chasm_Up', type='AREA')
l_chasm.energy = 3200
l_chasm.color = (0.35, 0.08, 0.70)
if hasattr(l_chasm, 'size'): l_chasm.size = 40.0
obj_l_chasm = bpy.data.objects.new('Light_Chasm_Up', l_chasm)
obj_l_chasm.location = (0.0, 6.0, -18.0)
obj_l_chasm.rotation_euler = (radians(-80), 0, 0)
bpy.context.collection.objects.link(obj_l_chasm)

# 16. MULTI-ANGLE CAMERAS (5 Standard Verification Viewpoints)
print(">>> Setting up 5 Multi-Angle Verification Cameras...")
cameras_dict = {}
def add_camera(cam_id, name, loc, rot_euler, lens=40.0):
    cam_data = bpy.data.cameras.new(cam_id)
    cam_data.lens = lens
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500.0
    cam_obj = bpy.data.objects.new(name, cam_data)
    cam_obj.location = loc
    cam_obj.rotation_euler = rot_euler
    bpy.context.collection.objects.link(cam_obj)
    cameras_dict[cam_id] = cam_obj
    return cam_obj

cam_dist = 20.0
cam_lens = 40.0
sensor_w = 36.0
total_w = cam_dist * (sensor_w / cam_lens) # 18.0m
total_h = total_w * (9.0 / 16.0)          # 10.125m
cam_z = (0.5 - 0.29) * total_h + 0.35      # 2.476m

add_camera('cam_front', 'Camera_01_Front_Combat', (0.0, -cam_dist, cam_z), (radians(90.0), 0, 0), lens=40.0)
add_camera('cam_left_profile', 'Camera_02_Left_Profile', (-16.5, -2.5, 2.6), (radians(85.0), 0, radians(-72.0)), lens=30.0)
add_camera('cam_isometric_aerial', 'Camera_03_Isometric_Aerial', (-20.0, -16.0, 22.0), (radians(52.0), 0, radians(-48.0)), lens=28.0)
add_camera('cam_right_perspective', 'Camera_04_Right_Perspective', (16.5, -14.0, 6.2), (radians(70.0), 0, radians(48.0)), lens=32.0)
add_camera('cam_low_angle_hero', 'Camera_05_Low_Angle_Hero', (0.0, -10.5, 0.8), (radians(82.0), 0, 0), lens=26.0)

# 17. SAVE, EXPORT, RENDER
print(">>> Saving .blend, exporting .glb, and rendering all views...")
blend_path = os.path.join(out_dir, 'KeyFury_3D_CelestialVoid_True3D.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Saved Blend File]: {blend_path}")

glb_path = os.path.join(out_dir, 'KeyFury_3D_CelestialVoid_True3D.glb')
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Exported GLB File]: {glb_path}")

render_outputs = {
    'cam_front': os.path.join(out_dir, 'celestial_void_render_front.png'),
    'cam_left_profile': os.path.join(out_dir, 'celestial_void_render_left_profile.png'),
    'cam_isometric_aerial': os.path.join(out_dir, 'celestial_void_render_isometric_aerial.png'),
    'cam_right_perspective': os.path.join(out_dir, 'celestial_void_render_right_perspective.png'),
    'cam_low_angle_hero': os.path.join(out_dir, 'celestial_void_render_low_angle.png')
}

for cam_id, r_path in render_outputs.items():
    cam_obj = cameras_dict[cam_id]
    scene.camera = cam_obj
    scene.render.filepath = r_path
    print(f">>> Rendering {cam_id} -> {r_path}...")
    bpy.ops.render.render(write_still=True)
    print(f">>> Completed render: {r_path}")

print(">>> [KeyFury 3D Celestial Void v4] PERFECTED POLISH COMPLETE! ALL 5 VIEWS RENDERED!")

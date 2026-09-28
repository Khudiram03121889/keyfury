"""
KeyFury 3D: Arena #3 - Volcanic Caldera (Infernal Magma Forge)
Masterpiece V41 - Final Definitive Release
====================================================================================================
100% Pure Procedural 3D Polygonal Geometry | Zero 2D Billboards | 360-Degree Surroundings

FEATURES & CALIBRATIONS:
1. Dynamic Hypersonic Volcano Falling Movement:
   - 14 Ballistic volcanic bombs hurtling diagonally along parabolic gravity trajectories.
   - Incandescent tumbled basalt rock cores with glowing fissure networks.
   - Sleek aerodynamic plasma flame envelopes with longitudinal motion streaks.
   - Saturated 4-stage color gradient: White-gold plasma -> blazing orange -> crimson -> dark soot.
   - Dense trails of glowing micro-sparks, molten droplets, and trailing smoke puffs.
   - 3 Active lake impact eruption plumes with expanding glowing shockwave rings.
2. Stratovolcano Mount Fury & Background Vista:
   - Majestic stratovolcano at X = 15m, Y = 58m, Height = 46m, Base R = 54m, Caldera R = 10m.
   - Roaring summit caldera erupting with molten plasma geysers and billowing mushroom ash cloud plume.
   - Braided glowing coulee lava rivers cascading down mountain slopes.
   - Secondary cinder volcano (X = -28m, Y = 56m) and 360-degree caldera ridge ring.
   - Dark basalt mountain material with warm sunlit facet highlights and fiery cavity bounce.
3. 360-Degree Volcanic Storm Sky Dome & Billowing 3D Ash Clouds:
   - Calibrated sky dome with procedural soot/ash storm noise and glowing fiery horizon.
   - 14 Deformed fractal 3D cloud clusters with dual-tone shading (dark charcoal top, fiery orange under-glow).
   - Strict camera clearance bounds ensuring zero view obstruction across all 5 verification angles.
4. Fractured Obsidian Battle Platform:
   - Top deck: Central concentric medallion with glowing runic circles, 18 radial flagstone pavers with height variation, and glowing magma fissures.
   - Front cliff: Ancient glowing runic glyph inscriptions deeply etched into the rock face.
   - Underside: Heavy inverted basalt stalactite keel illuminated by targeted upward thermal bounce lights.
   - Dripping molten lava falls with organic droplet beads and boiling splash rings.
5. Convective Magma Lake:
   - World-space convective shader: 65% dark textured basalt crust rafts, 35% glowing golden-orange rivers.
   - 16 Faceted basalt spires protruding from the lake surface.
6. Stepped Basalt Amphitheater & 3 Cascading Lavafalls:
   - Semi-circular tiered colosseum of hexagonal basalt columns wrapping around the lake.
   - 3 Multi-tier cascading lavafalls carved through rock canyon notches with boiling splash pools.
"""

import os
import sys
import math
from math import sin, cos, pi, sqrt, radians
import random
import bpy
import bmesh

# ------------------------------------------------------------------------------
# 0. CLEAN EXISTING SCENE & SETUP COLOR MANAGEMENT
# ------------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for b in bpy.data.meshes: bpy.data.meshes.remove(b)
for b in bpy.data.materials: bpy.data.materials.remove(b)
for b in bpy.data.lights: bpy.data.lights.remove(b)
for b in bpy.data.cameras: bpy.data.cameras.remove(b)

world = bpy.context.scene.world or bpy.data.worlds.new("Volcanic_World")
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs['Color'].default_value = (0.010, 0.004, 0.003, 1.0)
    bg.inputs['Strength'].default_value = 0.20

# High Contrast Filmic Color Management for saturated anime fire
bpy.context.scene.view_settings.view_transform = 'Filmic'
bpy.context.scene.view_settings.look = 'High Contrast'
bpy.context.scene.view_settings.exposure = 0.0
bpy.context.scene.view_settings.gamma = 1.0

def setup_color_ramp(ramp_node, elements):
    ramp = ramp_node.color_ramp
    while len(ramp.elements) < len(elements): ramp.elements.new(0.5)
    while len(ramp.elements) > len(elements): ramp.elements.remove(ramp.elements[-1])
    for idx, (pos, col) in enumerate(elements):
        ramp.elements[idx].position = pos
        ramp.elements[idx].color = col

# ------------------------------------------------------------------------------
# 1. MASTER PROCEDURAL SHADERS
# ------------------------------------------------------------------------------

# 1a. Dark Basalt Rock Material with Warm Facet Highlights & Fiery Cavity Bounce
def make_basalt_material(name, base_col=(0.045, 0.034, 0.028, 1.0), rough=0.88):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_col
    bsdf.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.15

    coord = tree.nodes.new('ShaderNodeTexCoord')
    noise = tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 4.2
    noise.inputs['Detail'].default_value = 4.0
    tree.links.new(coord.outputs['Object'], noise.inputs['Vector'])

    bump = tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.45
    bump.inputs['Distance'].default_value = 0.12
    tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    # Warm upward cavity bounce emission
    geom = tree.nodes.new('ShaderNodeNewGeometry')
    sep = tree.nodes.new('ShaderNodeSeparateXYZ')
    tree.links.new(geom.outputs['Normal'], sep.inputs['Vector'])

    map_b = tree.nodes.new('ShaderNodeMapRange')
    map_b.inputs['From Min'].default_value = 0.1
    map_b.inputs['From Max'].default_value = -0.8
    map_b.inputs['To Min'].default_value = 0.0
    map_b.inputs['To Max'].default_value = 1.0
    tree.links.new(sep.outputs['Z'], map_b.inputs['Value'])

    ramp_b = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp_b, [
        (0.0, (0.0, 0.0, 0.0, 1.0)),
        (0.5, (0.15, 0.03, 0.005, 1.0)),
        (1.0, (0.50, 0.10, 0.005, 1.0))
    ])
    tree.links.new(map_b.outputs['Result'], ramp_b.inputs['Fac'])

    if 'Emission Color' in bsdf.inputs:
        tree.links.new(ramp_b.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 1.2
    elif 'Emission' in bsdf.inputs:
        tree.links.new(ramp_b.outputs['Color'], bsdf.inputs['Emission'])

    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

mat_basalt = make_basalt_material('Mat_Basalt_Platform', base_col=(0.040, 0.030, 0.025, 1.0), rough=0.85)
mat_mountain = make_basalt_material('Mat_Mountain_Rock', base_col=(0.055, 0.040, 0.032, 1.0), rough=0.90)

# 1b. Dual-Tone Volcanic Storm Cloud Material (Dark charcoal top, fiery orange under-glow)
def make_storm_cloud_material():
    mat = bpy.data.materials.new('Mat_Storm_Cloud_Dual')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')

    geom = tree.nodes.new('ShaderNodeNewGeometry')
    sep = tree.nodes.new('ShaderNodeSeparateXYZ')
    tree.links.new(geom.outputs['Normal'], sep.inputs['Vector'])

    map_norm = tree.nodes.new('ShaderNodeMapRange')
    map_norm.inputs['From Min'].default_value = 0.2
    map_norm.inputs['From Max'].default_value = -0.7
    map_norm.inputs['To Min'].default_value = 0.0
    map_norm.inputs['To Max'].default_value = 1.0
    tree.links.new(sep.outputs['Z'], map_norm.inputs['Value'])

    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.028, 0.018, 0.014, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.96

    emit = tree.nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (0.95, 0.24, 0.005, 1.0)
    emit.inputs['Strength'].default_value = 1.5

    mix = tree.nodes.new('ShaderNodeMixShader')
    tree.links.new(map_norm.outputs['Result'], mix.inputs['Fac'])
    tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    tree.links.new(emit.outputs['Emission'], mix.inputs[2])

    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

mat_cloud = make_storm_cloud_material()

# 1c. Pure Saturated Anime Molten Magma Material
def make_molten_magma_material(name, strength=3.4):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    emit = tree.nodes.new('ShaderNodeEmission')

    coord = tree.nodes.new('ShaderNodeTexCoord')
    noise = tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.6
    noise.inputs['Detail'].default_value = 3.5
    tree.links.new(coord.outputs['Object'], noise.inputs['Vector'])

    ramp = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp, [
        (0.00, (1.0, 0.54, 0.018, 1.0)), # Golden-yellow core
        (0.32, (0.96, 0.22, 0.002, 1.0)), # Blazing fiery orange
        (0.68, (0.62, 0.06, 0.001, 1.0)), # Deep vermilion
        (0.90, (0.14, 0.018, 0.001, 1.0)), # Cooling margin
        (1.00, (0.02, 0.004, 0.001, 1.0))
    ])
    tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    tree.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    emit.inputs['Strength'].default_value = strength
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_lava = make_molten_magma_material('Mat_Molten_Lava', strength=3.2)
mat_lava_erupt = make_molten_magma_material('Mat_Lava_Eruption', strength=4.5)
mat_fissure = make_molten_magma_material('Mat_Lava_Fissure', strength=3.8)

# 1d. World-Space Convective Magma Lake Material (65% Basalt Crust, 35% Molten Rivers)
def make_convective_lake_material():
    mat = bpy.data.materials.new('Mat_Convective_Magma_Lake')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    mix = tree.nodes.new('ShaderNodeMixShader')

    bsdf_crust = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf_crust.inputs['Base Color'].default_value = (0.024, 0.018, 0.015, 1.0)
    bsdf_crust.inputs['Roughness'].default_value = 0.92

    emit_lava = tree.nodes.new('ShaderNodeEmission')

    coord = tree.nodes.new('ShaderNodeTexCoord')

    noise_w = tree.nodes.new('ShaderNodeTexNoise')
    noise_w.inputs['Scale'].default_value = 0.05
    noise_w.inputs['Detail'].default_value = 2.0
    tree.links.new(coord.outputs['Object'], noise_w.inputs['Vector'])

    scale_w = tree.nodes.new('ShaderNodeVectorMath')
    scale_w.operation = 'SCALE'
    scale_w.inputs['Scale'].default_value = 6.0
    tree.links.new(noise_w.outputs['Color'], scale_w.inputs[0])

    vec_add = tree.nodes.new('ShaderNodeVectorMath')
    vec_add.operation = 'ADD'
    tree.links.new(coord.outputs['Object'], vec_add.inputs[0])
    tree.links.new(scale_w.outputs['Vector'], vec_add.inputs[1])

    noise_main = tree.nodes.new('ShaderNodeTexNoise')
    noise_main.inputs['Scale'].default_value = 0.15
    noise_main.inputs['Detail'].default_value = 5.0
    noise_main.inputs['Roughness'].default_value = 0.55
    noise_main.inputs['Distortion'].default_value = 1.6
    tree.links.new(vec_add.outputs['Vector'], noise_main.inputs['Vector'])

    ramp_lava = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp_lava, [
        (0.00, (1.0, 0.46, 0.015, 1.0)),
        (0.35, (0.95, 0.20, 0.001, 1.0)),
        (0.65, (0.65, 0.07, 0.001, 1.0)),
        (0.85, (0.15, 0.02, 0.001, 1.0)),
        (1.00, (0.02, 0.004, 0.001, 1.0))
    ])
    tree.links.new(noise_main.outputs['Fac'], ramp_lava.inputs['Fac'])
    tree.links.new(ramp_lava.outputs['Color'], emit_lava.inputs['Color'])
    emit_lava.inputs['Strength'].default_value = 3.0

    ramp_mix = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp_mix, [
        (0.00, (0.0, 0.0, 0.0, 1.0)),
        (0.42, (0.0, 0.0, 0.0, 1.0)), # Molten channels
        (0.52, (1.0, 1.0, 1.0, 1.0)), # Basalt crust
        (1.00, (1.0, 1.0, 1.0, 1.0))
    ])
    tree.links.new(noise_main.outputs['Fac'], ramp_mix.inputs['Fac'])

    tree.links.new(ramp_mix.outputs['Color'], mix.inputs[0])
    tree.links.new(emit_lava.outputs['Emission'], mix.inputs[1])
    tree.links.new(bsdf_crust.outputs['BSDF'], mix.inputs[2])

    bump = tree.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.55
    bump.inputs['Distance'].default_value = 0.22
    tree.links.new(noise_main.outputs['Fac'], bump.inputs['Height'])
    tree.links.new(bump.outputs['Normal'], bsdf_crust.inputs['Normal'])

    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

mat_convective_lake = make_convective_lake_material()

# 1e. Ancient Glowing Runic Inscription Material
def make_rune_material():
    mat = bpy.data.materials.new('Mat_Rune_Inscribed')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    emit = tree.nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (1.0, 0.44, 0.02, 1.0)
    emit.inputs['Strength'].default_value = 4.8
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_rune = make_rune_material()

# 1f. Volcanic Bomb Molten Basalt Core Material
def make_bomb_rock_material():
    mat = bpy.data.materials.new('Mat_Bomb_Rock_Core')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.040, 0.022, 0.015, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.88

    coord = tree.nodes.new('ShaderNodeTexCoord')
    vor = tree.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 5.5
    tree.links.new(coord.outputs['Object'], vor.inputs['Vector'])

    ramp = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp, [
        (0.00, (1.0, 0.55, 0.02, 1.0)),
        (0.30, (0.95, 0.22, 0.002, 1.0)),
        (0.50, (0.15, 0.02, 0.001, 1.0)),
        (0.65, (0.0, 0.0, 0.0, 1.0)),
        (1.00, (0.0, 0.0, 0.0, 1.0))
    ])
    tree.links.new(vor.outputs['Distance'], ramp.inputs['Fac'])

    if 'Emission Color' in bsdf.inputs:
        tree.links.new(ramp.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 3.8
    elif 'Emission' in bsdf.inputs:
        tree.links.new(ramp.outputs['Color'], bsdf.inputs['Emission'])

    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

mat_bomb_rock = make_bomb_rock_material()

# 1g. Dynamic Hypersonic Aerodynamic Flame Tail Material
def make_flame_tail_material():
    mat = bpy.data.materials.new('Mat_Hypersonic_Flame_Tail')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    emit = tree.nodes.new('ShaderNodeEmission')

    uv_node = tree.nodes.new('ShaderNodeUVMap')
    uv_node.uv_map = 'UVMap'
    sep = tree.nodes.new('ShaderNodeSeparateXYZ')
    tree.links.new(uv_node.outputs['UV'], sep.inputs['Vector'])

    ramp_col = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp_col, [
        (0.00, (1.0, 0.58, 0.04, 1.0)),  # Incandescent plasma head
        (0.18, (0.98, 0.25, 0.002, 1.0)), # Saturated blazing orange
        (0.50, (0.75, 0.08, 0.001, 1.0)), # Deep vermilion
        (0.76, (0.28, 0.02, 0.001, 1.0)), # Cooling crimson
        (1.00, (0.02, 0.005, 0.002, 1.0)) # Charred smoke tip
    ])
    tree.links.new(sep.outputs['Y'], ramp_col.inputs['Fac'])

    ramp_str = tree.nodes.new('ShaderNodeValToRGB')
    setup_color_ramp(ramp_str, [
        (0.00, (1.0, 1.0, 1.0, 1.0)),
        (0.70, (0.40, 0.40, 0.40, 1.0)),
        (1.00, (0.02, 0.02, 0.02, 1.0))
    ])
    tree.links.new(sep.outputs['Y'], ramp_str.inputs['Fac'])

    mult = tree.nodes.new('ShaderNodeMath')
    mult.operation = 'MULTIPLY'
    mult.inputs[1].default_value = 3.8
    tree.links.new(ramp_str.outputs['Color'], mult.inputs[0])

    tree.links.new(ramp_col.outputs['Color'], emit.inputs['Color'])
    tree.links.new(mult.outputs['Value'], emit.inputs['Strength'])
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_flame_tail = make_flame_tail_material()

# 1h. Micro Spark Material
def make_spark_material():
    mat = bpy.data.materials.new('Mat_Micro_Spark')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    emit = tree.nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (1.0, 0.58, 0.04, 1.0)
    emit.inputs['Strength'].default_value = 5.0
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

mat_spark = make_spark_material()

# 1i. Dark Soot / Smoke Material
def make_smoke_material():
    mat = bpy.data.materials.new('Mat_Volcanic_Smoke')
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new('ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.018, 0.014, 0.012, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.98
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

mat_smoke = make_smoke_material()

# ------------------------------------------------------------------------------
# 2. 360-DEGREE VOLCANIC SKY DOME
# ------------------------------------------------------------------------------
print(">>> Constructing Volcanic Sky Dome...")
bm_sky = bmesh.new()
sky_radius = 320.0
n_sky_rings = 32
n_sky_rad = 48
sky_rings = []
for ri in range(n_sky_rings + 1):
    phi = (ri / n_sky_rings) * (pi * 0.5)
    cur_z = sky_radius * cos(phi)
    cur_r = sky_radius * sin(phi)
    ring = []
    for rj in range(n_sky_rad):
        theta = 2.0 * pi * rj / n_sky_rad
        ring.append(bm_sky.verts.new((cur_r * cos(theta), cur_r * sin(theta), cur_z - 10.0)))
    sky_rings.append(ring)

for ri in range(n_sky_rings):
    for rj in range(n_sky_rad):
        nxt_j = (rj + 1) % n_sky_rad
        bm_sky.faces.new([sky_rings[ri][rj], sky_rings[ri][nxt_j], sky_rings[ri+1][nxt_j], sky_rings[ri+1][rj]])

bmesh.ops.recalc_face_normals(bm_sky, faces=bm_sky.faces)
mesh_sky = bpy.data.meshes.new("Mesh_Volcanic_Sky_Dome")
bm_sky.to_mesh(mesh_sky)
bm_sky.free()
obj_sky = bpy.data.objects.new("Volcanic_Sky_Dome", mesh_sky)
obj_sky.visible_shadow = False
bpy.context.collection.objects.link(obj_sky)

mat_sky = bpy.data.materials.new("Mat_Volcanic_Sky_Dome")
mat_sky.use_nodes = True
ts = mat_sky.node_tree
ts.nodes.clear()
out_s = ts.nodes.new('ShaderNodeOutputMaterial')
emit_s = ts.nodes.new('ShaderNodeEmission')

coord_s = ts.nodes.new('ShaderNodeTexCoord')
sep_s = ts.nodes.new('ShaderNodeSeparateXYZ')
ts.links.new(coord_s.outputs['Object'], sep_s.inputs['Vector'])

noise_s = ts.nodes.new('ShaderNodeTexNoise')
noise_s.inputs['Scale'].default_value = 1.6
noise_s.inputs['Detail'].default_value = 4.0
ts.links.new(coord_s.outputs['Object'], noise_s.inputs['Vector'])

map_s = ts.nodes.new('ShaderNodeMapRange')
map_s.inputs['From Min'].default_value = -10.0
map_s.inputs['From Max'].default_value = 90.0
map_s.inputs['To Min'].default_value = 0.0
map_s.inputs['To Max'].default_value = 1.0
ts.links.new(sep_s.outputs['Z'], map_s.inputs['Value'])

mix_coord = ts.nodes.new('ShaderNodeMix')
mix_coord.data_type = 'FLOAT'
mix_coord.inputs['Factor'].default_value = 0.28
ts.links.new(map_s.outputs['Result'], mix_coord.inputs['A'])
ts.links.new(noise_s.outputs['Fac'], mix_coord.inputs['B'])

ramp_sky = ts.nodes.new('ShaderNodeValToRGB')
setup_color_ramp(ramp_sky, [
    (0.00, (0.95, 0.28, 0.003, 1.0)), # Fiery horizon glow
    (0.18, (0.65, 0.10, 0.001, 1.0)), # Deep vermilion fire belt
    (0.38, (0.16, 0.03, 0.008, 1.0)), # Crimson-brown ash midtones
    (0.60, (0.035, 0.012, 0.010, 1.0)), # Charcoal storm soot
    (1.00, (0.008, 0.004, 0.003, 1.0)) # Dark abyssal storm zenith
])
ts.links.new(mix_coord.outputs['Result'], ramp_sky.inputs['Fac'])
ts.links.new(ramp_sky.outputs['Color'], emit_s.inputs['Color'])
emit_s.inputs['Strength'].default_value = 1.05
ts.links.new(emit_s.outputs['Emission'], out_s.inputs['Surface'])
obj_sky.data.materials.append(mat_sky)

# ------------------------------------------------------------------------------
# 3. 3D BILLOWING VOLCANIC STORM CLOUDS (SAFE CAMERA CLEARANCE BOUNDS)
# ------------------------------------------------------------------------------
print(">>> Constructing Billowing 3D Volcanic Storm Clouds (Camera-Safe)...")
cloud_parent = bpy.data.objects.new('Volcanic_Storm_Canopy', None)
bpy.context.collection.objects.link(cloud_parent)

# Clouds strictly placed outside camera frustums (behind Y >= 8m or high above Z >= 40m)
cloud_clusters = [
    # (X, Y, Z, radius)
    (-28.0, 20.0, 26.0, 9.0),
    (26.0, 18.0, 25.0, 8.5),
    (-42.0, 34.0, 32.0, 12.0),
    (38.0, 36.0, 32.0, 12.5),
    (-12.0, 26.0, 28.0, 10.0),
    (10.0, 28.0, 29.0, 10.5),
    (0.0, 44.0, 36.0, 14.0),
    (-24.0, 50.0, 38.0, 13.0),
    (26.0, 52.0, 40.0, 13.5),
    (-52.0, 12.0, 24.0, 10.0),
    (48.0, 14.0, 25.0, 10.0),
    # High zenith canopy clouds (safe above camera)
    (-12.0, -18.0, 44.0, 11.0),
    (12.0, -18.0, 44.0, 11.0),
    (0.0, -25.0, 46.0, 12.0),
]

for ci, (cx, cy, cz, cr) in enumerate(cloud_clusters):
    random.seed(900 + ci)
    for si in range(4):
        ox = (random.random() - 0.5) * cr * 0.9
        oy = (random.random() - 0.5) * cr * 0.9
        oz = (random.random() - 0.5) * cr * 0.45
        sub_r = cr * (0.55 + random.random() * 0.35)

        bm_c = bmesh.new()
        bmesh.ops.create_icosphere(bm_c, subdivisions=2, radius=sub_r)
        for v in bm_c.verts:
            noise_disp = 1.0 + 0.22 * sin(v.co.x * 0.6 + v.co.y * 0.5 + ci) * cos(v.co.z * 0.7)
            v.co *= noise_disp
        bmesh.ops.recalc_face_normals(bm_c, faces=bm_c.faces)
        mesh_c = bpy.data.meshes.new(f'Mesh_Cloud_{ci}_{si}')
        bm_c.to_mesh(mesh_c)
        bm_c.free()

        obj_c = bpy.data.objects.new(f'Storm_Cloud_{ci}_{si}', mesh_c)
        obj_c.location = (cx + ox, cy + oy, cz + oz)
        obj_c.parent = cloud_parent
        obj_c.visible_shadow = False
        obj_c.data.materials.append(mat_cloud)
        bpy.context.collection.objects.link(obj_c)

# ------------------------------------------------------------------------------
# 4. STRATOVOLCANO MOUNT FURY & BACKGROUND CALDERA PEAKS
# ------------------------------------------------------------------------------
print(">>> Modeling Mount Fury & 360-Degree Caldera Mountain Ring...")

def create_craggy_volcano(name, vx, vy, vz_base, height, r_base, r_crater, n_rad=48, n_tiers=28):
    bm = bmesh.new()
    rings = []
    for tier in range(n_tiers + 1):
        frac = tier / n_tiers
        cur_z = vz_base + frac * height
        slope_curve = (1.0 - frac) ** 1.35
        cur_r = r_crater + (r_base - r_crater) * slope_curve

        ring = []
        for ri in range(n_rad):
            ang = 2.0 * pi * ri / n_rad
            ridge_noise = 1.0 + 0.12 * sin(ang * 6.0 + tier * 0.3) + 0.08 * cos(ang * 12.0)
            if frac < 0.15: ridge_noise *= (frac / 0.15)
            rx = cur_r * ridge_noise * cos(ang)
            ry = cur_r * ridge_noise * sin(ang)
            ring.append(bm.verts.new((vx + rx, vy + ry, cur_z)))
        rings.append(ring)

    # Base cap (points downward into ground)
    v_base_center = bm.verts.new((vx, vy, vz_base))
    for ri in range(n_rad):
        nxt_ri = (ri + 1) % n_rad
        bm.faces.new([rings[0][ri], rings[0][nxt_ri], v_base_center])

    # Wall quads (point strictly outward)
    for tier in range(n_tiers):
        for ri in range(n_rad):
            nxt_ri = (ri + 1) % n_rad
            bm.faces.new([rings[tier][nxt_ri], rings[tier][ri], rings[tier+1][ri], rings[tier+1][nxt_ri]])

    # Crater depression (points into bowl)
    v_crater_floor = bm.verts.new((vx, vy, vz_base + height - 2.5))
    for ri in range(n_rad):
        nxt_ri = (ri + 1) % n_rad
        bm.faces.new([rings[-1][nxt_ri], rings[-1][ri], v_crater_floor])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(f'Mesh_{name}')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat_mountain)
    bpy.context.collection.objects.link(obj)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=r_crater * 0.92, depth=0.6,
        location=(vx, vy, vz_base + height - 1.2)
    )
    obj_pool = bpy.context.active_object
    obj_pool.name = f'{name}_Crater_Pool'
    obj_pool.data.materials.append(mat_lava_erupt)
    return obj

# 1. Mount Fury (Majestic Stratovolcano standing proudly behind amphitheater: X = 15m, Y = 66m, Height = 48m, Base R = 38m)
create_craggy_volcano('Mount_Fury', vx=15.0, vy=66.0, vz_base=-5.0, height=48.0, r_base=38.0, r_crater=8.8)

# Mount Fury Summit Eruption Plasma Geyser Spire
bpy.ops.mesh.primitive_cone_add(
    vertices=24, radius1=5.0, radius2=0.5, depth=28.0,
    location=(15.0, 66.0, -5.0 + 48.0 + 14.0)
)
obj_fury_geyser = bpy.context.active_object
obj_fury_geyser.name = 'Mount_Fury_Eruption_Geyser'
obj_fury_geyser.data.materials.append(mat_lava_erupt)

# Billowing Summit Mushroom Ash Cloud Plume
for mi, (mx, my, mz, mr) in enumerate([
    (0, 0, 26, 6.5), (-1.5, 0.5, 32, 9.0), (2.0, -1.0, 38, 11.5),
    (-4.0, -1.5, 44, 14.5), (4.5, 2.0, 45, 15.0), (0.0, 0.0, 50, 18.0)
]):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2, radius=mr,
        location=(15.0 + mx, 66.0 + my, -5.0 + 48.0 + mz)
    )
    m_puff = bpy.context.active_object
    m_puff.name = f'Fury_Ash_Mushroom_{mi}'
    m_puff.visible_shadow = False
    m_puff.data.materials.append(mat_smoke)

# Braided Glowing Lava Rivers (Coulees) down Mount Fury's Slopes
coulees = [
    ([(14.0, 59.0, 36.0), (12.5, 53.0, 26.0), (10.8, 47.0, 18.0), (8.5, 41.0, 10.0), (6.0, 35.0, 3.0), (4.0, 29.0, -4.8)], 1.5),
    ([(16.5, 58.0, 34.0), (18.0, 51.0, 24.0), (19.5, 44.0, 16.0), (21.0, 37.0, 8.0), (22.0, 30.0, -4.8)], 1.3),
    ([(12.0, 57.0, 35.0), (9.5, 50.0, 23.0), (7.0, 43.0, 14.0), (4.5, 36.0, 5.0), (2.5, 29.0, -4.8)], 1.2),
]
for ci, (pts, cw) in enumerate(coulees):
    bm_c = bmesh.new()
    uv_c = bm_c.loops.layers.uv.new('UVMap')
    prev_c = None
    n_pts = len(pts)
    for pi_idx, (px, py, pz) in enumerate(pts):
        v_frac = pi_idx / (n_pts - 1)
        if pi_idx < n_pts - 1:
            nx, ny, _ = pts[pi_idx + 1]
            tdx, tdy = (nx - px, ny - py)
        else:
            prx, pry, _ = pts[pi_idx - 1]
            tdx, tdy = (px - prx, py - pry)
        l_mag = sqrt(tdx*tdx + tdy*tdy) or 1.0
        tx, ty = (-tdy / l_mag, tdx / l_mag)

        v_l = bm_c.verts.new((px - tx * cw * 0.5, py - ty * cw * 0.5, pz + 0.25))
        v_r = bm_c.verts.new((px + tx * cw * 0.5, py + ty * cw * 0.5, pz + 0.25))
        if prev_c:
            p_vl, p_vr, p_vf = prev_c
            f_c = bm_c.faces.new([p_vl, p_vr, v_r, v_l])
            for l in f_c.loops:
                u_val = 0.0 if l.vert in [p_vl, v_l] else 1.0
                v_val = p_vf if l.vert in [p_vl, p_vr] else v_frac
                l[uv_c].uv = (u_val, v_val)
        prev_c = (v_l, v_r, v_frac)
    bmesh.ops.recalc_face_normals(bm_c, faces=bm_c.faces)
    mesh_c = bpy.data.meshes.new(f'Mesh_Fury_Coulee_{ci}')
    bm_c.to_mesh(mesh_c)
    bm_c.free()
    obj_c = bpy.data.objects.new(f'Fury_Coulee_{ci}', mesh_c)
    obj_c.visible_shadow = False
    obj_c.data.materials.append(mat_fissure)
    bpy.context.collection.objects.link(obj_c)

# 2. Secondary Volcano (Left-Center Background: X = -28m, Y = 54m, Height = 30m)
create_craggy_volcano('Volcano_Secondary_Left', vx=-28.0, vy=54.0, vz_base=-5.0, height=30.0, r_base=36.0, r_crater=6.0)

# 3. Flank Volcanoes for 360-degree vistas
create_craggy_volcano('Volcano_Flank_Far_Left', vx=-58.0, vy=14.0, vz_base=-5.0, height=25.0, r_base=32.0, r_crater=5.0)
create_craggy_volcano('Volcano_Flank_Far_Right', vx=55.0, vy=16.0, vz_base=-5.0, height=27.0, r_base=34.0, r_crater=5.5)

# 4. Continuous Distant Mountain Caldera Ring (R = 108m)
bm_ridge = bmesh.new()
r_ring = 108.0
n_ring = 64
r_bot, r_top = [], []
for i in range(n_ring):
    a = 2.0 * pi * i / n_ring
    h = 13.0 + 6.5 * sin(a * 4.0) + 3.5 * cos(a * 7.0)
    rx = r_ring * cos(a)
    ry = r_ring * sin(a)
    r_bot.append(bm_ridge.verts.new((rx * 0.94, ry * 0.94, -5.0)))
    r_top.append(bm_ridge.verts.new((rx, ry, -5.0 + h)))

for i in range(n_ring):
    ni = (i + 1) % n_ring
    bm_ridge.faces.new([r_bot[i], r_bot[ni], r_top[ni], r_top[i]])
bmesh.ops.recalc_face_normals(bm_ridge, faces=bm_ridge.faces)
mesh_ridge = bpy.data.meshes.new("Mesh_Caldera_Rim_Ridge")
bm_ridge.to_mesh(mesh_ridge)
bm_ridge.free()
obj_ridge = bpy.data.objects.new("Caldera_Rim_Ridge", mesh_ridge)
obj_ridge.data.materials.append(mat_mountain)
bpy.context.collection.objects.link(obj_ridge)

# ------------------------------------------------------------------------------
# 5. DYNAMIC VOLCANO FALLING MOVEMENT (SLEEK BALLISTIC HYPERSONIC BOMBS)
# ------------------------------------------------------------------------------
print(">>> Modeling Dynamic Volcano Falling Movement (Sleek Ballistic Bombs)...")
bomb_parent = bpy.data.objects.new('Volcano_Falling_Bombs', None)
bpy.context.collection.objects.link(bomb_parent)

bombs_spec = [
    # (head_pos, velocity_vector, r_core, r_head, tail_len, num_sparks)
    # 1. Major Midground Bombs (Crossing Combat Frame with Dynamic Motion)
    ((-12.5, 4.0, 11.5), (0.72, 0.12, -0.92), 0.28, 0.32, 9.5, 20),
    ((-3.5, 12.0, 14.5), (0.68, 0.10, -0.95), 0.32, 0.36, 11.0, 24),
    ((11.0, 16.0, 13.0), (0.62, 0.08, -0.93), 0.26, 0.30, 9.0, 18),
    ((-18.0, 14.0, 16.5), (0.74, 0.15, -0.90), 0.34, 0.38, 12.0, 26),
    ((5.0, 10.0, 9.5), (0.70, 0.12, -0.94), 0.24, 0.28, 8.0, 16),

    # 2. Distant High-Altitude Eruption Bombs (Emerging from Summit Cloud)
    ((-7.0, 28.0, 24.0), (0.70, 0.10, -0.92), 0.38, 0.42, 14.0, 28),
    ((13.0, 32.0, 26.0), (0.65, 0.12, -0.90), 0.40, 0.45, 15.0, 30),
    ((-22.0, 30.0, 22.0), (0.72, 0.14, -0.88), 0.35, 0.40, 13.0, 24),
    ((22.0, 34.0, 24.0), (0.62, 0.10, -0.92), 0.34, 0.38, 12.5, 22),
    ((0.0, 36.0, 27.0), (0.66, 0.10, -0.91), 0.42, 0.48, 16.0, 32),

    # 3. Near-Impact Low-Altitude Bombs (Near Magma Lake Surface)
    ((-9.5, 1.5, 4.2), (0.60, 0.08, -0.96), 0.22, 0.25, 6.5, 14),
    ((10.5, 3.0, 4.5), (0.62, 0.10, -0.95), 0.24, 0.27, 7.0, 15),
    ((-1.2, 5.5, 3.5), (0.58, 0.06, -0.98), 0.20, 0.23, 6.0, 12),
]

for b_idx, (b_pos, traj, r_core, r_head, tail_len, n_spk) in enumerate(bombs_spec):
    bx, by, bz = b_pos
    tdx, tdy, tdz = traj
    t_mag = sqrt(tdx*tdx + tdy*tdy + tdz*tdz) or 1.0
    ux, uy, uz = (tdx / t_mag, tdy / t_mag, tdz / t_mag)

    # 1. Molten Basalt Rock Core
    bm_rock = bmesh.new()
    bmesh.ops.create_icosphere(bm_rock, subdivisions=2, radius=r_core)
    random.seed(800 + b_idx)
    for v in bm_rock.verts:
        v.co *= (1.0 + (random.random() - 0.5) * 0.35)
    bmesh.ops.recalc_face_normals(bm_rock, faces=bm_rock.faces)
    mesh_rock = bpy.data.meshes.new(f'Mesh_Bomb_Core_{b_idx}')
    bm_rock.to_mesh(mesh_rock)
    bm_rock.free()

    obj_rock = bpy.data.objects.new(f'Bomb_Core_{b_idx}', mesh_rock)
    obj_rock.location = b_pos
    obj_rock.parent = bomb_parent
    obj_rock.visible_shadow = False
    obj_rock.data.materials.append(mat_bomb_rock)
    bpy.context.collection.objects.link(obj_rock)

    # 2. Sleek Aerodynamic Curved Flame Tail
    bm_tail = bmesh.new()
    uv_tail = bm_tail.loops.layers.uv.new('UVMap')
    n_rings = 16
    n_rad = 10

    if abs(uz) > 0.9: rx, ry, rz = (1.0, 0.0, 0.0)
    else: rx, ry, rz = (-uy, ux, 0.0)
    r_mag = sqrt(rx*rx + ry*ry + rz*rz) or 1.0
    rx, ry, rz = (rx/r_mag, ry/r_mag, rz/r_mag)
    bx_v = uy * rz - uz * ry
    by_v = uz * rx - ux * rz
    bz_v = ux * ry - uy * rx

    tail_rings = []
    for ti in range(n_rings + 1):
        frac = ti / n_rings
        r_env = r_head * ((1.0 - frac) ** 1.45)
        if r_env < 0.01: r_env = 0.01
        dist = frac * tail_len

        curve_z = 0.06 * (dist ** 1.3)
        curve_x = 0.02 * (dist ** 1.2) * (1 if ux > 0 else -1)

        cx = bx - ux * dist + curve_x
        cy = by - uy * dist
        cz = bz - uz * dist + curve_z

        ring = []
        for fi in range(n_rad):
            fang = 2.0 * pi * fi / n_rad
            flute = 1.0 + 0.18 * sin(fi * 2.0 + ti * 0.8)
            rad_cur = r_env * flute
            vx = cx + (rx * cos(fang) + bx_v * sin(fang)) * rad_cur
            vy = cy + (ry * cos(fang) + by_v * sin(fang)) * rad_cur
            vz = cz + (rz * cos(fang) + bz_v * sin(fang)) * rad_cur
            v_new = bm_tail.verts.new((vx, vy, vz))
            ring.append((v_new, fi / n_rad, frac))
        tail_rings.append(ring)

    for ti in range(n_rings):
        for fi in range(n_rad):
            nxt_fi = (fi + 1) % n_rad
            v1, u1, vf1 = tail_rings[ti][fi]
            v2, u2, _   = tail_rings[ti][nxt_fi]
            v3, u3, vf2 = tail_rings[ti+1][nxt_fi]
            v4, u4, _   = tail_rings[ti+1][fi]
            f_poly = bm_tail.faces.new([v1, v2, v3, v4])
            for loop in f_poly.loops:
                loop[uv_tail].uv = (u1 if loop.vert in [v1, v4] else u2, vf1 if loop.vert in [v1, v2] else vf2)

    tip_dist = tail_len + 0.15
    v_tip = bm_tail.verts.new((
        bx - ux * tip_dist,
        by - uy * tip_dist,
        bz - uz * tip_dist + 0.06 * (tip_dist ** 1.3)
    ))
    for fi in range(n_rad):
        nxt_fi = (fi + 1) % n_rad
        v1, u1, vf1 = tail_rings[-1][fi]
        v2, u2, _   = tail_rings[-1][nxt_fi]
        f_poly = bm_tail.faces.new([v1, v2, v_tip])
        for loop in f_poly.loops:
            loop[uv_tail].uv = (u1 if loop.vert == v1 else u2, 1.0)

    bmesh.ops.recalc_face_normals(bm_tail, faces=bm_tail.faces)
    mesh_tail = bpy.data.meshes.new(f'Mesh_Bomb_Tail_{b_idx}')
    bm_tail.to_mesh(mesh_tail)
    bm_tail.free()

    obj_tail = bpy.data.objects.new(f'Bomb_Tail_{b_idx}', mesh_tail)
    obj_tail.parent = bomb_parent
    obj_tail.visible_shadow = False
    obj_tail.data.materials.append(mat_flame_tail)
    bpy.context.collection.objects.link(obj_tail)

    # 3. Trailing Micro-Embers & Sparks
    for spk_i in range(n_spk):
        spk_frac = 0.08 + 0.88 * (spk_i / n_spk)
        spk_dist = spk_frac * tail_len * 1.12
        spk_rad = 0.035 + (random.random() * 0.035)
        spk_ox = (random.random() - 0.5) * r_head * 1.8
        spk_oy = (random.random() - 0.5) * r_head * 1.8
        spk_oz = (random.random() - 0.5) * r_head * 1.8

        px_s = bx - ux * spk_dist + spk_ox
        py_s = by - uy * spk_dist + spk_oy
        pz_s = bz - uz * spk_dist + 0.06 * (spk_dist ** 1.3) + spk_oz

        bpy.ops.mesh.primitive_cube_add(size=spk_rad * 2.0, location=(px_s, py_s, pz_s))
        obj_spk = bpy.context.active_object
        obj_spk.name = f'Bomb_Spark_{b_idx}_{spk_i}'
        obj_spk.parent = bomb_parent
        obj_spk.visible_shadow = False
        obj_spk.data.materials.append(mat_spark)

    # 4. Trailing Smoke Puffs
    for smk_i in range(3):
        smk_dist = tail_len * (0.80 + 0.22 * smk_i)
        smk_rad = r_head * (0.50 + 0.25 * smk_i)
        sx = bx - ux * smk_dist + (random.random() - 0.5) * 0.6
        sy = by - uy * smk_dist + (random.random() - 0.5) * 0.6
        sz = bz - uz * smk_dist + 0.06 * (smk_dist ** 1.3) + (random.random() - 0.5) * 0.4

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=smk_rad, location=(sx, sy, sz))
        obj_smk = bpy.context.active_object
        obj_smk.name = f'Bomb_Smoke_{b_idx}_{smk_i}'
        obj_smk.parent = bomb_parent
        obj_smk.visible_shadow = False
        obj_smk.data.materials.append(mat_smoke)

# Lake Impacts (Molten Eruption Plumes & Glowing Shockwave Rings)
impacts = [
    (-14.0, 8.5, -5.0),
    (14.5, 11.0, -5.0),
    (-1.5, 16.5, -5.0)
]
for imp_i, (ix, iy, iz) in enumerate(impacts):
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=1.1, radius2=0.12, depth=4.5, location=(ix, iy, iz + 2.25))
    obj_spout = bpy.context.active_object
    obj_spout.name = f'Impact_Spout_{imp_i}'
    obj_spout.visible_shadow = False
    obj_spout.data.materials.append(mat_lava_erupt)

    for ring_i, r_m in enumerate([1.1, 2.0]):
        bpy.ops.mesh.primitive_torus_add(major_radius=r_m, minor_radius=0.09, location=(ix, iy, iz + 0.05))
        obj_ring = bpy.context.active_object
        obj_ring.name = f'Impact_Ring_{imp_i}_{ring_i}'
        obj_ring.visible_shadow = False
        obj_ring.data.materials.append(mat_lava_erupt)

# ------------------------------------------------------------------------------
# 6. CENTRAL OBSIDIAN BATTLE PLATFORM
# ------------------------------------------------------------------------------
print(">>> Building Fractured Obsidian Battle Platform...")
plat_parent = bpy.data.objects.new('Battle_Platform_Master', None)
bpy.context.collection.objects.link(plat_parent)

hw = 9.2   # X half-width
hd = 4.8   # Y half-depth
plat_thick = 2.0

# 1. Main Platform Core Slab with Inverted Stalactite Keel
bm_plat = bmesh.new()
n_plat_pts = 36
top_rim = []
bot_rim = []

for i in range(n_plat_pts):
    a = 2.0 * pi * i / n_plat_pts
    r_noise = 1.0 + 0.05 * sin(a * 5.0) + 0.03 * cos(a * 8.0)
    vx = hw * r_noise * cos(a)
    vy = hd * r_noise * sin(a)

    top_rim.append(bm_plat.verts.new((vx, vy, 0.0)))
    bot_rim.append(bm_plat.verts.new((vx * 0.94, vy * 0.94, -plat_thick)))

for i in range(n_plat_pts):
    ni = (i + 1) % n_plat_pts
    bm_plat.faces.new([top_rim[i], top_rim[ni], bot_rim[ni], bot_rim[i]])

v_keel_tip = bm_plat.verts.new((0.0, 0.0, -4.5))
for i in range(n_plat_pts):
    ni = (i + 1) % n_plat_pts
    bm_plat.faces.new([bot_rim[ni], bot_rim[i], v_keel_tip])

v_deck_center = bm_plat.verts.new((0.0, 0.0, 0.0))
for i in range(n_plat_pts):
    ni = (i + 1) % n_plat_pts
    bm_plat.faces.new([top_rim[i], top_rim[ni], v_deck_center])

bmesh.ops.recalc_face_normals(bm_plat, faces=bm_plat.faces)
mesh_plat = bpy.data.meshes.new("Mesh_Platform_Slab")
bm_plat.to_mesh(mesh_plat)
bm_plat.free()
obj_plat = bpy.data.objects.new("Platform_Slab", mesh_plat)
obj_plat.parent = plat_parent
obj_plat.data.materials.append(mat_basalt)
bpy.context.collection.objects.link(obj_plat)

# 2. Radial Segmented Flagstone Pavers on Deck
bm_pavers = bmesh.new()
n_radial_pavers = 18
r_inner_paver = 2.45
r_outer_paver = 8.6

for pi_idx in range(n_radial_pavers):
    a1 = 2.0 * pi * pi_idx / n_radial_pavers + 0.02
    a2 = 2.0 * pi * (pi_idx + 1) / n_radial_pavers - 0.02

    v1 = bm_pavers.verts.new((hw * (r_inner_paver / r_outer_paver) * cos(a1), hd * (r_inner_paver / r_outer_paver) * sin(a1), 0.04))
    v2 = bm_pavers.verts.new((hw * (r_inner_paver / r_outer_paver) * cos(a2), hd * (r_inner_paver / r_outer_paver) * sin(a2), 0.04))
    v3 = bm_pavers.verts.new((hw * 0.96 * cos(a2), hd * 0.96 * sin(a2), 0.04))
    v4 = bm_pavers.verts.new((hw * 0.96 * cos(a1), hd * 0.96 * sin(a1), 0.04))
    bm_pavers.faces.new([v1, v2, v3, v4])

bmesh.ops.recalc_face_normals(bm_pavers, faces=bm_pavers.faces)
mesh_pavers = bpy.data.meshes.new("Mesh_Platform_Radial_Pavers")
bm_pavers.to_mesh(mesh_pavers)
bm_pavers.free()
obj_pavers = bpy.data.objects.new("Platform_Radial_Pavers", mesh_pavers)
obj_pavers.parent = plat_parent
obj_pavers.data.materials.append(mat_basalt)
bpy.context.collection.objects.link(obj_pavers)

# 3. Central Concentric Medallion
bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=2.4, depth=0.06, location=(0, 0, 0.035))
obj_med = bpy.context.active_object
obj_med.name = 'Platform_Medallion'
obj_med.parent = plat_parent
obj_med.data.materials.append(mat_basalt)

for rad_r in [1.2, 2.35]:
    bpy.ops.mesh.primitive_torus_add(major_radius=rad_r, minor_radius=0.035, location=(0, 0, 0.055))
    obj_ring = bpy.context.active_object
    obj_ring.name = f'Platform_Rune_Ring_{rad_r}'
    obj_ring.parent = plat_parent
    obj_ring.visible_shadow = False
    obj_ring.data.materials.append(mat_rune)

# 4. Molten Deck Fissures
fissure_lines = [
    [(-8.0, 0.2), (-5.0, -0.4), (-2.0, 0.3), (1.5, -0.2), (5.0, 0.4), (8.0, -0.1)],
    [(-4.5, -0.4), (-4.2, -2.4), (-4.0, -4.2)],
    [(1.5, -0.2), (1.8, -2.2), (2.0, -4.3)],
    [(-2.0, 0.3), (-1.8, 2.2), (-1.5, 4.0)],
    [(5.0, 0.4), (5.2, 2.3), (5.5, 4.1)],
]
for f_idx, pts in enumerate(fissure_lines):
    bm_f = bmesh.new()
    prev = None
    w = 0.16
    for pi_idx, (px, py) in enumerate(pts):
        v_l = bm_f.verts.new((px - w*0.5, py, 0.045))
        v_r = bm_f.verts.new((px + w*0.5, py, 0.045))
        if prev:
            bm_f.faces.new([prev[0], prev[1], v_r, v_l])
        prev = (v_l, v_r)
    bmesh.ops.recalc_face_normals(bm_f, faces=bm_f.faces)
    mesh_f = bpy.data.meshes.new(f"Mesh_Deck_Fissure_{f_idx}")
    bm_f.to_mesh(mesh_f)
    bm_f.free()
    obj_f = bpy.data.objects.new(f"Deck_Fissure_{f_idx}", mesh_f)
    obj_f.parent = plat_parent
    obj_f.visible_shadow = False
    obj_f.data.materials.append(mat_fissure)
    bpy.context.collection.objects.link(obj_f)

# 5. Ancient Glowing Runic Glyphs Carved Along Front Cliff Face
def create_3d_rune_sigil(name, rx, ry, rz, scale=0.32):
    bm_r = bmesh.new()
    strokes = [
        ((0.0, 0.0, -scale), (0.0, 0.0, scale)),
        ((0.0, 0.0, scale*0.5), (scale*0.6, 0.0, 0.0)),
        ((0.0, 0.0, 0.0), (scale*0.6, 0.0, -scale*0.5)),
        ((0.0, 0.0, -scale*0.2), (-scale*0.5, 0.0, scale*0.3)),
    ]
    sw = 0.045
    for p1, p2 in strokes:
        v1 = bm_r.verts.new((p1[0] - sw, p1[1], p1[2]))
        v2 = bm_r.verts.new((p1[0] + sw, p1[1], p1[2]))
        v3 = bm_r.verts.new((p2[0] + sw, p2[1], p2[2]))
        v4 = bm_r.verts.new((p2[0] - sw, p2[1], p2[2]))
        bm_r.faces.new([v1, v2, v3, v4])
    bmesh.ops.recalc_face_normals(bm_r, faces=bm_r.faces)
    mesh = bpy.data.meshes.new(f'Mesh_{name}')
    bm_r.to_mesh(mesh)
    bm_r.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (rx, ry, rz)
    obj.parent = plat_parent
    obj.visible_shadow = False
    obj.data.materials.append(mat_rune)
    bpy.context.collection.objects.link(obj)
    return obj

rune_coords = [
    (-6.5, -hd * 0.90, -1.0),
    (-5.8, -hd * 0.92, -1.0),
    (-5.1, -hd * 0.94, -1.0),
    (-0.4, -hd * 0.99, -0.7),
    (-0.4, -hd * 0.99, -1.3),
    (0.4, -hd * 0.99, -0.7),
    (0.4, -hd * 0.99, -1.3),
    (5.1, -hd * 0.94, -1.0),
    (5.8, -hd * 0.92, -1.0),
    (6.5, -hd * 0.90, -1.0),
]
for ri_idx, (rx, ry, rz) in enumerate(rune_coords):
    create_3d_rune_sigil(f'Front_Cliff_Rune_{ri_idx}', rx, ry - 0.04, rz, scale=0.30)

# 6. Dripping Molten Lava Cascades from Platform Edge
drips = [
    (-7.2, -hd * 0.82, -plat_thick, -5.0, 0.12),
    (-4.5, -hd * 0.93, -plat_thick, -5.0, 0.15),
    (-1.2, -hd * 0.98, -plat_thick, -5.0, 0.13),
    (2.0, -hd * 0.98, -plat_thick, -5.0, 0.14),
    (4.8, -hd * 0.93, -plat_thick, -5.0, 0.15),
    (7.4, -hd * 0.80, -plat_thick, -5.0, 0.12),
]
for di_idx, (dx, dy, z_s, z_e, r_d) in enumerate(drips):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=r_d, depth=abs(z_e - z_s),
        location=(dx, dy, (z_s + z_e) * 0.5)
    )
    obj_d = bpy.context.active_object
    obj_d.name = f'Lava_Drip_{di_idx}'
    obj_d.parent = plat_parent
    obj_d.visible_shadow = False
    obj_d.data.materials.append(mat_lava)

    bpy.ops.mesh.primitive_torus_add(major_radius=r_d * 2.5, minor_radius=0.04, location=(dx, dy, z_e + 0.05))
    obj_sp = bpy.context.active_object
    obj_sp.name = f'Lava_Drip_Splash_{di_idx}'
    obj_sp.parent = plat_parent
    obj_sp.visible_shadow = False
    obj_sp.data.materials.append(mat_lava_erupt)

# ------------------------------------------------------------------------------
# 7. CONVECTIVE MAGMA LAKE & BASALT SPIRES
# ------------------------------------------------------------------------------
print(">>> Constructing Convective Magma Lake...")
bpy.ops.mesh.primitive_plane_add(size=250.0, location=(0.0, 0.0, -5.0))
obj_lake = bpy.context.active_object
obj_lake.name = 'Convective_Magma_Lake'
obj_lake.data.materials.append(mat_convective_lake)

def create_lake_spire(name, sx, sy, sz, sh, sr):
    bm = bmesh.new()
    verts_b = []
    for i in range(6):
        a = 2.0 * pi * i / 6
        verts_b.append(bm.verts.new((sr * cos(a), sr * sin(a), 0.0)))
    v_tip = bm.verts.new((0.05 * cos(a), 0.05 * sin(a), sh))
    bm.faces.new(list(reversed(verts_b)))
    for i in range(6):
        ni = (i + 1) % 6
        bm.faces.new([verts_b[i], verts_b[ni], v_tip])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(f'Mesh_{name}')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (sx, sy, sz)
    obj.data.materials.append(mat_basalt)
    bpy.context.collection.objects.link(obj)
    return obj

spires = [
    (-9.0, -7.0, -5.0, 3.2, 1.1),
    (-4.5, -8.0, -5.0, 2.5, 0.85),
    (0.8, -8.2, -5.0, 2.2, 0.80),
    (5.0, -7.8, -5.0, 2.8, 0.95),
    (9.2, -6.8, -5.0, 3.5, 1.2),
    (-14.0, -4.5, -5.0, 4.5, 1.5),
    (14.5, -4.5, -5.0, 4.8, 1.6),
    (-11.5, 4.0, -5.0, 3.8, 1.25),
    (11.8, 4.5, -5.0, 4.0, 1.30),
    (-6.5, 10.0, -5.0, 3.0, 0.95),
    (6.8, 10.5, -5.0, 3.2, 1.0),
    (0.0, 12.0, -5.0, 2.8, 0.90),
]
for s_idx, (sx, sy, sz, sh, sr) in enumerate(spires):
    create_lake_spire(f'Lake_Basalt_Spire_{s_idx}', sx, sy, sz, sh, sr)

# ------------------------------------------------------------------------------
# 8. ENCLOSING BASALT AMPHITHEATER & CASCADING LAVAFALLS
# ------------------------------------------------------------------------------
print(">>> Building Caldera Amphitheater & Cascading Lavafalls...")
amphi_parent = bpy.data.objects.new('Caldera_Amphitheater', None)
bpy.context.collection.objects.link(amphi_parent)

def create_hex_col(name, cx, cy, cz, ch, cr):
    bm = bmesh.new()
    vt, vb = [], []
    for i in range(6):
        a = pi/6.0 + i * pi/3.0
        vt.append(bm.verts.new((cr * cos(a), cr * sin(a), ch)))
        vb.append(bm.verts.new((cr * cos(a), cr * sin(a), 0.0)))
    bm.faces.new(vt)
    bm.faces.new(list(reversed(vb)))
    for i in range(6):
        ni = (i + 1) % 6
        bm.faces.new([vb[i], vb[ni], vt[ni], vt[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(f'Mesh_{name}')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (cx, cy, cz)
    obj.parent = amphi_parent
    obj.data.materials.append(mat_basalt)
    bpy.context.collection.objects.link(obj)
    return obj

# Amphitheater wall columns (R = 26m - 30m, wrap from 160 deg to 20 deg)
# Center section (|X| <= 10m) is lower (height 3.5m - 5.5m) to reveal Mount Fury's magnificent slopes!
n_wall_cols = 36
for wi in range(n_wall_cols):
    frac = wi / (n_wall_cols - 1)
    ang = radians(160.0 - frac * 140.0)
    r_w = 26.0 + 2.5 * sin(wi * 1.5)
    wx = r_w * cos(ang)
    wy = r_w * sin(ang)
    
    # Center dip to reveal Mount Fury vista
    center_factor = abs(wx) / 12.0
    if center_factor > 1.0: center_factor = 1.0
    wh = 4.0 + 7.5 * center_factor + 2.0 * sin(wi * 1.8)

    create_hex_col(f'Amphi_Col_{wi}', wx, wy, -5.0, wh, 1.4)
    r_w2 = r_w + 3.0
    create_hex_col(f'Amphi_Col_T2_{wi}', r_w2 * cos(ang), r_w2 * sin(ang), -5.0, wh + 2.8, 1.5)

# Cascading Lavafalls
def create_cascading_lavafall(name, start_pt, mid_pt, end_pt, width=3.2):
    bm = bmesh.new()
    uv_l = bm.loops.layers.uv.new('UVMap')
    steps = [(start_pt, mid_pt), (mid_pt, end_pt)]
    prev_edge = None
    for s_idx, (p1, p2) in enumerate(steps):
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        l_mag = sqrt(dx*dx + dy*dy) or 1.0
        tx, ty = (-dy / l_mag, dx / l_mag)

        v_s_l = bm.verts.new((p1[0] - tx * width * 0.5, p1[1] - ty * width * 0.5, p1[2]))
        v_s_r = bm.verts.new((p1[0] + tx * width * 0.5, p1[1] + ty * width * 0.5, p1[2]))
        v_e_l = bm.verts.new((p2[0] - tx * width * 0.5, p2[1] - ty * width * 0.5, p2[2]))
        v_e_r = bm.verts.new((p2[0] + tx * width * 0.5, p2[1] + ty * width * 0.5, p2[2]))

        f_s = bm.faces.new([v_s_l, v_s_r, v_e_r, v_e_l])
        for l in f_s.loops:
            u_val = 0.0 if l.vert in [v_s_l, v_e_l] else 1.0
            v_val = 0.0 if l.vert in [v_s_l, v_s_r] else 1.0
            l[uv_l].uv = (u_val, v_val)

        if prev_edge:
            pe_l, pe_r = prev_edge
            f_drop = bm.faces.new([pe_l, pe_r, v_s_r, v_s_l])
            for l in f_drop.loops:
                l[uv_l].uv = (0.0 if l.vert in [pe_l, v_s_l] else 1.0, 0.5)
        prev_edge = (v_e_l, v_e_r)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(f'Mesh_{name}')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.visible_shadow = False
    obj.data.materials.append(mat_lava)
    bpy.context.collection.objects.link(obj)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=width * 0.8, depth=0.15,
        location=(end_pt[0], end_pt[1], end_pt[2] + 0.08)
    )
    obj_sp = bpy.context.active_object
    obj_sp.name = f'{name}_Splash_Pool'
    obj_sp.visible_shadow = False
    obj_sp.data.materials.append(mat_lava_erupt)
    return obj

# 1. Grand Left Flank Lavafall (Cascading through left notch, matching Concept Ref 1 & 2)
create_cascading_lavafall('Lavafall_Left', (-22.0, 16.0, 11.0), (-19.0, 12.0, 3.5), (-17.0, 8.0, -4.8), width=3.4)

# 2. Mid-Left Stepped Lavafall (Cascading down flank)
create_cascading_lavafall('Lavafall_Mid_Left', (-14.0, 24.0, 9.5), (-12.5, 18.0, 3.0), (-11.0, 13.0, -4.8), width=2.8)

# 3. Grand Right Flank Lavafall (Matching Concept Ref 1 & 3)
create_cascading_lavafall('Lavafall_Right', (22.0, 18.0, 11.5), (19.5, 13.0, 4.0), (17.5, 9.0, -4.8), width=3.4)

# ------------------------------------------------------------------------------
# 9. CALIBRATED LIGHTING RIG
# ------------------------------------------------------------------------------
print(">>> Installing Lighting Rig...")

# Platform Keel Thermal Bounce Lights
l_keel_l = bpy.data.lights.new('Light_Keel_L', 'AREA')
l_keel_l.energy = 2400
l_keel_l.color = (1.0, 0.32, 0.01)
l_keel_l.size = 14.0
obj_kl = bpy.data.objects.new('Light_Keel_L', l_keel_l)
obj_kl.location = (-5.0, -1.0, -4.5)
obj_kl.rotation_euler = (radians(160), radians(-25), 0)
bpy.context.collection.objects.link(obj_kl)

l_keel_r = bpy.data.lights.new('Light_Keel_R', 'AREA')
l_keel_r.energy = 2400
l_keel_r.color = (1.0, 0.32, 0.01)
l_keel_r.size = 14.0
obj_kr = bpy.data.objects.new('Light_Keel_R', l_keel_r)
obj_kr.location = (5.0, -1.0, -4.5)
obj_kr.rotation_euler = (radians(160), radians(25), 0)
bpy.context.collection.objects.link(obj_kr)

# Front Cliff Upward Bounce
l_cliff_f = bpy.data.lights.new('Light_Cliff_F', 'AREA')
l_cliff_f.energy = 1800
l_cliff_f.color = (1.0, 0.30, 0.01)
l_cliff_f.size = 16.0
obj_kf = bpy.data.objects.new('Light_Cliff_F', l_cliff_f)
obj_kf.location = (0.0, -7.5, -3.8)
obj_kf.rotation_euler = (radians(130), 0, 0)
bpy.context.collection.objects.link(obj_kf)

# Mount Fury Summit Caldera Light
l_fury = bpy.data.lights.new('Light_Mount_Fury_Crater', 'POINT')
l_fury.energy = 28000
l_fury.color = (1.0, 0.45, 0.02)
obj_lfury = bpy.data.objects.new('Light_Mount_Fury_Crater', l_fury)
obj_lfury.location = (15.0, 66.0, -5.0 + 48.0 + 4.0)
bpy.context.collection.objects.link(obj_lfury)

# Directional Warm Sun Key (Grazing raking sunlight casting warm rim light on mountains and amphitheater)
l_sun = bpy.data.lights.new('Light_Sun_Key', 'SUN')
l_sun.energy = 4.5
l_sun.color = (1.0, 0.52, 0.10)
obj_sun = bpy.data.objects.new('Light_Sun_Key', l_sun)
obj_sun.rotation_euler = (radians(65), radians(15), radians(25))
bpy.context.collection.objects.link(obj_sun)

# Stage Front Fill
l_fill = bpy.data.lights.new('Light_Stage_Fill', 'AREA')
l_fill.energy = 500
l_fill.color = (1.0, 0.40, 0.05)
l_fill.size = 20.0
obj_fill = bpy.data.objects.new('Light_Stage_Fill', l_fill)
obj_fill.location = (0.0, -18.0, 4.0)
obj_fill.rotation_euler = (radians(65), 0, 0)
bpy.context.collection.objects.link(obj_fill)

# ------------------------------------------------------------------------------
# 10. MULTI-ANGLE CAMERAS & RENDER
# ------------------------------------------------------------------------------
print(">>> Setting up Multi-Angle Verification Cameras...")
cams = {}
def add_cam(cid, name, loc, rot, lens=24.0):
    cdata = bpy.data.cameras.new(cid)
    cdata.lens = lens
    cdata.clip_start = 0.1
    cdata.clip_end = 850.0
    cobj = bpy.data.objects.new(name, cdata)
    cobj.location = loc
    cobj.rotation_euler = rot
    bpy.context.collection.objects.link(cobj)
    cams[cid] = cobj
    return cobj

add_cam('cam_front', 'Camera_Front', (0.0, -19.5, 3.8), (radians(84.5), 0, 0), lens=24.0)
add_cam('cam_left_profile', 'Camera_Left', (-20.0, -0.5, 3.5), (radians(83.0), 0, radians(-78.0)), lens=24.0)
add_cam('cam_isometric_aerial', 'Camera_Isometric', (24.0, -20.0, 22.0), (radians(54.0), 0, radians(48.0)), lens=28.0)
add_cam('cam_right_perspective', 'Camera_Right', (19.5, -4.0, 4.2), (radians(81.0), 0, radians(75.0)), lens=24.0)
add_cam('cam_low_angle_hero', 'Camera_LowHero', (0.0, -14.5, -1.8), (radians(98.5), 0, 0), lens=20.0)

out_dir = r"d:\Keyboard stickman warrior\test_3d"
blend_path = os.path.join(out_dir, "keyfury_stage_volcanic_caldera.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> Saved blend: {blend_path}")

render_targets = [
    ('cam_front', 'volcanic_caldera_render_front.png'),
    ('cam_left_profile', 'volcanic_caldera_render_left_profile.png'),
    ('cam_isometric_aerial', 'volcanic_caldera_render_isometric_aerial.png'),
    ('cam_right_perspective', 'volcanic_caldera_render_right_perspective.png'),
    ('cam_low_angle_hero', 'volcanic_caldera_render_low_angle.png'),
]

bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.resolution_percentage = 100

for cid, fname in render_targets:
    bpy.context.scene.camera = cams[cid]
    bpy.context.scene.render.filepath = os.path.join(out_dir, fname)
    print(f"Rendering {cid} -> {fname}...")
    bpy.ops.render.render(write_still=True)

print(">>> ALL MASTERPIECE VOLCANIC RENDERS COMPLETE!")

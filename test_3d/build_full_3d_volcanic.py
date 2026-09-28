"""
KeyFury 3D: Volcanic Caldera (Infernal Magma Forge) - 100% Pure 3D Environment
Complete Procedural & Geometric 3D Stage in Blender 5.2.1 LTS:
- 100% Genuine 3D Meshes: Zero 2D flat backdrop planes, image projections, or cutouts
- Floating Fractured Obsidian Combat Island at Z = 0.0 with deep glowing magma fissures
- Rugged Inverted Basalt Underside with organic craggy stalactites and dripping molten lava streams
- Clustered Hexagonal Basalt Columns flanking the combat island
- Procedural Boiling Molten Lava Lake at Z = -4.5m with convective magma currents and dark cooling crust
- Open Central Caldera Valley with winding glowing magma rivers
- Stepped Basalt Cliff Amphitheater on the flanks with cascading molten lavafalls
- Towering Active Stratovolcano (Mount Fury) with procedural ribbed buttresses, glowing caldera crater, eruption fountain, and slope lava rivers
- Secondary Active Cinder Volcano with smoking summit crater
- Distant Serrated Volcanic Mountain Ridges along the horizon
- Massive Billowing Volcanic Ash & Smoke Plumes with fiery underlighting
- Floating Glowing Embers and Hurtling Volcanic Bombs
- 3D Procedural Fiery Ash Sky Dome with fiery horizon gradient
- Calibrated Volcanic Sunlight & Magma Underglow revealing rich rock strata and infernal glow
- Calibrated 16:9 Combat Camera (Platform Ratio: 0.62, centered combat framing)
import sys
import os
sys.stdout = open(r"d:\Keyboard stickman warrior\test_3d\run_log.txt", "w", buffering=1)
sys.stderr = sys.stdout
print(">>> Starting script execution...")

import math
from math import radians, sin, cos, sqrt, pi
import os
import random

print(">>> [Volcanic Caldera 100% 3D] Initializing Masterpiece Environment Generation...")

# ==============================================================================
# 1. Clean Scene
# ==============================================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0: bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0: bpy.data.materials.remove(block)
for block in bpy.data.images:
    if block.users == 0: bpy.data.images.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'

# World Environment (Warm volcanic ambient fill)
world = scene.world
if not world:
    world = bpy.data.worlds.new("Volcanic_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.24, 0.08, 0.04, 1.0)
    bg_node.inputs['Strength'].default_value = 0.85

out_dir = r"d:\Keyboard stickman warrior\test_3d"

# ==============================================================================
# 2. Material Builders
# ==============================================================================
def make_shader(name, base_color=(0.1, 0.1, 0.1, 1.0), roughness=0.7, metallic=0.1, specular=0.5):
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

def make_emissive(name, color=(1.0, 0.35, 0.02, 1.0), strength=2.0):
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

def make_procedural_lava_shader(name, strength=2.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    ramp = nodes.new(type='ShaderNodeValToRGB')
    noise = nodes.new(type='ShaderNodeTexNoise')
    mapping = nodes.new(type='ShaderNodeMapping')
    tc = nodes.new(type='ShaderNodeTexCoord')
    
    noise.inputs['Scale'].default_value = 0.28
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.65
    
    ramp.color_ramp.elements[0].position = 0.38
    ramp.color_ramp.elements[0].color = (0.09, 0.08, 0.08, 1.0) # Dark basalt crust
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (1.00, 0.68, 0.12, 1.0) # Incandescent core
    
    e1 = ramp.color_ramp.elements.new(0.48)
    e1.color = (0.85, 0.14, 0.01, 1.0) # Molten red
    e2 = ramp.color_ramp.elements.new(0.72)
    e2.color = (1.00, 0.40, 0.02, 1.0) # Magma orange
    
    emit.inputs['Strength'].default_value = strength
    
    mat.node_tree.links.new(tc.outputs['Object'], mapping.inputs['Vector'])
    mat.node_tree.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    mat.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    mat.node_tree.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

def make_waterfall_shader(name, strength=2.6):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    ramp = nodes.new(type='ShaderNodeValToRGB')
    noise = nodes.new(type='ShaderNodeTexNoise')
    mapping = nodes.new(type='ShaderNodeMapping')
    tc = nodes.new(type='ShaderNodeTexCoord')
    
    mapping.inputs['Scale'].default_value = (1.2, 1.0, 5.0)
    noise.inputs['Scale'].default_value = 0.85
    noise.inputs['Detail'].default_value = 4.0
    noise.inputs['Roughness'].default_value = 0.60
    
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.85, 0.14, 0.01, 1.0) # Deep molten red
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (1.00, 0.70, 0.12, 1.0) # Hot gold foam
    
    e1 = ramp.color_ramp.elements.new(0.40)
    e1.color = (1.00, 0.38, 0.02, 1.0) # Fiery orange
    e2 = ramp.color_ramp.elements.new(0.75)
    e2.color = (1.00, 0.55, 0.06, 1.0) # Bright amber
    
    emit.inputs['Strength'].default_value = strength
    
    mat.node_tree.links.new(tc.outputs['Object'], mapping.inputs['Vector'])
    mat.node_tree.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    mat.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    mat.node_tree.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

def make_smoke_shader(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodePrincipledBSDF')
    ramp = nodes.new(type='ShaderNodeValToRGB')
    map_range = nodes.new(type='ShaderNodeMapRange')
    sep = nodes.new(type='ShaderNodeSeparateXYZ')
    tc = nodes.new(type='ShaderNodeTexCoord')
    
    map_range.inputs['From Min'].default_value = 16.0
    map_range.inputs['From Max'].default_value = 35.0
    map_range.inputs['To Min'].default_value = 0.0
    map_range.inputs['To Max'].default_value = 1.0
    
    # Bottom of smoke plume is warm fiery soot; top is dense dark charcoal
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.35, 0.12, 0.05, 1.0)
    ramp.color_ramp.elements[1].position = 0.50
    ramp.color_ramp.elements[1].color = (0.07, 0.06, 0.07, 1.0)
    
    bsdf.inputs['Roughness'].default_value = 0.98
    bsdf.inputs['Metallic'].default_value = 0.0
    
    mat.node_tree.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    mat.node_tree.links.new(sep.outputs['Z'], map_range.inputs['Value'])
    mat.node_tree.links.new(map_range.outputs['Result'], ramp.inputs['Fac'])
    mat.node_tree.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def make_sky_gradient_mat(name):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    ramp = nodes.new(type='ShaderNodeValToRGB')
    map_range = nodes.new(type='ShaderNodeMapRange')
    sep = nodes.new(type='ShaderNodeSeparateXYZ')
    tc = nodes.new(type='ShaderNodeTexCoord')
    
    map_range.inputs['From Min'].default_value = -5.0
    map_range.inputs['From Max'].default_value = 65.0
    map_range.inputs['To Min'].default_value = 0.0
    map_range.inputs['To Max'].default_value = 1.0
    
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (1.00, 0.35, 0.02, 1.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.05, 0.04, 0.05, 1.0)
    
    e1 = ramp.color_ramp.elements.new(0.20)
    e1.color = (0.82, 0.14, 0.02, 1.0)
    e2 = ramp.color_ramp.elements.new(0.48)
    e2.color = (0.28, 0.07, 0.03, 1.0)
    e3 = ramp.color_ramp.elements.new(0.78)
    e3.color = (0.10, 0.07, 0.08, 1.0)
    
    mat.node_tree.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    mat.node_tree.links.new(sep.outputs['Z'], map_range.inputs['Value'])
    mat.node_tree.links.new(map_range.outputs['Result'], ramp.inputs['Fac'])
    mat.node_tree.links.new(ramp.outputs['Color'], emit.inputs['Color'])
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    emit.inputs['Strength'].default_value = 1.30
    return mat

# Rock & Basalt PBR Materials (Rich warm volcanic tones matching concept art)
mat_obsidian_deck  = make_shader("Mat_Obsidian_Deck",  (0.20, 0.18, 0.20, 1.0), roughness=0.35, metallic=0.18, specular=0.88)
mat_obsidian_rim   = make_shader("Mat_Obsidian_Rim",   (0.18, 0.15, 0.16, 1.0), roughness=0.68, metallic=0.10, specular=0.65)
mat_basalt_crag    = make_shader("Mat_Basalt_Crag",    (0.16, 0.13, 0.14, 1.0), roughness=0.75, metallic=0.06, specular=0.55)
mat_basalt_column  = make_shader("Mat_Basalt_Column",  (0.22, 0.18, 0.18, 1.0), roughness=0.62, metallic=0.12, specular=0.60)
mat_volc_cliff     = make_shader("Mat_Volc_Cliff",     (0.38, 0.22, 0.16, 1.0), roughness=0.75, metallic=0.04, specular=0.50)
mat_volcano_cone   = make_shader("Mat_Volcano_Cone",   (0.42, 0.24, 0.18, 1.0), roughness=0.78, metallic=0.03, specular=0.45)
mat_distant_ridge  = make_shader("Mat_Distant_Ridge",  (0.45, 0.20, 0.14, 1.0), roughness=0.85, metallic=0.00, specular=0.35)

# Molten Lava Materials
mat_lava_core      = make_emissive("Mat_Lava_Core",     (1.00, 0.50, 0.05, 1.0), strength=3.2)
mat_lava_procedural= make_procedural_lava_shader("Mat_Lava_Procedural", strength=2.0)
mat_lava_drip      = make_emissive("Mat_Lava_Drip",     (1.00, 0.48, 0.05, 1.0), strength=2.8)
mat_lava_fall      = make_waterfall_shader("Mat_Lava_Fall", strength=2.6)
mat_ember          = make_emissive("Mat_Ember",         (1.00, 0.42, 0.03, 1.0), strength=3.4)

# Volcanic Smoke & Sky Materials
mat_smoke_plume    = make_smoke_shader("Mat_Smoke_Plume")
mat_sky_procedural = make_sky_gradient_mat("Mat_Sky_Procedural")

def add_mesh_obj(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

# ==============================================================================
# 3. Floating Fractured Obsidian Combat Island (Walking Surface at Z = 0.0)
# ==============================================================================
print(">>> Building Floating Obsidian Combat Island...")
bm_island = bmesh.new()

# Main structural obsidian core slab (Z = -1.15 to -0.04m, Width: 18.0m, Depth: 4.8m)
bmesh.ops.create_cube(bm_island, size=1.0,
    matrix=mathutils.Matrix.Translation((0.0, 0.0, -0.60)) @
           mathutils.Matrix.Scale(18.0, 4, (1, 0, 0)) @
           mathutils.Matrix.Scale(4.8,  4, (0, 1, 0)) @
           mathutils.Matrix.Scale(1.10, 4, (0, 0, 1)))

# Jagged, faceted front rim blocks (Z = -1.15 to 0.0, Y = -2.4 to -2.0)
front_blocks = [
    (-8.2, -2.25, 1.7, 0.85, 1.00),
    (-6.5, -2.32, 1.8, 0.90, 1.10),
    (-4.7, -2.28, 1.9, 0.88, 1.05),
    (-2.9, -2.35, 1.8, 0.95, 1.15),
    (-1.0, -2.26, 2.0, 0.92, 1.08),
    ( 1.0, -2.30, 2.1, 0.88, 1.12),
    ( 3.0, -2.25, 1.9, 0.90, 1.06),
    ( 4.9, -2.34, 1.9, 0.94, 1.10),
    ( 6.8, -2.28, 1.8, 0.86, 1.02),
    ( 8.3, -2.22, 1.6, 0.82, 0.95)
]
for fbx, fby, fbw, fbd, fbh in front_blocks:
    bmesh.ops.create_cube(bm_island, size=1.0,
        matrix=mathutils.Matrix.Translation((fbx, fby, -fbh * 0.5)) @
               mathutils.Matrix.Scale(fbw, 4, (1, 0, 0)) @
               mathutils.Matrix.Scale(fbd, 4, (0, 1, 0)) @
               mathutils.Matrix.Scale(fbh, 4, (0, 0, 1)))

# Top Fractured Obsidian Deck Plates (Walking surface precisely at Z = 0.0)
for row in range(4):
    py = -1.65 + row * 1.10
    for col in range(9):
        px = -7.6 + col * 1.90
        jitter_x = 0.06 * sin(px * 1.5 + py)
        jitter_y = 0.05 * cos(px - py * 1.2)
        bmesh.ops.create_cube(bm_island, size=1.0,
            matrix=mathutils.Matrix.Translation((px + jitter_x, py + jitter_y, -0.02)) @
                   mathutils.Matrix.Scale(1.74, 4, (1, 0, 0)) @
                   mathutils.Matrix.Scale(0.96, 4, (0, 1, 0)) @
                   mathutils.Matrix.Scale(0.04, 4, (0, 0, 1)))

# Central Inverted Rocky Keel (Massive rugged rock foundation down to Z = -2.2m)
bmesh.ops.create_cube(bm_island, size=1.0,
    matrix=mathutils.Matrix.Translation((0.0, 0.0, -1.65)) @
           mathutils.Matrix.Scale(13.0, 4, (1, 0, 0)) @
           mathutils.Matrix.Scale(2.8,  4, (0, 1, 0)) @
           mathutils.Matrix.Scale(1.10, 4, (0, 0, 1)))

# Organic Craggy Stalactites (5 distinct natural crag fangs, matching reference!)
stalactite_clusters = [
    (-6.5, -0.2, 2.4, 1.2,  radians(-8)),
    (-2.8,  0.4, 2.8, 1.3,  radians( 6)),
    ( 0.2, -0.4, 3.2, 1.5,  radians(-5)),
    ( 3.5,  0.3, 2.7, 1.3,  radians( 7)),
    ( 6.8, -0.2, 2.2, 1.1,  radians(-6))
]
for sx, sy, sdepth, srad, srot in stalactite_clusters:
    bmesh.ops.create_cone(bm_island, segments=7, radius1=0.08, radius2=srad, depth=sdepth,
        matrix=mathutils.Matrix.Translation((sx, sy, -1.1 - sdepth * 0.5)) @
               mathutils.Matrix.Rotation(srot, 4, 'Y'))

# Side Flanking Basalt Hexagonal Columns (Left: X ~ -8.8 to -9.8, Right: X ~ 8.8 to 9.8)
col_positions = [
    (-8.9, -1.4, 1.4), (-9.3, -0.6, 1.8), (-9.1,  0.4, 1.6), (-9.5,  1.2, 1.3),
    ( 8.9, -1.3, 1.5), ( 9.4, -0.5, 1.9), ( 9.0,  0.5, 1.7), ( 9.6,  1.3, 1.4)
]
for cx, cy, ch in col_positions:
    bmesh.ops.create_cone(bm_island, segments=6, radius1=0.45, radius2=0.45, depth=ch,
        matrix=mathutils.Matrix.Translation((cx, cy, -ch * 0.5)))

island_mesh = bpy.data.meshes.new("Volcanic_Island_Mesh")
bm_island.to_mesh(island_mesh)
bm_island.free()
island_obj = add_mesh_obj("Volcanic_3D_Island", island_mesh)
island_obj.data.materials.append(mat_obsidian_deck)

# ==============================================================================
# 4. Dedicated Glowing Magma Fissures & Surface Veins
# ==============================================================================
print(">>> Building Glowing Magma Fissures...")
bm_veins = bmesh.new()

# Main Jagged Central Magma Fissure cutting across the deck (Z = 0.006)
main_fissure_nodes = [
    (-8.2, -0.2), (-6.0,  0.3), (-4.2, -0.4), (-2.0,  0.2),
    ( 0.0, -0.3), ( 2.2,  0.4), ( 4.5, -0.2), ( 6.4,  0.3), ( 8.2, -0.1)
]
for i in range(len(main_fissure_nodes) - 1):
    x1, y1 = main_fissure_nodes[i]
    x2, y2 = main_fissure_nodes[i+1]
    mx, my = (x1 + x2) * 0.5, (y1 + y2) * 0.5
    seg_len = sqrt((x2 - x1)**2 + (y2 - y1)**2)
    angle = math.atan2(y2 - y1, x2 - x1)
    bmesh.ops.create_cube(bm_veins, size=1.0,
        matrix=mathutils.Matrix.Translation((mx, my, 0.006)) @
               mathutils.Matrix.Rotation(angle, 4, 'Z') @
               mathutils.Matrix.Scale(seg_len, 4, (1, 0, 0)) @
               mathutils.Matrix.Scale(0.16,    4, (0, 1, 0)) @
               mathutils.Matrix.Scale(0.015,   4, (0, 0, 1)))

# Branching Tributary Veins extending towards the edges
branch_veins = [
    (-6.0,  0.3, 2.4, radians( 65)),
    (-4.2, -0.4, 2.2, radians(-70)),
    (-2.0,  0.2, 2.5, radians( 60)),
    ( 0.0, -0.3, 2.3, radians(-75)),
    ( 2.2,  0.4, 2.6, radians( 55)),
    ( 4.5, -0.2, 2.4, radians(-65)),
    ( 6.4,  0.3, 2.2, radians( 70)),
    (-7.2, -0.8, 1.8, radians(-45)),
    ( 7.2, -0.6, 1.9, radians(-50))
]
for bx, by, blen, brot in branch_veins:
    bmesh.ops.create_cube(bm_veins, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, by, 0.006)) @
               mathutils.Matrix.Rotation(brot, 4, 'Z') @
               mathutils.Matrix.Translation((blen * 0.5, 0, 0)) @
               mathutils.Matrix.Scale(blen,  4, (1, 0, 0)) @
               mathutils.Matrix.Scale(0.12,  4, (0, 1, 0)) @
               mathutils.Matrix.Scale(0.015, 4, (0, 0, 1)))

# Vertical glowing magma veins running down the front cliff face of the island
vertical_veins = [
    (-6.5, -2.33, 1.10),
    (-2.9, -2.36, 1.15),
    ( 1.0, -2.31, 1.12),
    ( 4.9, -2.35, 1.10),
    ( 8.3, -2.23, 0.95)
]
for vx, vy, vh in vertical_veins:
    bmesh.ops.create_cube(bm_veins, size=1.0,
        matrix=mathutils.Matrix.Translation((vx, vy - 0.01, -vh * 0.5)) @
               mathutils.Matrix.Scale(0.14, 4, (1, 0, 0)) @
               mathutils.Matrix.Scale(0.06, 4, (0, 1, 0)) @
               mathutils.Matrix.Scale(vh,   4, (0, 0, 1)))

veins_mesh = bpy.data.meshes.new("Volcanic_Veins_Mesh")
bm_veins.to_mesh(veins_mesh)
bm_veins.free()
veins_obj = add_mesh_obj("Volcanic_3D_Magma_Veins", veins_mesh)
veins_obj.data.materials.append(mat_lava_core)

# ==============================================================================
# 5. Dripping Molten Lava Streams from Island into Lava Lake Below
# ==============================================================================
print(">>> Building Dripping Molten Lava Streams...")
bm_drip = bmesh.new()

drip_streams = [
    (-6.5, -2.33, 0.0, -4.5, 0.16, 0.08),
    (-2.9, -2.36, -0.2, -4.5, 0.20, 0.10),
    ( 1.0, -2.31, 0.0, -4.5, 0.22, 0.11),
    ( 4.9, -2.35, -0.1, -4.5, 0.18, 0.09),
    ( 8.3, -2.23, -0.3, -4.5, 0.15, 0.07)
]
for dx, dy, z_top, z_bot, r_top, r_bot in drip_streams:
    d_height = z_top - z_bot
    bmesh.ops.create_cone(bm_drip, segments=6, radius1=r_bot, radius2=r_top, depth=d_height,
        matrix=mathutils.Matrix.Translation((dx, dy, z_bot + d_height * 0.5)))
    bmesh.ops.create_cone(bm_drip, segments=8, radius1=0.55, radius2=0.10, depth=0.12,
        matrix=mathutils.Matrix.Translation((dx, dy, z_bot + 0.06)))

drip_mesh = bpy.data.meshes.new("Volcanic_Dripping_Mesh")
bm_drip.to_mesh(drip_mesh)
bm_drip.free()
drip_obj = add_mesh_obj("Volcanic_3D_Dripping_Lava", drip_mesh)
drip_obj.data.materials.append(mat_lava_drip)

# ==============================================================================
# 6. Boiling Molten Lava Lake (Z = -4.5m) with Procedural Magma Shader
# ==============================================================================
print(">>> Building Molten Lava Lake...")
bm_lava = bmesh.new()

res_lx, res_ly = 54, 44
min_lx, max_lx = -64.0, 64.0
min_ly, max_ly = -22.0, 60.0

lava_verts = []
for j in range(res_ly):
    row = []
    ly = min_ly + (j / (res_ly - 1)) * (max_ly - min_ly)
    for i in range(res_lx):
        lx = min_lx + (i / (res_lx - 1)) * (max_lx - min_lx)
        lz = -4.5 + 0.14 * sin(lx * 0.20 + ly * 0.15) + 0.09 * cos(lx * 0.32 - ly * 0.18)
        v = bm_lava.verts.new((lx, ly, lz))
        row.append(v)
    lava_verts.append(row)

for j in range(res_ly - 1):
    for i in range(res_lx - 1):
        v1 = lava_verts[j][i]
        v2 = lava_verts[j][i+1]
        v3 = lava_verts[j+1][i+1]
        v4 = lava_verts[j+1][i]
        bm_lava.faces.new([v1, v2, v3, v4])

lava_mesh = bpy.data.meshes.new("Volcanic_Lava_Mesh")
bm_lava.to_mesh(lava_mesh)
bm_lava.free()
lava_obj = add_mesh_obj("Volcanic_3D_Lava_Lake", lava_mesh)
lava_obj.data.materials.append(mat_lava_procedural)
for poly in lava_mesh.polygons: poly.use_smooth = True

# ==============================================================================
# 7. Foreground Framing Crags & Basalt Rock Formations
# ==============================================================================
print(">>> Building Framing Crags & Low Needles...")
bm_spires = bmesh.new()

# Left Foreground Framing Obsidian Cliff (Frames the left 16:9 view)
for lx, ly, lw, ld, lh in [
    (-15.5, -7.0, 5.2, 6.0, 5.4),
    (-14.2, -3.0, 4.4, 5.0, 4.8),
    (-17.0, -11.0, 6.2, 7.0, 6.2)
]:
    bmesh.ops.create_cone(bm_spires, segments=7, radius1=lw * 0.5, radius2=0.4, depth=lh,
        matrix=mathutils.Matrix.Translation((lx, ly, -4.5 + lh * 0.5)))

# Right Foreground Framing Obsidian Cliff (Frames the right 16:9 view)
for rx, ry, rw, rd, rh in [
    ( 15.5, -7.0, 5.2, 6.0, 5.4),
    ( 14.2, -3.0, 4.4, 5.0, 4.8),
    ( 17.0, -11.0, 6.2, 7.0, 6.2)
]:
    bmesh.ops.create_cone(bm_spires, segments=7, radius1=rw * 0.5, radius2=0.4, depth=rh,
        matrix=mathutils.Matrix.Translation((rx, ry, -4.5 + rh * 0.5)))

# Low rock teeth deep in the lava lake below the island (low in frame, Z = -3.2m max)
for px, py in [(-6.5, -3.8), (0.2, -4.0), (6.8, -3.8)]:
    bmesh.ops.create_cone(bm_spires, segments=6, radius1=0.8, radius2=0.08, depth=1.4,
        matrix=mathutils.Matrix.Translation((px, py, -4.5 + 0.7)))

spires_mesh = bpy.data.meshes.new("Volcanic_Spires_Mesh")
bm_spires.to_mesh(spires_mesh)
bm_spires.free()
spires_obj = add_mesh_obj("Volcanic_3D_Basalt_Spires", spires_mesh)
spires_obj.data.materials.append(mat_basalt_crag)

# ==============================================================================
# 8. Stepped Basalt Cliff Amphitheater (Flanking) & Open Central Caldera Valley
# ==============================================================================
print(">>> Building Flanking Amphitheater Cliffs & Valley Rivers...")
bm_caldera = bmesh.new()

# Left Flanking Cliff Wall (Faceted rock tiers, X = -16 to -28, Y = 26 to 38)
for cx, cy, cr, ch in [
    (-18.0, 28.0, 4.2, 8.5),
    (-24.0, 32.0, 4.8, 9.5),
    (-19.0, 36.0, 4.4, 9.0)
]:
    bmesh.ops.create_cone(bm_caldera, segments=8, radius1=cr, radius2=cr * 0.7, depth=ch,
        matrix=mathutils.Matrix.Translation((cx, cy, -4.5 + ch * 0.5)))

# Right Flanking Stepped Cliff Shelf (Behind the waterfall, X = 16 to 26, Y = 28 to 36)
for cx, cy, cr, ch in [
    ( 18.0, 29.0, 4.4, 9.0),
    ( 24.0, 32.0, 4.6, 9.5),
    ( 20.0, 36.0, 4.2, 9.0)
]:
    bmesh.ops.create_cone(bm_caldera, segments=8, radius1=cr, radius2=cr * 0.7, depth=ch,
        matrix=mathutils.Matrix.Translation((cx, cy, -4.5 + ch * 0.5)))

# Low rocky mounds in central open valley (X = -8 to +10, Y = 24 to 45, Z = -4.5 to -2.0m)
for cx, cy, cr, ch in [
    (-5.0, 26.0, 2.4, 1.8),
    ( 3.5, 28.0, 2.6, 2.0),
    (-1.5, 36.0, 3.0, 2.2),
    ( 4.5, 40.0, 2.8, 2.0)
]:
    bmesh.ops.create_cone(bm_caldera, segments=7, radius1=cr, radius2=0.4, depth=ch,
        matrix=mathutils.Matrix.Translation((cx, cy, -4.5 + ch * 0.5)))

caldera_mesh = bpy.data.meshes.new("Volcanic_Caldera_Mesh")
bm_caldera.to_mesh(caldera_mesh)
bm_caldera.free()
caldera_obj = add_mesh_obj("Volcanic_3D_Caldera_Walls", caldera_mesh)
caldera_obj.data.materials.append(mat_volc_cliff)

# ==============================================================================
# 9. Cascading Lava Waterfalls (Lavafalls) & Valley Magma Rivers
# ==============================================================================
print(">>> Building Cascading Lavafalls & Valley Rivers...")
bm_lavafalls = bmesh.new()

# 1. Right Cliff Mega-Lavafall (Wide curtain cascading down dark cliff face)
# Pours down at X = 16.5, Y = 25.8, from Z = 4.8m down to Z = -4.3m
bmesh.ops.create_cube(bm_lavafalls, size=1.0,
    matrix=mathutils.Matrix.Translation((16.5, 25.8, 0.25)) @
           mathutils.Matrix.Scale(4.2,  4, (1, 0, 0)) @
           mathutils.Matrix.Scale(0.35, 4, (0, 1, 0)) @
           mathutils.Matrix.Scale(9.1,  4, (0, 0, 1)))
# Curved crest spillway at top (Z = 4.8m)
bmesh.ops.create_cube(bm_lavafalls, size=1.0,
    matrix=mathutils.Matrix.Translation((16.5, 26.5, 4.8)) @
           mathutils.Matrix.Scale(4.6, 4, (1, 0, 0)) @
           mathutils.Matrix.Scale(1.8, 4, (0, 1, 0)) @
           mathutils.Matrix.Scale(0.3, 4, (0, 0, 1)))
# Foaming splash pool at base on lake surface
bmesh.ops.create_cube(bm_lavafalls, size=1.0,
    matrix=mathutils.Matrix.Translation((16.5, 25.0, -4.3)) @
           mathutils.Matrix.Scale(5.8, 4, (1, 0, 0)) @
           mathutils.Matrix.Scale(2.8, 4, (0, 1, 0)) @
           mathutils.Matrix.Scale(0.25, 4, (0, 0, 1)))

# 2. Right Secondary Lavafall Chute (X = 22.5, Y = 28.5, Z = 4.5 to -4.0m)
bmesh.ops.create_cube(bm_lavafalls, size=1.0,
    matrix=mathutils.Matrix.Translation((22.5, 28.5, 0.25)) @
           mathutils.Matrix.Scale(1.8,  4, (1, 0, 0)) @
           mathutils.Matrix.Scale(0.30, 4, (0, 1, 0)) @
           mathutils.Matrix.Scale(8.5,  4, (0, 0, 1)))

# 3. Left Cliff Lavafall (X = -16.5, Y = 24.8, Z = 4.0 to -4.0m)
bmesh.ops.create_cube(bm_lavafalls, size=1.0,
    matrix=mathutils.Matrix.Translation((-16.5, 24.8, 0.0)) @
           mathutils.Matrix.Scale(2.0,  4, (1, 0, 0)) @
           mathutils.Matrix.Scale(0.30, 4, (0, 1, 0)) @
           mathutils.Matrix.Scale(8.0,  4, (0, 0, 1)))

# Winding Magma Rivers snaking across the open valley floor into the distance
valley_rivers = [
    (-8.0, 24.0, -3.0, 32.0, 1.4),
    (-3.0, 32.0,  3.0, 42.0, 1.6),
    ( 3.0, 42.0,  9.0, 52.0, 1.8),
    ( 5.0, 25.0, 11.0, 34.0, 1.5),
    (11.0, 34.0, 16.0, 46.0, 2.0)
]
for rx1, ry1, rx2, ry2, r_width in valley_rivers:
    rmx, rmy = (rx1 + rx2) * 0.5, (ry1 + ry2) * 0.5
    rlen = sqrt((rx2 - rx1)**2 + (ry2 - ry1)**2)
    rangle = math.atan2(ry2 - ry1, rx2 - rx1)
    bmesh.ops.create_cube(bm_lavafalls, size=1.0,
        matrix=mathutils.Matrix.Translation((rmx, rmy, -4.28)) @
               mathutils.Matrix.Rotation(rangle, 4, 'Z') @
               mathutils.Matrix.Scale(rlen,    4, (1, 0, 0)) @
               mathutils.Matrix.Scale(r_width, 4, (0, 1, 0)) @
               mathutils.Matrix.Scale(0.18,    4, (0, 0, 1)))

lavafalls_mesh = bpy.data.meshes.new("Volcanic_Lavafalls_Mesh")
bm_lavafalls.to_mesh(lavafalls_mesh)
bm_lavafalls.free()
lavafalls_obj = add_mesh_obj("Volcanic_3D_Lavafalls", lavafalls_mesh)
lavafalls_obj.data.materials.append(mat_lava_fall)

# ==============================================================================
# 10. Background Active Erupting Stratovolcanoes & Mountain Ridges
# ==============================================================================
print(">>> Building Active Erupting Stratovolcano (Mount Fury) & Cinder Peak...")
bm_volcanoes = bmesh.new()

def build_ribbed_volcano(bm, center_x, center_y, base_z, summit_z, base_radius, summit_radius, num_rings=16, num_sectors=36, rib_count=10, rib_amp=0.14):
    ring_verts = []
    height = summit_z - base_z
    for r in range(num_rings):
        t = r / (num_rings - 1)
        curr_z = base_z + t * height
        curr_rad = base_radius * (1.0 - t) + summit_radius * t
        
        row = []
        for s in range(num_sectors):
            angle = (s / num_sectors) * 2.0 * pi
            rib_factor = 1.0 + rib_amp * (1.0 - t * 0.7) * sin(angle * rib_count)
            rib_factor += 0.05 * sin(angle * (rib_count * 2 + 1))
            rad = curr_rad * rib_factor
            vx = center_x + rad * cos(angle)
            vy = center_y + rad * sin(angle)
            v = bm.verts.new((vx, vy, curr_z))
            row.append(v)
        ring_verts.append(row)
    
    for r in range(num_rings - 1):
        for s in range(num_sectors):
            s_next = (s + 1) % num_sectors
            v1 = ring_verts[r][s]
            v2 = ring_verts[r][s_next]
            v3 = ring_verts[r+1][s_next]
            v4 = ring_verts[r+1][s]
            bm.faces.new([v1, v2, v3, v4])

# Primary Stratovolcano: Mount Fury (Procedural Ribbed Stratovolcano Cone)
build_ribbed_volcano(bm_volcanoes, center_x=18.0, center_y=52.0, base_z=-2.5, summit_z=17.5,
                     base_radius=25.0, summit_radius=3.5, num_rings=16, num_sectors=36, rib_count=10, rib_amp=0.15)

# Secondary Volcano: Cinder Peak (Procedural Ribbed Cone)
build_ribbed_volcano(bm_volcanoes, center_x=-14.0, center_y=48.0, base_z=-2.5, summit_z=13.0,
                     base_radius=18.0, summit_radius=2.4, num_rings=14, num_sectors=28, rib_count=8, rib_amp=0.12)

# Distant Mountain Ridges along the horizon (X: -55 to +55, Y: 66 to 78)
distant_peaks = [
    (-42.0, 68.0, 11.0, 14.0),
    (-26.0, 72.0, 13.5, 16.0),
    ( -1.0, 75.0, 12.0, 15.0),
    ( 36.0, 74.0, 14.0, 17.0),
    ( 48.0, 70.0, 11.5, 14.0)
]
for dpx, dpy, dpz_top, dpw in distant_peaks:
    bmesh.ops.create_cone(bm_volcanoes, segments=8, radius1=dpw, radius2=0.8, depth=16.0,
        matrix=mathutils.Matrix.Translation((dpx, dpy, dpz_top - 8.0)))

volcanoes_mesh = bpy.data.meshes.new("Volcanic_Mountains_Mesh")
bm_volcanoes.to_mesh(volcanoes_mesh)
bm_volcanoes.free()
volcanoes_obj = add_mesh_obj("Volcanic_3D_Mountains", volcanoes_mesh)
volcanoes_obj.data.materials.append(mat_volcano_cone)
for poly in volcanoes_mesh.polygons: poly.use_smooth = True

# ==============================================================================
# 11. Fiery Crater Bowls, Active Eruption Columns & Slope Magma Rivers
# ==============================================================================
print(">>> Building Crater Eruption Fountain & Slope Lava Rivers...")
bm_eruption = bmesh.new()

# Mount Fury Caldera Bowl (Hollowed crater filled with bubbling molten fire)
bmesh.ops.create_cone(bm_eruption, segments=16, radius1=3.6, radius2=0.8, depth=2.2,
    matrix=mathutils.Matrix.Translation((18.0, 52.0, 16.8)))

# Active Magma Eruption Fountain shooting 5.0m into the sky from the crater (Z = 17.5 to 22.5m)
bmesh.ops.create_cone(bm_eruption, segments=8, radius1=2.0, radius2=0.3, depth=5.0,
    matrix=mathutils.Matrix.Translation((18.0, 52.0, 20.0)))
for angle_offset in [radians(35), radians(-40), radians(75), radians(-70)]:
    bmesh.ops.create_cone(bm_eruption, segments=6, radius1=0.8, radius2=0.15, depth=3.5,
        matrix=mathutils.Matrix.Translation((18.0, 52.0, 18.5)) @
               mathutils.Matrix.Rotation(angle_offset, 4, 'Y') @
               mathutils.Matrix.Translation((0, 0, 1.75)))

# Glowing Lava Rivers carving down the ravines of Mount Fury into the basin
slope_rivers = [
    (radians(-30), 16.5, 11.5),
    (radians( 10), 18.5, 11.0),
    (radians( 45), 15.5, 10.0),
    (radians(-60), 14.5,  9.5),
    (radians( 75), 12.5,  8.5)
]
for s_rot, s_len, s_z in slope_rivers:
    bmesh.ops.create_cube(bm_eruption, size=1.0,
        matrix=mathutils.Matrix.Translation((18.0, 52.0, s_z)) @
               mathutils.Matrix.Rotation(s_rot, 4, 'Z') @
               mathutils.Matrix.Translation((s_len * 0.45, 0, 0)) @
               mathutils.Matrix.Scale(s_len, 4, (1, 0, 0)) @
               mathutils.Matrix.Scale(1.4,   4, (0, 1, 0)) @
               mathutils.Matrix.Scale(0.3,   4, (0, 0, 1)))

# Cinder Peak Crater Glow & Eruption Vent
bmesh.ops.create_cone(bm_eruption, segments=10, radius1=2.6, radius2=0.5, depth=1.8,
    matrix=mathutils.Matrix.Translation((-14.0, 48.0, 12.2)))
bmesh.ops.create_cone(bm_eruption, segments=6, radius1=1.2, radius2=0.2, depth=3.0,
    matrix=mathutils.Matrix.Translation((-14.0, 48.0, 14.0)))

# Lava river down Cinder Peak
bmesh.ops.create_cube(bm_eruption, size=1.0,
    matrix=mathutils.Matrix.Translation((-14.0, 48.0, 8.5)) @
           mathutils.Matrix.Rotation(radians(30), 4, 'Z') @
           mathutils.Matrix.Translation((5.0, 0, 0)) @
           mathutils.Matrix.Scale(11.0, 4, (1, 0, 0)) @
           mathutils.Matrix.Scale(1.1,  4, (0, 1, 0)) @
           mathutils.Matrix.Scale(0.25, 4, (0, 0, 1)))

eruption_mesh = bpy.data.meshes.new("Volcanic_Eruption_Mesh")
bm_eruption.to_mesh(eruption_mesh)
bm_eruption.free()
eruption_obj = add_mesh_obj("Volcanic_3D_Eruptions", eruption_mesh)
eruption_obj.data.materials.append(mat_lava_core)

# ==============================================================================
# 12. Towering Billowing Volcanic Ash & Smoke Plumes
# ==============================================================================
print(">>> Building Billowing Smoke Plumes...")
bm_smoke = bmesh.new()

def build_smoke_plume(bm, bx, by, bz_start, count=13, r_start=2.6, r_grow=0.55):
    for s in range(count):
        sz = bz_start + s * 2.2
        sx = bx + sin(s * 0.6) * 1.5 + s * 0.4
        sy = by + s * 0.7
        rad = r_start + s * r_grow
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=rad,
            matrix=mathutils.Matrix.Translation((sx, sy, sz)))

# Towering column rising from Mount Fury (Z = 18.5 to 45.0m)
build_smoke_plume(bm_smoke, 18.0, 52.0, 18.5, count=13, r_start=2.7, r_grow=0.55)

# Secondary smoke column from Cinder Peak (Z = 13.5 to 33.0m)
build_smoke_plume(bm_smoke, -14.0, 48.0, 13.5, count=9, r_start=1.9, r_grow=0.45)

# Atmospheric Smoke Cloud masses billowing across upper sky (Y = 35 to 55, Z = 22 to 34)
cloud_spots = [
    (-26.0, 45.0, 24.0, 6.5),
    ( -5.0, 50.0, 28.0, 7.5),
    (  6.0, 46.0, 26.0, 7.0),
    ( 32.0, 48.0, 25.0, 6.8)
]
for cx, cy, cz, crad in cloud_spots:
    bmesh.ops.create_uvsphere(bm_smoke, u_segments=10, v_segments=8, radius=crad,
        matrix=mathutils.Matrix.Translation((cx, cy, cz)))

smoke_mesh = bpy.data.meshes.new("Volcanic_Smoke_Mesh")
bm_smoke.to_mesh(smoke_mesh)
bm_smoke.free()
smoke_obj = add_mesh_obj("Volcanic_3D_Smoke", smoke_mesh)
smoke_obj.data.materials.append(mat_smoke_plume)
for poly in smoke_mesh.polygons: poly.use_smooth = True

# ==============================================================================
# 13. Floating Glowing Embers & Volcanic Bombs
# ==============================================================================
print(">>> Building Floating Glowing Embers...")
bm_embers = bmesh.new()
random.seed(999)

for _ in range(80):
    ex = random.uniform(-16.0, 16.0)
    ey = random.uniform(-8.0, 32.0)
    ez = random.uniform(-1.0, 12.0)
    es = random.uniform(0.04, 0.12)
    bmesh.ops.create_cube(bm_embers, size=es,
        matrix=mathutils.Matrix.Translation((ex, ey, ez)))

bomb_positions = [
    (-10.5,  2.0, 6.2, 0.28, radians( 35)),
    ( -4.8, 12.0, 8.5, 0.35, radians(-25)),
    (  3.2,  6.0, 7.8, 0.32, radians( 40)),
    (  8.5, 15.0, 9.2, 0.40, radians(-30)),
    (-12.0, 18.0, 9.8, 0.30, radians( 20)),
    ( 11.2,  4.0, 5.5, 0.26, radians(-45))
]
for bx, by, bz, bs, brot in bomb_positions:
    bmesh.ops.create_cube(bm_embers, size=bs,
        matrix=mathutils.Matrix.Translation((bx, by, bz)) @
               mathutils.Matrix.Rotation(brot, 4, 'Y'))

embers_mesh = bpy.data.meshes.new("Volcanic_Embers_Mesh")
bm_embers.to_mesh(embers_mesh)
bm_embers.free()
embers_obj = add_mesh_obj("Volcanic_3D_Embers", embers_mesh)
embers_obj.data.materials.append(mat_ember)

# ==============================================================================
# 14. 3D Procedural Fiery Ash Sky Dome
# ==============================================================================
print(">>> Building 3D Fiery Sky Dome...")
bpy.ops.mesh.primitive_uv_sphere_add(radius=115.0, location=(0.0, 30.0, -5.0), segments=36, ring_count=24)
sky_dome = bpy.context.active_object
sky_dome.name = "Volcanic_3D_Sky_Dome"
sky_dome.data.materials.append(mat_sky_procedural)
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

# ==============================================================================
# 15. Combat Camera Setup (Calibrated to Platform Ratio: 0.62)
# ==============================================================================
print(">>> Configuring Combat Camera...")
cam_dist = 21.0
lens = 33.0
cam_data = bpy.data.cameras.new("Volcanic_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Volcanic_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, 3.6)
cam_obj.rotation_euler = (radians(83.5), 0, 0)

# ==============================================================================
# 16. Magma Underlighting & Directional Atmospheric Lights
# ==============================================================================
print(">>> Setting up Lighting...")
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

# 1. Warm Magma Underglow: Area light pointing straight UP towards underside of island
add_light("Magma_Lake_Uplight", 'AREA', 850, (1.0, 0.35, 0.04), (0.0, 0.0, -4.6), rot=(pi, 0, 0), size=20.0)

# 2. Main Volcanic Sun (Calibrated directional light shining across all mountains and cliffs)
add_light("Sun_Volcanic_Daylight", 'SUN', 4.8, (1.0, 0.68, 0.40), (12.0, -12.0, 35.0), rot=(radians(48), radians(-12), radians(-25)))

# 3. Mount Fury Crater Eruption Light: Radiates intense fire glow from summit
add_light("Mount_Fury_Eruption_Light", 'POINT', 1200, (1.0, 0.48, 0.08), (18.0, 52.0, 19.0))

# 4. Right Mega-Lavafall Cascade Glow
add_light("Lavafall_Right_Glow", 'POINT', 450, (1.0, 0.45, 0.05), (16.5, 26.0, 1.0))

# 5. Cinder Peak Secondary Eruption Light
add_light("Cinder_Peak_Eruption_Light", 'POINT', 450, (1.0, 0.38, 0.06), (-14.0, 48.0, 14.0))

# 6. Front Combat Duel Fill Light (Soft warm light onto fighting zone for character readability)
add_light("Front_Duel_Fill", 'AREA', 320, (1.0, 0.90, 0.80), (0.0, -11.0, 3.2), rot=(radians(78), 0, 0), size=16.0)

# 7. Front Island Buttress Fill (Reveals front cliff rock facets and vertical cracks)
add_light("Island_Buttress_Fill", 'AREA', 380, (1.0, 0.55, 0.25), (0.0, -8.0, -0.8), rot=(radians(82), 0, 0), size=18.0)

# 8. Infernal Sky Atmospheric Ambient Fill
add_light("Infernal_Sky_Fill", 'AREA', 240, (0.75, 0.22, 0.06), (0.0, 12.0, 20.0), rot=(radians(25), 0, 0), size=28.0)

# ==============================================================================
# 17. Save & Export
# ==============================================================================
print(">>> Saving .blend, rendering still, and exporting .glb...")
blend_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=False)
print(f">>> [Volcanic Caldera] Saved Blend: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Volcanic Caldera] Rendered PNG: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Volcanic Caldera] Exported GLB: {glb_path}")

print(">>> [Volcanic Caldera 100% 3D] Masterpiece Build Completed Successfully!")

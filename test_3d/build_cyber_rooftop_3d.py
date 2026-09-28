"""
KeyFury 3D Environment Suite: Cyber Neon Rooftop
Procedural 3D Arena Generator for Blender 5.x / EEVEE
Constructs:
- Neo-Kyoto Sky Deck 80F rain-slicked combat deck (Platform Ratio: 0.73)
- Glowing dual-tone neon perimeter (Electric Cyan & Hot Magenta)
- Industrial safety railings with glowing horizontal bars
- Satellite dishes, server transformer generators, antenna masts, and heavy cables
- Multi-tower Neo-Kyoto skyline with illuminated window matrices
- Holographic & neon billboards: "NEO-KYOTO", "CYBER ARCADE", "NEON DRAGON", "RAMEN 2049", "TECH-DRIVE", "CYBERNETICS"
- Flying hovercars (spinners) with cyan and orange light trails
- Cyberpunk dual-tone lighting, wet floor specular reflections, and 16:9 combat camera
- Saves KeyFury_3D_CyberRooftop.blend, renders PNG, exports GLB
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos, pi
import os
import shutil

print(">>> [Cyber Neon Rooftop] Starting 3D Arena Generation in Blender...")

# 1. Clean Scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0: bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0: bpy.data.materials.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
if hasattr(scene.eevee, 'use_raytracing'):
    scene.eevee.use_raytracing = True
if hasattr(scene.eevee, 'use_fast_gi'):
    scene.eevee.use_fast_gi = True

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

# 2. Materials
def make_mat(name, base_color=(0.1, 0.1, 0.1, 1.0), metallic=0.0, roughness=0.5, vp_color=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else base_color
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

def make_emissive(name, color=(0.0, 0.9, 1.0, 1.0), strength=16.0, vp_color=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else color
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

# Base Materials
mat_rain_platform = make_mat("Mat_Cyber_RainPlatform", (0.025, 0.03, 0.045, 1.0), metallic=0.96, roughness=0.12, vp_color=(0.08, 0.10, 0.15, 1.0))
mat_dark_carbon = make_mat("Mat_Cyber_DarkCarbon", (0.03, 0.035, 0.05, 1.0), metallic=0.88, roughness=0.25, vp_color=(0.10, 0.12, 0.18, 1.0))
mat_metal_trim = make_mat("Mat_Cyber_MetalTrim", (0.6, 0.65, 0.75, 1.0), metallic=0.95, roughness=0.15, vp_color=(0.7, 0.75, 0.85, 1.0))
mat_grate = make_mat("Mat_Cyber_HazardGrate", (0.05, 0.06, 0.08, 1.0), metallic=0.90, roughness=0.30, vp_color=(0.12, 0.14, 0.18, 1.0))

# Emissive Neon Materials
mat_cyan_neon = make_emissive("Mat_Cyber_CyanNeon", (0.0, 0.94, 1.0, 1.0), strength=18.0, vp_color=(0.0, 0.9, 1.0, 1.0))
mat_magenta_neon = make_emissive("Mat_Cyber_MagentaNeon", (1.0, 0.05, 0.65, 1.0), strength=18.0, vp_color=(1.0, 0.1, 0.65, 1.0))
mat_amber_neon = make_emissive("Mat_Cyber_AmberNeon", (1.0, 0.65, 0.05, 1.0), strength=14.0, vp_color=(1.0, 0.7, 0.1, 1.0))
mat_white_neon = make_emissive("Mat_Cyber_WhiteNeon", (0.95, 0.98, 1.0, 1.0), strength=10.0, vp_color=(0.95, 0.98, 1.0, 1.0))
mat_traffic_trail = make_emissive("Mat_Cyber_TrafficTrail", (1.0, 0.45, 0.1, 1.0), strength=20.0, vp_color=(1.0, 0.5, 0.1, 1.0))

# 3. Geometry Helpers
def create_box(pt, scale, mat=None, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_cylinder(pt, r, depth, mat=None, rot=(0,0,0), segs=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=segs, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

# 4. Construct Cyber Combat Deck Platform
platform_parts = []

# Main rain-slicked wet platform slab
platform_parts.append(create_box((0, 0, -0.25), (18.0, 6.4, 0.5), mat=mat_rain_platform))
platform_parts.append(create_box((0, 0, -0.55), (18.6, 7.0, 0.2), mat=mat_dark_carbon))

# Outer Cyan Neon Border
platform_parts.append(create_box((0, -3.18, 0.01), (17.8, 0.10, 0.03), mat=mat_cyan_neon))
platform_parts.append(create_box((0, 3.18, 0.01), (17.8, 0.10, 0.03), mat=mat_cyan_neon))
platform_parts.append(create_box((-8.88, 0, 0.01), (0.10, 6.34, 0.03), mat=mat_cyan_neon))
platform_parts.append(create_box((8.88, 0, 0.01), (0.10, 6.34, 0.03), mat=mat_cyan_neon))

# Inner Magenta Neon Perimeter Circuit
platform_parts.append(create_box((0, -2.55, 0.015), (15.5, 0.08, 0.03), mat=mat_magenta_neon))
platform_parts.append(create_box((0, 2.55, 0.015), (15.5, 0.08, 0.03), mat=mat_magenta_neon))
platform_parts.append(create_box((-7.75, 0, 0.015), (0.08, 5.08, 0.03), mat=mat_magenta_neon))
platform_parts.append(create_box((7.75, 0, 0.015), (0.08, 5.08, 0.03), mat=mat_magenta_neon))

# Diagonal Metal Hazard Grate Inlays
for gx in [-5.5, 5.5]:
    platform_parts.append(create_box((gx, 0, 0.012), (3.6, 3.2, 0.02), mat=mat_grate))
    # Grate cyan accent corners
    platform_parts.append(create_box((gx, -1.58, 0.02), (3.6, 0.06, 0.025), mat=mat_cyan_neon))
    platform_parts.append(create_box((gx, 1.58, 0.02), (3.6, 0.06, 0.025), mat=mat_cyan_neon))

# Central Helipad Circle & Cross
platform_parts.append(create_cylinder((0, 0, 0.012), 2.2, 0.02, mat=mat_cyan_neon, segs=48))
platform_parts.append(create_cylinder((0, 0, 0.016), 2.05, 0.025, mat=mat_rain_platform, segs=48))
platform_parts.append(create_box((0, 0, 0.02), (2.8, 0.09, 0.02), mat=mat_magenta_neon))
platform_parts.append(create_box((0, 0, 0.02), (0.09, 2.8, 0.02), mat=mat_cyan_neon))

# Industrial Rear Safety Railing (Y = 3.12)
platform_parts.append(create_box((0, 3.12, 0.55), (17.6, 0.08, 0.06), mat=mat_cyan_neon))
platform_parts.append(create_box((0, 3.12, 0.90), (17.6, 0.10, 0.08), mat=mat_dark_carbon))
# Railing stanchion posts
for rx in [-8.0, -5.5, -3.0, 0.0, 3.0, 5.5, 8.0]:
    platform_parts.append(create_cylinder((rx, 3.12, 0.45), 0.07, 0.95, mat=mat_metal_trim))
    platform_parts.append(create_cylinder((rx, 3.12, 0.94), 0.09, 0.10, mat=mat_magenta_neon))

# Flank Industrial Generator Units & Equipment
# Left Flank: Power Transformer, Satellite Dish, Conduit Cables
gen_l_x = -7.8
platform_parts.append(create_box((gen_l_x, 2.2, 0.9), (1.6, 1.4, 1.8), mat=mat_dark_carbon))
platform_parts.append(create_box((gen_l_x, 1.48, 0.9), (1.2, 0.06, 1.2), mat=mat_cyan_neon))
# Satellite Dish
platform_parts.append(create_cylinder((gen_l_x - 0.4, 2.3, 2.1), 0.10, 0.8, mat=mat_metal_trim))
bpy.ops.mesh.primitive_cone_add(radius1=0.75, radius2=0.05, depth=0.35, vertices=16, location=(gen_l_x - 0.4, 2.0, 2.6))
dish = bpy.context.active_object
dish.rotation_euler = (radians(-35), radians(15), 0)
dish.data.materials.append(mat_metal_trim)
platform_parts.append(dish)

# Right Flank: Telecommunications Terminal, Antenna Masts, Battery Canisters
gen_r_x = 7.8
platform_parts.append(create_box((gen_r_x, 2.2, 0.8), (1.5, 1.3, 1.6), mat=mat_dark_carbon))
platform_parts.append(create_box((gen_r_x, 1.53, 0.8), (1.1, 0.06, 1.0), mat=mat_magenta_neon))
# Dual Antenna Masts
platform_parts.append(create_cylinder((gen_r_x + 0.3, 2.3, 2.2), 0.04, 2.0, mat=mat_metal_trim))
platform_parts.append(create_cylinder((gen_r_x + 0.3, 2.3, 3.2), 0.07, 0.12, mat=mat_magenta_neon))
platform_parts.append(create_cylinder((gen_r_x - 0.3, 2.3, 2.0), 0.04, 1.6, mat=mat_metal_trim))
platform_parts.append(create_cylinder((gen_r_x - 0.3, 2.3, 2.8), 0.07, 0.12, mat=mat_cyan_neon))
# Power Cell Canisters
platform_parts.append(create_cylinder((gen_r_x - 0.6, 1.4, 0.4), 0.16, 0.8, mat=mat_cyan_neon))
platform_parts.append(create_cylinder((gen_r_x - 0.2, 1.4, 0.4), 0.16, 0.8, mat=mat_cyan_neon))

# Join Platform
bpy.ops.object.select_all(action='DESELECT')
for p in platform_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = platform_parts[0]
bpy.ops.object.join()
deck_obj = bpy.context.active_object
deck_obj.name = "Cyber_Deck_Platform"

# 5. Neo-Kyoto City Skyline & Holographic Billboards
skyline_parts = []

tower_specs = [
    # (x, y, height, width, depth, accent_mat)
    (-16.0, 16.0, 26.0, 5.0, 5.0, mat_cyan_neon),
    (-10.5, 13.0, 20.0, 4.2, 3.8, mat_magenta_neon),
    (-5.5, 18.0, 32.0, 6.0, 5.5, mat_cyan_neon),
    (0.0, 22.0, 38.0, 7.5, 6.5, mat_cyan_neon),
    (5.8, 17.0, 28.0, 5.2, 4.8, mat_magenta_neon),
    (11.0, 14.0, 22.0, 4.5, 4.2, mat_amber_neon),
    (16.5, 17.0, 25.0, 5.2, 4.8, mat_cyan_neon),
    (-20.0, 12.0, 16.0, 3.8, 3.5, mat_dark_carbon),
    (20.0, 12.0, 17.0, 3.8, 3.5, mat_dark_carbon),
]

for tx, ty, th, tw, td, t_accent in tower_specs:
    # Building spire block
    skyline_parts.append(create_box((tx, ty, th/2.0 - 5.0), (tw, td, th), mat=mat_dark_carbon))
    # Rooftop antenna spire
    skyline_parts.append(create_cylinder((tx, ty, th - 5.0 + 2.0), 0.08, 4.0, mat=mat_metal_trim))
    skyline_parts.append(create_cylinder((tx, ty, th - 5.0 + 4.1), 0.20, 0.25, mat=t_accent))
    # Horizontal illuminated window bands
    for fl in range(6):
        w_z = (th * 0.15) + fl * (th * 0.12) - 5.0
        skyline_parts.append(create_box((tx, ty - td*0.51, w_z), (tw*0.82, 0.05, 0.45), mat=t_accent))

# Giant Holographic & Neon Billboards
# 1. "CYBER ARCADE" Billboard (Mid-Right Skyscraper)
skyline_parts.append(create_box((11.0, 11.5, 6.5), (4.5, 0.15, 2.2), mat=mat_dark_carbon))
skyline_parts.append(create_box((11.0, 11.4, 6.5), (4.7, 0.05, 2.4), mat=mat_magenta_neon))
bpy.ops.object.text_add(location=(9.2, 11.3, 6.2))
txt_arcade = bpy.context.active_object
txt_arcade.data.body = "CYBER\nARCADE"
txt_arcade.data.size = 0.60
txt_arcade.data.extrude = 0.06
txt_arcade.rotation_euler = (radians(90), 0, 0)
txt_arcade.data.materials.append(mat_cyan_neon)
skyline_parts.append(txt_arcade)

# 2. "NEON DRAGON" Billboard (Right-Center)
skyline_parts.append(create_box((11.0, 11.5, 3.8), (4.0, 0.15, 1.8), mat=mat_dark_carbon))
bpy.ops.object.text_add(location=(9.3, 11.3, 3.6))
txt_dragon = bpy.context.active_object
txt_dragon.data.body = "NEON\nDRAGON"
txt_dragon.data.size = 0.52
txt_dragon.data.extrude = 0.05
txt_dragon.rotation_euler = (radians(90), 0, 0)
txt_dragon.data.materials.append(mat_magenta_neon)
skyline_parts.append(txt_dragon)

# 3. "NEO-KYOTO" Holographic Tower Banner (Left-Center, X = -5.5)
skyline_parts.append(create_box((-5.5, 14.8, 8.5), (5.5, 0.15, 1.8), mat=mat_dark_carbon))
skyline_parts.append(create_box((-5.5, 14.7, 8.5), (5.7, 0.05, 2.0), mat=mat_cyan_neon))
bpy.ops.object.text_add(location=(-7.8, 14.6, 8.2))
txt_kyoto = bpy.context.active_object
txt_kyoto.data.body = "NEO-KYOTO"
txt_kyoto.data.size = 0.72
txt_kyoto.data.extrude = 0.08
txt_kyoto.rotation_euler = (radians(90), 0, 0)
txt_kyoto.data.materials.append(mat_white_neon)
skyline_parts.append(txt_kyoto)

# 4. "RAMEN 2049" Billboard
skyline_parts.append(create_box((5.8, 14.2, 5.2), (3.8, 0.12, 1.6), mat=mat_dark_carbon))
bpy.ops.object.text_add(location=(4.3, 14.1, 4.9))
txt_ramen = bpy.context.active_object
txt_ramen.data.body = "RAMEN\n2049"
txt_ramen.data.size = 0.50
txt_ramen.data.extrude = 0.05
txt_ramen.rotation_euler = (radians(90), 0, 0)
txt_ramen.data.materials.append(mat_amber_neon)
skyline_parts.append(txt_ramen)

# Flying Hovercar Traffic Light Trails (High in sky)
skyline_parts.append(create_box((-6.0, 15.0, 11.5), (7.0, 0.08, 0.08), mat=mat_traffic_trail, rot=(radians(4), radians(8), 0)))
skyline_parts.append(create_box((7.5, 17.0, 10.0), (8.0, 0.08, 0.08), mat=mat_cyan_neon, rot=(radians(-3), radians(-6), 0)))

# Sky Backdrop Plane (Deep stormy cyberpunk night sky)
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.0, 48.0, 16.0))
sky_bg = bpy.context.active_object
sky_bg.scale = (85.0, 1.0, 40.0)
sky_bg.rotation_euler = (radians(90), 0, 0)
mat_cyber_sky = make_emissive("Mat_Cyber_Sky", (0.015, 0.025, 0.055, 1.0), strength=0.8, vp_color=(0.02, 0.03, 0.06, 1.0))
sky_bg.data.materials.append(mat_cyber_sky)
skyline_parts.append(sky_bg)

# Join Skyline
bpy.ops.object.select_all(action='DESELECT')
for p in skyline_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = skyline_parts[0]
bpy.ops.object.join()
skyline_obj = bpy.context.active_object
skyline_obj.name = "Cyber_Skyline_Backdrop"

# 6. Lighting (Neon Night Cyberpunk Dual-Tone)
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

# Key Light (Electric Cyan from front-left)
add_light("Key_Cyan_Light", 'AREA', 750, (0.1, 0.9, 1.0), (-6.5, -6.5, 4.8), (radians(55), radians(15), radians(-45)), size=5.5)
# Rim Light (Hot Magenta from rear-right)
add_light("Rim_Magenta_Light", 'AREA', 680, (1.0, 0.1, 0.65), (6.5, 5.5, 4.8), (radians(-45), radians(-15), radians(135)), size=5.0)
# Top Ambient Neon Fill Light
add_light("Top_Neon_Fill", 'AREA', 380, (0.5, 0.8, 1.0), (0.0, -0.5, 8.5), (radians(10), 0, 0), size=10.0)
# Front Duel Fill Light
add_light("Front_Duel_Fill", 'AREA', 450, (0.8, 0.9, 1.0), (0.0, -8.0, 2.5), (radians(75), 0, 0), size=7.5)
# Ground Uplight (Cyan reflection off wet deck)
add_light("Ground_Wet_Uplight", 'POINT', 220, (0.0, 0.85, 1.0), (0.0, 0.0, -0.5))

# 7. Cinematic Combat Camera (Calibrated to Platform Ratio: 0.73)
cam_data = bpy.data.cameras.new("Cyber_Combat_Cam")
cam_data.lens = 40.0
cam_data.clip_start = 0.1
cam_data.clip_end = 250.0

cam_obj = bpy.data.objects.new("Cyber_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -11.0, 2.65)
cam_obj.rotation_euler = (radians(81.5), 0, 0)

# 8. Save .blend, Render Still, Export .glb
out_dir = r"d:\Keyboard stickman warrior\test_3d"
blend_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Cyber Neon Rooftop] Saved Blender file: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Cyber Neon Rooftop] Rendered EEVEE still: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Cyber Neon Rooftop] Exported GLB model: {glb_path}")

print(">>> [Cyber Neon Rooftop] Finished Successfully!")

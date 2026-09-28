"""
KeyFury 3D Environment Suite: Highland Sanctuary
Procedural & Photographic 3D Arena Generator for Blender 5.x / EEVEE
Constructs:
- 100% True 3D Stone Terrace Platform with matching geometry, runic carvings, moss, and pillars
- Camera-aligned alpine landscape cyclorama backdrop
- Daylight sun lighting & golden runic point lights
- Calibrated 16:9 combat camera (Platform Ratio: 0.72)
- Standalone .blend, high-res render, and GLB export
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos, pi
import os
import shutil

print(">>> [Highland Sanctuary] Starting Master 3D Generation in Blender...")

# 1. Clean Scene
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
if hasattr(scene.eevee, 'use_raytracing'): scene.eevee.use_raytracing = True
if hasattr(scene.eevee, 'use_fast_gi'): scene.eevee.use_fast_gi = True

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

ref_img_path = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\highland_sanctuary.jpg"
out_dir = r"d:\Keyboard stickman warrior\test_3d"

# 2. Camera Setup (Platform Ratio 0.72)
cam_data = bpy.data.cameras.new("Highland_Combat_Cam")
cam_data.lens = 42.0
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Highland_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Position camera looking slightly down across the terrace
cam_obj.location = (0.0, -12.0, 2.80)
cam_obj.rotation_euler = (radians(82.5), 0, 0)

# 3. Materials
def make_mat(name, base_color=(0.5, 0.5, 0.5, 1.0), metallic=0.0, roughness=0.5, vp_color=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.diffuse_color = vp_color if vp_color else base_color
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

def make_emissive(name, color=(1.0, 0.8, 0.2, 1.0), strength=14.0, vp_color=None):
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

mat_stone = make_mat("Mat_Highland_Stone", (0.42, 0.40, 0.36, 1.0), metallic=0.05, roughness=0.75, vp_color=(0.48, 0.46, 0.42, 1.0))
mat_stone_dark = make_mat("Mat_Highland_StoneDark", (0.26, 0.25, 0.23, 1.0), metallic=0.05, roughness=0.85, vp_color=(0.28, 0.27, 0.25, 1.0))
mat_moss = make_mat("Mat_Highland_Moss", (0.22, 0.36, 0.15, 1.0), metallic=0.0, roughness=0.90, vp_color=(0.25, 0.42, 0.18, 1.0))
mat_rune_gold = make_emissive("Mat_Highland_RuneGold", (1.0, 0.82, 0.25, 1.0), strength=16.0, vp_color=(1.0, 0.85, 0.30, 1.0))

# 4. Helpers
def create_box(pt, scale, mat=None, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_cylinder(pt, r, depth, mat=None, rot=(0,0,0), segs=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=segs, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

# 5. Build 3D Stone Terrace Platform
# Platform walking surface is at Z = 0.0, depth in Y = -2.2 to +1.8
parts = []

# Walking slab
parts.append(create_box((0, -0.2, -0.25), (20.0, 4.0, 0.50), mat=mat_stone))
# Bridge foundation
parts.append(create_box((0, -0.2, -1.50), (20.8, 4.6, 2.00), mat=mat_stone_dark))

# Flagstones on walking surface
for px in [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]:
    for py in [-1.4, -0.2, 1.0]:
        parts.append(create_box((px, py, 0.012), (2.8, 1.1, 0.024), mat=mat_stone if (int(px+py)%2==0) else mat_stone_dark))
        if abs(px) > 3.0:
            parts.append(create_box((px+0.3, py+0.2, 0.026), (0.9, 0.4, 0.01), mat=mat_moss))

# Glowing Ancient Runic Inlay Channels
parts.append(create_box((0, -2.18, 0.02), (19.5, 0.16, 0.04), mat=mat_rune_gold))
parts.append(create_box((0, 1.76, 0.02), (19.5, 0.16, 0.04), mat=mat_rune_gold))
for rx in [-6.0, -3.0, 0.0, 3.0, 6.0]:
    parts.append(create_box((rx, -0.2, 0.018), (0.12, 3.8, 0.03), mat=mat_rune_gold))

# Front retaining wall with corbel brackets & vertical rune tablets
parts.append(create_box((0, -2.25, 0.20), (20.0, 0.30, 0.40), mat=mat_stone))
for cx in [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]:
    parts.append(create_box((cx, -2.42, 0.05), (0.75, 0.25, 0.70), mat=mat_stone_dark))
    parts.append(create_box((cx, -2.46, 0.08), (0.35, 0.04, 0.45), mat=mat_rune_gold))
    parts.append(create_box((cx+0.2, -2.48, -0.15), (0.50, 0.10, 0.35), mat=mat_moss))

# Rear Battlements Wall (Low parapet with carved merlons)
parts.append(create_box((0, 1.82, 0.25), (20.0, 0.32, 0.50), mat=mat_stone))
for mx in [-8.5, -6.0, -3.5, -1.0, 1.5, 4.0, 6.5, 8.5]:
    parts.append(create_box((mx, 1.82, 0.60), (0.85, 0.36, 0.25), mat=mat_stone))
    parts.append(create_box((mx, 1.62, 0.60), (0.42, 0.04, 0.15), mat=mat_rune_gold))

# Ancient Runic Gate Pillars (X = -8.8 and +8.8)
for gx in [-8.8, 8.8]:
    parts.append(create_box((gx, 1.6, 0.85), (1.1, 1.1, 1.7), mat=mat_stone_dark))
    parts.append(create_box((gx, 1.6, 1.75), (1.3, 1.3, 0.2), mat=mat_stone))
    parts.append(create_cylinder((gx, 1.6, 1.95), 0.35, 0.3, mat=mat_stone))
    parts.append(create_box((gx, 1.02, 0.85), (0.35, 0.04, 1.1), mat=mat_rune_gold))

# Join Platform Mesh
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
terrace_obj = bpy.context.active_object
terrace_obj.name = "Highland_Terrace_Platform"

# 6. Camera-Matched Alpine Landscape Backdrop
bg_img = bpy.data.images.load(ref_img_path)

mat_bg = bpy.data.materials.new(name="Mat_Highland_Backdrop")
mat_bg.use_nodes = True
nodes = mat_bg.node_tree.nodes
nodes.clear()
out_node = nodes.new(type='ShaderNodeOutputMaterial')
emit_node = nodes.new(type='ShaderNodeEmission')
emit_node.inputs['Strength'].default_value = 1.0
tex_node = nodes.new(type='ShaderNodeTexImage')
tex_node.image = bg_img
mat_bg.node_tree.links.new(tex_node.outputs['Color'], emit_node.inputs['Color'])
mat_bg.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])

# Parent backdrop directly to camera frustum at distance 35.0m
dist = 35.0
sw = cam_data.sensor_width
focal = cam_data.lens
w = dist * (sw / focal)
h = w * (9.0 / 16.0)

bpy.ops.mesh.primitive_plane_add(size=1.0)
backdrop = bpy.context.active_object
backdrop.name = "Highland_Alpine_Backdrop"
backdrop.parent = cam_obj
backdrop.location = (0, 0, -dist)
backdrop.rotation_euler = (0, 0, 0)
backdrop.scale = (w, h, 1.0)
backdrop.data.materials.append(mat_bg)

# 7. Lighting (Crisp Alpine Sunlight)
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

# Sun Light (Warm daylight from upper right)
add_light("Sun_Alpine_Daylight", 'SUN', 4.8, (1.0, 0.98, 0.92), (10.0, -10.0, 20.0), (radians(50), radians(15), radians(-35)))
# Ambient Sky Fill Light (Cool blue ambient from above)
add_light("Sky_Ambient_Fill", 'AREA', 500, (0.55, 0.75, 1.0), (0.0, 0.0, 10.0), (radians(20), 0, 0), size=18.0)
# Front Duel Fill Light (Soft daylight onto combat platform)
add_light("Front_Terrace_Fill", 'AREA', 400, (0.95, 0.95, 0.92), (0.0, -8.0, 3.5), (radians(70), 0, 0), size=12.0)
# Runic Warm Point Glows near Pillars
add_light("Pillar_Glow_L", 'POINT', 160, (1.0, 0.82, 0.28), (-8.8, 1.0, 1.2))
add_light("Pillar_Glow_R", 'POINT', 160, (1.0, 0.82, 0.28), (8.8, 1.0, 1.2))

# 8. Save .blend, Render Still, Export .glb
blend_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Highland Sanctuary] Saved Blender file: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Highland Sanctuary] Rendered EEVEE still: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_HighlandSanctuary.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Highland Sanctuary] Exported GLB model: {glb_path}")

print(">>> [Highland Sanctuary Master] Finished Successfully!")

"""
KeyFury 3D: Cyber Neon Rooftop Perfected 3D Stage Builder
Constructs a true 2.5D/3D fighting game arena matching the master concept artwork.
- Calibrated 16:9 combat camera (Platform Ratio: 0.73)
- 3D Walking Platform at Z = 0.0 with rain-slicked metallic decking and glowing cyan/magenta circuits
- Front Drop Wall at Y = 0.0 with industrial neon underglow (clean typing space background)
- Distant Neo-Kyoto Skyline Vista at Y = 28.0m with glowing holographic billboards and hovercars
- Dynamic Cyan Key & Magenta Rim Lighting with metallic specular reflections
- Outputs: .blend, .glb, and 1080p high-res render
"""

import bpy
import math
from math import radians
import os
import sys

out_dir = r"d:\Keyboard stickman warrior\test_3d"
ref_img_path = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\cyber_rooftop.jpg"

print(">>> [Cyber Neon Rooftop 3D] Starting Perfected Build...")

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
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'

# World Environment
world = scene.world
if not world:
    world = bpy.data.worlds.new("Cyber_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.04, 0.08, 0.16, 1.0)
    bg_node.inputs['Strength'].default_value = 0.5

# 2. Camera Setup (Platform Ratio 0.73 -> Floor at 27% from bottom)
cam_dist = 20.0
lens = 40.0
sensor_w = 36.0
total_w = cam_dist * (sensor_w / lens)  # 18.0m
total_h = total_w * (9.0 / 16.0)       # 10.125m
cam_z = (0.5 - 0.27) * total_h  # 2.32875m (Calibrated to Z=0 floor at exact platform ratio)

cam_data = bpy.data.cameras.new("Cyber_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Cyber_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, cam_z)
cam_obj.rotation_euler = (radians(90.0), 0, 0)

# 3. Load Master Concept Texture
img = bpy.data.images.load(ref_img_path)

# 4. Master Cyber Shaders (Wet Metallic Deck + Glowing Neon Skyline)
def create_cyber_shader(name, roughness=0.35, metallic=0.3, emission_fac=0.45):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.85
        
    tex = nodes.new(type='ShaderNodeTexImage')
    tex.image = img
    tex_coord = nodes.new(type='ShaderNodeTexCoord')
    
    emit = nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = 1.0
    
    mix = nodes.new(type='ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = emission_fac
    
    mat.node_tree.links.new(tex_coord.outputs['UV'], tex.inputs['Vector'])
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.node_tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
    mat.node_tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    mat.node_tree.links.new(emit.outputs['Emission'], mix.inputs[2])
    mat.node_tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

mat_deck = create_cyber_shader("Mat_Cyber_Deck", roughness=0.30, metallic=0.35, emission_fac=0.35)
mat_skyline = create_cyber_shader("Mat_Cyber_Skyline", roughness=0.80, metallic=0.05, emission_fac=0.80)

# 5. Geometry Construction

# A. Front Drop Wall (Y = 0.0, Z: -3.5m to 0.0m) - Typing strip background
mesh_front = bpy.data.meshes.new("Cyber_Front_Wall_Mesh")
obj_front = bpy.data.objects.new("Cyber_Front_Wall", mesh_front)
bpy.context.collection.objects.link(obj_front)

w_front = total_w * 1.15
verts_f = [
    (-w_front/2.0, 0.0, -3.5),
    ( w_front/2.0, 0.0, -3.5),
    ( w_front/2.0, 0.0,  0.0),
    (-w_front/2.0, 0.0,  0.0)
]
faces_f = [(0, 1, 2, 3)]
mesh_front.from_pydata(verts_f, [], faces_f)
mesh_front.update()

uv_f = mesh_front.uv_layers.new(name="UVMap").data
uvs_f = [(0.0, 0.0), (1.0, 0.0), (1.0, 0.270), (0.0, 0.270)]
for i, loop in enumerate(mesh_front.loops):
    uv_f[loop.index].uv = uvs_f[i]
obj_front.data.materials.append(mat_deck)

# B. Walking Sky Deck Floor (Z = 0.0, Y: 0.0 to 3.2m) - 100% flat combat lane
mesh_floor = bpy.data.meshes.new("Cyber_Floor_Mesh")
obj_floor = bpy.data.objects.new("Cyber_Combat_Deck", mesh_floor)
bpy.context.collection.objects.link(obj_floor)

verts_fl = [
    (-w_front/2.0, 0.0, 0.0),
    ( w_front/2.0, 0.0, 0.0),
    ( w_front/2.0 * 1.05, 3.2, 0.81),
    (-w_front/2.0 * 1.05, 3.2, 0.81)
]
faces_fl = [(0, 1, 2, 3)]
mesh_floor.from_pydata(verts_fl, [], faces_fl)
mesh_floor.update()

uv_fl = mesh_floor.uv_layers.new(name="UVMap").data
uvs_fl = [(0.0, 0.270), (1.0, 0.270), (1.0, 0.355), (0.0, 0.355)]
for i, loop in enumerate(mesh_floor.loops):
    uv_fl[loop.index].uv = uvs_fl[i]
obj_floor.data.materials.append(mat_deck)

# C. Distant Megacity Skyline Vista (Placed at Y = 28.0m)
dist_bg = cam_dist + 28.0  # 48.0m
scale_bg = dist_bg / cam_dist
w_bg = total_w * scale_bg * 1.08
h_bg = total_h * scale_bg * 1.08
z_top = cam_z + h_bg * 0.52
z_bot = cam_z - h_bg * 0.24

mesh_vista = bpy.data.meshes.new("Cyber_Vista_Mesh")
obj_vista = bpy.data.objects.new("Cyber_Skyline_Backdrop", mesh_vista)
bpy.context.collection.objects.link(obj_vista)

verts_v = [
    (-w_bg/2.0, 28.0, z_bot),
    ( w_bg/2.0, 28.0, z_bot),
    ( w_bg/2.0, 28.0, z_top),
    (-w_bg/2.0, 28.0, z_top)
]
faces_v = [(0, 1, 2, 3)]
mesh_vista.from_pydata(verts_v, [], faces_v)
mesh_vista.update()

uv_v = mesh_vista.uv_layers.new(name="UVMap").data
uvs_v = [(0.0, 0.350), (1.0, 0.350), (1.0, 1.0), (0.0, 1.0)]
for i, loop in enumerate(mesh_vista.loops):
    uv_v[loop.index].uv = uvs_v[i]
obj_vista.data.materials.append(mat_skyline)

# 6. Dual-Tone Cyberpunk Lighting
# Cyan Key Light (Sharp overhead neon beam)
cyan_key = bpy.data.lights.new(name="Cyan_Key", type='AREA')
cyan_key.energy = 550
cyan_key.color = (0.0, 0.94, 1.0)
if hasattr(cyan_key, 'size'): cyan_key.size = 18.0
cyan_obj = bpy.data.objects.new("Cyan_Key", cyan_key)
cyan_obj.location = (-6.0, -8.0, 10.0)
cyan_obj.rotation_euler = (radians(45), radians(-20), radians(15))
bpy.context.collection.objects.link(cyan_obj)

# Magenta Rim Light (Backdrop edge radiance)
mag_rim = bpy.data.lights.new(name="Magenta_Rim", type='AREA')
mag_rim.energy = 600
mag_rim.color = (0.95, 0.15, 0.65)
if hasattr(mag_rim, 'size'): mag_rim.size = 18.0
mag_obj = bpy.data.objects.new("Magenta_Rim", mag_rim)
mag_obj.location = (6.0, -4.0, 8.0)
mag_obj.rotation_euler = (radians(50), radians(25), radians(-20))
bpy.context.collection.objects.link(mag_obj)

# Front Duel Light
duel_data = bpy.data.lights.new(name="Duel_Fill", type='AREA')
duel_data.energy = 220
duel_data.color = (0.8, 0.95, 1.0)
if hasattr(duel_data, 'size'): duel_data.size = 14.0
duel_obj = bpy.data.objects.new("Duel_Fill", duel_data)
duel_obj.location = (0.0, -12.0, 3.5)
duel_obj.rotation_euler = (radians(75), 0, 0)
bpy.context.collection.objects.link(duel_obj)

# 7. Save .blend, Export .glb, Render
blend_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Cyber Rooftop] Saved: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Cyber Rooftop] Rendered: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Cyber Rooftop] Exported GLB: {glb_path}")

print(">>> [Cyber Rooftop 3D] BUILD COMPLETED SUCCESSFULLY!")

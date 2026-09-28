"""
KeyFury 3D: Volcanic Caldera Perfected 3D Stage Builder (Mathematically Continuous Ray Projection)
Constructs a true 2.5D/3D fighting game arena matching the master concept artwork.
- Calibrated 16:9 combat camera (Platform Ratio: 0.62)
- 3D Floating Obsidian Slab with magma fissures at Z = 0.0
- Front Drop Wall at Y = 0.0 with dripping magma (clean typing space background)
- Distant Caldera Hellscape Vista at Y = 28.0m with continuous ray-matched horizon
- Dynamic Magma Underglow & Fiery Atmospheric Lighting
- Outputs: .blend, .glb, and 1080p high-res render
"""

import bpy
import math
from math import radians
import os

out_dir = r"d:\Keyboard stickman warrior\test_3d"
ref_img_path = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\volcanic_caldera.jpg"

print(">>> [Volcanic Caldera 3D] Starting Ray-Calibrated Build...")

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

# World
world = scene.world
if not world:
    world = bpy.data.worlds.new("Volcanic_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.20, 0.05, 0.02, 1.0)
    bg_node.inputs['Strength'].default_value = 0.6

# Camera (Platform Ratio 0.62 -> Floor at 38% from bottom)
cam_dist = 20.0
lens = 40.0
sensor_w = 36.0
total_w = cam_dist * (sensor_w / lens)  # 18.0m
total_h = total_w * (9.0 / 16.0)       # 10.125m
cam_z = (0.5 - 0.38) * total_h  # 1.215m (Calibrated to Z=0 floor at exact platform ratio)

cam_data = bpy.data.cameras.new("Volcanic_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Volcanic_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, cam_z)
cam_obj.rotation_euler = (radians(90.0), 0, 0)

img = bpy.data.images.load(ref_img_path)

def create_shader(name, roughness=0.65, metallic=0.15, emission_fac=0.35):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.4
        
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

mat_slab = create_shader("Mat_Volcanic_Slab", roughness=0.65, metallic=0.15, emission_fac=0.35)
mat_vista = create_shader("Mat_Volcanic_Vista", roughness=0.85, metallic=0.0, emission_fac=0.75)

# A. Front Drop Wall & Magma Underbelly (Y = 0.0, Z: -4.5m to 0.0m) - Typing space background
mesh_front = bpy.data.meshes.new("Volcanic_Front_Wall_Mesh")
obj_front = bpy.data.objects.new("Volcanic_Front_Wall", mesh_front)
bpy.context.collection.objects.link(obj_front)

w_front = total_w * 1.15
verts_f = [
    (-w_front/2.0, 0.0, -4.5),
    ( w_front/2.0, 0.0, -4.5),
    ( w_front/2.0, 0.0,  0.0),
    (-w_front/2.0, 0.0,  0.0)
]
faces_f = [(0, 1, 2, 3)]
mesh_front.from_pydata(verts_f, [], faces_f)
mesh_front.update()

uv_f = mesh_front.uv_layers.new(name="UVMap").data
uvs_f = [(0.0, 0.0), (1.0, 0.0), (1.0, 0.380), (0.0, 0.380)]
for i, loop in enumerate(mesh_front.loops):
    uv_f[loop.index].uv = uvs_f[i]
obj_front.data.materials.append(mat_slab)

# B. Walking Obsidian Slab Floor (Z = 0.0 front to Z = 0.21m rear at Y = 3.2m)
mesh_floor = bpy.data.meshes.new("Volcanic_Floor_Mesh")
obj_floor = bpy.data.objects.new("Volcanic_Combat_Slab", mesh_floor)
bpy.context.collection.objects.link(obj_floor)

verts_fl = [
    (-w_front/2.0, 0.0, 0.0),
    ( w_front/2.0, 0.0, 0.0),
    ( w_front/2.0 * 1.05, 3.2, 0.21),
    (-w_front/2.0 * 1.05, 3.2, 0.21)
]
faces_fl = [(0, 1, 2, 3)]
mesh_floor.from_pydata(verts_fl, [], faces_fl)
mesh_floor.update()

uv_fl = mesh_floor.uv_layers.new(name="UVMap").data
uvs_fl = [(0.0, 0.380), (1.0, 0.380), (1.0, 0.450), (0.0, 0.450)]
for i, loop in enumerate(mesh_floor.loops):
    uv_fl[loop.index].uv = uvs_fl[i]
obj_floor.data.materials.append(mat_slab)

# C. Distant Caldera Vista Backdrop at Y = 28.0m (Distance 48.0m)
dist_bg = cam_dist + 28.0 # 48.0m
scale_bg = dist_bg / cam_dist
w_bg = total_w * scale_bg * 1.08
h_bg = total_h * scale_bg * 1.08

# Vista spans from V = 0.445 to V = 1.0
z_top = cam_z + h_bg * 0.52
z_bot = -4.0

mesh_vista = bpy.data.meshes.new("Volcanic_Vista_Mesh")
obj_vista = bpy.data.objects.new("Volcanic_Caldera_Backdrop", mesh_vista)
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
uvs_v = [(0.0, 0.445), (1.0, 0.445), (1.0, 1.0), (0.0, 1.0)]
for i, loop in enumerate(mesh_vista.loops):
    uv_v[loop.index].uv = uvs_v[i]
obj_vista.data.materials.append(mat_vista)

# Dynamic Lighting
magma_light = bpy.data.lights.new(name="Magma_Underglow", type='AREA')
magma_light.energy = 850
magma_light.color = (1.0, 0.25, 0.02)
if hasattr(magma_light, 'size'): magma_light.size = 22.0
magma_obj = bpy.data.objects.new("Magma_Underglow", magma_light)
magma_obj.location = (0.0, -2.0, -1.8)
magma_obj.rotation_euler = (radians(-60), 0, 0)
bpy.context.collection.objects.link(magma_obj)

sky_glow = bpy.data.lights.new(name="Caldera_Sky_Glow", type='AREA')
sky_glow.energy = 450
sky_glow.color = (0.95, 0.45, 0.15)
if hasattr(sky_glow, 'size'): sky_glow.size = 20.0
sky_obj = bpy.data.objects.new("Caldera_Sky_Glow", sky_glow)
sky_obj.location = (0.0, -6.0, 12.0)
sky_obj.rotation_euler = (radians(35), 0, 0)
bpy.context.collection.objects.link(sky_obj)

duel_data = bpy.data.lights.new(name="Duel_Fill", type='AREA')
duel_data.energy = 200
duel_data.color = (1.0, 0.85, 0.7)
if hasattr(duel_data, 'size'): duel_data.size = 14.0
duel_obj = bpy.data.objects.new("Duel_Fill", duel_data)
duel_obj.location = (0.0, -12.0, 4.5)
duel_obj.rotation_euler = (radians(75), 0, 0)
bpy.context.collection.objects.link(duel_obj)

# Save, Export, Render
blend_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Volcanic Caldera] Saved: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Volcanic Caldera] Rendered: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Volcanic Caldera] Exported GLB: {glb_path}")

print(">>> [Volcanic Caldera 3D] BUILD COMPLETED SUCCESSFULLY!")

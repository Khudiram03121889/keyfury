"""
KeyFury 3D: Celestial Void Shrine Perfected 3D Stage Builder
"""

import bpy
import math
from math import radians
import os

out_dir = r"d:\Keyboard stickman warrior\test_3d"
ref_img_path = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\celestial_void.jpg"

print(">>> [Celestial Void Shrine 3D] Building Ultra-Clean Stage...")

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
    world = bpy.data.worlds.new("Celestial_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.08, 0.04, 0.16, 1.0)
    bg_node.inputs['Strength'].default_value = 0.5

# Camera (Platform Ratio 0.71 -> Floor at 29% from bottom)
cam_dist = 20.0
lens = 40.0
sensor_w = 36.0
total_w = cam_dist * (sensor_w / lens)  # 18.0m
total_h = total_w * (9.0 / 16.0)       # 10.125m
cam_z = (0.5 - 0.29) * total_h  # 2.12625m (Calibrated to Z=0 floor at exact platform ratio)

cam_data = bpy.data.cameras.new("Celestial_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Celestial_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, cam_z)
cam_obj.rotation_euler = (radians(90.0), 0, 0)

img = bpy.data.images.load(ref_img_path)

def create_shader(name, roughness=0.45, metallic=0.15, emission_fac=0.45):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.75
        
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

mat_marble = create_shader("Mat_Celestial_Marble", roughness=0.40, metallic=0.20, emission_fac=0.38)
mat_nebula = create_shader("Mat_Celestial_Nebula", roughness=0.80, metallic=0.05, emission_fac=0.80)

# A. Front Drop Wall & Floating Astral Dais Base (Y = 0.0, Z: -3.8m to 0.0m)
mesh_front = bpy.data.meshes.new("Celestial_Front_Wall_Mesh")
obj_front = bpy.data.objects.new("Celestial_Front_Wall", mesh_front)
bpy.context.collection.objects.link(obj_front)

w_front = total_w * 1.15
verts_f = [
    (-w_front/2.0, 0.0, -3.8),
    ( w_front/2.0, 0.0, -3.8),
    ( w_front/2.0, 0.0,  0.0),
    (-w_front/2.0, 0.0,  0.0)
]
faces_f = [(0, 1, 2, 3)]
mesh_front.from_pydata(verts_f, [], faces_f)
mesh_front.update()

uv_f = mesh_front.uv_layers.new(name="UVMap").data
uvs_f = [(0.0, 0.0), (1.0, 0.0), (1.0, 0.290), (0.0, 0.290)]
for i, loop in enumerate(mesh_front.loops):
    uv_f[loop.index].uv = uvs_f[i]
obj_front.data.materials.append(mat_marble)

# B. Walking Marble Astral Dais Floor (Z = 0.0 front to Z = 0.81m rear at Y = 3.2m)
mesh_floor = bpy.data.meshes.new("Celestial_Floor_Mesh")
obj_floor = bpy.data.objects.new("Celestial_Combat_Dais", mesh_floor)
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
uvs_fl = [(0.0, 0.290), (1.0, 0.290), (1.0, 0.370), (0.0, 0.370)]
for i, loop in enumerate(mesh_floor.loops):
    uv_fl[loop.index].uv = uvs_fl[i]
obj_floor.data.materials.append(mat_marble)

# C. Distant Astral Vista Backdrop at Y = 28.0m (Distance 48.0m)
dist_bg = cam_dist + 28.0 # 48.0m
scale_bg = dist_bg / cam_dist
w_bg = total_w * scale_bg * 1.08
h_bg = total_h * scale_bg * 1.08

z_top = cam_z + h_bg * 0.52
z_bot = cam_z - h_bg * 0.24

mesh_vista = bpy.data.meshes.new("Celestial_Vista_Mesh")
obj_vista = bpy.data.objects.new("Celestial_Nebula_Backdrop", mesh_vista)
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
uvs_v = [(0.0, 0.365), (1.0, 0.365), (1.0, 1.0), (0.0, 1.0)]
for i, loop in enumerate(mesh_vista.loops):
    uv_v[loop.index].uv = uvs_v[i]
obj_vista.data.materials.append(mat_nebula)

# Dynamic Lighting
moon_rim = bpy.data.lights.new(name="Moon_Rim", type='AREA')
moon_rim.energy = 600
moon_rim.color = (0.85, 0.95, 1.0)
if hasattr(moon_rim, 'size'): moon_rim.size = 18.0
moon_obj = bpy.data.objects.new("Moon_Rim", moon_rim)
moon_obj.location = (7.0, -5.0, 12.0)
moon_obj.rotation_euler = (radians(45), radians(20), radians(-25))
bpy.context.collection.objects.link(moon_obj)

nebula_amb = bpy.data.lights.new(name="Nebula_Ambient", type='AREA')
nebula_amb.energy = 500
nebula_amb.color = (0.68, 0.45, 0.95)
if hasattr(nebula_amb, 'size'): nebula_amb.size = 22.0
nebula_obj = bpy.data.objects.new("Nebula_Ambient", nebula_amb)
nebula_obj.location = (-5.0, -8.0, 9.0)
nebula_obj.rotation_euler = (radians(40), radians(-15), radians(10))
bpy.context.collection.objects.link(nebula_obj)

arcane_up = bpy.data.lights.new(name="Arcane_Uplight", type='POINT')
arcane_up.energy = 280
arcane_up.color = (0.8, 0.5, 1.0)
arcane_obj = bpy.data.objects.new("Arcane_Uplight", arcane_up)
arcane_obj.location = (0.0, 1.2, 0.3)
bpy.context.collection.objects.link(arcane_obj)

duel_data = bpy.data.lights.new(name="Duel_Fill", type='AREA')
duel_data.energy = 220
duel_data.color = (0.95, 0.95, 1.0)
if hasattr(duel_data, 'size'): duel_data.size = 14.0
duel_obj = bpy.data.objects.new("Duel_Fill", duel_data)
duel_obj.location = (0.0, -12.0, 3.8)
duel_obj.rotation_euler = (radians(75), 0, 0)
bpy.context.collection.objects.link(duel_obj)

# Save, Export, Render
blend_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Celestial Void Shrine] Saved: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Celestial Void Shrine] Rendered: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_CelestialVoid.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Celestial Void Shrine] Exported GLB: {glb_path}")

print(">>> [Celestial Void Shrine 3D] ULTRA-CLEAN BUILD COMPLETED!")

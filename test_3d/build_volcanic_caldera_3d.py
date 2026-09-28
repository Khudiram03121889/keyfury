"""
KeyFury 3D Environment Suite: Volcanic Caldera (Master Photoreal 3D Alignment)
Constructs:
- 100% True 3D Floating Obsidian Rock Slab Platform (Platform Ratio: 0.62)
- Top combat surface with cracked basalt plates & glowing molten magma fissures
- Jagged underside with hanging stalactites & dripping liquid lava curtains
- Boiling subterranean molten lava lake plane with heat ripples
- Background volcanic caldera backdrop plate with erupting volcano cones & ash clouds
- Infernal under-glow lighting, magma point lights, and calibrated 16:9 combat camera
- Saves KeyFury_3D_VolcanicCaldera.blend, renders PNG, exports GLB
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos, pi
import os
import shutil

print(">>> [Volcanic Caldera Master] Generating Photoreal 3D Scene...")

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
if hasattr(scene.eevee, 'use_raytracing'):
    scene.eevee.use_raytracing = True
if hasattr(scene.eevee, 'use_fast_gi'):
    scene.eevee.use_fast_gi = True

scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100

ref_img_path = r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\volcanic_caldera.jpg"

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

def make_emissive(name, color=(1.0, 0.3, 0.05, 1.0), strength=18.0, vp_color=None):
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

mat_obsidian = make_mat("Mat_Volcano_Obsidian", (0.08, 0.075, 0.08, 1.0), metallic=0.15, roughness=0.88, vp_color=(0.12, 0.11, 0.12, 1.0))
mat_obsidian_dark = make_mat("Mat_Volcano_ObsidianDark", (0.04, 0.038, 0.04, 1.0), metallic=0.20, roughness=0.92, vp_color=(0.06, 0.05, 0.06, 1.0))
mat_magma_core = make_emissive("Mat_Volcano_MagmaCore", (1.0, 0.45, 0.05, 1.0), strength=22.0, vp_color=(1.0, 0.50, 0.08, 1.0))
mat_magma_hot = make_emissive("Mat_Volcano_MagmaHot", (1.0, 0.85, 0.20, 1.0), strength=26.0, vp_color=(1.0, 0.88, 0.25, 1.0))
mat_lava_fall = make_emissive("Mat_Volcano_LavaFall", (1.0, 0.38, 0.05, 1.0), strength=20.0, vp_color=(1.0, 0.42, 0.08, 1.0))

# 3. Helpers
def create_box(pt, scale, mat=None, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pt)
    obj = bpy.context.active_object
    obj.scale = scale
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

def create_cone(pt, r1, r2, depth, mat=None, rot=(0,0,0), segs=12):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth, vertices=segs, location=pt)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    if mat: obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj

# 4. Construct Floating Obsidian Combat Slab (Platform Ratio: 0.62)
caldera_parts = []

# Main top obsidian fighting deck (Z = 0.0)
caldera_parts.append(create_box((0, 0, -0.35), (20.0, 5.8, 0.70), mat=mat_obsidian))
# Multi-layered jagged sub-rock body
caldera_parts.append(create_box((0, 0, -0.90), (19.2, 5.2, 0.80), mat=mat_obsidian_dark))
caldera_parts.append(create_box((0, 0, -1.60), (17.5, 4.4, 0.90), mat=mat_obsidian_dark))

# Cracked surface plates on top deck
for px in [-8.0, -5.0, -2.0, 1.5, 5.0, 8.0]:
    for py in [-1.5, 0.2, 1.6]:
        caldera_parts.append(create_box((px, py, 0.012), (2.8, 1.4, 0.03), mat=mat_obsidian if (int(px+py)%2==0) else mat_obsidian_dark))

# Glowing Magma Fissure Veins cutting across combat floor
caldera_parts.append(create_box((0, -0.2, 0.02), (18.5, 0.14, 0.03), mat=mat_magma_hot))
caldera_parts.append(create_box((-3.5, 0.8, 0.022), (0.12, 3.8, 0.03), mat=mat_magma_core, rot=(0, 0, radians(25))))
caldera_parts.append(create_box((4.2, -0.6, 0.022), (0.12, 3.6, 0.03), mat=mat_magma_core, rot=(0, 0, radians(-20))))
caldera_parts.append(create_box((7.5, 0.5, 0.022), (0.10, 2.5, 0.03), mat=mat_magma_hot, rot=(0, 0, radians(15))))
caldera_parts.append(create_box((-7.2, -0.4, 0.022), (0.10, 2.8, 0.03), mat=mat_magma_hot, rot=(0, 0, radians(-30))))

# Jagged Underside Stalactites & Rock Spikes (Z = -1.5 to -3.8)
for sx, sy, sz, r in [
    (-8.0, 0.5, -2.4, 0.9), (-5.5, -1.0, -2.8, 1.1), (-2.8, 0.8, -3.2, 1.3),
    (0.5, -0.5, -3.0, 1.2), (3.5, 0.6, -3.4, 1.3), (6.2, -0.8, -2.9, 1.1), (8.2, 0.4, -2.3, 0.8)
]:
    caldera_parts.append(create_cone((sx, sy, sz), r, 0.05, 2.2, mat=mat_obsidian_dark))

# Dripping Molten Lava Falls pouring from platform edges into the abyss
for lx, ly in [(-6.8, -2.4), (-2.2, -2.4), (3.8, -2.4), (7.0, -2.4), (-4.5, 2.2), (5.0, 2.2)]:
    caldera_parts.append(create_box((lx, ly, -2.2), (0.45, 0.12, 3.4), mat=mat_lava_fall))
    caldera_parts.append(create_box((lx, ly, -2.2), (0.22, 0.16, 3.5), mat=mat_magma_hot))

# Molten Lava Lake Surface Below (Z = -4.8)
caldera_parts.append(create_box((0, 4.0, -4.8), (38.0, 24.0, 0.4), mat=mat_magma_core))
for bx in [-12.0, -6.0, 6.0, 12.0]:
    caldera_parts.append(create_box((bx, -1.0, -4.5), (3.2, 2.2, 0.5), mat=mat_obsidian_dark))

# Join Platform
bpy.ops.object.select_all(action='DESELECT')
for p in caldera_parts:
    if p: p.select_set(True)
bpy.context.view_layer.objects.active = caldera_parts[0]
bpy.ops.object.join()
platform_obj = bpy.context.active_object
platform_obj.name = "Volcanic_Obsidian_Platform"

# 5. Panoramic Volcanic Caldera Backdrop
bg_img = bpy.data.images.load(ref_img_path)

mat_bg = bpy.data.materials.new(name="Mat_Volcano_Backdrop")
mat_bg.use_nodes = True
nodes = mat_bg.node_tree.nodes
nodes.clear()
out_node = nodes.new(type='ShaderNodeOutputMaterial')
emit_node = nodes.new(type='ShaderNodeEmission')
emit_node.inputs['Strength'].default_value = 1.08
tex_node = nodes.new(type='ShaderNodeTexImage')
tex_node.image = bg_img
mat_bg.node_tree.links.new(tex_node.outputs['Color'], emit_node.inputs['Color'])
mat_bg.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])

bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.0, 32.0, 7.8))
backdrop = bpy.context.active_object
backdrop.name = "Volcanic_Caldera_Backdrop"
backdrop.scale = (58.0, 1.0, 32.6)
backdrop.rotation_euler = (radians(90), 0, 0)
backdrop.data.materials.append(mat_bg)

# 6. Lighting (Infernal Under-Glow & Fiery Ambient)
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

# Massive Under-Glow Area Light (Molten Lava illuminating underside of platform)
add_light("Magma_Lake_Uplight", 'AREA', 1200, (1.0, 0.38, 0.05), (0.0, 0.0, -4.0), (radians(-80), 0, 0), size=22.0)
# Infernal Ambient Rim Light (Fiery volcanic ash sky fill)
add_light("Infernal_Sky_Fill", 'AREA', 550, (0.9, 0.18, 0.08), (0.0, 5.0, 16.0), (radians(25), 0, 0), size=20.0)
# Front Duel Fill Light (Soft warm light onto fighting line)
add_light("Front_Duel_Fill", 'AREA', 450, (1.0, 0.70, 0.50), (0.0, -9.0, 2.5), (radians(75), 0, 0), size=12.0)
# Local Magma Fissure Lights
add_light("Fissure_Glow_L", 'POINT', 180, (1.0, 0.5, 0.1), (-5.0, 0.0, 0.6))
add_light("Fissure_Glow_R", 'POINT', 180, (1.0, 0.5, 0.1), (5.0, 0.0, 0.6))

# 7. Cinematic Combat Camera (Calibrated to Platform Ratio: 0.62)
cam_data = bpy.data.cameras.new("Volcano_Combat_Cam")
cam_data.lens = 40.0
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Volcano_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -11.8, 1.85)
cam_obj.rotation_euler = (radians(83.8), 0, 0)

# 8. Save .blend, Render Still, Export .glb
out_dir = r"d:\Keyboard stickman warrior\test_3d"
blend_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f">>> [Volcanic Caldera] Saved Blender file: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
print(f">>> [Volcanic Caldera] Rendered EEVEE still: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_VolcanicCaldera.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f">>> [Volcanic Caldera] Exported GLB model: {glb_path}")

print(">>> [Volcanic Caldera Master] Finished Successfully!")

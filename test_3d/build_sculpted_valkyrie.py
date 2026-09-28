import bpy
import bmesh
import json
import os
import math
from math import radians

print('>>> Building Pure 3D Turnaround Cyber Valkyrie in Blender...')

# 1. Load Precomputed Mesh Data
json_path = r'd:\Keyboard stickman warrior\test_3d\valk_mesh_data.json'
with open(json_path, 'r') as f:
    data = json.load(f)

verts = data['verts']
uvs = data['uvs']
faces = data['faces']
front_count = data.get('front_count', 17693)
back_count = data.get('back_count', 17693)
side_count = data.get('side_count', 1762)

print(f'Loaded mesh data: {len(verts)} vertices, {len(faces)} faces ({front_count} front, {back_count} back, {side_count} side).')

# 2. Clean up previous Valkyrie objects and accessory meshes
valk_prefixes = ('Cyber_Valkyrie', 'Valk_3D_')
for obj in list(bpy.data.objects):
    if any(obj.name.startswith(p) for p in valk_prefixes) and obj.type != 'LIGHT':
        bpy.data.objects.remove(obj, do_unlink=True)

# 3. Create Main Valkyrie Mesh
mesh = bpy.data.meshes.new('Cyber_Valkyrie_Mesh')
mesh.from_pydata(verts, [], faces)
mesh.update()

# Assign UV coordinates per loop (Front: Front UV, Back: Inverted Back UV, Side: Anatomical Side UV)
uv_layer = mesh.uv_layers.new(name='UVMap')
for i, poly in enumerate(mesh.polygons):
    poly.use_smooth = True
    is_side = (i >= front_count + back_count)
    if i < front_count:
        poly.material_index = 0
    elif i < front_count + back_count:
        poly.material_index = 1
    else:
        poly.material_index = 2
        
    for loop_idx in poly.loop_indices:
        v_idx = mesh.loops[loop_idx].vertex_index
        if is_side:
            v_co = mesh.vertices[v_idx].co
            # Bilateral side projection from canonical side turnaround texture
            if v_co.x >= 0:
                u_side = max(0.01, min(0.99, 0.50 + 0.57 * v_co.y))
            else:
                u_side = max(0.01, min(0.99, 0.50 - 0.57 * v_co.y))
            v_side = max(0.01, min(0.99, v_co.z / 2.45))
            uv_layer.data[loop_idx].uv = (u_side, v_side)
        else:
            uv_layer.data[loop_idx].uv = uvs[v_idx]

mesh.update()

valk_obj = bpy.data.objects.new('Cyber_Valkyrie', mesh)
RX = 2.15
valk_obj.location = (RX, 0.0, 0.0)
valk_obj.rotation_euler = (0.0, 0.0, radians(8.0))
bpy.context.collection.objects.link(valk_obj)

# 4. Modifiers for Smooth Organic Surface with Crisp Highlights
mod_wn = valk_obj.modifiers.new(name='WeightedNormal', type='WEIGHTED_NORMAL')
mod_wn.weight = 50

# 5. Materials Setup
def load_img(name, path, is_non_color=False):
    img = bpy.data.images.get(name)
    if img:
        img.filepath = path
        img.reload()
    else:
        img = bpy.data.images.load(path)
        img.name = name
    if is_non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img

img_front_color = load_img('valk_front_color', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_master.png')
img_front_norm = load_img('valk_front_norm', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_normal.png', is_non_color=True)
img_front_emit = load_img('valk_front_emit', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_emission.png')

img_back_color = load_img('valk_back_color', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_master.png')
img_back_norm = load_img('valk_back_norm', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_normal.png', is_non_color=True)
img_back_emit = load_img('valk_back_emit', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_emission.png')

img_side_color = load_img('valk_side_color', r'd:\Keyboard stickman warrior\test_3d\valk_clean_side.png')
img_side_norm = load_img('valk_side_norm', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_side_normal.png', is_non_color=True)
img_side_emit = load_img('valk_side_emit', r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_side_emission.png')

# 5b. Slot 0: Mat_Valkyrie_MasterPBR (Front PBR - 100% OPAQUE Solid Geometry)
mat_front = bpy.data.materials.get('Mat_Valkyrie_MasterPBR') or bpy.data.materials.new(name='Mat_Valkyrie_MasterPBR')
mat_front.use_nodes = True
mat_front.blend_method = 'OPAQUE'
mat_front.diffuse_color = (0.78, 0.06, 0.12, 1.0)
nodes_f = mat_front.node_tree.nodes
nodes_f.clear()
links_f = mat_front.node_tree.links

out_f = nodes_f.new('ShaderNodeOutputMaterial')
bsdf_f = nodes_f.new('ShaderNodeBsdfPrincipled')
bsdf_f.inputs['Metallic'].default_value = 0.85
bsdf_f.inputs['Roughness'].default_value = 0.30

tex_c_f = nodes_f.new('ShaderNodeTexImage')
tex_c_f.image = img_front_color
links_f.new(tex_c_f.outputs['Color'], bsdf_f.inputs['Base Color'])

tex_n_f = nodes_f.new('ShaderNodeTexImage')
tex_n_f.image = img_front_norm
norm_map_f = nodes_f.new('ShaderNodeNormalMap')
norm_map_f.inputs['Strength'].default_value = 0.60
links_f.new(tex_n_f.outputs['Color'], norm_map_f.inputs['Color'])
links_f.new(norm_map_f.outputs['Normal'], bsdf_f.inputs['Normal'])

tex_e_f = nodes_f.new('ShaderNodeTexImage')
tex_e_f.image = img_front_emit
if 'Emission Color' in bsdf_f.inputs:
    links_f.new(tex_e_f.outputs['Color'], bsdf_f.inputs['Emission Color'])
    bsdf_f.inputs['Emission Strength'].default_value = 3.2

links_f.new(bsdf_f.outputs['BSDF'], out_f.inputs['Surface'])
valk_obj.data.materials.append(mat_front) # Slot 0

# 5c. Slot 1: Mat_Valkyrie_BackPBR (Back PBR - 100% OPAQUE Solid Geometry)
mat_back = bpy.data.materials.get('Mat_Valkyrie_BackPBR') or bpy.data.materials.new(name='Mat_Valkyrie_BackPBR')
mat_back.use_nodes = True
mat_back.blend_method = 'OPAQUE'
mat_back.diffuse_color = (0.72, 0.06, 0.10, 1.0)
nodes_b = mat_back.node_tree.nodes
nodes_b.clear()
links_b = mat_back.node_tree.links

out_b = nodes_b.new('ShaderNodeOutputMaterial')
bsdf_b = nodes_b.new('ShaderNodeBsdfPrincipled')
bsdf_b.inputs['Metallic'].default_value = 0.85
bsdf_b.inputs['Roughness'].default_value = 0.28

tex_c_b = nodes_b.new('ShaderNodeTexImage')
tex_c_b.image = img_back_color
links_b.new(tex_c_b.outputs['Color'], bsdf_b.inputs['Base Color'])

tex_n_b = nodes_b.new('ShaderNodeTexImage')
tex_n_b.image = img_back_norm
norm_map_b = nodes_b.new('ShaderNodeNormalMap')
norm_map_b.inputs['Strength'].default_value = 0.65
links_b.new(tex_n_b.outputs['Color'], norm_map_b.inputs['Color'])
links_b.new(norm_map_b.outputs['Normal'], bsdf_b.inputs['Normal'])

tex_e_b = nodes_b.new('ShaderNodeTexImage')
tex_e_b.image = img_back_emit
if 'Emission Color' in bsdf_b.inputs:
    links_b.new(tex_e_b.outputs['Color'], bsdf_b.inputs['Emission Color'])
    bsdf_b.inputs['Emission Strength'].default_value = 3.8

links_b.new(bsdf_b.outputs['BSDF'], out_b.inputs['Surface'])
valk_obj.data.materials.append(mat_back) # Slot 1

# 5d. Slot 2: Mat_Valkyrie_SidePBR (Side PBR - 100% Watertight Canonical Side Mecha Texture)
mat_side = bpy.data.materials.get('Mat_Valkyrie_SidePBR') or bpy.data.materials.new(name='Mat_Valkyrie_SidePBR')
mat_side.use_nodes = True
mat_side.blend_method = 'OPAQUE'
mat_side.diffuse_color = (0.75, 0.06, 0.10, 1.0)
nodes_s = mat_side.node_tree.nodes
nodes_s.clear()
links_s = mat_side.node_tree.links

out_s = nodes_s.new('ShaderNodeOutputMaterial')
bsdf_s = nodes_s.new('ShaderNodeBsdfPrincipled')
bsdf_s.inputs['Metallic'].default_value = 0.85
bsdf_s.inputs['Roughness'].default_value = 0.30

tex_c_s = nodes_s.new('ShaderNodeTexImage')
tex_c_s.image = img_side_color
links_s.new(tex_c_s.outputs['Color'], bsdf_s.inputs['Base Color'])

tex_n_s = nodes_s.new('ShaderNodeTexImage')
tex_n_s.image = img_side_norm
norm_map_s = nodes_s.new('ShaderNodeNormalMap')
norm_map_s.inputs['Strength'].default_value = 0.60
links_s.new(tex_n_s.outputs['Color'], norm_map_s.inputs['Color'])
links_s.new(norm_map_s.outputs['Normal'], bsdf_s.inputs['Normal'])

tex_e_s = nodes_s.new('ShaderNodeTexImage')
tex_e_s.image = img_side_emit
if 'Emission Color' in bsdf_s.inputs:
    links_s.new(tex_e_s.outputs['Color'], bsdf_s.inputs['Emission Color'])
    bsdf_s.inputs['Emission Strength'].default_value = 3.5

links_s.new(bsdf_s.outputs['BSDF'], out_s.inputs['Surface'])
valk_obj.data.materials.append(mat_side) # Slot 2

# 6. In-Scene Dynamic Soft Point Lights (360 illumination)
def setup_pt_light(name, color, energy, loc, radius=0.15):
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old)
    ld = bpy.data.lights.new(name, 'POINT')
    ld.color = color
    ld.energy = energy
    ld.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, ld)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    return obj

# Front Arc Core Light
setup_pt_light('Valk_ArcCore_Light', (1.0, 0.45, 0.12), 35, (RX, -0.32, 1.85), radius=0.20)
# Back Spine Thruster Light
setup_pt_light('Valk_BackThruster_Light', (1.0, 0.22, 0.06), 45, (RX, 0.38, 1.84), radius=0.20)

print('>>> Master 3D Cyber Valkyrie cleanly assembled with 100% Watertight Front & Back PBR Materials!')

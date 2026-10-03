import bpy
import bmesh
import json
import mathutils
import os
import sys

print("======================================================================")
print(">>> BUILDING MASTER CYBER VALKYRIE (FREYA) 3D GLB & RIG IN BLENDER <<<")
print("======================================================================")

work_dir = r"d:\Keyboard stickman warrior\test_3d"
web_assets_dir = r"d:\Keyboard stickman warrior\apps\web\public\assets\3d"
json_path = os.path.join(work_dir, "valk_master_mesh_data.json")

# 1. Reset Blender Scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Remove all default objects
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

# 2. Load Mesh Data
with open(json_path, 'r') as f:
    mesh_data = json.load(f)

verts = mesh_data['verts']
uvs = mesh_data['uvs']
faces = mesh_data['faces']
front_count = mesh_data['front_count']
back_count = mesh_data['back_count']
side_count = mesh_data['side_count']

# Create Mesh and Object
mesh = bpy.data.meshes.new("Cyber_Valkyrie_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()

CHAR_HEIGHT = max(v[2] for v in verts)
print(f"Mesh created: {len(verts)} vertices, {len(faces)} faces. Height: {CHAR_HEIGHT:.4f}m")

# Setup UVs and Face Materials
uv_layer = mesh.uv_layers.new(name="UVMap")
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
            u_side = max(0.01, min(0.99, 0.50 + 0.58 * v_co.y))
            v_side = max(0.01, min(0.99, v_co.z / CHAR_HEIGHT))
            uv_layer.data[loop_idx].uv = (u_side, v_side)
        else:
            uv_layer.data[loop_idx].uv = uvs[v_idx]

mesh.update()

mesh_obj = bpy.data.objects.new("Cyber_Valkyrie", mesh)
bpy.context.scene.collection.objects.link(mesh_obj)
bpy.context.view_layer.objects.active = mesh_obj
mesh_obj.select_set(True)

# 3. Setup PBR Materials
def load_and_pack_img(img_name, filename, is_non_color=False):
    fpath = os.path.join(work_dir, filename)
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"Missing texture: {fpath}")
    img = bpy.data.images.get(img_name) or bpy.data.images.load(fpath)
    img.name = img_name
    img.filepath = fpath
    img.reload()
    if is_non_color:
        img.colorspace_settings.name = 'Non-Color'
    else:
        img.colorspace_settings.name = 'sRGB'
    img.pack()
    return img

def build_pbr_mat(mat_name, img_col, img_nrm, img_emi, metallic=0.22, roughness=0.40, spec=0.50, emit_str=3.5, diffuse_tint=(0.78, 0.08, 0.12, 1.0)):
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    mat.blend_method = 'OPAQUE'
    mat.diffuse_color = diffuse_tint
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links

    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = spec
    elif 'Specular' in bsdf.inputs:
        bsdf.inputs['Specular'].default_value = spec

    # Base Color Texture
    tex_c = nodes.new('ShaderNodeTexImage')
    tex_c.image = img_col
    links.new(tex_c.outputs['Color'], bsdf.inputs['Base Color'])

    # Normal Map Texture
    tex_n = nodes.new('ShaderNodeTexImage')
    tex_n.image = img_nrm
    nrm_node = nodes.new('ShaderNodeNormalMap')
    nrm_node.inputs['Strength'].default_value = 0.75
    links.new(tex_n.outputs['Color'], nrm_node.inputs['Color'])
    links.new(nrm_node.outputs['Normal'], bsdf.inputs['Normal'])

    # Emission Texture
    tex_e = nodes.new('ShaderNodeTexImage')
    tex_e.image = img_emi
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_e.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = emit_str
    elif 'Emission' in bsdf.inputs:
        links.new(tex_e.outputs['Color'], bsdf.inputs['Emission'])

    links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])
    return mat

img_f_col = load_and_pack_img("Mat_Valkyrie_f_col", "valk_turnaround_front_master.png")
img_f_nrm = load_and_pack_img("Mat_Valkyrie_f_nrm", "valk_turnaround_front_normal.png", is_non_color=True)
img_f_emi = load_and_pack_img("Mat_Valkyrie_f_emi", "valk_turnaround_front_emission.png")

img_b_col = load_and_pack_img("Mat_Valkyrie_b_col", "valk_turnaround_back_master.png")
img_b_nrm = load_and_pack_img("Mat_Valkyrie_b_nrm", "valk_turnaround_back_normal.png", is_non_color=True)
img_b_emi = load_and_pack_img("Mat_Valkyrie_b_emi", "valk_turnaround_back_emission.png")

img_s_col = load_and_pack_img("Mat_Valkyrie_s_col", "valk_clean_side.png")
img_s_nrm = load_and_pack_img("Mat_Valkyrie_s_nrm", "valk_turnaround_side_normal.png", is_non_color=True)
img_s_emi = load_and_pack_img("Mat_Valkyrie_s_emi", "valk_turnaround_side_emission.png")

mat_f = build_pbr_mat("Mat_Valkyrie_FrontPBR", img_f_col, img_f_nrm, img_f_emi, metallic=0.22, roughness=0.40, emit_str=3.5)
mat_b = build_pbr_mat("Mat_Valkyrie_BackPBR", img_b_col, img_b_nrm, img_b_emi, metallic=0.22, roughness=0.40, emit_str=3.5)
mat_s = build_pbr_mat("Mat_Valkyrie_SidePBR", img_s_col, img_s_nrm, img_s_emi, metallic=0.22, roughness=0.40, emit_str=3.5)

mesh_obj.data.materials.append(mat_f)
mesh_obj.data.materials.append(mat_b)
mesh_obj.data.materials.append(mat_s)

# Center mesh horizontally and ground to Z=0
min_z = min(v.co.z for v in mesh_obj.data.vertices)
min_x = min(v.co.x for v in mesh_obj.data.vertices)
max_x = max(v.co.x for v in mesh_obj.data.vertices)
cx = (min_x + max_x) / 2.0
mesh_obj.data.transform(mathutils.Matrix.Translation((-cx, 0, -min_z)))
mesh_obj.data.update()

height = max(v.co.z for v in mesh_obj.data.vertices)
hw = max(abs(min(v.co.x for v in mesh_obj.data.vertices)), max(v.co.x for v in mesh_obj.data.vertices))
print(f"Calibrated Valkyrie Height: {height:.4f}m, Half-Width: {hw:.4f}m")

# 4. Build 20-Bone Humanoid Armature
arm_data = bpy.data.armatures.new("Cyber_Valkyrie_Rig_Data")
arm_obj = bpy.data.objects.new("Cyber_Valkyrie_Rig", arm_data)
bpy.context.scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
arm_obj.select_set(True)

bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

root = eb.new("Root")
root.head = (0, 0, 0)
root.tail = (0, 0, 0.15)

hips = eb.new("Hips")
hips.head = (0, 0, height * 0.48)
hips.tail = (0, 0, height * 0.56)
hips.parent = root

spine = eb.new("Spine")
spine.head = (0, 0, height * 0.56)
spine.tail = (0, 0, height * 0.69)
spine.parent = hips

chest = eb.new("Chest")
chest.head = (0, 0, height * 0.69)
chest.tail = (0, 0, height * 0.83)
chest.parent = spine

neck = eb.new("Neck")
neck.head = (0, 0, height * 0.83)
neck.tail = (0, 0, height * 0.88)
neck.parent = chest

head = eb.new("Head")
head.head = (0, 0, height * 0.88)
head.tail = (0, 0, height * 1.02)
head.parent = neck

# Right Arm
sh_r = eb.new("Shoulder.R")
sh_r.head = (hw * 0.20, 0.0, height * 0.79)
sh_r.tail = (0.28, 0.0, height * 0.78)
sh_r.parent = chest

ua_r = eb.new("UpperArm.R")
ua_r.head = (0.28, 0.0, height * 0.78)
ua_r.tail = (0.32, 0.0, height * 0.65)
ua_r.parent = sh_r

fa_r = eb.new("Forearm.R")
fa_r.head = (0.32, 0.0, height * 0.65)
fa_r.tail = (0.32, 0.0, height * 0.53)
fa_r.parent = ua_r

h_r = eb.new("Hand.R")
h_r.head = (0.32, 0.0, height * 0.53)
h_r.tail = (0.32, 0.0, height * 0.44)
h_r.parent = fa_r

# Left Arm
sh_l = eb.new("Shoulder.L")
sh_l.head = (-hw * 0.20, 0.0, height * 0.79)
sh_l.tail = (-0.28, 0.0, height * 0.78)
sh_l.parent = chest

ua_l = eb.new("UpperArm.L")
ua_l.head = (-0.28, 0.0, height * 0.78)
ua_l.tail = (-0.32, 0.0, height * 0.65)
ua_l.parent = sh_l

fa_l = eb.new("Forearm.L")
fa_l.head = (-0.32, 0.0, height * 0.65)
fa_l.tail = (-0.32, 0.0, height * 0.53)
fa_l.parent = ua_l

h_l = eb.new("Hand.L")
h_l.head = (-0.32, 0.0, height * 0.53)
h_l.tail = (-0.32, 0.0, height * 0.44)
h_l.parent = fa_l

# Symmetrical Leg Chains matching exact mesh centroids
th_r = eb.new("Thigh.R")
th_r.head = (0.248, 0.0, height * 0.48)
th_r.tail = (0.312, 0.0, height * 0.26)
th_r.parent = hips

shn_r = eb.new("Shin.R")
shn_r.head = (0.312, 0.0, height * 0.26)
shn_r.tail = (0.282, 0.0, 0.12)
shn_r.parent = th_r

ft_r = eb.new("Foot.R")
ft_r.head = (0.282, 0.0, 0.12)
ft_r.tail = (0.282, -0.15, 0.005)
ft_r.parent = shn_r

th_l = eb.new("Thigh.L")
th_l.head = (-0.248, 0.0, height * 0.48)
th_l.tail = (-0.312, 0.0, height * 0.26)
th_l.parent = hips

shn_l = eb.new("Shin.L")
shn_l.head = (-0.312, 0.0, height * 0.26)
shn_l.tail = (-0.282, 0.0, 0.12)
shn_l.parent = th_l

ft_l = eb.new("Foot.L")
ft_l.head = (-0.282, 0.0, 0.12)
ft_l.tail = (-0.282, -0.15, 0.005)
ft_l.parent = shn_l

bpy.ops.object.mode_set(mode='OBJECT')

# 5. Skin Weighting
mesh_obj.vertex_groups.clear()
for mod in list(mesh_obj.modifiers):
    if mod.type == 'ARMATURE':
        mesh_obj.modifiers.remove(mod)

bpy.ops.object.select_all(action='DESELECT')
mesh_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

vg_hand_r = mesh_obj.vertex_groups.get("Hand.R")
vg_fa_r = mesh_obj.vertex_groups.get("Forearm.R")
vg_hand_l = mesh_obj.vertex_groups.get("Hand.L")
vg_fa_l = mesh_obj.vertex_groups.get("Forearm.L")
vg_chest = mesh_obj.vertex_groups.get("Chest")
vg_spine = mesh_obj.vertex_groups.get("Spine")
vg_foot_l = mesh_obj.vertex_groups.get("Foot.L")
vg_foot_r = mesh_obj.vertex_groups.get("Foot.R")
vg_shin_l = mesh_obj.vertex_groups.get("Shin.L")
vg_shin_r = mesh_obj.vertex_groups.get("Shin.R")

for v in mesh_obj.data.vertices:
    # Right Gauntlet / Glaive solid weight reinforcement
    if v.co.x > 0.25 and v.co.z > 0.60:
        if v.co.z <= (height * 0.54):
            if vg_hand_r: vg_hand_r.add([v.index], 1.0, 'REPLACE')
            if vg_fa_r: vg_fa_r.remove([v.index])
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])

    # Left Offhand Gauntlet solid weight reinforcement
    if v.co.x < -0.25 and v.co.z > 0.60:
        if v.co.z <= (height * 0.54):
            if vg_hand_l: vg_hand_l.add([v.index], 1.0, 'REPLACE')
            if vg_fa_l: vg_fa_l.remove([v.index])
            if vg_chest: vg_chest.remove([v.index])
            if vg_spine: vg_spine.remove([v.index])

    # Foot bone isolation: only isolate actual foot vertices below 0.12
    if v.co.z > 0.16:
        if vg_foot_l: vg_foot_l.remove([v.index])
        if vg_foot_r: vg_foot_r.remove([v.index])
    elif v.co.z <= 0.04:
        if v.co.x > 0 and vg_foot_r:
            vg_foot_r.add([v.index], 1.0, 'REPLACE')
        elif v.co.x < 0 and vg_foot_l:
            vg_foot_l.add([v.index], 1.0, 'REPLACE')

# 6. Export GLB
bpy.ops.object.select_all(action='DESELECT')
mesh_obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj

target_web = os.path.join(web_assets_dir, "Cyber_Valkyrie.glb")
target_test = os.path.join(work_dir, "Cyber_Valkyrie.glb")

for target_path in [target_web, target_test]:
    bpy.ops.export_scene.gltf(
        filepath=target_path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_cameras=False,
        export_lights=False
    )
    print(f"Exported {target_path}: {os.path.getsize(target_path):,} bytes")

print(">>> MASTER CYBER VALKYRIE BUILD COMPLETE!")

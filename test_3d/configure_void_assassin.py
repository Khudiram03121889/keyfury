import bpy
import json
import os
from math import radians

print(">>> Configuring Master High-Fidelity 3D Void Assassin (Nyx) in Blender...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"
json_path = os.path.join(work_dir, "void_master_mesh_data.json")

with open(json_path, "r") as f:
    data = json.load(f)

verts = data["verts"]
uvs = data["uvs"]
faces = data["faces"]
front_count = data["front_count"]
back_count = data["back_count"]
side_count = data["side_count"]

print(f"Loaded mesh data: {len(verts)} verts, {len(faces)} faces ({front_count} front, {back_count} back, {side_count} side).")

# 1. Clean up old Void Assassin objects and temporary lights
for obj in list(bpy.data.objects):
    if any(obj.name.startswith(p) for p in ["Void_Assassin", "Void_Mesh", "Void_Inspect", "Void_Test", "Void_Studio"]):
        bpy.data.objects.remove(obj, do_unlink=True)

# 2. Create Master Void Assassin Mesh
mesh = bpy.data.meshes.new("Void_Assassin_Mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()

uv_layer = mesh.uv_layers.new(name="UVMap")
CHAR_HEIGHT = 2.22

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
            # Canonical side turnaround texture:
            # Character faces Left (Front is u < 0.50, Back is u > 0.50)
            # In 3D: Front is -Y, Back is +Y
            u_side = max(0.01, min(0.99, 0.50 + 1.25 * v_co.y))
            v_side = max(0.01, min(0.99, v_co.z / CHAR_HEIGHT))
            uv_layer.data[loop_idx].uv = (u_side, v_side)
        else:
            uv_layer.data[loop_idx].uv = uvs[v_idx]

mesh.update()

# 3. Create Master Void Assassin Object
void_obj = bpy.data.objects.new("Void_Assassin", mesh)
void_obj.location = (0.0, 0.0, 0.0)
void_obj.rotation_euler = (0.0, 0.0, 0.0)
bpy.context.collection.objects.link(void_obj)

# 4. Modifiers
mod_wn = void_obj.modifiers.new(name="WeightedNormal", type="WEIGHTED_NORMAL")
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
        img.colorspace_settings.name = "Non-Color"
    return img

img_f_col = load_img("void_f_col", os.path.join(work_dir, "void_turnaround_front_master.png"))
img_f_nrm = load_img("void_f_nrm", os.path.join(work_dir, "void_turnaround_front_normal.png"), is_non_color=True)
img_f_emi = load_img("void_f_emi", os.path.join(work_dir, "void_turnaround_front_emission.png"))

img_b_col = load_img("void_b_col", os.path.join(work_dir, "void_turnaround_back_master.png"))
img_b_nrm = load_img("void_b_nrm", os.path.join(work_dir, "void_turnaround_back_normal.png"), is_non_color=True)
img_b_emi = load_img("void_b_emi", os.path.join(work_dir, "void_turnaround_back_emission.png"))

img_s_col = load_img("void_s_col", os.path.join(work_dir, "void_turnaround_side_master.png"))
img_s_nrm = load_img("void_s_nrm", os.path.join(work_dir, "void_turnaround_side_normal.png"), is_non_color=True)
img_s_emi = load_img("void_s_emi", os.path.join(work_dir, "void_turnaround_side_emission.png"))

def build_pbr_mat(mat_name, img_col, img_nrm, img_emi, metallic=0.15, roughness=0.35, spec=0.45, nrm_str=0.80, emit_str=3.8, diffuse_tint=(0.65, 0.35, 0.95, 1.0)):
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    mat.blend_method = "OPAQUE"
    mat.diffuse_color = diffuse_tint
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links

    out_node = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    
    # Sleek stealth nano-carbon physics
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = spec

    # Base color texture
    tex_c = nodes.new("ShaderNodeTexImage")
    tex_c.image = img_col
    links.new(tex_c.outputs["Color"], bsdf.inputs["Base Color"])

    # Normal map texture
    tex_n = nodes.new("ShaderNodeTexImage")
    tex_n.image = img_nrm
    nrm_node = nodes.new("ShaderNodeNormalMap")
    nrm_node.inputs["Strength"].default_value = nrm_str
    links.new(tex_n.outputs["Color"], nrm_node.inputs["Color"])
    links.new(nrm_node.outputs["Normal"], bsdf.inputs["Normal"])

    # Emission texture (Amethyst Void #a855f7 glow)
    tex_e = nodes.new("ShaderNodeTexImage")
    tex_e.image = img_emi
    if "Emission Color" in bsdf.inputs:
        links.new(tex_e.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit_str
    elif "Emission" in bsdf.inputs:
        links.new(tex_e.outputs["Color"], bsdf.inputs["Emission"])

    links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat

# Slot 0: Front PBR
mat_front = build_pbr_mat("Mat_Void_FrontPBR", img_f_col, img_f_nrm, img_f_emi, metallic=0.15, roughness=0.35, spec=0.45, nrm_str=0.80, emit_str=3.8)
void_obj.data.materials.append(mat_front)

# Slot 1: Back PBR
mat_back = build_pbr_mat("Mat_Void_BackPBR", img_b_col, img_b_nrm, img_b_emi, metallic=0.15, roughness=0.35, spec=0.45, nrm_str=0.80, emit_str=3.8)
void_obj.data.materials.append(mat_back)

# Slot 2: Side PBR
mat_side = build_pbr_mat("Mat_Void_SidePBR", img_s_col, img_s_nrm, img_s_emi, metallic=0.18, roughness=0.38, spec=0.40, nrm_str=0.50, emit_str=3.0)
void_obj.data.materials.append(mat_side)

# 6. Local in-scene soft accent lights
def setup_pt_light(name, color, energy, loc, radius=0.35):
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    ld = bpy.data.lights.new(name, "POINT")
    ld.color = color
    ld.energy = energy
    ld.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, ld)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    return obj

setup_pt_light("Void_Visor_Light", (0.75, 0.35, 1.0), 18.0, (0.0, -0.45, 1.70), radius=0.35)
setup_pt_light("Void_Spine_Light", (0.75, 0.35, 1.0), 18.0, (0.0, 0.45, 1.45), radius=0.35)

print(">>> Void Assassin configured cleanly in Blender with complete 3-Slot PBR architecture!")

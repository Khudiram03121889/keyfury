import bpy
import json
import os
from math import radians

print(">>> Starting 4-Fighter Arena Finalization & Roster Perfection in Blender...")

work_dir = r"D:\Keyboard stickman warrior\test_3d"
backup_blend = os.path.join(work_dir, "KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend")

# 1. Open Backup Blend
print(f"Loading base arena scene from: {backup_blend}")
bpy.ops.wm.open_mainfile(filepath=backup_blend)

# Remove any obsolete or conflicting detail objects/collections
for col_name in ["LEG_FINISH_DETAILS"]:
    col = bpy.data.collections.get(col_name)
    if col:
        for obj in list(col.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(col)

for obj in list(bpy.data.objects):
    if any(p in obj.name for p in ["LegFinish", "HUD_", "Combat_HUD", "Text.00"]):
        bpy.data.objects.remove(obj, do_unlink=True)

# Helper for loading image textures with correct color spaces
def load_img(name, filename, is_non_color=False):
    path = os.path.join(work_dir, filename)
    img = bpy.data.images.get(name)
    if img:
        img.filepath = path
        img.reload()
    else:
        img = bpy.data.images.load(path)
        img.name = name
    if is_non_color:
        img.colorspace_settings.name = 'Non-Color'
    else:
        img.colorspace_settings.name = 'sRGB'
    return img

def build_pbr_material(mat_name, img_col, img_nrm, img_emi, metallic, roughness, specular=0.5, nrm_str=0.75, emit_str=2.5, diffuse_tint=(0.1, 0.1, 0.1, 1.0)):
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    mat.blend_method = 'OPAQUE'
    mat.diffuse_color = diffuse_tint
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    
    # Color Texture
    tex_c = nodes.new('ShaderNodeTexImage')
    tex_c.image = img_col
    links.new(tex_c.outputs['Color'], bsdf.inputs['Base Color'])
    
    # Normal Map Texture
    tex_n = nodes.new('ShaderNodeTexImage')
    tex_n.image = img_nrm
    norm_map = nodes.new('ShaderNodeNormalMap')
    norm_map.inputs['Strength'].default_value = nrm_str
    links.new(tex_n.outputs['Color'], norm_map.inputs['Color'])
    links.new(norm_map.outputs['Normal'], bsdf.inputs['Normal'])
    
    # Emission Texture
    tex_e = nodes.new('ShaderNodeTexImage')
    tex_e.image = img_emi
    if 'Emission Color' in bsdf.inputs:
        links.new(tex_e.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = emit_str
    
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

CHAR_HEIGHT = 2.22

# =========================================================================
# 2. REBUILD SHADOW RONIN (KAGE)
# =========================================================================
print("Rebuilding Shadow Ronin with pristine volumetric mesh & calibrated stealth shaders...")
for obj in list(bpy.data.objects):
    if any(obj.name.startswith(p) for p in ['Shadow_Ronin', 'Ronin_Mesh']):
        bpy.data.objects.remove(obj, do_unlink=True)

with open(os.path.join(work_dir, 'ronin_master_mesh_data.json'), 'r') as f:
    ronin_data = json.load(f)

r_verts = ronin_data['verts']
r_uvs = ronin_data['uvs']
r_faces = ronin_data['faces']
r_front_count = ronin_data['front_count']
r_back_count = ronin_data['back_count']
r_side_count = ronin_data['side_count']

r_mesh = bpy.data.meshes.new('Shadow_Ronin_Mesh')
r_mesh.from_pydata(r_verts, [], r_faces)
r_mesh.update()

r_uv_layer = r_mesh.uv_layers.new(name='UVMap')
for i, poly in enumerate(r_mesh.polygons):
    poly.use_smooth = True
    is_side = (i >= r_front_count + r_back_count)
    if i < r_front_count:
        poly.material_index = 0
    elif i < r_front_count + r_back_count:
        poly.material_index = 1
    else:
        poly.material_index = 2
        
    for loop_idx in poly.loop_indices:
        v_idx = r_mesh.loops[loop_idx].vertex_index
        if is_side:
            v_co = r_mesh.vertices[v_idx].co
            # Side projection mapping
            u_side = max(0.01, min(0.99, 0.50 - 0.70 * v_co.y))
            v_side = max(0.01, min(0.99, v_co.z / CHAR_HEIGHT))
            r_uv_layer.data[loop_idx].uv = (u_side, v_side)
        else:
            r_uv_layer.data[loop_idx].uv = r_uvs[v_idx]

r_mesh.update()

ronin_obj = bpy.data.objects.new('Shadow_Ronin', r_mesh)
ronin_obj.location = (-2.55, 0.20, 0.0)
ronin_obj.rotation_euler = (0.0, 0.0, radians(-12.0))
bpy.context.collection.objects.link(ronin_obj)

mod_wn_r = ronin_obj.modifiers.new(name='WeightedNormal', type='WEIGHTED_NORMAL')
mod_wn_r.weight = 50

# Ronin Textures
r_img_f_col = load_img('ronin_f_col', 'ronin_turnaround_front_master.png')
r_img_f_nrm = load_img('ronin_f_nrm', 'ronin_turnaround_front_normal.png', is_non_color=True)
r_img_f_emi = load_img('ronin_f_emi', 'ronin_turnaround_front_emission.png')

r_img_b_col = load_img('ronin_b_col', 'ronin_turnaround_back_master.png')
r_img_b_nrm = load_img('ronin_b_nrm', 'ronin_turnaround_back_normal.png', is_non_color=True)
r_img_b_emi = load_img('ronin_b_emi', 'ronin_turnaround_back_emission.png')

r_img_s_col = load_img('ronin_s_col', 'ronin_turnaround_side_master.png')
r_img_s_nrm = load_img('ronin_s_nrm', 'ronin_turnaround_side_normal.png', is_non_color=True)
r_img_s_emi = load_img('ronin_s_emi', 'ronin_turnaround_side_emission.png')

# Solid viewport color: Charcoal Nano-Carbon (0.06, 0.08, 0.10, 1.0) - ZERO BLUE SMURF!
mat_r_f = build_pbr_material('Mat_Ronin_FrontPBR', r_img_f_col, r_img_f_nrm, r_img_f_emi, metallic=0.40, roughness=0.42, specular=0.50, nrm_str=0.75, emit_str=2.2, diffuse_tint=(0.06, 0.08, 0.10, 1.0))
mat_r_b = build_pbr_material('Mat_Ronin_BackPBR', r_img_b_col, r_img_b_nrm, r_img_b_emi, metallic=0.40, roughness=0.42, specular=0.50, nrm_str=0.75, emit_str=2.2, diffuse_tint=(0.06, 0.08, 0.10, 1.0))
mat_r_s = build_pbr_material('Mat_Ronin_SidePBR', r_img_s_col, r_img_s_nrm, r_img_s_emi, metallic=0.40, roughness=0.42, specular=0.50, nrm_str=0.75, emit_str=2.2, diffuse_tint=(0.06, 0.08, 0.10, 1.0))

ronin_obj.data.materials.append(mat_r_f)
ronin_obj.data.materials.append(mat_r_b)
ronin_obj.data.materials.append(mat_r_s)

# =========================================================================
# 3. REBUILD CYBER VALKYRIE (FREYA)
# =========================================================================
print("Rebuilding Cyber Valkyrie with clean volumetric mesh (no wing web!) & rich crimson/gold shaders...")
for obj in list(bpy.data.objects):
    if any(obj.name.startswith(p) for p in ['Cyber_Valkyrie', 'Valk_Mesh']):
        bpy.data.objects.remove(obj, do_unlink=True)

with open(os.path.join(work_dir, 'valk_master_mesh_data.json'), 'r') as f:
    valk_data = json.load(f)

v_verts = valk_data['verts']
v_uvs = valk_data['uvs']
v_faces = valk_data['faces']
v_front_count = valk_data['front_count']
v_back_count = valk_data['back_count']
v_side_count = valk_data['side_count']

v_mesh = bpy.data.meshes.new('Cyber_Valkyrie_Mesh')
v_mesh.from_pydata(v_verts, [], v_faces)
v_mesh.update()

v_uv_layer = v_mesh.uv_layers.new(name='UVMap')
for i, poly in enumerate(v_mesh.polygons):
    poly.use_smooth = True
    is_side = (i >= v_front_count + v_back_count)
    if i < v_front_count:
        poly.material_index = 0
    elif i < v_front_count + v_back_count:
        poly.material_index = 1
    else:
        poly.material_index = 2
        
    for loop_idx in poly.loop_indices:
        v_idx = v_mesh.loops[loop_idx].vertex_index
        if is_side:
            v_co = v_mesh.vertices[v_idx].co
            # Bilateral side turnaround projection
            u_side = max(0.01, min(0.99, 0.50 + 0.58 * v_co.y))
            v_side = max(0.01, min(0.99, v_co.z / CHAR_HEIGHT))
            v_uv_layer.data[loop_idx].uv = (u_side, v_side)
        else:
            v_uv_layer.data[loop_idx].uv = v_uvs[v_idx]

v_mesh.update()

valk_obj = bpy.data.objects.new('Cyber_Valkyrie', v_mesh)
valk_obj.location = (2.55, 0.20, 0.0)
valk_obj.rotation_euler = (0.0, 0.0, radians(12.0))
bpy.context.collection.objects.link(valk_obj)

mod_wn_v = valk_obj.modifiers.new(name='WeightedNormal', type='WEIGHTED_NORMAL')
mod_wn_v.weight = 50

# Valkyrie Textures
v_img_f_col = load_img('valk_f_col', 'valk_turnaround_front_master.png')
v_img_f_nrm = load_img('valk_f_nrm', 'valk_turnaround_front_normal.png', is_non_color=True)
v_img_f_emi = load_img('valk_f_emi', 'valk_turnaround_front_emission.png')

v_img_b_col = load_img('valk_b_col', 'valk_turnaround_back_master.png')
v_img_b_nrm = load_img('valk_b_nrm', 'valk_turnaround_back_normal.png', is_non_color=True)
v_img_b_emi = load_img('valk_b_emi', 'valk_turnaround_back_emission.png')

v_img_s_col = load_img('valk_s_col', 'valk_clean_side.png')
v_img_s_nrm = load_img('valk_s_nrm', 'valk_turnaround_side_normal.png', is_non_color=True)
v_img_s_emi = load_img('valk_s_emi', 'valk_turnaround_side_emission.png')

# Solid viewport color: Rich Crimson Red (0.78, 0.08, 0.12, 1.0)
# Calibrated PBR: Metallic 0.58, Roughness 0.36 (eliminates cyan reflections!)
mat_v_f = build_pbr_material('Mat_Valkyrie_MasterPBR', v_img_f_col, v_img_f_nrm, v_img_f_emi, metallic=0.58, roughness=0.36, specular=0.55, nrm_str=0.70, emit_str=3.5, diffuse_tint=(0.78, 0.08, 0.12, 1.0))
mat_v_b = build_pbr_material('Mat_Valkyrie_BackPBR', v_img_b_col, v_img_b_nrm, v_img_b_emi, metallic=0.58, roughness=0.36, specular=0.55, nrm_str=0.70, emit_str=3.5, diffuse_tint=(0.72, 0.06, 0.10, 1.0))
mat_v_s = build_pbr_material('Mat_Valkyrie_SidePBR', v_img_s_col, v_img_s_nrm, v_img_s_emi, metallic=0.58, roughness=0.36, specular=0.55, nrm_str=0.70, emit_str=3.5, diffuse_tint=(0.75, 0.06, 0.10, 1.0))

valk_obj.data.materials.append(mat_v_f)
valk_obj.data.materials.append(mat_v_b)
valk_obj.data.materials.append(mat_v_s)

# =========================================================================
# 4. LIGHTING BALANCING & ROOFTOP STAGING
# =========================================================================
print("Balancing rooftop arena lighting to eliminate blue washing...")

# Ensure Shinobi and Void are perfectly grounded and visible
shinobi = bpy.data.objects.get("Volt_Shinobi")
if shinobi:
    shinobi.location = (-0.88, -0.38, 0.0)
    shinobi.rotation_euler = (0.0, 0.0, radians(-4.0))
    shinobi.hide_render = False
    shinobi.hide_viewport = False

void_obj = bpy.data.objects.get("Void_Assassin")
if void_obj:
    void_obj.location = (0.88, -0.38, 0.0)
    void_obj.rotation_euler = (0.0, 0.0, radians(4.0))
    void_obj.hide_render = False
    void_obj.hide_viewport = False

# Remove obsolete single-fighter test/studio lights from old iterations
obsolete_lights = [
    "Valk_Test_Fill",
    "Shinobi_Back_Fill",
    "Shinobi_Back_Ribbon_Light",
    "Void_Studio_Amb",
    "Void_Studio_Fill",
    "Void_Studio_Key",
    "Void_Studio_Rim",
    "Void_Mantle_Back_Light"
]
for l_name in obsolete_lights:
    l_obj = bpy.data.objects.get(l_name)
    if l_obj:
        bpy.data.objects.remove(l_obj, do_unlink=True)

# Balance existing cyan wash lights to prevent color cast
key_cyan = bpy.data.objects.get("Key_Light_Cyan")
if key_cyan:
    key_cyan.data.energy = 350.0
    key_cyan.data.color = (0.25, 0.85, 1.0)
    key_cyan.location = (-6.5, -6.5, 4.8)

ground_up = bpy.data.objects.get("Ground_Uplight")
if ground_up:
    ground_up.data.energy = 80.0
    ground_up.data.color = (0.0, 0.70, 0.95)

# Accent lights for Ronin
r_visor = bpy.data.objects.get("Ronin_Visor_Light")
if r_visor:
    r_visor.location = (-2.55, -0.25, 1.95)
    r_visor.data.energy = 14.0
    r_visor.data.color = (0.05, 0.85, 1.0)

r_spine = bpy.data.objects.get("Ronin_Spine_Light")
if r_spine:
    r_spine.location = (-2.55, 0.65, 1.65)
    r_spine.data.energy = 15.0
    r_spine.data.color = (0.05, 0.85, 1.0)

# Accent lights for Valkyrie
v_arc = bpy.data.objects.get("Valk_ArcCore_Light")
if v_arc:
    v_arc.location = (2.55, -0.15, 1.85)
    v_arc.data.energy = 38.0
    v_arc.data.color = (1.0, 0.40, 0.08)

v_back = bpy.data.objects.get("Valk_BackThruster_Light")
if v_back:
    v_back.location = (2.55, 0.58, 1.84)
    v_back.data.energy = 45.0
    v_back.data.color = (1.0, 0.20, 0.05)

v_wing = bpy.data.objects.get("Valk_WingThruster_Light")
if v_wing:
    v_wing.location = (3.00, 0.58, 1.96)
    v_wing.data.energy = 50.0
    v_wing.data.color = (1.0, 0.20, 0.05)

# Add dedicated warm golden key fill for Cyber Valkyrie
valk_warm_key = bpy.data.objects.get("Valk_Warm_KeyLight")
if not valk_warm_key:
    light_data = bpy.data.lights.new(name="Valk_Warm_KeyLight", type='AREA')
    valk_warm_key = bpy.data.objects.new(name="Valk_Warm_KeyLight", object_data=light_data)
    bpy.context.collection.objects.link(valk_warm_key)

valk_warm_key.data.energy = 460.0
valk_warm_key.data.color = (1.0, 0.88, 0.72)
valk_warm_key.data.size = 2.5
valk_warm_key.location = (6.0, -6.5, 4.5)
valk_warm_key.rotation_euler = (radians(35), radians(15), radians(-45))

# Active Camera
cam = bpy.data.objects.get("KeyFury_Combat_Camera")
if cam:
    bpy.context.scene.camera = cam

# Set solid 3D view shading for material preview
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.show_region_ui = False
                    space.shading.type = 'MATERIAL'

# =========================================================================
# 5. SAVE BLEND & EXPORT GLB ASSETS
# =========================================================================
out_blend = os.path.join(work_dir, "KeyFury_3D_CyberRooftop.blend")
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print(f"Saved perfected Blender scene to: {out_blend}")

# Standalone Shadow Ronin GLB
ronin_obj.location = (0.0, 0.0, 0.0)
ronin_obj.rotation_euler = (0.0, 0.0, 0.0)
bpy.ops.object.select_all(action='DESELECT')
ronin_obj.select_set(True)
bpy.context.view_layer.objects.active = ronin_obj
bpy.ops.export_scene.gltf(
    filepath=os.path.join(work_dir, "Shadow_Ronin.glb"),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_cameras=False,
    export_lights=False
)
ronin_obj.location = (-2.55, 0.20, 0.0)
ronin_obj.rotation_euler = (0.0, 0.0, radians(-12.0))
print("Exported standalone Shadow_Ronin.glb")

# Standalone Cyber Valkyrie GLB
valk_obj.location = (0.0, 0.0, 0.0)
valk_obj.rotation_euler = (0.0, 0.0, 0.0)
bpy.ops.object.select_all(action='DESELECT')
valk_obj.select_set(True)
bpy.context.view_layer.objects.active = valk_obj
bpy.ops.export_scene.gltf(
    filepath=os.path.join(work_dir, "Cyber_Valkyrie.glb"),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_cameras=False,
    export_lights=False
)
valk_obj.location = (2.55, 0.20, 0.0)
valk_obj.rotation_euler = (0.0, 0.0, radians(12.0))
print("Exported standalone Cyber_Valkyrie.glb")

# Export Full 4-Fighter Arena GLB
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=os.path.join(work_dir, "KeyFury_3D_Arena.glb"),
    export_format='GLB',
    export_cameras=True,
    export_lights=False
)
print("Exported full 4-fighter KeyFury_3D_Arena.glb")

# =========================================================================
# 6. VERIFICATION RENDERS
# =========================================================================
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# EEVEE Photoreal Still
scene.render.engine = 'BLENDER_EEVEE'
eevee_render_path = os.path.join(work_dir, "KeyFury_3D_Arena_Render_Perfected.png")
scene.render.filepath = eevee_render_path
bpy.ops.render.render(write_still=True)
print(f"Rendered perfected EEVEE still to: {eevee_render_path}")

# Workbench Solid Still (Shows canonical archetype colors without lighting bias)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
workbench_render_path = os.path.join(work_dir, "solid_viewport_test_perfected.png")
scene.render.filepath = workbench_render_path
bpy.ops.render.render(write_still=True)
print(f"Rendered perfected Workbench still to: {workbench_render_path}")

# Restore EEVEE
scene.render.engine = 'BLENDER_EEVEE'

# Save again with final camera state
bpy.ops.wm.save_as_mainfile(filepath=out_blend)
print(">>> INTEGRATION & ROOFTOP PERFECTION COMPLETED SUCCESSFULLY!")

import bpy
import bmesh
import math
from mathutils import Vector, Matrix

LOG_PATH = r"d:\Keyboard stickman warrior\test_3d\build_unified_power_fists.log"
log_f = open(LOG_PATH, "w", encoding="utf-8")
def log(msg):
    print(msg, flush=True)
    log_f.write(str(msg) + "\n")
    log_f.flush()

BLEND_PATH = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend"
WEB_GLB_PATH = r"d:\Keyboard stickman warrior\apps\web\public\assets\3d\Cyber_Valkyrie.glb"
TEST_GLB_PATH = r"d:\Keyboard stickman warrior\test_3d\Cyber_Valkyrie.glb"
DIST_GLB_PATH = r"d:\Keyboard stickman warrior\apps\web\dist\assets\3d\Cyber_Valkyrie.glb"
ANDROID_GLB_PATH = r"d:\Keyboard stickman warrior\apps\web\android\app\src\main\assets\public\assets\3d\Cyber_Valkyrie.glb"

log(">>> Opening master blend file: " + BLEND_PATH)
bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)

valk = bpy.data.objects.get("Cyber_Valkyrie")
rig = bpy.data.objects.get("Cyber_Valkyrie_Rig")
if not valk or not rig:
    raise RuntimeError("Cyber_Valkyrie or Cyber_Valkyrie_Rig missing from blend file!")

# Reset any pose on the rig to Rest Pose first
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)
bpy.ops.object.mode_set(mode='OBJECT')

# Remove old standalone weapon/gauntlet objects
for name in ["Valk_Glaive", "Hard_Light_Glaive", "Solar_Glaive", "Valk_Gauntlet_R", "Valk_Gauntlet_L", "Cyber_Gauntlet_R", "Cyber_Gauntlet_L"]:
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
        log(f">>> Removed old standalone object: {name}")

for m in list(bpy.data.meshes):
    if any(k in m.name.lower() for k in ["glaive", "gauntlet"]):
        bpy.data.meshes.remove(m, do_unlink=True)

# 1. MATERIALS DEFINITION
def get_or_create_mat(name, base_color, metallic, roughness, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get("Principled BSDF")
    if bs:
        bs.inputs["Base Color"].default_value = base_color
        bs.inputs["Metallic"].default_value = metallic
        bs.inputs["Roughness"].default_value = roughness
        if emission_color:
            if "Emission Color" in bs.inputs:
                bs.inputs["Emission Color"].default_value = emission_color
                bs.inputs["Emission Strength"].default_value = emission_strength
            elif "Emission" in bs.inputs:
                bs.inputs["Emission"].default_value = emission_color
    return mat

mat_metal = get_or_create_mat("Mat_Valk_Gauntlet_Metal", (0.08, 0.09, 0.12, 1.0), 0.90, 0.22)
mat_trim = get_or_create_mat("Mat_Valk_Gauntlet_Trim", (0.95, 0.65, 0.15, 1.0), 0.95, 0.18)
mat_steel = get_or_create_mat("Mat_Valk_Gauntlet_Steel", (0.85, 0.88, 0.92, 1.0), 0.98, 0.12)
mat_grip = get_or_create_mat("Mat_Valk_Gauntlet_Grip", (0.04, 0.04, 0.05, 1.0), 0.15, 0.85)
mat_core = get_or_create_mat("Mat_Valk_Gauntlet_Core", (1.0, 0.10, 0.20, 1.0), 0.05, 0.15, (1.0, 0.12, 0.25, 1.0), 5.5)

log(">>> Materials ready.")

# Ensure materials are present on Cyber_Valkyrie
valk_mats = list(valk.data.materials)
mat_map = {}
for mat in [mat_metal, mat_trim, mat_steel, mat_grip, mat_core]:
    if mat.name not in [m.name for m in valk_mats if m]:
        valk.data.materials.append(mat)
        mat_map[mat.name] = len(valk.data.materials) - 1
    else:
        for idx, m in enumerate(valk.data.materials):
            if m and m.name == mat.name:
                mat_map[mat.name] = idx
                break

log(f">>> Material index mapping on Cyber_Valkyrie: {mat_map}")

# Helper to create an extruded prism
def add_prism(bm, x_min, x_max, y_min, y_max, z_min, z_max, mat_idx, bevel_x=0.0, bevel_z=0.0):
    v0 = bm.verts.new((x_min + bevel_x, y_min, z_min + bevel_z))
    v1 = bm.verts.new((x_max - bevel_x, y_min, z_min + bevel_z))
    v2 = bm.verts.new((x_max, y_min, z_max - bevel_z))
    v3 = bm.verts.new((x_min, y_min, z_max - bevel_z))
    
    v4 = bm.verts.new((x_min + bevel_x, y_max, z_min + bevel_z))
    v5 = bm.verts.new((x_max - bevel_x, y_max, z_min + bevel_z))
    v6 = bm.verts.new((x_max, y_max, z_max - bevel_z))
    v7 = bm.verts.new((x_min, y_max, z_max - bevel_z))
    
    faces = [
        [v0, v1, v2, v3],
        [v7, v6, v5, v4],
        [v0, v4, v5, v1],
        [v2, v6, v7, v3],
        [v0, v3, v7, v4],
        [v1, v5, v6, v2],
    ]
    created = []
    for fverts in faces:
        try:
            f = bm.faces.new(fverts)
            f.material_index = mat_idx
            created.append(f)
        except Exception:
            pass
    return created

# Helper to create cylinder
def add_cylinder(bm, center_x, center_z, y_min, y_max, radius, segs, mat_idx):
    bot_ring = []
    top_ring = []
    for i in range(segs):
        ang = 2 * math.pi * i / segs
        cx = center_x + radius * math.cos(ang)
        cz = center_z + radius * math.sin(ang)
        bot_ring.append(bm.verts.new((cx, y_min, cz)))
        top_ring.append(bm.verts.new((cx, y_max, cz)))
    
    v_bot = bm.verts.new((center_x, y_min, center_z))
    v_top = bm.verts.new((center_x, y_max, center_z))
    
    for i in range(segs):
        ni = (i + 1) % segs
        f_side = bm.faces.new([bot_ring[i], bot_ring[ni], top_ring[ni], top_ring[i]])
        f_side.material_index = mat_idx
        f_bot = bm.faces.new([v_bot, bot_ring[ni], bot_ring[i]])
        f_bot.material_index = mat_idx
        f_top = bm.faces.new([v_top, top_ring[i], top_ring[ni]])
        f_top.material_index = mat_idx

def create_gauntlet_bmesh(side='R'):
    bm = bmesh.new()

    # Materials for this gauntlet
    m_metal = 0
    m_trim = 1
    m_steel = 2
    m_grip = 3
    m_core = 4

    cx = 0.042
    # 1. Forearm bracer shell (Y: -0.12 to 0.02)
    add_prism(bm, cx - 0.055, cx + 0.055, -0.12, 0.02, -0.055, 0.065, m_metal, bevel_x=0.01, bevel_z=0.01)
    # Gold trim collars
    add_prism(bm, cx - 0.058, cx + 0.058, -0.125, -0.110, -0.058, 0.068, m_trim)
    add_prism(bm, cx - 0.058, cx + 0.058, 0.010, 0.025, -0.058, 0.068, m_trim)
    # Palm underlay
    add_prism(bm, cx - 0.045, cx + 0.045, -0.10, 0.04, -0.062, -0.050, m_grip)

    # 2. Dorsal kinetic reactor cell (Z: 0.065 to 0.098)
    add_prism(bm, cx - 0.035, cx + 0.035, -0.07, 0.02, 0.065, 0.088, m_metal, bevel_x=0.005)
    add_prism(bm, cx - 0.038, cx + 0.038, -0.06, 0.01, 0.085, 0.092, m_trim)
    add_prism(bm, cx - 0.022, cx + 0.022, -0.04, -0.01, 0.088, 0.098, m_core)
    add_prism(bm, cx - 0.028, cx - 0.010, 0.00, 0.018, 0.088, 0.095, m_metal)
    add_prism(bm, cx + 0.010, cx + 0.028, 0.00, 0.018, 0.088, 0.095, m_metal)
    add_prism(bm, cx - 0.025, cx - 0.013, 0.003, 0.015, 0.093, 0.096, m_core)
    add_prism(bm, cx + 0.013, cx + 0.025, 0.003, 0.015, 0.093, 0.096, m_core)

    # 3. Dual hydraulic pistons
    # Lateral piston
    add_cylinder(bm, cx + 0.042, 0.045, -0.10, 0.00, 0.016, 8, m_metal)
    add_cylinder(bm, cx + 0.042, 0.045, -0.105, -0.085, 0.019, 8, m_trim)
    add_cylinder(bm, cx + 0.042, 0.045, -0.015, 0.005, 0.019, 8, m_trim)
    add_cylinder(bm, cx + 0.042, 0.045, 0.00, 0.085, 0.011, 8, m_steel)
    add_cylinder(bm, cx + 0.042, 0.045, 0.002, 0.008, 0.013, 8, m_core)

    # Medial piston
    add_cylinder(bm, cx - 0.042, 0.045, -0.10, 0.00, 0.016, 8, m_metal)
    add_cylinder(bm, cx - 0.042, 0.045, -0.105, -0.085, 0.019, 8, m_trim)
    add_cylinder(bm, cx - 0.042, 0.045, -0.015, 0.005, 0.019, 8, m_trim)
    add_cylinder(bm, cx - 0.042, 0.045, 0.00, 0.085, 0.011, 8, m_steel)
    add_cylinder(bm, cx - 0.042, 0.045, 0.002, 0.008, 0.013, 8, m_core)

    # 4. Quad-knuckle impact block & striking face (Y: 0.04 to 0.136)
    add_prism(bm, cx - 0.062, cx + 0.062, 0.04, 0.09, -0.048, 0.060, m_metal, bevel_x=0.008, bevel_z=0.008)
    add_prism(bm, cx - 0.065, cx + 0.065, 0.05, 0.085, 0.055, 0.065, m_trim)

    # 4 knuckle impact teeth
    k_w = 0.024; k_g = 0.006
    k_starts = [cx - 0.058 + i * (k_w + k_g) for i in range(4)]
    for kx in k_starts:
        add_prism(bm, kx, kx + k_w, 0.085, 0.132, -0.038, 0.048, m_metal, bevel_x=0.003, bevel_z=0.003)
        add_prism(bm, kx + 0.002, kx + k_w - 0.002, 0.125, 0.135, -0.032, 0.042, m_trim)
        add_prism(bm, kx + 0.004, kx + k_w - 0.004, 0.100, 0.136, -0.010, 0.012, m_core)

    # 5. Lateral deflector fin
    add_prism(bm, cx + 0.055, cx + 0.075, -0.06, 0.06, -0.025, 0.040, m_metal, bevel_z=0.006)
    add_prism(bm, cx + 0.070, cx + 0.078, -0.04, 0.04, -0.015, 0.030, m_trim)
    add_cylinder(bm, cx + 0.065, 0.010, -0.02, 0.02, 0.012, 8, m_core)

    # Mirror for Left side
    if side == 'L':
        for v in bm.verts:
            v.co.x = -v.co.x
        for f in bm.faces:
            f.normal_flip()

    # Transform all vertices into Rest World Space using bone.matrix_local
    bone_name = f"Hand.{side}"
    bone = rig.data.bones.get(bone_name)
    mat_world = bone.matrix_local
    
    for v in bm.verts:
        v.co = mat_world @ v.co

    return bm

# Build Right & Left Gauntlet meshes as separate objects first to set up materials and weights cleanly
mesh_r = bpy.data.meshes.new("Valk_Gauntlet_R_Mesh")
gauntlet_r = bpy.data.objects.new("Valk_Gauntlet_R", mesh_r)
bpy.context.collection.objects.link(gauntlet_r)
bm_r = create_gauntlet_bmesh('R')
bm_r.to_mesh(mesh_r)
bm_r.free()

mesh_l = bpy.data.meshes.new("Valk_Gauntlet_L_Mesh")
gauntlet_l = bpy.data.objects.new("Valk_Gauntlet_L", mesh_l)
bpy.context.collection.objects.link(gauntlet_l)
bm_l = create_gauntlet_bmesh('L')
bm_l.to_mesh(mesh_l)
bm_l.free()

# Assign materials to gauntlet objects matching Cyber_Valkyrie's material slots
mats_in_order = [mat_metal, mat_trim, mat_steel, mat_grip, mat_core]
for obj in [gauntlet_r, gauntlet_l]:
    for m in mats_in_order:
        obj.data.materials.append(m)

# Assign 100% skinning weights to Hand.R and Hand.L
vg_r = gauntlet_r.vertex_groups.new(name="Hand.R")
vg_r.add([v.index for v in gauntlet_r.data.vertices], 1.0, 'REPLACE')

vg_l = gauntlet_l.vertex_groups.new(name="Hand.L")
vg_l.add([v.index for v in gauntlet_l.data.vertices], 1.0, 'REPLACE')

log(f">>> Modeled gauntlets in World Rest Pose: R verts={len(gauntlet_r.data.vertices)}, L verts={len(gauntlet_l.data.vertices)}")

# Now JOIN gauntlets directly into Cyber_Valkyrie unified skinned character mesh!
bpy.ops.object.select_all(action='DESELECT')
gauntlet_r.select_set(True)
gauntlet_l.select_set(True)
valk.select_set(True)
bpy.context.view_layer.objects.active = valk

bpy.ops.object.join()
log(f">>> Joined into Cyber_Valkyrie! Total vertices now: {len(valk.data.vertices)}")

# Ensure materials on valk match
for f in valk.data.polygons:
    f.use_smooth = True

# 2. SAVE MASTER BLEND FILE
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
log(">>> Master blend saved: " + BLEND_PATH)

# 3. EXPORT CLEAN UNIFIED GLB
bpy.ops.object.select_all(action='DESELECT')
valk.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = valk

import os
export_targets = [WEB_GLB_PATH, TEST_GLB_PATH, DIST_GLB_PATH, ANDROID_GLB_PATH]
for path in export_targets:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_materials='EXPORT',
        export_yup=True
    )
    log(f">>> Exported unified {path} ({os.path.getsize(path):,} bytes)")

# 4. RENDER VERIFICATION OF POSED COMBAT STANCE
log(">>> Posing rig in Combat Stance to verify 100% skin deformation...")
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')

rig.pose.bones['Chest'].rotation_euler = (0.05, 0.08, 0)
rig.pose.bones['Spine'].rotation_euler = (0.04, 0.06, 0)

# Right Gauntlet: raised lead punch forward
rig.pose.bones['UpperArm.R'].rotation_euler = (-0.55, -0.10, -0.12)
rig.pose.bones['Forearm.R'].rotation_euler = (0.85, 0, 0)
rig.pose.bones['Hand.R'].rotation_euler = (0.05, 0, 0)

# Left Gauntlet: protective guard
rig.pose.bones['UpperArm.L'].rotation_euler = (-0.48, 0.12, 0.15)
rig.pose.bones['Forearm.L'].rotation_euler = (0.82, 0, 0)
rig.pose.bones['Hand.L'].rotation_euler = (0.05, 0, 0)

# Legs
rig.pose.bones['Thigh.R'].rotation_euler = (-0.24, -0.04, 0.14)
rig.pose.bones['Shin.R'].rotation_euler = (0.34, 0, 0)
rig.pose.bones['Foot.R'].rotation_euler = (-0.10, 0, 0)

rig.pose.bones['Thigh.L'].rotation_euler = (0.20, 0.04, -0.14)
rig.pose.bones['Shin.L'].rotation_euler = (0.26, 0, 0)
rig.pose.bones['Foot.L'].rotation_euler = (-0.06, 0, 0)

bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT')

# Setup Lighting & Camera
for obj in list(bpy.context.scene.objects):
    if obj.type in ['LIGHT', 'CAMERA']:
        bpy.data.objects.remove(obj, do_unlink=True)

sun_data = bpy.data.lights.new("KeySun", type='SUN')
sun_data.energy = 4.0
sun_data.color = (1.0, 0.95, 0.90)
sun = bpy.data.objects.new("KeySun", sun_data)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = (math.radians(45), math.radians(25), math.radians(-30))

fill_data = bpy.data.lights.new("FillLight", type='POINT')
fill_data.energy = 280.0
fill_data.color = (0.9, 0.95, 1.0)
fill = bpy.data.objects.new("FillLight", fill_data)
bpy.context.collection.objects.link(fill)
fill.location = (0.2, -1.8, 1.3)

rim_data = bpy.data.lights.new("RimLight", type='POINT')
rim_data.energy = 350.0
rim_data.color = (1.0, 0.1, 0.2)
rim = bpy.data.objects.new("RimLight", rim_data)
bpy.context.collection.objects.link(rim)
rim.location = (-1.0, 1.5, 1.6)

cam_data = bpy.data.cameras.new("CombatCam")
cam = bpy.data.objects.new("CombatCam", cam_data)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

bpy.context.scene.render.resolution_x = 1080
bpy.context.scene.render.resolution_y = 720

# Render 1: Dynamic 3/4 perspective
cam.location = (1.35, -2.1, 1.25)
cam.rotation_euler = (math.radians(82), math.radians(0), math.radians(30))
out1 = r"d:\Keyboard stickman warrior\test_3d\preview_unified_fists_perspective.png"
bpy.context.scene.render.filepath = out1
bpy.ops.render.render(write_still=True)
log(f">>> Rendered: {out1}")

# Render 2: Front combat view
cam.location = (0.0, -2.5, 1.15)
cam.rotation_euler = (math.radians(85), 0, 0)
out2 = r"d:\Keyboard stickman warrior\test_3d\preview_unified_fists_front.png"
bpy.context.scene.render.filepath = out2
bpy.ops.render.render(write_still=True)
log(f">>> Rendered: {out2}")

# Render 3: Closeup of Fists
cam.location = (0.35, -1.15, 1.15)
cam.rotation_euler = (math.radians(82), math.radians(0), math.radians(18))
out3 = r"d:\Keyboard stickman warrior\test_3d\preview_unified_fists_closeup.png"
bpy.context.scene.render.filepath = out3
bpy.ops.render.render(write_still=True)
log(f">>> Rendered: {out3}")

log(">>> ALL COMPLETE!")
log_f.close()

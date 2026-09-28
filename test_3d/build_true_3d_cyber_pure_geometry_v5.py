"""
KeyFury 3D: Cyber Neon Rooftop - Master 100% Pure 3D Geometry Builder v5
Refined Architectural Glass Facades, Open City Canyon Vista, 100% Polygonal 3D Architecture
Blender 5.2.1 LTS
"""

import bpy
import bmesh
import math
from math import radians, sin, cos, pi
import os
import sys

out_dir = r"d:\Keyboard stickman warrior\test_3d"
os.makedirs(out_dir, exist_ok=True)

print(">>> [KeyFury 3D Pure Geometry v5] Initializing clean Blender environment...")

# 1. Clean Scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for col in [bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.lights, bpy.data.cameras, bpy.data.curves]:
    for block in list(col):
        if block.users == 0:
            col.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'High Contrast'

# 2. Cyberpunk World Sky Atmosphere (Pure Procedural - Zero Backdrop Planes)
world = scene.world
if not world:
    world = bpy.data.worlds.new("Cyber_Sky_World")
    scene.world = world
world.use_nodes = True
tree_w = world.node_tree
tree_w.nodes.clear()

out_w = tree_w.nodes.new(type='ShaderNodeOutputWorld')
bg_w = tree_w.nodes.new(type='ShaderNodeBackground')
# Deep obsidian midnight sky with electric deep indigo tone matching the master concept
bg_w.inputs['Color'].default_value = (0.010, 0.018, 0.036, 1.0)
bg_w.inputs['Strength'].default_value = 0.95
tree_w.links.new(bg_w.outputs['Background'], out_w.inputs['Surface'])

# 3. Materials & Procedural Shaders
def load_image_safe(filepath):
    if os.path.exists(filepath):
        return bpy.data.images.load(filepath)
    return None

img_arcade = load_image_safe(os.path.join(out_dir, "tex_billboard_arcade.png"))
img_kyoto = load_image_safe(os.path.join(out_dir, "tex_billboard_kyoto.png"))
img_ramen = load_image_safe(os.path.join(out_dir, "tex_billboard_ramen.png"))
img_server_l = load_image_safe(os.path.join(out_dir, "tex_server_left.png"))
img_server_r = load_image_safe(os.path.join(out_dir, "tex_server_right.png"))
img_platform = load_image_safe(os.path.join(out_dir, "tex_platform_deck.png"))

def create_image_emissive_material(name, img, emission_strength=2.2, roughness=0.22, metallic=0.4):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    tex = tree.nodes.new(type='ShaderNodeTexImage')
    if img: tex.image = img
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = emission_strength
    mix = tree.nodes.new(type='ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = 0.60
    
    tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
    tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    tree.links.new(emit.outputs['Emission'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

def create_pbr_material(name, base_color, metallic=0.0, roughness=0.5, specular=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def create_pure_emission(name, color, strength=14.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

def create_skyscraper_facade(name, lit_color=(0.15, 0.88, 1.0, 1.0), brick_w=1.8, row_h=2.8, emit_pwr=1.6):
    """
    True 3D procedural skyscraper facade with sleek dark reflective glass and crisp window ribbons.
    Mapped cleanly across vertical faces without organic noise distortion.
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.018, 0.026, 0.042, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.92
    bsdf.inputs['Roughness'].default_value = 0.18
    
    coord = tree.nodes.new(type='ShaderNodeTexCoord')
    sep = tree.nodes.new(type='ShaderNodeSeparateXYZ')
    tree.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    
    # Horizontal coordinate: combine X and Y so both front and side facades have horizontal window columns
    add_xy = tree.nodes.new(type='ShaderNodeMath')
    add_xy.operation = 'ADD'
    tree.links.new(sep.outputs['X'], add_xy.inputs[0])
    tree.links.new(sep.outputs['Y'], add_xy.inputs[1])
    
    comb = tree.nodes.new(type='ShaderNodeCombineXYZ')
    tree.links.new(add_xy.outputs['Value'], comb.inputs['X'])
    tree.links.new(sep.outputs['Z'], comb.inputs['Y'])
    
    brick = tree.nodes.new(type='ShaderNodeTexBrick')
    brick.inputs['Mortar Size'].default_value = 0.20
    brick.inputs['Brick Width'].default_value = brick_w
    brick.inputs['Row Height'].default_value = row_h
    brick.inputs['Color1'].default_value = (0.010, 0.014, 0.024, 1.0)  # dark reflective window
    brick.inputs['Color2'].default_value = lit_color                   # illuminated office window
    brick.inputs['Mortar'].default_value = (0.006, 0.008, 0.014, 1.0)  # concrete / steel mullion frame
    tree.links.new(comb.outputs['Vector'], brick.inputs['Vector'])
    
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = emit_pwr
    tree.links.new(brick.outputs['Color'], emit.inputs['Color'])
    
    add_sh = tree.nodes.new(type='ShaderNodeAddShader')
    tree.links.new(bsdf.outputs['BSDF'], add_sh.inputs[0])
    tree.links.new(emit.outputs['Emission'], add_sh.inputs[1])
    tree.links.new(add_sh.outputs['Shader'], out.inputs['Surface'])
    return mat

mat_wet_deck = create_pbr_material('Mat_Wet_Deck', (0.035, 0.05, 0.09, 1.0), metallic=0.85, roughness=0.15, specular=0.95)
mat_platform_tex = create_image_emissive_material('Mat_Platform_Texture', img_platform, emission_strength=1.3, roughness=0.15, metallic=0.75)

mat_tread_plate = create_pbr_material('Mat_Tread_Plate', (0.08, 0.10, 0.14, 1.0), metallic=0.88, roughness=0.32, specular=0.7)
mat_metal_dark = create_pbr_material('Mat_Metal_Dark', (0.04, 0.05, 0.07, 1.0), metallic=0.82, roughness=0.38)
mat_metal_gray = create_pbr_material('Mat_Metal_Gray', (0.15, 0.17, 0.22, 1.0), metallic=0.75, roughness=0.28)
mat_hazard = create_pbr_material('Mat_Hazard', (0.95, 0.72, 0.05, 1.0), metallic=0.2, roughness=0.35)

mat_neon_cyan = create_pure_emission('Mat_Neon_Cyan', (0.0, 0.94, 1.0, 1.0), strength=18.0)
mat_neon_magenta = create_pure_emission('Mat_Neon_Magenta', (1.0, 0.05, 0.65, 1.0), strength=15.0)
mat_neon_amber = create_pure_emission('Mat_Neon_Amber', (1.0, 0.62, 0.08, 1.0), strength=14.0)
mat_neon_green = create_pure_emission('Mat_Neon_Green', (0.1, 1.0, 0.35, 1.0), strength=14.0)
mat_neon_red = create_pure_emission('Mat_Neon_Red', (1.0, 0.1, 0.1, 1.0), strength=14.0)
mat_neon_blue = create_pure_emission('Mat_Neon_Blue', (0.1, 0.45, 1.0, 1.0), strength=14.0)

mat_cable_blue = create_pbr_material('Mat_Cable_Blue', (0.0, 0.45, 0.95, 1.0), metallic=0.1, roughness=0.35)
mat_cable_red = create_pbr_material('Mat_Cable_Red', (0.9, 0.1, 0.15, 1.0), metallic=0.1, roughness=0.35)
mat_cable_black = create_pbr_material('Mat_Cable_Black', (0.02, 0.02, 0.03, 1.0), metallic=0.1, roughness=0.5)

# Architectural facade window styles with calibrated emission for high visual contrast
mat_facade_cyan = create_skyscraper_facade('Mat_Facade_Cyan', (0.08, 0.88, 1.0, 1.0), brick_w=1.8, row_h=2.8, emit_pwr=1.8)
mat_facade_amber = create_skyscraper_facade('Mat_Facade_Amber', (1.0, 0.72, 0.22, 1.0), brick_w=1.9, row_h=3.0, emit_pwr=1.6)
mat_facade_magenta = create_skyscraper_facade('Mat_Facade_Magenta', (0.92, 0.16, 0.68, 1.0), brick_w=1.7, row_h=2.6, emit_pwr=1.7)
mat_facade_deepblue = create_skyscraper_facade('Mat_Facade_DeepBlue', (0.16, 0.48, 1.0, 1.0), brick_w=2.0, row_h=3.2, emit_pwr=1.4)

mat_sign_arcade = create_image_emissive_material('Mat_Sign_Arcade', img_arcade, emission_strength=2.6)
mat_sign_kyoto = create_image_emissive_material('Mat_Sign_Kyoto', img_kyoto, emission_strength=2.5)
mat_sign_ramen = create_image_emissive_material('Mat_Sign_Ramen', img_ramen, emission_strength=2.6)
mat_server_left_mat = create_image_emissive_material('Mat_Server_Left_Tex', img_server_l, emission_strength=1.5)
mat_server_right_mat = create_image_emissive_material('Mat_Server_Right_Tex', img_server_r, emission_strength=1.5)

# Mesh helper functions
def add_cube(name, loc, scale, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

def add_cylinder(name, loc, radius, depth, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

def add_plane(name, loc, scale, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat: obj.data.materials.append(mat)
    return obj

# 4. ROOFTOP SKYSCRAPER CHASM & COMBAT ARENA PLATFORM
print('>>> Constructing 3D Skyscraper Chasm Base & Battle Arena...')
add_cube('Rooftop_Skyscraper_Tower', (0.0, 2.0, -30.0), (32.0, 18.0, 60.0), mat_metal_dark)

for px in [-12.0, -4.0, 4.0, 12.0]:
    add_cube(f'Skyscraper_Panel_{px}', (px, -7.05, -30.0), (7.0, 0.1, 58.0), mat_metal_gray)
    add_cube(f'Skyscraper_NeonStrip_{px}', (px, -7.12, -30.0), (0.15, 0.05, 58.0), mat_neon_cyan)

# Main Raised Combat Arena Platform (18m x 7.2m)
add_cube('Platform_Base_Slab', (0.0, 0.0, -0.2), (18.6, 7.8, 0.4), mat_metal_dark)
add_cube('Platform_Upper_Deck', (0.0, 0.0, 0.1), (18.0, 7.2, 0.2), mat_wet_deck)

# Outer Cyan Neon Trim
add_cube('Neon_Border_Outer_F', (0.0, -3.65, 0.21), (18.2, 0.10, 0.05), mat_neon_cyan)
add_cube('Neon_Border_Outer_B', (0.0, 3.65, 0.21), (18.2, 0.10, 0.05), mat_neon_cyan)
add_cube('Neon_Border_Outer_L', (-9.05, 0.0, 0.21), (0.10, 7.4, 0.05), mat_neon_cyan)
add_cube('Neon_Border_Outer_R', (9.05, 0.0, 0.21), (0.10, 7.4, 0.05), mat_neon_cyan)

# Inner Magenta Inset Circuit
add_cube('Neon_Circuit_Inner_F', (0.0, -3.0, 0.22), (16.8, 0.06, 0.03), mat_neon_magenta)
add_cube('Neon_Circuit_Inner_B', (0.0, 3.0, 0.22), (16.8, 0.06, 0.03), mat_neon_magenta)
add_cube('Neon_Circuit_Inner_L', (-8.35, 0.0, 0.22), (0.06, 6.0, 0.03), mat_neon_magenta)
add_cube('Neon_Circuit_Inner_R', (8.35, 0.0, 0.22), (0.06, 6.0, 0.03), mat_neon_magenta)

# Top Deck Texture Overlay Plane (High-Tech Floor Circuitry)
add_plane('Platform_Deck_Texture_Plane', (0.0, 0.0, 0.205), (17.8, 7.0, 1.0), mat=mat_platform_tex)

# Treadplate Panels with X-Bracing on Player Spawns (Refined, sleek footing)
add_cube('Tread_Left', (-5.5, 0.0, 0.21), (3.6, 4.2, 0.015), mat_tread_plate)
add_cube('Tread_Right', (5.5, 0.0, 0.21), (3.6, 4.2, 0.015), mat_tread_plate)

for x_off in [-5.5, 5.5]:
    add_cube(f'Brace_A_{x_off}', (x_off, 0.0, 0.22), (3.4, 0.07, 0.01), mat_metal_dark).rotation_euler = (0, 0, radians(38))
    add_cube(f'Brace_B_{x_off}', (x_off, 0.0, 0.22), (3.4, 0.07, 0.01), mat_metal_dark).rotation_euler = (0, 0, radians(-38))

# Center Typing Zone Neon Frame (Thin, crisp neon border framing floor graphics)
add_cube('Typing_Zone_Border_F', (0.0, -2.6, 0.225), (5.2, 0.06, 0.02), mat_neon_cyan)
add_cube('Typing_Zone_Border_B', (0.0, 2.6, 0.225), (5.2, 0.06, 0.02), mat_neon_cyan)
add_cube('Typing_Zone_Border_L', (-2.6, 0.0, 0.225), (0.06, 5.2, 0.02), mat_neon_cyan)
add_cube('Typing_Zone_Border_R', (2.6, 0.0, 0.225), (0.06, 5.2, 0.02), mat_neon_cyan)

# Perimeter Safety Guardrails
def create_railing_segment(p_start, p_end, name_prefix):
    dx, dy = p_end[0] - p_start[0], p_end[1] - p_start[1]
    length = math.hypot(dx, dy)
    angle = math.atan2(dy, dx)
    num_posts = max(2, int(length / 2.2) + 1)
    for i in range(num_posts):
        t = i / (num_posts - 1)
        px = p_start[0] + dx * t
        py = p_start[1] + dy * t
        add_cube(f'{name_prefix}_Post_{i}', (px, py, 0.65), (0.16, 0.16, 1.3), mat_metal_dark)
        add_cube(f'{name_prefix}_Cap_{i}', (px, py, 1.32), (0.20, 0.20, 0.06), mat_metal_gray)
    cx = (p_start[0] + p_end[0]) / 2.0
    cy = (p_start[1] + p_end[1]) / 2.0
    r_top = add_cube(f'{name_prefix}_Rail_Top', (cx, cy, 1.20), (length, 0.12, 0.12), mat_metal_gray)
    r_top.rotation_euler = (0, 0, angle)
    r_neon = add_cube(f'{name_prefix}_Neon_Top', (cx, cy, 1.27), (length * 0.98, 0.05, 0.03), mat_neon_cyan)
    r_neon.rotation_euler = (0, 0, angle)
    r_mid = add_cube(f'{name_prefix}_Rail_Mid', (cx, cy, 0.60), (length, 0.10, 0.08), mat_metal_gray)
    r_mid.rotation_euler = (0, 0, angle)

create_railing_segment((-11.0, 4.3), (11.0, 4.3), 'Back_Rail')
create_railing_segment((-11.0, -4.0), (-11.0, 4.3), 'Left_Rail')
create_railing_segment((11.0, -4.0), (11.0, 4.3), 'Right_Rail')

# 5. ROOFTOP MACHINERY (Pushed back to rear corners, scaled down ~50% for clean arena focus)
print('>>> Modeling Compact 3D Machinery in Rear Corners (Low-profile, unobtrusive)...')
# Left Rear Corner: Compact Server, Mini Aux Box & Low-profile Satellite Dish (X = -9.6, Y = 3.2)
add_cube('Left_Server_Main', (-9.6, 3.2, 0.9), (1.2, 0.9, 1.2), mat_server_left_mat)
srv_panel = add_cube('Left_Server_Panel', (-9.6, 2.7, 1.05), (1.0, 0.1, 0.5), mat_metal_gray)
srv_panel.rotation_euler = (radians(-20), 0, 0)
srv_screen = add_cube('Left_Server_Screen', (-9.6, 2.64, 1.08), (0.8, 0.04, 0.35), mat_neon_cyan)
srv_screen.rotation_euler = (radians(-20), 0, 0)

for i, col in enumerate([mat_neon_green, mat_neon_amber, mat_neon_red]):
    add_cube(f'Left_LED_{i}', (-9.85 + i * 0.25, 2.64, 1.28), (0.05, 0.03, 0.05), col)

add_cube('Left_Power_Aux', (-9.6, 2.1, 0.55), (0.7, 0.5, 0.5), mat_metal_gray)
add_cube('Left_Hazard_Strip', (-9.6, 1.84, 0.55), (0.6, 0.02, 0.10), mat_hazard)

add_cylinder('Dish_Pedestal', (-9.6, 3.35, 1.65), radius=0.08, depth=0.3, mat=mat_metal_gray)
add_cylinder('Dish_Gimbal', (-9.6, 3.35, 1.85), radius=0.05, depth=0.2, rot=(0, radians(35), 0), mat=mat_metal_dark)
bpy.ops.mesh.primitive_circle_add(vertices=24, radius=0.42, fill_type='NGON', location=(-9.5, 3.35, 1.95), rotation=(0, radians(-50), 0))
dish_obj = bpy.context.active_object
dish_obj.name = 'Satellite_Dish'
dish_obj.data.materials.append(mat_metal_gray)
add_cylinder('Dish_FeedHorn', (-9.35, 3.35, 2.1), radius=0.025, depth=0.35, rot=(0, radians(-50), 0), mat=mat_metal_dark)
add_cube('Dish_Beacon_Tip', (-9.2, 3.35, 2.2), (0.05, 0.05, 0.05), mat_neon_red)

def create_cable_curve(name, points, radius, mat):
    curve_data = bpy.data.curves.new(name=name, type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 4
    polyline = curve_data.splines.new('BEZIER')
    polyline.bezier_points.add(len(points) - 1)
    for i, pt in enumerate(points):
        bp = polyline.bezier_points[i]
        bp.co = pt
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

# Snug perimeter cable run tucked safely along the rear edge
create_cable_curve('Cable_Blue_1', [(-9.6, 2.5, 0.4), (-9.6, 3.0, 0.32), (-9.8, 3.5, 0.32)], radius=0.035, mat=mat_cable_blue)
create_cable_curve('Cable_Red_1', [(-9.5, 2.5, 0.35), (-9.5, 2.9, 0.32), (-9.7, 3.4, 0.32)], radius=0.03, mat=mat_cable_red)
create_cable_curve('Cable_Black_1', [(-9.7, 2.5, 0.35), (-9.7, 3.1, 0.32), (-9.9, 3.6, 0.32)], radius=0.04, mat=mat_cable_black)

# Right Rear Corner: Compact Server & Low-profile Telecom Mast (X = 9.6, Y = 3.2)
add_cube('Right_Server_Main', (9.6, 3.2, 0.95), (1.1, 0.9, 1.3), mat_server_right_mat)
add_cube('Right_Server_Panel', (9.6, 2.7, 1.05), (0.9, 0.1, 0.6), mat_metal_gray)
add_cube('Right_Server_LightStrip', (9.6, 2.63, 1.15), (0.7, 0.03, 0.04), mat_neon_cyan)

add_cylinder('Telecom_Mast_Base', (9.7, 3.5, 2.1), radius=0.07, depth=1.8, mat=mat_metal_gray)
add_cylinder('Telecom_Mast_Spire', (9.7, 3.5, 3.4), radius=0.03, depth=0.8, mat=mat_metal_dark)
add_cube('Telecom_Crossbar', (9.7, 3.5, 2.7), (0.8, 0.06, 0.06), mat_metal_dark)
add_cylinder('Telecom_Sensor_L', (9.35, 3.5, 2.8), radius=0.09, depth=0.18, rot=(radians(90), 0, 0), mat=mat_metal_gray)
add_cylinder('Telecom_Sensor_R', (10.05, 3.5, 2.8), radius=0.09, depth=0.18, rot=(radians(90), 0, 0), mat=mat_metal_gray)
add_cube('Telecom_Beacon_Light', (9.7, 3.5, 3.85), (0.08, 0.08, 0.08), mat_neon_red)

def create_hvac_unit(name, center_x, center_y):
    add_cube(f'{name}_Housing', (center_x, center_y, 1.0), (3.8, 1.6, 2.0), mat_metal_gray)
    add_cube(f'{name}_Grille_Side', (center_x, center_y + 0.82, 1.0), (3.4, 0.06, 1.6), mat_metal_dark)
    for f in range(3):
        fx = center_x - 1.2 + f * 1.2
        add_cylinder(f'{name}_FanRim_{f}', (fx, center_y, 2.02), radius=0.48, depth=0.08, mat=mat_metal_dark)
        add_cylinder(f'{name}_FanHub_{f}', (fx, center_y, 1.95), radius=0.15, depth=0.12, mat=mat_metal_gray)
        add_cylinder(f'{name}_FanMesh_{f}', (fx, center_y, 2.04), radius=0.44, depth=0.02, mat=mat_neon_cyan)
    add_cylinder(f'{name}_Duct_Vertical', (center_x + 1.6, center_y - 0.9, 0.6), radius=0.25, depth=1.2, mat=mat_metal_dark)
    add_cylinder(f'{name}_Duct_Elbow', (center_x + 1.6, center_y - 0.4, 1.1), radius=0.25, depth=0.9, rot=(radians(90), 0, 0), mat=mat_metal_dark)

create_hvac_unit('HVAC_Left', -5.5, 6.2)
create_hvac_unit('HVAC_Right', 5.5, 6.2)

# 6. SURROUNDING 100% 3D MEGACITY SKYLINE (ZERO BACKDROP PLANES)
print('>>> Constructing Calibrated 100% 3D Megacity Skyline with Open Canyon Vista...')

def create_skyscraper(name, x, y, width, depth, height, z_base=-30.0, mat_facade=mat_facade_cyan, neon_trim=None, spire_height=8.0, beacon_color=mat_neon_red):
    z_center = z_base + height / 2.0
    tower = add_cube(name, (x, y, z_center), (width, depth, height), mat_facade)
    if height > 22.0:
        crown_h = height * 0.08
        crown_w = width * 0.75
        crown_d = depth * 0.75
        crown_z = z_base + height + crown_h / 2.0
        add_cube(f'{name}_Crown', (x, y, crown_z), (crown_w, crown_d, crown_h), mat_metal_dark)
        if spire_height > 0:
            spire_z = z_base + height + crown_h + spire_height / 2.0
            add_cylinder(f'{name}_Spire', (x, y, spire_z), radius=0.16, depth=spire_height, mat=mat_metal_gray)
            add_cube(f'{name}_Beacon', (x, y, z_base + height + crown_h + spire_height), (0.35, 0.35, 0.35), beacon_color)
    if neon_trim:
        for cx in [-1, 1]:
            for cy in [-1, 1]:
                nx = x + cx * (width / 2.0 + 0.06)
                ny = y + cy * (depth / 2.0 + 0.06)
                add_cube(f'{name}_NeonEdge_{cx}_{cy}', (nx, ny, z_center), (0.10, 0.10, height), neon_trim)
    return tower

# 6A. FLANKING BESIDE SKYSCRAPERS (Left & Right - 360-Degree Dense City Surroundings)
print('>>> Constructing Flanking Beside Skyscrapers (Left & Right Flanks) for 360-degree immersion...')

# --- LEFT FLANK BESIDE SKYSCRAPERS (Directly alongside the left edge of the arena) ---
# Tower Beside Left 1 (Main Flank Megatower - Cyan Theme)
create_skyscraper('Tower_Beside_Left_1', -24.0, 1.5, 9.5, 14.0, 54.0, z_base=-30.0, mat_facade=mat_facade_cyan, neon_trim=mat_neon_cyan, spire_height=10.0, beacon_color=mat_neon_red)
# Holographic vertical sign frame on inner wall facing arena
add_cube('Sign_Beside_Left_Frame', (-19.1, 1.5, 7.5), (0.2, 5.0, 8.0), mat_metal_dark)
add_plane('Sign_Beside_Left_Plane', (-19.0, 1.5, 7.5), (4.8, 7.8, 1.0), rot=(radians(90), 0, radians(90)), mat=mat_sign_kyoto)

# Tower Beside Left Forward (Forward-Left Corner Tower - Magenta Theme)
create_skyscraper('Tower_Beside_Left_Forward', -25.0, -12.0, 9.0, 10.0, 44.0, z_base=-30.0, mat_facade=mat_facade_magenta, neon_trim=mat_neon_magenta, spire_height=8.0)

# Skybridge Left (Connecting beside-left towers across side alleyway)
add_cube('Skybridge_Left_Structure', (-24.5, -6.0, 6.0), (3.2, 5.0, 2.0), mat_metal_dark)
add_cube('Skybridge_Left_Windows', (-23.3, -6.0, 6.0), (0.1, 4.4, 1.0), mat_neon_cyan)

# --- RIGHT FLANK BESIDE SKYSCRAPERS (Directly alongside the right edge of the arena) ---
# Tower Beside Right 1 (Main Flank Megatower - Amber/Gold Theme)
create_skyscraper('Tower_Beside_Right_1', 24.0, 0.5, 9.5, 14.0, 56.0, z_base=-30.0, mat_facade=mat_facade_amber, neon_trim=mat_neon_amber, spire_height=11.0, beacon_color=mat_neon_red)
# Holographic vertical sign frame on inner wall facing arena
add_cube('Sign_Beside_Right_Frame', (19.1, 0.5, 8.0), (0.2, 5.0, 8.0), mat_metal_dark)
add_plane('Sign_Beside_Right_Plane', (19.0, 0.5, 8.0), (4.8, 7.8, 1.0), rot=(radians(90), 0, radians(-90)), mat=mat_sign_arcade)

# Tower Beside Right Forward (Forward-Right Corner Tower - Deep Blue Theme)
create_skyscraper('Tower_Beside_Right_Forward', 25.0, -13.0, 9.0, 10.0, 46.0, z_base=-30.0, mat_facade=mat_facade_deepblue, neon_trim=mat_neon_cyan, spire_height=8.0)

# Skybridge Right (Connecting beside-right towers across side alleyway)
add_cube('Skybridge_Right_Structure', (24.5, -6.5, 7.0), (3.2, 5.0, 2.0), mat_metal_dark)
add_cube('Skybridge_Right_Windows', (23.3, -6.5, 7.0), (0.1, 4.4, 1.0), mat_neon_amber)

# --- FRONT CHASM SKYSCRAPERS (Across the front street drop-off) ---
print('>>> Constructing Front Chasm Skyscrapers (Across Front Street)...')
# Front Left Chasm Tower (Roof sits just below arena floor level)
create_skyscraper('Tower_Front_Left', -10.5, -21.0, 8.5, 8.0, 28.0, z_base=-30.0, mat_facade=mat_facade_deepblue, spire_height=5.0)
add_cube('Front_Left_HVAC', (-10.5, -21.0, -1.0), (3.0, 2.0, 1.2), mat_metal_gray)

# Front Right Chasm Tower (Roof sits just below arena floor level with helipad)
create_skyscraper('Tower_Front_Right', 10.5, -21.0, 8.5, 8.0, 27.0, z_base=-30.0, mat_facade=mat_facade_cyan, spire_height=5.0)
add_cube('Front_Right_Helipad_Ring', (10.5, -21.0, -2.85), (4.5, 4.5, 0.05), mat_neon_cyan)

# Deep Front Center Tower
create_skyscraper('Tower_Front_Center_Deep', 0.0, -27.0, 7.5, 7.0, 23.0, z_base=-30.0, mat_facade=mat_facade_amber, spire_height=4.0)

# 6B. REAR FLANK LANDMARK SKYSCRAPERS (Towers with 3D Holographic Billboards)
# Left Rear Landmark: Neo-Kyoto Tower
create_skyscraper('Tower_NeoKyoto', -16.5, 17.5, 10.5, 9.5, 52.0, z_base=-30.0, mat_facade=mat_facade_cyan, neon_trim=mat_neon_cyan)
add_cube('NeoKyoto_Sign_Frame', (-13.0, 13.8, 7.5), (6.2, 0.3, 5.8), mat_metal_dark)
add_plane('NeoKyoto_Sign_Plane', (-13.0, 13.6, 7.5), (6.0, 5.6, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_kyoto)

# Right Rear Landmark 1: Cyber Arcade Tower
create_skyscraper('Tower_CyberArcade', 16.5, 18.5, 10.5, 9.5, 50.0, z_base=-30.0, mat_facade=mat_facade_magenta, neon_trim=mat_neon_magenta)
add_cube('Arcade_Sign_Frame', (13.6, 15.0, 7.2), (6.2, 0.4, 5.6), mat_metal_dark)
add_plane('Arcade_Sign_Plane', (13.6, 14.7, 7.2), (6.0, 5.4, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_arcade)

# Right Rear Landmark 2: Ramen 2049 Tower
create_skyscraper('Tower_Ramen', 10.0, 24.5, 7.5, 7.0, 36.0, z_base=-30.0, mat_facade=mat_facade_amber, neon_trim=mat_neon_amber)
add_cube('Ramen_Sign_Frame', (10.0, 20.8, 4.6), (4.5, 0.3, 3.4), mat_metal_dark)
add_plane('Ramen_Sign_Plane', (10.0, 20.6, 4.6), (4.3, 3.2, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_ramen)

# 3D Skybridge #1 between Arcade Tower and Ramen Tower
sb_len = 7.0
add_cube('Skybridge_Structure_1', (13.0, 21.5, 4.8), (sb_len, 2.0, 1.8), mat_metal_dark)
add_cube('Skybridge_Windows_1', (13.0, 20.4, 4.8), (sb_len * 0.9, 0.08, 0.8), mat_neon_cyan)
add_cube('Skybridge_Truss_1', (13.0, 21.5, 3.6), (sb_len * 0.8, 1.0, 0.4), mat_metal_gray)

# 6C. TIER 2: Midground Framing Towers (Flanking the Canyon, Center remains Open)
create_skyscraper('Tower_Left_Mid_1', -11.5, 30.0, 7.0, 6.5, 46.0, z_base=-30.0, mat_facade=mat_facade_magenta, neon_trim=mat_neon_magenta, spire_height=8.0)
create_skyscraper('Tower_Left_Mid_2', -8.0, 38.0, 5.5, 5.5, 40.0, z_base=-30.0, mat_facade=mat_facade_cyan, neon_trim=mat_neon_cyan, spire_height=7.0)

create_skyscraper('Tower_Right_Mid_1', 8.2, 35.0, 5.2, 5.2, 38.0, z_base=-30.0, mat_facade=mat_facade_amber, neon_trim=mat_neon_amber, spire_height=6.0)
create_skyscraper('Tower_Right_Mid_2', 13.0, 33.0, 6.8, 6.2, 48.0, z_base=-30.0, mat_facade=mat_facade_deepblue, neon_trim=mat_neon_cyan, spire_height=9.0)

# Skybridge #2 connecting Left Mid towers at Z = 8.5m
add_cube('Skybridge_Structure_2', (-9.8, 34.0, 8.5), (4.5, 1.6, 1.4), mat_metal_dark)
add_cube('Skybridge_Windows_2', (-9.8, 33.1, 8.5), (4.0, 0.08, 0.6), mat_neon_magenta)

# 6D. TIER 3: Deep Canyon Framed Towers (Y = 44m to 60m)
create_skyscraper('Tower_Deep_Left_1', -16.5, 50.0, 8.5, 8.0, 64.0, z_base=-30.0, mat_facade=mat_facade_cyan, spire_height=12.0)
create_skyscraper('Tower_Deep_Left_2', -9.5, 48.0, 6.5, 6.2, 48.0, z_base=-30.0, mat_facade=mat_facade_amber, spire_height=10.0)

# Canyon Center Distant Needle Spire (Deep at Y = 62m, low height so open sky remains above for flying hovercars)
create_skyscraper('Tower_Canyon_Spire', 0.0, 62.0, 4.5, 4.5, 38.0, z_base=-30.0, mat_facade=mat_facade_cyan, neon_trim=mat_neon_cyan, spire_height=14.0, beacon_color=mat_neon_red)

create_skyscraper('Tower_Deep_Right_1', 9.0, 50.0, 6.5, 6.0, 50.0, z_base=-30.0, mat_facade=mat_facade_magenta, spire_height=10.0)
create_skyscraper('Tower_Deep_Right_2', 16.5, 48.0, 8.5, 8.0, 60.0, z_base=-30.0, mat_facade=mat_facade_deepblue, spire_height=11.0)

# 6E. TIER 4: Far Horizon Megacity Skyline (Y = 68m to 92m)
create_skyscraper('Tower_Horizon_L3', -28.0, 82.0, 14.0, 12.0, 82.0, z_base=-30.0, mat_facade=mat_facade_magenta, spire_height=14.0)
create_skyscraper('Tower_Horizon_L2', -18.5, 74.0, 11.5, 10.0, 72.0, z_base=-30.0, mat_facade=mat_facade_cyan, spire_height=12.0)
create_skyscraper('Tower_Horizon_L1', -10.5, 68.0, 8.5, 8.0, 62.0, z_base=-30.0, mat_facade=mat_facade_amber, spire_height=10.0)

create_skyscraper('Tower_Horizon_Center', 0.5, 80.0, 9.0, 8.5, 65.0, z_base=-30.0, mat_facade=mat_facade_deepblue, neon_trim=mat_neon_cyan, spire_height=16.0, beacon_color=mat_neon_red)

create_skyscraper('Tower_Horizon_R1', 10.5, 70.0, 8.5, 8.0, 64.0, z_base=-30.0, mat_facade=mat_facade_magenta, spire_height=10.0)
create_skyscraper('Tower_Horizon_R2', 19.5, 74.0, 12.0, 10.5, 74.0, z_base=-30.0, mat_facade=mat_facade_deepblue, spire_height=12.0)
create_skyscraper('Tower_Horizon_R3', 28.5, 80.0, 13.5, 12.0, 78.0, z_base=-30.0, mat_facade=mat_facade_cyan, spire_height=14.0)

# 6F. 3D Flying Hovercars with Dynamic High-Speed Trails in 5 Air Corridors
def create_hovercar(name, pos, rot_z, trail_color, trail_len=14.0):
    car = add_cube(f'{name}_Body', pos, (2.2, 1.0, 0.55), mat_metal_dark)
    car.rotation_euler = (0, 0, rot_z)
    add_cube(f'{name}_Canopy', (pos[0], pos[1], pos[2] + 0.25), (1.1, 0.7, 0.25), mat_neon_cyan).rotation_euler = (0, 0, rot_z)
    tx = pos[0] - math.cos(rot_z) * 1.1
    ty = pos[1] - math.sin(rot_z) * 1.1
    add_cube(f'{name}_Engine', (tx, ty, pos[2]), (0.2, 0.8, 0.25), trail_color).rotation_euler = (0, 0, rot_z)
    trail_cx = pos[0] - math.cos(rot_z) * (1.1 + trail_len / 2.0)
    trail_cy = pos[1] - math.sin(rot_z) * (1.1 + trail_len / 2.0)
    trail = add_cube(f'{name}_LightTrail', (trail_cx, trail_cy, pos[2]), (trail_len, 0.22, 0.12), trail_color)
    trail.rotation_euler = (0, 0, rot_z)

# Air Corridor 1: Lower canyon transit across open rear sky (Orange trail)
create_hovercar('Hovercar_1', (-0.5, 18.0, 7.5), rot_z=radians(-8), trail_color=mat_neon_amber, trail_len=20.0)
# Air Corridor 2: Upper flight path (Cyan trail)
create_hovercar('Hovercar_2', (4.5, 24.0, 11.2), rot_z=radians(172), trail_color=mat_neon_cyan, trail_len=22.0)
# Air Corridor 3: Deep canyon expressway (Magenta trail)
create_hovercar('Hovercar_3', (-2.0, 44.0, 15.5), rot_z=radians(12), trail_color=mat_neon_magenta, trail_len=25.0)
# Air Corridor 4: Front chasm lower flyby across the street (Cyan trail)
create_hovercar('Hovercar_Front', (1.0, -14.0, -1.5), rot_z=radians(-175), trail_color=mat_neon_cyan, trail_len=18.0)
# Air Corridor 5: Left side alleyway ascending transit (Magenta trail)
create_hovercar('Hovercar_Left_Alley', (-17.5, -2.0, 5.0), rot_z=radians(85), trail_color=mat_neon_magenta, trail_len=16.0)

# (ZERO Distant_Skyline_Plane! 100% Pure 3D geometry from foreground to horizon!)

# 7. CYBER LIGHTING RIG
print('>>> Configuring 3D Cyberpunk Lighting Rig...')
l_cyan = bpy.data.lights.new(name='Light_Cyan_Key', type='AREA')
l_cyan.energy = 2600
l_cyan.color = (0.0, 0.94, 1.0)
if hasattr(l_cyan, 'size'): l_cyan.size = 22.0
obj_l_cyan = bpy.data.objects.new('Light_Cyan_Key', l_cyan)
obj_l_cyan.location = (-7.0, -8.0, 12.0)
obj_l_cyan.rotation_euler = (radians(48), radians(-18), radians(15))
bpy.context.collection.objects.link(obj_l_cyan)

l_mag = bpy.data.lights.new(name='Light_Magenta_Rim', type='AREA')
l_mag.energy = 3000
l_mag.color = (1.0, 0.05, 0.65)
if hasattr(l_mag, 'size'): l_mag.size = 22.0
obj_l_mag = bpy.data.objects.new('Light_Magenta_Rim', l_mag)
obj_l_mag.location = (8.0, 6.0, 9.0)
obj_l_mag.rotation_euler = (radians(55), radians(20), radians(-25))
bpy.context.collection.objects.link(obj_l_mag)

l_chasm = bpy.data.lights.new(name='Light_Chasm_Underglow', type='AREA')
l_chasm.energy = 4800
l_chasm.color = (0.05, 0.40, 0.9)
if hasattr(l_chasm, 'size'): l_chasm.size = 45.0
obj_l_chasm = bpy.data.objects.new('Light_Chasm_Underglow', l_chasm)
obj_l_chasm.location = (0.0, 20.0, -22.0)
obj_l_chasm.rotation_euler = (radians(-75), 0, 0)
bpy.context.collection.objects.link(obj_l_chasm)

l_fill = bpy.data.lights.new(name='Light_Combat_Fill', type='AREA')
l_fill.energy = 700
l_fill.color = (0.8, 0.92, 1.0)
if hasattr(l_fill, 'size'): l_fill.size = 18.0
obj_l_fill = bpy.data.objects.new('Light_Combat_Fill', l_fill)
obj_l_fill.location = (0.0, -14.0, 3.5)
obj_l_fill.rotation_euler = (radians(78), 0, 0)
bpy.context.collection.objects.link(obj_l_fill)

l_sky = bpy.data.lights.new(name='Light_Horizon_Fill', type='SUN')
l_sky.energy = 0.6
l_sky.color = (0.08, 0.20, 0.45)
obj_l_sky = bpy.data.objects.new('Light_Horizon_Fill', l_sky)
obj_l_sky.rotation_euler = (radians(70), radians(15), 0)
bpy.context.collection.objects.link(obj_l_sky)

# 8. MULTI-ANGLE CAMERAS
print('>>> Setting up 5 Multi-Angle Verification Cameras...')
cameras_dict = {}
def add_camera(cam_id, name, loc, rot_euler, lens=40.0):
    cam_data = bpy.data.cameras.new(cam_id)
    cam_data.lens = lens
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500.0
    cam_obj = bpy.data.objects.new(name, cam_data)
    cam_obj.location = loc
    cam_obj.rotation_euler = rot_euler
    bpy.context.collection.objects.link(cam_obj)
    cameras_dict[cam_id] = cam_obj
    return cam_obj

cam_dist = 20.0
cam_lens = 40.0
sensor_w = 36.0
total_w = cam_dist * (sensor_w / cam_lens)
total_h = total_w * (9.0 / 16.0)
cam_z = (0.5 - 0.27) * total_h
add_camera('cam_front', 'Camera_01_Front_Combat', (0.0, -cam_dist, cam_z), (radians(90.0), 0, 0), lens=40.0)
add_camera('cam_left_profile', 'Camera_02_Left_Profile', (-15.5, 0.5, 2.3), (radians(85.0), 0, radians(-90.0)), lens=35.0)
add_camera('cam_isometric_aerial', 'Camera_03_Isometric_Aerial', (-22.0, -18.0, 24.0), (radians(50.0), 0, radians(-45.0)), lens=26.0)
add_camera('cam_right_perspective', 'Camera_04_Right_Perspective', (15.5, -9.5, 4.5), (radians(76.0), 0, radians(56.0)), lens=32.0)
add_camera('cam_low_angle_hero', 'Camera_05_Low_Angle_Hero', (0.0, -9.5, 1.3), (radians(84.0), 0, 0), lens=28.0)

# 9. SAVE, EXPORT, RENDER
print('>>> Saving .blend, exporting .glb, and rendering all views...')
blend_path = os.path.join(out_dir, 'KeyFury_3D_CyberRooftop_True3D.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f'>>> [Saved Blend File]: {blend_path}')

glb_path = os.path.join(out_dir, 'KeyFury_3D_CyberRooftop_True3D.glb')
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
print(f'>>> [Exported GLB File]: {glb_path}')

render_outputs = {
    'cam_front': os.path.join(out_dir, 'cyber_rooftop_render_front.png'),
    'cam_left_profile': os.path.join(out_dir, 'cyber_rooftop_render_left_profile.png'),
    'cam_isometric_aerial': os.path.join(out_dir, 'cyber_rooftop_render_isometric_aerial.png'),
    'cam_right_perspective': os.path.join(out_dir, 'cyber_rooftop_render_right_perspective.png'),
    'cam_low_angle_hero': os.path.join(out_dir, 'cyber_rooftop_render_low_angle.png')
}

for cam_id, r_path in render_outputs.items():
    cam_obj = cameras_dict[cam_id]
    scene.camera = cam_obj
    scene.render.filepath = r_path
    print(f'>>> Rendering {cam_id} -> {r_path}...')
    bpy.ops.render.render(write_still=True)
    print(f'>>> Completed render: {r_path}')

print('>>> [KeyFury 3D Pure Geometry v5] ALL 5 VIEWS RENDERED WITH ZERO BACKDROP PLANES!')

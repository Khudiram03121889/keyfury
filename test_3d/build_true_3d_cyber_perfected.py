"""
KeyFury 3D: Cyber Neon Rooftop - Master Perfected 3D Environment Builder v3
Procedural & PBR 3D Arena Generator for Blender 5.2.1 LTS
"""

import bpy
import bmesh
import math
from math import radians, sin, cos, pi
import os
import sys

out_dir = r"d:\Keyboard stickman warrior\test_3d"
os.makedirs(out_dir, exist_ok=True)

print(">>> [Cyber Rooftop Master 3D v3] Initializing Blender environment build...")

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

world = scene.world
if not world:
    world = bpy.data.worlds.new("Cyber_Sky_World")
    scene.world = world
world.use_nodes = True
nodes_w = world.node_tree.nodes
nodes_w.clear()
out_w = nodes_w.new(type='ShaderNodeOutputWorld')
bg_w = nodes_w.new(type='ShaderNodeBackground')
bg_w.inputs['Color'].default_value = (0.015, 0.025, 0.05, 1.0)
bg_w.inputs['Strength'].default_value = 0.5
world.node_tree.links.new(bg_w.outputs['Background'], out_w.inputs['Surface'])

# 2. Texture & Material Helpers
def load_image_safe(filepath):
    if os.path.exists(filepath):
        return bpy.data.images.load(filepath)
    return None

img_arcade = load_image_safe(os.path.join(out_dir, "tex_billboard_arcade.png"))
img_kyoto = load_image_safe(os.path.join(out_dir, "tex_billboard_kyoto.png"))
img_ramen = load_image_safe(os.path.join(out_dir, "tex_billboard_ramen.png"))
img_skyline = load_image_safe(os.path.join(out_dir, "tex_distant_skyline.png"))
img_server_l = load_image_safe(os.path.join(out_dir, "tex_server_left.png"))
img_server_r = load_image_safe(os.path.join(out_dir, "tex_server_right.png"))
img_platform = load_image_safe(os.path.join(out_dir, "tex_platform_deck.png"))

def create_image_emissive_material(name, img, emission_strength=2.0, roughness=0.25, metallic=0.3):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    
    tex = tree.nodes.new(type='ShaderNodeTexImage')
    if img:
        tex.image = img
        
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = emission_strength
    
    mix = tree.nodes.new(type='ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = 0.65
    
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

def create_window_facade_material(name, lit_color=(1.0, 0.85, 0.45, 1.0), density=14.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    out = tree.nodes.new(type='ShaderNodeOutputMaterial')
    bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.02, 0.035, 0.06, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.85
    bsdf.inputs['Roughness'].default_value = 0.22
    
    tex_coord = tree.nodes.new(type='ShaderNodeTexCoord')
    mapping = tree.nodes.new(type='ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (density, density * 2.2, 1.0)
    
    brick = tree.nodes.new(type='ShaderNodeTexBrick')
    brick.inputs['Color1'].default_value = (0.015, 0.02, 0.04, 1.0)
    brick.inputs['Color2'].default_value = lit_color
    brick.inputs['Mortar'].default_value = (0.01, 0.015, 0.025, 1.0)
    brick.inputs['Mortar Size'].default_value = 0.08
    brick.inputs['Brick Width'].default_value = 0.5
    brick.inputs['Row Height'].default_value = 0.25
    
    tree.links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
    tree.links.new(mapping.outputs['Vector'], brick.inputs['Vector'])
    
    emit = tree.nodes.new(type='ShaderNodeEmission')
    emit.inputs['Strength'].default_value = 4.5
    tree.links.new(brick.outputs['Color'], emit.inputs['Color'])
    
    mix = tree.nodes.new(type='ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = 0.5
    tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    tree.links.new(emit.outputs['Emission'], mix.inputs[2])
    tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
    return mat

mat_wet_deck = create_pbr_material('Mat_Wet_Deck', (0.035, 0.05, 0.09, 1.0), metallic=0.85, roughness=0.15, specular=0.95)
mat_platform_tex = create_image_emissive_material('Mat_Platform_Texture', img_platform, emission_strength=1.1, roughness=0.15, metallic=0.75)

mat_tread_plate = create_pbr_material('Mat_Tread_Plate', (0.08, 0.10, 0.14, 1.0), metallic=0.88, roughness=0.32, specular=0.7)
mat_metal_dark = create_pbr_material('Mat_Metal_Dark', (0.04, 0.05, 0.07, 1.0), metallic=0.82, roughness=0.38)
mat_metal_gray = create_pbr_material('Mat_Metal_Gray', (0.15, 0.17, 0.22, 1.0), metallic=0.75, roughness=0.28)
mat_hazard = create_pbr_material('Mat_Hazard', (0.95, 0.72, 0.05, 1.0), metallic=0.2, roughness=0.35)

mat_neon_cyan = create_pure_emission('Mat_Neon_Cyan', (0.0, 0.94, 1.0, 1.0), strength=18.0)
mat_neon_magenta = create_pure_emission('Mat_Neon_Magenta', (1.0, 0.05, 0.65, 1.0), strength=15.0)
mat_neon_amber = create_pure_emission('Mat_Neon_Amber', (1.0, 0.62, 0.08, 1.0), strength=14.0)
mat_neon_green = create_pure_emission('Mat_Neon_Green', (0.1, 1.0, 0.35, 1.0), strength=14.0)
mat_neon_red = create_pure_emission('Mat_Neon_Red', (1.0, 0.1, 0.1, 1.0), strength=14.0)
mat_cable_blue = create_pbr_material('Mat_Cable_Blue', (0.0, 0.45, 0.95, 1.0), metallic=0.1, roughness=0.35)
mat_cable_red = create_pbr_material('Mat_Cable_Red', (0.9, 0.1, 0.15, 1.0), metallic=0.1, roughness=0.35)
mat_cable_black = create_pbr_material('Mat_Cable_Black', (0.02, 0.02, 0.03, 1.0), metallic=0.1, roughness=0.5)

mat_window_cyan = create_window_facade_material('Mat_Window_Cyan', lit_color=(0.1, 0.85, 1.0, 1.0), density=14.0)
mat_window_amber = create_window_facade_material('Mat_Window_Amber', lit_color=(1.0, 0.75, 0.3, 1.0), density=12.0)
mat_window_magenta = create_window_facade_material('Mat_Window_Magenta', lit_color=(0.9, 0.2, 0.7, 1.0), density=16.0)

mat_sign_arcade = create_image_emissive_material('Mat_Sign_Arcade', img_arcade, emission_strength=2.6)
mat_sign_kyoto = create_image_emissive_material('Mat_Sign_Kyoto', img_kyoto, emission_strength=2.5)
mat_sign_ramen = create_image_emissive_material('Mat_Sign_Ramen', img_ramen, emission_strength=2.6)
mat_server_left_mat = create_image_emissive_material('Mat_Server_Left_Tex', img_server_l, emission_strength=1.5)
mat_server_right_mat = create_image_emissive_material('Mat_Server_Right_Tex', img_server_r, emission_strength=1.5)
mat_skyline_mat = create_image_emissive_material('Mat_Skyline_Tex', img_skyline, emission_strength=1.8, roughness=0.9, metallic=0.0)

def add_cube(name, loc, scale, mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

def add_cylinder(name, loc, radius, depth, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

def add_plane(name, loc, scale, rot=(0,0,0), mat=None):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj

# 3. ROOFTOP BUILDING & COMBAT DECK
print('>>> Modeling 3D Rooftop Platform & Building Chasm...')
building_base = add_cube('Rooftop_Skyscraper_Tower', (0.0, 2.0, -30.0), (32.0, 18.0, 60.0), mat_metal_dark)

for i in range(4):
    p_x = -10.5 + i * 7.0
    add_cube(f'DropWall_Panel_{i}', (p_x, -7.05, -5.0), (6.4, 0.2, 9.6), mat_metal_gray)
    add_cube(f'DropWall_Neon_{i}', (p_x, -7.16, -5.0), (0.12, 0.1, 9.6), mat_neon_cyan)

deck_slab = add_cube('Rooftop_Base_Deck', (0.0, 2.0, -0.2), (30.0, 16.0, 0.4), mat_metal_dark)

# Combat Platform: 3D Box Base + Plane surface for texture
combat_platform = add_cube('Combat_Platform_Base', (0.0, 0.5, 0.15), (18.0, 7.2, 0.3), mat_wet_deck)
add_plane('Combat_Platform_Surface', (0.0, 0.5, 0.305), (17.9, 7.1, 1.0), rot=(0, 0, 0), mat=mat_platform_tex)

trim_w, trim_d, trim_z = 18.2, 7.4, 0.31
add_cube('Neon_Outer_Top', (0.0, 0.5 + trim_d/2.0, trim_z), (trim_w, 0.15, 0.08), mat_neon_cyan)
add_cube('Neon_Outer_Bottom', (0.0, 0.5 - trim_d/2.0, trim_z), (trim_w, 0.15, 0.08), mat_neon_cyan)
add_cube('Neon_Outer_Left', (-trim_w/2.0, 0.5, trim_z), (0.15, trim_d, 0.08), mat_neon_cyan)
add_cube('Neon_Outer_Right', (trim_w/2.0, 0.5, trim_z), (0.15, trim_d, 0.08), mat_neon_cyan)

in_w, in_d = 16.8, 6.0
add_cube('Neon_Inner_Top', (0.0, 0.5 + in_d/2.0, trim_z + 0.01), (in_w, 0.08, 0.06), mat_neon_magenta)
add_cube('Neon_Inner_Bottom', (0.0, 0.5 - in_d/2.0, trim_z + 0.01), (in_w, 0.08, 0.06), mat_neon_magenta)
add_cube('Neon_Inner_Left', (-in_w/2.0, 0.5, trim_z + 0.01), (0.08, in_d, 0.06), mat_neon_magenta)
add_cube('Neon_Inner_Right', (in_w/2.0, 0.5, trim_z + 0.01), (0.08, in_d, 0.06), mat_neon_magenta)

for side, sign in [('Left', -1), ('Right', 1)]:
    gx = sign * 6.5
    add_cube(f'TreadPlate_{side}', (gx, 0.5, 0.31), (3.6, 5.0, 0.04), mat_tread_plate)
    add_cube(f'Tread_X1_{side}', (gx, 0.5, 0.33), (3.2, 0.18, 0.03), mat_metal_dark).rotation_euler = (0, 0, radians(38 * sign))
    add_cube(f'Tread_X2_{side}', (gx, 0.5, 0.33), (3.2, 0.18, 0.03), mat_metal_dark).rotation_euler = (0, 0, radians(-38 * sign))

add_cube('Center_Floor_Grate', (0.0, -2.0, 0.12), (6.0, 2.8, 0.16), mat_tread_plate)
add_cube('Center_Grate_Neon_Border', (0.0, -2.0, 0.21), (6.15, 2.95, 0.04), mat_neon_cyan)

# 4. INDUSTRIAL SAFETY GUARDRAILS
print('>>> Modeling 3D Industrial Perimeter Railings...')
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

# 5. ROOFTOP MACHINERY
print('>>> Modeling 3D Machinery: Servers, Satellite Dish, Antenna Tower, HVAC Banks...')
add_cube('Left_Server_Main', (-8.5, 1.2, 1.2), (2.4, 2.0, 2.4), mat_server_left_mat)
srv_panel = add_cube('Left_Server_Panel', (-8.5, 0.1, 1.5), (2.0, 0.2, 1.0), mat_metal_gray)
srv_panel.rotation_euler = (radians(-20), 0, 0)
srv_screen = add_cube('Left_Server_Screen', (-8.5, 0.02, 1.55), (1.6, 0.05, 0.65), mat_neon_cyan)
srv_screen.rotation_euler = (radians(-20), 0, 0)

for i, col in enumerate([mat_neon_green, mat_neon_amber, mat_neon_red]):
    add_cube(f'Left_LED_{i}', (-9.1 + i * 0.2, 0.05, 1.95), (0.08, 0.05, 0.08), col)

add_cube('Left_Power_Aux', (-8.5, -0.6, 0.7), (1.6, 1.2, 1.4), mat_metal_gray)
add_cube('Left_Hazard_Strip', (-8.5, -1.22, 0.7), (1.4, 0.04, 0.18), mat_hazard)

add_cylinder('Dish_Pedestal', (-8.5, 1.5, 2.55), radius=0.15, depth=0.5, mat=mat_metal_gray)
add_cylinder('Dish_Gimbal', (-8.5, 1.5, 2.85), radius=0.08, depth=0.4, rot=(0, radians(35), 0), mat=mat_metal_dark)
bpy.ops.mesh.primitive_circle_add(vertices=24, radius=0.85, fill_type='NGON', location=(-8.3, 1.5, 3.1), rotation=(0, radians(-50), 0))
dish_obj = bpy.context.active_object
dish_obj.name = 'Satellite_Dish'
dish_obj.data.materials.append(mat_metal_gray)
add_cylinder('Dish_FeedHorn', (-8.0, 1.5, 3.35), radius=0.04, depth=0.6, rot=(0, radians(-50), 0), mat=mat_metal_dark)
add_cube('Dish_Beacon_Tip', (-7.75, 1.5, 3.55), (0.08, 0.08, 0.08), mat_neon_red)

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

create_cable_curve('Cable_Blue_1', [(-8.0, 0.0, 0.9), (-7.6, -0.3, 0.4), (-7.2, -0.5, 0.15), (-6.5, -0.8, 0.15)], radius=0.065, mat=mat_cable_blue)
create_cable_curve('Cable_Red_1', [(-7.8, 0.0, 0.7), (-7.4, -0.4, 0.35), (-6.9, -0.7, 0.15), (-6.0, -1.0, 0.15)], radius=0.055, mat=mat_cable_red)
create_cable_curve('Cable_Black_1', [(-8.2, 0.0, 0.5), (-7.8, -0.5, 0.25), (-7.4, -0.9, 0.15), (-6.2, -1.3, 0.15)], radius=0.075, mat=mat_cable_black)

add_cube('Right_Server_Main', (8.5, 1.2, 1.3), (2.2, 1.8, 2.6), mat_server_right_mat)
add_cube('Right_Server_Panel', (8.5, 0.2, 1.6), (1.8, 0.2, 1.2), mat_metal_gray)
add_cube('Right_Server_LightStrip', (8.5, 0.08, 1.8), (1.5, 0.05, 0.08), mat_neon_cyan)

add_cylinder('Telecom_Mast_Base', (8.8, 2.2, 3.2), radius=0.12, depth=3.8, mat=mat_metal_gray)
add_cylinder('Telecom_Mast_Spire', (8.8, 2.2, 5.8), radius=0.04, depth=1.6, mat=mat_metal_dark)
add_cube('Telecom_Crossbar', (8.8, 2.2, 4.2), (1.6, 0.12, 0.12), mat_metal_dark)
add_cylinder('Telecom_Sensor_L', (8.1, 2.2, 4.4), radius=0.18, depth=0.35, rot=(radians(90), 0, 0), mat=mat_metal_gray)
add_cylinder('Telecom_Sensor_R', (9.5, 2.2, 4.4), radius=0.18, depth=0.35, rot=(radians(90), 0, 0), mat=mat_metal_gray)
add_cube('Telecom_Beacon_Light', (8.8, 2.2, 6.65), (0.14, 0.14, 0.14), mat_neon_red)

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

# 6. SURROUNDING 3D MEGACITY SKYLINE
print('>>> Constructing Calibrated 3D Megacity Skyline...')
def create_skyscraper(name, x, y, width, depth, height, z_base=-25.0, mat_facade=mat_window_cyan, neon_trim=None):
    z_center = z_base + height / 2.0
    tower = add_cube(name, (x, y, z_center), (width, depth, height), mat_facade)
    if height > 25.0:
        crown_h = height * 0.15
        crown_w = width * 0.7
        crown_d = depth * 0.7
        add_cube(f'{name}_Crown', (x, y, z_base + height + crown_h / 2.0), (crown_w, crown_d, crown_h), mat_metal_dark)
        spire_h = 6.0
        add_cylinder(f'{name}_Spire', (x, y, z_base + height + crown_h + spire_h / 2.0), radius=0.15, depth=spire_h, mat=mat_metal_gray)
        add_cube(f'{name}_Spire_Light', (x, y, z_base + height + crown_h + spire_h), (0.2, 0.2, 0.2), mat_neon_red)
    if neon_trim:
        for cx in [-1, 1]:
            for cy in [-1, 1]:
                nx = x + cx * (width / 2.0 + 0.05)
                ny = y + cy * (depth / 2.0 + 0.05)
                add_cube(f'{name}_NeonEdge_{cx}_{cy}', (nx, ny, z_center), (0.1, 0.1, height), neon_trim)
    return tower

# 6A. Flank Skyscraper Towers with Plane Hologram Billboards
create_skyscraper('Tower_CyberArcade', 16.0, 18.0, 10.0, 9.0, 48.0, z_base=-25.0, mat_facade=mat_window_magenta, neon_trim=mat_neon_magenta)
add_cube('Arcade_Sign_Frame', (13.2, 14.8, 7.2), (6.2, 0.4, 5.6), mat_metal_dark)
add_plane('Arcade_Sign_Plane', (13.2, 14.5, 7.2), (6.0, 5.4, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_arcade)

create_skyscraper('Tower_Ramen', 9.5, 24.0, 7.5, 7.0, 32.0, z_base=-25.0, mat_facade=mat_window_amber, neon_trim=mat_neon_amber)
add_cube('Ramen_Sign_Frame', (9.5, 20.2, 4.6), (4.5, 0.3, 3.4), mat_metal_dark)
add_plane('Ramen_Sign_Plane', (9.5, 20.0, 4.6), (4.3, 3.2, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_ramen)

create_skyscraper('Tower_NeoKyoto', -16.0, 17.0, 10.5, 9.5, 52.0, z_base=-25.0, mat_facade=mat_window_cyan, neon_trim=mat_neon_cyan)
add_cube('NeoKyoto_Sign_Frame', (-13.0, 13.5, 7.5), (6.2, 0.3, 5.8), mat_metal_dark)
add_plane('NeoKyoto_Sign_Plane', (-13.0, 13.3, 7.5), (6.0, 5.6, 1.0), rot=(radians(90), 0, 0), mat=mat_sign_kyoto)

# 3D Skybridge between Arcade Tower and Ramen Tower
sb_len = 7.0
add_cube('Skybridge_Structure', (12.5, 21.0, 4.8), (sb_len, 2.0, 1.8), mat_metal_dark)
add_cube('Skybridge_Windows_F', (12.5, 19.9, 4.8), (sb_len * 0.9, 0.08, 0.8), mat_neon_cyan)
add_cube('Skybridge_Truss', (12.5, 21.0, 3.6), (sb_len * 0.8, 1.0, 0.4), mat_metal_gray)

# 6B. Slender needle towers on the sides (Center remains OPEN for canyon vista!)
create_skyscraper('Needle_West', -8.0, 36.0, 5.0, 5.0, 60.0, z_base=-25.0, mat_facade=mat_window_cyan, neon_trim=mat_neon_cyan)
create_skyscraper('Needle_East', 6.0, 34.0, 5.0, 5.0, 56.0, z_base=-25.0, mat_facade=mat_window_amber, neon_trim=mat_neon_amber)

# 6C. 3D Flying Hovercars with High-Speed Trails
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

# Hovercar 1: Speeding across the center canyon (Orange trail)
create_hovercar('Hovercar_1', (-1.0, 18.0, 7.5), rot_z=radians(-10), trail_color=mat_neon_amber, trail_len=20.0)
# Hovercar 2: Upper flight path (Cyan trail)
create_hovercar('Hovercar_2', (5.0, 24.0, 10.8), rot_z=radians(170), trail_color=mat_neon_cyan, trail_len=22.0)

# 6D. Distant Panoramic Skyline Backdrop Plane (Y = 40.0m)
add_plane('Distant_Skyline_Plane', (0.0, 40.0, 14.5), (96.0, 42.0, 1.0), rot=(radians(90), 0, 0), mat=mat_skyline_mat)

# 7. CYBER LIGHTING
print('>>> Configuring 3D Cyberpunk Lighting Rig...')
l_cyan = bpy.data.lights.new(name='Light_Cyan_Key', type='AREA')
l_cyan.energy = 2200
l_cyan.color = (0.0, 0.94, 1.0)
if hasattr(l_cyan, 'size'): l_cyan.size = 22.0
obj_l_cyan = bpy.data.objects.new('Light_Cyan_Key', l_cyan)
obj_l_cyan.location = (-7.0, -8.0, 12.0)
obj_l_cyan.rotation_euler = (radians(48), radians(-18), radians(15))
bpy.context.collection.objects.link(obj_l_cyan)

l_mag = bpy.data.lights.new(name='Light_Magenta_Rim', type='AREA')
l_mag.energy = 2600
l_mag.color = (1.0, 0.05, 0.65)
if hasattr(l_mag, 'size'): l_mag.size = 22.0
obj_l_mag = bpy.data.objects.new('Light_Magenta_Rim', l_mag)
obj_l_mag.location = (8.0, 6.0, 9.0)
obj_l_mag.rotation_euler = (radians(55), radians(20), radians(-25))
bpy.context.collection.objects.link(obj_l_mag)

l_chasm = bpy.data.lights.new(name='Light_Chasm_Underglow', type='AREA')
l_chasm.energy = 4000
l_chasm.color = (0.05, 0.40, 0.9)
if hasattr(l_chasm, 'size'): l_chasm.size = 45.0
obj_l_chasm = bpy.data.objects.new('Light_Chasm_Underglow', l_chasm)
obj_l_chasm.location = (0.0, 18.0, -22.0)
obj_l_chasm.rotation_euler = (radians(-75), 0, 0)
bpy.context.collection.objects.link(obj_l_chasm)

l_fill = bpy.data.lights.new(name='Light_Combat_Fill', type='AREA')
l_fill.energy = 600
l_fill.color = (0.8, 0.92, 1.0)
if hasattr(l_fill, 'size'): l_fill.size = 18.0
obj_l_fill = bpy.data.objects.new('Light_Combat_Fill', l_fill)
obj_l_fill.location = (0.0, -14.0, 3.5)
obj_l_fill.rotation_euler = (radians(78), 0, 0)
bpy.context.collection.objects.link(obj_l_fill)

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
add_camera('cam_left_profile', 'Camera_02_Left_Profile', (-17.0, 0.5, 2.5), (radians(85.0), 0, radians(-90.0)), lens=35.0)
add_camera('cam_isometric_aerial', 'Camera_03_Isometric_Aerial', (-18.0, -15.0, 18.0), (radians(48.0), 0, radians(-45.0)), lens=32.0)
add_camera('cam_right_perspective', 'Camera_04_Right_Perspective', (16.0, -10.0, 5.0), (radians(75.0), 0, radians(55.0)), lens=32.0)
add_camera('cam_low_angle_hero', 'Camera_05_Low_Angle_Hero', (0.0, -6.5, 0.4), (radians(82.0), 0, 0), lens=24.0)

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

print('>>> [Cyber Rooftop Master 3D v3] ALL 5 VIEWS RENDERED SUCCESSFULLY!')

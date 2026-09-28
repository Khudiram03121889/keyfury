"""
KeyFury 3D Master Suite: 100% Pixel-Perfect Procedural & Cinematic 3D Arenas
Generates:
1. KeyFury_3D_HighlandSanctuary.blend & .glb & _Render.png (Platform Ratio: 0.72)
2. KeyFury_3D_CyberRooftop.blend & .glb & _Render.png (Platform Ratio: 0.73)
3. KeyFury_3D_VolcanicCaldera.blend & .glb & _Render.png (Platform Ratio: 0.62)
4. KeyFury_3D_CelestialVoid.blend & .glb & _Render.png (Platform Ratio: 0.71)
"""

import bpy
import math
from math import radians
import os
import shutil

MAP_CONFIGS = [
    {
        "id": "highland_sanctuary",
        "name": "Highland Sanctuary",
        "blend_file": "KeyFury_3D_HighlandSanctuary.blend",
        "render_file": "KeyFury_3D_HighlandSanctuary_Render.png",
        "glb_file": "KeyFury_3D_HighlandSanctuary.glb",
        "image_file": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\highland_sanctuary.jpg",
        "platform_ratio": 0.72,
        "platform_color": (0.38, 0.36, 0.32, 1.0),
        "sun_color": (1.0, 0.98, 0.90),
        "sun_energy": 3.5,
        "sun_rot": (radians(55), radians(15), radians(-35)),
        "ambient_color": (0.6, 0.8, 1.0),
        "ambient_energy": 280,
    },
    {
        "id": "cyber_rooftop",
        "name": "Cyber Neon Rooftop",
        "blend_file": "KeyFury_3D_CyberRooftop.blend",
        "render_file": "KeyFury_3D_CyberRooftop_Render.png",
        "glb_file": "KeyFury_3D_CyberRooftop.glb",
        "image_file": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\cyber_rooftop.jpg",
        "platform_ratio": 0.73,
        "platform_color": (0.04, 0.05, 0.08, 1.0),
        "sun_color": (0.2, 0.85, 1.0),
        "sun_energy": 2.5,
        "sun_rot": (radians(45), radians(-20), radians(60)),
        "ambient_color": (0.9, 0.1, 0.65),
        "ambient_energy": 380,
    },
    {
        "id": "volcanic_caldera",
        "name": "Volcanic Caldera",
        "blend_file": "KeyFury_3D_VolcanicCaldera.blend",
        "render_file": "KeyFury_3D_VolcanicCaldera_Render.png",
        "glb_file": "KeyFury_3D_VolcanicCaldera.glb",
        "image_file": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\volcanic_caldera.jpg",
        "platform_ratio": 0.62,
        "platform_color": (0.08, 0.07, 0.07, 1.0),
        "sun_color": (1.0, 0.45, 0.05),
        "sun_energy": 4.5,
        "sun_rot": (radians(65), radians(10), radians(-40)),
        "ambient_color": (0.95, 0.25, 0.05),
        "ambient_energy": 480,
    },
    {
        "id": "celestial_void",
        "name": "Celestial Void Shrine",
        "blend_file": "KeyFury_3D_CelestialVoid.blend",
        "render_file": "KeyFury_3D_CelestialVoid_Render.png",
        "glb_file": "KeyFury_3D_CelestialVoid.glb",
        "image_file": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\celestial_void.jpg",
        "platform_ratio": 0.71,
        "platform_color": (0.20, 0.18, 0.28, 1.0),
        "sun_color": (0.85, 0.65, 1.0),
        "sun_energy": 3.0,
        "sun_rot": (radians(50), radians(-15), radians(45)),
        "ambient_color": (0.55, 0.25, 0.95),
        "ambient_energy": 360,
    },
]

out_dir = r"d:\Keyboard stickman warrior\test_3d"

def build_arena(cfg):
    print(f"\n=======================================================")
    print(f">>> BUILDING PIXEL-PERFECT 3D ARENA: {cfg['name']} ({cfg['id']})")
    print(f"=======================================================")
    
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
    if hasattr(scene.eevee, 'use_raytracing'): scene.eevee.use_raytracing = True
    if hasattr(scene.eevee, 'use_fast_gi'): scene.eevee.use_fast_gi = True
    
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    
    # 2. Camera Setup (Platform Ratio calibrated)
    cam_data = bpy.data.cameras.new(f"{cfg['id']}_Combat_Cam")
    cam_data.lens = 40.0
    cam_data.clip_start = 0.1
    cam_data.clip_end = 500.0
    
    cam_obj = bpy.data.objects.new(f"{cfg['id']}_Combat_Camera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    
    cam_dist = 20.0
    sw = cam_data.sensor_width   # 36.0mm
    focal = cam_data.lens        # 40.0mm
    total_w = cam_dist * (sw / focal) # 18.0m
    total_h = total_w * (9.0 / 16.0)  # 10.125m
    
    # Floor is at World Z = 0.0
    floor_ratio_bottom = 1.0 - cfg['platform_ratio']
    cam_z = floor_ratio_bottom * total_h
    cam_obj.location = (0.0, -cam_dist, cam_z)
    cam_obj.rotation_euler = (radians(90.0), 0, 0)
    
    # 3. Load Master Artwork
    img = bpy.data.images.load(cfg['image_file'])
    
    # 4. Master Backdrop Material
    mat_stage = bpy.data.materials.new(name=f"Mat_{cfg['id']}_Stage")
    mat_stage.use_nodes = True
    nodes = mat_stage.node_tree.nodes
    nodes.clear()
    out_node = nodes.new(type="ShaderNodeOutputMaterial")
    emit_node = nodes.new(type="ShaderNodeEmission")
    emit_node.inputs['Strength'].default_value = 1.0
    tex_node = nodes.new(type="ShaderNodeTexImage")
    tex_node.image = img
    tex_coord = nodes.new(type="ShaderNodeTexCoord")
    
    mat_stage.node_tree.links.new(tex_coord.outputs['UV'], tex_node.inputs['Vector'])
    mat_stage.node_tree.links.new(tex_node.outputs['Color'], emit_node.inputs['Color'])
    mat_stage.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])
    
    # 5. Master Backdrop Cyclorama Plane
    bpy.ops.mesh.primitive_plane_add(size=1.0)
    backdrop = bpy.context.active_object
    backdrop.name = f"Arena_{cfg['id']}_Backdrop"
    backdrop.parent = cam_obj
    backdrop.location = (0, 0, -cam_dist)
    backdrop.rotation_euler = (0, 0, 0)
    backdrop.scale = (total_w, total_h, 1.0)
    backdrop.data.materials.append(mat_stage)
    
    # 6. Physical 3D Ground Platform & Collider (Walking surface at Z = 0.0)
    platform_depth = 3.0
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, -platform_depth / 2.0, -0.25))
    platform = bpy.context.active_object
    platform.name = f"Arena_{cfg['id']}_Combat_Platform"
    platform.scale = (total_w * 0.95, platform_depth, 0.5)
    platform.visible_camera = False  # Invisible to still camera render, active for 3D physics & depthWrite
    
    mat_plat = bpy.data.materials.new(name=f"Mat_{cfg['id']}_Platform_Physics")
    mat_plat.use_nodes = True
    p_nodes = mat_plat.node_tree.nodes
    p_bsdf = p_nodes.get("Principled BSDF")
    if p_bsdf:
        p_bsdf.inputs['Base Color'].default_value = cfg['platform_color']
        p_bsdf.inputs['Roughness'].default_value = 0.85
    platform.data.materials.append(mat_plat)
    
    # 7. Lighting
    sun = bpy.data.lights.new(name=f"{cfg['id']}_Sun", type='SUN')
    sun.energy = cfg['sun_energy']
    sun.color = cfg['sun_color']
    sun_obj = bpy.data.objects.new(f"{cfg['id']}_Sun_Light", sun)
    sun_obj.rotation_euler = cfg['sun_rot']
    bpy.context.collection.objects.link(sun_obj)
    
    amb = bpy.data.lights.new(name=f"{cfg['id']}_Ambient", type='AREA')
    amb.energy = cfg['ambient_energy']
    amb.color = cfg['ambient_color']
    amb.size = 18.0
    amb_obj = bpy.data.objects.new(f"{cfg['id']}_Ambient_Light", amb)
    amb_obj.location = (0, -5.0, cam_z + 4.0)
    amb_obj.rotation_euler = (radians(30), 0, 0)
    bpy.context.collection.objects.link(amb_obj)
    
    # 8. Save .blend, Render Still, Export .glb
    blend_path = os.path.join(out_dir, cfg['blend_file'])
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f">>> Saved Blender File: {blend_path}")
    
    render_path = os.path.join(out_dir, cfg['render_file'])
    scene.render.filepath = render_path
    bpy.ops.render.render(write_still=True)
    print(f">>> Rendered Still PNG: {render_path}")
    
    glb_path = os.path.join(out_dir, cfg['glb_file'])
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
    print(f">>> Exported GLB Model: {glb_path}")
    
    print(f">>> COMPLETED ARENA: {cfg['name']} SUCCESS!\n")

for cfg in MAP_CONFIGS:
    build_arena(cfg)

print(">>> ALL FOUR 3D ARENA MAPS SUCCESSFULLY CREATED!")

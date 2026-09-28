
import traceback
import sys
try:
    """
    KeyFury 3D: Celestial Void Shrine - Master 100% Pure 3D Geometry Builder (Version 2 - Realistic Sides Overhaul)
    Blender 5.2.1 LTS // EEVEE Next Engine
    100% Pure Procedural 3D Polygonal Geometry // Organic Floating Islands // Natural Mineral Geodes // Japanese Cloud Bonsai
    """
    
    import bpy
    import bmesh
    import math
    from math import radians, sin, cos, pi, sqrt, asin
    import os
    import sys
    import random
    
    out_dir = r"d:\Keyboard stickman warrior\test_3d"
    os.makedirs(out_dir, exist_ok=True)
    
    print(">>> [KeyFury 3D Celestial Void v2] Initializing clean Blender environment...")
    
    # 1. CLEAN SCENE
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
    
    # 2. COSMIC SPACE WORLD ATMOSPHERE (Zero 2D Cards - Pure Procedural Stars & Nebula)
    print(">>> Setting up Procedural Cosmic Space Dome & Nebula Shader...")
    world = scene.world
    if not world:
        world = bpy.data.worlds.new("Celestial_Cosmic_World")
        scene.world = world
    world.use_nodes = True
    tree_w = world.node_tree
    tree_w.nodes.clear()
    
    out_w = tree_w.nodes.new(type='ShaderNodeOutputWorld')
    bg_w = tree_w.nodes.new(type='ShaderNodeBackground')
    coord_w = tree_w.nodes.new(type='ShaderNodeTexCoord')
    
    # Nebula layer: Cosmic violet & astral magenta swirl
    noise_w = tree_w.nodes.new(type='ShaderNodeTexNoise')
    noise_w.inputs['Scale'].default_value = 1.8
    noise_w.inputs['Detail'].default_value = 4.0
    noise_w.inputs['Roughness'].default_value = 0.55
    
    ramp_nebula = tree_w.nodes.new(type='ShaderNodeValToRGB')
    ramp_nebula.color_ramp.elements[0].position = 0.22
    ramp_nebula.color_ramp.elements[0].color = (0.008, 0.004, 0.022, 1.0) # Abyss midnight indigo
    ramp_nebula.color_ramp.elements[1].position = 0.60
    ramp_nebula.color_ramp.elements[1].color = (0.052, 0.012, 0.105, 1.0) # Cosmic violet dust
    elem_mag = ramp_nebula.color_ramp.elements.new(0.84)
    elem_mag.color = (0.115, 0.018, 0.095, 1.0) # Magenta celestial nebula
    
    tree_w.links.new(coord_w.outputs['Generated'], noise_w.inputs['Vector'])
    tree_w.links.new(noise_w.outputs['Fac'], ramp_nebula.inputs['Fac'])
    
    # Stars layer: Thresholded Voronoi pinpoint stars
    vor_stars = tree_w.nodes.new(type='ShaderNodeTexVoronoi')
    vor_stars.inputs['Scale'].default_value = 150.0
    
    math_stars = tree_w.nodes.new(type='ShaderNodeMath')
    math_stars.operation = 'LESS_THAN'
    math_stars.inputs[1].default_value = 0.042
    
    mult_stars = tree_w.nodes.new(type='ShaderNodeMath')
    mult_stars.operation = 'MULTIPLY'
    mult_stars.inputs[1].default_value = 4.5
    
    tree_w.links.new(coord_w.outputs['Generated'], vor_stars.inputs['Vector'])
    tree_w.links.new(vor_stars.outputs['Distance'], math_stars.inputs[0])
    tree_w.links.new(math_stars.outputs['Value'], mult_stars.inputs[0])
    
    # Add stars to nebula
    mix_stars = tree_w.nodes.new(type='ShaderNodeMix')
    mix_stars.data_type = 'RGBA'
    mix_stars.blend_type = 'ADD'
    mix_stars.inputs['Factor'].default_value = 1.0
    
    tree_w.links.new(ramp_nebula.outputs['Color'], mix_stars.inputs[6])
    tree_w.links.new(mult_stars.outputs['Value'], mix_stars.inputs[7])
    
    tree_w.links.new(mix_stars.outputs[2], bg_w.inputs['Color'])
    bg_w.inputs['Strength'].default_value = 1.0
    tree_w.links.new(bg_w.outputs['Background'], out_w.inputs['Surface'])
    
    # 3. TEXTURES & PROCEDURAL MATERIALS
    def load_img(name):
        p = os.path.join(out_dir, name)
        if os.path.exists(p):
            return bpy.data.images.load(p)
        return None
    
    img_floor = load_img("tex_celestial_magic_floor.png")
    img_temple = load_img("tex_celestial_temple_seal.png")
    img_obelisk = load_img("tex_celestial_obelisk_runes.png")
    
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
    
    def create_pure_emission(name, color, strength=12.0):
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
    
    def create_magic_emissive_material(name, img, base_mat_color=(0.24, 0.22, 0.32, 1.0), emission_fac=3.8):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        tree = mat.node_tree
        tree.nodes.clear()
        out = tree.nodes.new(type='ShaderNodeOutputMaterial')
        
        bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = base_mat_color
        bsdf.inputs['Metallic'].default_value = 0.15
        bsdf.inputs['Roughness'].default_value = 0.22
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = 0.85
        
        emit = tree.nodes.new(type='ShaderNodeEmission')
        emit.inputs['Strength'].default_value = emission_fac
        
        mix = tree.nodes.new(type='ShaderNodeMixShader')
        
        if img:
            tex = tree.nodes.new(type='ShaderNodeTexImage')
            tex.image = img
            tree.links.new(tex.outputs['Color'], emit.inputs['Color'])
            tree.links.new(tex.outputs['Alpha'], mix.inputs['Fac'])
        else:
            mix.inputs['Fac'].default_value = 0.5
        
        tree.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
        tree.links.new(emit.outputs['Emission'], mix.inputs[2])
        tree.links.new(mix.outputs['Shader'], out.inputs['Surface'])
        return mat
    
    def create_glowing_crystal_material(name, crystal_color=(0.52, 0.10, 0.85, 1.0), emit_strength=2.6):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        tree = mat.node_tree
        tree.nodes.clear()
        out = tree.nodes.new(type='ShaderNodeOutputMaterial')
        
        bsdf = tree.nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.inputs['Base Color'].default_value = crystal_color
        bsdf.inputs['Roughness'].default_value = 0.08
        bsdf.inputs['Metallic'].default_value = 0.05
        if 'Transmission Weight' in bsdf.inputs:
            bsdf.inputs['Transmission Weight'].default_value = 0.78
        elif 'Transmission' in bsdf.inputs:
            bsdf.inputs['Transmission'].default_value = 0.78
        if 'IOR' in bsdf.inputs:
            bsdf.inputs['IOR'].default_value = 1.54
            
        emit = tree.nodes.new(type='ShaderNodeEmission')
        emit.inputs['Color'].default_value = crystal_color
        emit.inputs['Strength'].default_value = emit_strength
        
        add_sh = tree.nodes.new(type='ShaderNodeAddShader')
        tree.links.new(bsdf.outputs['BSDF'], add_sh.inputs[0])
        tree.links.new(emit.outputs['Emission'], add_sh.inputs[1])
        tree.links.new(add_sh.outputs['Shader'], out.inputs['Surface'])
        return mat
    
    # Base Materials
    mat_marble_floor = create_pbr_material('Mat_Marble_Floor', (0.24, 0.22, 0.32, 1.0), metallic=0.15, roughness=0.22, specular=0.85)
    mat_stone_dark = create_pbr_material('Mat_Stone_Dark', (0.12, 0.11, 0.18, 1.0), metallic=0.2, roughness=0.45)
    mat_stone_trim = create_pbr_material('Mat_Stone_Trim', (0.18, 0.16, 0.25, 1.0), metallic=0.15, roughness=0.35)
    mat_bronze = create_pbr_material('Mat_Bronze', (0.42, 0.32, 0.16, 1.0), metallic=0.85, roughness=0.3)
    mat_rock_crag = create_pbr_material('Mat_Rock_Crag', (0.055, 0.045, 0.08, 1.0), metallic=0.08, roughness=0.85)
    mat_sakura_canopy = create_pbr_material('Mat_Sakura_Canopy', (0.96, 0.62, 0.82, 1.0), metallic=0.02, roughness=0.45)
    mat_emerald_canopy = create_pbr_material('Mat_Emerald_Canopy', (0.10, 0.42, 0.26, 1.0), metallic=0.02, roughness=0.55)
    mat_wood = create_pbr_material('Mat_Wood', (0.11, 0.08, 0.05, 1.0), metallic=0.0, roughness=0.75)
    
    # Glowing Emissive Crystal & Neon Materials (Calibrated for deep translucent luster)
    mat_amethyst_crystal = create_glowing_crystal_material('Mat_Amethyst_Crystal', (0.50, 0.08, 0.82, 1.0), emit_strength=2.6)
    mat_cyan_crystal = create_glowing_crystal_material('Mat_Cyan_Crystal', (0.04, 0.72, 0.95, 1.0), emit_strength=2.8)
    mat_magenta_crystal = create_glowing_crystal_material('Mat_Magenta_Crystal', (0.92, 0.12, 0.70, 1.0), emit_strength=2.5)
    
    mat_neon_violet = create_pure_emission('Mat_Neon_Violet', (0.75, 0.18, 1.0, 1.0), strength=12.0)
    mat_neon_cyan = create_pure_emission('Mat_Neon_Cyan', (0.0, 0.94, 1.0, 1.0), strength=12.0)
    mat_neon_magenta = create_pure_emission('Mat_Neon_Magenta', (1.0, 0.10, 0.70, 1.0), strength=12.0)
    mat_lantern_flame = create_pure_emission('Mat_Lantern_Flame', (1.0, 0.75, 0.32, 1.0), strength=10.0)
    mat_moon_glow = create_pure_emission('Mat_Moon_Glow', (0.88, 0.95, 1.0, 1.0), strength=4.5)
    mat_sakura_petal = create_pure_emission('Mat_Sakura_Petal', (0.98, 0.65, 0.85, 1.0), strength=3.0)
    
    # Textured Emissive Decal Materials
    mat_magic_floor = create_magic_emissive_material('Mat_Magic_Floor', img_floor, (0.24, 0.22, 0.32, 1.0), emission_fac=3.8)
    mat_temple_seal = create_magic_emissive_material('Mat_Temple_Seal', img_temple, (0.18, 0.16, 0.25, 1.0), emission_fac=3.2)
    mat_obelisk = create_magic_emissive_material('Mat_Obelisk', img_obelisk, (0.10, 0.09, 0.15, 1.0), emission_fac=3.5)
    
    # Mesh helper functions
    def add_cube(name, loc, scale, mat=None):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if mat: obj.data.materials.append(mat)
        return obj
    
    def add_cylinder(name, loc, radius, depth, rot=(0,0,0), mat=None, vertices=24):
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
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
    
    # 4. POINTED FACETED SINGLE CRYSTAL MESH
    def create_single_crystal(name, loc, scale, rot_euler, mat=mat_amethyst_crystal, sides=6, h_body=1.0, h_top=1.8, h_bot=0.8):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        
        rx = 0.35 * scale[0]
        ry = 0.35 * scale[1]
        zb_top = h_body * scale[2]
        zb_bot = -h_bot * scale[2]
        zt_apex = h_top * scale[2]
        zb_apex = -(h_bot + 0.5) * scale[2]
        
        verts_top = []
        verts_bot = []
        for i in range(sides):
            th = 2 * pi * i / sides
            verts_top.append(bm.verts.new((rx * cos(th), ry * sin(th), zb_top)))
            verts_bot.append(bm.verts.new((rx * cos(th), ry * sin(th), zb_bot)))
            
        apex_t = bm.verts.new((0, 0, zt_apex))
        apex_b = bm.verts.new((0, 0, zb_apex))
        
        bm.verts.ensure_lookup_table()
        for i in range(sides):
            i_next = (i + 1) % sides
            bm.faces.new([verts_bot[i], verts_bot[i_next], verts_top[i_next], verts_top[i]])
            bm.faces.new([verts_top[i], verts_top[i_next], apex_t])
            bm.faces.new([verts_bot[i_next], verts_bot[i], apex_b])
            
        bm.to_mesh(mesh)
        bm.free()
        
        for p in mesh.polygons:
            p.use_smooth = False
            
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = rot_euler
        if mat: obj.data.materials.append(mat)
        return obj
    
    # Realistic Mineral Geode / Crystal Cluster (Central tall spire + tightly nested companions)
    def create_crystal_geode_cluster(base_name, center_loc, base_height=3.4, num_shards=4, mat=mat_amethyst_crystal, seed=101):
        random.seed(seed)
        cx, cy, cz = center_loc
        # Primary central crystal (mostly upright)
        create_single_crystal(f"{base_name}_Center", (cx, cy, cz), (1.1, 1.1, base_height / 2.0), (radians(random.uniform(-4, 4)), radians(random.uniform(-4, 4)), radians(random.uniform(0, 360))), mat=mat)
        
        # Secondary companion crystals tightly clustered at base
        for i in range(num_shards):
            ang = 2 * pi * i / num_shards + random.uniform(-0.25, 0.25)
            dist = random.uniform(0.40, 0.65)
            px = cx + dist * cos(ang)
            py = cy + dist * sin(ang)
            h_factor = random.uniform(0.38, 0.68)
            tilt = radians(random.uniform(7, 14))
            rx = tilt * sin(ang)
            ry = -tilt * cos(ang)
            # Alternate cyan crystal in cluster for magical contrast
            sub_mat = mat_cyan_crystal if (i == 1 and num_shards > 2) else mat
            create_single_crystal(f"{base_name}_Sub_{i}", (px, py, cz - 0.15), (0.65 * h_factor, 0.65 * h_factor, base_height * h_factor / 2.0), (rx, ry, radians(random.uniform(0, 360))), mat=sub_mat)
    
    # 5. ORGANIC SCULPTED FLOATING ISLAND GENERATOR (Zero rigid boxes!)
    print(">>> Modeling Organic Sculpted Floating Islands & Stalactite Underbodies...")
    def create_organic_floating_island(name, loc, rx=3.5, ry=3.0, depth=6.5, seed=42, mat_crag=mat_rock_crag):
        random.seed(seed)
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        segments = 20
        
        # Tier 0: Center mound
        center_top = bm.verts.new((0, 0, 0.35))
        
        # Tier 1: Inner plateau ring
        rim1_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            var = 0.85 + 0.25 * sin(th * 2 + seed) + 0.15 * cos(th * 3)
            x = rx * 0.75 * var * cos(th)
            y = ry * 0.75 * var * sin(th)
            z = 0.15 + 0.08 * sin(th * 4)
            rim1_verts.append(bm.verts.new((x, y, z)))
            
        # Tier 2: Outer plateau cliff rim
        rim2_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            var = 0.90 + 0.20 * cos(th * 3 + seed) + 0.12 * sin(th * 5)
            x = rx * var * cos(th)
            y = ry * var * sin(th)
            z = -0.35 + 0.12 * cos(th * 2)
            rim2_verts.append(bm.verts.new((x, y, z)))
            
        # Tier 3: Upper crag shelf
        rim3_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            var = 0.75 + 0.18 * sin(th * 3 + 1)
            x = rx * 0.75 * var * cos(th)
            y = ry * 0.75 * var * sin(th)
            z = -depth * 0.28 + 0.25 * sin(th * 3)
            rim3_verts.append(bm.verts.new((x, y, z)))
            
        # Tier 4: Mid crag taper
        rim4_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            var = 0.50 + 0.20 * cos(th * 2 + 2)
            x = rx * 0.45 * var * cos(th)
            y = ry * 0.45 * var * sin(th)
            z = -depth * 0.62 + 0.35 * cos(th * 2)
            rim4_verts.append(bm.verts.new((x, y, z)))
            
        # Tier 5: Bottom stalactite tip
        bottom_tip = bm.verts.new((0.15 * cos(seed), 0.15 * sin(seed), -depth))
        
        bm.verts.ensure_lookup_table()
        for i in range(segments):
            i_next = (i + 1) % segments
            bm.faces.new([center_top, rim1_verts[i], rim1_verts[i_next]])
            bm.faces.new([rim1_verts[i], rim2_verts[i], rim2_verts[i_next], rim1_verts[i_next]])
            bm.faces.new([rim2_verts[i], rim3_verts[i], rim3_verts[i_next], rim2_verts[i_next]])
            bm.faces.new([rim3_verts[i], rim4_verts[i], rim4_verts[i_next], rim3_verts[i_next]])
            bm.faces.new([rim4_verts[i], bottom_tip, rim4_verts[i_next]])
            
        bm.to_mesh(mesh)
        bm.free()
        
        for p in mesh.polygons:
            p.use_smooth = False
            
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        if mat_crag: obj.data.materials.append(mat_crag)
        return obj
    
    # 6. AUTHENTIC JAPANESE CLOUD BONSAI TREE GENERATOR
    def create_branch_segment(name, pts, radii, mat=mat_wood):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        sides = 10
        rings = []
        for pt, r in zip(pts, radii):
            x, y, z = pt
            ring = [bm.verts.new((x + r * cos(2 * pi * i / sides), y + r * sin(2 * pi * i / sides), z)) for i in range(sides)]
            rings.append(ring)
            
        bm.verts.ensure_lookup_table()
        for j in range(len(rings) - 1):
            for i in range(sides):
                i_next = (i + 1) % sides
                bm.faces.new([rings[j][i], rings[j][i_next], rings[j+1][i_next], rings[j+1][i]])
                
        bot_c = bm.verts.new(pts[0])
        top_c = bm.verts.new(pts[-1])
        for i in range(sides):
            i_next = (i + 1) % sides
            bm.faces.new([bot_c, rings[0][i_next], rings[0][i]])
            bm.faces.new([top_c, rings[-1][i], rings[-1][i_next]])
            
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons: p.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        if mat: obj.data.materials.append(mat)
        return obj
    
    def create_cloud_canopy(name, loc, scale=(1.2, 1.0, 0.45), mat=mat_sakura_canopy):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = scale
        bpy.ops.object.transform_apply(scale=True)
        for p in obj.data.polygons: p.use_smooth = True
        if mat: obj.data.materials.append(mat)
        return obj
    
    def create_celestial_bonsai_tree(name, loc, scale=1.0, foliage_mat=mat_sakura_canopy):
        lx, ly, lz = loc
        # Gnarled main trunk sweeping gracefully
        pts_main = [
            (lx, ly, lz),
            (lx + 0.15 * scale, ly + 0.10 * scale, lz + 0.6 * scale),
            (lx + 0.40 * scale, ly + 0.22 * scale, lz + 1.2 * scale),
            (lx + 0.55 * scale, ly + 0.12 * scale, lz + 1.8 * scale),
            (lx + 0.60 * scale, ly - 0.08 * scale, lz + 2.3 * scale)
        ]
        radii_main = [0.28 * scale, 0.22 * scale, 0.17 * scale, 0.12 * scale, 0.09 * scale]
        create_branch_segment(f"{name}_Trunk_Main", pts_main, radii_main, mat=mat_wood)
        
        # Side branch reaching outwards
        pts_side = [
            (lx + 0.40 * scale, ly + 0.22 * scale, lz + 1.2 * scale),
            (lx + 0.75 * scale, ly + 0.48 * scale, lz + 1.5 * scale),
            (lx + 1.10 * scale, ly + 0.60 * scale, lz + 1.65 * scale)
        ]
        radii_side = [0.13 * scale, 0.09 * scale, 0.05 * scale]
        create_branch_segment(f"{name}_Branch_Side", pts_side, radii_side, mat=mat_wood)
        
        # Cloud-pruned foliage canopies (layered Japanese style)
        create_cloud_canopy(f"{name}_Canopy_Apex", (lx + 0.60 * scale, ly - 0.08 * scale, lz + 2.5 * scale), scale=(1.15 * scale, 0.95 * scale, 0.45 * scale), mat=foliage_mat)
        create_cloud_canopy(f"{name}_Canopy_Side", (lx + 1.20 * scale, ly + 0.65 * scale, lz + 1.75 * scale), scale=(0.95 * scale, 0.80 * scale, 0.38 * scale), mat=foliage_mat)
        create_cloud_canopy(f"{name}_Canopy_Mid", (lx + 0.30 * scale, ly + 0.05 * scale, lz + 2.05 * scale), scale=(0.85 * scale, 0.75 * scale, 0.35 * scale), mat=foliage_mat)
    
    # 7. MATHEMATICAL 3D CRESCENT MOON
    print(">>> Modeling Mathematical 3D Celestial Crescent Moon...")
    def create_3d_crescent_moon(name, loc, R=4.5, d=3.1, depth=1.0, rot_euler=(0, radians(-18), 0), mat=mat_moon_glow):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        r_in = sqrt(d * d + R * R)
        alpha = asin(R / r_in)
        steps = 48
        
        verts_out_f, verts_in_f = [], []
        verts_out_b, verts_in_b = [], []
        
        for i in range(steps + 1):
            t = -1.0 + 2.0 * (i / steps)
            th = (pi / 2.0) * t
            xo = R * cos(th)
            zo = R * sin(th)
            
            phi = alpha * t
            xi = r_in * cos(phi) - d
            zi = r_in * sin(phi)
            
            verts_out_f.append(bm.verts.new((xo, depth / 2.0, zo)))
            verts_out_b.append(bm.verts.new((xo, -depth / 2.0, zo)))
            verts_in_f.append(bm.verts.new((xi, depth / 2.0, zi)))
            verts_in_b.append(bm.verts.new((xi, -depth / 2.0, zi)))
            
        bm.verts.ensure_lookup_table()
        for i in range(steps):
            bm.faces.new([verts_out_f[i], verts_out_f[i+1], verts_in_f[i+1], verts_in_f[i]])
            bm.faces.new([verts_out_b[i+1], verts_out_b[i], verts_in_b[i], verts_in_b[i+1]])
            bm.faces.new([verts_out_f[i], verts_out_b[i], verts_out_b[i+1], verts_out_f[i+1]])
            bm.faces.new([verts_in_f[i+1], verts_in_b[i+1], verts_in_b[i], verts_in_f[i]])
            
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons: p.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = rot_euler
        if mat: obj.data.materials.append(mat)
        return obj
    
    create_3d_crescent_moon('Celestial_Crescent_Moon', (7.8, 27.0, 9.4), R=4.5, d=3.1, depth=1.0, rot_euler=(radians(8), radians(-18), radians(-10)))
    
    # 8. CENTRAL COMBAT ARENA PLATFORM (18m x 7.2m)
    print(">>> Constructing Floating Marble Arena Deck & Magic Seals...")
    add_cube('Arena_Base_Slab', (0.0, 0.0, 0.15), (18.4, 7.6, 0.30), mat_stone_trim)
    add_cube('Arena_Upper_Deck', (0.0, 0.0, 0.32), (18.0, 7.2, 0.15), mat_marble_floor) # Top is at Z = 0.395
    
    # Outer Neon Border
    add_cube('Neon_Rim_Outer_F', (0.0, -3.65, 0.38), (18.2, 0.08, 0.05), mat_neon_violet)
    add_cube('Neon_Rim_Outer_B', (0.0, 3.65, 0.38), (18.2, 0.08, 0.05), mat_neon_violet)
    add_cube('Neon_Rim_Outer_L', (-9.05, 0.0, 0.38), (0.08, 7.4, 0.05), mat_neon_violet)
    add_cube('Neon_Rim_Outer_R', (9.05, 0.0, 0.38), (0.08, 7.4, 0.05), mat_neon_violet)
    
    # Inner Magenta Inset Channel
    add_cube('Neon_Rim_Inner_F', (0.0, -3.2, 0.39), (17.2, 0.04, 0.02), mat_neon_magenta)
    add_cube('Neon_Rim_Inner_B', (0.0, 3.2, 0.39), (17.2, 0.04, 0.02), mat_neon_magenta)
    add_cube('Neon_Rim_Inner_L', (-8.55, 0.0, 0.39), (0.04, 6.4, 0.02), mat_neon_magenta)
    add_cube('Neon_Rim_Inner_R', (8.55, 0.0, 0.39), (0.04, 6.4, 0.02), mat_neon_magenta)
    
    # Top Deck Magic Summoning Texture Overlay Plane
    add_plane('Arena_Magic_Floor_Plane', (0.0, 0.0, 0.405), (17.8, 7.0, 1.0), mat=mat_magic_floor)
    
    # Arena Underside Crag
    def create_arena_underside_crag(name, top_loc, top_size, depth, mat=mat_rock_crag):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        wx, wy = top_size[0] / 2.0, top_size[1] / 2.0
        segments = 16
        top_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            rx = wx * (0.88 + 0.12 * cos(th * 3))
            ry = wy * (0.88 + 0.12 * sin(th * 2))
            top_verts.append(bm.verts.new((rx * cos(th), ry * sin(th), 0.0)))
        
        mid_verts = []
        for i in range(segments):
            th = 2 * pi * i / segments
            rx = wx * 0.65 * (0.85 + 0.15 * sin(th * 4))
            ry = wy * 0.65 * (0.85 + 0.15 * cos(th * 3))
            mid_verts.append(bm.verts.new((rx * cos(th), ry * sin(th), -depth * 0.45)))
            
        bottom_tip = bm.verts.new((0.0, 0.0, -depth))
        bm.verts.ensure_lookup_table()
        for i in range(segments):
            i_next = (i + 1) % segments
            bm.faces.new([top_verts[i], top_verts[i_next], mid_verts[i_next], mid_verts[i]])
            bm.faces.new([mid_verts[i], mid_verts[i_next], bottom_tip])
            
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons: p.use_smooth = False
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = top_loc
        if mat: obj.data.materials.append(mat)
        return obj
    
    create_arena_underside_crag('Arena_Rock_Underside', (0.0, 0.0, 0.0), (18.0, 7.2), depth=14.0)
    
    # Natural hanging crystal clusters under platform
    for i, (cx, cy, cz) in enumerate([(-6.8, -1.2, -3.2), (-4.0, 1.8, -4.5), (0.0, -2.0, -5.8), (4.0, 1.5, -4.6), (6.5, -1.0, -3.4)]):
        create_single_crystal(f'Underside_Amethyst_{i}', (cx, cy, cz), (0.9, 0.9, 1.4), (radians(20), radians(-12 * i), radians(40 * i)), mat=mat_amethyst_crystal)
        create_single_crystal(f'Underside_Cyan_{i}', (cx + 0.5, cy + 0.3, cz - 0.3), (0.6, 0.6, 1.0), (radians(-30), radians(15), radians(55)), mat=mat_cyan_crystal)
    
    # 9. STONE BALUSTRADES & ORNATE CORNER PEDESTAL LANTERNS
    print(">>> Modeling Balustrades & Corner Pedestal Lanterns...")
    def create_balustrade(name, p_start, p_end):
        dx, dy = p_end[0] - p_start[0], p_end[1] - p_start[1]
        length = math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        cx, cy = (p_start[0] + p_end[0]) / 2.0, (p_start[1] + p_end[1]) / 2.0
        top_rail = add_cube(f'{name}_Top', (cx, cy, 1.15), (length, 0.18, 0.12), mat_stone_trim)
        top_rail.rotation_euler = (0, 0, angle)
        bot_rail = add_cube(f'{name}_Bot', (cx, cy, 0.48), (length, 0.22, 0.14), mat_stone_trim)
        bot_rail.rotation_euler = (0, 0, angle)
        num_posts = max(2, int(length / 0.85) + 1)
        for i in range(num_posts):
            t = i / (num_posts - 1)
            px = p_start[0] + dx * t
            py = p_start[1] + dy * t
            add_cylinder(f'{name}_Baluster_{i}', (px, py, 0.82), radius=0.08, depth=0.58, mat=mat_stone_dark, vertices=12)
    
    create_balustrade('Balustrade_Left', (-8.9, -3.5), (-8.9, 3.5))
    create_balustrade('Balustrade_Right', (8.9, -3.5), (8.9, 3.5))
    create_balustrade('Balustrade_Rear_L', (-8.9, 3.55), (-3.2, 3.55))
    create_balustrade('Balustrade_Rear_R', (3.2, 3.55), (8.9, 3.55))
    
    def create_pedestal_lantern(name, loc):
        x, y, z = loc
        add_cube(f'{name}_Base', (x, y, z + 0.45), (0.55, 0.55, 0.9), mat_stone_trim)
        add_cube(f'{name}_Cap', (x, y, z + 0.95), (0.65, 0.65, 0.10), mat_stone_dark)
        add_cube(f'{name}_Cage', (x, y, z + 1.25), (0.42, 0.42, 0.52), mat_bronze)
        add_cube(f'{name}_Flame', (x, y, z + 1.25), (0.28, 0.28, 0.38), mat_lantern_flame)
        # Pagoda tiered roof
        add_cube(f'{name}_Lid', (x, y, z + 1.55), (0.60, 0.60, 0.10), mat_stone_trim)
        add_cube(f'{name}_Lid_Peak', (x, y, z + 1.64), (0.35, 0.35, 0.08), mat_stone_dark)
        add_cylinder(f'{name}_Finial', (x, y, z + 1.74), radius=0.05, depth=0.14, mat=mat_bronze)
        p_light = bpy.data.lights.new(name=f'{name}_Light', type='POINT')
        p_light.energy = 160
        p_light.color = (1.0, 0.74, 0.30)
        if hasattr(p_light, 'shadow_soft_size'): p_light.shadow_soft_size = 0.5
        obj_l = bpy.data.objects.new(f'{name}_Light', p_light)
        obj_l.location = (x, y, z + 1.25)
        bpy.context.collection.objects.link(obj_l)
    
    for p_loc in [(-8.9, -3.5, 0.3), (-8.9, 3.55, 0.3), (8.9, -3.5, 0.3), (8.9, 3.55, 0.3), (-3.2, 3.55, 0.3), (3.2, 3.55, 0.3)]:
        create_pedestal_lantern(f'Lantern_{p_loc[0]}_{p_loc[1]}', p_loc)
    
    # 10. FLANKING MONOLITH RUNE PILLARS ON SIDES OF STAGE (Authentic Concept Art Framing)
    print(">>> Adding Flanking Monolith Rune Pillars & Side Pedestals...")
    def create_rune_monolith(name, loc, height=3.0, mat_body=mat_obelisk, mat_cap=mat_stone_trim, crystal_mat=mat_cyan_crystal):
        x, y, z = loc
        add_cube(f'{name}_Base', (x, y, z + 0.4), (0.85, 0.85, 0.8), mat_stone_dark)
        add_cube(f'{name}_Body', (x, y, z + 0.4 + height/2.0), (0.68, 0.68, height), mat_body)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.52, depth=0.6, location=(x, y, z + 0.4 + height + 0.3), rotation=(0,0,radians(45)))
        c_obj = bpy.context.active_object
        c_obj.name = f'{name}_Cap'
        c_obj.data.materials.append(mat_cap)
        if crystal_mat:
            create_single_crystal(f'{name}_Gem', (x, y, z + 0.4 + height + 0.85), (0.45, 0.45, 0.65), (0, 0, radians(20)), mat=crystal_mat)
    
    # Left stage side rune monolith
    create_rune_monolith('Left_Stage_Monolith', (-8.8, 1.2, 0.4), height=2.8, mat_body=mat_obelisk, crystal_mat=mat_cyan_crystal)
    
    # Right stage side rune monoliths (twin pillars as in reference)
    create_rune_monolith('Right_Stage_Monolith_1', (8.8, 1.2, 0.4), height=2.8, mat_body=mat_obelisk, crystal_mat=mat_cyan_crystal)
    create_rune_monolith('Right_Stage_Monolith_2', (8.8, -1.5, 0.4), height=2.4, mat_body=mat_obelisk, crystal_mat=mat_amethyst_crystal)
    # Glowing cyan crystal cluster nestled between the right pillars
    create_crystal_geode_cluster('Right_Side_Crystals', (8.7, -0.1, 0.45), base_height=1.8, num_shards=3, mat=mat_cyan_crystal, seed=77)
    
    # 11. GRAND FRONT STAIRCASE & DAIS
    print(">>> Modeling Grand Front Staircase & Landing...")
    num_front_steps = 7
    for s in range(num_front_steps):
        sy = -3.7 - s * 0.75
        sz = 0.30 - s * 0.45
        sw = 5.2 + s * 0.35
        add_cube(f'Front_Step_{s}', (0.0, sy, sz), (sw, 0.78, 0.46), mat_marble_floor)
    
    # Semicircular landing dais on front stairs
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=2.4, depth=0.35, location=(0.0, -3.9, 0.15))
    mid_dais = bpy.context.active_object
    mid_dais.name = 'Front_Mid_Dais'
    mid_dais.data.materials.append(mat_stone_trim)
    add_plane('Front_Mid_Seal', (0.0, -3.9, 0.34), (2.2, 2.2, 1.0), mat=mat_temple_seal)
    
    add_cube('Front_Landing_Dais', (0.0, -8.6, -3.0), (7.5, 2.2, 0.4), mat_stone_trim)
    add_plane('Front_Landing_Seal', (0.0, -8.6, -2.78), (2.1, 2.1, 1.0), mat=mat_temple_seal)
    create_pedestal_lantern('Lantern_Front_L', (-3.4, -8.6, -2.9))
    create_pedestal_lantern('Lantern_Front_R', (3.4, -8.6, -2.9))
    
    # 12. REAR ELEVATED ASTRAL TEMPLE PAVILION
    print(">>> Constructing Rear Elevated Temple Pavilion & Colonnade...")
    for s in range(5):
        sy = 3.8 + s * 0.65
        sz = 0.45 + s * 0.32
        add_cube(f'Rear_Step_{s}', (0.0, sy, sz), (4.8, 0.68, 0.34), mat_marble_floor)
    
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=5.6, depth=0.4, location=(0.0, 11.5, 1.8))
    terrace = bpy.context.active_object
    terrace.name = 'Temple_Terrace_Deck'
    terrace.data.materials.append(mat_marble_floor)
    
    add_plane('Temple_Seal_Plane', (0.0, 11.5, 2.02), (4.8, 4.8, 1.0), mat=mat_temple_seal)
    
    col_rad = 4.8
    num_cols = 6
    for c in range(num_cols):
        ang = pi * (0.15 + 0.70 * c / (num_cols - 1))
        cx = col_rad * cos(ang)
        cy = 11.5 + col_rad * sin(ang)
        add_cube(f'Temple_Col_Base_{c}', (cx, cy, 2.2), (0.95, 0.95, 0.4), mat_stone_dark)
        add_cylinder(f'Temple_Col_Shaft_{c}', (cx, cy, 5.2), radius=0.42, depth=5.6, mat=mat_marble_floor, vertices=18)
        add_cube(f'Temple_Col_Cap_{c}', (cx, cy, 8.1), (0.98, 0.98, 0.4), mat_stone_trim)
    
    add_cylinder('Temple_Entablature_Ring', (0.0, 11.5, 8.4), radius=col_rad, depth=0.45, mat=mat_stone_dark, vertices=32)
    
    # Central Classical Archway
    add_cube('Temple_Arch_Col_L', (-2.0, 9.2, 5.5), (0.85, 0.85, 6.8), mat_stone_dark)
    add_cube('Temple_Arch_Col_R', (2.0, 9.2, 5.5), (0.85, 0.85, 6.8), mat_stone_dark)
    add_cube('Temple_Arch_Lintel', (0.0, 9.2, 9.1), (5.0, 0.90, 0.65), mat_stone_trim)
    
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.8, depth=1.4, location=(0.0, 9.2, 9.9), rotation=(0, 0, radians(45)))
    pediment = bpy.context.active_object
    pediment.name = 'Temple_Pediment_Peak'
    pediment.scale = (1.0, 0.4, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    pediment.data.materials.append(mat_stone_dark)
    
    # Cyan Faceted Gem Crystal Pendant & Bronze Chain
    create_single_crystal('Temple_Arch_Pendant', (0.0, 9.2, 7.8), (0.65, 0.65, 1.6), (0, 0, radians(15)), mat=mat_cyan_crystal)
    add_cylinder('Pendant_Chain', (0.0, 9.2, 8.7), radius=0.03, depth=0.8, mat=mat_bronze)
    
    # Small amethyst diamond inset on pediment
    create_single_crystal('Pediment_Amethyst_Gem', (0.0, 9.0, 9.7), (0.35, 0.35, 0.65), (radians(45), 0, 0), mat=mat_amethyst_crystal)
    
    # 4 Temple Stairs Obelisks
    obelisk_coords = [(-3.2, 5.5), (-5.8, 8.0), (3.2, 5.5), (5.8, 8.0)]
    for i, (ox, oy) in enumerate(obelisk_coords):
        create_rune_monolith(f'Temple_Obelisk_{i}', (ox, oy, 0.8), height=2.6, crystal_mat=mat_cyan_crystal if i % 2 == 0 else mat_amethyst_crystal)
    
    # 13. REALISTIC 360-DEGREE SURROUNDINGS (Organic Floating Islands, Mineral Geodes & Sakura Tree)
    print(">>> Constructing Realistic Organic Floating Islands & Natural Geodes...")
    
    # --- LEFT FLANK PRIMARY ISLAND: The Amethyst Geode Sanctuary ---
    # Positioned naturally in the mid-left to frame the front combat view without blocking profiles
    create_organic_floating_island('Island_Left_Primary', (-13.2, 4.5, 3.2), rx=3.6, ry=3.2, depth=6.8, seed=42)
    # Majestic mineral geode crystal cluster on top
    create_crystal_geode_cluster('Left_Geode_Main', (-13.2, 4.5, 3.6), base_height=3.8, num_shards=5, mat=mat_amethyst_crystal, seed=12)
    # Hanging cyan crystal droplets under the crag
    create_single_crystal('Left_Hanging_Cyan_1', (-13.0, 4.8, -0.5), (0.55, 0.55, 1.0), (radians(15), radians(-10), radians(30)), mat=mat_cyan_crystal)
    create_single_crystal('Left_Hanging_Cyan_2', (-13.5, 4.2, -1.2), (0.45, 0.45, 0.8), (radians(-20), radians(15), radians(-40)), mat=mat_cyan_crystal)
    
    # Left Forward Satellite Rock
    create_organic_floating_island('Island_Left_Forward', (-12.8, -6.5, -2.5), rx=2.5, ry=2.2, depth=4.8, seed=67)
    create_crystal_geode_cluster('Left_Forward_Geode', (-12.8, -6.5, -2.3), base_height=2.2, num_shards=3, mat=mat_amethyst_crystal, seed=44)
    create_pedestal_lantern('Lantern_Island_Left', (-13.2, -6.0, -2.4))
    
    # Left Distant High Asteroid
    create_organic_floating_island('Island_Left_High', (-17.5, 15.0, 8.5), rx=2.8, ry=2.5, depth=5.5, seed=89)
    create_celestial_bonsai_tree('Left_Distant_Tree', (-17.5, 15.0, 8.8), scale=0.9, foliage_mat=mat_emerald_canopy)
    create_single_crystal('Left_Distant_Spire', (-16.8, 15.4, 9.0), (0.7, 0.7, 2.2), (radians(5), radians(-5), radians(15)), mat=mat_amethyst_crystal)
    
    # --- RIGHT FLANK PRIMARY ISLAND: The Celestial Sakura Sanctuary ---
    # Positioned in mid-right to frame the right side of the arena
    create_organic_floating_island('Island_Right_Primary', (14.2, 5.0, 3.4), rx=4.0, ry=3.5, depth=7.2, seed=55)
    # Flowering Japanese Cloud Sakura Tree
    create_celestial_bonsai_tree('Right_Sakura_Tree', (14.2, 5.5, 3.8), scale=1.1, foliage_mat=mat_sakura_canopy)
    # Towering Amethyst Crystal Spire standing gracefully beside the tree
    create_crystal_geode_cluster('Right_Geode_Main', (12.8, 4.5, 3.8), base_height=3.6, num_shards=4, mat=mat_amethyst_crystal, seed=88)
    # Traditional stone lantern on island
    create_pedestal_lantern('Lantern_Island_Right', (14.8, 3.8, 3.7))
    # Hanging cyan crystal droplets under the crag
    create_single_crystal('Right_Hanging_Cyan_1', (14.0, 5.2, -0.6), (0.55, 0.55, 1.1), (radians(-15), radians(12), radians(-25)), mat=mat_cyan_crystal)
    create_single_crystal('Right_Hanging_Cyan_2', (14.6, 4.6, -1.3), (0.45, 0.45, 0.85), (radians(22), radians(-18), radians(45)), mat=mat_cyan_crystal)
    
    # Right Forward Satellite Rock
    create_organic_floating_island('Island_Right_Forward', (13.0, -6.8, -2.8), rx=2.6, ry=2.2, depth=4.8, seed=33)
    create_crystal_geode_cluster('Right_Forward_Geode', (13.0, -6.8, -2.6), base_height=2.2, num_shards=3, mat=mat_cyan_crystal, seed=29)
    
    # Right Distant High Asteroid
    create_organic_floating_island('Island_Right_High', (18.0, 16.0, 8.2), rx=3.0, ry=2.6, depth=5.8, seed=73)
    create_single_crystal('Right_Distant_Crystal', (18.0, 16.0, 8.5), (0.85, 0.85, 2.8), (radians(6), radians(4), radians(-20)), mat=mat_magenta_crystal)
    
    # Floating Cosmic Sakura Petals (Subtle glowing 3D particles drifting in astral space)
    def create_floating_petal(name, loc, rot):
        bpy.ops.mesh.primitive_circle_add(vertices=6, radius=0.18, fill_type='NGON', location=loc, rotation=rot)
        petal = bpy.context.active_object
        petal.name = name
        petal.scale = (1.0, 0.5, 0.1)
        bpy.ops.object.transform_apply(scale=True)
        petal.data.materials.append(mat_sakura_petal)
    
    petal_locs = [
        (11.5, 2.5, 2.8), (12.2, -1.0, 1.8), (9.8, 0.5, 2.2), (13.0, 1.2, 3.5),
        (10.5, -2.8, 1.2), (-10.2, 1.5, 2.5), (-11.5, -1.0, 2.0), (6.5, 3.2, 2.6)
    ]
    for p_idx, ploc in enumerate(petal_locs):
        create_floating_petal(f"Sakura_Petal_{p_idx}", ploc, (radians(random.uniform(0, 360)), radians(random.uniform(0, 360)), radians(random.uniform(0, 360))))
    
    # 14. LIGHTING RIG
    print(">>> Configuring 3D Celestial Lighting Rig...")
    l_moon = bpy.data.lights.new(name='Light_Moon_Sun', type='SUN')
    l_moon.energy = 1.8
    l_moon.color = (0.82, 0.92, 1.0)
    obj_moon_light = bpy.data.objects.new('Light_Moon_Sun', l_moon)
    obj_moon_light.rotation_euler = (radians(48), radians(-22), radians(-35))
    bpy.context.collection.objects.link(obj_moon_light)
    
    l_key = bpy.data.lights.new(name='Light_Violet_Key', type='AREA')
    l_key.energy = 2600
    l_key.color = (0.82, 0.20, 1.0)
    if hasattr(l_key, 'size'): l_key.size = 20.0
    obj_l_key = bpy.data.objects.new('Light_Violet_Key', l_key)
    obj_l_key.location = (-7.0, -8.0, 10.0)
    obj_l_key.rotation_euler = (radians(45), radians(-18), radians(15))
    bpy.context.collection.objects.link(obj_l_key)
    
    l_fill = bpy.data.lights.new(name='Light_Cyan_Fill', type='AREA')
    l_fill.energy = 2200
    l_fill.color = (0.10, 0.85, 1.0)
    if hasattr(l_fill, 'size'): l_fill.size = 20.0
    obj_l_fill = bpy.data.objects.new('Light_Cyan_Fill', l_fill)
    obj_l_fill.location = (8.0, 6.0, 9.0)
    obj_l_fill.rotation_euler = (radians(55), radians(20), radians(-25))
    bpy.context.collection.objects.link(obj_l_fill)
    
    l_chasm = bpy.data.lights.new(name='Light_Chasm_Up', type='AREA')
    l_chasm.energy = 3800
    l_chasm.color = (0.35, 0.08, 0.70)
    if hasattr(l_chasm, 'size'): l_chasm.size = 40.0
    obj_l_chasm = bpy.data.objects.new('Light_Chasm_Up', l_chasm)
    obj_l_chasm.location = (0.0, 6.0, -18.0)
    obj_l_chasm.rotation_euler = (radians(-80), 0, 0)
    bpy.context.collection.objects.link(obj_l_chasm)
    
    # 15. MULTI-ANGLE CAMERAS (5 Standard Verification Viewpoints)
    print(">>> Setting up 5 Multi-Angle Verification Cameras...")
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
    total_w = cam_dist * (sensor_w / cam_lens) # 18.0m
    total_h = total_w * (9.0 / 16.0)          # 10.125m
    cam_z = (0.5 - 0.29) * total_h + 0.35      # 2.476m
    
    add_camera('cam_front', 'Camera_01_Front_Combat', (0.0, -cam_dist, cam_z), (radians(90.0), 0, 0), lens=40.0)
    add_camera('cam_left_profile', 'Camera_02_Left_Profile', (-16.5, -2.5, 2.6), (radians(85.0), 0, radians(-72.0)), lens=30.0)
    add_camera('cam_isometric_aerial', 'Camera_03_Isometric_Aerial', (-20.0, -16.0, 22.0), (radians(52.0), 0, radians(-48.0)), lens=28.0)
    add_camera('cam_right_perspective', 'Camera_04_Right_Perspective', (16.5, -14.0, 6.2), (radians(70.0), 0, radians(48.0)), lens=32.0)
    add_camera('cam_low_angle_hero', 'Camera_05_Low_Angle_Hero', (0.0, -10.5, 0.8), (radians(82.0), 0, 0), lens=26.0)
    
    # 16. SAVE, EXPORT, RENDER
    print(">>> Saving .blend, exporting .glb, and rendering all views...")
    blend_path = os.path.join(out_dir, 'KeyFury_3D_CelestialVoid_True3D.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f">>> [Saved Blend File]: {blend_path}")
    
    glb_path = os.path.join(out_dir, 'KeyFury_3D_CelestialVoid_True3D.glb')
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
    print(f">>> [Exported GLB File]: {glb_path}")
    
    render_outputs = {
        'cam_front': os.path.join(out_dir, 'celestial_void_render_front.png'),
        'cam_left_profile': os.path.join(out_dir, 'celestial_void_render_left_profile.png'),
        'cam_isometric_aerial': os.path.join(out_dir, 'celestial_void_render_isometric_aerial.png'),
        'cam_right_perspective': os.path.join(out_dir, 'celestial_void_render_right_perspective.png'),
        'cam_low_angle_hero': os.path.join(out_dir, 'celestial_void_render_low_angle.png')
    }
    
    for cam_id, r_path in render_outputs.items():
        cam_obj = cameras_dict[cam_id]
        scene.camera = cam_obj
        scene.render.filepath = r_path
        print(f">>> Rendering {cam_id} -> {r_path}...")
        bpy.ops.render.render(write_still=True)
        print(f">>> Completed render: {r_path}")
    
    print(">>> [KeyFury 3D Celestial Void v2] ALL 5 VIEWS RENDERED WITH REALISTIC SIDES!")
except Exception as e:
    with open(r'd:\Keyboard stickman warrior\test_3d\celestial_err.txt', 'w') as ef:
        ef.write(traceback.format_exc())

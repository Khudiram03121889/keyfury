import bpy
import os
import traceback

out_log = r"d:\Keyboard stickman warrior\test_3d\gltf_debug_log.txt"
work_dir = r"d:\Keyboard stickman warrior\test_3d"

try:
    SOURCE_BLEND = os.path.join(work_dir, "KeyFury_3D_CyberRooftop_BACKUP_4FIGHTERS.blend")
    bpy.ops.wm.open_mainfile(filepath=SOURCE_BLEND)

    def load_and_pack_img(img_name, filename, is_non_color=False):
        fpath = os.path.join(work_dir, filename)
        if not os.path.exists(fpath):
            raise FileNotFoundError(f"Missing texture: {fpath}")
        
        img = bpy.data.images.get(img_name)
        if not img:
            img = bpy.data.images.load(fpath)
            img.name = img_name
        else:
            img.filepath = fpath
            img.reload()
            
        if is_non_color:
            img.colorspace_settings.name = 'Non-Color'
        else:
            img.colorspace_settings.name = 'sRGB'
            
        img.pack()
        return img

    def build_pbr_mat(mat_name, img_col, img_nrm, img_emi, metallic=0.15, roughness=0.35, spec=0.45, nrm_str=0.80, emit_str=3.8, diffuse_tint=(1.0, 1.0, 1.0, 1.0)):
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
        nrm_node.inputs['Strength'].default_value = nrm_str
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

    web_dir = r"d:\Keyboard stickman warrior\apps\web\public\assets\3d"
    configs = [
        {
            "mesh_name": "Shadow_Ronin",
            "arm_name": "Shadow_Ronin_Rig",
            "glb_name": "Shadow_Ronin.glb",
            "mat_prefix": "Mat_Ronin",
            "front_col": "ronin_turnaround_front_master.png",
            "front_nrm": "ronin_turnaround_front_normal.png",
            "front_emi": "ronin_turnaround_front_emission.png",
            "back_col": "ronin_turnaround_back_master.png",
            "back_nrm": "ronin_turnaround_back_normal.png",
            "back_emi": "ronin_turnaround_back_emission.png",
            "side_col": "ronin_turnaround_side_master.png",
            "side_nrm": "ronin_turnaround_side_normal.png",
            "side_emi": "ronin_turnaround_side_emission.png",
            "metallic": 0.15, "roughness": 0.35, "emit_str": 3.8,
            "fix_polys": True
        },
        {
            "mesh_name": "Cyber_Valkyrie",
            "arm_name": "Cyber_Valkyrie_Rig",
            "glb_name": "Cyber_Valkyrie.glb",
            "mat_prefix": "Mat_Valkyrie",
            "front_col": "valk_turnaround_front_master.png",
            "front_nrm": "valk_turnaround_front_normal.png",
            "front_emi": "valk_turnaround_front_emission.png",
            "back_col": "valk_turnaround_back_master.png",
            "back_nrm": "valk_turnaround_back_normal.png",
            "back_emi": "valk_turnaround_back_emission.png",
            "side_col": "valk_clean_side.png",
            "side_nrm": "valk_turnaround_side_normal.png",
            "side_emi": "valk_turnaround_side_emission.png",
            "metallic": 0.22, "roughness": 0.40, "emit_str": 3.5,
            "fix_polys": True
        },
        {
            "mesh_name": "Volt_Shinobi",
            "arm_name": "Volt_Shinobi_Rig",
            "glb_name": "Volt_Shinobi.glb",
            "mat_prefix": "Mat_Shinobi",
            "front_col": "shinobi_turnaround_front_master.png",
            "front_nrm": "shinobi_turnaround_front_normal.png",
            "front_emi": "shinobi_turnaround_front_emission.png",
            "back_col": "shinobi_turnaround_back_master.png",
            "back_nrm": "shinobi_turnaround_back_normal.png",
            "back_emi": "shinobi_turnaround_back_emission.png",
            "side_col": "shinobi_turnaround_side_master.png",
            "side_nrm": "shinobi_turnaround_side_normal.png",
            "side_emi": "shinobi_turnaround_side_emission.png",
            "metallic": 0.18, "roughness": 0.38, "emit_str": 3.6,
            "fix_polys": True
        },
        {
            "mesh_name": "Void_Assassin",
            "arm_name": "Void_Assassin_Rig",
            "glb_name": "Void_Assassin.glb",
            "mat_prefix": "Mat_Void",
            "front_col": "void_turnaround_front_master.png",
            "front_nrm": "void_turnaround_front_normal.png",
            "front_emi": "void_turnaround_front_emission.png",
            "back_col": "void_turnaround_back_master.png",
            "back_nrm": "void_turnaround_back_normal.png",
            "back_emi": "void_turnaround_back_emission.png",
            "side_col": "void_turnaround_side_master.png",
            "side_nrm": "void_turnaround_side_normal.png",
            "side_emi": "void_turnaround_side_emission.png",
            "metallic": 0.15, "roughness": 0.35, "emit_str": 3.8,
            "fix_polys": True
        },
    ]

    with open(out_log, "w", encoding="utf-8") as out:
        out.write("=== MASTER TEXTURED 4-FIGHTER EXPORT ===\n\n")

    win = bpy.context.window_manager.windows[0]

    for cfg in configs:
        mesh_obj = bpy.data.objects.get(cfg["mesh_name"])
        arm_obj = bpy.data.objects.get(cfg["arm_name"])
        if not mesh_obj or not arm_obj:
            with open(out_log, "a", encoding="utf-8") as out:
                out.write(f"SKIP {cfg['mesh_name']}: missing object\n")
            continue

        p = cfg["mat_prefix"]
        img_f_col = load_and_pack_img(f"{p}_f_col", cfg["front_col"])
        img_f_nrm = load_and_pack_img(f"{p}_f_nrm", cfg["front_nrm"], is_non_color=True)
        img_f_emi = load_and_pack_img(f"{p}_f_emi", cfg["front_emi"])

        img_b_col = load_and_pack_img(f"{p}_b_col", cfg["back_col"])
        img_b_nrm = load_and_pack_img(f"{p}_b_nrm", cfg["back_nrm"], is_non_color=True)
        img_b_emi = load_and_pack_img(f"{p}_b_emi", cfg["back_emi"])

        img_s_col = load_and_pack_img(f"{p}_s_col", cfg["side_col"])
        img_s_nrm = load_and_pack_img(f"{p}_s_nrm", cfg["side_nrm"], is_non_color=True)
        img_s_emi = load_and_pack_img(f"{p}_s_emi", cfg["side_emi"])

        mat_f = build_pbr_mat(f"{p}_FrontPBR", img_f_col, img_f_nrm, img_f_emi, metallic=cfg["metallic"], roughness=cfg["roughness"], emit_str=cfg["emit_str"])
        mat_b = build_pbr_mat(f"{p}_BackPBR", img_b_col, img_b_nrm, img_b_emi, metallic=cfg["metallic"], roughness=cfg["roughness"], emit_str=cfg["emit_str"])
        mat_s = build_pbr_mat(f"{p}_SidePBR", img_s_col, img_s_nrm, img_s_emi, metallic=cfg["metallic"], roughness=cfg["roughness"], emit_str=cfg["emit_str"])

        mesh_obj.data.materials.clear()
        mesh_obj.data.materials.append(mat_f)
        mesh_obj.data.materials.append(mat_b)
        mesh_obj.data.materials.append(mat_s)

        if cfg.get("fix_polys"):
            for poly in mesh_obj.data.polygons:
                if poly.normal.y > 0.05:
                    poly.material_index = 1
                elif poly.normal.y < -0.05:
                    poly.material_index = 0
                else:
                    poly.material_index = 2

        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        arm_obj.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj

        target_web = os.path.join(web_dir, cfg["glb_name"])
        target_test = os.path.join(work_dir, cfg["glb_name"])

        for t_path in [target_web, target_test]:
            with bpy.context.temp_override(window=win, screen=win.screen):
                bpy.ops.export_scene.gltf(
                    filepath=t_path,
                    export_format='GLB',
                    use_selection=True,
                    export_apply=False,
                    export_skins=True,
                    export_materials='EXPORT',
                    export_image_format='AUTO',
                    export_cameras=False,
                    export_lights=False
                )
        with open(out_log, "a", encoding="utf-8") as out:
            out.write(f"Exported {cfg['glb_name']}: {os.path.getsize(target_web):,} bytes\n")

    bpy.ops.wm.save_as_mainfile(filepath=SOURCE_BLEND)
    with open(out_log, "a", encoding="utf-8") as out:
        out.write("\n>>> Saved Master Blend with packed PBR textures!\n")

except Exception as e:
    with open(out_log, "a", encoding="utf-8") as out:
        out.write(traceback.format_exc())

print(">>> MASTER EXPORT SCRIPT DONE")






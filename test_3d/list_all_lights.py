import bpy

bpy.ops.wm.open_mainfile(filepath=r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend1")

with open(r"D:\Keyboard stickman warrior\test_3d\scene_lights_info.txt", "w") as f:
    f.write("=== LIGHTS ===\n")
    for o in bpy.data.objects:
        if o.type == 'LIGHT':
            f.write(f"{o.name:<28} type={o.data.type:<6} energy={o.data.energy:<8.1f} color={tuple(round(c, 3) for c in o.data.color)} loc={tuple(round(v, 2) for v in o.location)}\n")
    f.write("\n=== MATERIALS ON CYBER VALKYRIE ===\n")
    valk = bpy.data.objects.get("Cyber_Valkyrie")
    if valk:
        for slot in valk.material_slots:
            mat = slot.material
            f.write(f"Slot {slot.name} -> Mat: {mat.name if mat else 'None'}\n")
            if mat and mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image:
                        f.write(f"   TexImage: {node.name} -> {node.image.filepath}\n")
                    elif node.type == 'BSDF_PRINCIPLED':
                        met = node.inputs['Metallic'].default_value if not node.inputs['Metallic'].links else 'LINKED'
                        rough = node.inputs['Roughness'].default_value if not node.inputs['Roughness'].links else 'LINKED'
                        spec = node.inputs['Specular IOR Level'].default_value if 'Specular IOR Level' in node.inputs and not node.inputs['Specular IOR Level'].links else 'N/A'
                        f.write(f"   BSDF: Metallic={met}, Roughness={rough}, Spec={spec}\n")
    f.write("\n=== MATERIALS ON SHADOW RONIN ===\n")
    ronin = bpy.data.objects.get("Shadow_Ronin")
    if ronin:
        for slot in ronin.material_slots:
            mat = slot.material
            f.write(f"Slot {slot.name} -> Mat: {mat.name if mat else 'None'}\n")
            if mat and mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image:
                        f.write(f"   TexImage: {node.name} -> {node.image.filepath}\n")
                    elif node.type == 'BSDF_PRINCIPLED':
                        met = node.inputs['Metallic'].default_value if not node.inputs['Metallic'].links else 'LINKED'
                        rough = node.inputs['Roughness'].default_value if not node.inputs['Roughness'].links else 'LINKED'
                        spec = node.inputs['Specular IOR Level'].default_value if 'Specular IOR Level' in node.inputs and not node.inputs['Specular IOR Level'].links else 'N/A'
                        f.write(f"   BSDF: Metallic={met}, Roughness={rough}, Spec={spec}\n")

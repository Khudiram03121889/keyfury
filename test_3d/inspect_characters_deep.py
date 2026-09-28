import bpy
import json
import os

blend_path = r"D:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop.blend1"
bpy.ops.wm.open_mainfile(filepath=blend_path)

fighters = ["Shadow_Ronin", "Volt_Shinobi", "Void_Assassin", "Cyber_Valkyrie"]
report = {}

for name in fighters:
    obj = bpy.data.objects.get(name)
    if not obj:
        report[name] = "MISSING"
        continue
    
    f_data = {
        "location": [round(v, 4) for v in obj.location],
        "rotation": [round(v, 4) for v in obj.rotation_euler],
        "dimensions": [round(v, 4) for v in obj.dimensions],
        "modifiers": [m.type for m in obj.modifiers],
        "children": [c.name for c in obj.children],
        "materials": []
    }
    
    mesh = obj.data
    f_data["num_vertices"] = len(mesh.vertices)
    f_data["num_polygons"] = len(mesh.polygons)
    f_data["uv_layers"] = [uv.name for uv in mesh.uv_layers]
    
    y_coords = [v.co.y for v in mesh.vertices]
    z_coords = [v.co.z for v in mesh.vertices]
    x_coords = [v.co.x for v in mesh.vertices]
    f_data["x_min_max"] = (round(min(x_coords), 4), round(max(x_coords), 4))
    f_data["y_min_max"] = (round(min(y_coords), 4), round(max(y_coords), 4))
    f_data["z_min_max"] = (round(min(z_coords), 4), round(max(z_coords), 4))
    
    for slot in obj.material_slots:
        mat = slot.material
        if not mat:
            continue
        m_info = {
            "name": mat.name,
            "blend_method": getattr(mat, "blend_method", "UNKNOWN"),
            "diffuse_color": [round(v, 4) for v in mat.diffuse_color],
            "nodes": []
        }
        if mat.use_nodes and mat.node_tree:
            for node in mat.node_tree.nodes:
                node_entry = {"type": node.type, "name": node.name}
                if node.type == 'TEX_IMAGE' and node.image:
                    node_entry["image"] = node.image.name
                    node_entry["filepath"] = node.image.filepath
                    node_entry["colorspace"] = node.image.colorspace_settings.name
                elif node.type == 'BSDF_PRINCIPLED':
                    inputs = {}
                    for inp in node.inputs:
                        if inp.links:
                            inputs[inp.name] = f"LINKED from {inp.links[0].from_node.name}.{inp.links[0].from_socket.name}"
                        else:
                            if hasattr(inp, 'default_value'):
                                val = inp.default_value
                                if hasattr(val, '__iter__'):
                                    inputs[inp.name] = [round(v, 4) if isinstance(v, float) else v for v in val]
                                else:
                                    inputs[inp.name] = round(val, 4) if isinstance(val, float) else val
                    node_entry["bsdf_inputs"] = inputs
                m_info["nodes"].append(node_entry)
        f_data["materials"].append(m_info)
    
    report[name] = f_data

out_path = r"D:\Keyboard stickman warrior\test_3d\deep_inspect_report.json"
with open(out_path, "w") as f:
    json.dump(report, f, indent=2)

print("Saved report to deep_inspect_report.json")

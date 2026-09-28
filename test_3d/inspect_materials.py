import bpy
import os

blend_path = r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_True3D.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

out_lines = []
out_lines.append("=== OBJECTS & MATERIALS ===")
for obj in bpy.data.objects:
    if "Lavafall" in obj.name or "Fury" in obj.name or "Platform" in obj.name:
        mats = [m.name for m in obj.data.materials if m] if hasattr(obj.data, 'materials') else []
        out_lines.append(f"Obj: {obj.name}, Mats: {mats}")

out_lines.append("\n=== MAT_LAVAFALL_FLOWING NODES ===")
mat = bpy.data.materials.get('Mat_Lavafall_Flowing')
if mat and mat.use_nodes:
    for node in mat.node_tree.nodes:
        out_lines.append(f"Node: {node.name} ({node.type})")
        for inp in node.inputs:
            links = [f"<- {l.from_node.name}.{l.from_socket.name}" for l in inp.links]
            if links:
                out_lines.append(f"   In: {inp.name} ({inp.identifier}) {links}")
            elif hasattr(inp, 'default_value'):
                out_lines.append(f"   In: {inp.name} ({inp.identifier}) = {inp.default_value}")

out_lines.append("\n=== MAT_MOUNTAIN_ROCK NODES ===")
mat_m = bpy.data.materials.get('Mat_Mountain_Rock')
if mat_m and mat_m.use_nodes:
    for node in mat_m.node_tree.nodes:
        if node.type in ['BSDF_PRINCIPLED', 'BUMP', 'EMISSION']:
            out_lines.append(f"Node: {node.name} ({node.type})")
            for inp in node.inputs:
                links = [f"<- {l.from_node.name}.{l.from_socket.name}" for l in inp.links]
                if links:
                    out_lines.append(f"   In: {inp.name} ({inp.identifier}) {links}")
                elif hasattr(inp, 'default_value'):
                    out_lines.append(f"   In: {inp.name} ({inp.identifier}) = {inp.default_value}")

out_path = r"d:\Keyboard stickman warrior\test_3d\inspect_mats_out.txt"
with open(out_path, "w") as f:
    f.write("\n".join(out_lines))
print("Wrote inspect_mats_out.txt successfully!")

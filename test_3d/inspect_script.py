import bpy
import os

out_path = r"d:\Keyboard stickman warrior\test_3d\inspect_out.txt"
lines = []
lines.append("BLENDER VERSION: " + bpy.app.version_string)

m = bpy.data.materials.new('test_mix')
m.use_nodes = True
n = m.node_tree.nodes.new('ShaderNodeMix')
n.data_type = 'FLOAT'
lines.append("=== MIX FLOAT INPUTS ===")
for i, inp in enumerate(n.inputs):
    lines.append(f"Input {i}: name='{inp.name}', identifier='{inp.identifier}', type='{inp.type}'")
lines.append("=== MIX FLOAT OUTPUTS ===")
for i, out in enumerate(n.outputs):
    lines.append(f"Output {i}: name='{out.name}', identifier='{out.identifier}'")

n_col = m.node_tree.nodes.new('ShaderNodeMix')
n_col.data_type = 'RGBA'
lines.append("=== MIX RGBA INPUTS ===")
for i, inp in enumerate(n_col.inputs):
    lines.append(f"Input {i}: name='{inp.name}', identifier='{inp.identifier}', type='{inp.type}'")

with open(out_path, "w") as f:
    f.write("\n".join(lines))

print("Wrote inspect_out.txt successfully!")

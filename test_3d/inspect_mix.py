import subprocess
blender_exe = r"C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\blender-launcher.exe"
code = """
import bpy
m = bpy.data.materials.new('test')
m.use_nodes = True
n = m.node_tree.nodes.new('ShaderNodeMix')
n.data_type = 'FLOAT'
print('=== MIX FLOAT INPUTS ===')
for i, inp in enumerate(n.inputs):
    print(f'Input {i}: name="{inp.name}", id="{inp.identifier}", type={inp.type}')
print('=== MIX FLOAT OUTPUTS ===')
for i, out in enumerate(n.outputs):
    print(f'Output {i}: name="{out.name}", id="{out.identifier}", type={out.type}')

n_col = m.node_tree.nodes.new('ShaderNodeMix')
n_col.data_type = 'RGBA'
print('=== MIX RGBA INPUTS ===')
for i, inp in enumerate(n_col.inputs):
    print(f'Input {i}: name="{inp.name}", id="{inp.identifier}", type={inp.type}')
"""
res = subprocess.run([blender_exe, "-b", "--python-expr", code], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

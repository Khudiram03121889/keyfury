import bpy
with open('d:/Keyboard stickman warrior/test_3d/inspect_out.txt', 'w') as f:
    for o in bpy.data.objects:
        if 'Plane' in o.name or 'Skyline' in o.name or 'Back' in o.name or 'Sign' in o.name:
            f.write(f'{o.name}: loc={tuple(round(v,2) for v in o.location)}, dim={tuple(round(v,2) for v in o.dimensions)}\n')

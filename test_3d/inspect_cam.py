import bpy
with open('d:/Keyboard stickman warrior/test_3d/inspect_cam.txt', 'w') as f:
    cam = bpy.data.objects.get('Camera_01_Front_Combat')
    f.write(f'Cam loc: {cam.location}\n')
    f.write(f'Cam clip_end: {cam.data.clip_end}\n')
    f.write(f'Cam rot: {cam.rotation_euler}\n')
    for o in bpy.data.objects:
        if 'Tower' in o.name:
            f.write(f'{o.name}: loc={tuple(round(v,2) for v in o.location)}, dim={tuple(round(v,2) for v in o.dimensions)}\n')

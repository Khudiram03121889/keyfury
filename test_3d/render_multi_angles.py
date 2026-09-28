
import bpy
import math
import mathutils
from math import radians, sin, cos

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1080
scene.render.resolution_y = 1080
scene.render.film_transparent = True

valk = bpy.data.objects.get('Cyber_Valkyrie')
target = mathutils.Vector((2.15, 0.0, 1.22))
dist = 3.3

# Create Inspection Camera
cam_data = bpy.data.cameras.new('MultiAngle_Cam')
cam_data.lens = 50
cam_obj = bpy.data.objects.new('MultiAngle_Cam', cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Create Inspection Key Light mounted to camera
light_data = bpy.data.lights.new('MultiAngle_Light', 'POINT')
light_data.energy = 450.0
light_data.color = (1.0, 0.98, 0.95)
light_data.shadow_soft_size = 0.5
light_obj = bpy.data.objects.new('MultiAngle_Light', light_data)
bpy.context.collection.objects.link(light_obj)

# Hide arena background during fighter verification stills
hide_names = ['Arena_Platform', 'Arena_Skyline', 'Combat_HUD', 'Shadow_Ronin']
orig_hide = {}
for name in hide_names:
    o = bpy.data.objects.get(name)
    if o:
        orig_hide[name] = o.hide_render
        o.hide_render = True

angles = [
    ('front', 0, 1.22, 3.3, r'd:\Keyboard stickman warrior\test_3d\valk_render_front.png'),
    ('side', 90, 1.22, 3.3, r'd:\Keyboard stickman warrior\test_3d\valk_render_side.png'),
    ('back', 180, 1.22, 3.3, r'd:\Keyboard stickman warrior\test_3d\valk_render_back.png'),
    ('back_persp', 225, 1.22, 3.3, r'd:\Keyboard stickman warrior\test_3d\valk_render_back_perspective.png'),
    ('front_persp', 45, 1.22, 3.3, r'd:\Keyboard stickman warrior\test_3d\valk_render_perspective.png'),
    ('face_side_closeup', 90, 2.10, 1.2, r'd:\Keyboard stickman warrior\test_3d\valk_render_face_side.png'),
    ('face_persp_closeup', 45, 2.10, 1.2, r'd:\Keyboard stickman warrior\test_3d\valk_render_face_persp.png')
]

for name, deg, tz, d_val, path in angles:
    rad = radians(deg)
    tgt = mathutils.Vector((2.15, 0.0, tz))
    # In Blender: front is -Y, right is +X, back is +Y
    cx = tgt.x + d_val * sin(rad)
    cy = tgt.y - d_val * cos(rad)
    cz = tgt.z + 0.10
    cam_pos = mathutils.Vector((cx, cy, cz))
    cam_obj.location = cam_pos
    
    # Point camera directly at target using Blender tracking quaternion
    direction = tgt - cam_pos
    cam_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    
    # Position light near camera
    light_obj.location = cam_pos + mathutils.Vector((0.3 * cos(rad), 0.3 * sin(rad), 0.4))
    
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f'Successfully rendered {name} ({deg} deg) to: {path}')

# Restore scene objects
for name, val in orig_hide.items():
    o = bpy.data.objects.get(name)
    if o:
        o.hide_render = val

bpy.data.objects.remove(cam_obj, do_unlink=True)
bpy.data.cameras.remove(cam_data, do_unlink=True)
bpy.data.objects.remove(light_obj, do_unlink=True)
bpy.data.lights.remove(light_data, do_unlink=True)

print('>>> ALL 5 MULTI-ANGLE RENDERS COMPLETED SUCCESSFULLY!')

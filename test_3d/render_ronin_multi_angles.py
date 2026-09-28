import bpy
import mathutils
from math import radians
import os

print('=== Rendering 360 Multi-Angle Verification Suite for Shadow Ronin ===')
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1536

# Hide non-Ronin objects and in-scene lights for clean isolated renders
hidden = []
for o in bpy.data.objects:
    if o.name != 'Shadow_Ronin' and o.type != 'CAMERA':
        if not o.hide_render:
            o.hide_render = True
            hidden.append(o)

# Setup inspection camera
cam = bpy.data.objects.get('Ronin_Fullbody_Camera')
if not cam:
    cdata = bpy.data.cameras.new('Ronin_Fullbody_Camera')
    cdata.lens = 52.0
    cam = bpy.data.objects.new('Ronin_Fullbody_Camera', cdata)
    bpy.context.collection.objects.link(cam)
else:
    cam.data.lens = 52.0
scene.camera = cam

# Dedicated temporary studio lights for inspection
def get_or_create_light(name, ltype, energy, color, radius):
    obj = bpy.data.objects.get(name)
    if not obj:
        ld = bpy.data.lights.new(name, ltype)
        obj = bpy.data.objects.new(name, ld)
        bpy.context.collection.objects.link(obj)
    obj.data.energy = energy
    obj.data.color = color
    obj.data.shadow_soft_size = radius
    obj.hide_render = False
    return obj

key_light = get_or_create_light('Ronin_Studio_Key', 'POINT', 48.0, (0.95, 0.98, 1.0), 0.6)
fill_light = get_or_create_light('Ronin_Studio_Fill', 'POINT', 20.0, (0.65, 0.82, 1.0), 0.8)
rim_light = get_or_create_light('Ronin_Studio_Rim', 'POINT', 28.0, (0.20, 0.85, 1.0), 0.5)

LX = -2.15
out_dir = r'd:\Keyboard stickman warrior\test_3d'

views = [
    ('front', mathutils.Vector((LX, -3.6, 1.15)), mathutils.Vector((LX, 0.0, 1.15)), os.path.join(out_dir, 'ronin_render_front.png')),
    ('side', mathutils.Vector((LX - 3.2, 0.0, 1.15)), mathutils.Vector((LX, 0.0, 1.15)), os.path.join(out_dir, 'ronin_render_side.png')),
    ('back', mathutils.Vector((LX, 3.6, 1.15)), mathutils.Vector((LX, 0.0, 1.15)), os.path.join(out_dir, 'ronin_render_back.png')),
    ('perspective', mathutils.Vector((LX + 2.2, -2.8, 1.25)), mathutils.Vector((LX, 0.0, 1.15)), os.path.join(out_dir, 'ronin_render_perspective.png')),
    ('closeup', mathutils.Vector((LX, -1.20, 1.95)), mathutils.Vector((LX, 0.0, 1.95)), os.path.join(out_dir, 'ronin_render_closeup.png'))
]

try:
    for name, c_pos, tgt, path in views:
        cam.location = c_pos
        cam.rotation_euler = (tgt - c_pos).to_track_quat('-Z', 'Y').to_euler()
        
        cam_dir = (tgt - c_pos).normalized()
        cam_right = cam_dir.cross(mathutils.Vector((0, 0, 1))).normalized()
        
        if name == 'closeup':
            key_light.location = c_pos + cam_right * 0.35 + mathutils.Vector((0, 0, 0.35))
            fill_light.location = c_pos - cam_right * 0.45 + mathutils.Vector((0, 0, -0.15))
            rim_light.location = tgt - cam_dir * 0.8 + mathutils.Vector((0, 0, 0.4))
            key_light.data.energy = 32.0
            fill_light.data.energy = 14.0
            rim_light.data.energy = 20.0
        else:
            key_light.location = c_pos + cam_right * 0.6 + mathutils.Vector((0, 0, 0.8))
            fill_light.location = c_pos - cam_right * 0.8 + mathutils.Vector((0, 0, -0.3))
            rim_light.location = tgt - cam_dir * 1.5 + mathutils.Vector((0, 0, 0.8))
            key_light.data.energy = 48.0
            fill_light.data.energy = 20.0
            rim_light.data.energy = 28.0
            
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f'Successfully rendered: {name} -> {path}')
finally:
    # Unhide scene objects
    for o in hidden:
        o.hide_render = False
    # Clean up temporary studio lights so arena is not polluted
    for l_name in ['Ronin_Studio_Key', 'Ronin_Studio_Fill', 'Ronin_Studio_Rim']:
        l_obj = bpy.data.objects.get(l_name)
        if l_obj:
            bpy.data.objects.remove(l_obj, do_unlink=True)

print('>>> All 5 Shadow Ronin multi-angle views rendered and studio lights cleaned up!')

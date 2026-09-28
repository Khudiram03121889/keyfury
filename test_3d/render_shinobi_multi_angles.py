import bpy
import mathutils
from math import radians
import os

print('=== Rendering Enhanced 360 Multi-Angle Verification Suite for Volt Shinobi ===')
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1536

# Hide non-Shinobi objects and in-scene lights for clean isolated renders
hidden = []
for o in bpy.data.objects:
    if o.name != 'Volt_Shinobi' and o.type != 'CAMERA':
        if not o.hide_render:
            o.hide_render = True
            hidden.append(o)

# Setup inspection camera
cam = bpy.data.objects.get('Shinobi_Fullbody_Camera')
if not cam:
    cdata = bpy.data.cameras.new('Shinobi_Fullbody_Camera')
    cdata.lens = 52.0
    cam = bpy.data.objects.new('Shinobi_Fullbody_Camera', cdata)
    bpy.context.collection.objects.link(cam)
else:
    cam.data.lens = 52.0
scene.camera = cam

# Dedicated studio lights for character inspection
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

key_light = get_or_create_light('Shinobi_Studio_Key', 'POINT', 220.0, (1.0, 0.98, 0.95), 0.9)
fill_light = get_or_create_light('Shinobi_Studio_Fill', 'POINT', 120.0, (0.85, 0.92, 1.0), 1.2)
rim_light = get_or_create_light('Shinobi_Studio_Rim', 'POINT', 140.0, (1.0, 0.82, 0.25), 0.8)
ambient_fill = get_or_create_light('Shinobi_Studio_Amb', 'POINT', 80.0, (0.95, 0.95, 1.0), 1.5)

shinobi = bpy.data.objects.get('Volt_Shinobi')
if shinobi:
    LX = shinobi.location.x
    LY = shinobi.location.y
else:
    LX = 0.0
    LY = 0.0

out_dir = r'd:\Keyboard stickman warrior\test_3d'

views = [
    ('front', mathutils.Vector((LX, LY - 3.6, 1.15)), mathutils.Vector((LX, LY, 1.15)), os.path.join(out_dir, 'shinobi_render_front.png')),
    ('side', mathutils.Vector((LX - 3.2, LY, 1.15)), mathutils.Vector((LX, LY, 1.15)), os.path.join(out_dir, 'shinobi_render_side.png')),
    ('back', mathutils.Vector((LX, LY + 3.6, 1.15)), mathutils.Vector((LX, LY, 1.15)), os.path.join(out_dir, 'shinobi_render_back.png')),
    ('perspective', mathutils.Vector((LX + 2.4, LY - 2.8, 1.25)), mathutils.Vector((LX, LY, 1.15)), os.path.join(out_dir, 'shinobi_render_perspective.png')),
    ('closeup', mathutils.Vector((LX, LY - 1.25, 1.88)), mathutils.Vector((LX, LY, 1.88)), os.path.join(out_dir, 'shinobi_render_closeup.png'))
]

try:
    for name, c_pos, tgt, path in views:
        cam.location = c_pos
        cam.rotation_euler = (tgt - c_pos).to_track_quat('-Z', 'Y').to_euler()
        
        cam_dir = (tgt - c_pos).normalized()
        cam_right = cam_dir.cross(mathutils.Vector((0, 0, 1))).normalized()
        
        if name == 'closeup':
            key_light.location = c_pos + cam_right * 0.45 + mathutils.Vector((0, 0, 0.40))
            fill_light.location = c_pos - cam_right * 0.55 + mathutils.Vector((0, 0, -0.15))
            rim_light.location = tgt - cam_dir * 0.9 + mathutils.Vector((0, 0, 0.45))
            ambient_fill.location = c_pos + mathutils.Vector((0, 0, 0.20))
            key_light.data.energy = 110.0
            fill_light.data.energy = 60.0
            rim_light.data.energy = 80.0
            ambient_fill.data.energy = 50.0
        else:
            key_light.location = c_pos + cam_right * 1.2 + mathutils.Vector((0, 0, 1.2))
            fill_light.location = c_pos - cam_right * 1.4 + mathutils.Vector((0, 0, -0.3))
            rim_light.location = tgt - cam_dir * 1.8 + mathutils.Vector((0, 0, 1.2))
            ambient_fill.location = c_pos + mathutils.Vector((0, 0, 0.8))
            key_light.data.energy = 220.0
            fill_light.data.energy = 120.0
            rim_light.data.energy = 140.0
            ambient_fill.data.energy = 80.0
            
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f'Successfully rendered: {name} -> {path}')
finally:
    # Unhide scene objects
    for o in hidden:
        o.hide_render = False
    # Clean up temporary studio lights
    for l_name in ['Shinobi_Studio_Key', 'Shinobi_Studio_Fill', 'Shinobi_Studio_Rim', 'Shinobi_Studio_Amb']:
        l_obj = bpy.data.objects.get(l_name)
        if l_obj:
            bpy.data.objects.remove(l_obj, do_unlink=True)

print('>>> All 5 Volt Shinobi enhanced multi-angle views rendered and studio lights cleaned up!')

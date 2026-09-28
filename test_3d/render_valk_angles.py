import bpy
from math import radians

print('=== Rendering multi-angle volumetric verification ===')
scene = bpy.context.scene
RX = 2.15

# Hide non-Valkyrie objects
hidden = []
for o in bpy.data.objects:
    if not any(k in o.name for k in ['Cyber_Valkyrie', 'Valk_']) and o.type != 'CAMERA':
        if not o.hide_render:
            o.hide_render = True
            hidden.append(o)

scene.render.film_transparent = True
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1024
scene.render.resolution_y = 1536

# Setup Studio Lights for multi-angle illumination
slight_data = bpy.data.lights.new('Valk_Test_Fill', 'AREA')
slight_data.energy = 400.0
slight_data.size = 4.0
slight_data.color = (1.0, 0.98, 0.95)
slight_obj = bpy.data.objects.new('Valk_Test_Fill', slight_data)
slight_obj.location = (RX - 2.5, -3.5, 1.3)
bpy.context.collection.objects.link(slight_obj)

side_light_data = bpy.data.lights.new('Valk_Side_Fill', 'AREA')
side_light_data.energy = 350.0
side_light_data.size = 3.5
side_light_data.color = (1.0, 0.95, 0.90)
side_light_obj = bpy.data.objects.new('Valk_Side_Fill', side_light_data)
side_light_obj.location = (RX + 3.0, 0.0, 1.3)
bpy.context.collection.objects.link(side_light_obj)

cam = bpy.data.objects.get('Valk_Fullbody_Camera')
if not cam:
    cdata = bpy.data.cameras.new('Valk_Fullbody_Camera')
    cdata.lens = 46.0
    cam = bpy.data.objects.new('Valk_Fullbody_Camera', cdata)
    bpy.context.collection.objects.link(cam)
scene.camera = cam

# 1. Front View
cam.location = (RX, -4.8, 1.22)
cam.rotation_euler = (radians(90.0), 0.0, 0.0)
scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_isolated.png'
bpy.ops.render.render(write_still=True)

# 2. Side Profile View (looking from her left side: X+ towards -X)
cam.location = (RX + 4.5, 0.0, 1.22)
cam.rotation_euler = (radians(90.0), 0.0, radians(90.0))
scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_side_profile.png'
bpy.ops.render.render(write_still=True)

# 3. 3/4 Perspective View
cam.location = (RX + 3.2, -3.5, 1.45)
cam.rotation_euler = (radians(80.0), 0.0, radians(42.0))
scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_perspective_render.png'
bpy.ops.render.render(write_still=True)

# Cleanup
bpy.data.objects.remove(slight_obj)
bpy.data.lights.remove(slight_data)
bpy.data.objects.remove(side_light_obj)
bpy.data.lights.remove(side_light_data)
for o in hidden: o.hide_render = False
print('=== Multi-angle volumetric renders complete! ===')

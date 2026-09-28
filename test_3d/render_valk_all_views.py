"""
Renders 360-degree multi-angle verification suite for Cyber Valkyrie:
1. Front View (0 deg)
2. Side View (90 deg)
3. Back View (180 deg)
4. 3/4 Back Perspective View (225 deg)
5. 3/4 Front Perspective View (45 deg)
"""
import bpy
from math import radians

print("=== Rendering 360 multi-angle verification suite ===")
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

# Setup 360 Studio Fill Lights
def add_light(name, loc, energy, color=(1.0, 0.98, 0.95), size=4.0):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = energy
    ld.size = size
    ld.color = color
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    bpy.context.collection.objects.link(lo)
    return lo, ld

lights_to_clean = []
lights_to_clean.append(add_light('Valk_Fill_Front', (RX, -4.5, 1.3), 350.0))
lights_to_clean.append(add_light('Valk_Fill_Back', (RX, 4.5, 1.3), 420.0, color=(1.0, 0.95, 0.92)))
lights_to_clean.append(add_light('Valk_Fill_SideL', (RX + 3.5, 0.0, 1.3), 320.0))
lights_to_clean.append(add_light('Valk_Fill_SideR', (RX - 3.5, 0.0, 1.3), 320.0))

cam = bpy.data.objects.get('Valk_Fullbody_Camera')
if not cam:
    cdata = bpy.data.cameras.new('Valk_Fullbody_Camera')
    cdata.lens = 46.0
    cam = bpy.data.objects.new('Valk_Fullbody_Camera', cdata)
    bpy.context.collection.objects.link(cam)
scene.camera = cam

try:
    # 1. Front View (0 deg)
    cam.location = (RX, -4.8, 1.22)
    cam.rotation_euler = (radians(90.0), 0.0, 0.0)
    scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_front.png'
    bpy.ops.render.render(write_still=True)

    # 2. Side View (90 deg - looking from X+ towards -X)
    cam.location = (RX + 4.5, 0.0, 1.22)
    cam.rotation_euler = (radians(90.0), 0.0, radians(90.0))
    scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_side.png'
    bpy.ops.render.render(write_still=True)

    # 3. Back View (180 deg - directly behind her, looking towards -Y)
    cam.location = (RX, 4.8, 1.22)
    cam.rotation_euler = (radians(90.0), 0.0, radians(180.0))
    scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_back.png'
    bpy.ops.render.render(write_still=True)

    # 4. 3/4 Back Perspective View (225 deg)
    cam.location = (RX - 3.2, 3.5, 1.45)
    cam.rotation_euler = (radians(100.0), 0.0, radians(-138.0))
    scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_back_perspective.png'
    bpy.ops.render.render(write_still=True)

    # 5. 3/4 Front Perspective View (45 deg)
    cam.location = (RX + 3.2, -3.5, 1.45)
    cam.rotation_euler = (radians(80.0), 0.0, radians(42.0))
    scene.render.filepath = r'd:/Keyboard stickman warrior/test_3d/valk_render_perspective.png'
    bpy.ops.render.render(write_still=True)

finally:
    # Always restore scene state
    for lo, ld in lights_to_clean:
        bpy.data.objects.remove(lo)
        bpy.data.lights.remove(ld)
    for o in hidden:
        o.hide_render = False

print("=== 360 multi-angle volumetric renders complete! ===")

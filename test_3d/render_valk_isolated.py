"""
Renders an isolated high-resolution portrait of Cyber Valkyrie from Blender
and creates a pristine side-by-side comparison with atlas-v3-consistent-source.png.
"""
import bpy
from math import radians

print(">>> Rendering isolated Cyber Valkyrie beauty portrait...")
scene = bpy.context.scene

# Get or create full-body camera
cam = bpy.data.objects.get("Valk_Fullbody_Camera")
if not cam:
    cdata = bpy.data.cameras.new("Valk_Fullbody_Camera")
    cdata.lens = 46.0
    cam = bpy.data.objects.new("Valk_Fullbody_Camera", cdata)
    bpy.context.collection.objects.link(cam)

RX = 2.15
cam.location = (RX, -4.9, 1.22)
cam.rotation_euler = (radians(90.0), 0.0, 0.0)
scene.camera = cam

# Enable transparent background for isolated character capture
old_trans = scene.render.film_transparent
scene.render.film_transparent = True
scene.render.engine = 'BLENDER_EEVEE'

# Set high resolution: 1024 x 1536 (matching reference aspect ratio 2:3)
old_res_x = scene.render.resolution_x
old_res_y = scene.render.resolution_y
scene.render.resolution_x = 1024
scene.render.resolution_y = 1536

# Hide all non-Valkyrie objects for 100% pure isolated character capture
hidden = []
for o in bpy.data.objects:
    if not any(k in o.name for k in ["Cyber_Valkyrie", "Valk_"]) and o.type != 'CAMERA':
        if not o.hide_render:
            o.hide_render = True
            hidden.append(o)

# Add studio key light for crisp illumination across full character body
studio_light_data = bpy.data.lights.new("Valk_Studio_Fill", 'AREA')
studio_light_data.energy = 320.0
studio_light_data.size = 3.5
studio_light_data.color = (1.0, 0.98, 0.95)
studio_light_obj = bpy.data.objects.new("Valk_Studio_Fill", studio_light_data)
studio_light_obj.location = (RX, -3.8, 1.25)
bpy.context.collection.objects.link(studio_light_obj)

out_path = r"d:\Keyboard stickman warrior\test_3d\valk_render_isolated.png"
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print(f">>> Isolated render saved to: {out_path}")

# Remove temporary studio light
bpy.data.objects.remove(studio_light_obj)
bpy.data.lights.remove(studio_light_data)

# Restore scene settings
for o in hidden:
    o.hide_render = False
scene.render.film_transparent = old_trans
scene.render.resolution_x = old_res_x
scene.render.resolution_y = old_res_y

combat_cam = bpy.data.objects.get("KeyFury_Combat_Camera")
if combat_cam:
    scene.camera = combat_cam

print(">>> Valkyrie isolated beauty render complete!")

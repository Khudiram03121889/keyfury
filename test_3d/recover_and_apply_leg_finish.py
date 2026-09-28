"""Rebuild the four-fighter rooftop from its project autosave, then polish legs."""

import bpy
import os
import runpy
import sys
from math import radians


WORK_DIR = r"D:\Keyboard stickman warrior\test_3d"
if WORK_DIR not in sys.path:
    sys.path.insert(0, WORK_DIR)

# The autosave retains the original high-detail Ronin, Shinobi, Valkyrie,
# camera, arena, and lighting.  It predates the Void addition, so use the
# existing project build script to restore that authored fourth fighter.
runpy.run_path(os.path.join(WORK_DIR, "configure_void_assassin.py"), run_name="__main__")

ronin = bpy.data.objects.get("Shadow_Ronin")
shinobi = bpy.data.objects.get("Volt_Shinobi")
void = bpy.data.objects.get("Void_Assassin")
valk = bpy.data.objects.get("Cyber_Valkyrie")
for name, fighter in (("Shadow_Ronin", ronin), ("Volt_Shinobi", shinobi), ("Void_Assassin", void), ("Cyber_Valkyrie", valk)):
    if fighter is None:
        raise RuntimeError(f"Recovery source is missing {name}")

# Match the established four-fighter rooftop staging.
ronin.location = (-2.55, 0.20, 0.0)
ronin.rotation_euler = (0.0, 0.0, radians(-12.0))
shinobi.location = (-0.88, -0.38, 0.0)
shinobi.rotation_euler = (0.0, 0.0, radians(-4.0))
void.location = (0.88, -0.38, 0.0)
void.rotation_euler = (0.0, 0.0, radians(4.0))
valk.location = (2.55, 0.20, 0.0)
valk.rotation_euler = (0.0, 0.0, radians(12.0))

for fighter in (ronin, shinobi, void, valk):
    fighter.hide_set(False)
    fighter.hide_viewport = False
    fighter.hide_render = False

# Reposition the existing accent lights to the established roster layout.
light_locations = {
    "Ronin_Visor_Light": (-2.55, -0.25, 1.95),
    "Ronin_Spine_Light": (-2.55, 0.65, 1.65),
    "Shinobi_Visor_Light": (-0.88, -0.83, 1.95),
    "Shinobi_Spine_Light": (-0.88, 0.07, 1.65),
    "Void_Visor_Light": (0.88, -0.83, 1.70),
    "Void_Spine_Light": (0.88, 0.07, 1.45),
    "Valk_ArcCore_Light": (2.55, -0.12, 1.85),
    "Valk_BackThruster_Light": (2.55, 0.58, 1.84),
    "Valk_WingThruster_Light": (3.00, 0.58, 1.96),
    "Valk_Gauntlet_Light": (2.07, -0.08, 1.30),
    "Valk_Side_Fill": (5.55, 0.20, 1.30),
}
for name, location in light_locations.items():
    light = bpy.data.objects.get(name)
    if light:
        light.location = location

camera = bpy.data.objects.get("KeyFury_Combat_Camera")
if camera:
    bpy.context.scene.camera = camera

import apply_leg_finish as finish
finish.apply_and_save()

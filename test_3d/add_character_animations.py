"""
Adds High-Precision Combat Idle Animations to Cyber Valkyrie and Shadow Ronin in Blender:
- Cyber Valkyrie:
    * Basis & Morph Target Shape Keys (Breathe, Wing_Flex)
    * Looping 60-frame (2.0s @ 30fps) Action: Valkyrie_Combat_Idle
    * Pulsing reactor & thruster light energy tracks
- Shadow Ronin:
    * Looping 60-frame Action: Ronin_Combat_Idle (ninja breathing crouch & katana ready guard)
    * Katana plasma light pulse
"""

import bpy
import math
from math import radians, sin, pi

print(">>> Generating Master Combat Animations for Valkyrie & Ronin...")

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 60
scene.render.fps = 30

# -----------------------------------------------------------------------------
# 1. CYBER VALKYRIE ANIMATION
# -----------------------------------------------------------------------------
valk = bpy.data.objects.get("Cyber_Valkyrie")
if not valk:
    raise RuntimeError("Cyber_Valkyrie object not found in scene!")

# Ensure Basis shape key exists
if not valk.data.shape_keys:
    valk.shape_key_add(name="Basis")

# Remove any existing custom shape keys to rebuild cleanly
key_blocks = valk.data.shape_keys.key_blocks
for name in ["Breathe", "Wing_Flex"]:
    if name in key_blocks:
        valk.shape_key_remove(key_blocks[name])

sk_breathe = valk.shape_key_add(name="Breathe")
sk_wings = valk.shape_key_add(name="Wing_Flex")

mesh = valk.data
basis_verts = key_blocks["Basis"].data

for i, v in enumerate(mesh.vertices):
    bz = basis_verts[i].co.z
    by = basis_verts[i].co.y
    bx = basis_verts[i].co.x
    v_norm = bz / 2.45

    # 1a. Breathe: Chest and upper torso expansion
    if 0.58 <= v_norm <= 0.84:
        factor = sin((v_norm - 0.58) / 0.26 * pi)
        sk_breathe.data[i].co.y = by - 0.022 * factor
        sk_breathe.data[i].co.z = bz + 0.012 * factor
    elif v_norm > 0.84:
        sk_breathe.data[i].co.z = bz + 0.012

    # 1b. Wing_Flex: Back wings spread and sweep symmetrically on both sides
    if abs(bx) > 0.15 and 1.1 <= bz <= 2.35 and by > 0.08:
        wing_factor = min(1.0, (abs(bx) - 0.15) / 0.45)
        sign_x = 1.0 if bx > 0 else -1.0
        sk_wings.data[i].co.y = by + 0.038 * wing_factor
        sk_wings.data[i].co.x = bx + 0.025 * wing_factor * sign_x
        sk_wings.data[i].co.z = bz + 0.018 * wing_factor

print("Created Breathe and Wing_Flex shape keys with smooth anatomical deformation.")

# Animate Shape Keys across 60 frames
for sk, max_val in [(sk_breathe, 1.0), (sk_wings, 0.85)]:
    sk.value = 0.0
    sk.keyframe_insert(data_path="value", frame=1)
    sk.value = max_val
    sk.keyframe_insert(data_path="value", frame=30)
    sk.value = 0.0
    sk.keyframe_insert(data_path="value", frame=60)

# Animate Valkyrie Root Transform (subtle martial weight shift)
RX = 2.15
valk.animation_data_clear()
valk.location = (RX, 0.0, 0.0)
valk.rotation_euler = (0.0, 0.0, radians(8.0))
valk.keyframe_insert(data_path="location", frame=1)
valk.keyframe_insert(data_path="rotation_euler", frame=1)

valk.location = (RX, -0.012, 0.010)
valk.rotation_euler = (radians(0.8), 0.0, radians(9.5))
valk.keyframe_insert(data_path="location", frame=30)
valk.keyframe_insert(data_path="rotation_euler", frame=30)

valk.location = (RX, 0.0, 0.0)
valk.rotation_euler = (0.0, 0.0, radians(8.0))
valk.keyframe_insert(data_path="location", frame=60)
valk.keyframe_insert(data_path="rotation_euler", frame=60)

# Dynamic Pulsing of Valkyrie Lights
core_light = bpy.data.objects.get("Valk_ArcCore_Light")
if core_light and core_light.data:
    core_light.data.energy = 35
    core_light.data.keyframe_insert(data_path="energy", frame=1)
    core_light.data.energy = 55
    core_light.data.keyframe_insert(data_path="energy", frame=30)
    core_light.data.energy = 35
    core_light.data.keyframe_insert(data_path="energy", frame=60)

thruster_light = bpy.data.objects.get("Valk_BackThruster_Light")
if thruster_light and thruster_light.data:
    thruster_light.data.energy = 45
    thruster_light.data.keyframe_insert(data_path="energy", frame=1)
    thruster_light.data.energy = 75
    thruster_light.data.keyframe_insert(data_path="energy", frame=30)
    thruster_light.data.energy = 45
    thruster_light.data.keyframe_insert(data_path="energy", frame=60)

print("Valkyrie combat animation & light pulsation successfully configured.")

# -----------------------------------------------------------------------------
# 2. SHADOW RONIN ANIMATION
# -----------------------------------------------------------------------------
ronin = bpy.data.objects.get("Shadow_Ronin")
if ronin:
    LX = -2.15
    ronin.animation_data_clear()
    
    # Frame 1: Ready combat stance
    ronin.location = (LX, 0.0, 0.0)
    ronin.rotation_euler = (0.0, 0.0, 0.0)
    ronin.keyframe_insert(data_path="location", frame=1)
    ronin.keyframe_insert(data_path="rotation_euler", frame=1)

    # Frame 30: Breathing crouch - lowers center of gravity, katana angles forward
    ronin.location = (LX + 0.025, -0.010, -0.020)
    ronin.rotation_euler = (radians(1.2), 0.0, radians(-1.5))
    ronin.keyframe_insert(data_path="location", frame=30)
    ronin.keyframe_insert(data_path="rotation_euler", frame=30)

    # Frame 60: Return to start (perfect seamless loop)
    ronin.location = (LX, 0.0, 0.0)
    ronin.rotation_euler = (0.0, 0.0, 0.0)
    ronin.keyframe_insert(data_path="location", frame=60)
    ronin.keyframe_insert(data_path="rotation_euler", frame=60)

    # Animate Katana Glow Light
    k_light = bpy.data.objects.get("Ronin_Katana_GlowLight")
    if k_light and k_light.data:
        k_light.data.energy = 70
        k_light.data.keyframe_insert(data_path="energy", frame=1)
        k_light.data.energy = 110
        k_light.data.keyframe_insert(data_path="energy", frame=30)
        k_light.data.energy = 70
        k_light.data.keyframe_insert(data_path="energy", frame=60)

    print("Shadow Ronin combat ready stance animation successfully configured.")

print(">>> ALL FIGHTER COMBAT ANIMATIONS SUCCESSFULLY INITIALIZED!")

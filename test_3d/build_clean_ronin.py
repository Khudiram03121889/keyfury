"""
Rebuilds Shadow Ronin with anatomical precision, flawless joint connectivity,
cyber-samurai kabuto helmet, elegant energy scarf, and glowing plasma katana.
"""
import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos

print(">>> Building Clean Anatomical Shadow Ronin...")

# Remove old Shadow Ronin
old_ronin = bpy.data.objects.get("Shadow_Ronin")
if old_ronin:
    bpy.data.objects.remove(old_ronin)

# Materials
mat_dark = bpy.data.materials.get("Mat_DarkCarbon")
mat_cyan = bpy.data.materials.get("Mat_CyanGlow")
mat_chrome = bpy.data.materials.get("Mat_ChromeTrim")
mat_gold = bpy.data.materials.get("Mat_GoldAccent")

ronin_parts = []

def create_box(loc, size, rot=(0,0,0), mat=None):
    if isinstance(rot, bpy.types.Material):
        mat = rot
        rot = (0, 0, 0)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.scale = size
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if mat: obj.data.materials.append(mat)
    return obj

def create_sphere(loc, radius, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=16, ring_count=16, location=loc)
    obj = bpy.context.active_object
    if mat: obj.data.materials.append(mat)
    return obj

def create_limb(p1, p2, r1, r2, mat=None):
    v1 = mathutils.Vector(p1)
    v2 = mathutils.Vector(p2)
    vec = v2 - v1
    length = vec.length
    if length < 1e-4: return None
    mid = (v1 + v2) / 2.0
    rot = mathutils.Vector((0,0,1)).rotation_difference(vec).to_euler()
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=length, vertices=16, location=mid, rotation=rot)
    obj = bpy.context.active_object
    if mat: obj.data.materials.append(mat)
    return obj

# Base Position
LX = -2.15

# 1. FEET & COMBAT BOOTS
foot_lead = (LX + 0.35, -0.16, 0.05)
foot_rear = (LX - 0.35, 0.16, 0.05)

for ft, rot_z in [(foot_lead, 10), (foot_rear, -15)]:
    ronin_parts.append(create_box(ft, (0.28, 0.14, 0.08), rot=(0, 0, radians(rot_z)), mat=mat_dark))
    ronin_parts.append(create_box((ft[0] + 0.08, ft[1], ft[2] + 0.02), (0.10, 0.12, 0.07), rot=(0, 0, radians(rot_z)), mat=mat_chrome))
    ronin_parts.append(create_box((ft[0] + 0.02, ft[1], ft[2] - 0.02), (0.26, 0.13, 0.02), rot=(0, 0, radians(rot_z)), mat=mat_cyan))

# 2. LEGS & ARTICULATED KNEES
knee_lead = (LX + 0.22, -0.18, 0.52)
knee_rear = (LX - 0.20, 0.18, 0.48)
hip_lead = (LX + 0.06, -0.14, 0.95)
hip_rear = (LX - 0.08, 0.14, 0.95)

# Shin limbs
ronin_parts.append(create_limb(foot_lead, knee_lead, 0.06, 0.075, mat=mat_dark))
ronin_parts.append(create_limb(foot_rear, knee_rear, 0.06, 0.075, mat=mat_dark))

# Knee joint spheres & armor caps
for k, rot_y in [(knee_lead, 15), (knee_rear, -10)]:
    ronin_parts.append(create_sphere(k, 0.08, mat=mat_dark))
    ronin_parts.append(create_box((k[0] + 0.04, k[1], k[2]), (0.05, 0.12, 0.12), rot=(0, radians(rot_y), 0), mat=mat_chrome))
    ronin_parts.append(create_box((k[0] + 0.07, k[1], k[2]), (0.02, 0.08, 0.08), rot=(0, radians(rot_y), 0), mat=mat_cyan))

# Thigh limbs
ronin_parts.append(create_limb(knee_lead, hip_lead, 0.075, 0.09, mat=mat_dark))
ronin_parts.append(create_limb(knee_rear, hip_rear, 0.075, 0.09, mat=mat_dark))

# 3. PELVIS & ARMORED WAIST FAULD
pelvis = (LX, 0.0, 0.95)
waist = (LX, 0.0, 1.15)
ronin_parts.append(create_sphere(pelvis, 0.15, mat=mat_dark))
ronin_parts.append(create_limb(pelvis, waist, 0.14, 0.12, mat=mat_dark))
ronin_parts.append(create_box(waist, (0.24, 0.30, 0.06), mat=mat_chrome))
ronin_parts.append(create_box((waist[0] + 0.08, waist[1], waist[2]), (0.03, 0.14, 0.04), mat=mat_cyan))

# 4. TORSO & SAMURAI CHEST CARAPACE
chest = (LX + 0.04, 0.0, 1.40)
ronin_parts.append(create_limb(waist, chest, 0.12, 0.16, mat=mat_dark))
# Armored Chest Plate
ronin_parts.append(create_box(chest, (0.22, 0.34, 0.30), rot=(0, radians(8), 0), mat=mat_dark))
ronin_parts.append(create_box((chest[0] + 0.10, chest[1], chest[2] + 0.02), (0.04, 0.22, 0.22), rot=(0, radians(8), 0), mat=mat_chrome))
# Center Arc Reactor Diamond
ronin_parts.append(create_sphere((chest[0] + 0.13, chest[1], chest[2] + 0.02), 0.045, mat=mat_cyan))

# 5. SHOULDERS & PAULDRONS
sh_lead = (LX + 0.08, -0.22, 1.48)
sh_rear = (LX - 0.02, 0.22, 1.48)

for sh, s_rot in [(sh_lead, 15), (sh_rear, -15)]:
    ronin_parts.append(create_sphere(sh, 0.09, mat=mat_dark))
    ronin_parts.append(create_box((sh[0], sh[1], sh[2] + 0.05), (0.16, 0.18, 0.06), rot=(0, 0, radians(s_rot)), mat=mat_chrome))
    ronin_parts.append(create_box((sh[0], sh[1], sh[2] + 0.08), (0.12, 0.14, 0.03), rot=(0, 0, radians(s_rot)), mat=mat_cyan))

# 6. ARMS IN READY TWO-HANDED KATANA GUARD
grip_rear = (LX + 0.65, -0.06, 1.34) # right hand
grip_front = (LX + 0.82, -0.04, 1.38) # left hand

el_lead = (LX + 0.38, -0.24, 1.30)
el_rear = (LX + 0.30, 0.16, 1.32)

ronin_parts.append(create_limb(sh_lead, el_lead, 0.07, 0.06, mat=mat_dark))
ronin_parts.append(create_sphere(el_lead, 0.065, mat=mat_chrome))
ronin_parts.append(create_limb(el_lead, grip_front, 0.06, 0.055, mat=mat_dark))
ronin_parts.append(create_sphere(grip_front, 0.06, mat=mat_chrome))

ronin_parts.append(create_limb(sh_rear, el_rear, 0.07, 0.06, mat=mat_dark))
ronin_parts.append(create_sphere(el_rear, 0.065, mat=mat_chrome))
ronin_parts.append(create_limb(el_rear, grip_rear, 0.06, 0.055, mat=mat_dark))
ronin_parts.append(create_sphere(grip_rear, 0.06, mat=mat_chrome))

# 7. KATANA (Hilt, Tsuba Guard, and Plasma Blade)
pommel = (LX + 0.52, -0.08, 1.30)
tsuba_loc = (LX + 0.94, -0.02, 1.42)
ronin_parts.append(create_limb(pommel, tsuba_loc, 0.026, 0.024, mat=mat_dark))
ronin_parts.append(create_sphere(pommel, 0.035, mat=mat_gold))

# Tsuba disc guard
ronin_parts.append(create_box(tsuba_loc, (0.02, 0.11, 0.11), rot=(0, radians(-15), 0), mat=mat_gold))

# Plasma Blade extending across arena towards Valkyrie
blade_base = tsuba_loc
blade_tip = (LX + 2.20, 0.04, 1.68)
blade_mid = ((blade_base[0] + blade_tip[0]) / 2.0, (blade_base[1] + blade_tip[1]) / 2.0, (blade_base[2] + blade_tip[2]) / 2.0)

ronin_parts.append(create_limb(blade_base, blade_mid, 0.026, 0.020, mat=mat_cyan))
ronin_parts.append(create_limb(blade_mid, blade_tip, 0.020, 0.008, mat=mat_cyan))

# Dynamic Katana Light
k_light = bpy.data.objects.get("Ronin_Katana_GlowLight")
if k_light:
    k_light.location = blade_mid
    k_light.data.energy = 80

# 8. NECK & CYBER-SAMURAI KABUTO HELMET
neck = (LX + 0.02, 0.0, 1.60)
head = (LX + 0.02, 0.0, 1.78)

ronin_parts.append(create_limb(chest, neck, 0.08, 0.07, mat=mat_dark))
# Helmet Core Skull
ronin_parts.append(create_sphere(head, 0.16, mat=mat_dark))
# Kabuto Brow Plate
ronin_parts.append(create_box((head[0] + 0.06, head[1], head[2] + 0.06), (0.16, 0.28, 0.08), rot=(0, radians(10), 0), mat=mat_dark))
# Golden Kuwagata Horn Crest
ronin_parts.append(create_limb((head[0] + 0.10, head[1] - 0.06, head[2] + 0.12), (head[0] + 0.06, head[1] - 0.22, head[2] + 0.32), 0.026, 0.008, mat=mat_gold))
ronin_parts.append(create_limb((head[0] + 0.10, head[1] + 0.06, head[2] + 0.12), (head[0] + 0.06, head[1] + 0.22, head[2] + 0.32), 0.026, 0.008, mat=mat_gold))
# Golden Center Maedate Emblem
ronin_parts.append(create_box((head[0] + 0.12, head[1], head[2] + 0.10), (0.04, 0.06, 0.10), mat=mat_gold))
# NEON AZURE PLASMA VISOR SLIT
ronin_parts.append(create_box((head[0] + 0.12, head[1], head[2] + 0.01), (0.04, 0.22, 0.04), rot=(0, radians(6), 0), mat=mat_cyan))

# 9. FLOWING AESTHETIC ENERGY SCARF (Flowing naturally down and back)
scarf_nodes = [
    (neck[0] - 0.08, neck[1], neck[2] + 0.02),
    (neck[0] - 0.26, neck[1] - 0.06, neck[2] - 0.06),
    (neck[0] - 0.50, neck[1] - 0.12, neck[2] - 0.22),
    (neck[0] - 0.74, neck[1] - 0.18, neck[2] - 0.45),
    (neck[0] - 0.95, neck[1] - 0.22, neck[2] - 0.72)
]
for si in range(len(scarf_nodes) - 1):
    w1 = 0.055 - si * 0.008
    w2 = 0.055 - (si + 1) * 0.008
    ronin_parts.append(create_limb(scarf_nodes[si], scarf_nodes[si+1], w1, w2, mat=mat_cyan))

# 10. JOIN ALL INTO UNIFIED SHADOW RONIN OBJECT
valid_parts = [p for p in ronin_parts if p is not None]
bpy.ops.object.select_all(action='DESELECT')
for p in valid_parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = valid_parts[0]
bpy.ops.object.join()
ronin_obj = bpy.context.active_object
ronin_obj.name = "Shadow_Ronin"

# Set origin to floor center (LX, 0, 0)
bpy.context.scene.cursor.location = (LX, 0.0, 0.0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

print(f">>> Shadow Ronin rebuilt with {len(valid_parts)} perfectly connected components!")

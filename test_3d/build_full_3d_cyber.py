"""
KeyFury 3D: Cyber Neon Rooftop (100% Pure 3D Environment)
Masterpiece Procedural & Geometric 3D Stage in Blender 5.2.1 LTS:
- 3D Skyscraper Combat Platform at Z = 0.0 with rain-slicked wet metallic decking
- Inlaid Glowing Neon Circuit Tracks (Dual-Tone Electric Cyan and Hot Magenta) with 45-degree chamfers
- 3D Diagonal X-Truss Reinforcement Panels & Diamond Tread Plates
- 3D Front-Center Recessed Drainage Grate Pit with Cross-Bar Mesh & Neon Underglow
- 3D Heavy Industrial Perimeter Guardrail: beveled stanchions with glowing cyan slots & dual neon rails
- 3D Left Industrial Generator / HVAC Chiller Unit with cooling fans, louver vents, status LEDs,
  articulated satellite dish, and snaking power conduits / glowing cables
- 3D Right Telecom & Transformer Substation with cooling fins, pressurized canisters,
  multi-tier antenna mast with dipole aerials, microwave drum, and blinking red aviation beacon
- 3D Multi-Tier Foreground Skyscraper Penthouse Wings with vertical neon corner light channels
- 3D Genuine Glowing Neon Billboards: 'NEO-KYOTO', 'CYBER ARCADE', 'NEON DRAGON' (with dragon crest),
  'RAMEN 2049', 'TECH-DRIVE', 'CYBERNETICS', Anime Holographic Visor Billboard, Ramen Bowl Neon Graphic,
  and Japanese Katakana / Kanji vertical banners
- 3D Dense Cyberpunk Megacity Skyline: 36+ diverse 3D skyscrapers with stepped setbacks, spires,
  illuminated window matrices (cyan, amber, blue), and elevated skybridges
- 3D Flying Aerocars / Hovercars (Spinners) with elongated dual-tone laser plasma motion trails
- 3D Rainy Night Sky Dome with volumetric neon haze and city underglow
- Dual-Tone Cyberpunk Lighting: Electric Cyan Key + Hot Magenta Rim + Wet Deck Specular Bounce
- Calibrated 16:9 Combat Camera (Platform Ratio: 0.73, ground at Z = 0.0)
- Production .blend, .glb, and 1080p render outputs
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos, sqrt, atan2, hypot
import os
import sys
import traceback
import random

log_path = r"d:\Keyboard stickman warrior\test_3d\cyber_log.txt"
log_file = open(log_path, "w")
def log(msg):
    print(msg)
    log_file.write(str(msg) + "\n")
    log_file.flush()

def excepthook(etype, value, tb):
    with open(log_path, "a") as f:
        f.write(">>> UNCAUGHT EXCEPTION:\n")
        traceback.print_exception(etype, value, tb, file=f)
sys.excepthook = excepthook

log(">>> [Cyber Rooftop 100% 3D Masterpiece] Initializing Environment Generation...")

# ==============================================================================
# 1. Clean Scene
# ==============================================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0: bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0: bpy.data.materials.remove(block)
for block in bpy.data.images:
    if block.users == 0: bpy.data.images.remove(block)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
if hasattr(scene, 'view_settings'):
    scene.view_settings.view_transform = 'Standard'

out_dir = r"d:\Keyboard stickman warrior\test_3d"
os.makedirs(out_dir, exist_ok=True)

# World Environment (Deep Midnight Smog)
world = scene.world
if not world:
    world = bpy.data.worlds.new("Cyber_World")
    scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.015, 0.018, 0.040, 1.0)
    bg_node.inputs['Strength'].default_value = 0.75

# ==============================================================================
# 2. PBR & Emissive Materials
# ==============================================================================
def make_shader(name, base_color=(0.1, 0.1, 0.12, 1.0), roughness=0.25, metallic=0.85, specular=0.6):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metallic
        if 'Specular IOR Level' in bsdf.inputs:
            bsdf.inputs['Specular IOR Level'].default_value = specular
    return mat

def make_emissive(name, color=(0.0, 0.9, 1.0, 1.0), strength=3.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new(type='ShaderNodeOutputMaterial')
    emit = nodes.new(type='ShaderNodeEmission')
    emit.inputs['Color'].default_value = color
    emit.inputs['Strength'].default_value = strength
    mat.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return mat

# Platform PBR Materials
mat_deck_wet     = make_shader("Mat_Deck_Wet",     (0.045, 0.055, 0.080, 1.0), roughness=0.07, metallic=0.94, specular=0.90)
mat_deck_plate   = make_shader("Mat_Deck_Plate",   (0.080, 0.095, 0.130, 1.0), roughness=0.20, metallic=0.88, specular=0.65)
mat_metal_dark   = make_shader("Mat_Metal_Dark",   (0.030, 0.035, 0.050, 1.0), roughness=0.30, metallic=0.90, specular=0.55)
mat_metal_trim   = make_shader("Mat_Metal_Trim",   (0.120, 0.140, 0.180, 1.0), roughness=0.18, metallic=0.92, specular=0.72)
mat_grate        = make_shader("Mat_Drain_Grate",  (0.020, 0.025, 0.035, 1.0), roughness=0.40, metallic=0.82, specular=0.45)

# Emissive Neon Materials (Rich Saturation, No Blowout in Standard)
mat_neon_cyan    = make_emissive("Mat_Neon_Cyan",    (0.04, 0.92, 1.00, 1.0), strength=3.8)
mat_neon_magenta = make_emissive("Mat_Neon_Magenta", (1.00, 0.06, 0.65, 1.0), strength=3.8)
mat_neon_orange  = make_emissive("Mat_Neon_Orange",  (1.00, 0.45, 0.04, 1.0), strength=3.5)
mat_neon_yellow  = make_emissive("Mat_Neon_Yellow",  (1.00, 0.90, 0.12, 1.0), strength=3.6)
mat_neon_white   = make_emissive("Mat_Neon_White",   (0.85, 0.95, 1.00, 1.0), strength=3.2)
mat_neon_purple  = make_emissive("Mat_Neon_Purple",  (0.65, 0.10, 1.00, 1.0), strength=3.5)

# Skyscraper Architecture Materials
mat_bldg_dark    = make_shader("Mat_Bldg_Dark",    (0.025, 0.030, 0.045, 1.0), roughness=0.35, metallic=0.85)
mat_bldg_blue    = make_shader("Mat_Bldg_Blue",    (0.040, 0.060, 0.110, 1.0), roughness=0.28, metallic=0.80)
mat_window_cyan  = make_emissive("Mat_Win_Cyan",   (0.18, 0.85, 1.00, 1.0), strength=2.6)
mat_window_amber = make_emissive("Mat_Win_Amber",  (1.00, 0.72, 0.20, 1.0), strength=2.5)
mat_window_blue  = make_emissive("Mat_Win_Blue",   (0.10, 0.42, 0.95, 1.0), strength=2.2)

# Status LEDs & Atmosphere
mat_led_red      = make_emissive("Mat_LED_Red",      (1.00, 0.04, 0.04, 1.0), strength=4.0)
mat_led_green    = make_emissive("Mat_LED_Green",    (0.08, 1.00, 0.25, 1.0), strength=3.2)
mat_sky_smog     = make_emissive("Mat_Sky_Smog",     (0.018, 0.022, 0.048, 1.0), strength=0.75)

def add_mesh_obj(name, mesh):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj

# BMesh Primitive Helpers
def make_box(bm, cx, cy, cz, sx, sy, sz):
    bmesh.ops.create_cube(bm, size=1.0,
        matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
               mathutils.Matrix.Scale(sx, 4, (1,0,0)) @
               mathutils.Matrix.Scale(sy, 4, (0,1,0)) @
               mathutils.Matrix.Scale(sz, 4, (0,0,1)))

def make_rot_box(bm, cx, cy, cz, sx, sy, sz, rot=(0,0,0)):
    rot_m = mathutils.Euler(rot).to_matrix().to_4x4()
    mat = mathutils.Matrix.Translation((cx, cy, cz)) @ rot_m @ \
          mathutils.Matrix.Scale(sx, 4, (1,0,0)) @ \
          mathutils.Matrix.Scale(sy, 4, (0,1,0)) @ \
          mathutils.Matrix.Scale(sz, 4, (0,0,1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=mat)

def make_cylinder(bm, cx, cy, cz, radius, height, segments=16, rot=(0,0,0)):
    rot_m = mathutils.Euler(rot).to_matrix().to_4x4()
    mat = mathutils.Matrix.Translation((cx, cy, cz)) @ rot_m
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=radius, radius2=radius, depth=height, segments=segments, matrix=mat)

def make_cone(bm, cx, cy, cz, r1, r2, height, segments=12, rot=(0,0,0)):
    rot_m = mathutils.Euler(rot).to_matrix().to_4x4()
    mat = mathutils.Matrix.Translation((cx, cy, cz)) @ rot_m
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=r1, radius2=r2, depth=height, segments=segments, matrix=mat)

# ==============================================================================
# 3. ROOFTOP COMBAT PLATFORM (Walking Surface Precisely at Z = 0.0)
# ==============================================================================
bm_plat = bmesh.new()
bm_plates = bmesh.new()
bm_darkmetal = bmesh.new()
bm_grate = bmesh.new()
bm_cyan = bmesh.new()
bm_mag = bmesh.new()

# 3.1 Main Platform Slab (Z = -0.50 to 0.0, Width 26m, Depth 11.5m, Y = -9.0 to +2.5)
# This completely fills the lower third of the camera frame down to the bottom edge!
plat_cy = -3.25
plat_depth = 11.50
make_box(bm_plat, 0.0, plat_cy, -0.25, 26.0, plat_depth, 0.50)

# Drop Foundation (Beneath front edge at Y = -9.0m, completely below visible frame)
make_box(bm_darkmetal, 0.0, -9.10, -2.50, 25.6, 0.60, 4.00)
make_box(bm_darkmetal, 0.0, 2.55, -2.50, 25.6, 0.60, 4.00)

# 3.2 Modular Floor Plating (Z = 0.008 to 0.012)
for row in range(10):
    py = -7.8 + row * 1.00
    for col in range(16):
        px = -12.0 + col * 1.60
        # Exclude central combat core and drainage pit
        if abs(px) < 7.5 and -2.2 < py < 1.8:
            continue
        if abs(px) < 2.5 and -5.8 < py < -3.2:
            continue
        make_box(bm_plates, px, py, 0.008, 1.52, 0.92, 0.016)

# 3.3 Central Wet Reflective Combat Arena Slab (Z = 0.010)
make_box(bm_plat, 0.0, -0.20, 0.010, 15.2, 3.50, 0.018)

# 3.4 Reinforced X-Truss Panels (Left and Right Flanks of Combat Core)
# In the floor plane, rotation MUST be around Z: rot=(0, 0, theta) so bars stay flat!
for sign_x in [-1, 1]:
    panel_cx = sign_x * 5.0
    panel_cy = -0.20
    pw, pd = 4.20, 2.70
    # Recessed frame
    make_box(bm_plates, panel_cx, panel_cy, 0.014, pw, pd, 0.024)
    make_box(bm_darkmetal, panel_cx, panel_cy, 0.016, pw * 0.96, pd * 0.94, 0.022)
    # Diagonal Cross-Truss Bars (X-Bracing lying flat in X-Y plane)
    bar_thick = 0.12
    diag_len = hypot(pw * 0.92, pd * 0.90)
    theta = atan2(pd * 0.90, pw * 0.92)
    make_rot_box(bm_plates, panel_cx, panel_cy, 0.022, diag_len, bar_thick, 0.018, rot=(0, 0, theta))
    make_rot_box(bm_plates, panel_cx, panel_cy, 0.022, diag_len, bar_thick, 0.018, rot=(0, 0, -theta))
    # Outer Rim Trim
    make_box(bm_plates, panel_cx, panel_cy - pd * 0.48, 0.022, pw, 0.10, 0.020)
    make_box(bm_plates, panel_cx, panel_cy + pd * 0.48, 0.022, pw, 0.10, 0.020)
    make_box(bm_plates, panel_cx - pw * 0.48, panel_cy, 0.022, 0.10, pd, 0.020)
    make_box(bm_plates, panel_cx + pw * 0.48, panel_cy, 0.022, 0.10, pd, 0.020)

# 3.5 Front-Center Recessed Drainage Grate Pit (Positioned in Foreground at Y = -4.5)
drain_cx, drain_cy = 0.0, -4.50
drain_w, drain_d = 4.00, 2.00
# Recessed Basin
make_box(bm_darkmetal, drain_cx, drain_cy, -0.10, drain_w + 0.20, drain_d + 0.20, 0.22)
# Grate Frame
make_box(bm_plates, drain_cx, drain_cy - drain_d * 0.50, 0.015, drain_w, 0.14, 0.03)
make_box(bm_plates, drain_cx, drain_cy + drain_d * 0.50, 0.015, drain_w, 0.14, 0.03)
make_box(bm_plates, drain_cx - drain_w * 0.50, drain_cy, 0.015, 0.14, drain_d, 0.03)
make_box(bm_plates, drain_cx + drain_w * 0.50, drain_cy, 0.015, 0.14, drain_d, 0.03)

# 3D Grate Grid Bars (Longitudinal & Transverse)
for i in range(16):
    gx = drain_cx - drain_w * 0.46 + i * (drain_w * 0.92 / 15)
    make_box(bm_grate, gx, drain_cy, 0.008, 0.045, drain_d * 0.92, 0.018)
for j in range(10):
    gy = drain_cy - drain_d * 0.44 + j * (drain_d * 0.88 / 9)
    make_box(bm_grate, drain_cx, gy, 0.006, drain_w * 0.92, 0.045, 0.018)

# Under-Grate Neon Glow Bars
make_box(bm_cyan, drain_cx - 1.00, drain_cy, -0.08, 1.50, 0.08, 0.04)
make_box(bm_mag,  drain_cx + 1.00, drain_cy, -0.08, 1.50, 0.08, 0.04)

# 3.6 Inlaid Glowing Neon Circuit Tracks (Dual-Tone Cyan & Magenta)
# Outer Cyan Circuit Ring with 45-degree Chamfers (Z = 0.024)
cw, cd = 17.6, 3.80
ccx, ccy = 0.0, -0.20
strip_t = 0.075

# Main Cyan Loop Rails
make_box(bm_cyan, ccx, ccy - cd * 0.5, 0.024, cw - 1.2, strip_t, 0.020)
make_box(bm_cyan, ccx, ccy + cd * 0.5, 0.024, cw - 1.2, strip_t, 0.020)
make_box(bm_cyan, ccx - cw * 0.5, ccy, 0.024, strip_t, cd - 1.2, 0.020)
make_box(bm_cyan, ccx + cw * 0.5, ccy, 0.024, strip_t, cd - 1.2, 0.020)

# 45-Degree Chamfer Corners for Cyan Ring (rot around Z in horizontal plane!)
chamf_len = hypot(0.60, 0.60)
make_rot_box(bm_cyan, ccx - cw * 0.5 + 0.30, ccy + cd * 0.5 - 0.30, 0.024, chamf_len, strip_t, 0.020, rot=(0, 0, -radians(45)))
make_rot_box(bm_cyan, ccx + cw * 0.5 - 0.30, ccy + cd * 0.5 - 0.30, 0.024, chamf_len, strip_t, 0.020, rot=(0, 0, radians(45)))
make_rot_box(bm_cyan, ccx - cw * 0.5 + 0.30, ccy - cd * 0.5 + 0.30, 0.024, chamf_len, strip_t, 0.020, rot=(0, 0, radians(45)))
make_rot_box(bm_cyan, ccx + cw * 0.5 - 0.30, ccy - cd * 0.5 + 0.30, 0.024, chamf_len, strip_t, 0.020, rot=(0, 0, -radians(45)))

# Branching Circuit Spurs (Extending Outward to Flanks and Grate)
# Front-Left Branch
make_rot_box(bm_cyan, -9.6, -2.55, 0.024, 2.00, strip_t, 0.020, rot=(0, 0, radians(35)))
make_box(bm_cyan, -11.0, -3.20, 0.024, 1.60, strip_t, 0.020)
make_box(bm_cyan, -11.8, -3.20, 0.024, 0.25, 0.25, 0.025) # Node pad

# Front-Right Branch
make_rot_box(bm_cyan, 9.6, -2.55, 0.024, 2.00, strip_t, 0.020, rot=(0, 0, -radians(35)))
make_box(bm_cyan, 11.0, -3.20, 0.024, 1.60, strip_t, 0.020)
make_box(bm_cyan, 11.8, -3.20, 0.024, 0.25, 0.25, 0.025) # Node pad

# Drain Grate Feeder Circuit Lines
make_box(bm_cyan, -2.8, -3.20, 0.024, 1.80, strip_t, 0.020)
make_box(bm_cyan, 2.8, -3.20, 0.024, 1.80, strip_t, 0.020)

# Inner Magenta Battle Octagon / Chamfered Loop (Z = 0.026)
mw, md = 15.2, 2.60
make_box(bm_mag, ccx, ccy - md * 0.5, 0.026, mw - 1.0, strip_t * 0.9, 0.020)
make_box(bm_mag, ccx, ccy + md * 0.5, 0.026, mw - 1.0, strip_t * 0.9, 0.020)
make_box(bm_mag, ccx - mw * 0.5, ccy, 0.026, strip_t * 0.9, md - 1.0, 0.020)
make_box(bm_mag, ccx + mw * 0.5, ccy, 0.026, strip_t * 0.9, md - 1.0, 0.020)

# Magenta Chamfers (rot around Z in horizontal plane!)
m_chamf_len = hypot(0.50, 0.50)
make_rot_box(bm_mag, ccx - mw * 0.5 + 0.25, ccy + md * 0.5 - 0.25, 0.026, m_chamf_len, strip_t * 0.9, 0.020, rot=(0, 0, -radians(45)))
make_rot_box(bm_mag, ccx + mw * 0.5 - 0.25, ccy + md * 0.5 - 0.25, 0.026, m_chamf_len, strip_t * 0.9, 0.020, rot=(0, 0, radians(45)))
make_rot_box(bm_mag, ccx - mw * 0.5 + 0.25, ccy - md * 0.5 + 0.25, 0.026, m_chamf_len, strip_t * 0.9, 0.020, rot=(0, 0, radians(45)))
make_rot_box(bm_mag, ccx + mw * 0.5 - 0.25, ccy - md * 0.5 + 0.25, 0.026, m_chamf_len, strip_t * 0.9, 0.020, rot=(0, 0, -radians(45)))

# 3.7 Foreground Left & Right Curb Consoles (Z = 0.0 to 0.40)
for sign_c in [-1, 1]:
    curb_x = sign_c * 10.8
    curb_y = -4.80
    # Dark console base
    make_box(bm_darkmetal, curb_x, curb_y, 0.20, 2.80, 1.10, 0.40)
    make_box(bm_plates, curb_x, curb_y, 0.41, 2.70, 1.02, 0.02)
    # Cyan louver slots
    for lv in range(3):
        make_box(bm_cyan, curb_x, curb_y - 0.56, 0.12 + lv * 0.09, 1.80, 0.03, 0.035)

# Small Foreground Antenna Stub on Right Console
make_cylinder(bm_darkmetal, 11.8, -4.80, 0.65, 0.03, 0.50)
make_cylinder(bm_cyan, 11.8, -4.80, 0.92, 0.015, 0.10)
make_cylinder(bm_plates, 11.8, -4.80, 0.98, 0.04, 0.02)

# ==============================================================================
# 4. INDUSTRIAL PERIMETER GUARDRAIL (Across the Back Edge at Y = 2.15)
# ==============================================================================
rail_y = 2.15
post_xs = [-10.8, -8.1, -5.4, -2.7, 0.0, 2.7, 5.4, 8.1, 10.8]

# Stanchion Posts with Vertical Cyan Indicator Strips
for px in post_xs:
    # Heavy beveled steel post
    make_box(bm_darkmetal, px, rail_y, 0.58, 0.30, 0.26, 1.16)
    make_box(bm_plates, px, rail_y, 0.02, 0.42, 0.36, 0.04) # Base plate
    make_box(bm_plates, px, rail_y, 1.18, 0.34, 0.30, 0.04) # Cap plate
    # Glowing vertical cyan strip on front face
    make_box(bm_cyan, px, rail_y - 0.14, 0.58, 0.07, 0.03, 0.76)

# Continuous Horizontal Guardrails
# Top Handrail (Z = 1.12)
make_box(bm_darkmetal, 0.0, rail_y, 1.12, 22.8, 0.16, 0.10)
make_box(bm_cyan,      0.0, rail_y - 0.09, 1.10, 22.6, 0.04, 0.04)

# Middle Safety Rail (Z = 0.60)
make_box(bm_darkmetal, 0.0, rail_y, 0.60, 22.8, 0.12, 0.08)
make_box(bm_cyan,      0.0, rail_y - 0.07, 0.60, 22.6, 0.04, 0.04)

# Bottom Kickplate (Z = 0.12)
make_box(bm_darkmetal, 0.0, rail_y, 0.12, 22.8, 0.10, 0.14)

# Railing Bay Infill Balusters
for b in range(len(post_xs) - 1):
    x_left = post_xs[b]
    x_right = post_xs[b+1]
    for sub in [0.30, 0.70]:
        bx = x_left + (x_right - x_left) * sub
        make_box(bm_darkmetal, bx, rail_y, 0.60, 0.05, 0.05, 0.90)

# ==============================================================================
# 5. PLATFORM EDGE MACHINERY & INDUSTRIAL PROPS (Framed cleanly inside frustum)
# ==============================================================================
bm_orange = bmesh.new()
bm_yellow = bmesh.new()
bm_white  = bmesh.new()
bm_led_r  = bmesh.new()
bm_led_g  = bmesh.new()

# 5.1 Left Side: Heavy Industrial Generator / HVAC Chiller Unit (X = -8.6, Y = 1.0)
gen_x, gen_y = -8.6, 1.00
# Main Chiller Housing
make_box(bm_darkmetal, gen_x, gen_y, 0.75, 2.20, 1.80, 1.50)
make_box(bm_plates, gen_x, gen_y, 1.52, 2.10, 1.70, 0.05)
# Setback Upper Module
make_box(bm_darkmetal, gen_x + 0.15, gen_y, 1.80, 1.60, 1.40, 0.50)

# Circular Protective Fan Shroud & Grille on Top
make_cylinder(bm_darkmetal, gen_x + 0.15, gen_y, 2.10, 0.55, 0.12)
make_box(bm_darkmetal, gen_x + 0.15, gen_y, 2.16, 1.10, 0.04, 0.03)
make_box(bm_darkmetal, gen_x + 0.15, gen_y, 2.16, 0.04, 1.10, 0.03)

# Front Louver Intake Slats
for lv in range(5):
    make_box(bm_plates, gen_x, gen_y - 0.92, 0.30 + lv * 0.18, 1.60, 0.04, 0.10)

# Digital Status Console with Glowing Screen & LEDs
make_box(bm_darkmetal, gen_x - 0.50, gen_y - 0.93, 1.15, 0.60, 0.06, 0.35)
make_box(bm_cyan, gen_x - 0.50, gen_y - 0.97, 1.20, 0.45, 0.02, 0.15)
make_cylinder(bm_led_g, gen_x - 0.65, gen_y - 0.97, 1.05, 0.022, 0.02, rot=(radians(90), 0, 0))
make_cylinder(bm_led_r, gen_x - 0.50, gen_y - 0.97, 1.05, 0.022, 0.02, rot=(radians(90), 0, 0))
make_cylinder(bm_orange, gen_x - 0.35, gen_y - 0.97, 1.05, 0.022, 0.02, rot=(radians(90), 0, 0))

# Articulated Directional Satellite Dish (Mounted above Generator at X = -8.4, Z = 2.4 to 3.2m)
sat_mast_x, sat_mast_y = -8.4, 1.20
make_cylinder(bm_darkmetal, sat_mast_x, sat_mast_y, 2.30, 0.06, 0.80)
# Parabolic Reflector (Lathed segments)
dish_cx, dish_cy, dish_cz = sat_mast_x, sat_mast_y, 2.75
dish_rot = (radians(32), radians(-15), radians(35))
make_cylinder(bm_plates, dish_cx, dish_cy, dish_cz, 0.65, 0.05, segments=20, rot=dish_rot)
make_cylinder(bm_darkmetal, dish_cx, dish_cy, dish_cz, 0.58, 0.08, segments=20, rot=dish_rot)
make_cone(bm_plates, dish_cx, dish_cy, dish_cz, 0.55, 0.10, 0.25, segments=20, rot=dish_rot)
# Transceiver Horn & Struts
make_cylinder(bm_cyan, dish_cx + 0.12, dish_cy - 0.20, dish_cz + 0.22, 0.030, 0.14, rot=dish_rot)

# Heavy Flexible Power Conduits (Snaking Across Deck)
# Conduit 1: Glowing Cyan Cable
for seg in range(12):
    t = seg / 11.0
    cx = gen_x + 0.90 + t * 1.50
    cy = gen_y - 0.70 + sin(t * math.pi) * 0.35 - t * 0.25
    cz = 0.04 + sin(t * math.pi * 0.8) * 0.05
    make_cylinder(bm_cyan, cx, cy, cz, 0.032, 0.16, rot=(0, radians(75), radians(15)))

# Conduit 2: Glowing Magenta Cable
for seg in range(10):
    t = seg / 9.0
    cx = gen_x + 0.95 + t * 1.20
    cy = gen_y - 0.40 + sin(t * math.pi) * 0.25
    cz = 0.04 + sin(t * math.pi) * 0.04
    make_cylinder(bm_mag, cx, cy, cz, 0.028, 0.15, rot=(0, radians(70), radians(20)))

# Conduit 3 & 4: Heavy Dark Rubber Cables
for seg in range(14):
    t = seg / 13.0
    cx = gen_x + 0.75 + t * 1.90
    cy = gen_y + 0.25 + sin(t * math.pi) * 0.45
    cz = 0.045
    make_cylinder(bm_darkmetal, cx, cy, cz, 0.045, 0.18, rot=(0, radians(80), radians(-10)))

# 5.2 Right Side: Telecom Station, Power Transformer & Coolant Tanks (X = +8.6, Y = 1.0)
tel_x, tel_y = 8.6, 1.00
# Main Transformer Housing
make_box(bm_darkmetal, tel_x, tel_y, 0.80, 2.20, 1.80, 1.60)
make_box(bm_plates, tel_x, tel_y, 1.62, 2.10, 1.70, 0.05)
# Cooling Fins along Outer Side
for fn in range(7):
    make_box(bm_plates, tel_x + 1.12, tel_y - 0.60 + fn * 0.18, 0.80, 0.07, 0.05, 1.30)

# Dual Pressurized Coolant Canisters (Standing by Railing at X = 7.2, 7.8)
for i, can_x in enumerate([7.2, 7.7]):
    can_y = 1.95
    make_cylinder(bm_plates, can_x, can_y, 0.38, 0.18, 0.76, segments=16)
    make_cone(bm_plates, can_x, can_y, 0.78, 0.18, 0.07, 0.07, segments=16)
    ring_mat = bm_cyan if i == 0 else bm_mag
    make_cylinder(ring_mat, can_x, can_y, 0.62, 0.188, 0.035, segments=16)
    make_cylinder(ring_mat, can_x, can_y, 0.28, 0.188, 0.035, segments=16)

# High-Gain Telecommunications Tower Mast (Rising to Z = 4.8m at X = 8.6)
mast_base_x, mast_base_y = 8.6, 1.15
make_cylinder(bm_darkmetal, mast_base_x, mast_base_y, 2.40, 0.07, 1.60)
make_cylinder(bm_plates, mast_base_x, mast_base_y, 3.60, 0.045, 1.60)
make_cylinder(bm_darkmetal, mast_base_x, mast_base_y, 4.50, 0.025, 1.00)

# Cross-Arms & Dipole Whip Aerials
make_box(bm_plates, mast_base_x, mast_base_y, 3.80, 1.10, 0.05, 0.05)
make_cylinder(bm_plates, mast_base_x - 0.50, mast_base_y, 4.30, 0.012, 0.90)
make_cylinder(bm_plates, mast_base_x + 0.50, mast_base_y, 4.30, 0.012, 0.90)

# Microwave Transceiver Drum
make_cylinder(bm_plates, mast_base_x - 0.22, mast_base_y - 0.12, 3.40, 0.20, 0.26, rot=(radians(85), 0, radians(25)))

# Blinking Red Aviation Obstacle Beacon
make_cylinder(bm_led_r, mast_base_x, mast_base_y, 5.05, 0.035, 0.09)

# ==============================================================================
# 6. FOREGROUND & MIDGROUND BUILDINGS WITH VERTICAL NEON PIPING
# ==============================================================================
bm_bldg_dark = bmesh.new()
bm_bldg_blue = bmesh.new()

# 6.1 Left Foreground Penthouse Superstructure (X = -9.5, Y = 6.2)
make_box(bm_bldg_dark, -9.5, 6.2, 3.5, 6.8, 6.5, 8.0)
make_box(bm_bldg_blue, -9.2, 6.6, 9.5, 5.8, 5.5, 6.0)
make_box(bm_bldg_dark, -8.8, 7.0, 14.5, 4.5, 4.5, 4.0)

# Vertical Glowing Cyan Light Pipes on Left Building Corners
for cx, cy in [(-6.1, 3.2), (-12.9, 3.2), (-6.1, 9.4), (-12.9, 9.4)]:
    make_cylinder(bm_cyan, cx, cy, 3.5, 0.07, 8.0)
for cx, cy in [(-6.3, 4.0), (-12.1, 4.0)]:
    make_cylinder(bm_cyan, cx, cy, 9.5, 0.06, 6.0)

# 6.2 Right Foreground Commercial Megatower (X = 9.5, Y = 6.2)
make_box(bm_bldg_dark, 9.5, 6.2, 4.0, 7.2, 6.5, 9.0)
make_box(bm_bldg_blue, 9.2, 6.6, 10.5, 6.2, 5.5, 6.0)
make_box(bm_bldg_dark, 8.8, 7.0, 16.5, 4.8, 4.8, 6.0)

# Vertical Magenta Light Pipes on Right Building Corners
for cx, cy in [(5.9, 3.2), (13.1, 3.2), (5.9, 9.4), (13.1, 9.4)]:
    make_cylinder(bm_mag, cx, cy, 4.0, 0.07, 9.0)
for cx, cy in [(6.1, 4.0), (12.3, 4.0)]:
    make_cylinder(bm_mag, cx, cy, 10.5, 0.06, 6.0)

# Skybridge Connecting Right Towers at Z = 4.8m
make_box(bm_bldg_dark, 6.0, 6.0, 4.8, 3.6, 1.4, 1.2)
make_box(bm_cyan, 6.0, 5.28, 4.8, 3.4, 0.05, 0.40)

STROKES = {
    'A': [(0.0, 0.0, 0.5, 1.0), (0.5, 1.0, 1.0, 0.0), (0.2, 0.4, 0.8, 0.4)],
    'B': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.8, 1.0), (0.8, 1.0, 0.8, 0.5), (0.8, 0.5, 0.0, 0.5),
          (0.0, 0.5, 0.9, 0.5), (0.9, 0.5, 0.9, 0.0), (0.9, 0.0, 0.0, 0.0)],
    'C': [(1.0, 1.0, 0.0, 1.0), (0.0, 1.0, 0.0, 0.0), (0.0, 0.0, 1.0, 0.0)],
    'D': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.7, 1.0), (0.7, 1.0, 1.0, 0.5), (1.0, 0.5, 0.7, 0.0), (0.7, 0.0, 0.0, 0.0)],
    'E': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 1.0, 1.0), (0.0, 0.5, 0.75, 0.5), (0.0, 0.0, 1.0, 0.0)],
    'F': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 1.0, 1.0), (0.0, 0.5, 0.75, 0.5)],
    'G': [(1.0, 1.0, 0.0, 1.0), (0.0, 1.0, 0.0, 0.0), (0.0, 0.0, 1.0, 0.0), (1.0, 0.0, 1.0, 0.5), (0.5, 0.5, 1.0, 0.5)],
    'H': [(0.0, 0.0, 0.0, 1.0), (1.0, 0.0, 1.0, 1.0), (0.0, 0.5, 1.0, 0.5)],
    'I': [(0.5, 0.0, 0.5, 1.0), (0.2, 1.0, 0.8, 1.0), (0.2, 0.0, 0.8, 0.0)],
    'K': [(0.0, 0.0, 0.0, 1.0), (0.0, 0.5, 0.9, 1.0), (0.0, 0.5, 0.9, 0.0)],
    'L': [(0.0, 1.0, 0.0, 0.0), (0.0, 0.0, 1.0, 0.0)],
    'M': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.5, 0.5), (0.5, 0.5, 1.0, 1.0), (1.0, 1.0, 1.0, 0.0)],
    'N': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 1.0, 0.0), (1.0, 0.0, 1.0, 1.0)],
    'O': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 1.0, 1.0), (1.0, 1.0, 1.0, 0.0), (1.0, 0.0, 0.0, 0.0)],
    'P': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.9, 1.0), (0.9, 1.0, 0.9, 0.5), (0.9, 0.5, 0.0, 0.5)],
    'R': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 0.9, 1.0), (0.9, 1.0, 0.9, 0.5), (0.9, 0.5, 0.0, 0.5), (0.2, 0.5, 0.9, 0.0)],
    'S': [(1.0, 1.0, 0.0, 1.0), (0.0, 1.0, 0.0, 0.5), (0.0, 0.5, 1.0, 0.5), (1.0, 0.5, 1.0, 0.0), (1.0, 0.0, 0.0, 0.0)],
    'T': [(0.0, 1.0, 1.0, 1.0), (0.5, 1.0, 0.5, 0.0)],
    'V': [(0.0, 1.0, 0.5, 0.0), (0.5, 0.0, 1.0, 1.0)],
    'Y': [(0.0, 1.0, 0.5, 0.5), (1.0, 1.0, 0.5, 0.5), (0.5, 0.5, 0.5, 0.0)],
    '-': [(0.2, 0.5, 0.8, 0.5)],
    '2': [(0.0, 1.0, 1.0, 1.0), (1.0, 1.0, 1.0, 0.55), (1.0, 0.55, 0.0, 0.45), (0.0, 0.45, 0.0, 0.0), (0.0, 0.0, 1.0, 0.0)],
    '0': [(0.0, 0.0, 0.0, 1.0), (0.0, 1.0, 1.0, 1.0), (1.0, 1.0, 1.0, 0.0), (1.0, 0.0, 0.0, 0.0), (0.2, 0.2, 0.8, 0.8)],
    '4': [(0.0, 1.0, 0.0, 0.45), (0.0, 0.45, 1.0, 0.45), (0.8, 1.0, 0.8, 0.0)],
    '9': [(1.0, 0.0, 1.0, 1.0), (1.0, 1.0, 0.0, 1.0), (0.0, 1.0, 0.0, 0.5), (0.0, 0.5, 1.0, 0.5)],
}

def add_neon_text(bm, text, bx, by, bz, char_w=0.35, char_h=0.60, thick=0.045, depth=0.05, spacing=0.12):
    n = len(text)
    total_w = n * char_w + max(0, n - 1) * spacing
    start_x = bx - total_w * 0.5
    for i, ch in enumerate(text):
        if ch == ' ':
            continue
        cx = start_x + i * (char_w + spacing)
        cz = bz - char_h * 0.5
        strokes = STROKES.get(ch, [])
        for (x1, z1, x2, z2) in strokes:
            p1x = cx + x1 * char_w
            p1z = cz + z1 * char_h
            p2x = cx + x2 * char_w
            p2z = cz + z2 * char_h
            dx = p2x - p1x
            dz = p2z - p1z
            L = hypot(dx, dz)
            if L < 1e-4:
                continue
            theta = atan2(dz, dx)
            mx = (p1x + p2x) * 0.5
            mz = (p1z + p2z) * 0.5
            make_rot_box(bm, mx, by, mz, L, depth, thick, rot=(0, -theta, 0))

def add_sign_frame(bm_back, bm_neon, bx, by, bz, bw, bh, border_t=0.08):
    # Dark Backing Box
    make_box(bm_back, bx, by, bz, bw, 0.16, bh)
    # Glowing Neon Border
    make_box(bm_neon, bx, by - 0.09, bz + bh * 0.5, bw, 0.05, border_t)
    make_box(bm_neon, bx, by - 0.09, bz - bh * 0.5, bw, 0.05, border_t)
    make_box(bm_neon, bx - bw * 0.5, by - 0.09, bz, border_t, 0.05, bh)
    make_box(bm_neon, bx + bw * 0.5, by - 0.09, bz, border_t, 0.05, bh)

# ==============================================================================
# 7. AUTHENTIC 3D NEON BILLBOARDS & SIGNAGE (PERFECTLY STAGGERED & UNCLUTTERED)
# ==============================================================================
bm_sign_backs = bmesh.new()

# 7.1 Sign: "CYBER ARCADE" (Top Right, X = 8.8, Y = 5.05, Z = 6.2)
add_sign_frame(bm_sign_backs, bm_mag, 8.8, 5.05, 6.20, 3.60, 2.00, border_t=0.07)
make_box(bm_cyan, 8.8, 4.95, 6.20 + 0.85, 3.30, 0.04, 0.045)
make_box(bm_cyan, 8.8, 4.95, 6.20 - 0.85, 3.30, 0.04, 0.045)
make_box(bm_cyan, 8.8 - 1.65, 4.95, 6.20, 0.045, 0.04, 1.70)
make_box(bm_cyan, 8.8 + 1.65, 4.95, 6.20, 0.045, 0.04, 1.70)
# 3D Neon Lettering
add_neon_text(bm_cyan, "CYBER", 8.8, 4.93, 6.62, char_w=0.32, char_h=0.52, thick=0.048, spacing=0.12)
add_neon_text(bm_cyan, "ARCADE", 8.8, 4.93, 5.78, char_w=0.30, char_h=0.52, thick=0.048, spacing=0.10)

# 7.2 Sign: "NEON DRAGON" (Below Cyber Arcade, X = 8.8, Y = 5.05, Z = 3.6)
add_sign_frame(bm_sign_backs, bm_mag, 8.8, 5.05, 3.60, 3.60, 2.50, border_t=0.07)
# Serpentine Neon Dragon Crest Logo
d_cx, d_cy, d_cz = 8.8, 4.93, 4.30
make_rot_box(bm_mag, d_cx - 0.55, d_cy, d_cz - 0.10, 0.65, 0.04, 0.055, rot=(0, radians(25), 0))
make_rot_box(bm_mag, d_cx, d_cy, d_cz + 0.10, 0.80, 0.04, 0.055, rot=(0, -radians(30), 0))
make_rot_box(bm_mag, d_cx + 0.55, d_cy, d_cz - 0.03, 0.65, 0.04, 0.055, rot=(0, radians(35), 0))
make_rot_box(bm_mag, d_cx + 0.90, d_cy, d_cz + 0.18, 0.35, 0.04, 0.055, rot=(0, -radians(45), 0))
make_rot_box(bm_mag, d_cx + 1.05, d_cy, d_cz + 0.32, 0.25, 0.04, 0.045, rot=(0, radians(20), 0))
make_cylinder(bm_yellow, d_cx + 0.82, d_cy - 0.01, d_cz + 0.20, 0.030, 0.03, rot=(radians(90), 0, 0))
make_rot_box(bm_mag, d_cx - 0.15, d_cy, d_cz + 0.28, 0.55, 0.04, 0.045, rot=(0, radians(60), 0))
make_rot_box(bm_mag, d_cx + 0.15, d_cy, d_cz + 0.32, 0.58, 0.04, 0.045, rot=(0, radians(45), 0))

# 3D Neon Lettering "NEON DRAGON"
add_neon_text(bm_mag, "NEON", 8.8, 4.93, 3.55, char_w=0.32, char_h=0.50, thick=0.045, spacing=0.12)
add_neon_text(bm_mag, "DRAGON", 8.8, 4.93, 2.80, char_w=0.30, char_h=0.50, thick=0.045, spacing=0.10)

# 7.3 Sign: "RAMEN 2049" (To the Left of Neon Dragon, X = 5.8, Y = 6.10, Z = 4.3)
add_sign_frame(bm_sign_backs, bm_orange, 5.8, 6.10, 4.30, 2.60, 1.50, border_t=0.065)
add_neon_text(bm_yellow, "RAMEN", 5.8, 6.00, 4.62, char_w=0.28, char_h=0.45, thick=0.042, spacing=0.09)
add_neon_text(bm_orange, "2049", 5.8, 6.00, 3.95, char_w=0.28, char_h=0.45, thick=0.042, spacing=0.10)

# 7.4 Sign: "TECH-DRIVE" (Below Ramen 2049, X = 5.8, Y = 6.10, Z = 2.6)
add_sign_frame(bm_sign_backs, bm_cyan, 5.8, 6.10, 2.60, 2.60, 1.20, border_t=0.065)
add_neon_text(bm_orange, "TECH-DRIVE", 5.8, 6.00, 2.60, char_w=0.16, char_h=0.38, thick=0.038, spacing=0.06)

# 7.5 Sign: "CYBERNETICS" (Center-Right at X = 3.2, Y = 7.35, Z = 4.2)
add_sign_frame(bm_sign_backs, bm_cyan, 3.2, 7.35, 4.20, 2.40, 0.85, border_t=0.055)
add_neon_text(bm_white, "CYBERNETICS", 3.2, 7.25, 4.20, char_w=0.15, char_h=0.36, thick=0.034, spacing=0.06)

# 7.6 Sign: "NEO-KYOTO" (Left Building Top Facade, X = -6.5, Y = 5.10, Z = 6.4)
add_sign_frame(bm_sign_backs, bm_cyan, -6.5, 5.10, 6.40, 3.40, 1.30, border_t=0.065)
add_neon_text(bm_white, "NEO-KYOTO", -6.5, 5.00, 6.40, char_w=0.25, char_h=0.48, thick=0.045, spacing=0.08)

# 7.7 Holographic Anime Visor Girl Billboard (Left Mid-Level, X = -5.6, Y = 5.10, Z = 4.0)
add_sign_frame(bm_sign_backs, bm_mag, -5.6, 5.10, 4.00, 2.20, 2.50, border_t=0.07)
# Anime Visor Silhouette Graphics
av_x, av_y, av_z = -5.6, 4.98, 4.00
make_box(bm_cyan, av_x, av_y, av_z + 0.28, 1.00, 0.04, 0.18)
make_rot_box(bm_mag, av_x - 0.42, av_y, av_z + 0.55, 0.60, 0.04, 0.050, rot=(0, -radians(40), 0))
make_rot_box(bm_mag, av_x + 0.42, av_y, av_z + 0.55, 0.60, 0.04, 0.050, rot=(0, radians(40), 0))
make_rot_box(bm_mag, av_x - 0.28, av_y, av_z - 0.28, 0.46, 0.04, 0.042, rot=(0, radians(55), 0))
make_rot_box(bm_mag, av_x + 0.28, av_y, av_z - 0.28, 0.46, 0.04, 0.042, rot=(0, -radians(55), 0))
make_box(bm_cyan, av_x, av_y, av_z - 0.60, 1.10, 0.04, 0.06)

# 7.8 Glowing Ramen Noodle Bowl Sign (Left Lower, X = -8.2, Y = 5.00, Z = 2.0)
rb_x, rb_y, rb_z = -8.2, 5.00, 2.00
add_sign_frame(bm_sign_backs, bm_yellow, rb_x, rb_y, rb_z, 1.70, 1.70, border_t=0.055)
make_box(bm_mag, rb_x, rb_y - 0.10, rb_z + 0.04, 1.00, 0.04, 0.055)
make_rot_box(bm_mag, rb_x - 0.36, rb_y - 0.10, rb_z - 0.20, 0.52, 0.04, 0.050, rot=(0, radians(45), 0))
make_rot_box(bm_mag, rb_x + 0.36, rb_y - 0.10, rb_z - 0.20, 0.52, 0.04, 0.050, rot=(0, -radians(45), 0))
make_box(bm_mag, rb_x, rb_y - 0.10, rb_z - 0.38, 0.50, 0.04, 0.050)
make_rot_box(bm_white, rb_x + 0.16, rb_y - 0.11, rb_z + 0.20, 1.00, 0.03, 0.032, rot=(0, -radians(25), 0))
make_rot_box(bm_white, rb_x + 0.16, rb_y - 0.11, rb_z + 0.28, 1.00, 0.03, 0.032, rot=(0, -radians(28), 0))
make_rot_box(bm_yellow, rb_x - 0.20, rb_y - 0.10, rb_z + 0.35, 0.32, 0.03, 0.032, rot=(0, radians(30), 0))
make_rot_box(bm_yellow, rb_x, rb_y - 0.10, rb_z + 0.44, 0.36, 0.03, 0.032, rot=(0, -radians(25), 0))

# 7.9 Vertical Katakana Banner: "ネオ・キョウト" (X = -8.8, Y = 5.00, Z = 4.2)
vk_x, vk_y, vk_z = -8.8, 5.00, 4.20
add_sign_frame(bm_sign_backs, bm_orange, vk_x, vk_y, vk_z, 0.90, 3.60, border_t=0.055)
kana_chars = [
    [(0.2, 0.8, 0.8, 0.8), (0.5, 0.8, 0.2, 0.2), (0.4, 0.5, 0.8, 0.2)],
    [(0.2, 0.7, 0.8, 0.7), (0.5, 0.9, 0.5, 0.1), (0.5, 0.5, 0.2, 0.2)],
    [(0.4, 0.5, 0.6, 0.5)],
    [(0.2, 0.7, 0.8, 0.7), (0.2, 0.4, 0.8, 0.4), (0.5, 0.9, 0.4, 0.1)],
    [(0.2, 0.8, 0.2, 0.2), (0.2, 0.8, 0.8, 0.8), (0.2, 0.5, 0.7, 0.5), (0.2, 0.2, 0.8, 0.2)],
    [(0.5, 0.9, 0.5, 0.7), (0.2, 0.7, 0.8, 0.7), (0.2, 0.7, 0.2, 0.4), (0.8, 0.7, 0.8, 0.2)],
    [(0.3, 0.9, 0.3, 0.1), (0.3, 0.5, 0.8, 0.3)]
]
for ki, strokes in enumerate(kana_chars):
    char_cz = vk_z + 1.40 - ki * 0.46
    for (x1, z1, x2, z2) in strokes:
        p1x = vk_x - 0.26 + x1 * 0.52
        p1z = char_cz - 0.18 + z1 * 0.36
        p2x = vk_x - 0.26 + x2 * 0.52
        p2z = char_cz - 0.18 + z2 * 0.36
        dx, dz = p2x - p1x, p2z - p1z
        L = hypot(dx, dz)
        if L < 1e-4: continue
        theta = atan2(dz, dx)
        make_rot_box(bm_mag, (p1x + p2x)*0.5, vk_y - 0.09, (p1z + p2z)*0.5, L, 0.04, 0.038, rot=(0, -theta, 0))

# 7.10 Vertical Kanji Sign: "巨大ロボット" (X = -4.2, Y = 6.10, Z = 3.4)
kanji_x, kanji_y, kanji_z = -4.2, 6.10, 3.40
add_sign_frame(bm_sign_backs, bm_mag, kanji_x, kanji_y, kanji_z, 0.85, 3.00, border_t=0.055)
for r in range(4):
    kz = kanji_z + 1.05 - r * 0.70
    make_box(bm_mag, kanji_x, kanji_y - 0.09, kz + 0.14, 0.55, 0.04, 0.040)
    make_box(bm_mag, kanji_x, kanji_y - 0.09, kz,        0.38, 0.04, 0.040)
    make_box(bm_mag, kanji_x, kanji_y - 0.09, kz - 0.14, 0.55, 0.04, 0.040)
    make_box(bm_mag, kanji_x, kanji_y - 0.09, kz,        0.040, 0.04, 0.38)

# 7.11 Upper Setback "NEO-KYOTO" on Right Tower (X = 7.5, Y = 7.2, Z = 9.8)
add_sign_frame(bm_sign_backs, bm_cyan, 7.5, 7.20, 9.80, 2.80, 1.00, border_t=0.055)
add_neon_text(bm_cyan, "NEO-KYOTO", 7.5, 7.10, 9.80, char_w=0.20, char_h=0.42, thick=0.038, spacing=0.07)

# ==============================================================================
# 8. DENSE MEGACITY SKYLINE (36+ DIVERSE 3D SKYSCRAPERS)
# ==============================================================================
bm_city = bmesh.new()
bm_win_cyan = bmesh.new()
bm_win_amber = bmesh.new()
bm_win_blue = bmesh.new()

def add_detailed_skyscraper(bm, cx, cy, cz_base, width, depth, height, crown_type='spire', spire_h=4.0):
    t1_h = height * 0.55
    make_box(bm, cx, cy, cz_base + t1_h * 0.5, width, depth, t1_h)
    
    # Stepped setback
    t2_h = height * 0.30
    w2, d2 = width * 0.80, depth * 0.80
    z2_base = cz_base + t1_h
    make_box(bm, cx, cy, z2_base + t2_h * 0.5, w2, d2, t2_h)
    
    # Upper crown
    t3_h = height * 0.15
    w3, d3 = w2 * 0.75, d2 * 0.75
    z3_base = z2_base + t2_h
    make_box(bm, cx, cy, z3_base + t3_h * 0.5, w3, d3, t3_h)
    
    crown_top = z3_base + t3_h
    if crown_type == 'spire':
        make_cone(bm, cx, cy, crown_top + spire_h * 0.5, 0.35, 0.04, spire_h, segments=8)
        make_cylinder(bm_led_r, cx, cy, crown_top + spire_h + 0.10, 0.08, 0.16)
    elif crown_type == 'pyramid':
        make_cone(bm, cx, cy, crown_top + spire_h * 0.4, w3 * 0.65, 0.08, spire_h * 0.8, segments=4, rot=(0, 0, radians(45)))
        make_cylinder(bm_led_r, cx, cy, crown_top + spire_h * 0.8 + 0.08, 0.08, 0.16)
    elif crown_type == 'twin_spire':
        make_cone(bm, cx - w3 * 0.3, cy, crown_top + spire_h * 0.4, 0.22, 0.03, spire_h * 0.8, segments=6)
        make_cone(bm, cx + w3 * 0.3, cy, crown_top + spire_h * 0.4, 0.22, 0.03, spire_h * 0.8, segments=6)
        make_cylinder(bm_led_r, cx - w3 * 0.3, cy, crown_top + spire_h * 0.8 + 0.08, 0.06, 0.12)
        make_cylinder(bm_led_r, cx + w3 * 0.3, cy, crown_top + spire_h * 0.8 + 0.08, 0.06, 0.12)
    elif crown_type == 'helipad':
        make_cylinder(bm, cx, cy, crown_top + 0.25, w3 * 0.65, 0.15, segments=16)
        make_cylinder(bm_cyan, cx, cy, crown_top + 0.34, w3 * 0.55, 0.03, segments=16)
    elif crown_type == 'slant':
        make_rot_box(bm, cx, cy, crown_top + 0.80, w3, d3, 1.60, rot=(radians(25), 0, 0))

# 36 Diverse Skyscrapers spanning 3 Depth Tiers
city_towers = [
    # Tier 1: Near Midground (Y = 12 to 18m)
    (-14.0, 13.0, -1.0, 4.6, 4.2, 10.5, 'twin_spire', 3.0),
    (-9.5,  14.5, -1.0, 4.2, 3.8, 12.5, 'spire', 3.5),
    (-5.5,  13.5, -1.0, 3.8, 3.6, 11.0, 'pyramid', 3.0),
    (-1.8,  14.0, -1.0, 4.2, 3.8, 13.5, 'spire', 4.0),
    (1.8,   13.5, -1.0, 4.0, 3.6, 11.5, 'slant', 0.0),
    (5.5,   13.0, -1.0, 4.0, 3.8, 10.5, 'helipad', 0.0),
    (9.5,   14.5, -1.0, 4.5, 4.0, 13.0, 'spire', 4.0),
    (14.5,  13.5, -1.0, 4.8, 4.2, 12.0, 'twin_spire', 3.5),
    (-18.0, 15.5, -1.0, 5.0, 4.5, 11.0, 'pyramid', 3.0),
    (18.5,  15.5, -1.0, 5.2, 4.6, 11.5, 'spire', 3.5),
    (-11.5, 17.0, -1.0, 4.5, 4.0, 14.5, 'spire', 4.2),
    (12.0,  17.0, -1.0, 4.8, 4.2, 15.0, 'pyramid', 4.2),

    # Tier 2: Midground Megatowers (Y = 20 to 32m)
    (-16.0, 23.0, -1.0, 5.5, 5.0, 16.0, 'spire', 5.5),
    (-11.0, 25.0, -1.0, 5.2, 4.8, 19.5, 'pyramid', 6.5),
    (-6.5,  22.5, -1.0, 5.0, 4.5, 17.0, 'twin_spire', 5.0),
    (-2.2,  24.5, -1.0, 5.6, 5.0, 21.0, 'spire', 7.5),
    (2.2,   23.0, -1.0, 5.2, 4.6, 18.5, 'helipad', 0.0),
    (6.5,   26.0, -1.0, 5.8, 5.2, 22.0, 'spire', 8.0),
    (10.5,  23.5, -1.0, 5.4, 4.8, 19.0, 'slant', 0.0),
    (15.5,  25.5, -1.0, 6.0, 5.4, 20.0, 'twin_spire', 6.0),
    (20.5,  24.0, -1.0, 6.2, 5.5, 17.0, 'pyramid', 5.0),
    (-21.0, 26.0, -1.0, 6.4, 5.6, 15.5, 'spire', 4.5),
    (24.5,  26.0, -1.0, 6.5, 5.8, 16.0, 'helipad', 0.0),
    (0.0,   28.0, -1.0, 5.8, 5.2, 24.0, 'spire', 8.5),

    # Tier 3: Far Megastructure Spires (Y = 36 to 60m)
    (-24.0, 40.0, -1.0, 7.5, 6.5, 24.0, 'pyramid', 8.0),
    (-17.0, 42.0, -1.0, 7.0, 6.2, 29.0, 'spire', 10.0),
    (-10.0, 39.0, -1.0, 6.8, 6.0, 32.0, 'spire', 11.0),
    (-3.0,  44.0, -1.0, 7.8, 7.0, 36.0, 'spire', 13.0),
    (3.0,   41.0, -1.0, 7.4, 6.6, 33.0, 'twin_spire', 10.0),
    (9.5,   39.0, -1.0, 6.8, 6.2, 30.0, 'spire', 10.0),
    (16.5,  43.0, -1.0, 7.6, 6.8, 26.0, 'pyramid', 8.0),
    (23.0,  42.0, -1.0, 8.0, 7.2, 24.0, 'spire', 7.5),
    (-28.0, 48.0, -1.0, 8.5, 7.5, 21.0, 'slant', 0.0),
    (29.0,  48.0, -1.0, 8.5, 7.5, 22.0, 'spire', 7.0),
    (-6.5,  52.0, -1.0, 8.2, 7.4, 38.0, 'spire', 14.0),
    (5.5,   50.0, -1.0, 8.0, 7.2, 35.0, 'spire', 12.0),
]

for tw in city_towers:
    add_detailed_skyscraper(bm_city, tw[0], tw[1], tw[2], tw[3], tw[4], tw[5], tw[6], tw[7])

# Distant Skybridges Spanning Between Skyscrapers
skybridges = [
    (-7.5, 14.0, 6.8, 4.0, 0.9, 1.0),
    (3.6,  13.5, 7.2, 3.6, 0.9, 1.0),
    (-13.5, 24.0, 10.5, 5.0, 1.1, 1.2),
    (4.2,   24.5, 11.5, 5.2, 1.1, 1.2),
    (-13.5, 40.5, 16.5, 7.0, 1.4, 1.5),
    (6.2,   40.0, 17.0, 6.8, 1.4, 1.5)
]
for sb in skybridges:
    make_box(bm_city, sb[0], sb[1], sb[2], sb[3], sb[4], sb[5])
    make_box(bm_win_cyan, sb[0], sb[1] - sb[4]*0.51, sb[2], sb[3] * 0.92, 0.04, sb[5] * 0.45)

# Procedural Illuminated Window Arrays Across the Skyline
random.seed(2049)
for tw in city_towers:
    tx, ty, tz, tw_w, tw_d, tw_h = tw[0], tw[1], tw[2], tw[3], tw[4], tw[5]
    rows = int(min(tw_h * 1.8, 22))
    cols = int(min(tw_w * 1.6, 7))
    if cols < 3: cols = 3
    
    bldg_color_choice = random.choice(['cyan_heavy', 'amber_mix', 'blue_office'])
    
    for r in range(rows):
        wz = tz + 1.2 + r * (tw_h * 0.85 / max(rows, 1))
        # Horizontal ribbon windows on certain floors
        if r % 5 == 0 and tw_h > 14.0:
            make_box(bm_win_cyan, tx, ty - tw_d * 0.51, wz, tw_w * 0.85, 0.04, 0.22)
            continue
            
        for c in range(cols):
            if random.random() < 0.65:
                wx = tx - tw_w * 0.40 + c * (tw_w * 0.80 / max(cols - 1, 1))
                bm_target = bm_win_cyan
                if bldg_color_choice == 'amber_mix':
                    bm_target = random.choice([bm_win_amber, bm_win_cyan, bm_win_amber])
                elif bldg_color_choice == 'blue_office':
                    bm_target = random.choice([bm_win_blue, bm_win_cyan])
                    
                make_box(bm_target, wx, ty - tw_d * 0.51, wz, tw_w * 0.09, 0.03, 0.20)

# ==============================================================================
# 9. FLYING HOVERCARS / AEROCARS WITH LASER MOTION TRAILS (PROMINENT SKY TRAFFIC)
# ==============================================================================
bm_car_body = bmesh.new()
bm_trail_cyan = bmesh.new()
bm_trail_orange = bmesh.new()
bm_trail_mag = bmesh.new()

# Hovercar 1: Upper Sky High-Speed Spinner (Left to Right at Z = 5.6m, crossing center sky)
hc1_x, hc1_y, hc1_z = -0.5, 11.5, 5.60
make_rot_box(bm_car_body, hc1_x, hc1_y, hc1_z, 1.80, 0.70, 0.38, rot=(radians(4), radians(-8), radians(-5)))
make_rot_box(bm_trail_cyan, hc1_x + 0.25, hc1_y - 0.05, hc1_z + 0.10, 0.70, 0.50, 0.20, rot=(radians(4), radians(-8), radians(-5)))
make_cylinder(bm_trail_cyan, hc1_x - 0.85, hc1_y + 0.08, hc1_z + 0.06, 0.07, 0.10, rot=(0, radians(80), 0))
make_cylinder(bm_trail_cyan, hc1_x - 0.85, hc1_y - 0.08, hc1_z + 0.06, 0.07, 0.10, rot=(0, radians(80), 0))

# Elongated Streaking Laser Trail (Dual-Layer: Brilliant Cyan Core + Orange Outer Sheath)
trail1_len = 16.0
trail1_rot = (radians(4), radians(-8), radians(-5))
make_rot_box(bm_trail_cyan, hc1_x - trail1_len * 0.5, hc1_y, hc1_z + 0.06, trail1_len, 0.065, 0.08, rot=trail1_rot)
make_rot_box(bm_trail_orange, hc1_x - trail1_len * 0.42, hc1_y, hc1_z + 0.06, trail1_len * 0.85, 0.13, 0.15, rot=trail1_rot)

# Hovercar 2: Mid-Altitude Crossing Spinner (Right to Left at Z = 4.4m)
hc2_x, hc2_y, hc2_z = 2.8, 13.5, 4.40
make_rot_box(bm_car_body, hc2_x, hc2_y, hc2_z, 1.80, 0.75, 0.40, rot=(radians(-3), radians(10), radians(8)))
make_rot_box(bm_trail_mag, hc2_x - 0.18, hc2_y - 0.05, hc2_z + 0.10, 0.70, 0.52, 0.20, rot=(radians(-3), radians(10), radians(8)))
trail2_len = 14.0
trail2_rot = (radians(-3), radians(10), radians(8))
make_rot_box(bm_trail_mag, hc2_x + trail2_len * 0.5, hc2_y, hc2_z + 0.06, trail2_len, 0.07, 0.09, rot=trail2_rot)
make_rot_box(bm_trail_cyan, hc2_x + trail2_len * 0.4, hc2_y, hc2_z + 0.06, trail2_len * 0.80, 0.12, 0.12, rot=trail2_rot)

# Distant Cruising Sky Traffic (Small 3D Air Pods)
random.seed(777)
for i in range(14):
    ax = -18.0 + random.random() * 36.0
    ay = 16.0 + random.random() * 22.0
    az = 3.2 + random.random() * 10.0
    direction = 1 if i % 2 == 0 else -1
    make_box(bm_car_body, ax, ay, az, 0.75, 0.32, 0.20)
    make_box(bm_trail_cyan, ax + direction * 0.38, ay, az, 0.07, 0.22, 0.09)
    make_box(bm_trail_orange, ax - direction * 0.38, ay, az, 0.07, 0.22, 0.09)
    make_box(bm_trail_orange, ax - direction * 1.4, ay, az, 2.0, 0.035, 0.05)

# ==============================================================================
# 10. 3D RAINY NIGHT SKY DOME & HORIZON NEON HAZE
# ==============================================================================
bpy.ops.mesh.primitive_uv_sphere_add(radius=95.0, location=(0.0, 25.0, 10.0), segments=36, ring_count=24)
sky_dome = bpy.context.active_object
sky_dome.name = "Cyber_3D_Sky_Dome"
sky_dome.data.materials.append(mat_sky_smog)
bpy.ops.object.shade_smooth()
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

# ==============================================================================
# 11. CONVERT BMESHES TO BLENDER OBJECTS & ASSIGN MATERIALS
# ==============================================================================
mesh_mappings = [
    ("Cyber_3D_Platform",       bm_plat,        mat_deck_wet),
    ("Cyber_3D_Floor_Plates",   bm_plates,      mat_deck_plate),
    ("Cyber_3D_Metal_Dark",     bm_darkmetal,   mat_metal_dark),
    ("Cyber_3D_Drain_Grate",    bm_grate,       mat_grate),
    ("Cyber_3D_Deck_Cyan",      bm_cyan,        mat_neon_cyan),
    ("Cyber_3D_Deck_Magenta",   bm_mag,         mat_neon_magenta),
    ("Cyber_3D_Neon_Orange",    bm_orange,      mat_neon_orange),
    ("Cyber_3D_Neon_Yellow",    bm_yellow,      mat_neon_yellow),
    ("Cyber_3D_Neon_White",     bm_white,       mat_neon_white),
    ("Cyber_3D_LED_Red",        bm_led_r,       mat_led_red),
    ("Cyber_3D_LED_Green",      bm_led_g,       mat_led_green),
    ("Cyber_3D_Bldg_Dark",      bm_bldg_dark,   mat_bldg_dark),
    ("Cyber_3D_Bldg_Blue",      bm_bldg_blue,   mat_bldg_blue),
    ("Cyber_3D_City_Towers",    bm_city,        mat_bldg_dark),
    ("Cyber_3D_Sign_Backs",     bm_sign_backs,  mat_metal_dark),
    ("Cyber_3D_Win_Cyan",       bm_win_cyan,    mat_window_cyan),
    ("Cyber_3D_Win_Amber",      bm_win_amber,   mat_window_amber),
    ("Cyber_3D_Win_Blue",       bm_win_blue,    mat_window_blue),
    ("Cyber_3D_Car_Body",       bm_car_body,    mat_metal_dark),
    ("Cyber_3D_Traffic_Cyan",   bm_trail_cyan,  mat_neon_cyan),
    ("Cyber_3D_Traffic_Orange", bm_trail_orange, mat_neon_orange),
    ("Cyber_3D_Traffic_Mag",    bm_trail_mag,   mat_neon_magenta),
]

for obj_name, bm_data, mat in mesh_mappings:
    mesh = bpy.data.meshes.new(f"{obj_name}_Mesh")
    bm_data.to_mesh(mesh)
    bm_data.free()
    obj = add_mesh_obj(obj_name, mesh)
    obj.data.materials.append(mat)

# ==============================================================================
# 12. COMBAT CAMERA (Calibrated to Platform Ratio: 0.73)
# ==============================================================================
cam_dist = 18.0
lens = 38.0
cam_data = bpy.data.cameras.new("Cyber_Combat_Cam")
cam_data.lens = lens
cam_data.clip_start = 0.1
cam_data.clip_end = 500.0

cam_obj = bpy.data.objects.new("Cyber_Combat_Camera", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

cam_obj.location = (0.0, -cam_dist, 3.4)
cam_obj.rotation_euler = (radians(86.5), 0, 0)

# ==============================================================================
# 13. DUAL-TONE CYBERPUNK LIGHTING & WET DECK REFLECTION BOUNCE
# ==============================================================================
def add_light(name, ltype, energy, color, loc, rot=(0,0,0), size=None):
    ldata = bpy.data.lights.new(name=name, type=ltype)
    ldata.energy = energy
    ldata.color = color
    if size and hasattr(ldata, 'size'): ldata.size = size
    obj = bpy.data.objects.new(name, ldata)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    return obj

# Key Light: Electric Cyan Area light from front-left
add_light("Key_Cyan_Light", 'AREA', 1250, (0.06, 0.88, 1.0), (-9.0, -9.0, 6.5), (radians(55), radians(15), radians(-45)), size=8.0)

# Rim Light: Hot Magenta Area light from rear-right
add_light("Rim_Magenta_Light", 'AREA', 1100, (1.0, 0.08, 0.70), (9.0, 7.0, 6.0), (radians(-45), radians(-15), radians(135)), size=7.0)

# Wet Deck Specular Reflection Lights (Placed just above floor for wet puddle reflections)
add_light("Wet_Deck_Cyan_Bounce", 'POINT', 350, (0.05, 0.92, 1.0), (-4.5, -1.0, 0.25))
add_light("Wet_Deck_Mag_Bounce",  'POINT', 350, (1.00, 0.06, 0.70), (4.5, -1.0, 0.25))
add_light("Wet_Drain_Glow",       'POINT', 280, (0.10, 0.85, 1.0), (0.0, -4.5, 0.20))
add_light("Wet_Front_Fill",       'POINT', 300, (0.20, 0.60, 1.0), (0.0, -6.5, 0.35))

# Top Cyber City Ambient Fill Light
add_light("Top_City_Ambient", 'AREA', 500, (0.25, 0.50, 0.90), (0.0, 0.0, 12.0), (radians(15), 0, 0), size=18.0)

# Front Combat Duel Fill Light (Soft neutral fill so combatants pop)
add_light("Front_Duel_Fill", 'AREA', 520, (0.80, 0.90, 1.0), (0.0, -11.0, 3.6), (radians(78), 0, 0), size=12.0)

# Sign Local Spotlights (Casting vibrant colored wash onto adjacent building facades)
add_light("Spot_CyberArcade", 'POINT', 420, (0.05, 0.95, 1.0), (9.2, 4.5, 6.5))
add_light("Spot_NeonDragon",  'POINT', 450, (1.00, 0.06, 0.7), (9.2, 4.5, 3.8))
add_light("Spot_NeoKyoto",    'POINT', 380, (0.85, 0.95, 1.0), (-6.5, 4.2, 6.8))

# ==============================================================================
# 14. SAVE .BLEND, RENDER STILL, EXPORT .GLB
# ==============================================================================
blend_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=False)
log(f">>> [Cyber Rooftop 100% 3D] Saved Blender file: {blend_path}")

render_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop_Render.png")
scene.render.filepath = render_path
bpy.ops.render.render(write_still=True)
log(f">>> [Cyber Rooftop 100% 3D] Rendered EEVEE still: {render_path}")

glb_path = os.path.join(out_dir, "KeyFury_3D_CyberRooftop.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_cameras=True, export_lights=True)
log(f">>> [Cyber Rooftop 100% 3D] Exported GLB model: {glb_path}")

log(">>> [Cyber Rooftop 100% 3D Masterpiece] Generation Complete!")

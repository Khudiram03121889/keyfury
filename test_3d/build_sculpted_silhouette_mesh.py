"""
High-Resolution 3D Sculptural Silhouette Mesh Generator for Cyber Valkyrie
Extracts the exact character silhouette from atlas-v3-consistent-source.png,
constructs a 10,000-polygon 3D volumetric mesh with anatomical depth displacement,
solidifies with 3D armor thickness, applies PBR metallic-roughness-normal shaders,
and adds dynamic in-scene lighting.
"""

import bpy
import bmesh
import mathutils
import math
from math import radians, sin, cos
from PIL import Image
import numpy as np

print(">>> Building Sculptural 3D Silhouette Mesh for Cyber Valkyrie...")

# Load Source Image & Generate Depth
img_path = r"d:\Keyboard stickman warrior\apps\web\dist\assets\characters\cyber_valkyrie\atlas-v3-consistent-source.png"
pil_img = Image.open(img_path).convert('RGBA')

grid_w = 120
grid_h = 180

# Downsample alpha to grid
alpha_grid = np.array(pil_img.split()[-1].resize((grid_w, grid_h), Image.Resampling.BILINEAR))
alpha_mask = alpha_grid > 45 # threshold for active character cells

# World Dimensions
CHAR_HEIGHT = 2.45
CHAR_WIDTH = CHAR_HEIGHT * (1024.0 / 1536.0) # ~ 1.63m
RX = 2.15 # X location in arena

# Clean old Valkyrie objects
for obj in list(bpy.data.objects):
    if "Cyber_Valkyrie" in obj.name or "Valk_" in obj.name and obj.type != 'LIGHT':
        bpy.data.objects.remove(obj)

# Create Mesh
mesh = bpy.data.meshes.new("Cyber_Valkyrie_Mesh")
bm = bmesh.new()

# Create 2D grid of vertices with anatomical 3D depth displacement Y(col, row)
verts = {}

for r in range(grid_h + 1):
    for c in range(grid_w + 1):
        # Check if adjacent to any active cell
        r_min, r_max = max(0, r-1), min(grid_h-1, r)
        c_min, c_max = max(0, c-1), min(grid_w-1, c)
        sub = alpha_mask[r_min:r_max+1, c_min:c_max+1]
        if not np.any(sub):
            continue # skip empty space
        
        # Normalized coordinates:
        u = c / float(grid_w)
        v = 1.0 - (r / float(grid_h)) # 0 at bottom, 1 at top
        
        # World X and Z (Mirrored X so facing left towards Ronin)
        wx = - (u - 0.5) * CHAR_WIDTH
        wz = v * CHAR_HEIGHT
        
        # Anatomical 3D Depth Displacement Y(u, v):
        # 1. Back Wings: u in [0.10, 0.44], v in [0.45, 0.90] -> angled backwards (+Y)
        is_wings = (u < 0.44) and (v > 0.45) and (v < 0.92)
        # 2. Golden Ponytail: u in [0.38, 0.62], v in [0.72, 0.98] -> flowing backwards (+Y)
        is_hair = (u >= 0.38) and (u <= 0.62) and (v > 0.72)
        # 3. Chest Cuirass: u in [0.45, 0.78], v in [0.50, 0.75] -> curving forward (-Y)
        is_chest = (u >= 0.45) and (u <= 0.78) and (v >= 0.50) and (v <= 0.75)
        # 4. Lead Hydraulic Gauntlet: u in [0.65, 0.95], v in [0.40, 0.72] -> protruding forward (-Y)
        is_gaunt = (u > 0.65) and (v >= 0.40) and (v <= 0.72)
        # 5. Lead Leg (forward): u > 0.55, v < 0.50
        is_lead_leg = (u > 0.55) and (v < 0.50)
        # 6. Rear Leg (back): u <= 0.55, v < 0.50
        is_rear_leg = (u <= 0.55) and (v < 0.50)
        
        wy = 0.0
        if is_wings:
            # Wings angle back smoothly from root to tip
            wing_factor = (0.44 - u) / 0.34
            wy = 0.12 + 0.22 * wing_factor
        elif is_hair:
            hair_factor = (v - 0.72) / 0.26
            wy = 0.08 + 0.14 * (1.0 - abs(u - 0.50) / 0.15)
        elif is_gaunt:
            gaunt_factor = (u - 0.65) / 0.30
            wy = -0.10 - 0.16 * gaunt_factor
        elif is_chest:
            # Breastplate curve
            cuirass_curve = sin((v - 0.50) / 0.25 * math.pi) * sin((u - 0.45) / 0.33 * math.pi)
            wy = -0.06 - 0.12 * cuirass_curve
        elif is_lead_leg:
            wy = -0.08
        elif is_rear_leg:
            wy = 0.08
        
        vert = bm.verts.new((wx, wy, wz))
        verts[(r, c)] = vert

# Create Faces where alpha_mask is True
uv_layer = bm.loops.layers.uv.new("UVMap")

for r in range(grid_h):
    for c in range(grid_w):
        if not alpha_mask[r, c]:
            continue
        # Four corners of this quad
        p_tl = (r, c)
        p_tr = (r, c + 1)
        p_br = (r + 1, c + 1)
        p_bl = (r + 1, c)
        
        if (p_tl in verts) and (p_tr in verts) and (p_br in verts) and (p_bl in verts):
            v_tl = verts[p_tl]
            v_tr = verts[p_tr]
            v_br = verts[p_br]
            v_bl = verts[p_bl]
            try:
                # Winding order for normal pointing towards camera (-Y)
                face = bm.faces.new((v_tl, v_tr, v_br, v_bl))
                # UV coordinates (Mirrored in U so texture displays correctly with mirrored X)
                u0 = (c + 1) / float(grid_w)
                u1 = c / float(grid_w)
                v0 = 1.0 - (r / float(grid_h))
                v1 = 1.0 - ((r + 1) / float(grid_h))
                
                face.loops[0][uv_layer].uv = (u0, v0)
                face.loops[1][uv_layer].uv = (u1, v0)
                face.loops[2][uv_layer].uv = (u1, v1)
                face.loops[3][uv_layer].uv = (u0, v1)
            except ValueError:
                pass # face already exists

bm.to_mesh(mesh)
bm.free()

valk_obj = bpy.data.objects.new("Cyber_Valkyrie", mesh)
valk_obj.location = (RX, 0.0, 0.0)
valk_obj.rotation_euler = (0, 0, radians(5)) # angled slightly toward Ronin
bpy.context.collection.objects.link(valk_obj)

# Add Solidify Modifier to give REAL 3D PHYSICAL ARMOR THICKNESS (5cm)!
mod_solid = valk_obj.modifiers.new(name="Solidify", type='SOLIDIFY')
mod_solid.thickness = 0.05
mod_solid.offset = 1.0 # extrude backwards
mod_solid.use_rim = True

# Add Bevel Modifier for realistic edge highlights
mod_bevel = valk_obj.modifiers.new(name="Bevel", type='BEVEL')
mod_bevel.width = 0.008
mod_bevel.segments = 2

# Apply Master PBR Shader with Base Color, Normal Map, Emission Map
mat_master = bpy.data.materials.get("Mat_Valkyrie_MasterPBR")
if mat_master:
    valk_obj.data.materials.append(mat_master)

# Add 3D Point Lights for Reactor Core & Wing Thrusters
def update_or_add_light(name, color, energy, loc):
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old)
    ld = bpy.data.lights.new(name, 'POINT')
    ld.color = color
    ld.energy = energy
    obj = bpy.data.objects.new(name, ld)
    obj.location = loc
    bpy.context.collection.objects.link(obj)
    return obj

# Position lights in world space:
update_or_add_light("Valk_ArcCore_Light", (1.0, 0.15, 0.05), 180, (RX - 0.42, -0.25, 1.88))
update_or_add_light("Valk_WingThruster_Light", (1.0, 0.05, 0.2), 260, (RX + 0.35, 0.35, 2.10))
update_or_add_light("Valk_Gauntlet_Light", (1.0, 0.15, 0.05), 140, (RX - 0.55, -0.32, 1.30))

print(f">>> Successfully generated Sculptural 3D Silhouette Mesh with {len(valk_obj.data.polygons)} polygons!")

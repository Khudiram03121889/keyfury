"""
High-Precision Continuous Volumetric 3D Dual-Shell Mesh Generator v2:
- Smooth Hermite depth profile (zero derivative at boundary -> eliminates barcode texture stretching!)
- Full anatomical thickness: 8cm to 24cm depth across chest, waist, limbs, and boots
- Solid 4cm-6cm dark titanium mecha chassis rim facing 90 degrees
- 100% gapless topology (watertight manifold)
- Front shell: Mat_Valkyrie_MasterPBR (Opaque)
- Back shell: Mat_Valkyrie_BackPBR (Opaque, 100% painted)
- Side rim: Mat_Valkyrie_Chassis (Opaque dark gunmetal titanium)
"""

from PIL import Image
import numpy as np
import json
import time

print(">>> Precomputing Cyber Valkyrie 100% True 3D Volumetric Mesh (v2 Gapless)...")

img_path = r"d:\Keyboard stickman warrior\apps\web\dist\assets\characters\cyber_valkyrie\atlas-v3-consistent-source.png"
pil_img = Image.open(img_path).convert('RGBA')

# Use high-density grid for smooth organic curvature
grid_w = 180
grid_h = 270
alpha_arr = np.array(pil_img.split()[-1].resize((grid_w, grid_h), Image.Resampling.BILINEAR))
mask = alpha_arr > 35

# 1. 2D Euclidean Distance Transform in pure numpy
def edt_1d(f):
    n = len(f)
    k = 0
    v = np.zeros(n, dtype=int)
    z = np.zeros(n + 1, dtype=float)
    z[0] = -1e9
    z[1] = 1e9
    for q in range(1, n):
        s = ((f[q] + q*q) - (f[v[k]] + v[k]*v[k])) / (2.0 * (q - v[k]))
        while s <= z[k]:
            k -= 1
            s = ((f[q] + q*q) - (f[v[k]] + v[k]*v[k])) / (2.0 * (q - v[k]))
        k += 1
        v[k] = q
        z[k] = s
        z[k+1] = 1e9
    k = 0
    d = np.zeros(n, dtype=float)
    for q in range(n):
        while z[k+1] < q:
            k += 1
        d[q] = (q - v[k])**2 + f[v[k]]
    return d

def edt_2d(binary_mask):
    h, w = binary_mask.shape
    f = np.where(binary_mask, 1e9, 0.0)
    for c in range(w):
        f[:, c] = edt_1d(f[:, c])
    for r in range(h):
        f[r, :] = edt_1d(f[r, :])
    return np.sqrt(f)

dist = edt_2d(mask)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

# 2. Continuous Anatomical Thickness Profile R(v)
# Thickness is half-depth (in meters) from center plane to surface
# Gives full mecha depth: 10cm - 24cm total thickness across body
v_samples = [0.0, 0.06, 0.12, 0.22, 0.32, 0.40, 0.50, 0.60, 0.72, 0.85, 0.95, 1.0]
r_samples = [0.14, 0.13, 0.11, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.11, 0.08, 0.04]

r_grid = np.zeros(grid_h)
for r in range(grid_h):
    v = 1.0 - (r / float(grid_h))
    r_grid[r] = np.interp(v, v_samples, r_samples)

# Boundary transition width: 16 grid cells
d0 = 16.0
tau = np.clip(dist / d0, 0.0, 1.0)

# Smooth Hermite depth profile:
# tau = 0 -> profile = 0, derivative = 0!
# Eliminates infinite slope at edge so front/back faces never face sideways!
profile = smoothstep(0.0, 1.0, tau)

# Base rim half-thickness (guarantees a solid 4cm total rim thickness everywhere)
rim_base = 0.022 # 2.2cm per side = 4.4cm solid rim

H = np.zeros((grid_h, grid_w), dtype=float)
for r in range(grid_h):
    H[r, :] = rim_base + (r_grid[r] - rim_base) * profile[r, :]

# 3. Continuous Center Plane Offset Field y0(u, v)
c_idx, r_idx = np.meshgrid(np.arange(grid_w), np.arange(grid_h))
u_grid = c_idx / float(grid_w)
v_grid = 1.0 - (r_idx / float(grid_h))

y0 = np.zeros((grid_h, grid_w), dtype=float)

# 3a. Back Wings sweep backwards (+Y in Blender coords)
w_wing = smoothstep(0.44, 0.20, u_grid) * smoothstep(0.48, 0.58, v_grid) * smoothstep(0.96, 0.88, v_grid)
y_wing = 0.10 + 0.18 * np.clip((0.44 - u_grid) / 0.28, 0.0, 1.0)
y0 += w_wing * y_wing

# 3b. Golden Ponytail plume flowing back (+Y)
w_hair = np.exp(-((u_grid - 0.43)**2) / (2.0 * 0.05**2)) * smoothstep(0.68, 0.78, v_grid) * smoothstep(0.96, 0.90, v_grid)
y0 += w_hair * 0.12

# 3c. Lead Arm held forward (-Y)
w_arm = smoothstep(0.68, 0.78, u_grid) * smoothstep(0.38, 0.46, v_grid) * smoothstep(0.70, 0.62, v_grid)
y0 += w_arm * (-0.08)

# 3d. Rear Arm back (+Y)
w_rarm = smoothstep(0.36, 0.26, u_grid) * smoothstep(0.40, 0.48, v_grid) * smoothstep(0.62, 0.54, v_grid)
y0 += w_rarm * 0.05

# 3e. Lead leg forward (-Y) vs Rear leg back (+Y)
w_legs = smoothstep(0.52, 0.44, v_grid)
w_lleg = w_legs * smoothstep(0.53, 0.62, u_grid)
w_rleg = w_legs * smoothstep(0.53, 0.44, u_grid)
y0 += w_lleg * (-0.05) + w_rleg * 0.05

# 3f. Chest cuirass forward (-Y)
w_chest = np.sin(np.pi * np.clip((u_grid - 0.48) / 0.26, 0.0, 1.0)) * np.sin(np.pi * np.clip((v_grid - 0.60) / 0.18, 0.0, 1.0))
y0 += w_chest * (-0.05)

# Spatial Gaussian smoothing on y0
padded = np.pad(y0, 2, mode='edge')
for _ in range(4):
    res = np.zeros_like(y0)
    for di in range(5):
        for dj in range(5):
            res += padded[di:di+grid_h, dj:dj+grid_w]
    y0 = res / 25.0
    padded = np.pad(y0, 2, mode='edge')

# 4. Extract Boundary Edges
edges = {}
for r in range(grid_h):
    for c in range(grid_w):
        if not mask[r, c]: continue
        tl, tr, br, bl = (r, c), (r, c+1), (r+1, c+1), (r+1, c)
        for e in [(tl, tr), (tr, br), (br, bl), (bl, tl)]:
            edges[e] = edges.get(e, 0) + 1

b_edges = [e for e in edges if (e[1], e[0]) not in edges]

# Boundary point adjacency
b_adj = {}
for p1, p2 in b_edges:
    b_adj.setdefault(p1, set()).add(p2)
    b_adj.setdefault(p2, set()).add(p1)

boundary_pts = set(b_adj.keys())

# Sub-pixel smooth boundary positions (4 iterations Laplacian filter)
smooth_uv = {p: np.array([p[1] / float(grid_w), 1.0 - p[0] / float(grid_h)]) for p in boundary_pts}
for _ in range(4):
    next_uv = {}
    for p in boundary_pts:
        nbrs = b_adj[p]
        avg_nbr = np.mean([smooth_uv[n] for n in nbrs], axis=0)
        next_uv[p] = 0.40 * smooth_uv[p] + 0.60 * avg_nbr
    smooth_uv = next_uv

# 5. Build Vertices & UVs
CHAR_HEIGHT = 2.45 # meters
CHAR_WIDTH = CHAR_HEIGHT * (1024.0 / 1536.0) # ~ 1.633m

vert_front_map = {}
vert_back_map = {}
verts = []
uvs = []

for r in range(grid_h + 1):
    for c in range(grid_w + 1):
        r_min, r_max = max(0, r-1), min(grid_h-1, r)
        c_min, c_max = max(0, c-1), min(grid_w-1, c)
        sub = mask[r_min:r_max+1, c_min:c_max+1]
        if not np.any(sub):
            continue
        
        p = (r, c)
        if p in smooth_uv:
            u_val, v_val = smooth_uv[p]
        else:
            u_val = c / float(grid_w)
            v_val = 1.0 - (r / float(grid_h))
            
        wx = - (u_val - 0.516) * CHAR_WIDTH
        wz = v_val * CHAR_HEIGHT
        
        r_samp = min(grid_h - 1, r)
        c_samp = min(grid_w - 1, c)
        
        h_val = H[r_samp, c_samp]
        y0_val = y0[r_samp, c_samp]
        
        wy_f = y0_val - h_val
        wy_b = y0_val + h_val
        
        idx_f = len(verts)
        verts.append([round(float(wx), 4), round(float(wy_f), 4), round(float(wz), 4)])
        uvs.append([round(float(u_val), 4), round(float(v_val), 4)])
        vert_front_map[p] = idx_f
        
        idx_b = len(verts)
        verts.append([round(float(wx), 4), round(float(wy_b), 4), round(float(wz), 4)])
        # Inverted back UV: maps right gauntlet to right gauntlet on back texture!
        uvs.append([round(1.0 - float(u_val), 4), round(float(v_val), 4)])
        vert_back_map[p] = idx_b

# 6. Build Faces
front_faces = []
back_faces = []

for r in range(grid_h):
    for c in range(grid_w):
        if not mask[r, c]: continue
        tl, tr, br, bl = (r, c), (r, c+1), (r+1, c+1), (r+1, c)
        if tl in vert_front_map and tr in vert_front_map and br in vert_front_map and bl in vert_front_map:
            front_faces.append([vert_front_map[tl], vert_front_map[tr], vert_front_map[br], vert_front_map[bl]])
            back_faces.append([vert_back_map[tl], vert_back_map[bl], vert_back_map[br], vert_back_map[tr]])

side_faces = []
for p1, p2 in b_edges:
    if p1 in vert_front_map and p2 in vert_front_map:
        side_faces.append([
            vert_front_map[p1],
            vert_back_map[p1],
            vert_back_map[p2],
            vert_front_map[p2]
        ])

all_faces = front_faces + back_faces + side_faces

out_data = {
    "verts": verts,
    "uvs": uvs,
    "faces": all_faces,
    "front_count": len(front_faces),
    "back_count": len(back_faces),
    "side_count": len(side_faces)
}

out_path = r"d:\Keyboard stickman warrior\test_3d\valk_mesh_data.json"
with open(out_path, "w") as f:
    json.dump(out_data, f)

print(f"Saved true 3D volumetric mesh v2: {len(verts)} verts, {len(all_faces)} faces.")
print(f"Front: {len(front_faces)}, Back: {len(back_faces)}, Side: {len(side_faces)}")

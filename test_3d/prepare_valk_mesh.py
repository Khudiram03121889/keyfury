"""
Precomputes the High-Precision Continuous Volumetric 3D Dual-Shell Mesh for Cyber Valkyrie.
Constructs a closed, watertight 3D manifold with authentic anatomical depth:
- Continuous Euclidean Distance Transform (EDT) semi-elliptical limb inflation
- Smooth continuous anatomical thickness field R(v) from grounded boots to helmet
- Smooth C-infinity center-plane offset field y0(u, v) with Gaussian spatial filtering
- Sub-pixel Laplacian smoothed boundary loop contour (eliminates all raster staircases & side corrugations)
- Seamless front shell, back shell, and perimeter side-rim quads
- Material slot tags: Front faces (Slot 0, Master PBR) vs Back & Side Chassis (Slot 1, Dark Gunmetal Titanium)
"""

from PIL import Image
import numpy as np
import json
import time

print(">>> Precomputing Cyber Valkyrie 100% True 3D Continuous Volumetric Mesh...")

img_path = r"d:\Keyboard stickman warrior\apps\web\dist\assets\characters\cyber_valkyrie\atlas-v3-consistent-source.png"
pil_img = Image.open(img_path).convert('RGBA')

grid_w = 160
grid_h = 240
alpha_arr = np.array(pil_img.split()[-1].resize((grid_w, grid_h), Image.Resampling.BILINEAR))
mask = alpha_arr > 40

# 1. Exact 2D Euclidean Distance Transform in pure numpy
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
v_samples = [0.0, 0.06, 0.12, 0.22, 0.32, 0.40, 0.50, 0.60, 0.72, 0.85, 0.95, 1.0]
r_samples = [0.18, 0.16, 0.13, 0.10, 0.11, 0.13, 0.14, 0.15, 0.17, 0.14, 0.09, 0.04]

r_grid = np.zeros(grid_h)
for r in range(grid_h):
    v = 1.0 - (r / float(grid_h))
    r_grid[r] = np.interp(v, v_samples, r_samples)

d0 = 12.0 # boundary transition width in grid cells
tau = np.clip(dist / d0, 0.0, 1.0)
profile = np.sqrt(tau * (2.0 - tau)) # circular arc cross section

H = np.zeros((grid_h, grid_w), dtype=float)
for r in range(grid_h):
    H[r, :] = 0.006 + (r_grid[r] - 0.006) * profile[r, :]

# 3. Continuous Center Plane Offset Field y0(u, v)
c_idx, r_idx = np.meshgrid(np.arange(grid_w), np.arange(grid_h))
u_grid = c_idx / float(grid_w)
v_grid = 1.0 - (r_idx / float(grid_h))

y0 = np.zeros((grid_h, grid_w), dtype=float)

# 3a. Back Wings sweep backwards (+Y)
w_wing = smoothstep(0.44, 0.20, u_grid) * smoothstep(0.48, 0.58, v_grid) * smoothstep(0.96, 0.88, v_grid)
y_wing = 0.12 + 0.22 * np.clip((0.44 - u_grid) / 0.28, 0.0, 1.0)
y0 += w_wing * y_wing

# 3b. Golden Ponytail plume flowing back (+Y)
w_hair = np.exp(-((u_grid - 0.43)**2) / (2.0 * 0.05**2)) * smoothstep(0.68, 0.78, v_grid) * smoothstep(0.96, 0.90, v_grid)
y0 += w_hair * 0.15

# 3c. Lead Arm held forward (-Y)
w_arm = smoothstep(0.68, 0.78, u_grid) * smoothstep(0.38, 0.46, v_grid) * smoothstep(0.70, 0.62, v_grid)
y0 += w_arm * (-0.11)

# 3d. Rear Arm back (+Y)
w_rarm = smoothstep(0.36, 0.26, u_grid) * smoothstep(0.40, 0.48, v_grid) * smoothstep(0.62, 0.54, v_grid)
y0 += w_rarm * 0.06

# 3e. Lead leg forward (-Y) vs Rear leg back (+Y)
w_legs = smoothstep(0.52, 0.44, v_grid)
w_lleg = w_legs * smoothstep(0.53, 0.62, u_grid)
w_rleg = w_legs * smoothstep(0.53, 0.44, u_grid)
y0 += w_lleg * (-0.06) + w_rleg * 0.06

# 3f. Chest cuirass forward (-Y)
w_chest = np.sin(np.pi * np.clip((u_grid - 0.48) / 0.26, 0.0, 1.0)) * np.sin(np.pi * np.clip((v_grid - 0.60) / 0.18, 0.0, 1.0))
y0 += w_chest * (-0.06)

# 3g. Smooth y0 spatially with Gaussian blur passes
padded = np.pad(y0, 2, mode='edge')
for _ in range(4):
    res = np.zeros_like(y0)
    for di in range(5):
        for dj in range(5):
            res += padded[di:di+grid_h, dj:dj+grid_w]
    y0 = res / 25.0
    padded = np.pad(y0, 2, mode='edge')

# 4. Find Boundary Edges and Sub-Pixel Smooth Boundary Vertices
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

# Sub-pixel smooth boundary positions (5 iterations of Laplacian filter)
smooth_uv = {p: np.array([p[1] / float(grid_w), 1.0 - p[0] / float(grid_h)]) for p in boundary_pts}
for _ in range(5):
    next_uv = {}
    for p in boundary_pts:
        nbrs = b_adj[p]
        avg_nbr = np.mean([smooth_uv[n] for n in nbrs], axis=0)
        next_uv[p] = 0.35 * smooth_uv[p] + 0.65 * avg_nbr
    smooth_uv = next_uv

# 5. Generate 3D Vertices and UVs
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

print(f"Saved true 3D continuous volumetric mesh: {len(verts)} verts, {len(all_faces)} faces.")
print(f"Front: {len(front_faces)}, Back: {len(back_faces)}, Side: {len(side_faces)}")

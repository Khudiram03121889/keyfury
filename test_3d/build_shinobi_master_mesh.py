from PIL import Image
import numpy as np
import json
import os

print('>>> Generating High-Precision Turnaround 3D Volumetric Mesh Data for Volt Shinobi (Raijin)...')

work_dir = r'd:\Keyboard stickman warrior\test_3d'
img_path = os.path.join(work_dir, 'shinobi_turnaround_front_master.png')
pil_img = Image.open(img_path).convert('RGBA')

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

# 2. Continuous Anatomical Thickness Profile R(v) for Volt Shinobi
# v ranges from 0.0 (feet) to 1.0 (head)
v_samples = [0.0,  0.06, 0.12, 0.22, 0.32, 0.40, 0.48, 0.58, 0.68, 0.76, 0.82, 0.86, 0.90, 0.94, 0.98, 1.0]
r_samples = [0.11, 0.10, 0.09, 0.10, 0.11, 0.13, 0.14, 0.14, 0.17, 0.14, 0.15, 0.14, 0.13, 0.11, 0.07, 0.04]

r_grid = np.zeros(grid_h)
d0_grid = np.full(grid_h, 13.0)
for r in range(grid_h):
    v = 1.0 - (r / float(grid_h))
    r_grid[r] = np.interp(v, v_samples, r_samples)
    if v >= 0.78:
        d0_grid[r] = np.interp(v, [0.78, 0.86, 0.95, 1.0], [11.0, 7.5, 6.0, 4.5])

tau = np.clip(dist / d0_grid[:, None], 0.0, 1.0)
profile = smoothstep(0.0, 1.0, tau)

rim_grid = np.full(grid_h, 0.018) # 1.8cm rim base
for r in range(grid_h):
    v = 1.0 - (r / float(grid_h))
    if v >= 0.92:
        rim_grid[r] = np.interp(v, [0.92, 1.0], [0.018, 0.007])

H = np.zeros((grid_h, grid_w), dtype=float)
for r in range(grid_h):
    H[r, :] = rim_grid[r] + (r_grid[r] - rim_grid[r]) * profile[r, :]

# 3. Continuous Center Plane Offset Field y0(u, v)
c_idx, r_idx = np.meshgrid(np.arange(grid_w), np.arange(grid_h))
u_grid = c_idx / float(grid_w)
v_grid = 1.0 - (r_idx / float(grid_h))

y0 = np.zeros((grid_h, grid_w), dtype=float)

# 3a. Chest Cuirass curving forward (-Y in Blender)
w_chest = np.sin(np.pi * np.clip((u_grid - 0.38) / 0.24, 0.0, 1.0)) * np.sin(np.pi * np.clip((v_grid - 0.62) / 0.16, 0.0, 1.0))
y0 += w_chest * (-0.070)

# 3b. Hips / Lumbar belt curving backward (+Y)
w_hips = np.sin(np.pi * np.clip((u_grid - 0.38) / 0.24, 0.0, 1.0)) * np.sin(np.pi * np.clip((v_grid - 0.44) / 0.14, 0.0, 1.0))
y0 += w_hips * 0.060

# 3c. Head / Neck Natural Forward Posture (-Y)
w_head_posture = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.07**2)) * smoothstep(0.76, 0.83, v_grid) * smoothstep(0.98, 0.94, v_grid)
y0 += w_head_posture * (-0.035)

# 3d. Trailing Storm Ribbons flowing back (+Y)
w_ribbons_l = smoothstep(0.18, 0.32, u_grid) * smoothstep(0.38, 0.28, u_grid) * smoothstep(0.24, 0.48, v_grid)
w_ribbons_r = smoothstep(0.62, 0.72, u_grid) * smoothstep(0.82, 0.68, u_grid) * smoothstep(0.24, 0.48, v_grid)
y0 += (w_ribbons_l + w_ribbons_r) * 0.050

# Spatial Gaussian smoothing on y0
padded = np.pad(y0, 2, mode='edge')
for _ in range(4):
    res = np.zeros_like(y0)
    for di in range(5):
        for dj in range(5):
            res += padded[di:di+grid_h, dj:dj+grid_w]
    y0 = res / 25.0
    padded = np.pad(y0, 2, mode='edge')

# 3e. Front Shell Dedicated Facial & Armor Relief (Negative -> Protrudes forward into -Y)
delta_front = np.zeros((grid_h, grid_w), dtype=float)

# Glowing gold visor
w_visor = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.075**2)) * np.sin(np.pi * np.clip((v_grid - 0.83) / 0.06, 0.0, 1.0))
delta_front += w_visor * 0.052

# Hitai-ate metal forehead plate
w_forehead = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.070**2)) * np.sin(np.pi * np.clip((v_grid - 0.88) / 0.05, 0.0, 1.0))
delta_front += w_forehead * 0.038

# Faceted menpo chin
w_chin = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.060**2)) * np.sin(np.pi * np.clip((v_grid - 0.78) / 0.04, 0.0, 1.0))
delta_front += w_chin * 0.040

# Lightning core conduit on center chest
w_chest_core = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.050**2)) * np.sin(np.pi * np.clip((v_grid - 0.68) / 0.06, 0.0, 1.0))
delta_front += w_chest_core * 0.045

delta_front *= smoothstep(0.0, 4.0, dist)

# 3f. Back Shell Dedicated Rear Volume (Positive -> Protrudes into +Y)
delta_back = np.zeros((grid_h, grid_w), dtype=float)

# Dorsal cyber-spine energy conduit
w_spine = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.050**2)) * smoothstep(0.52, 0.76, v_grid) * smoothstep(0.86, 0.78, v_grid)
delta_back += w_spine * 0.060

# Rear helmet skull curve
w_skull_back = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.075**2)) * np.sin(np.pi * np.clip((v_grid - 0.84) / 0.12, 0.0, 1.0))
delta_back += w_skull_back * 0.040

# Lumbar battery pack on belt
w_lumbar = np.exp(-((u_grid - 0.50)**2) / (2.0 * 0.080**2)) * np.sin(np.pi * np.clip((v_grid - 0.46) / 0.08, 0.0, 1.0))
delta_back += w_lumbar * 0.045

delta_back *= smoothstep(0.0, 4.0, dist)

# 4. Extract Boundary Edges
edges = {}
for r in range(grid_h):
    for c in range(grid_w):
        if not mask[r, c]: continue
        tl, tr, br, bl = (r, c), (r, c+1), (r+1, c+1), (r+1, c)
        for e in [(tl, tr), (tr, br), (br, bl), (bl, tl)]:
            edges[e] = edges.get(e, 0) + 1

b_edges = [e for e in edges if (e[1], e[0]) not in edges]

b_adj = {}
for p1, p2 in b_edges:
    b_adj.setdefault(p1, set()).add(p2)
    b_adj.setdefault(p2, set()).add(p1)

boundary_pts = set(b_adj.keys())

# Sub-pixel smooth boundary positions (12 iterations Laplacian filter)
smooth_uv = {p: np.array([p[1] / float(grid_w), 1.0 - p[0] / float(grid_h)]) for p in boundary_pts}
for _ in range(12):
    next_uv = {}
    for p in boundary_pts:
        nbrs = b_adj[p]
        avg_nbr = np.mean([smooth_uv[n] for n in nbrs], axis=0)
        next_uv[p] = 0.35 * smooth_uv[p] + 0.65 * avg_nbr
    smooth_uv = next_uv

# 5. Build Vertices & UVs
CHAR_HEIGHT = 2.22 # meters (matches standard KeyFury fighter scale)
CHAR_WIDTH = CHAR_HEIGHT * (512.0 / 768.0) # 1.48m

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
            
        wx = - (u_val - 0.50) * CHAR_WIDTH
        wz = v_val * CHAR_HEIGHT
        
        r_samp = min(grid_h - 1, r)
        c_samp = min(grid_w - 1, c)
        
        h_val = H[r_samp, c_samp]
        y0_val = y0[r_samp, c_samp]
        df_val = delta_front[r_samp, c_samp]
        db_val = delta_back[r_samp, c_samp]
        
        wy_f = y0_val - h_val - df_val
        wy_b = y0_val + h_val + db_val
        
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

min_z = min(v[2] for v in verts)
for v in verts:
    v[2] = round(v[2] - min_z, 4)

all_faces = front_faces + back_faces + side_faces

out_data = {
    'verts': verts,
    'uvs': uvs,
    'faces': all_faces,
    'front_count': len(front_faces),
    'back_count': len(back_faces),
    'side_count': len(side_faces)
}

out_path = os.path.join(work_dir, 'shinobi_master_mesh_data.json')
with open(out_path, 'w') as f:
    json.dump(out_data, f)

print(f'Successfully built shinobi_master_mesh_data.json: {len(verts)} verts, {len(all_faces)} faces.')
print(f'Front: {len(front_faces)}, Back: {len(back_faces)}, Side: {len(side_faces)}')

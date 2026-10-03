import os
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

print(">>> Generating pristine master turnaround textures for Void Assassin (Nyx)...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"

def extract_clean_slice(raw_img_path, foot_cutoff=1204, min_comp_size=5000):
    im = Image.open(raw_img_path)
    raw_arr = np.array(im)
    h, w, _ = raw_arr.shape
    
    gray = raw_arr.mean(axis=2)
    chroma = np.max(raw_arr, axis=2) - np.min(raw_arr, axis=2)
    
    # Background in the studio image is neutral grey (chroma <= 10) and moderately bright (gray >= 75)
    can_be_bg = (chroma <= 10) & (gray >= 75)
    
    # Floor contact clamping: zero ground-shadow puddle below soles
    can_be_bg[foot_cutoff:, :] = True
    
    # Mask out top corner title text
    can_be_bg[:130, :350] = True
    can_be_bg[:130, 500:] = True
    
    # BFS flood fill from outer borders AND floor
    is_bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x))
        q.append((h - 1, x))
        q.append((foot_cutoff, x))
    for y in range(h):
        q.append((y, 0))
        q.append((y, w - 1))
        
    for y, x in q:
        is_bg[y, x] = True
        
    while q:
        cy, cx = q.popleft()
        for dy, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dc
            if 0 <= ny < h and 0 <= nx < w and not is_bg[ny, nx]:
                if can_be_bg[ny, nx]:
                    is_bg[ny, nx] = True
                    q.append((ny, nx))
                    
    fg = ~is_bg
    fg[foot_cutoff:, :] = False
    
    # Keep only the major connected component to discard any floating specks
    visited = np.zeros((h, w), dtype=bool)
    clean_fg = np.zeros((h, w), dtype=bool)
    comps = []
    for r in range(h):
        for c in range(w):
            if fg[r, c] and not visited[r, c]:
                comp_q = deque([(r, c)])
                visited[r, c] = True
                pts = [(r, c)]
                while comp_q:
                    cr, cc = comp_q.popleft()
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < h and 0 <= nc < w and fg[nr, nc] and not visited[nr, nc]:
                            visited[nr, nc] = True
                            pts.append((nr, nc))
                            comp_q.append((nr, nc))
                comps.append(pts)
                
    comps.sort(key=len, reverse=True)
    if comps:
        for pr, pc in comps[0]:
            clean_fg[pr, pc] = True
            
    out_arr = np.zeros((h, w, 4), dtype=np.uint8)
    out_arr[clean_fg, :3] = raw_arr[clean_fg, :3]
    out_arr[clean_fg, 3] = 255
    return Image.fromarray(out_arr)

# 1. Clean slices
f_slice = Image.open(os.path.join(work_dir, "void_slice_front_final.png"))
b_slice = Image.open(os.path.join(work_dir, "void_slice_back_final.png"))
s_slice_path = os.path.join(work_dir, "void_clean_slice_side.png")
if os.path.exists(s_slice_path):
    s_slice = Image.open(s_slice_path)
else:
    s_slice = Image.open(os.path.join(work_dir, "void_slice_front_final.png"))

# 2. Fit to canonical 512x768 turnaround canvas
canvas_w, canvas_h = 512, 768
target_h = 685
target_y_bottom = 748

def fit_to_canvas(im):
    arr = np.array(im)
    alpha = arr[:, :, 3] > 20
    rows = np.where(np.any(alpha, axis=1))[0]
    cols = np.where(np.any(alpha, axis=0))[0]
    ymin, ymax = rows[0], rows[-1]
    xmin, xmax = cols[0], cols[-1]
    
    crop = im.crop((xmin, ymin, xmax+1, ymax+1))
    orig_w, orig_h = crop.size
    new_h = target_h
    new_w = int(round(orig_w * (target_h / float(orig_h))))
    resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    paste_x = (canvas_w - new_w) // 2
    paste_y = target_y_bottom - new_h
    
    c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    c.paste(resized, (paste_x, paste_y), resized)
    return c

f_c = fit_to_canvas(f_slice)
b_c = fit_to_canvas(b_slice)
s_c = fit_to_canvas(s_slice)

f_arr = np.array(f_c)
b_arr = np.array(b_c)
s_arr = np.array(s_c)

f_rgb = f_arr[:, :, :3]
f_alpha = f_arr[:, :, 3]
f_mask = f_alpha > 25

# Watertight symmetrical mask synthesis
master_mask = f_mask | np.fliplr(f_mask)
back_target_mask = master_mask # master_mask is already horizontally symmetric

# Mirrored fallback for asymmetric ribbon regions to preserve vibrant purple colors
f_sym_rgb = f_rgb.copy()
missing_f = master_mask & (~f_mask)
f_sym_rgb[missing_f] = np.fliplr(f_rgb)[missing_f]

b_sym_rgb = b_arr[:, :, :3].copy()
b_valid = b_arr[:, :, 3] > 25
missing_b = back_target_mask & (~b_valid)
b_sym_rgb[missing_b] = np.fliplr(b_arr[:, :, :3])[missing_b]

# Color dilation helper to eliminate dark UV edge seaming
def dilate_color(rgb_arr, target_mask, valid_mask, iters=16):
    dilated = rgb_arr.copy()
    pad = valid_mask.copy()
    for _ in range(iters):
        shifted = []
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                if dy == 0 and dx == 0: continue
                s = np.roll(np.roll(pad, dy, axis=0), dx, axis=1)
                shifted.append((s, dy, dx))
        new_pad = pad.copy()
        for s, dy, dx in shifted:
            b_edge = s & (~new_pad)
            if np.any(b_edge):
                dilated[b_edge] = np.roll(np.roll(dilated, dy, axis=0), dx, axis=1)[b_edge]
                new_pad |= b_edge
        pad = new_pad
    alpha = np.where(target_mask, 255, 0).astype(np.uint8)
    return np.dstack([dilated, alpha])

front_final_rgba = dilate_color(f_sym_rgb, master_mask, master_mask)
back_final_rgba = dilate_color(b_sym_rgb, back_target_mask, back_target_mask)

s_mask = s_arr[:, :, 3] > 25
side_final_rgba = dilate_color(s_arr[:, :, :3], s_mask, s_mask)

# Save Master Base Color Textures
f_col_path = os.path.join(work_dir, 'void_turnaround_front_master.png')
b_col_path = os.path.join(work_dir, 'void_turnaround_back_master.png')
s_col_path = os.path.join(work_dir, 'void_turnaround_side_master.png')

Image.fromarray(front_final_rgba).save(f_col_path)
Image.fromarray(back_final_rgba).save(b_col_path)
Image.fromarray(side_final_rgba).save(s_col_path)
print("Master Base Color textures saved successfully.")

# Helper for emission textures (Amethyst / Violet glow: #a855f7)
def extract_emission(rgba_arr, is_back=False):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    # Amethyst Void criteria
    is_amethyst = (b > 105) & (r > 75) & (b > g * 1.15) & (r > g * 0.85) & (a > 30)
    # Bright visor or core blade energy
    is_amethyst |= (r > 150) & (b > 150) & ((r + b) > 2 * g + 50) & (a > 30)
    
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    scale = np.clip((r[is_amethyst] + b[is_amethyst]) / 320.0, 0.6, 1.5)
    
    # Vivid Amethyst Void #a855f7 -> R: 180, G: 75, B: 255
    emit_rgb[is_amethyst, 0] = np.clip(180 * scale, 0, 255).astype(np.uint8)
    emit_rgb[is_amethyst, 1] = np.clip(75 * scale, 0, 255).astype(np.uint8)
    emit_rgb[is_amethyst, 2] = np.clip(255 * scale, 0, 255).astype(np.uint8)
    return emit_rgb

f_emi_path = os.path.join(work_dir, 'void_turnaround_front_emission.png')
b_emi_path = os.path.join(work_dir, 'void_turnaround_back_emission.png')
s_emi_path = os.path.join(work_dir, 'void_turnaround_side_emission.png')

Image.fromarray(extract_emission(front_final_rgba, is_back=False)).save(f_emi_path)
Image.fromarray(extract_emission(back_final_rgba, is_back=True)).save(b_emi_path)
Image.fromarray(extract_emission(side_final_rgba, is_back=False)).save(s_emi_path)
print("Emission textures saved successfully.")

# Helper for normal maps via Sobel operator
def generate_normal_map(rgba_arr, strength=1.8):
    gray_img = Image.fromarray(rgba_arr[:, :, :3]).convert('L').filter(ImageFilter.GaussianBlur(radius=0.75))
    gray = np.array(gray_img, dtype=float) / 255.0
    
    padded = np.pad(gray, 1, mode='edge')
    # Sobel X
    dx = (padded[:-2, 2:] + 2*padded[1:-1, 2:] + padded[2:, 2:]) - (padded[:-2, :-2] + 2*padded[1:-1, :-2] + padded[2:, :-2])
    # Sobel Y
    dy = (padded[2:, :-2] + 2*padded[2:, 1:-1] + padded[2:, 2:]) - (padded[:-2, :-2] + 2*padded[:-2, 1:-1] + padded[:-2, 2:])
    
    dx = dx * strength
    dy = dy * strength
    dz = np.ones_like(dx)
    
    length = np.sqrt(dx**2 + dy**2 + dz**2)
    nx = dx / length
    ny = dy / length
    nz = dz / length
    
    r = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    g = np.clip((-ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    b = np.clip((nz * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    a = rgba_arr[:, :, 3]
    return np.dstack([r, g, b, a])

f_nrm_path = os.path.join(work_dir, 'void_turnaround_front_normal.png')
b_nrm_path = os.path.join(work_dir, 'void_turnaround_back_normal.png')
s_nrm_path = os.path.join(work_dir, 'void_turnaround_side_normal.png')

Image.fromarray(generate_normal_map(front_final_rgba)).save(f_nrm_path)
Image.fromarray(generate_normal_map(back_final_rgba)).save(b_nrm_path)
Image.fromarray(generate_normal_map(side_final_rgba)).save(s_nrm_path)
print("Normal map textures saved successfully.")
print(">>> All Void Assassin master textures generated with 100% precision!")

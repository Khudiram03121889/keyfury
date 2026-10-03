import numpy as np
from PIL import Image, ImageFilter
from collections import deque
import os

print(">>> Generating pristine master turnaround textures for Cyber Valkyrie (Freya)...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"
canvas_w, canvas_h = 512, 768
target_h = 685
target_y_bottom = 748

# 1. Load raw slices from turnaround sheet
im_f = Image.open(os.path.join(work_dir, "slice_front.png"))
im_s = Image.open(os.path.join(work_dir, "slice_side.png"))
im_b = Image.open(os.path.join(work_dir, "slice_back.png"))

def segment_slice(im, mode='front'):
    arr = np.array(im)
    H, W = arr.shape[:2]
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    
    # Background expected value as vertical gradient
    y_norm = np.arange(H)[:, None] / float(H)
    bg_gray = 146.0 + 37.0 * y_norm
    diff_from_bg = np.sqrt((r - bg_gray)**2 + (g - bg_gray)**2 + (b - bg_gray)**2)
    
    is_bg_cand = (chroma < 18) & (diff_from_bg < 32)
    
    # Flood fill from image borders
    is_bg = np.zeros((H, W), dtype=bool)
    q = deque()
    
    for c in range(W):
        for r_idx in [0, 1, H-1, H-2]:
            if is_bg_cand[r_idx, c] or diff_from_bg[r_idx, c] < 40:
                is_bg[r_idx, c] = True
                q.append((r_idx, c))
    for r_idx in range(H):
        for c in [0, 1, W-1, W-2]:
            if is_bg_cand[r_idx, c] or diff_from_bg[r_idx, c] < 40:
                is_bg[r_idx, c] = True
                q.append((r_idx, c))
                
    while q:
        cr, cc = q.popleft()
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = cr + dr, cc + dc
            if 0 <= nr < H and 0 <= nc < W and not is_bg[nr, nc]:
                if is_bg_cand[nr, nc] or (diff_from_bg[nr, nc] < 24 and chroma[nr, nc] < 22):
                    is_bg[nr, nc] = True
                    q.append((nr, nc))
                    
    # Floor contact cut: below feet baseline (y > 515)
    is_bg[516:, :] = True
    
    if mode == 'front':
        # Front drop shadow cleanup:
        for y in range(455, H):
            for x in range(W):
                # Outside left/right boots or in center gap
                if x < 36 or x > 222 or (88 < x < 170):
                    is_bg[y, x] = True
    elif mode == 'back':
        # Back panel: clear stray adjacent figure tip on left and shadow on right
        for y in range(455, H):
            for x in range(W):
                if x < 52 or x > 255 or (105 < x < 200):
                    is_bg[y, x] = True
        is_bg[:455, :35] = True
    elif mode == 'side':
        # Side panel: clear floor drop shadow beyond toe and heel
        for y in range(485, H):
            for x in range(W):
                if x < 72 or x > 182:
                    is_bg[y, x] = True

    alpha = np.where(is_bg, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([arr, alpha]))

f_slice = segment_slice(im_f, mode='front')
s_slice = segment_slice(im_s, mode='side')
b_slice = segment_slice(im_b, mode='back')

# 2. Fit slices into standard canvas (512x768)
def fit_to_canvas(im):
    arr = np.array(im)
    alpha = arr[:, :, 3] > 20
    rows = np.where(np.any(alpha, axis=1))[0]
    cols = np.where(np.any(alpha, axis=0))[0]
    ymin, ymax = rows[0], rows[-1]
    xmin, xmax = cols[0], cols[-1]
    
    crop = im.crop((xmin, ymin, xmax + 1, ymax + 1))
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

# Symmetrical watertight mask synthesis
master_mask = f_mask | np.fliplr(f_mask)
back_target_mask = np.fliplr(master_mask)

# Color dilation helper to prevent dark seams at UV boundaries
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

b_valid = b_arr[:, :, 3] > 25
front_final_rgba = dilate_color(f_rgb, master_mask, f_mask)
back_final_rgba = dilate_color(b_arr[:, :, :3], back_target_mask, b_valid)

s_mask = s_arr[:, :, 3] > 25
side_final_rgba = dilate_color(s_arr[:, :, :3], s_mask, s_mask)

# Save Master Base Color Textures
f_col_path = os.path.join(work_dir, 'valk_turnaround_front_master.png')
b_col_path = os.path.join(work_dir, 'valk_turnaround_back_master.png')
s_col_path = os.path.join(work_dir, 'valk_clean_side.png')
s_col_path2 = os.path.join(work_dir, 'valk_turnaround_side_master.png')

Image.fromarray(front_final_rgba).save(f_col_path)
Image.fromarray(back_final_rgba).save(b_col_path)
Image.fromarray(side_final_rgba).save(s_col_path)
Image.fromarray(side_final_rgba).save(s_col_path2)
print("Master Color textures saved successfully.")

# 3. Normal Maps
def generate_normal_map(rgba_arr, strength=1.6):
    gray_img = Image.fromarray(rgba_arr[:, :, :3]).convert('L').filter(ImageFilter.GaussianBlur(radius=0.75))
    gray = np.array(gray_img, dtype=float) / 255.0
    padded = np.pad(gray, 1, mode='edge')
    dx = (padded[:-2, 2:] + 2*padded[1:-1, 2:] + padded[2:, 2:]) - (padded[:-2, :-2] + 2*padded[1:-1, :-2] + padded[2:, :-2])
    dy = (padded[2:, :-2] + 2*padded[2:, 1:-1] + padded[2:, 2:]) - (padded[:-2, :-2] + 2*padded[:-2, 1:-1] + padded[:-2, 2:])
    dx = dx * strength
    dy = dy * strength
    dz = np.ones_like(dx)
    mag = np.sqrt(dx*dx + dy*dy + dz*dz)
    nx = (-dx / mag * 0.5 + 0.5) * 255.0
    ny = (-dy / mag * 0.5 + 0.5) * 255.0
    nz = (dz / mag * 0.5 + 0.5) * 255.0
    n_rgb = np.dstack([nx, ny, nz]).astype(np.uint8)
    alpha = rgba_arr[:, :, 3]
    return np.dstack([n_rgb, alpha])

Image.fromarray(generate_normal_map(front_final_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_front_normal.png'))
Image.fromarray(generate_normal_map(back_final_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_back_normal.png'))
Image.fromarray(generate_normal_map(side_final_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_side_normal.png'))
print("Master Normal maps saved successfully.")

# 4. Targeted Emission: Crimson Arc Core, Ruby Visor, and Wing Thruster Vents
def extract_valk_emission(rgba_arr):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    # Glowing Orange/Crimson Arc Core and Visor
    is_arc_core = (r > 190) & (g > 80) & (b < 120) & (a > 30)
    is_ruby_visor = (r > 180) & (g < 60) & (b < 60) & (a > 30)
    is_thruster = (r > 170) & (g > 50) & (b < 50) & (a > 30)
    
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    emit_rgb[is_arc_core, 0] = 255
    emit_rgb[is_arc_core, 1] = np.clip(g[is_arc_core] * 1.2, 100, 210).astype(np.uint8)
    emit_rgb[is_arc_core, 2] = 20
    
    emit_rgb[is_ruby_visor, 0] = 255
    emit_rgb[is_ruby_visor, 1] = 20
    emit_rgb[is_ruby_visor, 2] = 40
    
    emit_rgb[is_thruster, 0] = 255
    emit_rgb[is_thruster, 1] = 60
    emit_rgb[is_thruster, 2] = 20
    
    return emit_rgb

Image.fromarray(extract_valk_emission(front_final_rgba)).save(os.path.join(work_dir, 'valk_turnaround_front_emission.png'))
Image.fromarray(extract_valk_emission(back_final_rgba)).save(os.path.join(work_dir, 'valk_turnaround_back_emission.png'))
Image.fromarray(extract_valk_emission(side_final_rgba)).save(os.path.join(work_dir, 'valk_turnaround_side_emission.png'))
print("Master Emission maps saved successfully.")

print(">>> ALL VALKYRIE MASTER TEXTURES COMPLETED!")

import numpy as np
from PIL import Image, ImageFilter
import os

print('>>> Generating pristine master turnaround textures for Volt Shinobi (Raijin)...')

work_dir = r'd:\Keyboard stickman warrior\test_3d'
canvas_w, canvas_h = 512, 768
target_h = 685
target_y_bottom = 748

# 1. Load clean slices (ground contact shadows removed)
f_slice = Image.open(os.path.join(work_dir, 'shinobi_slice_front_final.png'))
b_slice = Image.open(os.path.join(work_dir, 'shinobi_slice_back_final.png'))
s_slice = Image.open(os.path.join(work_dir, 'shinobi_slice_side.png'))

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
f_col_path = os.path.join(work_dir, 'shinobi_turnaround_front_master.png')
b_col_path = os.path.join(work_dir, 'shinobi_turnaround_back_master.png')
s_col_path = os.path.join(work_dir, 'shinobi_turnaround_side_master.png')

Image.fromarray(front_final_rgba).save(f_col_path)
Image.fromarray(back_final_rgba).save(b_col_path)
Image.fromarray(side_final_rgba).save(s_col_path)
print('Master Color textures saved successfully.')

# Helper for emission textures (electric yellow-amber glow)
def extract_emission(rgba_arr, is_back=False):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:,:,0], rgb[:,:,1], rgb[:,:,2]
    
    if is_back:
        # Strict plasma threshold on back to exclude fabric wraps
        is_plasma = (r > 160) & (g > 120) & (r > b * 1.35) & (g > b * 1.05) & (a > 50) & ((r + g) > 320)
        is_plasma |= (r > 200) & (g > 150) & (a > 50)
    else:
        is_plasma = (r > 130) & (g > 95) & (r > b * 1.25) & (g > b * 0.95) & (a > 30)
        
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    scale = np.clip((r[is_plasma] + g[is_plasma]) / 360.0, 0.6, 1.4)
    emit_rgb[is_plasma, 0] = np.clip(255 * scale, 0, 255).astype(np.uint8)
    emit_rgb[is_plasma, 1] = np.clip(195 * scale, 0, 255).astype(np.uint8)
    emit_rgb[is_plasma, 2] = np.clip(20 * scale, 0, 255).astype(np.uint8)
    return emit_rgb

f_emi_path = os.path.join(work_dir, 'shinobi_turnaround_front_emission.png')
b_emi_path = os.path.join(work_dir, 'shinobi_turnaround_back_emission.png')
s_emi_path = os.path.join(work_dir, 'shinobi_turnaround_side_emission.png')

Image.fromarray(extract_emission(front_final_rgba, is_back=False)).save(f_emi_path)
Image.fromarray(extract_emission(back_final_rgba, is_back=True)).save(b_emi_path)
Image.fromarray(extract_emission(side_final_rgba, is_back=False)).save(s_emi_path)
print('Emission textures saved successfully.')

# Helper for normal maps via pure numpy Sobel operator
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

f_nrm_path = os.path.join(work_dir, 'shinobi_turnaround_front_normal.png')
b_nrm_path = os.path.join(work_dir, 'shinobi_turnaround_back_normal.png')
s_nrm_path = os.path.join(work_dir, 'shinobi_turnaround_side_normal.png')

Image.fromarray(generate_normal_map(front_final_rgba)).save(f_nrm_path)
Image.fromarray(generate_normal_map(back_final_rgba)).save(b_nrm_path)
Image.fromarray(generate_normal_map(side_final_rgba)).save(s_nrm_path)
print('Normal map textures saved successfully.')
print('>>> All Volt Shinobi master textures generated with 100% precision!')

import numpy as np
from PIL import Image, ImageFilter

print('>>> Generating pristine master textures for Shadow Ronin with pure numpy & PIL...')

canvas_w, canvas_h = 512, 768

f_im = Image.open('ronin_slice_front.png')
b_im = Image.open('ronin_slice_back.png')
s_im = Image.open('ronin_slice_side.png')

f_c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
f_c.paste(f_im, (61, 0), f_im)

b_c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
b_c.paste(b_im, (70, 0), b_im)

s_c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
s_c.paste(s_im, (102, 0), s_im)

f_arr = np.array(f_c)
b_arr = np.array(b_c)
s_arr = np.array(s_c)

f_rgb = f_arr[:, :, :3]
f_alpha = f_arr[:, :, 3]
f_mask = f_alpha > 25

b_rgb = b_arr[:, :, :3]
b_alpha = b_arr[:, :, 3]
b_mask = b_alpha > 25

b_flipped_mask = np.fliplr(b_mask)
master_mask = f_mask | b_flipped_mask
back_target_mask = np.fliplr(master_mask)

# Color dilation helper
def dilate_color(rgb_arr, target_mask, iters=16):
    dilated = rgb_arr.copy()
    pad = target_mask.copy()
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

# Fill missing regions between front and back
b_flipped_rgb = np.fliplr(b_rgb)
front_fill = f_rgb.copy()
missing_f = master_mask & (~f_mask)
front_fill[missing_f] = np.clip(b_flipped_rgb[missing_f].astype(float) * 0.98, 0, 255).astype(np.uint8)

f_flipped_rgb = np.fliplr(f_rgb)
back_fill = b_rgb.copy()
missing_b = back_target_mask & (~b_mask)
back_fill[missing_b] = np.clip(f_flipped_rgb[missing_b].astype(float) * 0.98, 0, 255).astype(np.uint8)

front_final_rgba = dilate_color(front_fill, master_mask)
back_final_rgba = dilate_color(back_fill, back_target_mask)

s_mask = s_arr[:, :, 3] > 25
side_final_rgba = dilate_color(s_arr[:, :, :3], s_mask)

# Save Master Color Textures
Image.fromarray(front_final_rgba).save('ronin_turnaround_front_master.png')
Image.fromarray(back_final_rgba).save('ronin_turnaround_back_master.png')
Image.fromarray(side_final_rgba).save('ronin_turnaround_side_master.png')

print('Master Color textures saved successfully.')

# Helper for emission
def extract_emission(rgba_arr):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:,:,0], rgb[:,:,1], rgb[:,:,2]
    # Cyan condition: blue channel dominates, distinctive neon glow
    is_cyan = (b > 110) & (g > 70) & (b > r * 1.15) & (a > 50)
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    emit_rgb[is_cyan, 0] = np.clip(r[is_cyan] * 0.4, 0, 80).astype(np.uint8)
    emit_rgb[is_cyan, 1] = np.clip(g[is_cyan] * 1.15 + 20, 0, 255).astype(np.uint8)
    emit_rgb[is_cyan, 2] = np.clip(b[is_cyan] * 1.25 + 30, 0, 255).astype(np.uint8)
    return emit_rgb

Image.fromarray(extract_emission(front_final_rgba)).save('ronin_turnaround_front_emission.png')
Image.fromarray(extract_emission(back_final_rgba)).save('ronin_turnaround_back_emission.png')
Image.fromarray(extract_emission(side_final_rgba)).save('ronin_turnaround_side_emission.png')
print('Emission textures saved successfully.')

# Helper for normal maps via pure numpy sobel
def generate_normal_map(rgba_arr, strength=1.8):
    gray_img = Image.fromarray(rgba_arr[:, :, :3]).convert('L').filter(ImageFilter.GaussianBlur(radius=0.8))
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

Image.fromarray(generate_normal_map(front_final_rgba)).save('ronin_turnaround_front_normal.png')
Image.fromarray(generate_normal_map(back_final_rgba)).save('ronin_turnaround_back_normal.png')
Image.fromarray(generate_normal_map(side_final_rgba)).save('ronin_turnaround_side_normal.png')
print('Normal map textures saved successfully.')

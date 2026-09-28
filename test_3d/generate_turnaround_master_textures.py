from PIL import Image, ImageFilter
import numpy as np

print('>>> Generating Master Watertight Front & Back PBR Textures...')

f_im = Image.open(r'd:\Keyboard stickman warrior\test_3d\valk_clean_front_perfect.png')
b_im = Image.open(r'd:\Keyboard stickman warrior\test_3d\valk_clean_back_perfect.png')

f_arr = np.array(f_im)
b_arr = np.array(b_im)
H, W = f_arr.shape[:2]

f_rgb = f_arr[:, :, :3]
f_alpha = f_arr[:, :, 3]
f_mask = f_alpha > 100

b_rgb = b_arr[:, :, :3]
b_alpha = b_arr[:, :, 3]
b_mask = b_alpha > 100

# Align back mask to front coordinates
b_mask_flipped = np.fliplr(b_mask)
master_mask = f_mask | b_mask_flipped
back_target_mask = np.fliplr(master_mask)

print(f'Master mask total pixels: {np.sum(master_mask)}')

# 1. Fill missing regions
b_flipped_rgb = np.fliplr(b_rgb)
front_fill = f_rgb.copy()
missing_f = master_mask & (~f_mask)
front_fill[missing_f] = np.clip(b_flipped_rgb[missing_f].astype(float) * 1.05, 0, 255).astype(np.uint8)

f_flipped_rgb = np.fliplr(f_rgb)
back_fill = b_rgb.copy()
missing_b = back_target_mask & (~b_mask)
back_fill[missing_b] = np.clip(f_flipped_rgb[missing_b].astype(float) * 0.95, 0, 255).astype(np.uint8)

# 2. Color Dilation / Padding (16 iterations) to avoid edge filtering fringes
def dilate_color(rgb_arr, target_mask):
    dilated = rgb_arr.copy()
    pad = target_mask.copy()
    for _ in range(16):
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

master_front_rgba = dilate_color(front_fill, master_mask)
master_back_rgba = dilate_color(back_fill, back_target_mask)

Image.fromarray(master_front_rgba).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_master.png')
Image.fromarray(master_back_rgba).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_master.png')
print('Saved valk_turnaround_front_master.png and valk_turnaround_back_master.png!')

# 3. Normal Maps
def make_normal_map(rgb_arr, strength=2.2):
    gray = np.array(Image.fromarray(rgb_arr).convert('L')).astype(float)
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = (gray[:, 2:] - gray[:, :-2]) / 2.0
    gy[1:-1, :] = (gray[2:, :] - gray[:-2, :]) / 2.0
    nx = -gx * strength
    ny = -gy * strength
    nz = 255.0
    length = np.sqrt(nx**2 + ny**2 + nz**2)
    nx /= length; ny /= length; nz /= length
    r_c = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    g_c = np.clip((ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    b_c = np.clip((nz * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
    return np.dstack([r_c, g_c, b_c, np.full_like(r_c, 255)])

norm_f = make_normal_map(master_front_rgba[:, :, :3])
norm_b = make_normal_map(master_back_rgba[:, :, :3])
Image.fromarray(norm_f).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_normal.png')
Image.fromarray(norm_b).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_normal.png')
print('Saved master normal maps!')

# 4. Emission Maps
f_emit = np.zeros((H, W, 4), dtype=np.uint8)
y_g, x_g = np.ogrid[:H, :W]
visor_mask = (y_g >= 200) & (y_g <= 250) & (x_g >= 480) & (x_g <= 544) & (master_front_rgba[:,:,0] > 180) & (master_front_rgba[:,:,1] > 30)
core_mask = (np.sqrt((x_g - 512)**2 + (y_g - 378)**2) <= 24)
f_emit[visor_mask] = [255, 60, 40, 255]
f_emit[core_mask] = [255, 140, 50, 255]
Image.fromarray(f_emit).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_front_emission.png')

b_emit = np.zeros((H, W, 4), dtype=np.uint8)
thrust_l = (np.sqrt((x_g - 442)**2 + (y_g - 345)**2) <= 42)
thrust_r = (np.sqrt((x_g - 582)**2 + (y_g - 345)**2) <= 42)
spine_mask = (y_g >= 350) & (y_g <= 580) & (np.abs(x_g - 512) <= 10) & (master_back_rgba[:,:,0] > 160)
b_emit[thrust_l | thrust_r] = [255, 120, 30, 255]
b_emit[spine_mask] = [255, 50, 30, 255]
Image.fromarray(b_emit).save(r'd:\Keyboard stickman warrior\test_3d\valk_turnaround_back_emission.png')
print('Saved master emission maps!')

print('>>> MASTER PBR TEXTURES SUCCESSFULLY CREATED!')

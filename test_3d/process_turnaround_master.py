from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import os

print(">>> Processing Master Turnaround Sheet into 3D Game Atlases...")

sheet_path = r"C:\Users\Dell\.gemini\antigravity\brain\63657698-2b9f-4c46-af7f-4d021b09da2a\.user_uploaded\media_1788783970981.jpg"
im = Image.open(sheet_path)
arr = np.array(im)
H, W = arr.shape[:2]

CANVAS_W = 1024
CANVAS_H = 1536
TARGET_CHAR_H = 1320
TARGET_TOP_Y = 120

def remove_bg(panel_arr, is_back=False):
    ph, pw = panel_arr.shape[:2]
    # Background color is light gray with near-zero chroma
    r, g, b = panel_arr[:,:,0].astype(float), panel_arr[:,:,1].astype(float), panel_arr[:,:,2].astype(float)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    
    bg_top = np.mean(panel_arr[:15, :, :], axis=(0,1))
    bg_bot = np.mean(panel_arr[ph-20:, :, :], axis=(0,1))
    y_norm = np.arange(ph)[:, None, None] / float(ph)
    bg_est = (1.0 - y_norm) * bg_top + y_norm * bg_bot
    color_diff = np.sqrt(np.sum((panel_arr.astype(float) - bg_est)**2, axis=2))
    
    is_bg = (chroma < 16) & (color_diff < 32)
    
    outside = np.zeros((ph, pw), dtype=bool)
    q = deque()
    for c in range(pw):
        for r_idx in [0, 1, ph-1, ph-2]:
            outside[r_idx, c] = True
            q.append((r_idx, c))
    for r_idx in range(ph):
        for c in [0, 1, pw-1, pw-2]:
            outside[r_idx, c] = True
            q.append((r_idx, c))
            
    while q:
        cr, cc = q.popleft()
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
            nr, nc = cr+dr, cc+dc
            if 0 <= nr < ph and 0 <= nc < pw and not outside[nr, nc]:
                if is_bg[nr, nc] or color_diff[nr, nc] < 20:
                    outside[nr, nc] = True
                    q.append((nr, nc))
                    
    # Clean internal holes
    visited = outside.copy()
    for r_idx in range(ph):
        for c in range(pw):
            if is_bg[r_idx, c] and not visited[r_idx, c]:
                comp = []
                cq = deque([(r_idx, c)])
                visited[r_idx, c] = True
                while cq:
                    curr_r, curr_c = cq.popleft()
                    comp.append((curr_r, curr_c))
                    for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
                        nr, nc = curr_r+dr, curr_c+dc
                        if 0 <= nr < ph and 0 <= nc < pw and is_bg[nr, nc] and not visited[nr, nc]:
                            visited[nr, nc] = True
                            cq.append((nr, nc))
                comp_diffs = [color_diff[pr, pc] for pr, pc in comp]
                if np.mean(comp_diffs) < 22 and len(comp) > 12:
                    for pr, pc in comp:
                        outside[pr, pc] = True
                        
    # Bottom floor baseline line
    outside[516:, :] = True
    
    if is_back:
        # Clear bottom-left stray foot tip from adjacent figure
        outside[460:, :30] = True
        
    alpha = np.where(outside, 0, 255).astype(np.uint8)
    alpha_smooth = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=0.7)))
    return np.dstack([panel_arr, alpha_smooth])

# 1. Extract Panels
panel_f = remove_bg(arr[:520, 10:245])
panel_b = remove_bg(arr[:520, 718:948], is_back=True)
panel_s = remove_bg(arr[:520, 250:435])

def standardize_panel(rgba_panel):
    alpha = rgba_panel[:, :, 3]
    char_rows = np.where(np.any(alpha > 100, axis=1))[0]
    char_cols = np.where(np.any(alpha > 100, axis=0))[0]
    y_min, y_max = char_rows[0], char_rows[-1]
    x_min, x_max = char_cols[0], char_cols[-1]
    
    cropped = rgba_panel[y_min:y_max+1, x_min:x_max+1]
    crop_h, crop_w = cropped.shape[:2]
    
    scale = TARGET_CHAR_H / float(crop_h)
    new_w = int(round(crop_w * scale))
    new_h = TARGET_CHAR_H
    
    pil_crop = Image.fromarray(cropped).resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    paste_x = int(round((CANVAS_W - new_w) / 2.0))
    paste_y = TARGET_TOP_Y
    canvas.paste(pil_crop, (paste_x, paste_y), pil_crop)
    return canvas

canvas_front = standardize_panel(panel_f)
canvas_back = standardize_panel(panel_b)
canvas_side = standardize_panel(panel_s)

# Save Base RGBA Atlases
canvas_front.save(r"d:\Keyboard stickman warrior\test_3d\valk_atlas_front.png")
canvas_back.save(r"d:\Keyboard stickman warrior\test_3d\valk_atlas_back.png")
canvas_side.save(r"d:\Keyboard stickman warrior\test_3d\valk_atlas_side.png")
print("Saved base atlases!")

# 2. Harmonize Front & Back Silhouettes for 100% Watertight Gapless 3D Mesh
f_arr = np.array(canvas_front)
b_arr = np.array(canvas_back)

f_mask = f_arr[:, :, 3] > 128
# Back is viewed from behind, so its horizontal axis is flipped relative to front
b_mask_flipped = np.fliplr(b_arr[:, :, 3] > 128)

# Master 3D boundary contour is the Union of Front & Back silhouettes:
master_mask = f_mask | b_mask_flipped

# Inpaint/dilate color so that everywhere in master_mask, BOTH front and back have 100% solid texture
def dilate_and_fill(rgb_arr, target_mask, current_mask):
    missing = target_mask & (~current_mask)
    filled_rgb = rgb_arr.copy()
    
    # Symmetrical reflection across center spine (x=512)
    for y in range(CANVAS_H):
        for x in range(CANVAS_W):
            if missing[y, x]:
                mx = int(np.clip(2 * 512 - x, 0, CANVAS_W - 1))
                filled_rgb[y, x] = rgb_arr[y, mx]
                
    # Dilation outward 12px
    dilated = filled_rgb.copy()
    pad = target_mask.copy()
    for _ in range(12):
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
        
    final_alpha = np.where(target_mask, 255, 0).astype(np.uint8)
    return np.dstack([dilated, final_alpha])

back_target_mask = np.fliplr(master_mask)
master_front_rgba = dilate_and_fill(f_arr[:, :, :3], master_mask, f_mask)
master_back_rgba = dilate_and_fill(b_arr[:, :, :3], back_target_mask, b_arr[:, :, 3] > 128)

Image.fromarray(master_front_rgba).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_front_master.png")
Image.fromarray(master_back_rgba).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_back_master.png")
print("Saved master front & back gapless textures!")

# 3. Generate Normal Maps
def make_normal_map(rgb_arr, strength=2.2):
    gray = np.array(Image.fromarray(rgb_arr).convert("L")).astype(float)
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
Image.fromarray(norm_f).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_front_normal.png")
Image.fromarray(norm_b).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_back_normal.png")
print("Saved master normal maps!")

# 4. Generate Emission Maps
# Front: glowing chest arc reactor + helmet visor + wing conduits
f_rgb = master_front_rgba[:, :, :3].astype(float)
f_emit = np.zeros((CANVAS_H, CANVAS_W, 4), dtype=np.uint8)
# Visor at y ~ 210-240, x ~ 480-544
y_g, x_g = np.ogrid[:CANVAS_H, :CANVAS_W]
visor_mask = (y_g >= 205) & (y_g <= 245) & (x_g >= 485) & (x_g <= 540) & (f_rgb[:,:,0] > 180)
# Chest arc core at y ~ 360-395, x ~ 495-530
core_mask = (np.sqrt((x_g - 512)**2 + (y_g - 378)**2) <= 22)
f_emit[visor_mask] = [255, 60, 40, 255]
f_emit[core_mask] = [255, 140, 50, 255]
Image.fromarray(f_emit).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_front_emission.png")

# Back: dual jet thrusters + central spinal energy column
b_emit = np.zeros((CANVAS_H, CANVAS_W, 4), dtype=np.uint8)
# Dual thrusters at y ~ 300-360, x ~ 420-475 (left) and 550-605 (right)
thrust_l = (np.sqrt((x_g - 448)**2 + (y_g - 330)**2) <= 38)
thrust_r = (np.sqrt((x_g - 576)**2 + (y_g - 330)**2) <= 38)
# Spinal column at y ~ 340-520, x ~ 505-520
spine_mask = (y_g >= 340) & (y_g <= 520) & (np.abs(x_g - 512) <= 8) & (master_back_rgba[:,:,0] > 160)
b_emit[thrust_l | thrust_r] = [255, 120, 30, 255]
b_emit[spine_mask] = [255, 50, 30, 255]
Image.fromarray(b_emit).save(r"d:\Keyboard stickman warrior\test_3d\valk_turnaround_back_emission.png")
print("Saved master emission maps!")

print(">>> COMPLETE TURNAROUND PBR ATLASED WITH 100% SOLID GAPLESS SILHOUETTES!")

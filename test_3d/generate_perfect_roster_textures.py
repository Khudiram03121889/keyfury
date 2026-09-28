import os
import numpy as np
from PIL import Image, ImageFilter

work_dir = r"d:\Keyboard stickman warrior\test_3d"
canvas_w, canvas_h = 512, 768
target_h = 685
target_y_bottom = 748

print("=== STEP 1: Generating Pristine Master Textures for Shadow Ronin & Cyber Valkyrie ===")

def fit_to_canvas(im, target_h=target_h, target_y_bottom=target_y_bottom, threshold=20):
    arr = np.array(im)
    alpha = arr[:, :, 3] > threshold
    rows = np.where(np.any(alpha, axis=1))[0]
    cols = np.where(np.any(alpha, axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
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

def dilate_color(rgb_arr, target_mask, valid_mask, iters=8):
    dilated = rgb_arr.copy()
    known = valid_mask.copy()
    for _ in range(iters):
        up = np.zeros_like(known); up[:-1] = known[1:]
        down = np.zeros_like(known); down[1:] = known[:-1]
        left = np.zeros_like(known); left[:, :-1] = known[:, 1:]
        right = np.zeros_like(known); right[:, 1:] = known[:, :-1]
        
        need_fill = target_mask & (~known)
        
        fill_up = need_fill & up
        dilated[fill_up] = np.vstack([dilated[1:], dilated[-1:]])[fill_up]
        known |= fill_up
        
        fill_down = need_fill & down & (~known)
        dilated[fill_down] = np.vstack([dilated[:1], dilated[:-1]])[fill_down]
        known |= fill_down
        
        fill_left = need_fill & left & (~known)
        dilated[fill_left] = np.hstack([dilated[:, 1:], dilated[:, -1:]])[fill_left]
        known |= fill_left
        
        fill_right = need_fill & right & (~known)
        dilated[fill_right] = np.hstack([dilated[:, :1], dilated[:, :-1]])[fill_right]
        known |= fill_right
        
    alpha = np.where(target_mask, 255, 0).astype(np.uint8)
    return np.dstack([dilated, alpha])

def generate_normal_map(rgba_arr, strength=1.8):
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

# Helper to remove floor drop shadows so feet/boots are cleanly grounded and separated
def remove_drop_shadow(im):
    arr = np.array(im).copy()
    h, w = arr.shape[:2]
    for r in range(695, h):
        for c in range(w):
            if r > 737:
                arr[r, c, 3] = 0
            elif r >= 705:
                rgb = arr[r, c, :3]
                if rgb[0] > 70 and rgb[1] > 70 and rgb[2] > 70:
                    arr[r, c, 3] = 0
    return Image.fromarray(arr)

# =========================================================================
# 1. SHADOW RONIN (KAGE)
# =========================================================================
print("Processing Shadow Ronin textures with clean boots & true asymmetrical turnaround...")
ronin_f = fit_to_canvas(remove_drop_shadow(Image.open(os.path.join(work_dir, 'clean_ronin_slice_front.png'))))
ronin_b = fit_to_canvas(remove_drop_shadow(Image.open(os.path.join(work_dir, 'clean_ronin_slice_back.png'))))
ronin_s = fit_to_canvas(remove_drop_shadow(Image.open(os.path.join(work_dir, 'check_bg_ronin_slice_side_clean3.png'))))

f_arr = np.array(ronin_f)
b_arr = np.array(ronin_b)
s_arr = np.array(ronin_s)

f_rgb, f_alpha = f_arr[:, :, :3], f_arr[:, :, 3]
b_rgb, b_alpha = b_arr[:, :, :3], b_arr[:, :, 3]
s_rgb, s_alpha = s_arr[:, :, :3], s_arr[:, :, 3]

f_mask = f_alpha > 25
b_mask = b_alpha > 25
s_mask = s_alpha > 25

# Physically consistent 3D turnaround alignment (Back view from front is horizontally flipped)
b_aligned_mask = np.fliplr(b_mask)
b_aligned_rgb = np.fliplr(b_rgb)

ronin_master_mask = f_mask | b_aligned_mask
ronin_back_mask = np.fliplr(ronin_master_mask)

f_flipped_rgb = np.fliplr(f_rgb)

ronin_f_fill = f_rgb.copy()
miss_f = ronin_master_mask & (~f_mask)
ronin_f_fill[miss_f] = np.clip(b_aligned_rgb[miss_f].astype(float) * 0.95, 0, 255).astype(np.uint8)

ronin_b_fill = b_rgb.copy()
miss_b = ronin_back_mask & (~b_mask)
ronin_b_fill[miss_b] = np.clip(f_flipped_rgb[miss_b].astype(float) * 0.95, 0, 255).astype(np.uint8)

ronin_f_rgba = dilate_color(ronin_f_fill, ronin_master_mask, f_mask)
ronin_b_rgba = dilate_color(ronin_b_fill, ronin_back_mask, b_mask)
ronin_s_rgba = dilate_color(s_rgb, s_mask, s_mask)

# Save Master Base Colors
Image.fromarray(ronin_f_rgba).save(os.path.join(work_dir, 'ronin_turnaround_front_master.png'))
Image.fromarray(ronin_b_rgba).save(os.path.join(work_dir, 'ronin_turnaround_back_master.png'))
Image.fromarray(ronin_s_rgba).save(os.path.join(work_dir, 'ronin_turnaround_side_master.png'))

# Normal Maps
Image.fromarray(generate_normal_map(ronin_f_rgba, strength=1.5)).save(os.path.join(work_dir, 'ronin_turnaround_front_normal.png'))
Image.fromarray(generate_normal_map(ronin_b_rgba, strength=1.5)).save(os.path.join(work_dir, 'ronin_turnaround_back_normal.png'))
Image.fromarray(generate_normal_map(ronin_s_rgba, strength=1.5)).save(os.path.join(work_dir, 'ronin_turnaround_side_normal.png'))

# Targeted Emission: Circuit Piping & Visor ONLY! No blown-out suit/scarf wash!
def extract_ronin_emission(rgba_arr, is_back=False):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    # Sharp Electric Cyan Circuit Piping & Visor
    is_cyan = (b > 160) & (g > 120) & (b > r * 1.5) & (a > 30)
    
    r_idx, c_idx = np.indices((rgba_arr.shape[0], rgba_arr.shape[1]))
    if not is_back:
        is_scarf_geo = (r_idx >= 140) & (r_idx <= 225) & (c_idx >= 185) & (c_idx <= 325)
        is_scarf_geo |= (r_idx > 225) & (r_idx <= 420) & (c_idx >= 155) & (c_idx <= 208)
    else:
        is_scarf_geo = (r_idx >= 140) & (r_idx <= 225) & (c_idx >= 185) & (c_idx <= 325)
        is_scarf_geo |= (r_idx > 225) & (r_idx <= 470) & (c_idx >= 230) & (c_idx <= 370)
        
    is_circuits = is_cyan & (~is_scarf_geo)
    
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    emit_rgb[is_circuits, 0] = 0
    emit_rgb[is_circuits, 1] = np.clip(g[is_circuits] * 1.15, 190, 255).astype(np.uint8)
    emit_rgb[is_circuits, 2] = 255
    
    # Delicate edge highlight for scarf without lightbulb wash
    is_scarf_edge = is_cyan & is_scarf_geo & (b > 245) & (g > 220)
    emit_rgb[is_scarf_edge, 0] = 0
    emit_rgb[is_scarf_edge, 1] = 110
    emit_rgb[is_scarf_edge, 2] = 175
    
    return emit_rgb

Image.fromarray(extract_ronin_emission(ronin_f_rgba, is_back=False)).save(os.path.join(work_dir, 'ronin_turnaround_front_emission.png'))
Image.fromarray(extract_ronin_emission(ronin_b_rgba, is_back=True)).save(os.path.join(work_dir, 'ronin_turnaround_back_emission.png'))
Image.fromarray(extract_ronin_emission(ronin_s_rgba, is_back=False)).save(os.path.join(work_dir, 'ronin_turnaround_side_emission.png'))
print("Shadow Ronin textures generated successfully with clean separated boots.")

# =========================================================================
# 2. CYBER VALKYRIE (FREYA)
# =========================================================================
print("Processing Cyber Valkyrie textures...")
valk_f = fit_to_canvas(Image.open(os.path.join(work_dir, 'valk_clean_front_perfect.png')), target_h=685, target_y_bottom=748)
valk_b = fit_to_canvas(Image.open(os.path.join(work_dir, 'valk_clean_back_perfect.png')), target_h=685, target_y_bottom=748)
valk_s = fit_to_canvas(Image.open(os.path.join(work_dir, 'valk_clean_side.png')), target_h=685, target_y_bottom=748)

vf_arr = np.array(valk_f)
vb_arr = np.array(valk_b)
vs_arr = np.array(valk_s)

vf_rgb, vf_alpha = vf_arr[:, :, :3], vf_arr[:, :, 3]
vb_rgb, vb_alpha = vb_arr[:, :, :3], vb_arr[:, :, 3]
vs_rgb, vs_alpha = vs_arr[:, :, :3], vs_arr[:, :, 3]

vf_mask = vf_alpha > 25
vb_mask = vb_alpha > 25
vs_mask = vs_alpha > 25

# Bilateral symmetrical mask synthesis (clean wing silhouette on both sides)
valk_master_mask = vf_mask | np.fliplr(vf_mask)
valk_back_mask = np.fliplr(valk_master_mask)

vf_flipped_rgb = np.fliplr(vf_rgb)
vb_flipped_rgb = np.fliplr(vb_rgb)

valk_f_fill = vf_rgb.copy()
miss_vf = valk_master_mask & (~vf_mask)
valk_f_fill[miss_vf] = np.clip(vb_flipped_rgb[miss_vf].astype(float) * 0.95, 0, 255).astype(np.uint8)

valk_b_fill = vb_rgb.copy()
miss_vb = valk_back_mask & (~vb_mask)
valk_b_fill[miss_vb] = np.clip(vf_flipped_rgb[miss_vb].astype(float) * 0.95, 0, 255).astype(np.uint8)

valk_f_rgba = dilate_color(valk_f_fill, valk_master_mask, vf_mask)
valk_b_rgba = dilate_color(valk_b_fill, valk_back_mask, vb_mask)
valk_s_rgba = dilate_color(vs_rgb, vs_mask, vs_mask)

# Save Master Base Colors
Image.fromarray(valk_f_rgba).save(os.path.join(work_dir, 'valk_turnaround_front_master.png'))
Image.fromarray(valk_b_rgba).save(os.path.join(work_dir, 'valk_turnaround_back_master.png'))
Image.fromarray(valk_s_rgba).save(os.path.join(work_dir, 'valk_clean_side.png'))

# Normal Maps
Image.fromarray(generate_normal_map(valk_f_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_front_normal.png'))
Image.fromarray(generate_normal_map(valk_b_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_back_normal.png'))
Image.fromarray(generate_normal_map(valk_s_rgba, strength=1.6)).save(os.path.join(work_dir, 'valk_turnaround_side_normal.png'))

# Targeted Emission: Crimson Arc Core, Ruby Visor, and Wing Thruster Vents ONLY
def extract_valk_emission(rgba_arr):
    rgb = rgba_arr[:, :, :3].astype(float)
    a = rgba_arr[:, :, 3]
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    # Glowing Orange/Crimson Arc Core and Visor
    is_arc_core = (r > 200) & (g > 90) & (b < 120) & (a > 30)
    is_ruby_visor = (r > 190) & (g < 60) & (b < 60) & (a > 30)
    is_thruster = (r > 180) & (g > 60) & (b < 50) & (a > 30)
    
    emit_rgb = np.zeros_like(rgb, dtype=np.uint8)
    # Radiant Arc Core orange-crimson glow #ff4500
    emit_rgb[is_arc_core, 0] = 255
    emit_rgb[is_arc_core, 1] = np.clip(g[is_arc_core] * 1.2, 100, 210).astype(np.uint8)
    emit_rgb[is_arc_core, 2] = 20
    
    # Ruby Visor #ff0033
    emit_rgb[is_ruby_visor, 0] = 255
    emit_rgb[is_ruby_visor, 1] = 20
    emit_rgb[is_ruby_visor, 2] = 40
    
    # Thruster nozzles
    emit_rgb[is_thruster, 0] = 255
    emit_rgb[is_thruster, 1] = 60
    emit_rgb[is_thruster, 2] = 20
    
    return emit_rgb

Image.fromarray(extract_valk_emission(valk_f_rgba)).save(os.path.join(work_dir, 'valk_turnaround_front_emission.png'))
Image.fromarray(extract_valk_emission(valk_b_rgba)).save(os.path.join(work_dir, 'valk_turnaround_back_emission.png'))
Image.fromarray(extract_valk_emission(valk_s_rgba)).save(os.path.join(work_dir, 'valk_turnaround_side_emission.png'))
print("Cyber Valkyrie textures generated successfully.")

print(">>> ALL MASTER TEXTURES GENERATED WITH FLAWLESS MASKING AND CALIBRATED EMISSIONS!")

from PIL import Image, ImageFilter
import numpy as np
import os

print(">>> Generating 100% Complete Gapless Back Texture for Cyber Valkyrie...")

front_path = r"d:\Keyboard stickman warrior\apps\web\dist\assets\characters\cyber_valkyrie\atlas-v3-consistent-source.png"
back_path = r"d:\Keyboard stickman warrior\test_3d\valk_back_color.png"

front_img = Image.open(front_path).convert("RGBA")
back_img = Image.open(back_path).convert("RGBA")

W, H = front_img.size
f_arr = np.array(front_img)
b_arr = np.array(back_img)

# Target back mask: exactly flipped front alpha mask (sub-pixel aligned)
f_alpha = f_arr[:, :, 3]
target_mask = np.fliplr(f_alpha > 128)

# Current back image data
b_rgb = b_arr[:, :, :3]
b_alpha = b_arr[:, :, 3]
current_solid = b_alpha > 128

# Missing pixels that MUST be textured:
missing = target_mask & (~current_solid)
print(f"Total target body pixels: {np.sum(target_mask)}")
print(f"Already solid in back: {np.sum(current_solid & target_mask)}")
print(f"Missing to be synthesized: {np.sum(missing)}")

# 1. Base synthesis using symmetrical armor mapping:
# For any pixel (y, x) in missing:
# Reflect horizontally across the character's vertical spine line (approx x = 510)
# to sample the opposite rear armor plate!
spine_x = 510
mirrored_b_rgb = np.zeros_like(b_rgb)
mirrored_b_alpha = np.zeros_like(b_alpha)

for y in range(H):
    for x in range(W):
        # Mirrored x across spine
        mx = int(np.clip(2 * spine_x - x, 0, W - 1))
        mirrored_b_rgb[y, x] = b_rgb[y, mx]
        mirrored_b_alpha[y, x] = b_alpha[y, mx]

# For areas where front has limbs:
# Invert front armor with rear-lighting transformation (crimson plates, gunmetal hydraulics)
f_flipped_rgb = np.fliplr(f_arr[:, :, :3]).astype(float)
# Darken slightly to match rear combat lighting and boost crimson saturation
f_rear_lighting = f_flipped_rgb.copy()
f_rear_lighting[:, :, 0] = np.clip(f_rear_lighting[:, :, 0] * 1.05, 0, 255) # Keep crimson punch
f_rear_lighting[:, :, 1] = np.clip(f_rear_lighting[:, :, 1] * 0.88, 0, 255)
f_rear_lighting[:, :, 2] = np.clip(f_rear_lighting[:, :, 2] * 0.88, 0, 255)
f_rear_lighting = f_rear_lighting.astype(np.uint8)

# Composite final back RGB:
final_b_rgb = b_rgb.copy()

# Step A: Where current back has solid data, keep it
# Step B: Where missing and mirrored back is solid, use mirrored back
use_mirrored = missing & (mirrored_b_alpha > 128)
final_b_rgb[use_mirrored] = mirrored_b_rgb[use_mirrored]

# Step C: Any remaining missing pixels get the rear-lit flipped armor
still_missing = target_mask & (~current_solid) & (~use_mirrored)
final_b_rgb[still_missing] = f_rear_lighting[still_missing]

# 2. Seamless blending along boundary seams (Gaussian blur on mask transitions)
from PIL import ImageFilter
seam_mask_img = Image.fromarray((missing).astype(np.uint8) * 255)
blurred_seam = np.array(seam_mask_img.filter(ImageFilter.GaussianBlur(radius=3))) / 255.0

# Blend near the edges of missing regions for natural transition
for c in range(3):
    blended_channel = final_b_rgb[:, :, c].astype(float)
    original_channel = b_rgb[:, :, c].astype(float)
    # where blurred_seam is between 0 and 1, blend
    soft_zone = (blurred_seam > 0.05) & (blurred_seam < 0.95) & current_solid
    blended_channel[soft_zone] = (1.0 - blurred_seam[soft_zone]) * original_channel[soft_zone] + blurred_seam[soft_zone] * blended_channel[soft_zone]
    final_b_rgb[:, :, c] = np.clip(blended_channel, 0, 255).astype(np.uint8)

# 3. Alpha Channel: 100% solid on target_mask!
final_alpha = np.zeros((H, W), dtype=np.uint8)
final_alpha[target_mask] = 255

# 4. Color Dilation / Padding outside mask (prevents edge filtering artifacts)
# Dilate RGB 16 pixels outward into transparent zone
dilated_rgb = final_b_rgb.copy()
pad_mask = target_mask.copy()
for _ in range(16):
    # Dilate by 1 pixel in 8 directions
    shifted = []
    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if dy == 0 and dx == 0: continue
            s = np.roll(np.roll(pad_mask, dy, axis=0), dx, axis=1)
            shifted.append((s, dy, dx))
    new_mask = pad_mask.copy()
    for s, dy, dx in shifted:
        border = s & (~new_mask)
        if np.any(border):
            dilated_rgb[border] = np.roll(np.roll(dilated_rgb, dy, axis=0), dx, axis=1)[border]
            new_mask |= border
    pad_mask = new_mask

# Save final back color
final_back_rgba = np.dstack([dilated_rgb, final_alpha])
out_color_path = r"d:\Keyboard stickman warrior\test_3d\valk_back_color.png"
Image.fromarray(final_back_rgba).save(out_color_path)
print(f"Saved completed gapless back color to: {out_color_path}")

# 5. Generate High-Quality Normal Map for Back View
gray = np.array(Image.fromarray(dilated_rgb).convert("L")).astype(float)
# Sobel filter
gx = np.zeros_like(gray)
gy = np.zeros_like(gray)
gx[:, 1:-1] = (gray[:, 2:] - gray[:, :-2]) / 2.0
gy[1:-1, :] = (gray[2:, :] - gray[:-2, :]) / 2.0

strength = 2.5
nx = -gx * strength
ny = -gy * strength
nz = 255.0
length = np.sqrt(nx**2 + ny**2 + nz**2)
nx /= length
ny /= length
nz /= length

norm_r = np.clip((nx * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
norm_g = np.clip((ny * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
norm_b = np.clip((nz * 0.5 + 0.5) * 255, 0, 255).astype(np.uint8)
norm_rgba = np.dstack([norm_r, norm_g, norm_b, np.full((H, W), 255, dtype=np.uint8)])
out_norm_path = r"d:\Keyboard stickman warrior\test_3d\valk_back_normal.png"
Image.fromarray(norm_rgba).save(out_norm_path)
print(f"Saved completed back normal map to: {out_norm_path}")

# 6. Generate High-Quality Emission Map for Back View
# Glowing spinal power core and dual thrusters
emit_mask = np.zeros((H, W, 4), dtype=np.uint8)
# Spinal core at y ~ 450-550, x ~ 480-540
# Thrusters at y ~ 480-530, x ~ 440-470 and 550-580
y_idx, x_idx = np.ogrid[:H, :W]
# Central reactor core
dist_core = np.sqrt((x_idx - 510)**2 + (y_idx - 490)**2)
core_glow = np.clip(1.0 - dist_core / 45.0, 0.0, 1.0)**2
# Left & right thrusters
dist_tl = np.sqrt((x_idx - 450)**2 + (y_idx - 510)**2)
dist_tr = np.sqrt((x_idx - 570)**2 + (y_idx - 510)**2)
thrust_glow = np.maximum(
    np.clip(1.0 - dist_tl / 30.0, 0.0, 1.0)**2,
    np.clip(1.0 - dist_tr / 30.0, 0.0, 1.0)**2
)
total_glow = np.maximum(core_glow, thrust_glow)
emit_mask[total_glow > 0.05, 0] = np.clip(255 * total_glow[total_glow > 0.05] * 1.0, 0, 255).astype(np.uint8)
emit_mask[total_glow > 0.05, 1] = np.clip(120 * total_glow[total_glow > 0.05] * 0.8, 0, 255).astype(np.uint8)
emit_mask[total_glow > 0.05, 2] = np.clip(40 * total_glow[total_glow > 0.05] * 0.5, 0, 255).astype(np.uint8)
emit_mask[total_glow > 0.05, 3] = 255

out_emit_path = r"d:\Keyboard stickman warrior\test_3d\valk_back_emission.png"
Image.fromarray(emit_mask).save(out_emit_path)
print(f"Saved completed back emission map to: {out_emit_path}")

print(">>> ALL BACK PBR TEXTURES GENERATED WITH 100% GAPLESS COVERAGE!")

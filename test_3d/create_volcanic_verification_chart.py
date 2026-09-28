import os
from PIL import Image, ImageDraw, ImageFont

out_dir = r"d:\Keyboard stickman warrior\test_3d"
artifact_dir = r"C:\Users\Dell\.gemini\antigravity\brain\c45e456a-99b8-4306-b141-a5009fe5cf21"

refs = [
    ("CONCEPT REF 1: FRONT VIEW", os.path.join(out_dir, "ref_volcanic_caldera_front.jpg")),
    ("CONCEPT REF 2: SIDE PERSPECTIVE", os.path.join(out_dir, "ref_volcanic_caldera_side.jpg")),
    ("CONCEPT REF 3: ISOMETRIC AERIAL", os.path.join(out_dir, "ref_volcanic_caldera_isometric.jpg")),
    ("CONCEPT REF 4: STRATOVOLCANO & BASALT", os.path.join(out_dir, "ref_volcanic_caldera_crater.jpg")),
]

renders = [
    ("BLENDER 3D: FRONT COMBAT VIEW", os.path.join(out_dir, "volcanic_caldera_render_front.png")),
    ("BLENDER 3D: LEFT PROFILE VIEW", os.path.join(out_dir, "volcanic_caldera_render_left_profile.png")),
    ("BLENDER 3D: ISOMETRIC AERIAL VIEW", os.path.join(out_dir, "volcanic_caldera_render_isometric_aerial.png")),
    ("BLENDER 3D: RIGHT PERSPECTIVE VIEW", os.path.join(out_dir, "volcanic_caldera_render_right_perspective.png")),
]

w_cell = 640
h_cell = 360
pad = 16
header_h = 90
label_h = 36

total_w = 4 * w_cell + 5 * pad
total_h = header_h + 2 * (h_cell + label_h) + 3 * pad

img_out = Image.new("RGB", (total_w, total_h), (22, 10, 8))
draw = ImageDraw.Draw(img_out)

try:
    font_title = ImageFont.truetype("arial.ttf", 34)
    font_sub = ImageFont.truetype("arial.ttf", 20)
    font_label = ImageFont.truetype("arial.ttf", 16)
except Exception:
    font_title = font_sub = font_label = ImageFont.load_default()

# Header banner
draw.rectangle([(0, 0), (total_w, header_h)], fill=(32, 12, 10))
draw.line([(0, header_h), (total_w, header_h)], fill=(255, 90, 20), width=3)
draw.text((pad * 2, 14), "KEYFURY 3D // ARENA #3: VOLCANIC CALDERA", fill=(255, 240, 230), font=font_title)
draw.text((pad * 2, 54), "100% Pure Procedural 3D Polygonal Geometry | Zero 2D Billboards | 360-Degree Surroundings Verification", fill=(255, 140, 40), font=font_sub)

# Row 1: References
y_row1 = header_h + pad
for i, (lbl, path) in enumerate(refs):
    x = pad + i * (w_cell + pad)
    draw.rectangle([(x, y_row1), (x + w_cell, y_row1 + label_h)], fill=(50, 18, 12))
    draw.text((x + 10, y_row1 + 8), lbl, fill=(255, 170, 100), font=font_label)
    if os.path.exists(path):
        cell_im = Image.open(path).convert("RGB")
        cell_im = cell_im.resize((w_cell, h_cell), Image.LANCZOS)
        img_out.paste(cell_im, (x, y_row1 + label_h))
        draw.rectangle([(x, y_row1 + label_h), (x + w_cell, y_row1 + label_h + h_cell)], outline=(180, 60, 20), width=2)

# Row 2: Renders
y_row2 = y_row1 + label_h + h_cell + pad
for i, (lbl, path) in enumerate(renders):
    x = pad + i * (w_cell + pad)
    draw.rectangle([(x, y_row2), (x + w_cell, y_row2 + label_h)], fill=(60, 28, 10))
    draw.text((x + 10, y_row2 + 8), lbl, fill=(255, 200, 80), font=font_label)
    if os.path.exists(path):
        cell_im = Image.open(path).convert("RGB")
        cell_im = cell_im.resize((w_cell, h_cell), Image.LANCZOS)
        img_out.paste(cell_im, (x, y_row2 + label_h))
        draw.rectangle([(x, y_row2 + label_h), (x + w_cell, y_row2 + label_h + h_cell)], outline=(240, 120, 20), width=2)

chart_out = os.path.join(out_dir, "keyfury_volcanic_caldera_full_3d_master_verification_chart.png")
img_out.save(chart_out, quality=95)
print(f"Chart saved to: {chart_out}")

# Sync to brain artifacts
artifact_chart = os.path.join(artifact_dir, "keyfury_volcanic_caldera_full_3d_master_verification_chart.png")
img_out.save(artifact_chart, quality=95)
print(f"Chart synced to artifacts: {artifact_chart}")

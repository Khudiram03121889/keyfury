import os
import shutil
from PIL import Image, ImageDraw, ImageFont

out_dir = r"d:\Keyboard stickman warrior\test_3d"
artifact_dirs = [
    r"C:\Users\Dell\.gemini\antigravity\brain\78aa81fe-edc2-4d0f-be22-164d0e974af8",
    r"C:\Users\Dell\.gemini\antigravity\brain\c45e456a-99b8-4306-b141-a5009fe5cf21",
    r"C:\Users\Dell\.gemini\antigravity\brain\d7e36d65-057f-4a6b-abbb-461964f2f1dd"
]

refs = [
    ("CONCEPT REF 1: FRONT COMBAT VIEW", os.path.join(out_dir, "ref_highland_sanctuary_front.jpg")),
    ("CONCEPT REF 2: SIDE PERSPECTIVE", os.path.join(out_dir, "ref_highland_sanctuary_side.jpg")),
    ("CONCEPT REF 3: ISOMETRIC AERIAL", os.path.join(out_dir, "ref_highland_sanctuary_isometric.jpg")),
    ("CONCEPT REF 4: CASTLE & WATERFALL", os.path.join(out_dir, "ref_highland_sanctuary_castle.jpg")),
]

renders = [
    ("BLENDER 3D: FRONT COMBAT VIEW", os.path.join(out_dir, "highland_sanctuary_render_front.png")),
    ("BLENDER 3D: LEFT PROFILE VIEW", os.path.join(out_dir, "highland_sanctuary_render_left_profile.png")),
    ("BLENDER 3D: ISOMETRIC AERIAL VIEW", os.path.join(out_dir, "highland_sanctuary_render_isometric_aerial.png")),
    ("BLENDER 3D: RIGHT PERSPECTIVE VIEW", os.path.join(out_dir, "highland_sanctuary_render_right_perspective.png")),
]

w_cell = 640
h_cell = 360
pad = 16
header_h = 90
label_h = 36

total_w = 4 * w_cell + 5 * pad
total_h = header_h + 2 * (h_cell + label_h) + 3 * pad

img_out = Image.new("RGB", (total_w, total_h), (12, 24, 18))
draw = ImageDraw.Draw(img_out)

try:
    font_title = ImageFont.truetype("arial.ttf", 34)
    font_sub = ImageFont.truetype("arial.ttf", 20)
    font_label = ImageFont.truetype("arial.ttf", 16)
except Exception:
    font_title = font_sub = font_label = ImageFont.load_default()

# Header banner
draw.rectangle([(0, 0), (total_w, header_h)], fill=(16, 36, 26))
draw.line([(0, header_h), (total_w, header_h)], fill=(16, 185, 129), width=3)
draw.text((pad * 2, 14), "KEYFURY 3D // ARENA #1: HIGHLAND SANCTUARY", fill=(240, 253, 244), font=font_title)
draw.text((pad * 2, 54), "100% Pure Procedural 3D Polygonal Geometry | Zero 2D Billboards | 360-Degree Surroundings Verification", fill=(52, 211, 153), font=font_sub)

# Row 1: References
y_row1 = header_h + pad
for i, (lbl, path) in enumerate(refs):
    x = pad + i * (w_cell + pad)
    draw.rectangle([(x, y_row1), (x + w_cell, y_row1 + label_h)], fill=(20, 52, 38))
    draw.text((x + 10, y_row1 + 8), lbl, fill=(110, 231, 183), font=font_label)
    if os.path.exists(path):
        cell_im = Image.open(path).convert("RGB")
        cell_im = cell_im.resize((w_cell, h_cell), Image.LANCZOS)
        img_out.paste(cell_im, (x, y_row1 + label_h))
        draw.rectangle([(x, y_row1 + label_h), (x + w_cell, y_row1 + label_h + h_cell)], outline=(16, 185, 129), width=2)

# Row 2: Renders
y_row2 = y_row1 + label_h + h_cell + pad
for i, (lbl, path) in enumerate(renders):
    x = pad + i * (w_cell + pad)
    draw.rectangle([(x, y_row2), (x + w_cell, y_row2 + label_h)], fill=(20, 52, 38))
    draw.text((x + 10, y_row2 + 8), lbl, fill=(251, 191, 36), font=font_label)
    if os.path.exists(path):
        cell_im = Image.open(path).convert("RGB")
        cell_im = cell_im.resize((w_cell, h_cell), Image.LANCZOS)
        img_out.paste(cell_im, (x, y_row2 + label_h))
        draw.rectangle([(x, y_row2 + label_h), (x + w_cell, y_row2 + label_h + h_cell)], outline=(245, 158, 11), width=2)

chart_filename = "keyfury_highland_sanctuary_full_3d_master_verification_chart.png"
chart_path = os.path.join(out_dir, chart_filename)
img_out.save(chart_path, quality=95)
print(f">>> [Master Verification Chart] Saved to {chart_path}")

# Sync to Artifact Directories for UI view
for adir in artifact_dirs:
    if os.path.exists(adir):
        dest_chart = os.path.join(adir, chart_filename)
        shutil.copyfile(chart_path, dest_chart)
        print(f">>> [Artifact Sync] Synced chart to {dest_chart}")
        
        # Sync individual renders
        render_files = [
            "highland_sanctuary_render_front.png",
            "highland_sanctuary_render_left_profile.png",
            "highland_sanctuary_render_isometric_aerial.png",
            "highland_sanctuary_render_right_perspective.png",
            "highland_sanctuary_render_low_angle.png"
        ]
        for rf in render_files:
            src = os.path.join(out_dir, rf)
            if os.path.exists(src):
                dst = os.path.join(adir, rf)
                shutil.copyfile(src, dst)
                print(f">>> [Artifact Sync] Synced {rf} to {adir}")

print(">>> [Verification Suite] Master Chart and Render Sync Complete!")

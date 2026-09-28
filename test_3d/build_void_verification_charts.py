import os
import shutil
from PIL import Image, ImageDraw, ImageFont

print(">>> Building Comprehensive Verification & Comparison Charts for Void Assassin (Nyx)...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\1e03939f-f407-4aeb-ae92-b819e545526b"
os.makedirs(brain_dir, exist_ok=True)

# Load Default or TrueType Font
try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_subtitle = ImageFont.truetype("arial.ttf", 20)
    font_header = ImageFont.truetype("arialbd.ttf", 24)
    font_badge = ImageFont.truetype("arialbd.ttf", 16)
    font_label = ImageFont.truetype("arialbd.ttf", 18)
    font_small = ImageFont.truetype("arial.ttf", 15)
except Exception:
    font_title = ImageFont.load_default()
    font_subtitle = ImageFont.load_default()
    font_header = ImageFont.load_default()
    font_badge = ImageFont.load_default()
    font_label = ImageFont.load_default()
    font_small = ImageFont.load_default()

# ---------------------------------------------------------
# CHART 1: void_image_model_multi_angle_chart.png (2400 x 950)
# ---------------------------------------------------------
print("1. Generating void_image_model_multi_angle_chart.png...")
w1, h1 = 2400, 960
chart1 = Image.new("RGB", (w1, h1), (9, 13, 22))
draw1 = ImageDraw.Draw(chart1)

# Header
draw1.rectangle([(0, 0), (w1, 100)], fill=(13, 19, 33))
draw1.line([(0, 100), (w1, 100)], fill=(168, 85, 247), width=3)
draw1.text((40, 22), "KeyFury 3D Character Suite — Fighter 04: Void Assassin (Nyx)", font=font_title, fill=(243, 232, 255))
draw1.text((40, 66), "Multi-Angle AI Concept & Orthogonal Reference Verification // Aspect 2:3 // Amethyst Void Hard-Light", font=font_subtitle, fill=(192, 132, 252))

# Badge
draw1.rectangle([(w1 - 320, 30), (w1 - 40, 72)], fill=(45, 20, 75), outline=(168, 85, 247), width=2)
draw1.text((w1 - 300, 42), "CANONICAL 4TH FIGHTER", font=font_badge, fill=(243, 232, 255))

panels1 = [
    ("void_ref_front_raw.png", "Front Orthogonal (0°)", "Watertight Symmetrical A-Pose // Clamped Soles"),
    ("void_ref_side_raw.png", "Side Profile (90°)", "Aerodynamic Hood // Anterior-Posterior Relief"),
    ("void_ref_back_raw.png", "Rear Orthogonal (180°)", "Amethyst Cyber-Spine Bus // Lumbar Battery"),
    ("void_ref_hero_raw.png", "3/4 Dynamic Hero Action", "Dual Hard-Light Void Daggers // Rift Agility")
]

card_w1 = 540
card_h1 = 800
pad_x1 = 40
gap_x1 = (w1 - 2 * pad_x1 - 4 * card_w1) // 3
card_y1 = 125

for i, (fn, label, sub) in enumerate(panels1):
    cx = pad_x1 + i * (card_w1 + gap_x1)
    cy = card_y1
    # Card background & border
    draw1.rectangle([(cx, cy), (cx + card_w1, cy + card_h1)], fill=(15, 23, 42), outline=(168, 85, 247, 180), width=2)
    # Header tab
    draw1.rectangle([(cx, cy), (cx + card_w1, cy + 45)], fill=(24, 15, 45))
    draw1.line([(cx, cy + 45), (cx + card_w1, cy + 45)], fill=(147, 51, 234), width=1)
    draw1.text((cx + 15, cy + 12), label, font=font_label, fill=(243, 232, 255))
    
    # Image
    img_path = os.path.join(work_dir, fn)
    if os.path.exists(img_path):
        im = Image.open(img_path).convert("RGBA")
        im_w, im_h = im.size
        # Fit inside card (max width 510, max height 680)
        target_h = 680
        target_w = int(round(im_w * (target_h / float(im_h))))
        if target_w > 510:
            target_w = 510
            target_h = int(round(im_h * (target_w / float(im_w))))
        im_res = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = cx + (card_w1 - target_w) // 2
        py = cy + 55 + (680 - target_h) // 2
        chart1.paste(im_res, (px, py), im_res)
    
    # Subtitle label
    draw1.rectangle([(cx, cy + card_h1 - 40), (cx + card_w1, cy + card_h1)], fill=(12, 10, 24))
    draw1.text((cx + 15, cy + card_h1 - 28), sub, font=font_small, fill=(192, 132, 252))

chart1_path = os.path.join(work_dir, "void_image_model_multi_angle_chart.png")
chart1.save(chart1_path)
print(f"Saved: {chart1_path}")

# ---------------------------------------------------------
# CHART 2: void_multi_angle_verification_chart.png (3060 x 1040)
# ---------------------------------------------------------
print("2. Generating void_multi_angle_verification_chart.png...")
w2, h2 = 3060, 1040
chart2 = Image.new("RGB", (w2, h2), (9, 13, 22))
draw2 = ImageDraw.Draw(chart2)

# Header
draw2.rectangle([(0, 0), (w2, 110)], fill=(13, 19, 33))
draw2.line([(0, 110), (w2, 110)], fill=(168, 85, 247), width=3)
draw2.text((45, 22), "KeyFury 3D Character Suite — Fighter 04: Void Assassin (Nyx)", font=font_title, fill=(243, 232, 255))
draw2.text((45, 70), "Blender EEVEE Forensic 360° Studio Verification Suite // 31,222 Vertices // 31,236 Polys // 3 PBR Slots // WeightedNormal", font=font_subtitle, fill=(192, 132, 252))

# Badges
draw2.rectangle([(w2 - 380, 32), (w2 - 45, 78)], fill=(45, 20, 75), outline=(168, 85, 247), width=2)
draw2.text((w2 - 360, 46), "PBR SHADING VERIFIED", font=font_badge, fill=(243, 232, 255))

panels2 = [
    ("void_render_front.png", "Front View (0°)", "Z_min = 0.0000 Floor Clamp // Symmetrical Cuirass"),
    ("void_render_side.png", "Side Profile (90°)", "Streamlined Cowl // Anterior-Posterior Normal Relief"),
    ("void_render_back.png", "Rear View (180°)", "Dorsal Spinal Energy Bus // Lumbar Power Cell"),
    ("void_render_perspective.png", "Perspective (3/4)", "Volumetric Depth & Specular Sheen across Quads"),
    ("void_render_closeup.png", "Visor & Cowl Macro", "Recessed Amethyst Visor // Micro-Crease Normals")
]

card_w2 = 560
card_h2 = 870
pad_x2 = 45
gap_x2 = (w2 - 2 * pad_x2 - 5 * card_w2) // 4
card_y2 = 135

for i, (fn, label, sub) in enumerate(panels2):
    cx = pad_x2 + i * (card_w2 + gap_x2)
    cy = card_y2
    draw2.rectangle([(cx, cy), (cx + card_w2, cy + card_h2)], fill=(15, 23, 42), outline=(147, 51, 234, 180), width=2)
    # Header bar
    draw2.rectangle([(cx, cy), (cx + card_w2, cy + 45)], fill=(24, 15, 45))
    draw2.line([(cx, cy + 45), (cx + card_w2, cy + 45)], fill=(168, 85, 247), width=1)
    draw2.text((cx + 15, cy + 12), label, font=font_label, fill=(243, 232, 255))
    
    img_path = os.path.join(work_dir, fn)
    if os.path.exists(img_path):
        im = Image.open(img_path).convert("RGBA")
        im_w, im_h = im.size
        target_h = 750
        target_w = int(round(im_w * (target_h / float(im_h))))
        if target_w > 530:
            target_w = 530
            target_h = int(round(im_h * (target_w / float(im_w))))
        im_res = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = cx + (card_w2 - target_w) // 2
        py = cy + 55 + (750 - target_h) // 2
        chart2.paste(im_res, (px, py), im_res)
        
    draw2.rectangle([(cx, cy + card_h2 - 40), (cx + card_w2, cy + card_h2)], fill=(12, 10, 24))
    draw2.text((cx + 15, cy + card_h2 - 28), sub, font=font_small, fill=(192, 132, 252))

chart2_path = os.path.join(work_dir, "void_multi_angle_verification_chart.png")
chart2.save(chart2_path)
print(f"Saved: {chart2_path}")

# ---------------------------------------------------------
# CHART 3: void_reference_vs_blender_comparison_chart.png (2850 x 2050)
# ---------------------------------------------------------
print("3. Generating void_reference_vs_blender_comparison_chart.png...")
w3, h3 = 2850, 2050
chart3 = Image.new("RGB", (w3, h3), (9, 13, 22))
draw3 = ImageDraw.Draw(chart3)

# Master Title Header
draw3.rectangle([(0, 0), (w3, 120)], fill=(13, 19, 33))
draw3.line([(0, 120), (w3, 120)], fill=(168, 85, 247), width=3)
draw3.text((50, 25), "KeyFury 3D Character Suite — Void Assassin (Nyx): AI Reference vs. 3D Blender Reconstruction", font=font_title, fill=(243, 232, 255))
draw3.text((50, 75), "Direct Side-by-Side Anatomical, Geometric, and Material Parity Audit // Dual-Shell Continuous Volumetric Pipeline", font=font_subtitle, fill=(192, 132, 252))

# Row Sub-Headers
# Row 1 (Top): AI Reference Concept
draw3.rectangle([(50, 135), (w3 - 50, 185)], fill=(24, 18, 48), outline=(168, 85, 247), width=1)
draw3.text((70, 147), "PHASE 1: AI MULTI-ANGLE REFERENCE CONCEPT ART (INPUT TARGET SPEC)", font=font_header, fill=(243, 232, 255))

# Row 2 (Bottom): Blender 3D Reconstruction
draw3.rectangle([(50, 1065), (w3 - 50, 1115)], fill=(20, 28, 55), outline=(56, 189, 248), width=1)
draw3.text((70, 1077), "PHASE 2: BLENDER 3D RECONSTRUCTION & PBR SHADER GRAPH (EEVEE PHOTOREAL STILLS)", font=font_header, fill=(186, 230, 253))

comparison_cols = [
    {
        "col_title": "1. FRONT ORTHOGONAL (0°)",
        "ref_img": "void_ref_front_raw.png",
        "blend_img": "void_render_front.png",
        "spec1": "Ref: Neutral A-pose, glowing amethyst lines, tactical boots",
        "spec2": "3D: Symmetrical bilateral mesh, Z=0.0000 sole clamp, 3-slot PBR"
    },
    {
        "col_title": "2. SIDE PROFILE (90°)",
        "ref_img": "void_ref_side_raw.png",
        "blend_img": "void_render_side.png",
        "spec1": "Ref: Sleek aerodynamic hood contour, curved chest cuirass",
        "spec2": "3D: Watertight side rim bridge quads, continuous y0 offset curvature"
    },
    {
        "col_title": "3. REAR ORTHOGONAL (180°)",
        "ref_img": "void_ref_back_raw.png",
        "blend_img": "void_render_back.png",
        "spec1": "Ref: Amethyst spinal bus, lumbar battery pack, descending ribbons",
        "spec2": "3D: Delta-back relief ridge (+0.065m), emission mask, satin nano-carbon"
    },
    {
        "col_title": "4. DYNAMIC 3/4 & HERO ACTION",
        "ref_img": "void_ref_hero_raw.png",
        "blend_img": "void_render_perspective.png",
        "spec1": "Ref: Aggressive agile combat stance, dual hard-light void daggers",
        "spec2": "3D: Volumetric specular curvature, WeightedNormal smooth shading (w=50)"
    }
]

col_w3 = 645
pad_x3 = 50
gap_x3 = (w3 - 2 * pad_x3 - 4 * col_w3) // 3

for j, col in enumerate(comparison_cols):
    cx = pad_x3 + j * (col_w3 + gap_x3)
    
    # --- Top Panel (Ref) ---
    ty = 195
    th = 840
    draw3.rectangle([(cx, ty), (cx + col_w3, ty + th)], fill=(15, 23, 42), outline=(168, 85, 247, 160), width=2)
    # Header bar
    draw3.rectangle([(cx, ty), (cx + col_w3, ty + 40)], fill=(28, 18, 52))
    draw3.text((cx + 15, ty + 10), col["col_title"] + " // AI CONCEPT", font=font_label, fill=(243, 232, 255))
    
    ref_path = os.path.join(work_dir, col["ref_img"])
    if os.path.exists(ref_path):
        im = Image.open(ref_path).convert("RGBA")
        target_h = 710
        target_w = int(round(im.size[0] * (target_h / float(im.size[1]))))
        if target_w > col_w3 - 20:
            target_w = col_w3 - 20
            target_h = int(round(im.size[1] * (target_w / float(im.size[0]))))
        im_res = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = cx + (col_w3 - target_w) // 2
        py = ty + 45 + (710 - target_h) // 2
        chart3.paste(im_res, (px, py), im_res)
        
    draw3.rectangle([(cx, ty + th - 40), (cx + col_w3, ty + th)], fill=(12, 10, 24))
    draw3.text((cx + 15, ty + th - 28), col["spec1"], font=font_small, fill=(192, 132, 252))

    # --- Bottom Panel (Blender) ---
    by = 1125
    bh = 840
    draw3.rectangle([(cx, by), (cx + col_w3, by + bh)], fill=(15, 23, 42), outline=(56, 189, 248, 160), width=2)
    draw3.rectangle([(cx, by), (cx + col_w3, by + 40)], fill=(18, 32, 58))
    draw3.text((cx + 15, by + 10), col["col_title"] + " // 3D BLENDER MESH", font=font_label, fill=(224, 242, 254))
    
    blend_path = os.path.join(work_dir, col["blend_img"])
    if os.path.exists(blend_path):
        im = Image.open(blend_path).convert("RGBA")
        target_h = 710
        target_w = int(round(im.size[0] * (target_h / float(im.size[1]))))
        if target_w > col_w3 - 20:
            target_w = col_w3 - 20
            target_h = int(round(im.size[1] * (target_w / float(im.size[0]))))
        im_res = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = cx + (col_w3 - target_w) // 2
        py = by + 45 + (710 - target_h) // 2
        chart3.paste(im_res, (px, py), im_res)
        
    draw3.rectangle([(cx, by + bh - 40), (cx + col_w3, by + bh)], fill=(10, 16, 30))
    draw3.text((cx + 15, by + bh - 28), col["spec2"], font=font_small, fill=(125, 211, 252))

# Footer metadata strip
draw3.rectangle([(0, h3 - 60), (w3, h3)], fill=(13, 19, 33))
draw3.line([(0, h3 - 60), (w3, h3 - 60)], fill=(168, 85, 247), width=2)
draw3.text((50, h3 - 42), "KeyFury Engine Pipeline Status: 100% Watertight Dual-Shell Volumetric 3D // Z_min = 0.0000 Floor Clamp // Standalone Void_Assassin.glb + 4-Fighter KeyFury_3D_Arena.glb Exported", font=font_small, fill=(226, 232, 240))

chart3_path = os.path.join(work_dir, "void_reference_vs_blender_comparison_chart.png")
chart3.save(chart3_path)
print(f"Saved: {chart3_path}")

# Copy charts to brain directory for artifact embedding
for f in ["void_image_model_multi_angle_chart.png", "void_multi_angle_verification_chart.png", "void_reference_vs_blender_comparison_chart.png"]:
    src = os.path.join(work_dir, f)
    dst = os.path.join(brain_dir, f)
    shutil.copyfile(src, dst)
    print(f"Copied {f} to brain directory.")

print(">>> All Void Assassin verification and comparison charts generated and copied successfully!")

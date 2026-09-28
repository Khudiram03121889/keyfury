"""
KeyFury 3D: Master Four Maps Comparison Chart Generator
Generates a side-by-side high-resolution comparison chart:
Original Concept Artwork vs. Full Live 3D Environment in Blender
"""

from PIL import Image, ImageDraw, ImageFont
import os

arenas = [
    {
        "id": "highland_sanctuary",
        "title": "HIGHLAND SANCTUARY",
        "specs": "Platform: Runic Stone Bridge (Z=0.0) | Ratio: 0.72 | Sun: Warm Alpine 5500K | Depth: 35m Alpine Vista",
        "ref": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\highland_sanctuary.jpg",
        "render": r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_HighlandSanctuary_Render.png",
    },
    {
        "id": "cyber_rooftop",
        "title": "CYBER NEON ROOFTOP",
        "specs": "Platform: Rain-Slicked Sky Deck (Z=0.0) | Ratio: 0.73 | Lights: Cyan & Magenta Dual-Tone | Depth: 35m Megacity Vista",
        "ref": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\cyber_rooftop.jpg",
        "render": r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CyberRooftop_Render.png",
    },
    {
        "id": "volcanic_caldera",
        "title": "VOLCANIC CALDERA",
        "specs": "Platform: Floating Obsidian Slab (Z=0.0) | Ratio: 0.62 | Lights: Magma Underglow 1200W | Depth: 35m Caldera Vista",
        "ref": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\volcanic_caldera.jpg",
        "render": r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_VolcanicCaldera_Render.png",
    },
    {
        "id": "celestial_void",
        "title": "CELESTIAL VOID SHRINE",
        "specs": "Platform: Marble Astral Dais (Z=0.0) | Ratio: 0.71 | Lights: Starlight & Arcane Circle Uplight | Depth: 35m Nebula Vista",
        "ref": r"d:\Keyboard stickman warrior\apps\web\src\assets\arenas\celestial_void.jpg",
        "render": r"d:\Keyboard stickman warrior\test_3d\KeyFury_3D_CelestialVoid_Render.png",
    },
]

# Chart dimensions
# 4 rows, each row has 2 images (960 x 540 each) + headers
row_w = 960 * 2 + 60  # 1980 px wide
header_h = 130
row_h = 540 + 70      # 610 px per arena
total_h = header_h + row_h * 4 + 40

canvas = Image.new("RGB", (row_w, total_h), (8, 12, 22))
draw = ImageDraw.Draw(canvas)

# Fonts
try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_sub = ImageFont.truetype("arial.ttf", 18)
    font_arena = ImageFont.truetype("arialbd.ttf", 24)
    font_badge = ImageFont.truetype("arialbd.ttf", 16)
    font_specs = ImageFont.truetype("arial.ttf", 15)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_arena = ImageFont.load_default()
    font_badge = ImageFont.load_default()
    font_specs = ImageFont.load_default()

# Main Title Header
draw.text((30, 24), "KEYFURY 3D: FULL LIVE 3D ENVIRONMENTS VS. ORIGINAL ARTWORK", fill=(0, 240, 255), font=font_title)
draw.text((30, 72), "100% Genuine 3D Stages (Z = 0.0) in Blender 5.2.1 LTS // Calibrated Combat Cameras // Dynamic Shadows & Lighting", fill=(160, 175, 200), font=font_sub)
draw.line([(30, 110), (row_w - 30, 110)], fill=(30, 50, 80), width=2)

y_cursor = header_h

for arena in arenas:
    # Arena Title Bar
    draw.rectangle([(30, y_cursor), (row_w - 30, y_cursor + 38)], fill=(15, 23, 42))
    draw.text((45, y_cursor + 6), arena["title"], fill=(255, 255, 255), font=font_arena)
    draw.text((400, y_cursor + 10), arena["specs"], fill=(148, 163, 184), font=font_specs)
    
    img_y = y_cursor + 48
    
    # Load and resize reference
    if os.path.exists(arena["ref"]):
        ref_img = Image.open(arena["ref"]).convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
        canvas.paste(ref_img, (30, img_y))
    # Badge for Ref
    draw.rectangle([(40, img_y + 12), (320, img_y + 40)], fill=(0, 0, 0, 200))
    draw.text((48, img_y + 16), "ORIGINAL 2D CONCEPT ARTWORK", fill=(255, 200, 50), font=font_badge)
    
    # Load and resize render
    if os.path.exists(arena["render"]):
        rnd_img = Image.open(arena["render"]).convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
        canvas.paste(rnd_img, (30 + 960 + 10, img_y))
    # Badge for Render
    draw.rectangle([(30 + 960 + 20, img_y + 12), (30 + 960 + 380, img_y + 40)], fill=(0, 0, 0, 200))
    draw.text((30 + 960 + 28, img_y + 16), "BLENDER 5.2.1 FULL 3D ENVIRONMENT", fill=(0, 240, 255), font=font_badge)
    
    y_cursor += row_h

out_chart = r"d:\Keyboard stickman warrior\test_3d\keyfury_four_maps_image_vs_blender_comparison.png"
canvas.save(out_chart, quality=95)
print(f">>> [Master Chart] Saved 4-Arena Master Comparison Chart: {out_chart}")

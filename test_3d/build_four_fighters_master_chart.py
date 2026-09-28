import os
import shutil
from PIL import Image, ImageDraw, ImageFont

print(">>> Building 4-Fighter Complete Master Roster Chart...")

work_dir = r"d:\Keyboard stickman warrior\test_3d"
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\1e03939f-f407-4aeb-ae92-b819e545526b"
os.makedirs(brain_dir, exist_ok=True)

try:
    font_title = ImageFont.truetype("arialbd.ttf", 36)
    font_subtitle = ImageFont.truetype("arial.ttf", 20)
    font_header = ImageFont.truetype("arialbd.ttf", 24)
    font_label = ImageFont.truetype("arialbd.ttf", 18)
    font_badge = ImageFont.truetype("arialbd.ttf", 15)
    font_small = ImageFont.truetype("arial.ttf", 14)
except Exception:
    font_title = ImageFont.load_default()
    font_subtitle = ImageFont.load_default()
    font_header = ImageFont.load_default()
    font_label = ImageFont.load_default()
    font_badge = ImageFont.load_default()
    font_small = ImageFont.load_default()

w, h = 2560, 1600
chart = Image.new("RGB", (w, h), (7, 10, 19))
draw = ImageDraw.Draw(chart)

# Master Header
draw.rectangle([(0, 0), (w, 120)], fill=(12, 17, 30))
draw.line([(0, 120), (w, 120)], fill=(0, 240, 255), width=3)
draw.text((45, 24), "KEYFURY 3D // 4-FIGHTER CYBER MARTIAL ARTS COMPLETE ROSTER", font=font_title, fill=(241, 245, 249))
draw.text((45, 72), "Continuous Dual-Shell Volumetric PBR Pipeline // Three.js WebGL & Blender EEVEE Engine Integration", font=font_subtitle, fill=(148, 163, 184))

# Arena Banner (Top Half, centered)
arena_w = 2100
arena_h = 620
arena_x = (w - arena_w) // 2
arena_y = 145

combat_img_path = os.path.join(work_dir, "web_view_combat.png")
if os.path.exists(combat_img_path):
    c_im = Image.open(combat_img_path).convert("RGBA")
    # Clean crop excluding HUD header and bottom buttons: y from 95 to 645
    c_cropped = c_im.crop((50, 95, 1230, 645))
    c_res = c_cropped.resize((arena_w, arena_h), Image.Resampling.LANCZOS)
    chart.paste(c_res, (arena_x, arena_y), c_res)

draw.rectangle([(arena_x, arena_y), (arena_x + arena_w, arena_y + arena_h)], outline=(56, 189, 248), width=2)
# Arena label tag
draw.rectangle([(arena_x + 20, arena_y + 20), (arena_x + 480, arena_y + 60)], fill=(15, 23, 42), outline=(0, 240, 255), width=1)
draw.text((arena_x + 35, arena_y + 30), "WEBGL 4-FIGHTER ROOFTOP ARENA RUNTIME", font=font_badge, fill=(56, 189, 248))

# Fighters Row (Bottom Half)
fighters = [
    {
        "name": "FIGHTER 01: SHADOW RONIN",
        "codename": "Kage // Azure Plasma Katana",
        "color": (56, 189, 248),
        "img": "web_view_ronin_front.png",
        "stats": "Speed 9 // Power 7 // Def 6 // Combo 8"
    },
    {
        "name": "FIGHTER 02: CYBER VALKYRIE",
        "codename": "Freya // Vanguard Exo-Brawler",
        "color": (239, 68, 68),
        "img": "web_view_valk_front.png",
        "stats": "Speed 5 // Power 10 // Def 9 // Combo 6"
    },
    {
        "name": "FIGHTER 03: VOLT SHINOBI",
        "codename": "Raijin // Lightning Rushdown Ninja",
        "color": (245, 158, 11),
        "img": "web_view_shinobi_front.png",
        "stats": "Speed 10 // Power 6 // Def 5 // Combo 9"
    },
    {
        "name": "FIGHTER 04: VOID ASSASSIN",
        "codename": "Nyx // Shadow Stealth Stalker",
        "color": (168, 85, 247),
        "img": "web_view_void_front.png",
        "stats": "Speed 8 // Power 8 // Def 5 // Combo 9"
    }
]

card_w = 580
card_h = 740
pad_x = (w - (4 * card_w + 3 * 30)) // 2
card_y = 800

for idx, f in enumerate(fighters):
    cx = pad_x + idx * (card_w + 30)
    cy = card_y
    # Card outline & background
    draw.rectangle([(cx, cy), (cx + card_w, cy + card_h)], fill=(15, 23, 42), outline=f["color"], width=2)
    # Header strip
    draw.rectangle([(cx, cy), (cx + card_w, cy + 50)], fill=(20, 30, 50))
    draw.line([(cx, cy + 50), (cx + card_w, cy + 50)], fill=f["color"], width=1)
    draw.text((cx + 15, cy + 14), f["name"], font=font_label, fill=f["color"])
    
    # Hero Full-Body Portrait (Crop cleanly without HUD header & buttons, center on character)
    f_path = os.path.join(work_dir, f["img"])
    if os.path.exists(f_path):
        fim = Image.open(f_path).convert("RGBA")
        # Crop 480px width centered at 640 (400 to 880), y from 95 to 645 (550px)
        cropped = fim.crop((400, 95, 880, 645))
        target_h = 600
        target_w = int(round(cropped.size[0] * (target_h / float(cropped.size[1]))))
        f_res = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
        px = cx + (card_w - target_w) // 2
        py = cy + 55 + (620 - target_h) // 2
        chart.paste(f_res, (px, py), f_res)
        
    # Subtitle & stats
    draw.rectangle([(cx, cy + card_h - 55), (cx + card_w, cy + card_h)], fill=(10, 16, 28))
    draw.text((cx + 15, cy + card_h - 48), f["codename"], font=font_badge, fill=(241, 245, 249))
    draw.text((cx + 15, cy + card_h - 26), f["stats"], font=font_small, fill=(148, 163, 184))

out_path = os.path.join(work_dir, "keyfury_four_fighters_master_roster_chart.png")
chart.save(out_path)
print(f"Saved: {out_path}")

shutil.copyfile(out_path, os.path.join(brain_dir, "keyfury_four_fighters_master_roster_chart.png"))
print("Copied to brain directory.")

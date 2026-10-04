import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def generate_og_image():
    src_path = "test_3d/KeyFury_3D_Arena_Render_Perfected.png"
    dest_path = "apps/web/public/og-image.png"

    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source image not found: {src_path}")

    # Open source image
    src = Image.open(src_path).convert("RGBA")
    src_w, src_h = src.size

    # Target dimensions: 1200 x 630
    target_w, target_h = 1200, 630

    # Scale to fill target width
    scale = target_w / src_w
    scaled_h = int(src_h * scale) # 675
    resized = src.resize((target_w, scaled_h), Image.Resampling.LANCZOS)

    # Crop to 630 - crop slightly more from top so fighters & glowing floor stay centered
    top_crop = 25
    bottom_crop = top_crop + target_h
    cropped = resized.crop((0, top_crop, target_w, bottom_crop))

    # Create overlay for gradient shading
    overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)

    # Top gradient (height 140)
    for y in range(140):
        alpha = int(180 * (1.0 - (y / 140.0) ** 1.3))
        draw_ov.line([(0, y), (target_w, y)], fill=(10, 15, 30, alpha))

    # Bottom gradient (height 110)
    for y in range(target_h - 110, target_h):
        dist = y - (target_h - 110)
        alpha = int(210 * ((dist / 110.0) ** 1.2))
        draw_ov.line([(0, y), (target_w, y)], fill=(10, 15, 30, alpha))

    # Composite overlay onto cropped image
    composed = Image.alpha_composite(cropped, overlay)
    draw = ImageDraw.Draw(composed)

    # Fonts
    font_bold = "C:/Windows/Fonts/arialbd.ttf"
    font_reg = "C:/Windows/Fonts/arial.ttf"

    font_title = ImageFont.truetype(font_bold, 54)
    font_sub = ImageFont.truetype(font_bold, 22)
    font_bottom = ImageFont.truetype(font_bold, 18)
    font_badge = ImageFont.truetype(font_bold, 15)

    # Draw top-left Badge: "NEXT-GEN 3D WEBGL"
    badge_text = "NEXT-GEN 3D WEBGL COMBAT"
    b_x, b_y = 50, 32
    # Badge background
    draw.rounded_rectangle([b_x - 12, b_y - 6, b_x + 280, b_y + 24], radius=8, fill=(15, 23, 42, 220), outline=(56, 189, 248, 200), width=1)
    draw.text((b_x, b_y - 2), badge_text, font=font_badge, fill=(56, 189, 248, 255))

    # Draw Title: "KEY" in White, "FURY" in Cyan (#38bdf8)
    t_x, t_y = 50, 64
    draw.text((t_x, t_y), "KEY", font=font_title, fill=(255, 255, 255, 255))
    key_bbox = draw.textbbox((t_x, t_y), "KEY", font=font_title)
    fury_x = key_bbox[2] + 4
    draw.text((fury_x, t_y), "FURY", font=font_title, fill=(56, 189, 248, 255))

    # Subtitle: "3D TYPING FIGHTING GAME"
    sub_x, sub_y = fury_x + 160, t_y + 24
    draw.text((sub_x, sub_y), "•  3D TYPING FIGHTING GAME", font=font_sub, fill=(226, 232, 240, 240))

    # Bottom Banner Bar
    # Neon cyan line
    draw.line([(50, target_h - 52), (target_w - 50, target_h - 52)], fill=(56, 189, 248, 140), width=1)

    bottom_text_left = "4 CHAMPIONS • 4 ARENAS • 200 HP DUELS • 1v1 REAL-TIME MULTIPLAYER"
    bottom_text_right = "PLAY FREE AT KEYFURY.IN"
    draw.text((50, target_h - 40), bottom_text_left, font=font_bottom, fill=(148, 163, 184, 255))

    right_bbox = draw.textbbox((0, 0), bottom_text_right, font=font_bottom)
    rw = right_bbox[2] - right_bbox[0]
    draw.text((target_w - 50 - rw, target_h - 40), bottom_text_right, font=font_bottom, fill=(56, 189, 248, 255))

    # Save final image
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    composed.convert("RGB").save(dest_path, "PNG", optimize=True)
    print(f"Generated {dest_path} ({target_w}x{target_h}) successfully.")

if __name__ == "__main__":
    generate_og_image()

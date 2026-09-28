import os
import math
from PIL import Image, ImageDraw, ImageFilter

backup = r'D:\Keyboard_stickman_warrior_backup_20260926_precleanup\test_3d'

themes = {
    'shadow_ronin': {
        'glow': (2, 132, 199),     # #0284c7
        'accent': (56, 189, 248),  # #38bdf8
        'front': 'ronin_render_front.png',
        'crop': (518, 106, 680)    # cx, top, box_size
    },
    'cyber_valkyrie': {
        'glow': (225, 29, 72),     # #e11d48
        'accent': (251, 113, 133), # #fb7185
        'front': 'valk_clean_front.png',
        'crop': (512, 120, 680)
    },
    'volt_shinobi': {
        'glow': (217, 119, 6),     # #d97706
        'accent': (251, 191, 36),  # #fbbf24
        'front': 'shinobi_render_front.png',
        'crop': (512, 246, 680)
    },
    'void_assassin': {
        'glow': (124, 58, 237),    # #7c3aed
        'accent': (192, 132, 252), # #c084fc
        'front': 'void_render_front.png',
        'crop': (512, 246, 680)
    }
}

out_dir = r'apps\web\src\assets\characters'
os.makedirs(out_dir, exist_ok=True)

for name, cfg in themes.items():
    src_path = os.path.join(backup, cfg['front'])
    im_src = Image.open(src_path).convert('RGBA')
    
    cx, top, box_size = cfg['crop']
    crop_top = max(0, top - 30)
    crop_bottom = crop_top + box_size
    crop_left = cx - box_size // 2
    crop_right = crop_left + box_size
    
    cropped = im_src.crop((crop_left, crop_top, crop_right, crop_bottom))
    cropped = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Create dark tech background with smooth radial glow
    bg = Image.new('RGBA', (512, 512), (9, 14, 24, 255))
    glow_layer = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw_glow = ImageDraw.Draw(glow_layer)
    
    # Smooth radial glow centered behind character head/chest
    gr, gg, gb = cfg['glow']
    center = (256, 210)
    for r in range(250, 0, -4):
        # Cosine smooth falloff
        t = r / 250.0
        alpha = int(110 * (0.5 * (1.0 + math.cos(math.pi * t))))
        draw_glow.ellipse(
            [center[0] - r, center[1] - r, center[0] + r, center[1] + r],
            fill=(gr, gg, gb, alpha)
        )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(16))
    
    # Subtle dark corner vignette (smooth circular)
    vignette = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    draw_vignette = ImageDraw.Draw(vignette)
    for r in range(360, 180, -6):
        t = (r - 180) / 180.0
        v_alpha = int(140 * t)
        draw_vignette.ellipse([256 - r, 256 - r, 256 + r, 256 + r], outline=(4, 7, 13, v_alpha), width=6)
    vignette = vignette.filter(ImageFilter.GaussianBlur(12))
    
    # Composite
    bg.paste(glow_layer, (0, 0), glow_layer)
    bg.paste(vignette, (0, 0), vignette)
    bg.paste(cropped, (0, 0), cropped)
    
    filename = name.replace('_', '-') + '-3d.png'
    out_file = os.path.join(out_dir, filename)
    bg.save(out_file, 'PNG')
    print(f'Generated 3D Portrait: {out_file} (512x512, {os.path.getsize(out_file)} bytes)')

# KeyFury Arena Maps: Image Model Generation Specifications

This document defines the exact reverse-engineered prompt architecture, geometric constraints, color theory, and lighting models used to generate the four combat arenas in KeyFury with modern AI image models (e.g. Imagen 3, Stable Diffusion XL, Midjourney v6).

---

## Global Stage Constraints & Rules

1. **Aspect Ratio & Framing**:
   - **Ratio**: `16:9` widescreen (e.g., 1920x1080 or 1536x864).
   - **Perspective**: Side-scrolling 2D/2.5D fighting game arena backdrop (Street Fighter 6 / Guilty Gear Strive stage framing).
   - **Camera Elevation**: Eye-level or slight low-angle looking across the fighting terrace.
   - **Ground Line Discipline**: A continuous, uninterrupted horizontal combat platform must span from screen-left to screen-right at an exact vertical ratio from the top:
     - `highland_sanctuary`: `0.72` platform ratio (72% from top, 28% from bottom)
     - `cyber_rooftop`: `0.73` platform ratio
     - `volcanic_caldera`: `0.62` platform ratio
     - `celestial_void`: `0.71` platform ratio
   - **No Foreground Obstructions**: No objects or characters blocking the center duel lane between fighters.

2. **Stylistic Consistency**:
   - High-end anime cinematic fighting game environment art, clean line work, vibrant cell-shaded textures with realistic physical lighting (PBR accents, specular highlights, volumetric haze).

---

## Map 1: Highland Sanctuary (`highland_sanctuary`)

### Lore & Theme
- **Title**: Highland Sanctuary (Ancient Runic Plateau)
- **Tagline**: *"Where wind whispers ancient forgotten duels."*
- **Description**: A sacred high-altitude stone battle terrace carved with glowing ancient runes, overlooking verdant rolling highlands, crystal alpine lakes, and snow-capped peaks.

### Master Generation Prompt
```text
Side-scrolling 2.5D fighting game arena stage, wide-angle 16:9 battle terrace, Highland Sanctuary. In the foreground, a massive ancient stone bridge battle platform spans horizontally across the lower third with ancient carved Celtic and Nordic runes glowing soft golden amber along the stone borders, weathered cracked stone pavers with patches of green moss and clover. Low stone parapets and decorative carved stone pillars on both sides. In the vast panoramic background: lush rolling green alpine highlands, pine forest valleys, a serene winding river feeding into a crystalline blue alpine mountain lake, a distant medieval stone castle fortress perched on a misty ridge, cascading waterfalls down rugged mountain cliffs. Giant snow-capped jagged alpine mountain peak under a bright daytime sun with soft cloud wisps, vivid blue sky with cumulus clouds, god rays. Cinematic anime fighting game background art, crisp outlines, vibrant colors, Guilty Gear Strive anime stage aesthetic, studio quality, 8k resolution, ultra-detailed, no characters on stage.
```

### Negative Prompt
```text
characters, people, warriors, blurry, low resolution, skewed horizon, tilted platform, obstructed combat line, modern buildings, neon signs, text watermarks, distorted geometry.
```

### Calibration Metrics
- **Platform Ratio**: `0.72`
- **Lighting Mood**: `daylight`
- **Primary Color**: `#10b981` (Emerald)
- **Secondary Color**: `#059669` (Moss)
- **Accent Color**: `#34d399` (Mint) / `#fbbf24` (Runic Gold)

---

## Map 2: Cyber Neon Rooftop (`cyber_rooftop`)

### Lore & Theme
- **Title**: Cyber Neon Rooftop (Neo-Kyoto Sky Deck)
- **Tagline**: *"High above the neon mist, where milliseconds decide fate."*
- **Description**: A rain-slicked reinforced helicopter pad and server terrace atop an 80-story megacorp spire, ringed by pulsing holographic billboards and flying sky-traffic.

### Master Generation Prompt
```text
Side-scrolling 2.5D fighting game battle arena stage, 16:9 wide shot, Cyber Neon Rooftop in Neo-Kyoto. In the foreground, a rain-slicked wet dark metallic helicopter pad and combat deck spanning horizontally across the lower third, with glowing electric cyan neon outer edge trim and hot pink magenta neon interior circuit boundaries, industrial hazard metal grates, glossy wet puddles reflecting the neon city lights. Low industrial safety railings with glowing cyan horizontal bars. Heavy electronic power server boxes with glowing digital display panels, satellite dishes, antenna arrays, and thick cables snaking along the deck flanks. In the background: sprawling vertical cyberpunk megalopolis at night, hundreds of towering neon-lit skyscrapers and mega-corporate spires piercing dark rainy clouds, glowing holographic billboards with Japanese kanji ("NEO-KYOTO", "CYBER ARCADE", "NEON DRAGON", "RAMEN 2049"), streaming flying hovercars with neon light trails zooming between buildings. Cyberpunk anime fighting game aesthetic, Blade Runner 2049 meets Guilty Gear, high contrast, vivid volumetric fog, photorealistic neon bloom, 8k, no characters.
```

### Negative Prompt
```text
fighters, people, daytime, sun, rustic nature, low resolution, tilted horizon, messy geometry, oversaturated washed out colors, signature, watermark.
```

### Calibration Metrics
- **Platform Ratio**: `0.73`
- **Lighting Mood**: `neon_night`
- **Primary Color**: `#38bdf8` (Electric Cyan)
- **Secondary Color**: `#0284c7` (Deep Sky)
- **Accent Color**: `#ec4899` (Hot Magenta)

---

## Map 3: Volcanic Caldera (`volcanic_caldera`)

### Lore & Theme
- **Title**: Volcanic Caldera (Infernal Magma Forge)
- **Tagline**: *"Forged in raw heat, tempered by relentless fury."*
- **Description**: A massive chunk of floating obsidian rock suspended over a raging subterranean river of molten lava, shrouded in ember storms and smoke pluming from active volcanic peaks.

### Master Generation Prompt
```text
Side-scrolling 2.5D fighting game battle stage, wide 16:9 combat framing, Volcanic Caldera. In the foreground, a massive monolithic slab of dark cracked obsidian rock floating horizontally across the lower third over a lake of boiling molten magma, glowing fiery red and orange lava veins pulsing through surface fissures on the rock platform. Rough jagged underside of the rock slab with dripping streams of liquid lava pouring downwards into the fire pit. In the background: an apocalyptic subterranean volcanic hellscape, active erupting volcanic peaks shooting geysers of fire and towering black billowing smoke columns into a crimson ash-filled sky, massive cascading lava waterfalls pouring down jagged black volcanic cliffs, glowing rivers of magma crisscrossing the caldera floor, flying embers and fiery volcanic bombs trailing smoke in the air. Hellish anime fighting game stage art, high contrast fiery orange and deep charcoal black, dramatic underlighting and heat distortion, 8k resolution, immaculate detail, no fighters.
```

### Negative Prompt
```text
characters, stickmen, warriors, green foliage, ice, water, modern structures, daylight, blurry, poor contrast, watermark, off-center platform.
```

### Calibration Metrics
- **Platform Ratio**: `0.62`
- **Lighting Mood**: `infernal`
- **Primary Color**: `#ef4444` (Magma Red)
- **Secondary Color**: `#dc2626` (Molten Crimson)
- **Accent Color**: `#f97316` (Fiery Orange) / `#fbbf24` (Incandescent Yellow)

---

## Map 4: Celestial Void Shrine (`celestial_void`)

### Lore & Theme
- **Title**: Celestial Void Shrine (Astral Moonlit Temple)
- **Tagline**: *"Beneath the shattered moon, eternity unfolds."*
- **Description**: A mystical temple plaza carved from astral marble and dark amethyst crystals, floating weightlessly inside a deep cosmos nebula where luminous cherry blossoms drift in zero gravity.

### Master Generation Prompt
```text
Side-scrolling 2.5D fighting game stage, 16:9 panoramic battle framing, Celestial Void Shrine. In the foreground, an ornate floating astral white and purple marble temple platform spanning horizontally across the lower third, glowing neon purple edge trims, polished marble tiles inscribed with three glowing arcane summoning circles (concentric magic seals with mystic glyphs in glowing violet and cyan light). Carved marble balustrades with baluster railings and classical stone pedestal lanterns emitting warm golden light. A grand central stone staircase leading downwards, and curved stone stairs on the side. In the midground: an elevated shrine terrace with a magnificent classical archway portal supported by fluted marble columns carved with glowing runes, floating zero-gravity island rocks with giant glowing purple amethyst crystal formations, a floating miniature island with a blossoming pink cherry blossom tree shedding glowing petals into space. In the deep background: an awe-inspiring deep space cosmos nebula with swirling violet and deep indigo galaxy clouds, spiral galaxies, sparkling starlight, and a gigantic glowing crescent moon dominating the celestial sky. Mystical cosmic anime fighting game stage, ethereal atmosphere, soft bloom, 8k resolution, masterwork, no characters.
```

### Negative Prompt
```text
characters, people, earth cities, cars, dirty textures, muddy colors, sun, daytime, low resolution, tilted horizon, watermark, logo.
```

### Calibration Metrics
- **Platform Ratio**: `0.71`
- **Lighting Mood**: `astral`
- **Primary Color**: `#a855f7` (Cosmic Purple)
- **Secondary Color**: `#7c3aed` (Deep Violet)
- **Accent Color**: `#c084fc` (Astral Lavender) / `#38bdf8` (Cyan Star Glow)

import { soundManager } from '../audio/SoundManager';
import { getRankTier } from '../components/ranked/RankBadge';

export interface MatchCardAchievement {
  id: string;
  title: string;
  icon: string;
  description?: string;
}

export interface MatchCardData {
  playerName: string;
  playerAvatarUrl?: string;
  playerTier?: string;
  playerMmr?: number;
  mmrDelta?: number;
  opponentName: string;
  opponentAvatarUrl?: string;
  isWinner: boolean;
  wpm: number;
  accuracy: number;
  maxCombo: number;
  finalHealth: number;
  wordsCompleted: number;
  unlockedAchievements?: MatchCardAchievement[];
  matchId?: string;
  joinedAt?: string;
}

function getTierRange(rating: number): { min: number; max: number; nextTier: string } {
  if (rating >= 3200) return { min: 3200, max: 4000, nextTier: 'Grandmaster (Max)' };
  if (rating >= 2800) return { min: 2800, max: 3200, nextTier: 'Grandmaster' };
  if (rating >= 2400) return { min: 2400, max: 2800, nextTier: 'Master' };
  if (rating >= 2000) return { min: 2000, max: 2400, nextTier: 'Diamond' };
  if (rating >= 1600) return { min: 1600, max: 2000, nextTier: 'Platinum' };
  if (rating >= 1200) return { min: 1200, max: 1600, nextTier: 'Gold' };
  return { min: 0, max: 1200, nextTier: 'Silver' };
}

/**
 * Helper to draw a futuristic chamfered (angled-corners) polygon.
 */
function drawChamferedRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number = 14
) {
  c.beginPath();
  c.moveTo(x + cut, y);
  c.lineTo(x + w - cut, y);
  c.lineTo(x + w, y + cut);
  c.lineTo(x + w, y + h - cut);
  c.lineTo(x + w - cut, y + h);
  c.lineTo(x + cut, y + h);
  c.lineTo(x, y + h - cut);
  c.lineTo(x, y + cut);
  if (c.closePath) c.closePath();
}

/**
 * Helper to draw a geometric 6-sided hexagon.
 */
function drawHexagon(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  if (c.closePath) c.closePath();
}

/**
 * Draws an energetic lightning bolt arc for the KeyFury thunderstorm theme.
 */
function drawLightningArc(
  c: CanvasRenderingContext2D,
  points: [number, number][],
  strokeColor: string,
  glowColor: string,
  width: number = 2
) {
  if (points.length < 2) return;
  c.save();
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    c.lineTo(points[i][0], points[i][1]);
  }
  c.strokeStyle = strokeColor;
  c.lineWidth = width;
  c.shadowColor = glowColor;
  c.shadowBlur = 12;
  c.stroke();
  c.restore();
}

/**
 * 100% Programmatic HTML5 Canvas generator for the KeyFury 1:1 Square Result Card (1080x1080).
 * Every panel, chamfered plaque, neon glow, circuit line, hexagon, stat box, and typography
 * is rendered purely through code with mathematical alignment, balanced spacing, and zero raster overlap.
 */
export async function generateMatchCardBlob(data: MatchCardData): Promise<{ blob: Blob; filename: string }> {
  // Ensure document fonts (Outfit, JetBrains Mono) are completely loaded
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_e) {}
  }

  // Pure 1:1 Square Aspect Ratio (1080 x 1080)
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;

  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (typeof Image === 'undefined' || !src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const isWinner = data.isWinner;
  const playerMmr = data.playerMmr ?? 1000;
  const playerTier = data.playerTier || getRankTier(playerMmr);
  const mmrDelta = data.mmrDelta ?? (isWinner ? 24 : -16);
  const deltaStr = mmrDelta >= 0 ? `+${mmrDelta}` : `${mmrDelta}`;
  const cpmVal = Math.round(data.wpm * 5);
  const matchIdStr = data.matchId || `KF-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = data.joinedAt
    ? new Date(data.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  // Load avatar and logo assets in parallel
  const [logoImg, playerAvatarImg, oppAvatarImg] = await Promise.all([
    loadImage('/logo.jpg'),
    loadImage(data.playerAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.playerName)}`),
    loadImage(data.opponentAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.opponentName)}`)
  ]);

  const cyanNeon = '#38bdf8';
  const accentColor = isWinner ? '#34d399' : '#f43f5e';
  const accentGlow = isWinner ? 'rgba(52, 211, 153, 0.7)' : 'rgba(244, 63, 94, 0.7)';
  const accentDim = isWinner ? 'rgba(52, 211, 153, 0.14)' : 'rgba(244, 63, 94, 0.14)';
  const electricGold = '#f59e0b';

  // =========================================================================
  // 1. DEEP OBSIDIAN CYBERPUNK BACKGROUND & AMBIENT RADIAL GLOWS
  // =========================================================================
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#02050e');
  bg.addColorStop(0.3, '#070f22');
  bg.addColorStop(0.7, '#040916');
  bg.addColorStop(1, '#010308');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  // Background Circuit Grid Lines (48px spacing)
  c.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  c.lineWidth = 1.2;
  for (let x = 0; x <= W; x += 48) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y <= H; y += 48) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }

  // Radial Lighting: Top Cyan Ambient Atmospheric Glow
  const topGlow = c.createRadialGradient(W / 2, 130, 0, W / 2, 130, 420);
  topGlow.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
  topGlow.addColorStop(1, 'transparent');
  c.fillStyle = topGlow;
  c.fillRect(0, 0, W, 420);

  // Radial Lighting: Hero Outcome Accent Glow
  const heroGlow = c.createRadialGradient(W / 2, 220, 0, W / 2, 220, 360);
  heroGlow.addColorStop(0, accentDim);
  heroGlow.addColorStop(1, 'transparent');
  c.fillStyle = heroGlow;
  c.fillRect(0, 100, W, 400);

  // =========================================================================
  // 2. VECTOR CIRCUIT BOARD TRACKS & JUNCTION PINS
  // =========================================================================
  c.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  c.lineWidth = 1.5;

  // Top-Left Circuit Traces
  c.beginPath();
  c.moveTo(40, 75); c.lineTo(110, 75); c.lineTo(150, 115); c.lineTo(200, 115);
  c.stroke();
  c.fillStyle = cyanNeon;
  c.beginPath(); c.arc(200, 115, 3.5, 0, Math.PI * 2); c.fill();

  // Top-Right Circuit Traces
  c.beginPath();
  c.moveTo(W - 40, 75); c.lineTo(W - 110, 75); c.lineTo(W - 150, 115); c.lineTo(W - 200, 115);
  c.stroke();
  c.beginPath(); c.arc(W - 200, 115, 3.5, 0, Math.PI * 2); c.fill();

  // Bottom-Left Circuit Traces
  c.beginPath();
  c.moveTo(40, H - 75); c.lineTo(110, H - 75); c.lineTo(150, H - 115); c.lineTo(200, H - 115);
  c.stroke();
  c.beginPath(); c.arc(200, H - 115, 3.5, 0, Math.PI * 2); c.fill();

  // Bottom-Right Circuit Traces
  c.beginPath();
  c.moveTo(W - 40, H - 75); c.lineTo(W - 110, H - 75); c.lineTo(W - 150, H - 115); c.lineTo(W - 200, H - 115);
  c.stroke();
  c.beginPath(); c.arc(W - 200, H - 115, 3.5, 0, Math.PI * 2); c.fill();

  // Tactical Corner Crosshairs & Tech Ticks
  const drawCrosshair = (cx: number, cy: number) => {
    c.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 8, cy); c.lineTo(cx + 8, cy);
    c.moveTo(cx, cy - 8); c.lineTo(cx, cy + 8);
    c.stroke();
  };
  drawCrosshair(80, 80);
  drawCrosshair(W - 80, 80);
  drawCrosshair(80, H - 80);
  drawCrosshair(W - 80, H - 80);

  // =========================================================================
  // 3. OUTER CYBERNETIC CHASSIS & METALLIC CORNER BRACKETS
  // =========================================================================
  const frameX = 32;
  const frameY = 32;
  const frameW = W - 64;
  const frameH = H - 64;

  // Outer Armor Border
  drawChamferedRect(c, frameX, frameY, frameW, frameH, 24);
  c.fillStyle = 'rgba(10, 16, 34, 0.72)';
  c.fill();
  c.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  c.lineWidth = 1.8;
  c.stroke();

  // 4 Corner Neon Brackets (Metallic Armor Anchors)
  c.strokeStyle = accentColor;
  c.lineWidth = 3.5;
  c.beginPath();
  c.moveTo(frameX, frameY + 45); c.lineTo(frameX, frameY); c.lineTo(frameX + 45, frameY);
  c.moveTo(frameX + frameW - 45, frameY); c.lineTo(frameX + frameW, frameY); c.lineTo(frameX + frameW, frameY + 45);
  c.moveTo(frameX, frameY + frameH - 45); c.lineTo(frameX, frameY + frameH); c.lineTo(frameX + 45, frameY + frameH);
  c.moveTo(frameX + frameW - 45, frameY + frameH); c.lineTo(frameX + frameW, frameY + frameH); c.lineTo(frameX + frameW, frameY + frameH - 45);
  c.stroke();

  // =========================================================================
  // 4. TOP HEADER CHAMBER: LOGO, "KEY FURY" BRAND & "keyfury.in" LINK
  // =========================================================================
  const headerW = 600;
  const headerH = 74;
  const headerX = W / 2 - headerW / 2;
  const headerY = 52;

  // Header Plaque Container
  drawChamferedRect(c, headerX, headerY, headerW, headerH, 16);
  c.fillStyle = 'rgba(15, 23, 42, 0.92)';
  c.fill();
  c.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  c.lineWidth = 1.8;
  c.shadowColor = 'rgba(56, 189, 248, 0.35)';
  c.shadowBlur = 14;
  c.stroke();
  c.shadowBlur = 0;

  // Left Inside Header: Stickman Warrior Emblem / Official Logo
  const emblemX = headerX + 18;
  const emblemY = headerY + 12;
  const emblemSize = 50;

  if (logoImg) {
    c.save();
    c.beginPath();
    c.roundRect(emblemX, emblemY, emblemSize, emblemSize, 10);
    c.clip();
    c.drawImage(logoImg, emblemX, emblemY, emblemSize, emblemSize);
    c.restore();

    c.strokeStyle = cyanNeon;
    c.lineWidth = 2;
    c.shadowColor = 'rgba(56, 189, 248, 0.6)';
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(emblemX, emblemY, emblemSize, emblemSize, 10);
    c.stroke();
    c.shadowBlur = 0;
  } else {
    c.fillStyle = cyanNeon;
    c.beginPath();
    c.arc(emblemX + 25, emblemY + 16, 9, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = cyanNeon;
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(emblemX + 25, emblemY + 25); c.lineTo(emblemX + 25, emblemY + 42);
    c.moveTo(emblemX + 12, emblemY + 30); c.lineTo(emblemX + 38, emblemY + 28);
    c.stroke();
  }

  // "KEY FURY" Brand Title
  c.textAlign = 'left';
  c.font = '900 34px "Outfit", -apple-system, sans-serif';
  const logoGrad = c.createLinearGradient(emblemX + 64, headerY, emblemX + 290, headerY);
  logoGrad.addColorStop(0, '#ffffff');
  logoGrad.addColorStop(0.55, '#38bdf8');
  logoGrad.addColorStop(1, '#818cf8');
  c.fillStyle = logoGrad;
  c.shadowColor = 'rgba(56, 189, 248, 0.7)';
  c.shadowBlur = 18;
  c.fillText('KEY FURY', emblemX + 64, headerY + 38);
  c.shadowBlur = 0;

  // "keyfury.in" Sub-Branding Link
  c.font = '800 14px "JetBrains Mono", monospace';
  c.fillStyle = '#38bdf8';
  c.fillText('keyfury.in', emblemX + 66, headerY + 58);

  // Right Inside Header: Official Esports Verified Match Badge
  const verBadgeW = 126;
  const verBadgeH = 32;
  const verBadgeX = headerX + headerW - verBadgeW - 18;
  const verBadgeY = headerY + 21;

  c.fillStyle = 'rgba(56, 189, 248, 0.12)';
  c.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(verBadgeX, verBadgeY, verBadgeW, verBadgeH, 8);
  c.fill();
  c.stroke();

  c.textAlign = 'center';
  c.font = '800 11px "Outfit", sans-serif';
  c.fillStyle = '#38bdf8';
  c.fillText('VERIFIED MATCH', verBadgeX + verBadgeW / 2, verBadgeY + 20);

  // =========================================================================
  // 5. MATCH CONTEXT SUB-BAR
  // =========================================================================
  const subBarY = 152;
  c.textAlign = 'center';
  c.font = '800 12px "Outfit", sans-serif';
  c.fillStyle = '#94a3b8';
  c.fillText('⚡ RANKED 1v1 DUEL  •  CYBER ROOFTOP ARENA ⚡', W / 2, subBarY);

  // =========================================================================
  // 6. HERO OUTCOME BANNER WITH THUNDERBOLT ENERGY
  // =========================================================================
  const outcomeY = 176;
  const outcomeW = 460;
  const outcomeH = 76;
  const outcomeX = W / 2 - outcomeW / 2;

  // Electric Energy Bolts Flanking the Banner
  const leftBolt: [number, number][] = [
    [outcomeX - 44, outcomeY + 18],
    [outcomeX - 22, outcomeY + 36],
    [outcomeX - 32, outcomeY + 40],
    [outcomeX - 10, outcomeY + 62]
  ];
  const rightBolt: [number, number][] = [
    [outcomeX + outcomeW + 44, outcomeY + 18],
    [outcomeX + outcomeW + 22, outcomeY + 36],
    [outcomeX + outcomeW + 32, outcomeY + 40],
    [outcomeX + outcomeW + 10, outcomeY + 62]
  ];
  drawLightningArc(c, leftBolt, accentColor, accentGlow, 2.5);
  drawLightningArc(c, rightBolt, accentColor, accentGlow, 2.5);

  drawChamferedRect(c, outcomeX, outcomeY, outcomeW, outcomeH, 16);
  c.fillStyle = isWinner ? 'rgba(52, 211, 153, 0.16)' : 'rgba(244, 63, 94, 0.16)';
  c.fill();
  c.strokeStyle = accentColor;
  c.lineWidth = 2.4;
  c.shadowColor = accentGlow;
  c.shadowBlur = 24;
  c.stroke();
  c.shadowBlur = 0;

  c.textAlign = 'center';
  c.font = '900 38px "Outfit", sans-serif';
  c.fillStyle = accentColor;
  c.shadowColor = accentGlow;
  c.shadowBlur = 22;
  c.fillText(isWinner ? '⚡  VICTORY  ⚡' : '💀  DEFEAT  💀', W / 2, outcomeY + 44);
  c.shadowBlur = 0;

  c.font = '800 12px "JetBrains Mono", monospace';
  c.fillStyle = '#cbd5e1';
  c.fillText(isWinner ? 'KNOCKOUT WIN  •  COMBAT SURVIVOR' : 'COMBAT DEFEAT  •  FALLEN IN ARENA', W / 2, outcomeY + 65);

  // =========================================================================
  // 7. FIGHTER MATCHUP BAR (PLAYER vs OPPONENT)
  // =========================================================================
  const matchupX = 56;
  const matchupY = 278;
  const matchupW = W - 112;
  const matchupH = 108;

  c.fillStyle = 'rgba(15, 23, 42, 0.85)';
  c.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(matchupX, matchupY, matchupW, matchupH, 18);
  c.fill();
  c.stroke();

  // --- Left: Player Profile ---
  const pAvatarX = matchupX + 48;
  const pAvatarY = matchupY + matchupH / 2;
  const pAvatarR = 32;

  c.save();
  c.beginPath();
  c.arc(pAvatarX, pAvatarY, pAvatarR, 0, Math.PI * 2);
  c.fillStyle = '#0f172a';
  c.fill();
  if (playerAvatarImg) {
    c.clip();
    c.drawImage(playerAvatarImg, pAvatarX - pAvatarR, pAvatarY - pAvatarR, pAvatarR * 2, pAvatarR * 2);
  }
  c.restore();

  // Glowing Player Avatar Ring
  c.strokeStyle = accentColor;
  c.lineWidth = 2.8;
  c.shadowColor = accentGlow;
  c.shadowBlur = 12;
  c.beginPath();
  c.arc(pAvatarX, pAvatarY, pAvatarR + 2, 0, Math.PI * 2);
  c.stroke();
  c.shadowBlur = 0;

  c.textAlign = 'left';
  c.font = '900 22px "Outfit", sans-serif';
  c.fillStyle = '#f8fafc';
  c.fillText(data.playerName, pAvatarX + 44, pAvatarY - 6);

  c.font = '700 14px "Outfit", sans-serif';
  c.fillStyle = '#38bdf8';
  c.fillText(`${playerTier} • ${playerMmr} MMR (${deltaStr})`, pAvatarX + 44, pAvatarY + 18);

  // --- Center: VS Hexagonal Emblem ---
  const vsX = W / 2;
  const vsY = matchupY + matchupH / 2;

  drawHexagon(c, vsX, vsY, 22);
  c.fillStyle = 'rgba(30, 41, 59, 0.95)';
  c.fill();
  c.strokeStyle = electricGold;
  c.lineWidth = 2;
  c.shadowColor = 'rgba(245, 158, 11, 0.65)';
  c.shadowBlur = 12;
  c.stroke();
  c.shadowBlur = 0;

  c.textAlign = 'center';
  c.font = '900 14px "Outfit", sans-serif';
  c.fillStyle = electricGold;
  c.fillText('VS', vsX, vsY + 5);

  // --- Right: Opponent Profile ---
  const oppAvatarX = matchupX + matchupW - 48;
  const oppAvatarY = matchupY + matchupH / 2;
  const oppAvatarR = 32;

  c.save();
  c.beginPath();
  c.arc(oppAvatarX, oppAvatarY, oppAvatarR, 0, Math.PI * 2);
  c.fillStyle = '#0f172a';
  c.fill();
  if (oppAvatarImg) {
    c.clip();
    c.drawImage(oppAvatarImg, oppAvatarX - oppAvatarR, oppAvatarY - oppAvatarR, oppAvatarR * 2, oppAvatarR * 2);
  }
  c.restore();

  c.strokeStyle = 'rgba(148, 163, 184, 0.6)';
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(oppAvatarX, oppAvatarY, oppAvatarR + 2, 0, Math.PI * 2);
  c.stroke();

  c.textAlign = 'right';
  c.font = '900 22px "Outfit", sans-serif';
  c.fillStyle = '#f8fafc';
  c.fillText(data.opponentName, oppAvatarX - 44, oppAvatarY - 6);

  c.font = '700 14px "Outfit", sans-serif';
  c.fillStyle = '#94a3b8';
  c.fillText('Opponent Fighter', oppAvatarX - 44, oppAvatarY + 18);

  // =========================================================================
  // 8. CORE COMBAT STATISTICS (2x2 GRID OF HIGH-TECH TILES)
  // =========================================================================
  const gridY = 412;
  const colW = (W - 112 - 24) / 2; // 472px each
  const rowH = 114;
  const gapX = 24;
  const gapY = 18;
  const col1X = 56;
  const col2X = 56 + colW + gapX;

  const stats = [
    // Top-Left: Combat Speed
    { col: col1X, row: gridY, label: 'COMBAT SPEED', icon: '⚡', val: `${data.wpm} WPM`, sub: `${cpmVal} CPM`, color: '#38bdf8' },
    // Top-Right: Typing Accuracy
    { col: col2X, row: gridY, label: 'TYPING ACCURACY', icon: '🎯', val: `${data.accuracy}%`, sub: data.accuracy >= 98 ? 'S-PERFECT' : 'A-SHARP', color: '#34d399' },
    // Bottom-Left: Max Combo
    { col: col1X, row: gridY + rowH + gapY, label: 'MAX COMBO', icon: '🔥', val: `${data.maxCombo}x Streak`, sub: 'MULTIPLIER', color: '#818cf8' },
    // Bottom-Right: Remaining Health
    { col: col2X, row: gridY + rowH + gapY, label: 'REMAINING HEALTH', icon: '❤️', val: `${data.finalHealth} / 200`, sub: isWinner ? 'SURVIVOR' : 'K.O.', color: isWinner ? '#34d399' : '#f43f5e' }
  ];

  stats.forEach((st) => {
    // Tile Background
    c.fillStyle = 'rgba(15, 23, 42, 0.85)';
    c.strokeStyle = 'rgba(56, 189, 248, 0.26)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(st.col, st.row, colW, rowH, 16);
    c.fill();
    c.stroke();

    // Accent Left Neon Strip
    c.fillStyle = st.color;
    c.shadowColor = st.color;
    c.shadowBlur = 8;
    c.beginPath();
    c.roundRect(st.col + 16, st.row + 18, 4, rowH - 36, 2);
    c.fill();
    c.shadowBlur = 0;

    // Icon & Label
    c.textAlign = 'left';
    c.font = '800 13px "Outfit", sans-serif';
    c.fillStyle = '#94a3b8';
    c.fillText(`${st.icon}  ${st.label}`, st.col + 32, st.row + 34);

    // Large Metric Value
    c.font = '900 34px "JetBrains Mono", monospace';
    c.fillStyle = st.color;
    c.fillText(st.val, st.col + 32, st.row + 80);

    // Sub-Pill on Right
    const pillW = 96;
    const pillH = 26;
    const pillX = st.col + colW - pillW - 18;
    const pillY = st.row + 22;

    c.fillStyle = 'rgba(0, 0, 0, 0.4)';
    c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(pillX, pillY, pillW, pillH, 8);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.font = '800 11px "Outfit", sans-serif';
    c.fillStyle = '#cbd5e1';
    c.fillText(st.sub, pillX + pillW / 2, pillY + 17);
  });

  // =========================================================================
  // 9. RANKED PROGRESSION BAR & RATING STATUS
  // =========================================================================
  const progY = 684;
  const progW = W - 112;
  const progH = 100;
  const progX = 56;

  c.fillStyle = 'rgba(15, 23, 42, 0.85)';
  c.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.roundRect(progX, progY, progW, progH, 18);
  c.fill();
  c.stroke();

  const range = getTierRange(playerMmr);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((playerMmr - range.min) / (range.max - range.min)) * 100)));

  c.textAlign = 'left';
  c.font = '800 14px "Outfit", sans-serif';
  c.fillStyle = '#94a3b8';
  c.fillText('🏆  RANK PROGRESSION', progX + 24, progY + 30);

  c.textAlign = 'right';
  c.font = '800 14px "Outfit", sans-serif';
  c.fillStyle = '#38bdf8';
  c.fillText(`${playerTier.toUpperCase()} • ${playerMmr} MMR (${deltaStr})  •  ${progressPercent}% to ${range.nextTier}`, progX + progW - 24, progY + 30);

  // Progress Bar Track
  const barX = progX + 24;
  const barY = progY + 48;
  const barW = progW - 48;
  const barH = 14;

  c.fillStyle = 'rgba(30, 41, 59, 0.85)';
  c.beginPath();
  c.roundRect(barX, barY, barW, barH, 7);
  c.fill();

  // Glowing Gradient Fill
  const fillW = Math.max(14, Math.round((progressPercent / 100) * barW));
  const fillGrad = c.createLinearGradient(barX, barY, barX + fillW, barY);
  fillGrad.addColorStop(0, '#0ea5e9');
  fillGrad.addColorStop(1, '#34d399');
  c.fillStyle = fillGrad;
  c.shadowColor = 'rgba(52, 211, 153, 0.65)';
  c.shadowBlur = 10;
  c.beginPath();
  c.roundRect(barX, barY, fillW, barH, 7);
  c.fill();
  c.shadowBlur = 0;

  // Min / Max Markers
  c.textAlign = 'left';
  c.font = '700 11px "JetBrains Mono", monospace';
  c.fillStyle = '#64748b';
  c.fillText(`${range.min} MMR`, barX, barY + 30);

  c.textAlign = 'right';
  c.fillText(`${range.max} MMR`, barX + barW, barY + 30);

  // =========================================================================
  // 10. ACHIEVEMENTS OR COMBAT MASTERY STRIP
  // =========================================================================
  const achY = 806;
  const achW = W - 112;
  const achH = 100;
  const achX = 56;

  const achievementsToShow = (data.unlockedAchievements && data.unlockedAchievements.length > 0)
    ? data.unlockedAchievements.slice(0, 2)
    : [];

  if (achievementsToShow.length > 0) {
    c.fillStyle = 'rgba(15, 23, 42, 0.85)';
    c.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(achX, achY, achW, achH, 18);
    c.fill();
    c.stroke();

    c.textAlign = 'left';
    c.font = '800 14px "Outfit", sans-serif';
    c.fillStyle = '#fbbf24';
    c.fillText('🏆  UNLOCKED ACHIEVEMENTS', achX + 24, achY + 28);

    const chipW = (achW - 48 - 16) / achievementsToShow.length;
    achievementsToShow.forEach((ach, i) => {
      const chipX = achX + 24 + i * (chipW + 16);
      const chipY = achY + 40;
      const chipH = 46;

      c.fillStyle = 'rgba(0, 0, 0, 0.4)';
      c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(chipX, chipY, chipW, chipH, 10);
      c.fill();
      c.stroke();

      c.textAlign = 'left';
      c.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      c.fillText(ach.icon, chipX + 12, chipY + 31);

      c.font = '800 14px "Outfit", sans-serif';
      c.fillStyle = '#f8fafc';
      c.fillText(ach.title, chipX + 42, chipY + 20);

      c.font = '700 11px "Outfit", sans-serif';
      c.fillStyle = '#94a3b8';
      c.fillText(ach.description || 'Combat Milestone Unlocked', chipX + 42, chipY + 36);
    });
  } else {
    // Combat Mastery Banner
    c.fillStyle = 'rgba(15, 23, 42, 0.82)';
    c.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(achX, achY, achW, achH, 18);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.font = '800 17px "Outfit", sans-serif';
    c.fillStyle = '#f8fafc';
    c.fillText('⚔️  KEYFURY COMPETITIVE COMBAT RECORD', W / 2, achY + 44);

    c.font = '700 13px "Outfit", sans-serif';
    c.fillStyle = '#64748b';
    c.fillText(`TOTAL WORDS COMPLETED: ${data.wordsCompleted}  •  PRECISION SPEED COMBATANT`, W / 2, achY + 70);
  }

  // =========================================================================
  // 11. BOTTOM FOOTER PLAQUE: "Play Free at keyfury.in"
  // =========================================================================
  const footerW = 540;
  const footerH = 62;
  const footerX = W / 2 - footerW / 2;
  const footerY = 926;

  drawChamferedRect(c, footerX, footerY, footerW, footerH, 14);
  c.fillStyle = 'rgba(15, 23, 42, 0.94)';
  c.fill();
  c.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  c.lineWidth = 1.8;
  c.shadowColor = 'rgba(56, 189, 248, 0.4)';
  c.shadowBlur = 14;
  c.stroke();
  c.shadowBlur = 0;

  // Single cleanly measured line for "Play Free at keyfury.in"
  c.font = '900 24px "Outfit", sans-serif';
  const prefixText = 'Play Free at ';
  const brandText = 'keyfury.in';
  const wPrefix = c.measureText ? c.measureText(prefixText).width : 140;
  const wBrand = c.measureText ? c.measureText(brandText).width : 110;
  const totalFooterTextW = wPrefix + wBrand;
  const footerTextStartX = W / 2 - totalFooterTextW / 2;

  c.textAlign = 'left';
  c.fillStyle = '#f8fafc';
  c.fillText(prefixText, footerTextStartX, footerY + 39);

  c.fillStyle = '#38bdf8';
  c.shadowColor = 'rgba(56, 189, 248, 0.75)';
  c.shadowBlur = 14;
  c.fillText(brandText, footerTextStartX + wPrefix, footerY + 39);
  c.shadowBlur = 0;

  // Verified Match ID & Date Stamp Watermark
  c.textAlign = 'center';
  c.font = '700 12px "JetBrains Mono", monospace';
  c.fillStyle = '#64748b';
  c.fillText(`VERIFIED MATCH ID: ${matchIdStr}  •  ${dateStr}  •  OFFICIAL RECORD`, W / 2, 1014);

  const filename = `keyfury-${isWinner ? 'victory' : 'defeat'}-${data.playerName.toLowerCase().replace(/\s+/g, '-')}-${data.wpm}wpm.png`;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, filename });
      } else {
        reject(new Error('Failed to create match card image blob'));
      }
    }, 'image/png');
  });
}

/**
 * Directly downloads the generated match card image as a PNG file.
 */
export async function downloadMatchCard(data: MatchCardData): Promise<void> {
  try {
    soundManager.playClick();
  } catch (_e) {}

  try {
    const { blob, filename } = await generateMatchCardBlob(data);

    // Direct PNG file download directly to device
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  } catch (err) {
    console.error('[downloadMatchCard] Error generating card:', err);
  }
}

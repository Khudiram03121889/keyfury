import { soundManager } from '../audio/SoundManager';
import { getRankTier } from '../components/ranked/RankBadge';

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
  matchId?: string;
  joinedAt?: string;
}

export async function downloadMatchCard(data: MatchCardData): Promise<void> {
  try {
    soundManager.playClick();
  } catch (_e) {
    // Ignore audio error if soundManager not ready
  }

  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d')!;

  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
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
  const matchIdStr = data.matchId || `KF-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = data.joinedAt
    ? new Date(data.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  // Load image assets in parallel
  const [logoImg, playerAvatarImg, oppAvatarImg] = await Promise.all([
    loadImage('/logo.jpg'),
    loadImage(data.playerAvatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Player'),
    loadImage(data.opponentAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.opponentName)}`)
  ]);

  const accentColor = isWinner ? '#34d399' : '#f43f5e';
  const accentDim = isWinner ? 'rgba(52, 211, 153, 0.18)' : 'rgba(244, 63, 94, 0.18)';
  const accentGlow = isWinner ? 'rgba(52, 211, 153, 0.4)' : 'rgba(244, 63, 94, 0.4)';

  // 1. Sleek dark background with radial atmosphere
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060913'); bg.addColorStop(0.5, '#0f172a'); bg.addColorStop(1, '#060913');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);

  // Background circuit tech grid
  c.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }

  // Radial hero glow behind title
  const heroGlow = c.createRadialGradient(W / 2, 230, 0, W / 2, 230, 420);
  heroGlow.addColorStop(0, accentDim); heroGlow.addColorStop(1, 'transparent');
  c.fillStyle = heroGlow; c.fillRect(0, 0, W, 500);

  // Decorative corner frame accents
  c.strokeStyle = accentColor; c.lineWidth = 4;
  c.beginPath(); c.moveTo(50, 90); c.lineTo(50, 50); c.lineTo(90, 50); c.stroke();
  c.beginPath(); c.moveTo(W - 90, 50); c.lineTo(W - 50, 50); c.lineTo(W - 50, 90); c.stroke();
  c.beginPath(); c.moveTo(50, H - 90); c.lineTo(50, H - 50); c.lineTo(90, H - 50); c.stroke();
  c.beginPath(); c.moveTo(W - 90, H - 50); c.lineTo(W - 50, H - 50); c.lineTo(W - 50, H - 90); c.stroke();

  // 2. Top Header Branding with Game Logo
  const headerY = 75;
  if (logoImg) {
    c.save();
    c.beginPath();
    c.roundRect(70, headerY, 64, 64, 14);
    c.clip();
    c.drawImage(logoImg, 70, headerY, 64, 64);
    c.restore();

    c.strokeStyle = '#38bdf8'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(70, headerY, 64, 64, 14); c.stroke();
  }

  c.textAlign = 'left';
  c.font = '900 24px "Outfit", sans-serif';
  c.fillStyle = '#f8fafc';
  c.fillText('KEYBOARD STICKMAN WARRIOR', logoImg ? 150 : 70, headerY + 28);

  c.font = '700 13px "Outfit", sans-serif';
  c.fillStyle = '#38bdf8';
  c.letterSpacing = '2px';
  c.fillText('QUICK DUEL • OFFICIAL MATCH CERTIFICATE', logoImg ? 150 : 70, headerY + 52);
  c.letterSpacing = '0px';

  // Date top right
  c.textAlign = 'right';
  c.font = '700 13px "JetBrains Mono", monospace';
  c.fillStyle = '#64748b';
  c.fillText(dateStr, W - 70, headerY + 38);

  // Top Header Divider Line
  c.strokeStyle = 'rgba(255, 255, 255, 0.1)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(70, 160); c.lineTo(W - 70, 160); c.stroke();

  // 3. Match Outcome Hero Banner Card
  const outcomeY = 190;
  c.fillStyle = 'rgba(15, 23, 42, 0.85)';
  c.strokeStyle = accentColor;
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(70, outcomeY, W - 140, 160, 20);
  c.fill(); c.stroke();

  c.textAlign = 'center';
  c.font = '900 14px "Outfit", sans-serif';
  c.fillStyle = accentColor;
  c.letterSpacing = '3px';
  c.fillText(isWinner ? '⚔️  VICTORY ACHIEVED  ⚔️' : '⚔️  MATCH DEFEAT  ⚔️', W / 2, outcomeY + 38);
  c.letterSpacing = '0px';

  c.font = '900 68px "Outfit", sans-serif';
  c.fillStyle = accentColor;
  c.shadowColor = accentGlow; c.shadowBlur = 30;
  c.fillText(isWinner ? 'VICTORY!' : 'DEFEATED', W / 2, outcomeY + 110);
  c.shadowBlur = 0;

  // 4. Head-to-Head Player vs Opponent Section
  const vsY = 380;

  // Player (Left Card)
  c.fillStyle = 'rgba(30, 41, 59, 0.7)';
  c.strokeStyle = '#38bdf8'; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(70, vsY, 430, 130, 16); c.fill(); c.stroke();

  if (playerAvatarImg) {
    c.save();
    c.beginPath(); c.arc(125, vsY + 65, 38, 0, Math.PI * 2); c.clip();
    c.drawImage(playerAvatarImg, 87, vsY + 27, 76, 76);
    c.restore();
  }
  c.strokeStyle = '#38bdf8'; c.lineWidth = 2;
  c.beginPath(); c.arc(125, vsY + 65, 38, 0, Math.PI * 2); c.stroke();

  c.textAlign = 'left';
  c.font = '900 24px "Outfit", sans-serif';
  c.fillStyle = '#f8fafc';
  c.fillText(data.playerName, 180, vsY + 48);

  c.font = '700 14px "Outfit", sans-serif';
  c.fillStyle = '#38bdf8';
  c.fillText(`${playerTier} • ${playerMmr} MMR`, 180, vsY + 74);

  const deltaText = mmrDelta >= 0 ? `▲ +${mmrDelta} MMR` : `▼ ${mmrDelta} MMR`;
  c.font = '800 14px "JetBrains Mono", monospace';
  c.fillStyle = mmrDelta >= 0 ? '#34d399' : '#f43f5e';
  c.fillText(deltaText, 180, vsY + 98);

  // VS Badge (Center)
  c.fillStyle = '#0f172a';
  c.strokeStyle = 'rgba(255, 255, 255, 0.2)'; c.lineWidth = 2;
  c.beginPath(); c.arc(W / 2, vsY + 65, 32, 0, Math.PI * 2); c.fill(); c.stroke();

  c.textAlign = 'center';
  c.font = '900 18px "Outfit", sans-serif';
  c.fillStyle = '#fbbf24';
  c.fillText('VS', W / 2, vsY + 72);

  // Opponent (Right Card)
  c.fillStyle = 'rgba(30, 41, 59, 0.7)';
  c.strokeStyle = '#f43f5e'; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect(580, vsY, 430, 130, 16); c.fill(); c.stroke();

  if (oppAvatarImg) {
    c.save();
    c.beginPath(); c.arc(955, vsY + 65, 38, 0, Math.PI * 2); c.clip();
    c.drawImage(oppAvatarImg, 917, vsY + 27, 76, 76);
    c.restore();
  }
  c.strokeStyle = '#f43f5e'; c.lineWidth = 2;
  c.beginPath(); c.arc(955, vsY + 65, 38, 0, Math.PI * 2); c.stroke();

  c.textAlign = 'right';
  c.font = '900 24px "Outfit", sans-serif';
  c.fillStyle = '#f8fafc';
  c.fillText(data.opponentName, 900, vsY + 48);

  c.font = '700 14px "Outfit", sans-serif';
  c.fillStyle = '#f43f5e';
  c.fillText(`OPPONENT`, 900, vsY + 74);

  c.font = '700 13px "Outfit", sans-serif';
  c.fillStyle = '#94a3b8';
  c.fillText(`COMBAT DUEL`, 900, vsY + 98);

  // 5. Rich 6-Metric Statistics Grid (2x3)
  const gridY = 545;
  const cpmVal = Math.round(data.wpm * 5);
  const statsList = [
    { label: 'TYPING SPEED', val: `${data.wpm}`, unit: 'WPM', sub: `${cpmVal} CPM`, color: '#38bdf8' },
    { label: 'ACCURACY', val: `${data.accuracy}`, unit: '%', sub: data.accuracy >= 98 ? 'S-TIER PERFECT' : 'A-TIER SHARP', color: '#34d399' },
    { label: 'MAX COMBO', val: `${data.maxCombo}`, unit: 'x', sub: 'STREAK MULTIPLIER', color: '#a855f7' },
    { label: 'WORDS COMPLETED', val: `${data.wordsCompleted}`, unit: 'Words', sub: 'TOTAL TYPED', color: '#fbbf24' },
    { label: 'FINAL HEALTH', val: `${data.finalHealth}`, unit: '%', sub: isWinner ? 'VICTORY SURVIVOR' : 'KO DEFEATED', color: '#f43f5e' },
    { label: 'RATING STATUS', val: `${playerMmr}`, unit: 'MMR', sub: `${playerTier.toUpperCase()} TIER`, color: '#ec4899' },
  ];

  const itemW = 290, itemH = 140, colGap = 35, rowGap = 20;
  const startX = 70;

  statsList.forEach((stat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + col * (itemW + colGap);
    const y = gridY + row * (itemH + rowGap);

    c.fillStyle = 'rgba(15, 23, 42, 0.85)';
    c.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(x, y, itemW, itemH, 16);
    c.fill(); c.stroke();

    c.fillStyle = stat.color;
    c.beginPath();
    c.roundRect(x + 20, y, itemW - 40, 3, 2);
    c.fill();

    c.textAlign = 'center';
    c.fillStyle = stat.color;
    c.font = '900 44px "JetBrains Mono", monospace';
    c.fillText(stat.val + stat.unit, x + itemW / 2, y + 62);

    c.fillStyle = '#f8fafc';
    c.font = '900 12px "Outfit", sans-serif';
    c.letterSpacing = '1.5px';
    c.fillText(stat.label, x + itemW / 2, y + 92);

    c.fillStyle = '#64748b';
    c.font = '700 11px "Outfit", sans-serif';
    c.letterSpacing = '1px';
    c.fillText(stat.sub, x + itemW / 2, y + 115);
    c.letterSpacing = '0px';
  });

  // 6. Footer Branding & Watermark
  const footerY = 890;
  c.strokeStyle = 'rgba(255, 255, 255, 0.1)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(70, footerY); c.lineTo(W - 70, footerY); c.stroke();

  c.textAlign = 'center';
  c.font = '900 38px "Outfit", sans-serif';
  const brandGrad = c.createLinearGradient(W / 2 - 140, footerY + 50, W / 2 + 140, footerY + 50);
  brandGrad.addColorStop(0, '#38bdf8'); brandGrad.addColorStop(1, '#818cf8');
  c.fillStyle = brandGrad;
  c.fillText('KEYFURY', W / 2, footerY + 52);

  c.font = '800 14px "Outfit", sans-serif';
  c.fillStyle = '#94a3b8';
  c.letterSpacing = '3px';
  c.fillText('TYPE. FIGHT. WIN.  •  KEYFURY.APP', W / 2, footerY + 82);
  c.letterSpacing = '0px';

  c.font = '700 11px "JetBrains Mono", monospace';
  c.fillStyle = '#475569';
  c.fillText(`VERIFIED MATCH ID: ${matchIdStr} • 1080P HD EXPORT`, W / 2, footerY + 112);

  // Trigger download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyfury-${isWinner ? 'victory' : 'defeat'}-${data.playerName.toLowerCase().replace(/\s+/g, '-')}-${data.wpm}wpm.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

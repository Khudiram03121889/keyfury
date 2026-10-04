import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { shouldBypassSplashScreen } from '../App';

describe('KeyFury 3D SEO, GEO & LLMO Verification Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const webDir = path.resolve(__dirname, '../..');
  const publicDir = path.resolve(webDir, 'public');

  describe('1. Crawler & Bot Splash Screen Bypass Logic', () => {
    let mockSessionStorage: Record<string, string>;

    beforeEach(() => {
      mockSessionStorage = {};
      const fakeStorage = {
        getItem: (key: string) => mockSessionStorage[key] || null,
        setItem: (key: string, value: string) => { mockSessionStorage[key] = value; },
        removeItem: (key: string) => { delete mockSessionStorage[key]; },
        clear: () => { mockSessionStorage = {}; },
        length: 0,
        key: () => null
      };

      (globalThis as any).sessionStorage = fakeStorage;
      if (typeof window !== 'undefined') {
        (window as any).sessionStorage = fakeStorage;
      }
      if (typeof (globalThis as any).navigator === 'undefined') {
        (globalThis as any).navigator = { userAgent: '' };
      }
      (globalThis as any).location = { search: '', pathname: '/', hash: '' };
      if (typeof window !== 'undefined') {
        (window as any).location = { search: '', pathname: '/', hash: '' };
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
      (globalThis as any).location = { search: '', pathname: '/', hash: '' };
      if (typeof window !== 'undefined') {
        (window as any).location = { search: '', pathname: '/', hash: '' };
      }
    });

    const setUserAgent = (ua: string) => {
      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: ua,
        configurable: true,
        writable: true
      });
      if (typeof window !== 'undefined') {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: ua,
          configurable: true,
          writable: true
        });
      }
    };

    const setLocation = (search: string, pathname = '/', hash = '') => {
      const locObj = { search, pathname, hash };
      (globalThis as any).location = locObj;
      if (typeof window !== 'undefined') {
        (window as any).location = locObj;
      }
    };

    it('bypasses splash screen for Googlebot', () => {
      setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for Bingbot', () => {
      setUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for GPTBot (OpenAI / ChatGPT)', () => {
      setUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for OAI-SearchBot (ChatGPT Search)', () => {
      setUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for ClaudeBot (Anthropic)', () => {
      setUserAgent('ClaudeBot/1.0; +https://www.anthropic.com/claudebot');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for PerplexityBot', () => {
      setUserAgent('PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen for Lighthouse / HeadlessChrome audit bots', () => {
      setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/119.0.0.0 Safari/537.36');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen when session storage marks keyfury_splash_seen', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      mockSessionStorage['keyfury_splash_seen'] = 'true';
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen when URL has room query (match invite)', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      setLocation('?room=duel-abc-123');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen when URL has deep path (/ranked)', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      setLocation('', '/ranked');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('bypasses splash screen when URL has deep anchor hash (#faq)', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      setLocation('', '/', '#faq');
      expect(shouldBypassSplashScreen()).toBe(true);
    });

    it('does NOT bypass splash screen for a fresh regular human user at root /', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      setLocation('', '/');
      expect(shouldBypassSplashScreen()).toBe(false);
    });
  });

  describe('2. Heading Hierarchy, Branding & Section IDs', () => {
    it('verifies Navbar does NOT use an h1 tag for the brand name', () => {
      const navbarSource = fs.readFileSync(path.resolve(webDir, 'src/components/layout/Navbar.tsx'), 'utf-8');
      expect(navbarSource).not.toMatch(/<h1[^>]*>.*?KEY.*?FURY.*?<\/h1>/s);
      expect(navbarSource).toContain('nav-brand-title');
    });

    it('verifies LandingPage establishes the primary keyword-targeted h1', () => {
      const landingSource = fs.readFileSync(path.resolve(webDir, 'src/pages/LandingPage.tsx'), 'utf-8');
      expect(landingSource).toMatch(/<h1[^>]*>[\s\S]*?KeyFury:\s*3D Typing Fighting Game[\s\S]*?<\/h1>/);
    });

    it('verifies LandingPage showcases the 4 3D champions', () => {
      const landingSource = fs.readFileSync(path.resolve(webDir, 'src/pages/LandingPage.tsx'), 'utf-8');
      expect(landingSource).toContain('Shadow Ronin');
      expect(landingSource).toContain('Cyber Valkyrie');
      expect(landingSource).toContain('Volt Shinobi');
      expect(landingSource).toContain('Void Assassin');
    });

    it('verifies LandingPage showcases the 4 3D arenas', () => {
      const landingSource = fs.readFileSync(path.resolve(webDir, 'src/pages/LandingPage.tsx'), 'utf-8');
      expect(landingSource).toContain('Highland Sanctuary');
      expect(landingSource).toContain('Cyber Rooftop');
      expect(landingSource).toContain('Volcanic Caldera');
      expect(landingSource).toContain('Celestial Void');
    });

    it('verifies LandingPage has competitive comparison and FAQ accordion', () => {
      const landingSource = fs.readFileSync(path.resolve(webDir, 'src/pages/LandingPage.tsx'), 'utf-8');
      expect(landingSource).toContain('Monkeytype');
      expect(landingSource).toContain('TypeRacer');
      expect(landingSource).toContain('Typing of the Dead');
      expect(landingSource).toContain('Frequently Asked Questions');
    });

    it('verifies LandingPage sections have explicit anchor IDs matching sitemap & schema', () => {
      const landingSource = fs.readFileSync(path.resolve(webDir, 'src/pages/LandingPage.tsx'), 'utf-8');
      expect(landingSource).toContain('id="champions"');
      expect(landingSource).toContain('id="arenas"');
      expect(landingSource).toContain('id="combat"');
      expect(landingSource).toContain('id="comparison"');
      expect(landingSource).toContain('id="faq"');
    });

    it('verifies 3D splash screen subtitle has been updated from KEYBOARD STICKMAN WARRIOR to 3D TYPING FIGHTING GAME', () => {
      const splashScene = fs.readFileSync(path.resolve(webDir, 'src/components/splash/KeyFury3DThunderScene.tsx'), 'utf-8');
      expect(splashScene).not.toContain('KEYBOARD STICKMAN WARRIOR');
      expect(splashScene).toContain('3D TYPING FIGHTING GAME');

      const transitionHtml = fs.readFileSync(path.resolve(publicDir, 'assets/opening_3d_transition.html'), 'utf-8');
      expect(transitionHtml).not.toContain('KEYBOARD STICKMAN WARRIOR');
      expect(transitionHtml).toContain('3D TYPING FIGHTING GAME');
    });
  });

  describe('3. Metadata, OpenGraph, Schema.org & Anti-FOUC Verification', () => {
    const indexPath = path.resolve(webDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    it('verifies title and meta description focus on 3D Typing Combat', () => {
      expect(indexHtml).toContain('KeyFury — 3D Typing Fighting Game | 1v1 WebGL Combat');
      expect(indexHtml).toContain('Three.js and WebGL');
      expect(indexHtml).toContain('3D typing game');
      expect(indexHtml).toContain('typing fighting game');
    });

    it('verifies fabricated ratingValue and ratingCount are completely removed', () => {
      expect(indexHtml).not.toContain('"ratingValue"');
      expect(indexHtml).not.toContain('"ratingCount"');
      expect(indexHtml).not.toContain('"aggregateRating"');
      expect(indexHtml).not.toContain('1250');
    });

    it('verifies Schema.org includes 3D WebGL / Three.js platforms, image, and FAQPage', () => {
      expect(indexHtml).toContain('"WebGL"');
      expect(indexHtml).toContain('"Three.js"');
      expect(indexHtml).toContain('"FAQPage"');
      expect(indexHtml).toContain('"image": "https://keyfury.in/og-image.png"');
      expect(indexHtml).toContain('"screenshot": "https://keyfury.in/og-image.png"');
      expect(indexHtml).toContain('"inLanguage": "en"');
    });

    it('verifies critical dark theme CSS exists in head to prevent FOUC', () => {
      expect(indexHtml).toContain('color-scheme: dark');
      expect(indexHtml).toContain('background-color: #030712');
      expect(indexHtml).toContain("#root > header, #root > main, #root > footer");
    });

    it('verifies pre-rendered semantic HTML exists inside root for zero-JS crawlers', () => {
      const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>/);
      expect(rootMatch).toBeTruthy();
      const rootContent = rootMatch![1];
      expect(rootContent).toContain('<h1>KeyFury: 3D Typing Fighting Game');
      expect(rootContent).toContain('Shadow Ronin');
      expect(rootContent).toContain('Highland Sanctuary');
      expect(rootContent).toContain('Frequently Asked Questions');
    });

    it('verifies Open Graph image exists with 1200x630 dimensions', () => {
      const ogImagePath = path.resolve(publicDir, 'og-image.png');
      expect(fs.existsSync(ogImagePath)).toBe(true);

      const buffer = fs.readFileSync(ogImagePath);
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(1200);
      expect(height).toBe(630);
    });
  });

  describe('4. LLMO & Generative Engine Optimization (GEO) Documents', () => {
    const llmsTxt = fs.readFileSync(path.resolve(publicDir, 'llms.txt'), 'utf-8');
    const llmsFullTxt = fs.readFileSync(path.resolve(publicDir, 'llms-full.txt'), 'utf-8');
    const gameGuide = fs.readFileSync(path.resolve(publicDir, 'game-guide.md'), 'utf-8');
    const rawMd = fs.readFileSync(path.resolve(publicDir, 'raw.md'), 'utf-8');

    it('verifies all markdown docs describe the 3D WebGL Three.js engine', () => {
      for (const doc of [llmsTxt, llmsFullTxt, gameGuide, rawMd]) {
        expect(doc).toContain('3D');
        expect(doc).toContain('Three.js');
        expect(doc).toContain('WebGL');
        expect(doc).not.toContain('100 HP');
        expect(doc).not.toContain('100 Health Points');
      }
    });

    it('verifies all documents accurately reference 200 HP starting health', () => {
      for (const doc of [llmsTxt, llmsFullTxt, gameGuide, rawMd]) {
        expect(doc).toContain('200 HP');
      }
    });

    it('verifies 4 champions are documented across all LLM context files', () => {
      for (const doc of [llmsTxt, llmsFullTxt, gameGuide, rawMd]) {
        expect(doc).toContain('Shadow Ronin');
        expect(doc).toContain('Cyber Valkyrie');
        expect(doc).toContain('Volt Shinobi');
        expect(doc).toContain('Void Assassin');
      }
    });

    it('verifies 4 arenas are documented across all LLM context files', () => {
      for (const doc of [llmsTxt, llmsFullTxt, gameGuide, rawMd]) {
        expect(doc).toContain('Highland Sanctuary');
        expect(doc).toContain('Cyber Rooftop');
        expect(doc).toContain('Volcanic Caldera');
        expect(doc).toContain('Celestial Void');
      }
    });

    it('verifies direct AI answers are present for LLMs', () => {
      expect(llmsFullTxt).toContain('Direct Answer');
      expect(llmsFullTxt).toContain('What are the best 3D typing games online?');
      expect(llmsFullTxt).toContain('Are there fighting games where typing attacks the opponent?');
    });
  });

  describe('5. Sitemap & Robots Discovery Protocol', () => {
    const sitemapXml = fs.readFileSync(path.resolve(publicDir, 'sitemap.xml'), 'utf-8');
    const robotsTxt = fs.readFileSync(path.resolve(publicDir, 'robots.txt'), 'utf-8');

    it('verifies sitemap includes lastmod tags and documentation routes', () => {
      expect(sitemapXml).toContain('<lastmod>2026-10-04</lastmod>');
      expect(sitemapXml).toContain('https://keyfury.in/llms.txt');
      expect(sitemapXml).toContain('https://keyfury.in/game-guide.md');
      expect(sitemapXml).toContain('https://keyfury.in/ranked');
      expect(sitemapXml).toContain('https://keyfury.in/leaderboard');
    });

    it('verifies robots.txt explicitly permits AI crawlers and points to sitemap', () => {
      expect(robotsTxt).toContain('User-agent: GPTBot');
      expect(robotsTxt).toContain('User-agent: OAI-SearchBot');
      expect(robotsTxt).toContain('User-agent: ClaudeBot');
      expect(robotsTxt).toContain('User-agent: PerplexityBot');
      expect(robotsTxt).toContain('Sitemap: https://keyfury.in/sitemap.xml');
    });
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T-P-01: Performance & PWA Assets Conformance', () => {
  it('valid PWA PNG icons exist in public directory with valid headers and size (D-05)', () => {
    const icon192 = path.resolve('public', 'pwa-192x192.png');
    const icon512 = path.resolve('public', 'pwa-512x512.png');

    expect(fs.existsSync(icon192), 'pwa-192x192.png must exist').toBe(true);
    expect(fs.existsSync(icon512), 'pwa-512x512.png must exist').toBe(true);

    const stat192 = fs.statSync(icon192);
    const stat512 = fs.statSync(icon512);

    expect(stat192.size).toBeGreaterThan(2000);
    expect(stat512.size).toBeGreaterThan(5000);

    // PNG signature check: 89 50 4E 47 0D 0A 1A 0A
    const buf192 = fs.readFileSync(icon192);
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(buf192.subarray(0, 8)).toEqual(pngMagic);

    const buf512 = fs.readFileSync(icon512);
    expect(buf512.subarray(0, 8)).toEqual(pngMagic);
  });

  it('vite.config.ts includes standalone PWA manifest and precaching', () => {
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');

    expect(viteConfig).toContain('VitePWA');
    expect(viteConfig).toContain("display: 'standalone'");
    expect(viteConfig).toContain("orientation: 'portrait'");
    expect(viteConfig).toContain('/pwa-192x192.png');
    expect(viteConfig).toContain('/pwa-512x512.png');
    expect(viteConfig).toContain('globPatterns');
    expect(viteConfig).toContain('open-meteo');
  });

  it('dist build bundle size budget check (< 500 KB uncompressed)', () => {
    const distAssetsDir = path.resolve('dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      const jsFiles = files.filter((f) => f.endsWith('.js'));

      for (const jsFile of jsFiles) {
        const stats = fs.statSync(path.join(distAssetsDir, jsFile));
        // Main JS bundle budget: under 500 KB uncompressed
        expect(
          stats.size,
          `Bundle ${jsFile} size (${(stats.size / 1024).toFixed(1)} KB) exceeds 500 KB budget`
        ).toBeLessThan(500 * 1024);
      }
    }
  });
});

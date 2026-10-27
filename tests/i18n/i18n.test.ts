import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import en from '../../src/i18n/en.json';
import ta from '../../src/i18n/ta.json';
import hi from '../../src/i18n/hi.json';

describe('T-I-01: i18n Parity (en, ta, hi)', () => {
  const enKeys = Object.keys(en).sort();
  const taKeys = Object.keys(ta).sort();
  const hiKeys = Object.keys(hi).sort();

  it('all three languages have the exact same set of translation keys', () => {
    expect(taKeys).toEqual(enKeys);
    expect(hiKeys).toEqual(enKeys);
  });

  it('no translation string is empty or whitespace-only', () => {
    const dicts = { en, ta, hi };
    for (const [lang, dict] of Object.entries(dicts)) {
      for (const [k, val] of Object.entries(dict)) {
        expect(
          val.trim().length,
          `Key "${k}" in ${lang} must not be empty`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('placeholders like {work}, {rest}, {count} match across all languages', () => {
    const extractPlaceholders = (str: string): string[] => {
      const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
      return matches.sort();
    };

    for (const k of enKeys) {
      const enPlaceholders = extractPlaceholders((en as any)[k]);
      const taPlaceholders = extractPlaceholders((ta as any)[k]);
      const hiPlaceholders = extractPlaceholders((hi as any)[k]);

      expect(
        taPlaceholders,
        `Placeholders for key "${k}" in Tamil must match English`
      ).toEqual(enPlaceholders);

      expect(
        hiPlaceholders,
        `Placeholders for key "${k}" in Hindi must match English`
      ).toEqual(enPlaceholders);
    }
  });
});

describe('T-I-02: Audio Template Existence and Audio Fidelity', () => {
  const templates = [
    'plan.green.today',
    'plan.green.now',
    'plan.yellow.now',
    'plan.orange.now',
    'plan.red.now',
    'plan.black.now',
    'reason.humid',
    'reason.sun',
    'reason.hot',
    'reason.still_air',
    'act.drink_now',
    'act.rest_shade',
    'act.stop_work',
    'log.started',
    'log.rest_added',
    'log.stopped',
    'learn.severe_symptoms',
    'rights.advisory',
  ];

  const languages = ['en', 'ta', 'hi'];

  languages.forEach((lang) => {
    templates.forEach((tmpl) => {
      it(`real spoken audio file exists for ${lang}/${tmpl}.mp3 (> 1KB)`, () => {
        const filePath = path.resolve('public', 'audio', lang, `${tmpl}.mp3`);
        expect(fs.existsSync(filePath), `Missing audio: ${filePath}`).toBe(true);
        const stats = fs.statSync(filePath);
        // Ensure not a 288-byte silent stub, but real audible audio (D-09)
        expect(stats.size).toBeGreaterThan(1000);
      });
    });
  });
});

describe('T-C-01: Content Lint & Safety Policy across all languages & UI code (D-07)', () => {
  const bannedClaims = ['diagnose', 'cure', 'guaranteed', 'legal proof'];
  const dicts = { en, ta, hi };

  for (const [lang, dict] of Object.entries(dicts)) {
    it(`no banned claims exist in ${lang} translations`, () => {
      const allText = Object.values(dict).join(' ').toLowerCase();
      for (const banned of bannedClaims) {
        expect(
          allText.includes(banned),
          `Banned claim "${banned}" found in ${lang} translation text`
        ).toBe(false);
      }
    });

    it(`symptom and emergency texts in ${lang} cite emergency numbers 112 and 108`, () => {
      const emergencyDesc = (dict as any)['s6.emergency_desc'] || '';
      const symptomContent = (dict as any)['s6.symptoms_content'] || '';

      expect(emergencyDesc).toContain('112');
      expect(emergencyDesc).toContain('108');
      expect(symptomContent).toContain('112');
      expect(symptomContent).toContain('108');
    });
  }

  it('no banned claims exist in UI screens and component code', () => {
    const scanDir = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
          for (const banned of bannedClaims) {
            // Check that strings in code don't claim banned phrases (excluding test/mock assertions)
            if (!entry.name.includes('.test.')) {
              expect(
                content.includes(`"${banned}"`) || content.includes(`'${banned}'`),
                `Banned claim literal "${banned}" found in ${entry.name}`
              ).toBe(false);
            }
          }
        }
      }
    };

    scanDir(path.resolve('src', 'ui'));
  });

  it('cited public health sources exist in all languages', () => {
    for (const [lang, dict] of Object.entries(dicts)) {
      expect((dict as any)['s6.symptoms_source']).toMatch(/NDMA|NIOSH|CDC|தேசிய பேரிடர்|राष्ट्रीय आपदा/);
      expect((dict as any)['s6.hydration_source']).toMatch(/NIOSH|CDC/);
      expect((dict as any)['s6.rights_source']).toMatch(/NDMA|தேசிய பேரிடர்|राष्ट्रीय आपदा/);
    }
  });
});

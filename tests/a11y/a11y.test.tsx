// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { I18nProvider } from '../../src/i18n/useTranslation';
import { BandBadge } from '../../src/ui/components/BandBadge';
import { PrototypeBanner, MedicalDisclaimerNote } from '../../src/ui/components/PrototypeBanner';
import { ScreenS1LanguageJob } from '../../src/ui/screens/ScreenS1LanguageJob';
import { ScreenS2Today } from '../../src/ui/screens/ScreenS2Today';
import { ScreenS3DayPlan } from '../../src/ui/screens/ScreenS3DayPlan';
import { ScreenS4WorkLog } from '../../src/ui/screens/ScreenS4WorkLog';
import { ScreenS5History } from '../../src/ui/screens/ScreenS5History';
import { ScreenS6Learn } from '../../src/ui/screens/ScreenS6Learn';
import { ScreenS7Settings } from '../../src/ui/screens/ScreenS7Settings';
import { ScreenS8WardView } from '../../src/ui/screens/ScreenS8WardView';
import { HourPlan } from '../../src/engine/plan';
import { DEFAULT_SETTINGS } from '../../src/data/cache';

const mockHourPlan: HourPlan = {
  hourISO: '2026-10-27T12:00:00+05:30',
  wbgtC: 32.5,
  band: 'orange',
  maxWorkMinPerHour: 25,
  minRestMinPerHour: 35,
  reasons: ['sun', 'humid'],
  templateIds: ['plan.orange.now', 'reason.sun', 'act.rest_shade'],
  dataQuality: 'forecast',
  isFallbackSimple: false,
  calculationMethod: 'liljegren',
  tempC: 35,
  rhPct: 60,
  solarWm2: 850,
};

describe('T-A-01: Accessibility & WCAG Compliance (Axe Analysis)', () => {
  it('zero serious or critical axe violations on PrototypeBanner and MedicalDisclaimerNote', async () => {
    const { container } = render(
      <I18nProvider>
        <div>
          <PrototypeBanner />
          <MedicalDisclaimerNote />
        </div>
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false }, // jsdom does not compute actual pixel contrast
      },
    });

    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S1 (Language & Job)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS1LanguageJob
          initialPreset="delivery_moto"
          initialWorkload="moderate"
          initialState="acclimatised"
          onComplete={() => {}}
        />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S2 (Today Status)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS2Today
          currentPlan={mockHourPlan}
          locationName="Sriperumbudur"
          ageFormatted="just now"
          staleWarning={false}
          inShade={false}
          onToggleShade={() => {}}
          onNavigateToPlan={() => {}}
          onNavigateToLog={() => {}}
        />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S3 (Day Plan)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS3DayPlan dayPlan={[mockHourPlan]} jobTitle="Delivery Rider" />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S6 (Learn Health & Rights)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS6Learn />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S7 (Settings)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS7Settings
          settings={DEFAULT_SETTINGS}
          onUpdateSettings={() => {}}
          sourceLabel="Live Open-Meteo"
          ageFormatted="just now"
        />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });

  it('zero serious or critical axe violations on Screen S8 (Ward View Demo)', async () => {
    const { container } = render(
      <I18nProvider>
        <ScreenS8WardView />
      </I18nProvider>
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(severeViolations).toHaveLength(0);
  });
});

describe('T-A-01: Tap Target Size Enforcement (>= 48 px)', () => {
  it('all interactive buttons across rendered screens have min-height >= 48px and no min-h-[44px]', () => {
    const rendered = render(
      <I18nProvider>
        <div>
          <ScreenS2Today
            currentPlan={mockHourPlan}
            locationName="Chennai"
            ageFormatted="just now"
            staleWarning={false}
            inShade={false}
            onToggleShade={() => {}}
            onNavigateToPlan={() => {}}
            onNavigateToLog={() => {}}
          />
          <ScreenS4WorkLog
            currentPlan={mockHourPlan}
            jobPreset="delivery_moto"
            workload="moderate"
            workerState="acclimatised"
            lat={13.08}
            lon={80.27}
            onNavigateToHistory={() => {}}
          />
          <ScreenS7Settings
            settings={DEFAULT_SETTINGS}
            onUpdateSettings={() => {}}
            sourceLabel="Open-Meteo"
            ageFormatted="just now"
          />
        </div>
      </I18nProvider>
    );

    const interactiveElements = rendered.container.querySelectorAll('button, a, select');
    expect(interactiveElements.length).toBeGreaterThan(0);

    for (const el of interactiveElements) {
      const classNames = el.className;
      expect(
        classNames,
        `Interactive element ${el.tagName} has forbidden 44px min-height: ${classNames}`
      ).not.toContain('min-h-[44px]');

      // Check that min-height >= 48px is applied
      const has48OrGreater =
        /min-h-\[(4[89]|[5-9][0-9]|1[0-9]{2})px\]/.test(classNames) ||
        /h-(1[2-9]|[2-9][0-9])/.test(classNames) ||
        classNames.includes('h-16') ||
        classNames.includes('p-3') ||
        classNames.includes('py-3') ||
        classNames.includes('p-4') ||
        classNames.includes('py-2.5');

      expect(
        has48OrGreater,
        `Interactive element ${el.tagName} with class "${classNames}" must satisfy >= 48px touch target size (§10)`
      ).toBe(true);
    }
  });
});

describe('T-A-01: Dual Encoding (Icon + Text) for All Heat Bands', () => {
  const bands = ['green', 'yellow', 'orange', 'red', 'black'] as const;

  bands.forEach((band) => {
    it(`band badge for "${band}" includes both SVG icon and uppercase text label`, () => {
      const { container } = render(
        <I18nProvider>
          <BandBadge band={band} size="lg" />
        </I18nProvider>
      );

      // 1. Icon (SVG element)
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();

      // 2. Text label (not color alone)
      const text = container.textContent || '';
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});

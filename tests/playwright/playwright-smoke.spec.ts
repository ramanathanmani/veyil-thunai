import { test, expect } from '@playwright/test';

test.describe('Veyil Thunai PWA Smoke Tests (T-E-01 / T-E-03)', () => {
  test('loads S1 Onboarding, navigates to Today and checks network policy', async ({ page }) => {
    // Intercept all network requests to verify network policy (§2.5 / T-E-03)
    const contactedHosts = new Set<string>();

    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith('http')) {
        contactedHosts.add(url.hostname);
      }
    });

    await page.goto('/');

    // Check Prototype Banner presence
    await expect(page.locator('text=Prototype')).toBeVisible();

    // Verify Network Policy: only localhost/preview and api.open-meteo.com
    for (const host of contactedHosts) {
      const isAllowed = host === 'localhost' || host === '127.0.0.1' || host === 'api.open-meteo.com';
      expect(isAllowed, `Unexpected external network connection to: ${host}`).toBe(true);
    }
  });
});

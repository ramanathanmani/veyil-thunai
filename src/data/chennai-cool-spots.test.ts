import { describe, it, expect } from 'vitest';
import coolSpotsData from './chennai-cool-spots.json';

describe('Chennai Cool Spots Static Data (Architecture M9 / Priority 1 Item 3)', () => {
  it('has valid metadata conforming to offline unofficial constraints', () => {
    expect(coolSpotsData.meta).toBeDefined();
    expect(coolSpotsData.meta.city).toBe('Chennai');
    expect(coolSpotsData.meta.verified).toBe(false);
    expect(coolSpotsData.meta.source).toBeDefined();
    expect(coolSpotsData.meta.note).toContain('Unofficial directory');
    expect(coolSpotsData.meta.note).toContain('Verify on site');
  });

  it('contains at least 10 hand-curated public spots in key Chennai hubs', () => {
    expect(Array.isArray(coolSpotsData.spots)).toBe(true);
    expect(coolSpotsData.spots.length).toBeGreaterThanOrEqual(10);
  });

  it('ensures each spot has required fields and valid categories', () => {
    const validTypes = new Set(['water', 'shade', 'rest_point', 'toilet']);

    for (const spot of coolSpotsData.spots) {
      expect(spot.id).toBeTruthy();
      expect(spot.name).toBeTruthy();
      expect(validTypes.has(spot.type)).toBe(true);
      expect(spot.area).toBeTruthy();
      expect(spot.address).toBeTruthy();
      expect(spot.notes).toBeTruthy();
      expect(typeof spot.verified).toBe('boolean');
      expect(typeof spot.hasToilet).toBe('boolean');
    }
  });

  it('contains representation across water, shade, rest, and toilet facilities', () => {
    const typesPresent = new Set(coolSpotsData.spots.map((s) => s.type));
    expect(typesPresent.has('water')).toBe(true);
    expect(typesPresent.has('shade')).toBe(true);
    expect(typesPresent.has('rest_point')).toBe(true);
    expect(coolSpotsData.spots.some((s) => s.hasToilet)).toBe(true);
  });

  it('does not contain any scraping, live API, or Google Places references', () => {
    const jsonString = JSON.stringify(coolSpotsData);
    expect(jsonString).not.toContain('google.com/maps');
    expect(jsonString).not.toContain('places.googleapis');
    expect(jsonString).not.toContain('scrape');
  });
});

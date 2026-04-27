import { describe, it, expect } from 'vitest';
import { easeInOutCubic, easeInOutSine } from './easing';

describe('Easing Utils', () => {
  describe('easeInOutCubic', () => {
    it('returns 0 when t is 0', () => {
      expect(easeInOutCubic(0)).toBe(0);
    });

    it('returns 1 when t is 1', () => {
      expect(easeInOutCubic(1)).toBe(1);
    });

    it('is non-linear (0.5 should be 0.5 for symmetric cubic)', () => {
      expect(easeInOutCubic(0.5)).toBe(0.5);
    });

    it('increases at a slower rate near 0 and 1', () => {
      // 0.1 should be smaller than 0.1 (it's ease-in)
      expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
      // 0.9 should be larger than 0.9 (it's ease-out)
      expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
    });
  });

  describe('easeInOutSine', () => {
    it('returns 0 when t is 0', () => {
      expect(easeInOutSine(0)).toBeCloseTo(0);
    });

    it('returns 1 when t is 1', () => {
      expect(easeInOutSine(1)).toBeCloseTo(1);
    });

    it('returns 0.5 when t is 0.5', () => {
      expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { calculateImageCoord, calculatePadding, calculateDefaultPoints } from './coords';

describe('coords utility', () => {
  describe('calculatePadding', () => {
    it('should calculate padding correctly for a given size', () => {
      const { padW, padH } = calculatePadding(1000, 500);
      expect(padW).toBe(200); // 1000 * 0.2
      expect(padH).toBe(100); // 500 * 0.2
    });
  });

  describe('calculateImageCoord', () => {
    it('should convert client coordinates to image coordinates correctly', () => {
      const rect = { left: 10, top: 10, width: 100, height: 100 };
      const canvasWidth = 500;
      const canvasHeight = 500;
      const paddingW = 50;
      const paddingH = 50;

      // Click at the center of the rect (60, 60 in screen coords)
      // (60 - 10) * (500/100) - 50 = 50 * 5 - 50 = 250 - 50 = 200
      const pos = calculateImageCoord(60, 60, rect, canvasWidth, canvasHeight, paddingW, paddingH);
      expect(pos.x).toBe(200);
      expect(pos.y).toBe(200);
    });

    it('should work with different scales', () => {
      const rect = { left: 0, top: 0, width: 1000, height: 2000 };
      const canvasWidth = 2000;
      const canvasHeight = 4000;
      const paddingW = 0;
      const paddingH = 0;

      const pos = calculateImageCoord(100, 200, rect, canvasWidth, canvasHeight, paddingW, paddingH);
      expect(pos.x).toBe(200); // 100 * 2
      expect(pos.y).toBe(400); // 200 * 2
    });
  });

  describe('calculateDefaultPoints', () => {
    it('should return 4 points for a given image size', () => {
      const points = calculateDefaultPoints(1000, 1000);
      expect(points).toHaveLength(4);
      expect(points[0]).toEqual({ x: 250, y: 250 });
      expect(points[1]).toEqual({ x: 750, y: 250 });
      expect(points[2]).toEqual({ x: 750, y: 750 });
      expect(points[3]).toEqual({ x: 250, y: 750 });
    });
  });
});

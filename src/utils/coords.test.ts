import { describe, it, expect } from 'vitest';
import { calculateImageCoord, calculateDefaultPoints, calculatePadding } from './coords';

describe('coords utility', () => {
  it('calculatePadding should return 20% of image size', () => {
    const result = calculatePadding(1000, 500);
    expect(result.padW).toBe(200);
    expect(result.padH).toBe(100);
  });

  it('calculateDefaultPoints should return normalized coordinates', () => {
    const points = calculateDefaultPoints();
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ x: 0.25, y: 0.25 });
    expect(points[2]).toEqual({ x: 0.75, y: 0.75 });
  });

  it('calculateImageCoord should return normalized coordinates correctly', () => {
    // Canvas: 1000x1000, Image: 500x500 within it
    // Rect: { left: 0, top: 0, width: 1000, height: 1000 }
    // padding: 0 (for simplicity)
    const rect = { left: 0, top: 0, width: 1000, height: 1000 };
    const canvasWidth = 1000;
    const canvasHeight = 1000;
    const paddingW = 0;
    const paddingH = 0;
    const imageW = 500;
    const imageH = 500;

    // Center of canvas should be center of image (0.5, 0.5)
    const pos = calculateImageCoord(500, 500, rect, canvasWidth, canvasHeight, paddingW, paddingH, imageW, imageH);
    expect(pos.x).toBe(1.0); // Wait, (500-0)*1 - 0 = 500. 500 / 500 = 1.0. Correct.
    
    // (250, 250) on canvas should be (0.5, 0.5) if image is 500x500 and starts at 0,0
    const pos2 = calculateImageCoord(250, 250, rect, canvasWidth, canvasHeight, paddingW, paddingH, imageW, imageH);
    expect(pos2.x).toBe(0.5);
    expect(pos2.y).toBe(0.5);
  });

  it('calculateImageCoord should handle padding correctly', () => {
    const rect = { left: 0, top: 0, width: 1000, height: 1000 };
    const canvasWidth = 1000;
    const canvasHeight = 1000;
    const paddingW = 100;
    const paddingH = 100;
    const imageW = 800;
    const imageH = 800;

    // Mouse at 100, 100 (which is the top-left of the image after padding)
    const pos = calculateImageCoord(100, 100, rect, canvasWidth, canvasHeight, paddingW, paddingH, imageW, imageH);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);

    // Mouse at 900, 900 (bottom-right of the image)
    const pos2 = calculateImageCoord(900, 900, rect, canvasWidth, canvasHeight, paddingW, paddingH, imageW, imageH);
    expect(pos2.x).toBe(1);
    expect(pos2.y).toBe(1);
  });
});

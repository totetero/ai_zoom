import { describe, it, expect } from 'vitest';
import { calculateFadeOpacities } from './fade';

describe('calculateFadeOpacities', () => {
  it('should return innerOpacity=1 and outerOpacity=0 when p=0', () => {
    const { innerOpacity, outerOpacity } = calculateFadeOpacities(0);
    expect(innerOpacity).toBe(1);
    expect(outerOpacity).toBe(0);
  });

  it('should return innerOpacity=0 and outerOpacity=1 when p=1', () => {
    const { innerOpacity, outerOpacity } = calculateFadeOpacities(1);
    expect(innerOpacity).toBe(0);
    expect(outerOpacity).toBe(1);
  });

  it('should fade in outerOpacity between p=0 and p=0.2', () => {
    expect(calculateFadeOpacities(0.1).outerOpacity).toBe(0.5);
    expect(calculateFadeOpacities(0.2).outerOpacity).toBeCloseTo(1);
    expect(calculateFadeOpacities(0.3).outerOpacity).toBe(1);
  });

  it('should fade out innerOpacity between p=0.8 and p=1.0', () => {
    expect(calculateFadeOpacities(0.7).innerOpacity).toBe(1);
    expect(calculateFadeOpacities(0.8).innerOpacity).toBeCloseTo(1);
    expect(calculateFadeOpacities(0.9).innerOpacity).toBeCloseTo(0.5);
    expect(calculateFadeOpacities(1.0).innerOpacity).toBe(0);
  });

  it('should handle custom threshold', () => {
    const threshold = 0.5;
    expect(calculateFadeOpacities(0.25, threshold).outerOpacity).toBe(0.5);
    expect(calculateFadeOpacities(0.75, threshold).innerOpacity).toBe(0.5);
  });
});

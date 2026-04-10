import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePreloadImages, type FrameData } from './usePreloadImages';

describe('usePreloadImages', () => {
  const mockFrames: FrameData[] = [
    { id: 1, filename: 'test1.jpg', year: 2020, age:0, message: 'test1' },
    { id: 2, filename: 'test2.jpg', year: 2021, age:1, message: 'test2' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    // mock global Image
    const MockImage = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src: string = '';
      constructor() {
        setTimeout(() => {
          if (this.src.includes('error')) {
            this.onerror();
          } else {
            this.onload();
          }
        }, 0);
      }
    };
    vi.stubGlobal('Image', MockImage);
  });

  it('should initialize with empty images and 0 progress', () => {
    const { result } = renderHook(() => usePreloadImages(mockFrames));
    expect(result.current.images).toEqual([]);
    expect(result.current.progress).toBe(0);
    expect(result.current.isReady).toBe(false);
  });

  it('should update progress and images when loading succeeds', async () => {
    const { result } = renderHook(() => usePreloadImages(mockFrames));

    // Wait for all images to "load" (based on our setTimeout mock)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.progress).toBe(100);
    expect(result.current.images).toHaveLength(2);
    expect(result.current.isReady).toBe(true);
  });

  it('should handle empty frames list', () => {
    const { result } = renderHook(() => usePreloadImages([]));
    expect(result.current.progress).toBe(100);
    expect(result.current.images).toEqual([]);
    expect(result.current.isReady).toBe(true);
  });

  it('should handle loading errors by falling back (mocked behavior)', async () => {
    const errorFrames: FrameData[] = [
      { id: 1, filename: 'error.jpg', year: 2020, age:0, message: 'error' }
    ];

    // Note: The real hook creates a canvas and a new Image for fallback.
    // Our Image mock will also "load" the dataURL.
    
    const { result } = renderHook(() => usePreloadImages(errorFrames));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.progress).toBe(100);
    expect(result.current.images).toHaveLength(1);
    expect(result.current.isReady).toBe(true);
  });
});

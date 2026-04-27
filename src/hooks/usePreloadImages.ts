import { useState, useEffect } from 'react';

export type FrameData = {
  id: number;
  filename: string;
  year: string | number;
  age: number;
  message: string;
  frameRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  points?: { x: number; y: number }[] | null;
};

export function usePreloadImages(
  frames: FrameData[],
  baseUrl: string = '/src/assets/img/'
) {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (frames.length === 0) {
      setImages([]);
      setProgress(100);
      return;
    }

    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = new Array(frames.length);

    frames.forEach((frame, index) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        loadedImages[index] = img;
        setProgress((loadedCount / frames.length) * 100);
        if (loadedCount === frames.length) {
          setImages(loadedImages);
        }
      };
      
      img.onerror = () => {
        console.warn(`Failed to preload image: ${frame.filename}`);
        
        // ダミー描画用のCanvasフォールバックを生成
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = index % 2 === 0 ? '#ffcccb' : '#add8e6';
          ctx.fillRect(0, 0, 1024, 768);
          ctx.fillStyle = '#000';
          ctx.font = '48px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Dummy ${frame.age} yo`, 512, 384);
        }
        
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          loadedImages[index] = fallbackImg;
          loadedCount++;
          setProgress((loadedCount / frames.length) * 100);
          if (loadedCount === frames.length) {
             setImages(loadedImages);
          }
        }
        fallbackImg.src = canvas.toDataURL();
      };

      const cleanBaseUrl = baseUrl.startsWith('/') ? baseUrl.slice(1) : baseUrl;
      const fullBaseUrl = import.meta.env.BASE_URL + cleanBaseUrl;
      img.src = `${fullBaseUrl}${frame.filename}`;
    });
  }, [frames, baseUrl]);

  return { images, progress, isReady: progress === 100 && images.length === frames.length };
}

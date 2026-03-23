import React, { useRef, useEffect } from 'react';
import type { FrameData } from '../hooks/usePreloadImages';

interface ZoomCanvasProps {
  frames: FrameData[];
  images: HTMLImageElement[];
  progress: number; // 0.0 ~ (frames.length - 1)
  width: number;
  height: number;
}

export const ZoomCanvas: React.FC<ZoomCanvasProps> = ({ frames, images, progress, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let idx = Math.floor(progress);
    let p = progress - idx; // 0.0 ~ 1.0

    if (idx >= frames.length - 1) {
      idx = frames.length - 2;
      p = 1.0;
    }
    if (idx < 0) {
      idx = 0;
      p = 0.0;
    }

    const outerIdx = idx + 1;
    const innerIdx = idx;
    
    const outerImg = images[outerIdx];
    const innerImg = images[innerIdx];
    const frameRect = frames[outerIdx]?.frameRect;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    if (!frameRect || !outerImg || !innerImg) {
      if (innerImg) ctx.drawImage(innerImg, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // カメラの補間 (p=0:ズームイン状態 -> p=1:ズームアウト/等倍状態)
    
    // 画像の基準描画サイズ（Canvasサイズに合わせるカバー/コンテイン処理、今回はシンプルに画面サイズ全体に引き伸ばす前提のモック）
    const drawW = width;
    const drawH = height;
    const offsetX = 0;
    const offsetY = 0;

    const targetX = frameRect.x * (width / 1024); // 1024x768ベースを画面実サイズに合わせる仮計算
    const targetY = frameRect.y * (height / 768);
    const targetW = frameRect.width * (width / 1024);
    const targetH = frameRect.height * (height / 768);
    const targetRot = frameRect.rotation * (Math.PI / 180);

    const targetCX = targetX + targetW / 2;
    const targetCY = targetY + targetH / 2;
    const screenCX = width / 2;
    const screenCY = height / 2;

    const scale0 = Math.max(width / targetW, height / targetH);
    const scale1 = 1;

    // 指数補間によるスケール
    const currentScale = Math.exp((1 - p) * Math.log(scale0) + p * Math.log(scale1));
    const currentRot = (1 - p) * (-targetRot);

    ctx.translate(screenCX, screenCY);
    ctx.rotate(currentRot);
    ctx.scale(currentScale, currentScale);
    
    // 焦点の移動
    const currentFocusX = (1 - p) * targetCX + p * screenCX;
    const currentFocusY = (1 - p) * targetCY + p * screenCY;
    ctx.translate(-currentFocusX, -currentFocusY);

    // 外側の画像（今年の写真）を描画
    ctx.drawImage(outerImg, offsetX, offsetY, drawW, drawH);

    // 内側の画像（去年の写真）を、額縁の位置に重ねて描画
    ctx.save();
    ctx.translate(targetCX, targetCY);
    ctx.rotate(targetRot);
    ctx.drawImage(innerImg, -targetW/2, -targetH/2, targetW, targetH);
    ctx.restore();

    ctx.restore();
  }, [frames, images, progress, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', maxWidth: '100vw', maxHeight: '100vh', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />;
};

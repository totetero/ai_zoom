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

    const outerImg = images[idx + 1];
    const innerImg = images[idx];
    const framePoints = frames[idx + 1]?.points;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // エラーフォールバック
    if (!framePoints || framePoints.length !== 4 || !outerImg || !innerImg) {
      if (innerImg) ctx.drawImage(innerImg, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // 画面中心
    const screenCX = width / 2;
    const screenCY = height / 2;

    const getContainScale = (img: HTMLImageElement) => {
      return Math.min(width / img.width, height / img.height);
    };

    const outerBaseScale = getContainScale(outerImg);
    const outerW = outerImg.width * outerBaseScale;
    const outerH = outerImg.height * outerBaseScale;
    const outerLeft = -outerW / 2;
    const outerTop = -outerH / 2;

    // jsonBase はオリジナルの画像サイズ
    const jsonBaseW = outerImg.width;
    const jsonBaseH = outerImg.height;

    // pointsをOuter画像の画面上描画サイズ座標系にマッピング
    const scaleX = outerW / jsonBaseW;
    const scaleY = outerH / jsonBaseH;
    const p0 = { x: outerLeft + framePoints[0].x * scaleX, y: outerTop + framePoints[0].y * scaleY };
    const p1 = { x: outerLeft + framePoints[1].x * scaleX, y: outerTop + framePoints[1].y * scaleY };
    const p3 = { x: outerLeft + framePoints[3].x * scaleX, y: outerTop + framePoints[3].y * scaleY };

    // --- Inner画像の変形パラメータ計算 ---
    // p0 (左上), p1 (右上), p3 (左下) からアフィン変換を取り出す
    const dxX = p1.x - p0.x;
    const dyX = p1.y - p0.y;
    const dxY = p3.x - p0.x;
    const dyY = p3.y - p0.y;

    // 回転角(X軸の傾き)
    const rot = Math.atan2(dyX, dxX);
    // スケールX (Inner画像の横幅に対する描画幅)
    const lenX = Math.sqrt(dxX * dxX + dyX * dyX);
    const innerScaleX = lenX / innerImg.width;

    // Y軸ベクトルの逆回転(X軸を水平に戻した状態でのY軸ベクトル)
    const lx = dxY * Math.cos(-rot) - dyY * Math.sin(-rot);
    const ly = dxY * Math.sin(-rot) + dyY * Math.cos(-rot);

    // スケールY と シアーX (傾き)
    // Canvasの Y方向の基底ベクトル (0, lenY) が (lx, ly)にマッピングされる
    const innerScaleY = ly / innerImg.height;
    const innerSkewX = lx / ly; // tan(phi)

    // Innerの中心座標 (Outer空間)
    const innerCX = innerImg.width / 2;
    const innerCY = innerImg.height / 2;
    const localCX = innerCX * innerScaleX + innerCY * innerScaleY * innerSkewX;
    const localCY = innerCY * innerScaleY;
    const targetCX = p0.x + localCX * Math.cos(rot) - localCY * Math.sin(rot);
    const targetCY = p0.y + localCX * Math.sin(rot) + localCY * Math.cos(rot);

    // --- カメラのパラメータ計算 ---
    const innerBaseScale = getContainScale(innerImg);

    // p=1 (Outer画像が全体表示) のときのカメラ
    const camTransX1 = 0;
    const camTransY1 = 0;
    const camRot1 = 0;
    const camScaleX1 = 1;
    const camScaleY1 = 1;
    const camSkewX1 = 0;

    // p=0 (Inner画像が画面に歪みなく全体表示) のときのカメラ
    // Outerの世界を逆変形してInnerを正面・非シアー状態にする
    const camTransX0 = targetCX;
    const camTransY0 = targetCY;
    const camRot0 = rot;
    const camScaleX0 = innerBaseScale / innerScaleX;
    const camScaleY0 = innerBaseScale / innerScaleY;
    const camSkewX0 = innerSkewX;

    // パラメータの補間
    // スケールは指数補間を用いて自然なズームを実現
    const currentScaleX = Math.exp((1 - p) * Math.log(camScaleX0) + p * Math.log(camScaleX1));
    const currentScaleY = Math.exp((1 - p) * Math.log(camScaleY0) + p * Math.log(camScaleY1));
    const currentRot = (1 - p) * camRot0 + p * camRot1;
    const currentTransX = (1 - p) * camTransX0 + p * camTransX1;
    const currentTransY = (1 - p) * camTransY0 + p * camTransY1;
    const currentSkewX = (1 - p) * camSkewX0 + p * camSkewX1;

    // --- 【描画】 ---
    ctx.translate(screenCX, screenCY); // 画面中央を原点

    // カメラスペースへの変換 (逆変換を適用)
    ctx.scale(currentScaleX, currentScaleY);
    ctx.transform(1, 0, -currentSkewX, 1, 0, 0); // スキューの逆
    ctx.rotate(-currentRot);
    ctx.translate(-currentTransX, -currentTransY);

    // Outer画像の描画
    ctx.drawImage(outerImg, -outerW / 2, -outerH / 2, outerW, outerH);

    // Inner画像の描画（アフィン変換で矩形を歪ませてパースに合わせて描画）
    ctx.save();
    const W = innerImg.width;
    const H = innerImg.height;
    const a = (p1.x - p0.x) / W;
    const b = (p1.y - p0.y) / W;
    const c = (p3.x - p0.x) / H;
    const d = (p3.y - p0.y) / H;
    const e = p0.x;
    const f = p0.y;
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(innerImg, 0, 0, W, H);
    ctx.restore();

    ctx.restore();
  }, [frames, images, progress, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', maxWidth: '100vw', maxHeight: '100vh', margin: '0 auto' }} />;
};

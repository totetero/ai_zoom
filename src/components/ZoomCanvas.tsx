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
    const frameRect = frames[idx + 1]?.frameRect;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // エラーフォールバック
    if (!frameRect || !outerImg || !innerImg) {
      if (innerImg) ctx.drawImage(innerImg, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // 画面中心
    const screenCX = width / 2;
    const screenCY = height / 2;

    // 「画像を画面（ウィンドウ）に全体が収まるように(contain)描画するレイアウトスケール」
    // Outer・Innerそれぞれが全画面化された時にこのスケールがベースになる。
    // ※今回は画面サイズに合わせてCover（黒帯なし）にするかContain（黒帯あり）にするか。
    // 背景が黒なので Contain の方が全てが見えて安全。
    const getContainScale = (img: HTMLImageElement) => {
      return Math.min(width / img.width, height / img.height);
    };

    const outerBaseScale = getContainScale(outerImg);
    
    // Outer画像の空間における座標系（左上が原点）
    // Outer画像を画面中央に置いた場合、左上の座標はどこになるか
    const outerW = outerImg.width * outerBaseScale;
    const outerH = outerImg.height * outerBaseScale;
    const outerLeft = -outerW / 2;
    const outerTop = -outerH / 2;

    // frameRect はOuter画像(元寸法)上での位置として定義されているとする
    // ここから、描画座標系(Outer画像の中心を0,0とした系)での、額縁の中心とスケールを求める
    // jsonのframeRectがどの座標系か不明だが、おそらく「1024x768 を基準とした相対座標」のはず。
    // 元プロトタイプでの仮定: 1024x768 基準
    const jsonBaseW = 1024;
    const jsonBaseH = 768;

    // Outer画像の描画サイズ(outerW, outerH) に対する frameRect の比率計算
    const frameX = (frameRect.x / jsonBaseW) * outerW;
    const frameY = (frameRect.y / jsonBaseH) * outerH;
    const frameW = (frameRect.width / jsonBaseW) * outerW;
    const frameH = (frameRect.height / jsonBaseH) * outerH;
    const frameRot = frameRect.rotation * (Math.PI / 180);

    // 額縁の中心座標（Outer画像中心を原点としたローカル座標）
    const targetCX = outerLeft + frameX + frameW / 2;
    const targetCY = outerTop + frameY + frameH / 2;

    // Inner画像を額縁に収めるためのローカルスケール
    // Inner画像を額縁の枠いっぱいに(coverするように)広げる
    const innerScaleX = frameW / innerImg.width;
    const innerScaleY = frameH / innerImg.height;
    const innerScale = Math.max(innerScaleX, innerScaleY);

    // 【カメラのトランスフォーム計算】
    // p=1 のとき:
    // Outer画像が画面中央に、OuterBaseScaleでそのまま見える状態。（つまりローカルの世界で scale=1, rot=0, trans=0）
    const camTransX1 = 0;
    const camTransY1 = 0;
    const camScale1 = 1;
    const camRot1 = 0;

    // p=0 のとき:
    // Inner画像が画面中央に、InnerのためのBaseScale（getContainScale(innerImg)）で見える状態。
    // まず、カメラが targetCX, targetCY に移動し、frameRot 分だけ回転を相殺する。
    // その上で、Inner画像が画面いっぱいに広がるように全体を拡大する。
    const innerBaseScale = getContainScale(innerImg);
    // 必要な世界全体の拡大率 = (Inner自身が画面に収まるスケール) / (Innerが額縁に収まるローカルスケール)
    const camScale0 = innerBaseScale / innerScale;
    // カメラは額縁の中心を覗き込む
    const camTransX0 = targetCX;
    const camTransY0 = targetCY;
    // カメラの回転は額縁の回転を相殺する
    const camRot0 = frameRot;

    // 補間 (指数スケールを使うとズームが自然になる)
    const currentScale = Math.exp((1 - p) * Math.log(camScale0) + p * Math.log(camScale1));
    const currentRot = (1 - p) * camRot0 + p * camRot1;
    const currentCamX = (1 - p) * camTransX0 + p * camTransX1;
    const currentCamY = (1 - p) * camTransY0 + p * camTransY1;

    // --- 【描画】 ---
    ctx.translate(screenCX, screenCY); // 画面中央を原点に

    // カメラの変換（カメラが x, y に移動して scale, rot する = 世界をその逆へ動かす）
    ctx.scale(currentScale, currentScale);
    ctx.rotate(-currentRot);
    ctx.translate(-currentCamX, -currentCamY);

    // 世界の原点(0,0) は Outer画像の中心。
    // Outer画像の描画（アスペクト比を維持したそのままの画像）
    ctx.drawImage(outerImg, -outerW / 2, -outerH / 2, outerW, outerH);

    // Inner画像の描画（額縁の位置へ）
    ctx.save();
    ctx.translate(targetCX, targetCY);
    ctx.rotate(frameRot);
    
    // Inner画像をそのままの比率で描く（中心合わせ）
    const drawInnerW = innerImg.width * innerScale;
    const drawInnerH = innerImg.height * innerScale;
    ctx.drawImage(innerImg, -drawInnerW / 2, -drawInnerH / 2, drawInnerW, drawInnerH);
    ctx.restore();

    ctx.restore();
  }, [frames, images, progress, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', maxWidth: '100vw', maxHeight: '100vh', margin: '0 auto' }} />;
};

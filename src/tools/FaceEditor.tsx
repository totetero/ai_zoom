import React, { useState, useRef, useEffect } from 'react';
import type { FrameData } from '../hooks/usePreloadImages';
import { calculateImageCoord, calculatePadding } from '../utils/coords';

interface FaceEditorProps {
  frames: FrameData[];
  images: HTMLImageElement[];
  onClose: () => void;
}

export const FaceEditor: React.FC<FaceEditorProps> = ({ frames, images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null); // マスク描画用（非表示または合成用）

  // 初期化：マスク用キャンバスの作成
  useEffect(() => {
    const img = images[currentIndex];
    if (!img || !maskCanvasRef.current) return;
    
    maskCanvasRef.current.width = img.width;
    maskCanvasRef.current.height = img.height;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (mctx) {
      mctx.clearRect(0, 0, img.width, img.height);
    }
  }, [currentIndex, images]);

  // 描画ループ
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[currentIndex];
    if (!img) return;

    const { padW, padH } = calculatePadding(img.width, img.height);
    const totalW = img.width + padW * 2;
    const totalH = img.height + padH * 2;

    const maxHeight = window.innerHeight - 300;
    const scale = Math.min((window.innerWidth - 100) / totalW, maxHeight / totalH);
    const displayW = totalW * scale;
    const displayH = totalH * scale;

    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    // 1. 背景
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, totalW, totalH);

    // 2. 元画像
    ctx.drawImage(img, padW, padH);

    // 3. マスクの重ね合わせ表示 (半透明の赤)
    if (maskCanvasRef.current) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(maskCanvasRef.current, padW, padH);
      ctx.globalAlpha = 1.0;
    }

    // 4. フレーム（保護区域）の表示
    const points = frames[currentIndex]?.points;
    if (points && points.length === 4) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 5 / scale;
      ctx.setLineDash([10 / scale, 5 / scale]);
      ctx.beginPath();
      ctx.moveTo(points[0].x + padW, points[0].y + padH);
      for (let i = 1; i < 4; i++) ctx.lineTo(points[i].x + padW, points[i].y + padH);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // ラベル
      ctx.fillStyle = '#ff0000';
      ctx.font = `${20 / scale}px sans-serif`;
      ctx.fillText('PROTECTED FRAME AREA (DO NOT PAINT HERE)', points[0].x + padW, points[0].y + padH - 10);
    }

  }, [currentIndex, images, frames, isDrawing]);

  const getPos = (e: React.MouseEvent | MouseEvent) => {
    const canvas = mainCanvasRef.current;
    const img = images[currentIndex];
    if (!canvas || !img) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { padW, padH } = calculatePadding(img.width, img.height);
    return calculateImageCoord(e.clientX, e.clientY, rect, canvas.width, canvas.height, padW, padH);
  };

  const drawMask = (pos: {x: number, y: number}) => {
    const mcanvas = maskCanvasRef.current;
    if (!mcanvas) return;
    const mctx = mcanvas.getContext('2d');
    if (!mctx) return;

    mctx.fillStyle = 'rgba(255, 0, 0, 1)'; // マスク色
    mctx.beginPath();
    mctx.arc(pos.x, pos.y, brushSize, 0, Math.PI * 2);
    mctx.fill();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    drawMask(getPos(e));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    drawMask(getPos(e));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const mcanvas = maskCanvasRef.current;
    if (!mcanvas) return;
    const mctx = mcanvas.getContext('2d');
    if (mctx) mctx.clearRect(0, 0, mcanvas.width, mcanvas.height);
  };

  const handleExport = () => {
    const mcanvas = maskCanvasRef.current;
    if (!mcanvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = mcanvas.width;
    exportCanvas.height = mcanvas.height;
    const ectx = exportCanvas.getContext('2d');
    if (!ectx) return;

    // 背景を黒、マスク部分を白にする（一般的なインペインティング用マスク）
    ectx.fillStyle = 'black';
    ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // マスク部分（赤で描画されている部分）を白として抽出
    // 今回は単純に mcanvas の内容を白に変換して描く
    ectx.globalCompositeOperation = 'source-over';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mcanvas.width;
    tempCanvas.height = mcanvas.height;
    const tctx = tempCanvas.getContext('2d');
    if (tctx) {
      tctx.drawImage(mcanvas, 0, 0);
      tctx.globalCompositeOperation = 'source-in';
      tctx.fillStyle = 'white';
      tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ectx.drawImage(tempCanvas, 0, 0);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    const originalName = frames[currentIndex]?.filename || `image_${currentIndex}`;
    const maskName = originalName.replace(/\.[^/.]+$/, "") + "_mask.png";
    
    link.download = maskName;
    link.href = dataUrl;
    link.click();
    
    alert(`${maskName} をダウンロードしました。外部AIツール（Photoshopのジェネレーティブ塗りつぶし等）でこのマスクを使用して顔を書き換えてください。`);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#222', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close Editor</button>
        <button onClick={() => setCurrentIndex(Math.max(1, currentIndex - 1))} disabled={currentIndex <= 1} style={{ padding: '8px 16px' }}>Prev</button>
        <span style={{ color: 'white' }}>Image: {frames[currentIndex]?.filename}</span>
        <button onClick={() => setCurrentIndex(Math.min(frames.length - 1, currentIndex + 1))} disabled={currentIndex >= frames.length - 1} style={{ padding: '8px 16px' }}>Next</button>
        
        <div style={{ width: '20px' }} />
        <label style={{ color: 'white' }}>Brush Size: </label>
        <input type="range" min="5" max="200" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} />
        <button onClick={handleClear} style={{ padding: '8px 16px' }}>Clear Mask</button>
        <button onClick={handleExport} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px' }}>Export Mask</button>
      </div>

      <div style={{ position: 'relative', border: '2px solid #555', cursor: 'crosshair' }}>
        <canvas 
          ref={mainCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {/* 作業用隠しキャンバス */}
        <canvas ref={maskCanvasRef} style={{ display: 'none' }} />
      </div>
      
      <div style={{ marginTop: '10px', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>
        赤い点線エリア（フレーム）を避けて、娘さんの顔をなぞってください。<br />
        マスク部分は外部のAIツールで書き換える際の指定範囲になります。
      </div>
    </div>
  );
};

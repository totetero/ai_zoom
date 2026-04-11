import React, { useState, useRef, useEffect } from 'react';
import type { FrameData } from '../hooks/usePreloadImages';

import { type Point, calculateImageCoord, calculatePadding, calculateDefaultPoints } from '../utils/coords';
import { getHomographyMatrix4 } from '../utils/homography';

export const FrameEditor: React.FC<{ frames: FrameData[], images: HTMLImageElement[], onClose: () => void }> = ({ frames, images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [allData, setAllData] = useState<FrameData[]>([...frames]);
  const [showOverlay, setShowOverlay] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. currentIndexが変更されたときに、対応するフレームのpointsをステートにセット
  useEffect(() => {
    const currentFrame = allData[currentIndex];
    if (currentFrame && currentFrame.points && currentFrame.points.length > 0) {
      setPoints(currentFrame.points);
    } else if (images[currentIndex]) {
      const img = images[currentIndex];
      const defaultPoints = calculateDefaultPoints(img.width, img.height);
      setPoints(defaultPoints);
      // allDataも初期化
      setAllData(prev => {
        const newData = [...prev];
        newData[currentIndex] = { ...newData[currentIndex], points: defaultPoints };
        return newData;
      });
    }
  }, [currentIndex, images]);

  // 2. 描画ロジック
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[currentIndex];
    if (!img) return;

    const { padW, padH } = calculatePadding(img.width, img.height);
    const totalW = img.width + padW * 2;
    const totalH = img.height + padH * 2;

    const maxHeight = window.innerHeight - 350;
    const scale = Math.min(900 / totalW, maxHeight / totalH);
    const displayW = totalW * scale;
    const displayH = totalH * scale;
    
    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background for "outside" area
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw image
    ctx.drawImage(img, padW, padH);

    // Draw image border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, 2 / scale);
    ctx.strokeRect(padW, padH, img.width, img.height);

    // Draw lines
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = Math.max(2, 5 / scale);
    if (points.length === 4) {
      ctx.beginPath();
      ctx.moveTo(points[0].x + padW, points[0].y + padH);
      for (let i = 1; i < 4; i++) ctx.lineTo(points[i].x + padW, points[i].y + padH);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw handles
    points.forEach((p, i) => {
      ctx.fillStyle = draggingIndex === i ? '#ffff00' : '#ff0000';
      ctx.beginPath();
      ctx.arc(p.x + padW, p.y + padH, Math.max(8, 18 / scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1, 2 / scale);
      ctx.strokeStyle = 'white';
      ctx.stroke();
    });

  }, [currentIndex, images, points, draggingIndex, allData]);

  const updateAllData = (newPoints: Point[], updateText: boolean = true) => {
    setAllData(prev => {
      const newData = [...prev];
      newData[currentIndex] = { ...newData[currentIndex], points: newPoints };
      if (updateText) {
        setGeneratedHtml(JSON.stringify(newData, null, 2));
      }
      return newData;
    });
  };

  const getCanvasMousePos = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    const img = images[currentIndex];
    if (!canvas || !img) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const { padW, padH } = calculatePadding(img.width, img.height);

    return calculateImageCoord(
      e.clientX,
      e.clientY,
      rect,
      canvas.width,
      canvas.height,
      padW,
      padH
    );
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const threshold = 20 * scale;

    const index = points.findIndex(p => {
      const dx = p.x - pos.x;
      const dy = p.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < threshold;
    });

    if (index !== -1) {
      setDraggingIndex(index);
    }
  };

  // Window-level events for better dragging
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const pos = getCanvasMousePos(e);
      setPoints(prev => {
        const next = [...prev];
        next[draggingIndex] = pos;
        return next;
      });
    };

    const handleWindowMouseUp = () => {
      setDraggingIndex(null);
      updateAllData(points);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingIndex, points]); // We need points here to save the latest state on MouseUp

  const handleReset = () => {
    if (!images[currentIndex]) return;
    const img = images[currentIndex];
    const defaultPoints = calculateDefaultPoints(img.width, img.height);
    setPoints(defaultPoints);
    updateAllData(defaultPoints);
  };

  const handleNext = () => {
    if (currentIndex < Object.keys(images).length - 1) { // images array might have empty slots, so check capacity or bounds roughly
      setCurrentIndex(currentIndex + 1);
    }
  };
  const handlePrev = () => {
    if (currentIndex > 1) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const overlayInfo = React.useMemo(() => {
    const img = images[currentIndex];
    const prevImg = images[currentIndex - 1] || images[0];
    if (!img || !prevImg || !points || points.length !== 4) return null;

    const { padW, padH } = calculatePadding(img.width, img.height);
    const totalW = img.width + padW * 2;
    const totalH = img.height + padH * 2;

    const maxHeight = window.innerHeight - 350;
    const scale = Math.min(900 / totalW, maxHeight / totalH);
    const displayW = totalW * scale;
    const displayH = totalH * scale;

    const src = [
      { x: 0, y: 0 },
      { x: prevImg.width, y: 0 },
      { x: prevImg.width, y: prevImg.height },
      { x: 0, y: prevImg.height }
    ];
    const dst = points.map(p => ({
      x: (p.x + padW) * scale,
      y: (p.y + padH) * scale
    }));
    
    try {
      const m = getHomographyMatrix4(src, dst);
      return {
        matrix: `matrix3d(${m.elements.join(',')})`,
        displayW,
        displayH,
        prevImg,
        imgWidth: prevImg.width,
        imgHeight: prevImg.height
      };
    } catch (e) {
      return null;
    }
  }, [currentIndex, images, points]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#222', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close Editor</button>
        <button onClick={handlePrev} disabled={currentIndex <= 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Prev Image</button>
        <span style={{ color: 'white', fontWeight: 'bold' }}>Image {currentIndex} / {frames.length - 1} ({frames[currentIndex]?.filename})</span>
        <button onClick={handleNext} disabled={currentIndex >= frames.length - 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Next Image</button>
        <button onClick={handleReset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset to Default</button>
        <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#444', padding: '5px 10px', borderRadius: '4px' }}>
          <input type="checkbox" checked={showOverlay} onChange={e => setShowOverlay(e.target.checked)} />
          Show Overlay (Prev Image)
        </label>
      </div>
      <p style={{ margin: '5px', color: '#ccc' }}>Drag the 4 handles to adjust the magnification area.</p>
      
      <div style={{ position: 'relative', marginTop: '10px' }}>
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          style={{ cursor: draggingIndex !== null ? 'grabbing' : 'crosshair', border: '1px solid #999', backgroundColor: '#222', display: 'block' }} 
        />
        {showOverlay && overlayInfo && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: overlayInfo.displayW, 
            height: overlayInfo.displayH, 
            pointerEvents: 'none', 
            overflow: 'hidden' 
          }}>
            <img 
              src={overlayInfo.prevImg.src} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: overlayInfo.imgWidth, 
                height: overlayInfo.imgHeight, 
                transformOrigin: '0 0', 
                transform: overlayInfo.matrix, 
                opacity: 0.5 
              }} 
            />
          </div>
        )}
      </div>

      {generatedHtml && (
        <div style={{ width: '80%', marginTop: '20px' }}>
          <p style={{ color: '#0f0', margin: '5px 0' }}>Data Copied/Ready (replace inside src/assets/data/frames.json):</p>
          <textarea style={{ width: '100%', height: '200px', fontFamily: 'monospace', padding: '10px', background: '#111', color: '#fff', border: '1px solid #444' }} value={generatedHtml} readOnly onClick={(e) => { (e.target as HTMLTextAreaElement).select(); navigator.clipboard.writeText(generatedHtml); }} />
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import type { FrameData } from '../hooks/usePreloadImages';

interface Point { x: number; y: number; }

export const FrameEditor: React.FC<{ frames: FrameData[], images: HTMLImageElement[], onClose: () => void }> = ({ frames, images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [allData, setAllData] = useState<FrameData[]>([...frames]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[currentIndex];
    if (!img) return;

    // Canvas size fitting to Window or specific size
    const maxHeight = window.innerHeight - 300;
    const scale = Math.min(800 / img.width, maxHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    
    canvas.width = img.width;   // オリジナル解像度で内部描画
    canvas.height = img.height;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw points & lines
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = Math.max(2, 5 / scale); // 表示スケールに合わせて線の太さを調整

    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(5, 10 / scale), 0, Math.PI * 2);
      ctx.fill();
      
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(points[i-1].x, points[i-1].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      if (i === 3) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.stroke();
      }
    });

  }, [currentIndex, images, points]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (points.length >= 4) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    if (newPoints.length === 4) {
      calculateRect(newPoints);
    }
  };

  const calculateRect = (pts: Point[]) => {
    // 0: top-left, 1: top-right, 2: bottom-right, 3: bottom-left (想定)
    const w = Math.sqrt(Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2));
    const h = Math.sqrt(Math.pow(pts[3].x - pts[0].x, 2) + Math.pow(pts[3].y - pts[0].y, 2));
    const rotRad = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const rotDeg = rotRad * (180 / Math.PI);

    const newFrameRect = {
      x: pts[0].x,
      y: pts[0].y,
      width: Math.round(w),
      height: Math.round(h),
      rotation: Math.round(rotDeg * 100) / 100 // 小数点第2位まで
    };

    const newData = [...allData];
    newData[currentIndex] = { ...newData[currentIndex], frameRect: newFrameRect };
    setAllData(newData);
    setGeneratedHtml(JSON.stringify(newData, null, 2));
  };

  const handleNext = () => {
    if (currentIndex < Object.keys(images).length - 1) { // images array might have empty slots, so check capacity or bounds roughly
      setCurrentIndex(currentIndex + 1);
      setPoints([]);
    }
  };
  const handlePrev = () => {
    if (currentIndex > 1) {
      setCurrentIndex(currentIndex - 1);
      setPoints([]);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#222', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close Editor</button>
        <button onClick={handlePrev} disabled={currentIndex <= 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Prev Image</button>
        <span style={{ color: 'white', fontWeight: 'bold' }}>Image {currentIndex} / {frames.length - 1} ({frames[currentIndex]?.filename})</span>
        <button onClick={handleNext} disabled={currentIndex >= frames.length - 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Next Image</button>
        <button onClick={() => setPoints([])} style={{ padding: '8px 16px', cursor: 'pointer' }}>Clear Points</button>
      </div>
      <p style={{ margin: '5px', color: '#ccc' }}>Click 4 points: <strong>Top-Left &rarr; Top-Right &rarr; Bottom-Right &rarr; Bottom-Left</strong></p>
      
      <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ cursor: 'crosshair', border: '2px solid #555', backgroundColor: '#000', marginTop: '10px' }} />

      {generatedHtml && (
        <div style={{ width: '80%', marginTop: '20px' }}>
          <p style={{ color: '#0f0', margin: '5px 0' }}>Data Copied/Ready (replace inside src/assets/data/frames.json):</p>
          <textarea style={{ width: '100%', height: '200px', fontFamily: 'monospace', padding: '10px', background: '#111', color: '#fff', border: '1px solid #444' }} value={generatedHtml} readOnly onClick={(e) => { (e.target as HTMLTextAreaElement).select(); navigator.clipboard.writeText(generatedHtml); }} />
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import type { FrameData } from '../hooks/usePreloadImages';

interface Point { x: number; y: number; }

export const FrameEditor: React.FC<{ frames: FrameData[], images: HTMLImageElement[], onClose: () => void }> = ({ frames, images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [allData, setAllData] = useState<FrameData[]>([...frames]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. currentIndexが変更されたときに、対応するフレームのpointsをステートにセット
  useEffect(() => {
    const currentFrame = allData[currentIndex];
    if (currentFrame && currentFrame.points && currentFrame.points.length > 0) {
      setPoints(currentFrame.points);
    } else if (images[currentIndex]) {
      const img = images[currentIndex];
      const defaultPoints = [
        { x: img.width * 0.25, y: img.height * 0.25 },
        { x: img.width * 0.75, y: img.height * 0.25 },
        { x: img.width * 0.75, y: img.height * 0.75 },
        { x: img.width * 0.25, y: img.height * 0.75 }
      ];
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

    const maxHeight = window.innerHeight - 300;
    const scale = Math.min(800 / img.width, maxHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw lines
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = Math.max(2, 5 / scale);
    if (points.length === 4) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw handles
    points.forEach((p, i) => {
      ctx.fillStyle = draggingIndex === i ? '#ffff00' : 'red';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(8, 18 / scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
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
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return;
    const pos = getCanvasMousePos(e);
    const newPoints = [...points];
    newPoints[draggingIndex] = pos;
    setPoints(newPoints);
  };

  const handleMouseUp = () => {
    if (draggingIndex !== null) {
      updateAllData(points);
      setDraggingIndex(null);
    }
  };

  const handleReset = () => {
    if (!images[currentIndex]) return;
    const img = images[currentIndex];
    const defaultPoints = [
      { x: img.width * 0.25, y: img.height * 0.25 },
      { x: img.width * 0.75, y: img.height * 0.25 },
      { x: img.width * 0.75, y: img.height * 0.75 },
      { x: img.width * 0.25, y: img.height * 0.75 }
    ];
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#222', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflow: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close Editor</button>
        <button onClick={handlePrev} disabled={currentIndex <= 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Prev Image</button>
        <span style={{ color: 'white', fontWeight: 'bold' }}>Image {currentIndex} / {frames.length - 1} ({frames[currentIndex]?.filename})</span>
        <button onClick={handleNext} disabled={currentIndex >= frames.length - 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>Next Image</button>
        <button onClick={handleReset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset to Default</button>
      </div>
      <p style={{ margin: '5px', color: '#ccc' }}>Drag the 4 handles to adjust the magnification area.</p>
      
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: draggingIndex !== null ? 'grabbing' : 'crosshair', border: '2px solid #555', backgroundColor: '#000', marginTop: '10px' }} 
      />

      {generatedHtml && (
        <div style={{ width: '80%', marginTop: '20px' }}>
          <p style={{ color: '#0f0', margin: '5px 0' }}>Data Copied/Ready (replace inside src/assets/data/frames.json):</p>
          <textarea style={{ width: '100%', height: '200px', fontFamily: 'monospace', padding: '10px', background: '#111', color: '#fff', border: '1px solid #444' }} value={generatedHtml} readOnly onClick={(e) => { (e.target as HTMLTextAreaElement).select(); navigator.clipboard.writeText(generatedHtml); }} />
        </div>
      )}
    </div>
  );
};

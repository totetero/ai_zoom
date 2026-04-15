import { useState, useEffect } from 'react';
import { ZoomCanvas } from './components/ZoomCanvas';
import { FrameEditor } from './tools/FrameEditor';
import { RecursiveProcessor } from './tools/RecursiveProcessor';
import { usePreloadImages } from './hooks/usePreloadImages';
import type { FrameData } from './hooks/usePreloadImages';
import framesData from './assets/data/frames.json';
import './App.css';

function App() {
  const [frames] = useState<FrameData[]>(framesData as FrameData[]);
  const { images, isReady, progress: loadProgress } = usePreloadImages(frames, '/img/');
  const [progress, setProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showBatchProcessor, setShowBatchProcessor] = useState(false);

  // マウスホイールでのスクロール操作
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setProgress(prev => Math.max(0, Math.min(frames.length - 1, prev + e.deltaY * 0.001)));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [frames.length]);

  if (!isReady) {
    return (
      <div className="loading-screen">
        <h2>Loading Images... {Math.round(loadProgress)}%</h2>
      </div>
    );
  }

  const currentYear = frames[Math.max(0, Math.floor(progress + 0.5))].year;
  const currentMessage = frames[Math.max(0, Math.floor(progress + 0.5))].message;

  return (
    <div className="app-container">
      <ZoomCanvas 
        frames={frames} 
        images={images} 
        progress={progress} 
      />
      
      <div className="overlay">
        <div className="text-info">
          <h1 className="year-title">{currentYear}</h1>
          <p className="message">{currentMessage}</p>
        </div>
        
        <button 
          onClick={() => setShowEditor(true)} 
          style={{ pointerEvents: 'auto', position: 'absolute', top: 20, right: 20, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Open Frame Editor
        </button>

        <button 
          onClick={() => setShowBatchProcessor(true)} 
          style={{ pointerEvents: 'auto', position: 'absolute', top: 70, right: 20, zIndex: 1000, background: 'rgba(52, 152, 219, 0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
        >
          Open Batch Processor
        </button>

        <div className="controls">
          <input 
            type="range" 
            min="0" 
            max={frames.length - 1} 
            step="0.01" 
            value={progress}
            onChange={(e) => setProgress(parseFloat(e.target.value))}
            className="slider"
          />
          <div className="instructions">
            Scroll or drag slider to explore
          </div>
        </div>
      </div>
      
      {showEditor && <FrameEditor frames={frames} images={images} onClose={() => setShowEditor(false)} />}
      {showBatchProcessor && <RecursiveProcessor frames={frames} images={images} onClose={() => setShowBatchProcessor(false)} />}
    </div>
  );
}

export default App;

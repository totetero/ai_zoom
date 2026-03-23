import { useState, useEffect } from 'react';
import { ZoomCanvas } from './components/ZoomCanvas';
import { usePreloadImages } from './hooks/usePreloadImages';
import type { FrameData } from './hooks/usePreloadImages';
import framesData from './assets/data/frames.json';
import './App.css';

function App() {
  const [frames] = useState<FrameData[]>(framesData as FrameData[]);
  const { images, isReady, progress: loadProgress } = usePreloadImages(frames);
  const [progress, setProgress] = useState(0);

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
        width={1024} 
        height={768} 
      />
      
      <div className="overlay">
        <h1 className="year-title">{currentYear}</h1>
        <p className="message">{currentMessage}</p>
        
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
    </div>
  );
}

export default App;

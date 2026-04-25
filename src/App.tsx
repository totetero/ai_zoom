import { useState, useEffect } from 'react';
import { ZoomCanvas } from './components/ZoomCanvas';
import { FrameEditor } from './tools/FrameEditor';
import { RecursiveProcessor } from './tools/RecursiveProcessor';
import { usePreloadImages } from './hooks/usePreloadImages';
import type { FrameData } from './hooks/usePreloadImages';
import subjectsData from './assets/data/subjects.json';
import framesChild1 from './assets/data/frames_child1.json';
import framesChild2 from './assets/data/frames_child2.json';
import './App.css';

type Subject = {
  id: string;
  name: string;
  imageDir: string;
  framesPath: string;
};

const framesMap: Record<string, FrameData[]> = {
  child1: framesChild1 as FrameData[],
  child2: framesChild2 as FrameData[],
};

function App() {
  const [subjects] = useState<Subject[]>(subjectsData as Subject[]);
  const [currentSubjectId, setCurrentSubjectId] = useState(() => {
    return localStorage.getItem('selectedSubjectId') || subjects[0].id;
  });

  const subject = subjects.find(s => s.id === currentSubjectId) || subjects[0];
  const frames = framesMap[currentSubjectId] || framesMap[subjects[0].id];

  const { images, isReady, progress: loadProgress } = usePreloadImages(frames, subject.imageDir);
  const [progress, setProgress] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [showBatchProcessor, setShowBatchProcessor] = useState(false);

  // 被写体切り替え
  const handleSubjectChange = (id: string) => {
    setCurrentSubjectId(id);
    setProgress(0);
    localStorage.setItem('selectedSubjectId', id);
  };

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
        <h2>Loading Images for {subject.name}... {Math.round(loadProgress)}%</h2>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.floor(progress + 0.5));
  const currentYear = frames[safeIndex]?.year || '';
  const currentMessage = frames[safeIndex]?.message || '';

  return (
    <div className="app-container">
      <ZoomCanvas 
        frames={frames} 
        images={images} 
        progress={progress} 
      />
      
      <div className="overlay">
        <div className="top-left-ui">
          <div className="subject-selector">
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => handleSubjectChange(s.id)}
                className={`subject-btn ${currentSubjectId === s.id ? 'active' : ''}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="top-right-ui">
          <button 
            onClick={() => setShowEditor(true)} 
            className="tool-btn"
          >
            Open Frame Editor
          </button>

          <button 
            onClick={() => setShowBatchProcessor(true)} 
            className="tool-btn primary"
          >
            Open Batch Processor
          </button>
        </div>

        <div className="text-info">
          <h1 className="year-title">{currentYear}</h1>
          <p className="message">{currentMessage}</p>
        </div>

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
      
      {showEditor && <FrameEditor frames={frames} images={images} onClose={() => setShowEditor(false)} subject={subject} />}
      {showBatchProcessor && <RecursiveProcessor frames={frames} images={images} onClose={() => setShowBatchProcessor(false)} subject={subject} />}
    </div>
  );
}

export default App;

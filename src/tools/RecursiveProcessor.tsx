import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { FrameData } from '../hooks/usePreloadImages';
import { calculatePadding, calculateImageCoord } from '../utils/coords';
import { getHomographyMatrix4 } from '../utils/homography';

interface RecursiveProcessorProps {
  frames: FrameData[];
  images: HTMLImageElement[];
  onClose: () => void;
}

export const RecursiveProcessor: React.FC<RecursiveProcessorProps> = ({ frames, images, onClose }) => {
  const [step, setStep] = useState(0);
  const [processedImages, setProcessedImages] = useState<(string | null)[]>(new Array(frames.length).fill(null));
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentImg = images[step];

  // 前のステップの画像ソースを優先順位（加工済み > オリジナル）をつけて取得する
  const getPrevImageSource = async (idx: number): Promise<string> => {
    if (processedImages[idx]) return processedImages[idx]!;
    // 加工済みがない場合はオリジナルを使用
    const img = images[idx];
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d')?.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.95);
  };

  // 三次元的な射影変換を行い、合成済みの画像を生成する内部関数
  const renderWarpedImage = async (baseImg: HTMLImageElement, innerDataUrlOrImg: string, points: {x:number, y:number}[]): Promise<string> => {
    const W = baseImg.width;
    const H = baseImg.height;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);
    camera.position.z = 1;

    const createPlaneGeo = (w: number, h: number) => {
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, w, 0, 0, 0, h, 0, w, h, 0]);
      const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex([0, 2, 1, 1, 2, 3]);
      return geo;
    };

    const baseTex = new THREE.Texture(baseImg);
    baseTex.colorSpace = THREE.SRGBColorSpace;
    baseTex.flipY = false;
    baseTex.needsUpdate = true;
    const baseMesh = new THREE.Mesh(createPlaneGeo(W, H), new THREE.MeshBasicMaterial({ map: baseTex }));
    scene.add(baseMesh);

    const innerImg = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = innerDataUrlOrImg;
    });
    const innerTex = new THREE.Texture(innerImg);
    innerTex.colorSpace = THREE.SRGBColorSpace;
    innerTex.flipY = false;
    innerTex.needsUpdate = true;
    const innerMesh = new THREE.Mesh(createPlaneGeo(innerImg.width, innerImg.height), new THREE.MeshBasicMaterial({ map: innerTex, transparent: true }));
    innerMesh.matrixAutoUpdate = false;
    
    const srcTL = [
      { x: 0, y: 0 },
      { x: innerImg.width, y: 0 },
      { x: innerImg.width, y: innerImg.height },
      { x: 0, y: innerImg.height }
    ];
    innerMesh.matrix.copy(getHomographyMatrix4(srcTL, points));
    scene.add(innerMesh);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.95);
    
    renderer.dispose();
    baseTex.dispose();
    innerTex.dispose();
    baseMesh.geometry.dispose();
    innerMesh.geometry.dispose();
    
    return dataUrl;
  };

  // プレビューの更新
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const updatePreview = async () => {
      if (!currentImg) return;
      if (step > 0) {
        const points = frames[step].points;
        if (points && points.length === 4) {
          const source = await getPrevImageSource(step - 1);
          const warped = await renderWarpedImage(currentImg, source, points);
          setPreviewUrl(warped);
          return;
        }
      }
      // 最初の画像またはポイントがない場合
      const c = document.createElement('canvas');
      c.width = currentImg.width; c.height = currentImg.height;
      c.getContext('2d')?.drawImage(currentImg, 0, 0);
      setPreviewUrl(c.toDataURL('image/jpeg', 0.95));
    };
    updatePreview();
  }, [step, currentImg, processedImages]);

  // レンダリングループ (キャンバスへの描画)
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !previewUrl || !currentImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { padW, padH } = calculatePadding(currentImg.width, currentImg.height);
    const totalW = currentImg.width + padW * 2;
    const totalH = currentImg.height + padH * 2;

    const scale = Math.min((window.innerWidth - 100) / totalW, (window.innerHeight - 350) / totalH);
    canvas.width = totalW;
    canvas.height = totalH;
    canvas.style.width = `${totalW * scale}px`;
    canvas.style.height = `${totalH * scale}px`;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, totalW, totalH);
    
    const previewImg = new Image();
    previewImg.onload = () => {
      ctx.drawImage(previewImg, padW, padH);
    };
    previewImg.src = previewUrl;
  }, [previewUrl, currentImg]);

  const handleDownloadAndNext = async () => {
    if (!currentImg || !previewUrl) return;

    const link = document.createElement('a');
    link.download = frames[step].filename;
    link.href = previewUrl;
    link.click();

    setProcessedImages(prev => {
      const next = [...prev];
      next[step] = previewUrl;
      return next;
    });

    alert('合成済み画像をダウンロードしました。\n外部AIツール等で加工し、public/img/ に上書き保存してから「Next Step」に進んでください。');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#222', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
        <div style={{ color: 'white', fontWeight: 'bold' }}>
          STEP {step + 1} / {frames.length} : {frames[step]?.filename}
        </div>
        <button onClick={handleDownloadAndNext} style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          Composite & Download
        </button>
        <button onClick={() => setStep(step + 1)} disabled={step >= frames.length - 1} style={{ padding: '8px 16px', background: step < frames.length-1 ? '#3498db' : '#555', color: 'white', border: 'none', borderRadius: '4px' }}>
          Next Step ➔
        </button>
      </div>

      <div style={{ position: 'relative', border: '2px solid #555' }}>
        <canvas ref={mainCanvasRef} />
      </div>

      <div style={{ marginTop: '15px', background: '#333', padding: '15px', borderRadius: '8px', color: '#eee', maxWidth: '800px', fontSize: '14px' }}>
        <strong>再帰的処理フロー:</strong><br />
        1. 「Composite & Download」をクリックして合成済み画像を保存します。<br />
        2. 保存した画像をPhotoshopなどの外部ツールで開き、娘さんの顔をAI等で加工します。<br />
        3. 加工した画像を <code>public/img/</code> に元の名前で上書き保存してください。<br />
        4. 保存後、「Next Step」をクリックして次の画像に進みます（前の加工が自動的にフレームへ埋め込まれます）。<br />
        ※ <b>「Composite & Download」を押さずに進んだ場合でも、自動的にオリジナルの画像が次のステップのフレームに埋め込まれます。</b>
      </div>
    </div>
  );
};

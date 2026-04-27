import React, { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { getHomographyMatrix4 } from '../utils/homography';
import { calculateFadeOpacities } from '../utils/fade';
import type { FrameData } from '../hooks/usePreloadImages';

interface ZoomCanvasProps {
  frames: FrameData[];
  images: HTMLImageElement[];
  progress: number; // 0.0 ~ (frames.length - 1)
}


// テクスチャのキャッシュ（Reactコンポーネントの再描画によるチラつき防止）
const textureCache = new Map<HTMLImageElement, THREE.Texture>();
function getTexture(img: HTMLImageElement) {
  if (!textureCache.has(img)) {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    textureCache.set(img, tex);
  }
  return textureCache.get(img)!;
}

// 画像を矩形・または指定の4点に変形して描画するメッシュ
function ImageMesh({ img, points, isOuter, zIndex, opacity = 1 }: { img: HTMLImageElement, points?: {x:number, y:number}[] | null, isOuter: boolean, zIndex: number, opacity?: number }) {
  const tex = useMemo(() => {
    const t = getTexture(img);
    t.needsUpdate = true; // リサイズ時などの再描画で確実に更新されるようにする
    return t;
  }, [img]);

  const W = img.width;
  const H = img.height;
  
  const meshRef = useRef<THREE.Mesh>(null);
  
  // [0, W] x [0, H] の平面ジオメトリ
  const geom = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      W, 0, 0,
      0, H, 0,
      W, H, 0,
    ]);
    const indices = [0, 2, 1, 1, 2, 3];
    const uvs = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }, [W, H]);

  // 行列の更新 (useLayoutEffectを使用し、描画前に確実に適用する)
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.matrixAutoUpdate = false;

    if (points && points.length === 4 && !isOuter) {
      const src = [
        {x: 0, y: 0},
        {x: W, y: 0},
        {x: W, y: H},
        {x: 0, y: H}
      ];
      try {
        const m = getHomographyMatrix4(src, points);
        if (meshRef.current.matrix && m.elements.every(e => isFinite(e))) {
           meshRef.current.matrix.copy(m);
        }
      } catch (e) {
        if (meshRef.current.matrix) {
          meshRef.current.matrix.identity();
        }
      }
    } else {
      if (meshRef.current.matrix) {
        meshRef.current.matrix.identity();
      }
    }
  }, [points, isOuter, W, H, img]);

  return (
    <mesh ref={meshRef} geometry={geom} position={[0,0,zIndex]}>
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} />
    </mesh>
  );
}

// ズームを管理するシーンマネージャー
function SceneManager({ frames, images, progress }: ZoomCanvasProps) {
  const { size, camera } = useThree();
  const width = size.width;
  const height = size.height;
  
  const groupRef = useRef<THREE.Group>(null);
  
  let idx = Math.floor(progress);
  let p = progress - idx;

  if (idx >= frames.length - 1) {
    idx = Math.max(0, frames.length - 2);
    p = progress >= frames.length - 1 ? 1.0 : p;
  }
  if (idx < 0) {
    idx = 0;
    p = 0.0;
  }

  const outerImg = images[idx + 1] || images[0];
  const innerImg = images[idx] || images[0];
  const framePoints = frames[idx + 1]?.points;

  // 進捗 p に基づいて透明度を計算 (0.2の範囲でフェード)
  const { innerOpacity, outerOpacity } = calculateFadeOpacities(p, 0.2);
  
  // カメラのリサイズ対応
  useLayoutEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = 0;
      camera.right = width;
      camera.top = 0;
      camera.bottom = height;
      camera.near = -100;
      camera.far = 100;
      camera.updateProjectionMatrix();
    }
  }, [width, height, camera]);

  useFrame(() => {
    if (!groupRef.current || width <= 0 || height <= 0) return;
    
    const outerW = outerImg.width || 100;
    const outerH = outerImg.height || 100;
    const innerW = innerImg.width || 100;
    const innerH = innerImg.height || 100;
    
    // 【p=1 (引き) でのカメラビュー (Outer空間)】
    const scaleOut = Math.min(width / outerW, height / outerH);
    if (scaleOut <= 0 || !isFinite(scaleOut)) return;
    
    const viewW_out = width / scaleOut;
    const viewH_out = height / scaleOut;
    const cx_out = outerW / 2;
    const cy_out = outerH / 2;
    const v1_0 = { x: cx_out - viewW_out/2, y: cy_out - viewH_out/2 };
    const v1_1 = { x: cx_out + viewW_out/2, y: cy_out - viewH_out/2 };
    const v1_2 = { x: cx_out + viewW_out/2, y: cy_out + viewH_out/2 };
    const v1_3 = { x: cx_out - viewW_out/2, y: cy_out + viewH_out/2 };
    
    // 【p=0 (寄り) でのカメラビュー (Outer空間におけるInner画像の位置)】
    const scaleIn = Math.min(width / innerW, height / innerH);
    if (scaleIn <= 0 || !isFinite(scaleIn)) return;
    
    const viewW_in = width / scaleIn;
    const viewH_in = height / scaleIn;
    const cx_in = innerW / 2;
    const cy_in = innerH / 2;
    // Inner画像ローカル座標でのカメラビュー
    const u_0 = { x: cx_in - viewW_in/2, y: cy_in - viewH_in/2 };
    const u_1 = { x: cx_in + viewW_in/2, y: cy_in - viewH_in/2 };
    const u_2 = { x: cx_in + viewW_in/2, y: cy_in + viewH_in/2 };
    const u_3 = { x: cx_in - viewW_in/2, y: cy_in + viewH_in/2 };
    
    let v0_0 = u_0, v0_1 = u_1, v0_2 = u_2, v0_3 = u_3;
    
    if (framePoints && framePoints.length === 4) {
      const src = [
        {x: 0, y: 0},
        {x: innerW, y: 0},
        {x: innerW, y: innerH},
        {x: 0, y: innerH}
      ];
      const scaledFramePoints = framePoints.map(p => ({
        x: p.x * outerW,
        y: p.y * outerH
      }));
      
      try {
        const h_mat = getHomographyMatrix4(src, scaledFramePoints);
        const applyH = (pt: {x:number, y:number}) => {
          const vec = new THREE.Vector3(pt.x, pt.y, 0).applyMatrix4(h_mat);
          return { x: vec.x, y: vec.y };
        };
        v0_0 = applyH(u_0);
        v0_1 = applyH(u_1);
        v0_2 = applyH(u_2);
        v0_3 = applyH(u_3);
      } catch (e) {}
    }
    
    const dx_out = v1_1.x - v1_0.x;
    const dy_out = v1_1.y - v1_0.y;
    const w_outer = Math.sqrt(dx_out * dx_out + dy_out * dy_out);
    const dx_in = v0_1.x - v0_0.x;
    const dy_in = v0_1.y - v0_0.y;
    const w_inner = Math.sqrt(dx_in * dx_in + dy_in * dy_in);

    const r = w_inner > 0 ? w_outer / w_inner : 1;
    let f = p;
    if (r !== 1 && isFinite(r) && r > 0) {
      f = (Math.pow(r, p) - 1) / (r - 1);
    }
    if (isNaN(f)) f = p;
    
    const lerp = (a: {x:number,y:number}, b: {x:number,y:number}, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    });
    
    const curr_0 = lerp(v0_0, v1_0, f);
    const curr_1 = lerp(v0_1, v1_1, f);
    const curr_2 = lerp(v0_2, v1_2, f);
    const curr_3 = lerp(v0_3, v1_3, f);
    
    const screen_src = [
      {x: 0, y: 0},
      {x: width, y: 0},
      {x: width, y: height},
      {x: 0, y: height}
    ];
    const curr_dst = [curr_0, curr_1, curr_2, curr_3];
    
    try {
      const h_cam = getHomographyMatrix4(screen_src, curr_dst);
      groupRef.current.matrixAutoUpdate = false;
      if (groupRef.current.matrix && h_cam.elements.every(e => isFinite(e))) {
        groupRef.current.matrix.copy(h_cam).invert();
      }
    } catch(e) {}
  });

  const scaledPointsForMesh = useMemo(() => {
    if (!framePoints || framePoints.length !== 4) return null;
    return framePoints.map(p => ({
      x: p.x * outerImg.width,
      y: p.y * outerImg.height
    }));
  }, [framePoints, outerImg]);

  return (
    <group ref={groupRef}>
      <ImageMesh img={outerImg} isOuter={true} zIndex={-2} opacity={outerOpacity} />
      {scaledPointsForMesh && (
        <ImageMesh img={innerImg} points={scaledPointsForMesh} isOuter={false} zIndex={-1} opacity={innerOpacity} />
      )}
    </group>
  );
}

export const ZoomCanvas: React.FC<ZoomCanvasProps> = (props) => {
  if (props.images.length === 0) return null;
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      <Canvas id="zoom-canvas" style={{ background: '#000' }} gl={{ antialias: true, preserveDrawingBuffer: true }} orthographic>
        <SceneManager {...props} />
      </Canvas>
    </div>
  );
};

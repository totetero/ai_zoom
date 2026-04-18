import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { getHomographyMatrix4 } from '../utils/homography';
import { calculateFadeOpacities } from '../utils/fade';

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
  const tex = useMemo(() => getTexture(img), [img]);
  const W = img.width;
  const H = img.height;
  
  const meshRef = useRef<THREE.Mesh>(null);
  
  // [0, W] x [0, H] の平面ジオメトリ。UVはDOMの左上原点に合わせる
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

  useEffect(() => {
    if (!meshRef.current) return;
    if (points && points.length === 4 && !isOuter) {
      const src = [
        {x: 0, y: 0},
        {x: W, y: 0},
        {x: W, y: H},
        {x: 0, y: H}
      ];
      // Note: points are expected to be in pixel coordinates here
      const m = getHomographyMatrix4(src, points);
      meshRef.current.matrixAutoUpdate = false;
      meshRef.current.matrix.copy(m);
    } else {
      meshRef.current.matrixAutoUpdate = false;
      meshRef.current.matrix.identity();
    }
  }, [points, isOuter, W, H]);

  return (
    <mesh ref={meshRef} geometry={geom} position={[0,0,zIndex]}>
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} />
    </mesh>
  );
}

// ズームを管理するシーンマネージャー
function SceneManager({ frames, images, progress }: ZoomCanvasProps) {
  const { size } = useThree();
  const width = size.width;
  const height = size.height;
  
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  let idx = Math.floor(progress);
  let p = progress - idx;

  if (idx >= frames.length - 1) {
    idx = frames.length - 2;
    p = 1.0;
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
  
  useFrame(() => {
    if (!cameraRef.current || !groupRef.current) return;
    
    const outerW = outerImg.width;
    const outerH = outerImg.height;
    
    // 【p=1 (引き) でのカメラビュー (Outer空間)】
    const scaleOut = Math.min(width / outerW, height / outerH);
    const viewW_out = width / scaleOut;
    const viewH_out = height / scaleOut;
    const cx_out = outerW / 2;
    const cy_out = outerH / 2;
    const v1_0 = { x: cx_out - viewW_out/2, y: cy_out - viewH_out/2 };
    const v1_1 = { x: cx_out + viewW_out/2, y: cy_out - viewH_out/2 };
    const v1_2 = { x: cx_out + viewW_out/2, y: cy_out + viewH_out/2 };
    const v1_3 = { x: cx_out - viewW_out/2, y: cy_out + viewH_out/2 };
    
    // 【p=0 (寄り) でのカメラビュー (Outer空間におけるInner画像の位置)】
    const innerW = innerImg.width;
    const innerH = innerImg.height;
    const scaleIn = Math.min(width / innerW, height / innerH);
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
      // framePoints (正規化座標) を Outer画像 (outerImg) のピクセル座標に変換
      const scaledFramePoints = framePoints.map(p => ({
        x: p.x * outerW,
        y: p.y * outerH
      }));
      
      const h_mat = getHomographyMatrix4(src, scaledFramePoints);
      const applyH = (pt: {x:number, y:number}) => {
        const vec = new THREE.Vector3(pt.x, pt.y, 0).applyMatrix4(h_mat);
        return { x: vec.x, y: vec.y };
      };
      v0_0 = applyH(u_0);
      v0_1 = applyH(u_1);
      v0_2 = applyH(u_2);
      v0_3 = applyH(u_3);
    }
    
    // --- 【最適化されたイージング計算（数学的に均一な一定速度ズーム）】 ---
    // Outerビュー(v1) と Innerビュー(v0) の幅の比率(r)を計算し、指数関数を用いて補間することで、
    // まったく一定のスピードでズームイン/アウトしているように見せます。
    const dx_out = v1_1.x - v1_0.x;
    const dy_out = v1_1.y - v1_0.y;
    const w_outer = Math.sqrt(dx_out * dx_out + dy_out * dy_out);
    
    const dx_in = v0_1.x - v0_0.x;
    const dy_in = v0_1.y - v0_0.y;
    const w_inner = Math.sqrt(dx_in * dx_in + dy_in * dy_in);

    const r = w_outer / w_inner;
    
    // p=0 のとき f=0 (Inner画像ビュー)
    // p=1 のとき f=1 (Outer画像ビュー)
    const f = r === 1 ? p : (Math.pow(r, p) - 1) / (r - 1);
    
    const lerp = (a: {x:number,y:number}, b: {x:number,y:number}, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    });
    
    const curr_0 = lerp(v0_0, v1_0, f);
    const curr_1 = lerp(v0_1, v1_1, f);
    const curr_2 = lerp(v0_2, v1_2, f);
    const curr_3 = lerp(v0_3, v1_3, f);
    
    // 画面(Viewport)の4隅
    const screen_src = [
      {x: 0, y: 0},
      {x: width, y: 0},
      {x: width, y: height},
      {x: 0, y: height}
    ];
    const curr_dst = [curr_0, curr_1, curr_2, curr_3];
    
    // 現在のカメラビューを画面にピッタリ写すための逆変換行列
    const h_cam = getHomographyMatrix4(screen_src, curr_dst);
    groupRef.current.matrixAutoUpdate = false;
    groupRef.current.matrix.copy(h_cam).invert();
  });

  // points (正規化座標) を Outer画像 (outerImg) のピクセル座標に変換して ImageMesh に渡す
  const scaledPointsForMesh = useMemo(() => {
    if (!framePoints || framePoints.length !== 4) return null;
    return framePoints.map(p => ({
      x: p.x * outerImg.width,
      y: p.y * outerImg.height
    }));
  }, [framePoints, outerImg]);

  return (
    <>
      <OrthographicCamera 
        ref={cameraRef} 
        makeDefault 
        left={0} right={width} 
        top={0} bottom={height} 
        near={-100} far={100} 
      />
      <group ref={groupRef}>
        <ImageMesh img={outerImg} isOuter={true} zIndex={-2} opacity={outerOpacity} />
        {scaledPointsForMesh && (
          <ImageMesh img={innerImg} points={scaledPointsForMesh} isOuter={false} zIndex={-1} opacity={innerOpacity} />
        )}
      </group>
    </>
  );
}

export const ZoomCanvas: React.FC<ZoomCanvasProps> = (props) => {
  if (props.images.length === 0) return null;
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      <Canvas style={{ background: '#000' }} gl={{ antialias: true }}>
        <SceneManager {...props} />
      </Canvas>
    </div>
  );
};

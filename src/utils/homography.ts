import * as THREE from 'three';

/**
 * 4点の対応から射影変換(ホモグラフィ)行列を求める関数
 * src: 変換前の4点 (通常は画像の4隅 [0,0], [W,0], [W,H], [0,H])
 * dst: 変換後の4点
 */
export function getHomographyMatrix4(src: {x: number, y: number}[], dst: {x: number, y: number}[]) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i].x, y = src[i].y;
    const u = dst[i].x, v = dst[i].y;
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  const M = A.map(row => row.slice(0, 8));
  const B = A.map(row => -row[8]);
  
  // ガウス消去法による連立方程式の解法
  for (let i = 0; i < 8; i++) {
    let maxRow = i;
    for (let j = i + 1; j < 8; j++) {
      if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) maxRow = j;
    }
    const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp;
    const tmpB = B[i]; B[i] = B[maxRow]; B[maxRow] = tmpB;
    
    if (Math.abs(M[i][i]) < 1e-10) continue; // 特異行列を避ける

    for (let j = i + 1; j < 8; j++) {
      const c = M[j][i] / M[i][i];
      for (let k = i; k < 8; k++) M[j][k] -= c * M[i][k];
      B[j] -= c * B[i];
    }
  }
  const h = new Array(8);
  for (let i = 7; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < 8; j++) sum += M[i][j] * h[j];
    h[i] = (B[i] - sum) / M[i][i];
  }

  const m = new THREE.Matrix4();
  // THREE.Matrix4.set は行優先(row-major)で引数を取る
  m.set(
    h[0], h[1], 0, h[2],
    h[3], h[4], 0, h[5],
    0,    0,    1, 0,
    h[6], h[7], 0, 1
  );
  return m;
}

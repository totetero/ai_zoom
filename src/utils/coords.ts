export interface Point {
  x: number;
  y: number;
}

export const PADDING_RATIO = 0.2;

/**
 * クライアント座標（マウスイベント等）を画像内の正規化座標（0.0〜1.0）に変換する
 */
export function calculateImageCoord(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  paddingW: number,
  paddingH: number,
  imageW: number,
  imageH: number
): Point {
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;

  const x = (clientX - rect.left) * scaleX - paddingW;
  const y = (clientY - rect.top) * scaleY - paddingH;

  return {
    x: x / imageW,
    y: y / imageH,
  };
}

/**
 * 画像サイズからパディング量を計算する
 */
export function calculatePadding(width: number, height: number): { padW: number; padH: number } {
  return {
    padW: width * PADDING_RATIO,
    padH: height * PADDING_RATIO,
  };
}

/**
 * デフォルトの4隅の正規化座標を計算する
 */
export function calculateDefaultPoints(): Point[] {
  return [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
    { x: 0.75, y: 0.75 },
    { x: 0.25, y: 0.75 },
  ];
}

export interface Point {
  x: number;
  y: number;
}

export const PADDING_RATIO = 0.2;

/**
 * クライアント座標（マウスイベント等）を画像内の座標に変換する
 */
export function calculateImageCoord(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  paddingW: number,
  paddingH: number
): Point {
  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;

  return {
    x: (clientX - rect.left) * scaleX - paddingW,
    y: (clientY - rect.top) * scaleY - paddingH,
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
 * デフォルトの4隅の座標を計算する
 */
export function calculateDefaultPoints(width: number, height: number): Point[] {
  return [
    { x: width * 0.25, y: height * 0.25 },
    { x: width * 0.75, y: height * 0.25 },
    { x: width * 0.75, y: height * 0.75 },
    { x: width * 0.25, y: height * 0.75 },
  ];
}

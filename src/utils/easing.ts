/**
 * イージング関数ユーティリティ
 */

/**
 * 開始時と終了時に加速・減速するイージング (Cubic)
 * @param t 進行度 (0.0 ~ 1.0)
 * @returns イージング適用後の進行度
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * 開始時と終了時に加速・減速するイージング (Sine)
 * @param t 進行度 (0.0 ~ 1.0)
 * @returns イージング適用後の進行度
 */
export const easeInOutSine = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

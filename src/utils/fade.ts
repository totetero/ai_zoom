/**
 * 進捗 p (0.0 ~ 1.0) に基づいて、中央画像と背景画像の透明度を計算します。
 * @param p ズーム進捗
 * @param threshold フェードを開始するしきい値 (デフォルト 0.2)
 * @returns { innerOpacity, outerOpacity }
 */
export function calculateFadeOpacities(p: number, threshold: number = 0.2) {
  const innerOpacity = Math.max(0, Math.min(1, (1 - p) / threshold));
  const outerOpacity = Math.max(0, Math.min(1, p / threshold));
  return { innerOpacity, outerOpacity };
}

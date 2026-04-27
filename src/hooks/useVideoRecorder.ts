import { useState, useCallback, useRef } from 'react';
import { easeInOutCubic } from '../utils/easing';

export function useVideoRecorder(canvasId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    const container = document.getElementById(canvasId);
    // react-three-fiberのCanvasコンポーネントは内部にcanvasタグを生成するため、
    // IDが付与された要素そのもの、またはその子要素からcanvasを探す
    const canvas = (container?.tagName === 'CANVAS' ? container : container?.querySelector('canvas')) as HTMLCanvasElement;

    if (!canvas) {
      console.error('Canvas not found:', canvasId);
      return false;
    }

    // MIMEタイプの選択
    const mimeTypes = [
      'video/mp4;codecs=h264',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      console.error('No supported MediaRecorder MIME types found');
      return false;
    }

    try {
      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.href = url;
        a.download = `growth-video-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }, [canvasId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  /**
   * 自動アニメーション付き録画を実行
   * @param maxProgress 最終的な進捗値（frames.length - 1）
   * @param onProgress 進捗更新コールバック
   * @param durationPerFrame 1フレーム（1枚分）あたりの再生時間（ミリ秒）
   */
  const recordAutoZoom = useCallback(async (
    maxProgress: number,
    onProgress: (p: number) => void,
    durationPerFrame: number = 3000
  ) => {
    // 録画開始前に進捗をリセット
    onProgress(0);
    // 最初のフレームがレンダリングされるのを待つ
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 100));

    const success = startRecording();
    if (!success) return;

    const totalDuration = maxProgress * durationPerFrame;
    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const totalP = Math.min(maxProgress, (elapsed / totalDuration) * maxProgress);
        
        // 写真ごとにイージングをかける
        const currentIdx = Math.floor(totalP);
        const intraProgress = totalP - currentIdx;
        // 最後の写真（totalP === maxProgress）の場合は intraProgress が 0 になるが、
        // インデックスが maxProgress になるので問題ない
        const easedIntraProgress = totalP === maxProgress ? 0 : easeInOutCubic(intraProgress);
        const p = totalP === maxProgress ? maxProgress : currentIdx + easedIntraProgress;
        
        onProgress(p);

        if (totalP < maxProgress) {
          requestAnimationFrame(animate);
        } else {
          // 最後のフレームを少し長めに表示
          setTimeout(() => {
            stopRecording();
            resolve();
          }, 500);
        }
      };
      requestAnimationFrame(animate);
    });
  }, [startRecording, stopRecording]);

  return { isRecording, startRecording, stopRecording, recordAutoZoom };
}

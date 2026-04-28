import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoRecorder } from './useVideoRecorder';

describe('useVideoRecorder', () => {
  let currentTime = 0;

  beforeEach(() => {
    currentTime = 0;
    vi.useFakeTimers();
    
    // performance.now Mock
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    
    // requestAnimationFrame Mock
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // 次のタイマーサイクルで実行
      return setTimeout(() => {
        currentTime += 16;
        cb(currentTime);
      }, 16) as any;
    });

    // Canvas & Stream Mock
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.captureStream = vi.fn().mockReturnValue({
        getTracks: () => [{ stop: vi.fn() }],
      });
    }

    // MediaRecorder Mock
    globalThis.MediaRecorder = vi.fn().mockImplementation(function(this: any) {
      this.start = vi.fn();
      this.stop = vi.fn().mockImplementation(() => { this.state = 'inactive'; });
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
    }) as any;
    (globalThis.MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

    // DOM Mock
    const mockCanvas = document.createElement('canvas');
    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      if (id === 'zoom-canvas') return mockCanvas;
      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初期状態では録画中ではないこと', () => {
    const { result } = renderHook(() => useVideoRecorder('zoom-canvas'));
    expect(result.current.isRecording).toBe(false);
  });

  it('startRecordingを呼ぶとisRecordingがtrueになること', () => {
    const { result } = renderHook(() => useVideoRecorder('zoom-canvas'));
    
    act(() => {
      const success = result.current.startRecording();
      expect(success).toBe(true);
    });
    
    expect(result.current.isRecording).toBe(true);
  });

  it('recordAutoZoomが進行度を更新すること', async () => {
    const { result } = renderHook(() => useVideoRecorder('zoom-canvas'));
    const onProgress = vi.fn();
    
    act(() => {
      // 1秒(1000ms)で1枚進む設定
      void result.current.recordAutoZoom(1, onProgress, 1000);
    });

    // 初期化と最初のアニメーションフレームを待つ
    // recordAutoZoom内には requestAnimationFrame(1回) と setTimeout(100ms) がある
    await vi.advanceTimersByTimeAsync(500);

    // アニメーションを数フレーム分進める
    await vi.advanceTimersByTimeAsync(160);

    expect(onProgress).toHaveBeenCalled();
    const calls = onProgress.mock.calls;
    // 最初の0リセットを除いた後の値を確認
    const progressValues = calls.map(c => c[0]).filter(v => v > 0);
    expect(progressValues.length).toBeGreaterThan(0);

    // 終了まで進める
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      vi.runAllTimers();
    });

    expect(onProgress).toHaveBeenLastCalledWith(1);
    expect(result.current.isRecording).toBe(false);
  });

  it('サポートされているMIMEタイプの中からMP4を優先的に選択すること', () => {
    const requestedTypes: string[] = [];
    (globalThis.MediaRecorder as any).isTypeSupported.mockImplementation((type: string) => {
      requestedTypes.push(type);
      // 全てサポートしていると仮定した場合、最初に呼ばれたものを返す
      return true;
    });

    const { result } = renderHook(() => useVideoRecorder('zoom-canvas'));
    
    act(() => {
      result.current.startRecording();
    });

    // 最初に video/mp4;codecs=h264 が試行されること
    expect(requestedTypes[0]).toBe('video/mp4;codecs=h264');
    // MediaRecorderが最初のタイプで作成されること
    expect(globalThis.MediaRecorder).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      mimeType: 'video/mp4;codecs=h264'
    }));
  });

  it('MP4がサポートされていない場合にWebMにフォールバックすること', () => {
    (globalThis.MediaRecorder as any).isTypeSupported.mockImplementation((type: string) => {
      return type.includes('video/webm');
    });

    const { result } = renderHook(() => useVideoRecorder('zoom-canvas'));
    
    act(() => {
      result.current.startRecording();
    });

    // WebMのいずれかが選択されること
    const callMimeType = (globalThis.MediaRecorder as any).mock.calls[0][1].mimeType;
    expect(callMimeType).toContain('video/webm');
  });
});

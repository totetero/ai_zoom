import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecursiveProcessor } from './RecursiveProcessor';
import * as THREE from 'three';

// --- Three.js Mocks ---
vi.mock('three', () => {
  const Mesh = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    scale: { set: vi.fn() },
    matrix: { copy: vi.fn() },
    matrixAutoUpdate: true,
  }));
  
  const BufferGeometry = vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    setIndex: vi.fn(),
    dispose: vi.fn(),
  }));

  return {
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
      },
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
    })),
    OrthographicCamera: vi.fn().mockImplementation(() => ({
      position: { z: 0 },
    })),
    Texture: vi.fn().mockImplementation(() => ({
      needsUpdate: false,
      dispose: vi.fn(),
    })),
    Mesh,
    PlaneGeometry: vi.fn(),
    BufferGeometry,
    BufferAttribute: vi.fn(),
    MeshBasicMaterial: vi.fn(),
    SRGBColorSpace: 'srgb',
  };
});

describe('RecursiveProcessor', () => {
  const mockOnClose = vi.fn();
  const mockFrames = [
    { id: 0, filename: '2021_birth.jpg', year: 2021, age: 0, message: 'Birth', points: [] },
    { id: 1, filename: '2021_4m.jpg', year: 2021, age: 0.3, message: '4 Months', points: [
      {x:100, y:100}, {x:200, y:100}, {x:200, y:200}, {x:100, y:200}
    ] },
  ];

  const mockImages = [
    { width: 100, height: 100, src: 'img0' } as HTMLImageElement,
    { width: 100, height: 100, src: 'img1' } as HTMLImageElement,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Canvas 2D Context
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
    });

    // Mock alert and window size
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
  });

  it('初期レンダリングで最初のステップの情報が表示される', async () => {
    render(<RecursiveProcessor frames={mockFrames} images={mockImages} onClose={mockOnClose} />);
    
    expect(screen.getByText(/STEP 1 \/ 2/i)).toBeDefined();
    expect(screen.getByText(/2021_birth.jpg/i)).toBeDefined();
  });

  it('Next Step ボタンで次のステップに遷移できる', async () => {
    render(<RecursiveProcessor frames={mockFrames} images={mockImages} onClose={mockOnClose} />);
    
    const nextBtn = screen.getByText(/Next Step/i);
    fireEvent.click(nextBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/STEP 2 \/ 2/i)).toBeDefined();
      expect(screen.getByText(/2021_4m.jpg/i)).toBeDefined();
    });
  });

  it('Close ボタンが正しく機能する', () => {
    render(<RecursiveProcessor frames={mockFrames} images={mockImages} onClose={mockOnClose} />);
    
    const closeBtn = screen.getByText(/Close/i);
    fireEvent.click(closeBtn);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('Composite & Download ボタンがクリック可能である', async () => {
    render(<RecursiveProcessor frames={mockFrames} images={mockImages} onClose={mockOnClose} />);
    
    const downloadBtn = screen.getByText(/Composite & Download/i);
    expect(downloadBtn).toBeDefined();
    
    // 実際にクリックしてアラートが出るか確認（レンダリングのモックが成功している前提）
    fireEvent.click(downloadBtn);
    
    await waitFor(() => {
      expect(vi.globalThis.alert).toHaveBeenCalled();
    });
  });
});

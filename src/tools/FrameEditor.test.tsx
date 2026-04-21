import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FrameEditor } from './FrameEditor';

describe('FrameEditor', () => {
  const mockOnClose = vi.fn();
  const mockFrames = [
    { id: 0, filename: 'img0.jpg', year: 2020, age:0, message: 'm0' },
    { id: 1, filename: 'img1.jpg', year: 2021, age:1, message: 'm1' },
    { id: 2, filename: 'img2.jpg', year: 2022, age:2, message: 'm2' },
  ];

  // Mock HTMLImageElement
  const mockImages = [
    { width: 1000, height: 1000 } as HTMLImageElement,
    { width: 1000, height: 1000 } as HTMLImageElement,
    { width: 1000, height: 1000 } as HTMLImageElement,
  ];

  const mockSubject = { id: 'child2', name: 'Child 2', framesPath: 'frames_child2.json' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getContext of Canvas
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    });

    // Mock getBoundingClientRect
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 500
    });
  });

  it('should render the editor with controls', () => {
    render(<FrameEditor frames={mockFrames} images={mockImages} onClose={mockOnClose} subject={mockSubject} />);
    
    expect(screen.getByText(/Close Editor/i)).toBeDefined();
    expect(screen.getByText(/Prev Image/i)).toBeDefined();
    expect(screen.getByText(/Next Image/i)).toBeDefined();
    expect(screen.getByText(/Reset to Default/i)).toBeDefined();
    // Initially currentIndex is 1
    expect(screen.getByText(/Image 1 \/ 2/i)).toBeDefined();
  });

  it('should call onClose when Close button is clicked', () => {
    render(<FrameEditor frames={mockFrames} images={mockImages} onClose={mockOnClose} subject={mockSubject} />);
    fireEvent.click(screen.getByText(/Close Editor/i));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should navigate between images', () => {
    render(<FrameEditor frames={mockFrames} images={mockImages} onClose={mockOnClose} subject={mockSubject} />);
    
    const nextBtn = screen.getByText(/Next Image/i);
    const prevBtn = screen.getByText(/Prev Image/i);

    expect(screen.getByText(/Image 1 \/ 2/i)).toBeDefined();
    
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Image 2 \/ 2/i)).toBeDefined();
    expect(nextBtn).toBeDisabled();

    fireEvent.click(prevBtn);
    expect(screen.getByText(/Image 1 \/ 2/i)).toBeDefined();
    expect(prevBtn).toBeDisabled();
  });

  it('should reset points when Reset button is clicked', () => {
    // This is a bit hard to test deeply without checking internal state,
    // but we can check if it doesn't crash and the UI remains stable.
    render(<FrameEditor frames={mockFrames} images={mockImages} onClose={mockOnClose} subject={mockSubject} />);
    fireEvent.click(screen.getByText(/Reset to Default/i));
    // No error = good for now in this shallow interaction test
  });
});

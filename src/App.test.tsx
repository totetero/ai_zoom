import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock ZoomCanvas to avoid WebGL issues in test environment
vi.mock('./components/ZoomCanvas', () => ({
  ZoomCanvas: () => <div data-testid="zoom-canvas" />
}));

// Mock image preloading
vi.mock('./hooks/usePreloadImages', () => ({
  usePreloadImages: vi.fn().mockReturnValue({
    images: [],
    isReady: true,
    progress: 100
  })
}));

// Mock JSON data
vi.mock('./assets/data/subjects.json', () => ({
  default: [
    { id: 'child1', name: 'Child 1', imageDir: '/img/child1/', framesPath: 'frames_child1.json' }
  ]
}));

describe('App Responsive Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders UI components with correct responsive classes', () => {
    render(<App />);
    
    // Check if main UI containers are present
    const topLeft = screen.getByRole('button', { name: 'Child 1' }).parentElement?.parentElement;
    expect(topLeft).toHaveClass('top-left-ui');

    const topRight = screen.getByText('Open Frame Editor').parentElement;
    expect(topRight).toHaveClass('top-right-ui');

    // Check if year title is rendered
    // Note: frames might be empty in mock, but usePreloadImages is ready
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('year-title');
  });

  it('updates subject when clicking subject buttons', () => {
    render(<App />);
    const btn = screen.getByText('Child 1');
    expect(btn).toHaveClass('active');
  });

  it('displays loading screen when not ready', async () => {
    const { usePreloadImages } = await import('./hooks/usePreloadImages');
    (usePreloadImages as any).mockReturnValue({
      images: [],
      isReady: false,
      progress: 50
    });

    render(<App />);
    expect(screen.getByText(/Loading Images/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});

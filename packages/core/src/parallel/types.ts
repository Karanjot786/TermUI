/**
 * Parallel Rendering Types
 */

export interface ParallelRendererConfig {
  /** Number of worker threads to use */
  workers?: number;
  /** Load balancing strategy */
  strategy: 'adaptive' | 'round-robin' | 'static';
  /** Screen partition strategy */
  partition: 'quadrant' | 'grid' | 'dynamic';
  /** Maximum workers to use */
  maxWorkers?: number;
  /** Minimum workers to use */
  minWorkers?: number;
  /** Fallback to single-threaded */
  fallbackToSingleThread?: boolean;
}

export interface WorkerTask {
  id: string;
  type: 'render' | 'compute' | 'merge';
  data: any;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  callback?: (result: any) => void;
}

export interface WorkerResult {
  taskId: string;
  data: any;
  renderTime: number;
  workerId: number;
  section?: ScreenSection;
}

export interface ScreenSection {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface RenderMetrics {
  frameTime: number;
  fps: number;
  workerUtilization: number[];
  renderTime: number;
  mergeTime: number;
  totalTime: number;
  artifacts: number;
}

export interface ParallelRenderOptions {
  /** Priority of the render */
  priority?: 'high' | 'normal' | 'low';
  /** Render only visible area */
  visibleOnly?: boolean;
  /** Progressive rendering */
  progressive?: boolean;
  /** Animation frame */
  animationFrame?: number;
}
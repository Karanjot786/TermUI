/**
 * Performance Monitor
 * Tracks rendering performance and metrics
 */

import { EventEmitter } from 'events';
import { RenderMetrics } from '../types';

export class PerformanceMonitor extends EventEmitter {
  private metrics: RenderMetrics[] = [];
  private maxMetrics = 100;
  private frameTimes: number[] = [];
  private renderTimes: number[] = [];
  private fpsHistory: number[] = [];

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.calculateMetrics();
    }, 1000); // Update every second
  }

  /**
   * Record a frame
   */
  recordFrame(frameTime: number, renderTime: number, workerUtilization: number[]): void {
    this.frameTimes.push(frameTime);
    this.renderTimes.push(renderTime);

    // Keep only last 100 frames
    if (this.frameTimes.length > 100) {
      this.frameTimes.shift();
      this.renderTimes.shift();
    }

    // Calculate FPS
    const fps = 1000 / frameTime;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 100) {
      this.fpsHistory.shift();
    }

    const metrics: RenderMetrics = {
      frameTime,
      fps,
      workerUtilization,
      renderTime,
      mergeTime: frameTime - renderTime,
      totalTime: frameTime,
      artifacts: 0 // Would track artifacts
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    this.emit('frameRecorded', metrics);

    // Check for bottlenecks
    this.detectBottlenecks(metrics);
  }

  /**
   * Calculate aggregated metrics
   */
  private calculateMetrics(): void {
    if (this.metrics.length === 0) return;

    const avgFrameTime = this.metrics.reduce((sum, m) => sum + m.frameTime, 0) / this.metrics.length;
    const avgFps = this.metrics.reduce((sum, m) => sum + m.fps, 0) / this.metrics.length;
    const avgRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / this.metrics.length;
    const maxFrameTime = Math.max(...this.metrics.map(m => m.frameTime));
    const minFrameTime = Math.min(...this.metrics.map(m => m.frameTime));

    const stats = {
      avgFrameTime,
      avgFps,
      avgRenderTime,
      maxFrameTime,
      minFrameTime,
      samples: this.metrics.length,
      fpsHistory: this.fpsHistory.slice(-10),
      workerUtilization: this.metrics[this.metrics.length - 1]?.workerUtilization || []
    };

    this.emit('metricsUpdated', stats);

    // Auto-adjust based on performance
    this.autoAdjust(stats);
  }

  /**
   * Detect bottlenecks
   */
  private detectBottlenecks(metrics: RenderMetrics): void {
    if (metrics.frameTime > 33) { // <30fps
      this.emit('bottleneckDetected', {
        type: 'frame_time',
        message: `Frame time too high: ${metrics.frameTime.toFixed(2)}ms (target: 16.67ms)`,
        severity: 'critical'
      });
    }

    if (metrics.renderTime > 20) {
      this.emit('bottleneckDetected', {
        type: 'render_time',
        message: `Render time too high: ${metrics.renderTime.toFixed(2)}ms`,
        severity: 'warning'
      });
    }

    // Check worker utilization
    if (metrics.workerUtilization.length > 0) {
      const avgUtilization = metrics.workerUtilization.reduce((a, b) => a + b, 0) / metrics.workerUtilization.length;
      if (avgUtilization > 0.95) {
        this.emit('bottleneckDetected', {
          type: 'worker_utilization',
          message: 'Workers at 95%+ utilization, consider adding more workers',
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Auto-adjust based on performance
   */
  private autoAdjust(stats: any): void {
    // If FPS is low, suggest changes
    if (stats.avgFps < 30) {
      this.emit('suggestion', {
        type: 'fps_low',
        message: 'Low FPS detected. Consider:',
        suggestions: [
          'Add more worker threads',
          'Reduce widget complexity',
          'Enable progressive rendering',
          'Use lower resolution render pass'
        ]
      });
    }

    // If frame time variance is high
    if (stats.maxFrameTime - stats.minFrameTime > 10) {
      this.emit('suggestion', {
        type: 'frame_time_variance',
        message: 'High frame time variance detected.',
        suggestions: [
          'Consider using fixed timestep',
          'Enable frame smoothing'
        ]
      });
    }
  }

  /**
   * Get performance report
   */
  getReport(): any {
    if (this.metrics.length === 0) {
      return { error: 'No metrics collected yet' };
    }

    const avgMetrics = this.metrics.reduce(
      (acc, m) => {
        acc.frameTime += m.frameTime;
        acc.fps += m.fps;
        acc.renderTime += m.renderTime;
        return acc;
      },
      { frameTime: 0, fps: 0, renderTime: 0 }
    );

    const count = this.metrics.length;

    return {
      average: {
        frameTime: avgMetrics.frameTime / count,
        fps: avgMetrics.fps / count,
        renderTime: avgMetrics.renderTime / count
      },
      latest: this.metrics[this.metrics.length - 1],
      max: {
        frameTime: Math.max(...this.metrics.map(m => m.frameTime)),
        fps: Math.max(...this.metrics.map(m => m.fps)),
        renderTime: Math.max(...this.metrics.map(m => m.renderTime))
      },
      min: {
        frameTime: Math.min(...this.metrics.map(m => m.frameTime)),
        fps: Math.min(...this.metrics.map(m => m.fps)),
        renderTime: Math.min(...this.metrics.map(m => m.renderTime))
      },
      samples: count,
      currentFps: this.fpsHistory[this.fpsHistory.length - 1] || 0
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.frameTimes = [];
    this.renderTimes = [];
    this.fpsHistory = [];
  }
}
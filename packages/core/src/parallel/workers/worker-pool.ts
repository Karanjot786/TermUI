/**
 * Worker Pool Manager
 * Manages a pool of worker threads for parallel rendering
 */

import { Worker } from 'bun';
import { EventEmitter } from 'events';
import { WorkerTask, WorkerResult, ParallelRendererConfig } from '../types';

interface WorkerInfo {
  id: number;
  worker: Worker;
  busy: boolean;
  currentTask?: string;
  stats: {
    tasksCompleted: number;
    totalTime: number;
    avgTime: number;
  };
}

export class WorkerPool extends EventEmitter {
  private workers: WorkerInfo[] = [];
  private taskQueue: WorkerTask[] = [];
  private config: ParallelRendererConfig;
  private isRunning = false;

  constructor(config: ParallelRendererConfig) {
    super();
    this.config = config;
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    const numWorkers = this.config.workers || navigator.hardwareConcurrency || 4;
    const maxWorkers = this.config.maxWorkers || numWorkers;

    for (let i = 0; i < Math.min(numWorkers, maxWorkers); i++) {
      this.createWorker(i);
    }

    console.log(`🔧 Worker pool initialized with ${this.workers.length} workers`);
  }

  /**
   * Create a new worker
   */
  private createWorker(id: number): void {
    // In Bun, we can use worker threads
    const worker = new Worker(new URL('./render-worker.ts', import.meta.url), {
      type: 'module'
    });

    const workerInfo: WorkerInfo = {
      id,
      worker,
      busy: false,
      stats: {
        tasksCompleted: 0,
        totalTime: 0,
        avgTime: 0
      }
    };

    // Handle worker messages
    worker.addEventListener('message', (event) => {
      this.handleWorkerMessage(workerInfo, event.data);
    });

    // Handle worker errors
    worker.addEventListener('error', (error) => {
      console.error(`Worker ${id} error:`, error);
      // Recreate worker if it fails
      this.recreateWorker(id);
    });

    this.workers.push(workerInfo);
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerInfo: WorkerInfo, data: any): void {
    if (data.type === 'result') {
      const result: WorkerResult = data.payload;
      this.emit('taskComplete', result);
      workerInfo.busy = false;
      workerInfo.stats.tasksCompleted++;
      workerInfo.stats.totalTime += result.renderTime;
      workerInfo.stats.avgTime = workerInfo.stats.totalTime / workerInfo.stats.tasksCompleted;

      // Process next task
      this.processQueue();
    }
  }

  /**
   * Submit a task to the pool
   */
  submitTask(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      task.callback = (result: WorkerResult) => resolve(result);
      this.taskQueue.push(task);
      
      // Process queue immediately if possible
      this.processQueue();
    });
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0 || this.isRunning) return;

    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    // Get next task based on priority
    const task = this.getNextTask();
    if (!task) return;

    this.isRunning = true;
    availableWorker.busy = true;
    availableWorker.currentTask = task.id;

    // Send task to worker
    availableWorker.worker.postMessage({
      type: 'task',
      payload: {
        taskId: task.id,
        data: task.data,
        priority: task.priority,
        timestamp: task.timestamp
      }
    });

    this.isRunning = false;

    // Process next task if queue isn't empty
    if (this.taskQueue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Get next task based on priority
   */
  private getNextTask(): WorkerTask | null {
    if (this.taskQueue.length === 0) return null;

    // Sort by priority and timestamp
    const priorityMap = { high: 0, normal: 1, low: 2 };
    this.taskQueue.sort((a, b) => {
      const aPriority = priorityMap[a.priority] || 1;
      const bPriority = priorityMap[b.priority] || 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.timestamp - b.timestamp;
    });

    return this.taskQueue.shift() || null;
  }

  /**
   * Recreate a failed worker
   */
  private recreateWorker(id: number): void {
    const index = this.workers.findIndex(w => w.id === id);
    if (index === -1) return;

    // Remove old worker
    this.workers[index].worker.terminate();
    this.workers.splice(index, 1);

    // Create new worker
    this.createWorker(id);
    console.log(`🔄 Worker ${id} recreated`);
  }

  /**
   * Get worker statistics
   */
  getStats(): any {
    const stats = {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueSize: this.taskQueue.length,
      workerStats: this.workers.map(w => ({
        id: w.id,
        tasksCompleted: w.stats.tasksCompleted,
        avgTime: w.stats.avgTime
      }))
    };
    return stats;
  }

  /**
   * Adjust worker count dynamically
   */
  adjustWorkerCount(): void {
    const stats = this.getStats();
    const queueLength = stats.queueSize;
    const busyRatio = stats.busyWorkers / stats.totalWorkers;

    // If queue is growing and workers are mostly busy, add more workers
    if (queueLength > 10 && busyRatio > 0.8 && this.workers.length < (this.config.maxWorkers || 8)) {
      this.createWorker(this.workers.length);
      console.log(`📈 Added worker (total: ${this.workers.length})`);
    }

    // If workers are mostly idle and queue is empty, remove some workers
    if (queueLength === 0 && busyRatio < 0.2 && this.workers.length > (this.config.minWorkers || 2)) {
      const worker = this.workers.pop();
      if (worker) {
        worker.worker.terminate();
        console.log(`📉 Removed worker (total: ${this.workers.length})`);
      }
    }
  }

  /**
   * Shutdown all workers
   */
  shutdown(): void {
    for (const worker of this.workers) {
      worker.worker.terminate();
    }
    this.workers = [];
    this.taskQueue = [];
    console.log('🛑 Worker pool shutdown');
  }
}
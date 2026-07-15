/**
 * Render Scheduler
 * Manages task scheduling and prioritization
 */

import { EventEmitter } from 'events';
import { WorkerTask, ParallelRenderOptions } from '../types';

export interface ScheduledTask extends WorkerTask {
  scheduledAt: number;
  deadline: number;
  retries: number;
}

export class RenderScheduler extends EventEmitter {
  private queue: ScheduledTask[] = [];
  private runningTasks: Set<string> = new Set();
  private frameTime = 16.67; // 60fps target
  private isPaused = false;

  constructor() {
    super();
    this.startFrameLoop();
  }

  /**
   * Schedule a render task
   */
  schedule(task: WorkerTask, options?: ParallelRenderOptions): void {
    const scheduledTask: ScheduledTask = {
      ...task,
      scheduledAt: Date.now(),
      deadline: Date.now() + this.frameTime,
      retries: 0
    };

    this.queue.push(scheduledTask);
    this.sortQueue();
    this.emit('taskScheduled', scheduledTask);
  }

  /**
   * Sort queue by priority
   */
  private sortQueue(): void {
    const priorityMap = { high: 0, normal: 1, low: 2 };
    this.queue.sort((a, b) => {
      const aPriority = priorityMap[a.priority] || 1;
      const bPriority = priorityMap[b.priority] || 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.scheduledAt - b.scheduledAt;
    });
  }

  /**
   * Get next task
   */
  getNextTask(): ScheduledTask | null {
    if (this.isPaused || this.queue.length === 0) return null;
    
    // Check if we're within frame time
    const task = this.queue[0];
    if (Date.now() > task.deadline) {
      // Task missed deadline, increase priority
      task.priority = task.priority === 'low' ? 'normal' : 'high';
      this.sortQueue();
      return this.getNextTask();
    }

    const nextTask = this.queue.shift();
    if (nextTask) {
      this.runningTasks.add(nextTask.id);
    }
    return nextTask || null;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string): void {
    this.runningTasks.delete(taskId);
    this.emit('taskComplete', taskId);
  }

  /**
   * Retry a failed task
   */
  retryTask(task: ScheduledTask): void {
    if (task.retries >= 3) {
      this.emit('taskFailed', task);
      return;
    }

    task.retries++;
    task.priority = task.priority === 'low' ? 'normal' : 'high';
    task.deadline = Date.now() + this.frameTime;
    this.queue.unshift(task);
    this.emit('taskRetry', task);
  }

  /**
   * Start frame loop
   */
  private startFrameLoop(): void {
    setInterval(() => {
      this.processFrame();
    }, this.frameTime);
  }

  /**
   * Process a single frame
   */
  private processFrame(): void {
    if (this.isPaused) return;

    const startTime = performance.now();
    const tasksToProcess = [];

    // Collect tasks for this frame
    while (this.queue.length > 0) {
      const task = this.queue[0];
      if (this.runningTasks.size >= 4) break; // Limit concurrent tasks
      
      const nextTask = this.getNextTask();
      if (nextTask) {
        tasksToProcess.push(nextTask);
      } else {
        break;
      }
    }

    // Emit frame event
    const frameTime = performance.now() - startTime;
    this.emit('frameProcessed', {
      tasks: tasksToProcess.length,
      remaining: this.queue.length,
      running: this.runningTasks.size,
      frameTime
    });
  }

  /**
   * Pause scheduling
   */
  pause(): void {
    this.isPaused = true;
    this.emit('paused');
  }

  /**
   * Resume scheduling
   */
  resume(): void {
    this.isPaused = false;
    this.emit('resumed');
  }

  /**
   * Get queue statistics
   */
  getStats(): any {
    return {
      queueLength: this.queue.length,
      runningTasks: this.runningTasks.size,
      isPaused: this.isPaused,
      frameTime: this.frameTime,
      tasksByPriority: {
        high: this.queue.filter(t => t.priority === 'high').length,
        normal: this.queue.filter(t => t.priority === 'normal').length,
        low: this.queue.filter(t => t.priority === 'low').length
      }
    };
  }
}
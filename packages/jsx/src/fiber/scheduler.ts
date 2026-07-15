/**
 * Fiber Scheduler with time-slicing
 * Breaks work into 16ms chunks (60fps)
 */

import { FiberNode, FiberPriority } from './FiberNode';

type WorkCallback = (deadline: IdleDeadline) => boolean;

class FiberScheduler {
  private workQueue: { callback: WorkCallback; priority: FiberPriority }[] = [];
  private isWorkScheduled = false;
  private currentPriority: FiberPriority = FiberPriority.NORMAL;

  /**
   * Schedule work with priority
   */
  scheduleWork(callback: WorkCallback, priority: FiberPriority = FiberPriority.NORMAL): void {
    this.workQueue.push({ callback, priority });
    this.workQueue.sort((a, b) => a.priority - b.priority);
    
    if (!this.isWorkScheduled) {
      this.isWorkScheduled = true;
      requestIdleCallback(this.performWork.bind(this));
    }
  }

  /**
   * Perform work in chunks
   */
  private performWork(deadline: IdleDeadline): void {
    while (this.workQueue.length > 0 && deadline.timeRemaining() > 1) {
      const work = this.workQueue.shift()!;
      this.currentPriority = work.priority;
      
      const shouldContinue = work.callback(deadline);
      
      if (shouldContinue) {
        // Re-queue work that needs more time
        this.workQueue.unshift(work);
        break;
      }
    }

    if (this.workQueue.length > 0) {
      // More work to do, schedule another frame
      requestIdleCallback(this.performWork.bind(this));
    } else {
      this.isWorkScheduled = false;
    }
  }

  /**
   * Get current priority
   */
  getPriority(): FiberPriority {
    return this.currentPriority;
  }

  /**
   * Cancel all scheduled work
   */
  cancelWork(): void {
    this.workQueue = [];
    this.isWorkScheduled = false;
  }
}

export const scheduler = new FiberScheduler();
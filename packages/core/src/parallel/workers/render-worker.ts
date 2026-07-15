/**
 * Render Worker
 * Runs in separate thread to render screen sections
 */

import { parentPort } from 'worker_threads';
import { ScreenSection, WorkerResult } from '../types';

// Worker state
let currentTask: any = null;
let isRendering = false;

/**
 * Handle messages from main thread
 */
if (parentPort) {
  parentPort.on('message', async (message) => {
    if (message.type === 'task') {
      await handleTask(message.payload);
    }
  });
}

/**
 * Handle a render task
 */
async function handleTask(payload: any): Promise<void> {
  const { taskId, data, priority, timestamp } = payload;
  
  if (isRendering) {
    // Skip if already rendering (backpressure)
    return;
  }

  isRendering = true;
  currentTask = { taskId, data };

  try {
    // Start timing
    const startTime = performance.now();

    // Render the section
    const result = await renderSection(data);

    // Calculate render time
    const renderTime = performance.now() - startTime;

    // Send result back
    const workerResult: WorkerResult = {
      taskId,
      data: result,
      renderTime,
      workerId: getWorkerId(),
      section: data.section
    };

    if (parentPort) {
      parentPort.postMessage({
        type: 'result',
        payload: workerResult
      });
    }
  } catch (error) {
    // Send error back
    if (parentPort) {
      parentPort.postMessage({
        type: 'error',
        payload: {
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  } finally {
    isRendering = false;
    currentTask = null;
  }
}

/**
 * Render a screen section
 */
async function renderSection(data: any): Promise<any> {
  const { section, widgets, options } = data;
  
  // Validate section
  if (!section) {
    throw new Error('No section provided');
  }

  // Render each widget in the section
  const renderedWidgets = [];
  for (const widget of widgets) {
    // Check if widget overlaps with section
    if (isWidgetInSection(widget, section)) {
      const rendered = await renderWidget(widget, section, options);
      renderedWidgets.push(rendered);
    }
  }

  // Sort by z-index
  renderedWidgets.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return {
    section,
    widgets: renderedWidgets,
    timestamp: Date.now()
  };
}

/**
 * Check if widget is in section
 */
function isWidgetInSection(widget: any, section: ScreenSection): boolean {
  const widgetX = widget.x || 0;
  const widgetY = widget.y || 0;
  const widgetWidth = widget.width || 0;
  const widgetHeight = widget.height || 0;

  return !(widgetX + widgetWidth < section.x ||
           widgetX > section.x + section.width ||
           widgetY + widgetHeight < section.y ||
           widgetY > section.y + section.height);
}

/**
 * Render a single widget
 */
async function renderWidget(widget: any, section: ScreenSection, options: any): Promise<any> {
  // This would call the actual widget renderer
  // For now, return a placeholder
  return {
    id: widget.id,
    type: widget.type,
    x: widget.x - section.x,
    y: widget.y - section.y,
    width: widget.width,
    height: widget.height,
    zIndex: widget.zIndex || 0,
    content: `Widget ${widget.id}`,
    renderTime: 0
  };
}

/**
 * Get worker ID from environment
 */
function getWorkerId(): number {
  return parseInt(process.env.WORKER_ID || '0', 10);
}
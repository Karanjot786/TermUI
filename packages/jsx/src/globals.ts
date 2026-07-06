import type { Widget } from '@termuijs/widgets';
import type { Fiber } from './hooks.js';

export const instanceMap = new Map<Widget, any>();
export const fiberToWidgetMap = new Map<Fiber, Widget>();
export const suspendedFibers = new Map<number, { promise: Promise<any>; fiber: Fiber }>();
export const activeApps: any[] = [];

// Backward-compatible globalThis aliases so @termuijs/testing and external
// consumers that read from globalThis continue to work.
(globalThis as any).__termuijs_instances = instanceMap;
(globalThis as any).__termuijs_fiberToWidget = fiberToWidgetMap;
(globalThis as any).__termuijs_suspendedFibers = suspendedFibers;
(globalThis as any).__termuijs_apps = activeApps;

import type { Widget } from '@termuijs/widgets';
import type { Fiber } from './hooks.js';

// Widget instances keyed by their widget ref. Value type is `any` because
// the stored instance varies per widget type (Box, Text, Table, etc.).
export const instanceMap = new Map<Widget, any>();
export const fiberToWidgetMap = new Map<Fiber, Widget>();
// Suspended fibers awaiting async hook resolution. Promise<any> because the
// resolved value type varies per hook (data fetch, subprocess, etc.).
export const suspendedFibers = new Map<number, { promise: Promise<any>; fiber: Fiber }>();
// Active App instances from @termuijs/core. Typed as `any[]` to avoid a
// circular dependency — importing App would create a core → jsx → core cycle.
export const activeApps: any[] = [];

// Backward-compatible globalThis aliases so @termuijs/testing and external
// consumers that read from globalThis continue to work.
(globalThis as any).__termuijs_instances = instanceMap;       // `any` required: globalThis has no __termuijs types
(globalThis as any).__termuijs_fiberToWidget = fiberToWidgetMap;
(globalThis as any).__termuijs_suspendedFibers = suspendedFibers;
(globalThis as any).__termuijs_apps = activeApps;

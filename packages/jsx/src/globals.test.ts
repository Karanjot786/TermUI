// ─────────────────────────────────────────────────────
// @termuijs/jsx — Tests for the globals module
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    instanceMap,
    fiberToWidgetMap,
    suspendedFibers,
    activeApps,
} from './globals.js';

describe('globals module exports', () => {
    it('instanceMap is initialized as an empty Map', () => {
        expect(instanceMap).toBeInstanceOf(Map);
        expect(instanceMap.size).toBe(0);
    });

    it('fiberToWidgetMap is initialized as an empty Map', () => {
        expect(fiberToWidgetMap).toBeInstanceOf(Map);
        expect(fiberToWidgetMap.size).toBe(0);
    });

    it('suspendedFibers is initialized as an empty Map', () => {
        expect(suspendedFibers).toBeInstanceOf(Map);
        expect(suspendedFibers.size).toBe(0);
    });

    it('activeApps is initialized as an empty array', () => {
        expect(Array.isArray(activeApps)).toBe(true);
        expect(activeApps.length).toBe(0);
    });
});

describe('globalThis aliases are the same objects as named exports', () => {
    it('__termuijs_instances aliases instanceMap', () => {
        expect((globalThis as any).__termuijs_instances).toBe(instanceMap);
    });

    it('__termuijs_fiberToWidget aliases fiberToWidgetMap', () => {
        expect((globalThis as any).__termuijs_fiberToWidget).toBe(fiberToWidgetMap);
    });

    it('__termuijs_suspendedFibers aliases suspendedFibers', () => {
        expect((globalThis as any).__termuijs_suspendedFibers).toBe(suspendedFibers);
    });

    it('__termuijs_apps aliases activeApps', () => {
        expect((globalThis as any).__termuijs_apps).toBe(activeApps);
    });
});

describe('named exports and globalThis aliases stay in sync', () => {
    it('mutating instanceMap is reflected in __termuijs_instances', () => {
        const widget = { type: 'box', props: {}, children: [] } as any;
        instanceMap.set(widget, { id: 'w1' });
        expect((globalThis as any).__termuijs_instances.get(widget)).toEqual({ id: 'w1' });
        instanceMap.delete(widget); // clean up
    });

    it('mutating fiberToWidgetMap is reflected in __termuijs_fiberToWidget', () => {
        const fiber = { id: 'f1' } as any;
        const widget = { type: 'box', props: {}, children: [] } as any;
        fiberToWidgetMap.set(fiber, widget);
        expect((globalThis as any).__termuijs_fiberToWidget.get(fiber)).toBe(widget);
        fiberToWidgetMap.delete(fiber); // clean up
    });

    it('mutating suspendedFibers is reflected in __termuijs_suspendedFibers', () => {
        const fiber = { id: 'f2' } as any;
        const promise = Promise.resolve('data');
        const entry = { promise, fiber };
        suspendedFibers.set(42, entry);
        const alias = (globalThis as any).__termuijs_suspendedFibers;
        expect(alias.get(42)).toBe(entry);
        suspendedFibers.delete(42); // clean up
    });

    it('mutating activeApps is reflected in __termuijs_apps', () => {
        const appInstance = { id: 'app1', mount: () => {} };
        activeApps.push(appInstance);
        expect((globalThis as any).__termuijs_apps).toContain(appInstance);
        activeApps.pop(); // clean up
    });
});

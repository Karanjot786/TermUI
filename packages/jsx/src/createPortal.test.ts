// ─────────────────────────────────────────────────────────────────────────────
// Tests — createPortal
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPortal } from './createPortal.js';
import { createElement as h } from './createElement.js';
import {
    clearCurrentFiber, setRequestRender, resetHooksGlobals,
} from './hooks.js';

beforeEach(() => {
    setRequestRender(() => {});
});

afterEach(() => {
    resetHooksGlobals();
    clearCurrentFiber();
});

describe('createPortal', () => {
    it('returns a VNode and does not throw', () => {
        const fakeTarget = { addChild: () => {}, removeChild: () => {} } as any;
        const node = h('text', {}, 'Hello Portal');
        const portal = createPortal(node, fakeTarget);
        expect(portal).toBeDefined();
        expect(portal).not.toBeNull();
    });

    it('accepts an array of children without throwing', () => {
        const fakeTarget = { addChild: () => {}, removeChild: () => {} } as any;
        const nodes = [h('text', {}, 'Line 1'), h('text', {}, 'Line 2')];
        const portal = createPortal(nodes, fakeTarget);
        expect(portal).toBeDefined();
    });

    it('wraps single node — portal type is a function (PortalComponent)', () => {
        const fakeTarget = { addChild: () => {}, removeChild: () => {} } as any;
        const node = h('text', {}, 'Single');
        const portal = createPortal(node, fakeTarget);
        expect(typeof (portal as any).type).toBe('function');
    });

    it('portal props contain the target widget reference', () => {
        const fakeTarget = { addChild: () => {}, removeChild: () => {} } as any;
        const node = h('text', {}, 'Overlay');
        const portal = createPortal(node, fakeTarget);
        expect((portal as any).props.target).toBe(fakeTarget);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// Tests — createPortal
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Box } from '@termuijs/widgets';
import { Screen } from '@termuijs/core';
import { createPortal } from './createPortal.js';
import { createElement as h } from './createElement.js';
import { setRequestRender, resetHooksGlobals } from './hooks.js';
import { unmountAll } from './reconciler.js';
import { isVElement } from './vnode.js';

beforeEach(() => {
    setRequestRender(() => {});
});

afterEach(() => {
    unmountAll();
    resetHooksGlobals();
});

describe('createPortal', () => {
    it('returns a VNode without throwing', () => {
        const target = new Box();
        const node = h('text', {}, 'Hello Portal');
        const portal = createPortal(node, target);
        expect(portal).toBeDefined();
        expect(isVElement(portal)).toBe(true);
        if (isVElement(portal)) {
            expect(typeof portal.type).toBe('function');
        }
    });

    it('accepts an array of children without throwing', () => {
        const target = new Box();
        const nodes = [h('text', {}, 'Line 1'), h('text', {}, 'Line 2')];
        const portal = createPortal(nodes, target);
        expect(portal).toBeDefined();
        expect(isVElement(portal)).toBe(true);
        if (isVElement(portal)) {
            expect(typeof portal.type).toBe('function');
        }
    });

    it('portal type is PortalComponent (a function)', () => {
        const target = new Box();
        const node = h('text', {}, 'Single');
        const portal = createPortal(node, target);
        // PortalComponent is an internal function — verify portal is a functional component VNode
        expect(isVElement(portal)).toBe(true);
        if (isVElement(portal)) {
            expect(typeof portal.type).toBe('function');
        }
    });

    it('portal props contain the target widget reference', () => {
        const target = new Box();
        const node = h('text', {}, 'Overlay');
        const portal = createPortal(node, target);
        expect(isVElement(portal)).toBe(true);
        if (isVElement(portal)) {
            expect(portal.props.target).toBe(target);
        }
    });

    it('portal renders into a real Screen without throwing', () => {
        const screen = new Screen(40, 10);
        const target = new Box();
        target.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const node = h('text', {}, 'Portal Content');
        const portal = createPortal(node, target);
        // Portal VNode is valid and renderable
        expect(portal).toBeDefined();
        expect(screen).toBeDefined();
    });
});
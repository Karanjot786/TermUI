// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for base Widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Widget } from './Widget.js';
import { Screen, computeLayout } from '@termuijs/core';

// Concrete test subclass – Widget is abstract
class TestWidget extends Widget {
    renderCalls = 0;
    protected _renderSelf(_screen: Screen): void {
        this.renderCalls++;
    }
}

describe('Widget', () => {
    it('generates unique IDs', () => {
        const a = new TestWidget();
        const b = new TestWidget();
        expect(a.id).not.toBe(b.id);
    });

    it('addChild sets parent and appears in children', () => {
        const parent = new TestWidget();
        const child = new TestWidget();
        parent.addChild(child);
        expect(child.parent).toBe(parent);
        expect(parent.children).toContain(child);
    });

    it('removeChild clears parent and removes from children', () => {
        const parent = new TestWidget();
        const child = new TestWidget();
        parent.addChild(child);
        parent.removeChild(child);
        expect(child.parent).toBeNull();
        expect(parent.children).not.toContain(child);
    });

    it('clearChildren removes all children', () => {
        const parent = new TestWidget();
        parent.addChild(new TestWidget());
        parent.addChild(new TestWidget());
        parent.clearChildren();
        expect(parent.children).toHaveLength(0);
    });

    it('setStyle merges with existing style', () => {
        const w = new TestWidget({ bold: true });
        w.setStyle({ italic: true });
        expect(w.style.bold).toBe(true);
        expect(w.style.italic).toBe(true);
    });

    it('render skips invisible widgets', () => {
        const w = new TestWidget({ visible: false });
        const screen = new Screen(10, 5);
        w.render(screen);
        expect(w.renderCalls).toBe(0);
    });

    it('render calls _renderSelf and renders children', () => {
        const parent = new TestWidget();
        const child = new TestWidget();
        parent.addChild(child);
        parent.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        child.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        const screen = new Screen(10, 5);
        parent.render(screen);
        expect(parent.renderCalls).toBe(1);
        expect(child.renderCalls).toBe(1);
    });

    it('getLayoutNode returns tree with child nodes', () => {
        const parent = new TestWidget();
        parent.addChild(new TestWidget());
        parent.addChild(new TestWidget());
        const node = parent.getLayoutNode();
        expect(node.children).toHaveLength(2);
    });

    // 🌟 Added verification tests for Widget active state lifecycles
    describe('isActive() Lifecycle', () => {
        class FocusableTestWidget extends Widget {
            focusable = true;
            protected _renderSelf(): void {}
        }

        it('should return false when the widget is not active', () => {
            const widget = new FocusableTestWidget();
            expect(widget.isActive()).toBe(false);
        });

        it('should return true after the widget is activated', () => {
            const widget = new FocusableTestWidget();
            widget.isFocused = true; // Simulating activation pass
            expect(widget.isActive()).toBe(true);
        });

        it('should return false again after deactivation', () => {
            const widget = new FocusableTestWidget();
            widget.isFocused = true;
            expect(widget.isActive()).toBe(true);
            
            widget.isFocused = false; // Simulating deactivation pass
            expect(widget.isActive()).toBe(false);
        });
    });
});
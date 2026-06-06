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

class ErrorWidget extends Widget {
    protected _renderSelf(_screen: Screen): void {
        throw new Error('render failure');
    }
}

class RecoversWidget extends Widget {
    callCount = 0;
    protected _renderSelf(_screen: Screen): void {
        this.callCount++;
        if (this.callCount === 1) {
            throw new Error('first call fails');
        }
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

    it('captures render errors in _renderError', () => {
        const w = new ErrorWidget();
        const screen = new Screen(10, 5);
        w.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        w.render(screen);
        expect(w.renderError).toBeInstanceOf(Error);
        expect(w.renderError!.message).toBe('render failure');
    });

    it('stays dirty after render error for retry on next frame', () => {
        const w = new ErrorWidget();
        const screen = new Screen(10, 5);
        w.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        expect(w.isDirty).toBe(true);
        w.render(screen);
        expect(w.isDirty).toBe(true);
        expect(w.renderError).toBeInstanceOf(Error);
    });

    it('clearDirty does not clear errored widgets', () => {
        const parent = new TestWidget();
        const child = new ErrorWidget();
        parent.addChild(child);
        const screen = new Screen(10, 5);
        child.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        parent.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        parent.render(screen);
        parent.clearDirty();
        expect(child.isDirty).toBe(true);
        expect(parent.isDirty).toBe(true);
    });

    it('recovers after render error on subsequent attempt', () => {
        const w = new RecoversWidget();
        const screen = new Screen(10, 5);
        w.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        w.render(screen);
        expect(w.renderError).toBeInstanceOf(Error);
        expect(w.isDirty).toBe(true);
        w.clearDirty();
        w._renderError = null;
        w.render(screen);
        expect(w.renderError).toBeNull();
        expect(w.callCount).toBe(2);
    });

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
            widget.isFocused = true;
            expect(widget.isActive()).toBe(true);
        });

        it('should return false again after deactivation', () => {
            const widget = new FocusableTestWidget();
            widget.isFocused = true;
            expect(widget.isActive()).toBe(true);
            widget.isFocused = false;
            expect(widget.isActive()).toBe(false);
        });
    });
});

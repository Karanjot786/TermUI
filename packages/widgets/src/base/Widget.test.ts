// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for base Widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';

vi.mock('@termuijs/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@termuijs/core')>();
    return {
        ...actual,
        prefersReducedMotion: () => false,
    };
});
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

// Exposes the protected sanitize() so tests can exercise both the default
// (sanitizeContent = true) and raw (sanitizeContent = false) code paths
// directly, independent of any specific widget's render pipeline.
class SanitizingWidget extends Widget {
    protected _renderSelf(_screen: Screen): void {}
    setRaw(raw: boolean): void {
        this.sanitizeContent = !raw;
    }
    publicSanitize(text: string): string {
        return this.sanitize(text);
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

    it('tracks render count', () => {
        const widget = new TestWidget();
        const screen = new Screen(10, 5);
    
        widget.render(screen);
        widget.render(screen);
    
        expect(
            widget.getRenderStats().renderCount,
        ).toBe(2);
    });
    
    it('tracks last render duration', () => {
        const widget = new TestWidget();
        const screen = new Screen(10, 5);
    
        widget.render(screen);
    
        expect(
            widget.getRenderStats().lastDurationMs,
        ).toBeGreaterThanOrEqual(0);
    });
    
    it('tracks total render duration', () => {
        const widget = new TestWidget();
        const screen = new Screen(10, 5);
    
        widget.render(screen);
    
        expect(
            widget.getRenderStats().totalDurationMs,
        ).toBeGreaterThanOrEqual(0);
    });
    
    it('calculates average render duration', () => {
        const widget = new TestWidget();
        const screen = new Screen(10, 5);
    
        widget.render(screen);
        widget.render(screen);
    
        expect(
            widget.getAverageRenderDuration(),
        ).toBeGreaterThanOrEqual(0);
    });
    
    it('returns zero average when no renders occurred', () => {
        const widget = new TestWidget();
    
        expect(
            widget.getAverageRenderDuration(),
        ).toBe(0);
    });

    describe('child hierarchy dirty marking', () => {
        it('marks parent dirty when addChild is called', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            parent.clearDirty();
            expect(parent.isDirty).toBe(false);
            parent.addChild(child);
            expect(parent.isDirty).toBe(true);
        });

        it('marks parent dirty when removeChild is called', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            parent.addChild(child);
            parent.clearDirty();
            expect(parent.isDirty).toBe(false);
            parent.removeChild(child);
            expect(parent.isDirty).toBe(true);
        });

        it('marks parent dirty when clearChildren is called', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            parent.addChild(child);
            parent.clearDirty();
            expect(parent.isDirty).toBe(false);
            parent.clearChildren();
            expect(parent.isDirty).toBe(true);
        });
    });

    describe('destroy() lifecycle', () => {
        it('emits unmount and removes event listeners', () => {
            const w = new TestWidget();
            const unmountHandler = vi.fn();
            w.events.on('unmount', unmountHandler);
            w.destroy();
            expect(unmountHandler).toHaveBeenCalledOnce();
            // After destroy, events are removed — further emissions are no-ops
            w.events.emit('unmount', undefined as any);
            expect(unmountHandler).toHaveBeenCalledOnce();
        });

        it('nulls parent reference', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            parent.addChild(child);
            child.destroy();
            expect(child.parent).toBeNull();
        });

        it('destroys children recursively', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            const grandchild = new TestWidget();
            parent.addChild(child);
            child.addChild(grandchild);
            const grandchildUnmount = vi.fn();
            grandchild.events.on('unmount', grandchildUnmount);
            parent.destroy();
            expect(grandchildUnmount).toHaveBeenCalledOnce();
            expect(grandchild.parent).toBeNull();
        });

        it('removeChild calls destroy on the removed child', () => {
            const parent = new TestWidget();
            const child = new TestWidget();
            parent.addChild(child);
            const unmountHandler = vi.fn();
            child.events.on('unmount', unmountHandler);
            parent.removeChild(child);
            expect(unmountHandler).toHaveBeenCalledOnce();
        });

        it('clearChildren calls destroy on all children', () => {
            const parent = new TestWidget();
            const c1 = new TestWidget();
            const c2 = new TestWidget();
            parent.addChild(c1);
            parent.addChild(c2);
            const u1 = vi.fn();
            const u2 = vi.fn();
            c1.events.on('unmount', u1);
            c2.events.on('unmount', u2);
            parent.clearChildren();
            expect(u1).toHaveBeenCalledOnce();
            expect(u2).toHaveBeenCalledOnce();
            expect(c1.parent).toBeNull();
            expect(c2.parent).toBeNull();
        });

        it('destroy() calls the overridden unmount() exactly once', () => {
            const unmountFn = vi.fn();
            class LifecycleWidget extends TestWidget {
                override unmount(): void {
                    unmountFn();
                    super.unmount();
                }
            }
            const w = new LifecycleWidget();
            w.destroy();
            expect(unmountFn).toHaveBeenCalledTimes(1);
        });
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

async function advanceSpring(ms: number) {
    const steps = Math.ceil(ms / 16);
    for (let i = 0; i < steps; i++) {
        vi.advanceTimersByTime(16);
        await Promise.resolve();
    }
}

describe('Widget.sanitize()', () => {
    it('default mode (sanitizeContent = true) strips everything, including SGR', () => {
        const w = new SanitizingWidget();
        const out = w.publicSanitize('\x1b[31mred\x1b[0m\x1b[2Jcleared');
        expect(out).toBe('redcleared');
    });

    it('raw mode (sanitizeContent = false) is no longer a no-op: it strips OSC-52 clipboard exfiltration', () => {
        const w = new SanitizingWidget();
        w.setRaw(true);
        const out = w.publicSanitize('\x1b]52;c;ZXZpbA==\x07safe');
        expect(out).not.toContain('\x1b]52');
        expect(out).toBe('safe');
    });

    it('raw mode strips cursor movement and screen-clear sequences', () => {
        const w = new SanitizingWidget();
        w.setRaw(true);
        const out = w.publicSanitize('\x1b[2Jhi\x1b[10;20H');
        expect(out).not.toContain('\x1b[2J');
        expect(out).not.toContain('\x1b[10;20H');
        expect(out).toBe('hi');
    });

    it('raw mode still preserves SGR formatting sequences, matching the documented Text.raw behavior', () => {
        const w = new SanitizingWidget();
        w.setRaw(true);
        const out = w.publicSanitize('\x1b[31mred\x1b[0m');
        expect(out).toBe('\x1b[31mred\x1b[0m');
    });
});

describe('Widget.layoutTransition', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.unstubAllEnvs();
        vi.stubEnv('NO_MOTION', '');
        vi.stubEnv('CI', '');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('Widget.layoutTransition = true causes updateRect to animate rather than snap', async () => {
        class TransitionTestWidget extends Widget {
            protected _renderSelf(): void {}
        }
        
        const widget = new TransitionTestWidget({ id: 'test' });
        
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        expect(widget.rect).toEqual({ x: 0, y: 0, width: 10, height: 10 });

        widget.layoutTransition = true;
        
        widget.updateRect({ x: 100, y: 100, width: 100, height: 100 });
        
        await advanceSpring(64);
        
        const rect = widget.rect;
        expect(rect.x).toBeGreaterThan(0);
        expect(rect.x).toBeLessThan(100);
        expect(rect.width).toBeGreaterThan(10);
        expect(rect.width).toBeLessThan(100);
        
        await advanceSpring(5000);
        expect(widget.rect).toEqual({ x: 100, y: 100, width: 100, height: 100 });
    });

    describe('z-index styling and rendering order', () => {
        it('supports zIndex getter and setter', () => {
            const w = new TestWidget();
            expect(w.zIndex).toBe(0);
            w.zIndex = 5;
            expect(w.zIndex).toBe(5);
            expect(w.style.zIndex).toBe(5);
        });

        it('renders children sorted by zIndex (Painter\'s Algorithm)', () => {
            const parent = new TestWidget();
            const order: string[] = [];

            class OrderedWidget extends Widget {
                private _name: string;
                constructor(name: string, z: number) {
                    super({ zIndex: z });
                    this._name = name;
                }
                protected _renderSelf(): void {
                    order.push(this._name);
                }
            }

            const w1 = new OrderedWidget('first', 10);
            const w2 = new OrderedWidget('second', 5);
            const w3 = new OrderedWidget('third', 20);
            const w4 = new OrderedWidget('fourth', 5); // same zIndex as w2, should preserve insertion order

            parent.addChild(w1);
            parent.addChild(w2);
            parent.addChild(w3);
            parent.addChild(w4);

            const screen = new Screen(10, 5);
            parent.render(screen);

            // Sorted order by zIndex: w2 (5), w4 (5), w1 (10), w3 (20)
            expect(order).toEqual(['second', 'fourth', 'first', 'third']);
        });
    });
});



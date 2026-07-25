import { describe, it, expect, vi } from 'vitest';
import { App } from './App.js';
import { EventEmitter } from '../events/EventEmitter.js';
import { enableMouse, disableMouse } from '../utils/ansi.js';

function createInteractiveTestOptions(): any {
    const stdout = {
        columns: 80,
        rows: 24,
        isTTY: true,
        write() { return true; },
        on() {},
        off() {},
        once() {},
    };
    const stdin = {
        isTTY: true,
        isRaw: false,
        setRawMode() {},
        resume() {},
        pause() {},
        on() {},
        off() {},
    };
    return {
        forceFallback: false,
        skipFallback: true,
        screenMode: 'main',
        stdout,
        stdin,
    };
}

function createMockWidget(id: string, rect: { x: number; y: number; width: number; height: number }, style?: any): any {
    return {
        id,
        rect,
        style: style ?? { visible: true },
        events: new EventEmitter<any>(),
    };
}

describe('Mouse Event Handling Subsystem', () => {
    it('defines standard mouse tracking escape sequences', () => {
        expect(enableMouse).toContain('?1000h');
        expect(enableMouse).toContain('?1003h');
        expect(enableMouse).toContain('?1015h');
        expect(enableMouse).toContain('?1006h');

        expect(disableMouse).toContain('?1000l');
        expect(disableMouse).toContain('?1003l');
        expect(disableMouse).toContain('?1015l');
        expect(disableMouse).toContain('?1006l');
    });

    it('dispatches click events only when mousedown and mouseup hit the same widget', async () => {
        const root = createMockWidget('root', { x: 0, y: 0, width: 80, height: 24 });
        const child1 = createMockWidget('child1', { x: 0, y: 0, width: 5, height: 5 });
        const child2 = createMockWidget('child2', { x: 5, y: 0, width: 5, height: 5 });

        const app = new App(root, createInteractiveTestOptions());
        app.mount();

        // Populate the app's widget cache manually for test
        (app as any)._widgetById.set(child1.id, child1);
        (app as any)._widgetById.set(child2.id, child2);

        const clickSpy1 = vi.fn();
        child1.onClick = clickSpy1;

        const clickSpy2 = vi.fn();
        child2.onClick = clickSpy2;

        // 1. Click on child1: mousedown + mouseup on child1 (x=2, y=2)
        (app as any).input._events.emit('mouse', { x: 2, y: 2, type: 'mousedown', button: 'left' });
        (app as any).input._events.emit('mouse', { x: 2, y: 2, type: 'mouseup', button: 'left' });

        expect(clickSpy1).toHaveBeenCalledTimes(1);
        expect(clickSpy2).not.toHaveBeenCalled();

        clickSpy1.mockClear();

        // 2. Drag: mousedown on child1 (x=2, y=2) and mouseup on child2 (x=7, y=2) -> should NOT trigger onClick
        (app as any).input._events.emit('mouse', { x: 2, y: 2, type: 'mousedown', button: 'left' });
        (app as any).input._events.emit('mouse', { x: 7, y: 2, type: 'mouseup', button: 'left' });

        expect(clickSpy1).not.toHaveBeenCalled();
        expect(clickSpy2).not.toHaveBeenCalled();

        app.unmount();
    });

    it('triggers mouseenter and mouseleave callbacks when moving mouse between widgets', async () => {
        const root = createMockWidget('root', { x: 0, y: 0, width: 80, height: 24 });
        const child1 = createMockWidget('child1', { x: 0, y: 0, width: 5, height: 5 });
        const child2 = createMockWidget('child2', { x: 5, y: 0, width: 5, height: 5 });

        const app = new App(root, createInteractiveTestOptions());
        app.mount();

        (app as any)._widgetById.set(child1.id, child1);
        (app as any)._widgetById.set(child2.id, child2);

        const enterSpy1 = vi.fn();
        const leaveSpy1 = vi.fn();
        child1.onMouseEnter = enterSpy1;
        child1.onMouseLeave = leaveSpy1;

        const enterSpy2 = vi.fn();
        const leaveSpy2 = vi.fn();
        child2.onMouseEnter = enterSpy2;
        child2.onMouseLeave = leaveSpy2;

        // Mouse enters child1
        (app as any).input._events.emit('mouse', { x: 2, y: 2, type: 'mousemove', button: 'none' });
        expect(enterSpy1).toHaveBeenCalledTimes(1);
        expect(leaveSpy1).not.toHaveBeenCalled();

        enterSpy1.mockClear();

        // Mouse moves to child2 (leaves child1, enters child2)
        (app as any).input._events.emit('mouse', { x: 7, y: 2, type: 'mousemove', button: 'none' });
        expect(leaveSpy1).toHaveBeenCalledTimes(1);
        expect(enterSpy2).toHaveBeenCalledTimes(1);

        app.unmount();
    });
});

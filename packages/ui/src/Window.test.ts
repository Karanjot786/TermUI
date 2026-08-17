import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { Text } from '@termuijs/widgets';
import { Window } from './Window.js';
import { WindowManager } from './WindowManager.js';

describe('Window and WindowManager', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Window constructor & properties', () => {
        it('initializes with default options', () => {
            const win = new Window({ title: 'Test Window' });
            expect(win.title).toBe('Test Window');
            expect(win.windowX).toBe(0);
            expect(win.windowY).toBe(0);
            expect(win.windowWidth).toBe(30);
            expect(win.windowHeight).toBe(10);
            expect(win.isMinimized).toBe(false);
            expect(win.isMaximized).toBe(false);
            expect(win.isClosed).toBe(false);
        });

        it('can minimize and maximize', () => {
            const win = new Window({ x: 2, y: 3, width: 20, height: 10 });
            win.minimize();
            expect(win.isMinimized).toBe(true);

            win.maximize();
            expect(win.isMaximized).toBe(true);
            win.maximize();
            expect(win.isMaximized).toBe(false);
            expect(win.windowX).toBe(2);
            expect(win.windowY).toBe(3);
        });
    });

    describe('Window click target resolution', () => {
        it('identifies click targets in the header', () => {
            const win = new Window({
                width: 20,
                height: 10,
                closable: true,
                maximizable: true,
                minimizable: true,
            });
            // Update widget rect so size-dependent offsets resolve correctly
            win.updateRect({ x: 0, y: 0, width: 20, height: 10 });

            // Right border is at x=19. Closable at x=18, Maximizable at x=16, Minimizable at x=14
            expect(win.getClickTarget(18, 0)).toBe('close');
            expect(win.getClickTarget(16, 0)).toBe('maximize');
            expect(win.getClickTarget(14, 0)).toBe('minimize');
            expect(win.getClickTarget(5, 0)).toBe('title');
            expect(win.getClickTarget(5, 1)).toBeNull();
        });
    });

    describe('WindowManager rendering and z-stack', () => {
        it('adds windows and orders them on front click', () => {
            const wm = new WindowManager();
            const win1 = new Window({ title: 'Win 1' });
            const win2 = new Window({ title: 'Win 2' });

            wm.addWindow(win1);
            wm.addWindow(win2);

            expect(wm.children[0]).toBe(win1);
            expect(wm.children[1]).toBe(win2);

            // Trigger mouse down simulating a click on win1 to bring to front
            win1.updateRect({ x: 0, y: 0, width: 10, height: 10 });
            win2.updateRect({ x: 15, y: 15, width: 10, height: 10 });
            wm.updateRect({ x: 0, y: 0, width: 40, height: 40 });

            // Simulate mousedown at x=2, y=2 (hitting win1)
            const mousedownEvent = { x: 2, y: 2, type: 'mousedown' as const, button: 'left' as const };
            (wm as any)._handleGlobalMouse(mousedownEvent);

            expect(wm.children[0]).toBe(win2);
            expect(wm.children[1]).toBe(win1);
            expect(win1.isFocused).toBe(true);
            expect(win2.isFocused).toBe(false);
        });

        it('syncs window content positions', () => {
            vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
            const wm = new WindowManager();
            const win = new Window({ title: 'Test', x: 2, y: 3, width: 10, height: 10 });
            const txt = new Text('Inner text', { flexGrow: 1 });
            win.addChild(txt);
            wm.addWindow(win);

            wm.updateRect({ x: 0, y: 0, width: 40, height: 40 });
            wm.syncLayout();

            // Window absolute position should be: x = 2, y = 3
            expect(win.rect).toEqual({ x: 2, y: 3, width: 10, height: 10 });

            // Content area should start at: x = 2+1 = 3, y = 3+2 = 5
            expect(txt.rect).toEqual({ x: 3, y: 5, width: 8, height: 7 });
        });
    });
});

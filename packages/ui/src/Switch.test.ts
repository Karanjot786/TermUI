import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps, stringWidth } from '@termuijs/core';
import { Switch } from './Switch.js';

describe('Switch', () => {
         afterEach(() => {
          vi.restoreAllMocks();
         });
    it('initial state uses defaultValue', () => {
        const sw = new Switch({ defaultValue: true });

        expect(sw.value).toBe(true);
    });

    it('space toggles value', () => {
        const sw = new Switch({ defaultValue: false });

        sw.handleKey({
         key: 'space',
         ctrl: false,
         alt: false,
       } as any); // test: partial KeyEvent is sufficient for unit testing handleKey

        expect(sw.value).toBe(true);
    });

    it('left and right set value', () => {
        const sw = new Switch({ defaultValue: false });

        sw.handleKey({ key: 'right' } as any); // test: partial KeyEvent is sufficient for handleKey unit testing
        expect(sw.value).toBe(true);

        sw.handleKey({ key: 'left' } as any); // test: partial KeyEvent is sufficient for handleKey unit testing
        expect(sw.value).toBe(false);  
      });

    it('onChange fires only when value changes', () => {
        const onChange = vi.fn();

        const sw = new Switch({
            defaultValue: false,
            onChange,
        });

        sw.setValue(false);
        expect(onChange).not.toHaveBeenCalled();

        sw.setValue(true);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('renders label', () => {
        const sw = new Switch({
            label: 'Wifi',
            defaultValue: true,
        });

        sw.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });

        const screen = new Screen(20, 1);

        sw.render(screen);

        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        expect(row).toContain('Wifi');
    });

    it('supports ascii fallback', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const sw = new Switch({
            label: 'Wifi',
        });

        sw.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });

        const screen = new Screen(20, 1);

        sw.render(screen);

        const row = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        expect(row).toContain('O');
    });

    it('keeps the label and track within the widget width', () => {
        const sw = new Switch({
            label: 'Very long wireless label',
            defaultValue: true,
        });

        sw.updateRect({
            x: 0,
            y: 0,
            width: 5,
            height: 1,
        });

        const screen = new Screen(5, 1);
        const writeSpy = vi.spyOn(screen, 'writeString');
        const setCellSpy = vi.spyOn(screen, 'setCell');

        sw.render(screen);

        for (const call of writeSpy.mock.calls) {
            expect(call[0] + stringWidth(String(call[2]))).toBeLessThanOrEqual(5);
        }

        for (const call of setCellSpy.mock.calls) {
            expect(call[0]).toBeLessThan(5);
        }
    });
});

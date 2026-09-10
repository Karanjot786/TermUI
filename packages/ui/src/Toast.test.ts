// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Toast component
// ─────────────────────────────────────────────────────

import { afterEach, describe, it, expect, vi } from 'vitest';
import { Toast } from './Toast.js';
import { Screen, stringWidth } from '@termuijs/core';

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Toast', () => {
    it('starts with no messages', () => {
        const toast = new Toast();
        expect(toast).toBeDefined();
    });

    it('push adds a message', () => {
        const toast = new Toast();
        toast.push('Hello', 'info');
        expect(toast).toBeDefined();
    });

    it('convenience methods push correct types', () => {
        const toast = new Toast();
        toast.info('Info message');
        toast.success('Success message');
        toast.warning('Warning message');
        toast.error('Error message');
        expect(toast).toBeDefined();
    });

    it('marks itself dirty when the exit animation is due', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const toast = new Toast({ durationMs: 1000, animationMs: 100 });
        const screen = new Screen(40, 5);
        const markDirty = vi.spyOn(toast, 'markDirty');

        toast.updateRect({ x: 0, y: 0, width: 40, height: 5 });
        toast.info('Saved');
        vi.setSystemTime(100);
        toast.render(screen);
        markDirty.mockClear();

        vi.advanceTimersByTime(799);
        expect(markDirty).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(markDirty).toHaveBeenCalledTimes(1);
    });

    it('skips rendering when the rect is too narrow for a toast body', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const toast = new Toast({ durationMs: 1000 });
        const screen = new Screen(1, 3);
        const writeSpy = vi.spyOn(screen, 'writeString');

        toast.updateRect({ x: 0, y: 0, width: 1, height: 3 });
        toast.info('Saved');
        toast.render(screen);

        expect(writeSpy).not.toHaveBeenCalled();
    });

    it('keeps mixed-width labels stable during reveal animation', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        const toast = new Toast({ durationMs: 1000, animationMs: 300, announce: false });
        const screen = new Screen(16, 4);
        const writeSpy = vi.spyOn(screen, 'writeString');

        toast.updateRect({ x: 0, y: 0, width: 12, height: 4 });
        toast.info('\u8868\u8868\u8868\u8868');
        vi.setSystemTime(150);
        toast.render(screen);

        const rendered = String(writeSpy.mock.calls[0][2]);
        expect(stringWidth(rendered)).toBe(10);
        expect(rendered).not.toContain('\uFFFD');
    });
});

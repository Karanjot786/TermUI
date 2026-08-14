// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Toast widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Toast } from './Toast.js';
import { Screen, caps } from '@termuijs/core';

function renderToast(
    opts: ConstructorParameters<typeof Toast>[0],
    style: ConstructorParameters<typeof Toast>[1] = {},
    width = 30,
    height = 5,
) {
    const toast = new Toast(opts, style);
    const screen = new Screen(width, height);
    toast.updateRect({ x: 0, y: 0, width, height });
    toast.render(screen);
    return { toast, screen };
}

describe('Toast — Unicode rendering', () => {
    it('renders info variant with unicode icon and cyan border', () => {
        const { screen } = renderToast({ variant: 'info', message: 'Info toast' });

        expect(screen.back[0][0].char).toBe('┌');
        expect(screen.back[4][29].char).toBe('┘');
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'cyan' });

        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('● Info toast');
        expect(screen.back[2][2].fg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('renders success variant with unicode icon and green border', () => {
        const { screen } = renderToast({ variant: 'success', message: 'Success toast' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('✓ Success toast');
    });

    it('renders warning variant with unicode icon and yellow border', () => {
        const { screen } = renderToast({ variant: 'warning', message: 'Warning toast' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'yellow' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('! Warning toast');
    });

    it('renders error variant with unicode icon and red border', () => {
        const { screen } = renderToast({ variant: 'error', message: 'Error toast' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'red' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('✗ Error toast');
    });

    it('defaults to info variant when none is provided', () => {
        const { screen } = renderToast({ message: 'Default variant' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('● Default variant');
    });
});

describe('Toast — ASCII fallback', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses ASCII borders and fallback icon for info variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderToast({ variant: 'info', message: 'Info' });
        expect(screen.back[0][0].char).toBe('+');
        expect(screen.back[0][1].char).toBe('-');
        expect(screen.back[1][0].char).toBe('|');
        expect(screen.back[2].map(c => c.char).join('')).toContain('i Info');
    });

    it('uses ASCII borders and fallback icon for success variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderToast({ variant: 'success', message: 'Success' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[OK] Success');
    });

    it('uses ASCII borders and fallback icon for warning variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderToast({ variant: 'warning', message: 'Warning' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[!] Warning');
    });

    it('uses ASCII borders and fallback icon for error variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderToast({ variant: 'error', message: 'Error' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[x] Error');
    });
});

describe('Toast — Setters and Getters', () => {
    it('updates message and marks dirty', () => {
        const toast = new Toast({ message: 'initial', duration: 0 });
        toast.clearDirty();
        expect(toast.isDirty).toBe(false);

        toast.setMessage('updated');
        expect(toast.getMessage()).toBe('updated');
        expect(toast.isDirty).toBe(true);
    });

    it('updates variant and marks dirty', () => {
        const toast = new Toast({ message: 'test', variant: 'info', duration: 0 });
        toast.clearDirty();
        expect(toast.isDirty).toBe(false);

        toast.setVariant('success');
        expect(toast.getVariant()).toBe('success');
        expect(toast.isDirty).toBe(true);
    });

    it('does not mark dirty when setMessage receives the same value', () => {
        const toast = new Toast({ message: 'Build complete', duration: 0 });
        toast.clearDirty();

        toast.setMessage('Build complete');

        expect(toast.isDirty).toBe(false);
    });

    it('does not mark dirty when setVariant receives the same value', () => {
        const toast = new Toast({ message: 'Test', variant: 'success', duration: 0 });
        toast.clearDirty();

        toast.setVariant('success');

        expect(toast.isDirty).toBe(false);
    });
});

describe('Toast — auto-dismiss behavior', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('is visible immediately after creation', () => {
        const toast = new Toast({ message: 'Hello' });
        expect(toast.isVisible()).toBe(true);
    });

    it('auto-dismisses after the default duration (3000ms)', () => {
        const toast = new Toast({ message: 'Hello' });
        expect(toast.isVisible()).toBe(true);

        vi.advanceTimersByTime(3000);

        expect(toast.isVisible()).toBe(false);
    });

    it('auto-dismisses after a custom duration', () => {
        const toast = new Toast({ message: 'Hello', duration: 1000 });

        vi.advanceTimersByTime(999);
        expect(toast.isVisible()).toBe(true);

        vi.advanceTimersByTime(1);
        expect(toast.isVisible()).toBe(false);
    });

    it('does not auto-dismiss when duration is 0', () => {
        const toast = new Toast({ message: 'Hello', duration: 0 });

        vi.advanceTimersByTime(10_000);

        expect(toast.isVisible()).toBe(true);
    });

    it('calls onDismiss when auto-dismissed', () => {
        const onDismiss = vi.fn();
        const toast = new Toast({ message: 'Hello', duration: 500, onDismiss });

        vi.advanceTimersByTime(500);

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('marks the widget dirty when auto-dismissed', () => {
        const toast = new Toast({ message: 'Hello', duration: 500 });
        toast.clearDirty();

        vi.advanceTimersByTime(500);

        expect(toast.isDirty).toBe(true);
    });

    it('dismiss() hides the toast immediately and cancels the pending timer', () => {
        const onDismiss = vi.fn();
        const toast = new Toast({ message: 'Hello', duration: 5000, onDismiss });

        toast.dismiss();
        expect(toast.isVisible()).toBe(false);
        expect(onDismiss).toHaveBeenCalledTimes(1);

        // Advancing time further should not call onDismiss again
        vi.advanceTimersByTime(5000);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calling dismiss() twice only fires onDismiss once', () => {
        const onDismiss = vi.fn();
        const toast = new Toast({ message: 'Hello', onDismiss });

        toast.dismiss();
        toast.dismiss();

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render once dismissed', () => {
        const toast = new Toast({ message: 'Hello', variant: 'info' }, {});
        const screen = new Screen(30, 5);
        toast.updateRect({ x: 0, y: 0, width: 30, height: 5 });

        toast.dismiss();
        toast.render(screen);

        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars.trim()).toBe('');
    });
});
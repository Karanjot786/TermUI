import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useTimeout', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls callback after delay', () => {
        const callback = vi.fn();
        let id: ReturnType<typeof setTimeout> | null = null;

        id = setTimeout(() => {
            callback();
        }, 1000);

        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1000);
        expect(callback).toHaveBeenCalledTimes(1);

        if (id) clearTimeout(id);
    });

    it('does not call callback before delay', () => {
        const callback = vi.fn();

        setTimeout(() => {
            callback();
        }, 1000);

        vi.advanceTimersByTime(500);
        expect(callback).not.toHaveBeenCalled();
    });

    it('clears timeout on cancel', () => {
        const callback = vi.fn();

        const id = setTimeout(() => {
            callback();
        }, 1000);

        clearTimeout(id);
        vi.advanceTimersByTime(1000);
        expect(callback).not.toHaveBeenCalled();
    });
});
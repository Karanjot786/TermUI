import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createFiber,
    setCurrentFiber,
    clearCurrentFiber,
    runEffects,
    destroyFiber,
    type Fiber,
} from '../hooks.js';
import { useClipboard } from './useClipboard.js';
import { writeClipboard, readClipboard } from '@termuijs/core';

vi.mock('@termuijs/core', async (importActual) => {
    const actual = await importActual<typeof import('@termuijs/core')>();
    return {
        ...actual,
        writeClipboard: vi.fn(),
        readClipboard: vi.fn(),
    };
});

const mockWriteClipboard = vi.mocked(writeClipboard);
const mockReadClipboard = vi.mocked(readClipboard);

describe('useClipboard', () => {
    let fiber: Fiber;

    beforeEach(() => {
        vi.useFakeTimers();
        fiber = createFiber();
        setCurrentFiber(fiber);
        mockWriteClipboard.mockClear();
        mockReadClipboard.mockClear();
    });

    afterEach(() => {
        destroyFiber(fiber);
        clearCurrentFiber();
        vi.useRealTimers();
    });

    it('initializes copied as false', () => {
        const result = useClipboard();
        expect(result.copied).toBe(false);
    });

    it('copy(text) writes via writeClipboard and sets copied to true', () => {
        const result = useClipboard();
        runEffects(fiber);

        result.copy('hello world');

        expect(mockWriteClipboard).toHaveBeenCalledWith('hello world');

        // Re-run hook to read updated value
        fiber.hookIndex = 0;
        const updatedResult = useClipboard();
        expect(updatedResult.copied).toBe(true);
    });

    it('resets copied to false after default resetMs (2000ms)', () => {
        const result = useClipboard();
        runEffects(fiber);

        result.copy('hello');

        fiber.hookIndex = 0;
        let updatedResult = useClipboard();
        expect(updatedResult.copied).toBe(true);

        vi.advanceTimersByTime(1999);
        fiber.hookIndex = 0;
        updatedResult = useClipboard();
        expect(updatedResult.copied).toBe(true);

        vi.advanceTimersByTime(1);

        // Re-run hook to read updated value
        fiber.hookIndex = 0;
        updatedResult = useClipboard();
        expect(updatedResult.copied).toBe(false);
    });

    it('respects custom resetMs option', () => {
        const result = useClipboard({ resetMs: 5000 });
        runEffects(fiber);

        result.copy('hello');

        fiber.hookIndex = 0;
        let updatedResult = useClipboard({ resetMs: 5000 });
        expect(updatedResult.copied).toBe(true);

        vi.advanceTimersByTime(4999);
        fiber.hookIndex = 0;
        updatedResult = useClipboard({ resetMs: 5000 });
        expect(updatedResult.copied).toBe(true);

        vi.advanceTimersByTime(1);

        fiber.hookIndex = 0;
        updatedResult = useClipboard({ resetMs: 5000 });
        expect(updatedResult.copied).toBe(false);
    });

    it('read() resolves system clipboard contents via readClipboard', async () => {
        mockReadClipboard.mockResolvedValue('clipboard content');
        const result = useClipboard();
        runEffects(fiber);

        const content = await result.read();

        expect(mockReadClipboard).toHaveBeenCalled();
        expect(content).toBe('clipboard content');
    });

    it('clears reset timer on unmount and never fires twice', () => {
        const result = useClipboard();
        runEffects(fiber);

        result.copy('hello');

        const clearSpy = vi.spyOn(global, 'clearTimeout');
        destroyFiber(fiber);

        expect(clearSpy).toHaveBeenCalled();
    });
});

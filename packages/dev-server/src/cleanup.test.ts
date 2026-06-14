import { describe, it, expect, vi } from 'vitest';
import { cleanupActiveInstances } from './cleanup.js';

describe('cleanupActiveInstances', () => {
    it('calls unmount on each active instance', () => {
        const mockInstance1 = { unmount: vi.fn() };
        const mockInstance2 = { unmount: vi.fn() };
        const mockInstance3 = {}; // No unmount method

        cleanupActiveInstances([mockInstance1, mockInstance2, mockInstance3]);

        expect(mockInstance1.unmount).toHaveBeenCalledTimes(1);
        expect(mockInstance2.unmount).toHaveBeenCalledTimes(1);
    });

    it('safely catches errors and does not log console.error when unmount throws', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockInstance = {
            unmount: vi.fn().mockImplementation(() => {
                throw new Error('Unmount failure');
            })
        };

        expect(() => cleanupActiveInstances([mockInstance])).not.toThrow();
        expect(mockInstance.unmount).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});

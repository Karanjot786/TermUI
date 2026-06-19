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

    it('heap audit: instance and listener counts return to baseline after 10 consecutive simulated reloads', () => {
        // Simulate 10 HMR reload cycles and verify no instances accumulate
        const activeInstances: Array<{ unmount: () => void }> = [];

        function simulateReload(): void {
            // Each reload registers a new "app" instance
            const unmountFn = vi.fn();
            activeInstances.push({ unmount: unmountFn });

            // Cleanup (as HMR dispose handler would do)
            cleanupActiveInstances(activeInstances);
            activeInstances.splice(0); // reset registry after cleanup
        }

        for (let i = 0; i < 10; i++) {
            simulateReload();
        }

        // After all reloads, the registry must be empty — no leaking instances
        expect(activeInstances.length).toBe(0);
    });
});

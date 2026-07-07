import { describe, it, expect, vi } from 'vitest';
import { unmountApps } from './render.js';

describe('unmountApps', () => {
    it('should call unmount on each app instance', () => {
        const unmount1 = vi.fn();
        const unmount2 = vi.fn();
        const apps = [{ unmount: unmount1 }, { unmount: unmount2 }];

        unmountApps(apps);

        expect(unmount1).toHaveBeenCalled();
        expect(unmount2).toHaveBeenCalled();
    });

    it('should catch errors thrown during unmount to prevent crashing', () => {
        const errorConsoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const unmount1 = vi.fn().mockImplementation(() => {
            throw new Error('Failure during unmount');
        });
        const unmount2 = vi.fn();
        const apps = [{ unmount: unmount1 }, { unmount: unmount2 }];

        expect(() => unmountApps(apps)).not.toThrow();
        expect(unmount1).toHaveBeenCalled();
        expect(unmount2).toHaveBeenCalled();
        expect(errorConsoleSpy).toHaveBeenCalledWith(
            '[jsx] Error during unmount():',
            expect.any(Error)
        );
        errorConsoleSpy.mockRestore();
    });

    it('should safely ignore app instances without unmount method', () => {
        const apps = [{}, { unmount: undefined }];
        expect(() => unmountApps(apps)).not.toThrow();
    });
});

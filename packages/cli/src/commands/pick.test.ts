import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runPick } from './pick.js';
import * as registry from '../registry.js';
import * as addModule from './add.js';

// Mock App and List to avoid real terminal interaction
vi.mock('@termuijs/core', () => ({
    App: vi.fn().mockImplementation(() => ({
        events: { on: vi.fn() },
        mount: vi.fn(),
        exit: vi.fn(),
    })),
}));

vi.mock('@termuijs/widgets', () => ({
    List: vi.fn().mockImplementation(() => ({})),
}));

describe('runPick', () => {
    const originalIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        vi.spyOn(registry, 'listComponents').mockResolvedValue([
            { slug: 'avatar', description: 'Initials avatar' },
            { slug: 'spinner', description: 'Interactive spinner' },
        ]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('throws when stdin is not a TTY', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

        await expect(runPick({ components: [] } as any)).rejects.toThrow(
            /No component specified/
        );
    });

    it('logs cancelled and returns when Escape is pressed', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const runAddSpy = vi.spyOn(addModule, 'runAdd').mockResolvedValue(undefined);

        // Mock App so that mount resolves immediately (simulating escape)
        const { App } = await import('@termuijs/core');
        (App as any).mockImplementation(() => ({
            events: {
                on: vi.fn((event: string, handler: any) => {
                    // Simulate Escape key press
                    if (event === 'key') {
                        setTimeout(() => handler({ key: 'escape' }), 0);
                    }
                }),
            },
            mount: vi.fn(() => {
                // Trigger escape handler asynchronously
                return Promise.resolve();
            }),
            exit: vi.fn(),
        }));

        await runPick({ components: [] } as any);

        expect(consoleSpy).toHaveBeenCalledWith('\n  Cancelled.\n');
        expect(runAddSpy).not.toHaveBeenCalled();
    });
});

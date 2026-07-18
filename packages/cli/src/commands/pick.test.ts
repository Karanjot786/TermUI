import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runPick } from './pick.js';
import * as registry from '../registry.js';
import * as add from './add.js';
import { App } from '@termuijs/core';
import { List } from '@termuijs/widgets';

vi.mock('../registry.js', () => {
    return {
        listComponents: vi.fn(),
    };
});

vi.mock('./add.js', () => {
    return {
        runAdd: vi.fn(),
    };
});

vi.mock('@termuijs/core', () => {
    const mockApp = vi.fn().mockImplementation(function (this: any) {
        this.mount = vi.fn();
        this.exit = vi.fn();
        this.events = {
            on: vi.fn(),
        };
    });
    return {
        App: mockApp,
    };
});

vi.mock('@termuijs/widgets', () => {
    const mockList = vi.fn().mockImplementation(function (this: any) {});
    return {
        List: mockList,
    };
});

describe('runPick', () => {
    const originalIsTTY = process.stdin.isTTY;

    beforeEach(() => {
        vi.mocked(List).mockReset();
        vi.mocked(App).mockReset();
        vi.mocked(registry.listComponents).mockReset();
        vi.mocked(add.runAdd).mockReset();
    });

    afterEach(() => {
        process.stdin.isTTY = originalIsTTY;
        vi.clearAllMocks();
    });

    it('should throw error when stdin is not a TTY', async () => {
        process.stdin.isTTY = false;
        await expect(runPick({} as any)).rejects.toThrow('No component specified');
    });

    it('should show list and handle component selection', async () => {
        process.stdin.isTTY = true;

        const mockComponents = [
            { slug: 'spinner', description: 'Interactive spinner' },
            { slug: 'avatar', description: 'Initials avatar' },
        ];
        vi.mocked(registry.listComponents).mockResolvedValue(mockComponents as any);

        let selectCallback: any;
        // Mock List constructor to capture the onSelect callback
        vi.mocked(List).mockImplementation(function (this: any, opts: any) {
            selectCallback = opts.onSelect;
        });

        // Mock App mount to trigger the captured selection callback
        const mockAppInstance = {
            mount: vi.fn().mockImplementation(() => {
                selectCallback({ value: 'avatar' });
            }),
            exit: vi.fn(),
            events: {
                on: vi.fn(),
            },
        };
        vi.mocked(App).mockImplementation(function (this: any) {
            this.mount = mockAppInstance.mount;
            this.exit = mockAppInstance.exit;
            this.events = mockAppInstance.events;
        });

        await runPick({ dryRun: false } as any);

        expect(registry.listComponents).toHaveBeenCalled();
        expect(App).toHaveBeenCalled();
        expect(mockAppInstance.mount).toHaveBeenCalled();
        expect(mockAppInstance.exit).toHaveBeenCalledWith(0);
        expect(add.runAdd).toHaveBeenCalledWith({ dryRun: false, components: ['avatar'] });
    });

    it('should support cancellation via escape key', async () => {
        process.stdin.isTTY = true;

        const mockComponents = [{ slug: 'spinner', description: 'Interactive spinner' }];
        vi.mocked(registry.listComponents).mockResolvedValue(mockComponents as any);

        let keyCallback: any;
        const mockAppInstance = {
            mount: vi.fn().mockImplementation(() => {
                // Trigger escape key event
                keyCallback({ key: 'escape' });
            }),
            exit: vi.fn(),
            events: {
                on: vi.fn().mockImplementation((event: string, cb: any) => {
                    if (event === 'key') {
                        keyCallback = cb;
                    }
                }),
            },
        };
        vi.mocked(App).mockImplementation(function (this: any) {
            this.mount = mockAppInstance.mount;
            this.exit = mockAppInstance.exit;
            this.events = mockAppInstance.events;
        });
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await runPick({ dryRun: false } as any);

        expect(mockAppInstance.exit).toHaveBeenCalledWith(0);
        expect(consoleSpy).toHaveBeenCalledWith('\n  Cancelled.\n');
        expect(add.runAdd).not.toHaveBeenCalled();
    });
});

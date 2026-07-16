import { expect, test, describe, vi, afterEach } from 'vitest';
import { createStore } from './index.js';
import { logger } from './middleware/logger.js';
import { validator } from './middleware/validator.js';
import { undoRedo } from './middleware/history.js';
import { throttle } from './middleware/throttle.js';

describe('Middleware Ecosystem', () => {

    test('logger writes to the configured sink', () => {
        const lines: string[] = [];
        const useStore = createStore({ count: 0 }, {
            middleware: [logger({ log: (msg) => lines.push(msg) })]
        });

        useStore.setState({ count: 5 }, 'increment');
        expect(lines.some(l => l.includes('increment'))).toBe(true);
        expect(lines.some(l => l.includes('"count":0'))).toBe(true);  // prev
        expect(lines.some(l => l.includes('"count":5'))).toBe(true);  // next
    });

    test('validator aborts invalid states', () => {
        // Use vi.spyOn so the spy is guaranteed to be restored even if an assertion throws
        const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

        const useStore = createStore({ count: 0 }, {
            middleware: [
                validator({ validate: (s) => s.count >= 0 })
            ]
        });

        try {
            useStore.setState({ count: 1 });
            expect(useStore.getState().count).toBe(1);

            // This should fail and abort
            useStore.setState({ count: -1 });
            expect(useStore.getState().count).toBe(1);
            expect(spy).toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    test('undo/redo works', () => {
        const history = undoRedo<{ count: number }>();
        const useStore = createStore({ count: 0 }, {
            middleware: [history]
        });

        useStore.setState({ count: 1 });
        useStore.setState({ count: 2 });
        expect(useStore.getState().count).toBe(2);

        history.undo();
        expect(useStore.getState().count).toBe(1);

        history.undo();
        expect(useStore.getState().count).toBe(0);

        history.redo();
        expect(useStore.getState().count).toBe(1);
    });

    describe('throttle delays state updates', () => {
        // Use fake timers per repo convention — real timers are slow and flaky under CI
        afterEach(() => { vi.useRealTimers(); });

        test('coalesces rapid updates within the throttle window', () => {
            vi.useFakeTimers();

            const useStore = createStore({ count: 0 }, {
                middleware: [throttle({ maxUpdatesPerSecond: 10 })] // 100ms per update
            });

            useStore.setState({ count: 1 }); // applied immediately (elapsed >= limitMs)
            expect(useStore.getState().count).toBe(1);

            useStore.setState({ count: 2 }); // throttled
            useStore.setState({ count: 3 }); // coalesced with above
            expect(useStore.getState().count).toBe(1); // still 1

            // Advance past the throttle window
            vi.advanceTimersByTime(150);
            expect(useStore.getState().count).toBe(3);
        });
    });

});

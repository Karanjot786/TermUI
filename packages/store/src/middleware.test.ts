import { expect, test, describe, vi } from 'vitest';
import { createStore, compose } from './index.js';
import { logger } from './middleware/logger.js';
import { validator } from './middleware/validator.js';
import { undoRedo } from './middleware/history.js';
import { throttle } from './middleware/throttle.js';

describe('Middleware Ecosystem', () => {

    test('validator aborts invalid states', () => {
        let loggedError = false;
        const _error = console.error;
        console.error = () => { loggedError = true; };

        const useStore = createStore({ count: 0 }, {
            middleware: [
                validator({ validate: (s) => s.count >= 0 })
            ]
        });

        useStore.setState({ count: 1 });
        expect(useStore.getState().count).toBe(1);

        // This should fail and abort
        useStore.setState({ count: -1 });
        expect(useStore.getState().count).toBe(1);
        expect(loggedError).toBe(true);

        console.error = _error;
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

    test('throttle delays state updates', async () => {
        const useStore = createStore({ count: 0 }, {
            middleware: [throttle({ maxUpdatesPerSecond: 10 })] // 100ms per update
        });

        useStore.setState({ count: 1 }); // applied immediately
        expect(useStore.getState().count).toBe(1);

        useStore.setState({ count: 2 }); // throttled
        useStore.setState({ count: 3 }); // coalesces with above
        expect(useStore.getState().count).toBe(1); // still 1

        await new Promise(r => setTimeout(r, 150));
        expect(useStore.getState().count).toBe(3);
    });

    test('compose works with multiple middlewares', () => {
        let logs = 0;
        const myLogger = logger({ log: () => { logs++; } });
        const history = undoRedo<{ val: string }>();

        const useStore = createStore({ val: 'a' }, {
            middleware: [compose(myLogger, history)]
        });

        useStore.setState({ val: 'b' });
        expect(logs).toBeGreaterThan(0);
        expect(useStore.getState().val).toBe('b');

        history.undo();
        expect(useStore.getState().val).toBe('a');
    });
});

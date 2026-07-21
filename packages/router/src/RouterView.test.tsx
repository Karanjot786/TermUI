/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { RouterView } from './RouterView.js';
import { EventEmitter } from '@termuijs/core';

vi.mock('@termuijs/motion', () => {
    return {
        transition: vi.fn().mockImplementation((opts: any) => {
            Promise.resolve().then(() => {
                opts.onFrame(1);
                opts.onComplete();
            });
            return () => {};
        }),
    };
});

class MockRouter {
    current = <text>Home Screen</text>;
    autoUnmount = true;
    events = new EventEmitter<{ navigate: any; back: any }>();
    wrapScreen(s: any) {
        return s;
    }
}

describe('RouterView', () => {
    it('should render the current router screen by default', () => {
        const router = new MockRouter();
        const screen = render(<RouterView router={router as any} />);

        expect(screen.getOutput()).toContain('Home Screen');
        screen.unmount();
    });

    it('should transition to a new screen when navigate event is emitted', async () => {
        const router = new MockRouter();
        const screen = render(<RouterView router={router as any} />);
        expect(screen.getOutput()).toContain('Home Screen');

        // Emit navigate event
        router.events.emit('navigate', {
            screen: <text>Settings Screen</text>,
            direction: 'push',
        });

        // Wait for the asynchronous microtask state flush
        await screen.waitFor(() => {
            expect(screen.getOutput()).toContain('Settings Screen');
        });

        screen.unmount();
    });
});

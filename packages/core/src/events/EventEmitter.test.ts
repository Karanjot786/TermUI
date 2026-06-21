// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for EventEmitter
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../events/EventEmitter.js';

interface TestEvents {
    message: string;
    count: number;
    empty: void;
}

describe('EventEmitter', () => {
    it('emits events to subscribers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.on('message', handler);
        emitter.emit('message', 'hello');

        expect(handler).toHaveBeenCalledWith('hello');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports multiple subscribers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        emitter.on('message', handler1);
        emitter.on('message', handler2);
        emitter.emit('message', 'test');

        expect(handler1).toHaveBeenCalledWith('test');
        expect(handler2).toHaveBeenCalledWith('test');
    });

    it('unsubscribes via returned function', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        const unsub = emitter.on('message', handler);
        unsub();
        emitter.emit('message', 'test');

        expect(handler).not.toHaveBeenCalled();
    });

    it('once handlers fire only once', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.once('count', handler);
        emitter.emit('count', 1);
        emitter.emit('count', 2);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(1);
    });

    it('off removes specific handler', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.on('message', handler);
        emitter.off('message', handler);
        emitter.emit('message', 'test');

        expect(handler).not.toHaveBeenCalled();
    });

    it('removeAll clears all handlers for an event', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        emitter.on('message', handler1);
        emitter.on('message', handler2);
        emitter.removeAll('message');
        emitter.emit('message', 'test');

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });

    it('removeAll() clears everything', () => {
        const emitter = new EventEmitter<TestEvents>();
        const h1 = vi.fn();
        const h2 = vi.fn();

        emitter.on('message', h1);
        emitter.on('count', h2);
        emitter.removeAll();
        emitter.emit('message', 'test');
        emitter.emit('count', 1);

        expect(h1).not.toHaveBeenCalled();
        expect(h2).not.toHaveBeenCalled();
    });

    it('hasListeners returns correct value', () => {
        const emitter = new EventEmitter<TestEvents>();
        expect(emitter.hasListeners('message')).toBe(false);

        const unsub = emitter.on('message', () => { });
        expect(emitter.hasListeners('message')).toBe(true);

        unsub();
        expect(emitter.hasListeners('message')).toBe(false);
    });

    it('emitting event with no listeners does not throw', () => {
        const emitter = new EventEmitter<TestEvents>();
        expect(() => emitter.emit('message', 'hello')).not.toThrow();
    });

    it('removing non-existent handler is a no-op', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();
        expect(() => emitter.off('message', handler)).not.toThrow();
    });

    it('handler error does not break other handlers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const badHandler = vi.fn(() => { throw new Error('oops'); });
        const goodHandler = vi.fn();

        emitter.on('message', badHandler);
        emitter.on('message', goodHandler);

        try { emitter.emit('message', 'test'); } catch { /* expected */ }
        // At minimum badHandler was called
        expect(badHandler).toHaveBeenCalled();
    });

    it('once handler can be manually off\'d before firing', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.once('message', handler);
        emitter.off('message', handler);
        emitter.emit('message', 'test');

        expect(handler).not.toHaveBeenCalled();
    });

    it('continues emitting if one handler throws', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler1 = vi.fn(() => { throw new Error('boom'); });
        const handler2 = vi.fn();

        emitter.on('message', handler1);
        emitter.on('message', handler2);

        // Should not throw, and handler2 should still be called
        expect(() => emitter.emit('message', 'test')).not.toThrow();
        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
    });

    it('once handlers that throw do not break regular handlers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const onceHandler = vi.fn(() => { throw new Error('once boom'); });
        const regularHandler = vi.fn();

        emitter.once('message', onceHandler);
        emitter.on('message', regularHandler);

        expect(() => emitter.emit('message', 'test')).not.toThrow();
        expect(onceHandler).toHaveBeenCalled();
        expect(regularHandler).toHaveBeenCalled();
    });

    it('re-entrant emit from regular handler does not fire once handlers early', () => {
        const emitter = new EventEmitter<TestEvents>();
        const log: string[] = [];

        const onceHandler = vi.fn(() => { log.push('once'); });
        const reentrant = vi.fn(() => {
            log.push('reenter');
            emitter.emit('message', 'inner');
        });

        emitter.on('message', reentrant);
        emitter.once('message', onceHandler);

        emitter.emit('message', 'outer');

        expect(log).toEqual(['reenter', 'once']);
        expect(onceHandler).toHaveBeenCalledTimes(1);
    });

    it('once handler registered during emit does not fire in current emit', () => {
        const emitter = new EventEmitter<TestEvents>();
        const log: string[] = [];

        const innerOnce = vi.fn(() => { log.push('inner-once'); });
        const outerHandler = vi.fn(() => {
            log.push('outer');
            emitter.once('message', innerOnce);
        });

        emitter.once('message', outerHandler);
        emitter.emit('message', 'first');

        expect(log).toEqual(['outer']);
        expect(innerOnce).not.toHaveBeenCalled();

        emitter.emit('message', 'second');
        expect(innerOnce).toHaveBeenCalledTimes(1);
    });

    it('off removes empty Map entries for regular handlers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        emitter.on('message', handler1);
        emitter.on('message', handler2);
        emitter.off('message', handler1);
        emitter.off('message', handler2);

        expect(emitter.hasListeners('message')).toBe(false);
        expect(emitter['_handlers'].has('message' as any)).toBe(false);
    });

    it('off removes empty Map entries for once handlers', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.once('message', handler);
        emitter.off('message', handler);

        expect(emitter.hasListeners('message')).toBe(false);
        expect(emitter['_onceHandlers'].has('message' as any)).toBe(false);
    });

    it('emit clears OnceHandler Map entry so hasListeners returns false', () => {
        const emitter = new EventEmitter<TestEvents>();
        const handler = vi.fn();

        emitter.once('message', handler);
        emitter.emit('message', 'test');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(emitter.hasListeners('message')).toBe(false);
    });
});

import { describe, it, expect } from 'vitest';
import { createKeyEvent } from './types.js';

describe('createKeyEvent', () => {
    it('constructs a KeyEvent with correct base properties', () => {
        const rawBuffer = Buffer.from('a');
        const event = createKeyEvent({
            key: 'a',
            raw: rawBuffer,
            ctrl: false,
            alt: true,
            shift: false,
            targetId: 'my-widget'
        });

        expect(event.key).toBe('a');
        expect(event.raw).toBe(rawBuffer);
        expect(event.ctrl).toBe(false);
        expect(event.alt).toBe(true);
        expect(event.shift).toBe(false);
        expect(event.targetId).toBe('my-widget');
        expect(event._propagationStopped).toBe(false);
        expect(event._defaultPrevented).toBe(false);
    });

    it('sets _propagationStopped to true when stopPropagation is called', () => {
        const event = createKeyEvent({
            key: 'enter',
            raw: Buffer.alloc(0),
            ctrl: false,
            alt: false,
            shift: false
        });

        event.stopPropagation();
        expect(event._propagationStopped).toBe(true);
    });

    it('sets _defaultPrevented to true when preventDefault is called', () => {
        const event = createKeyEvent({
            key: 'escape',
            raw: Buffer.alloc(0),
            ctrl: false,
            alt: false,
            shift: false
        });

        event.preventDefault();
        expect(event._defaultPrevented).toBe(true);
    });
});

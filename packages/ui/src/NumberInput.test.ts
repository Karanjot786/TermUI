import { describe, it, expect } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { NumberInput } from './NumberInput.js';

describe('NumberInput', () => {
    it('renders its current value', () => {
        const screen = render(createElement(() => {
            const ref = useRef<NumberInput | null>(null);
            if (!ref.current) {
                ref.current = new NumberInput();
                ref.current.rawValue = '42';
            }
            return ref.current;
        }, null));
        
        expect(screen.lastFrame().join('\n')).toContain('42');
        screen.unmount();
    });

    it('updates value on keypress', () => {
        let input!: NumberInput;
        const screen = render(createElement(() => {
            const ref = useRef<NumberInput | null>(null);
            if (!ref.current) {
                ref.current = new NumberInput();
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        input.handleKey({ key: '5', ctrl: false, shift: false, alt: false, raw: Buffer.from('5'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        expect(input.rawValue).toBe('5');
        expect(screen.lastFrame().join('\n')).toContain('5');
        screen.unmount();
    });

    it('clamps above max and below min using arrow keys', () => {
        let input!: NumberInput;
        const screen = render(createElement(() => {
            const ref = useRef<NumberInput | null>(null);
            if (!ref.current) {
                ref.current = new NumberInput({}, { min: 0, max: 10, step: 1 });
                ref.current.rawValue = '10';
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        // Up arrow to increment
        input.handleKey({ key: 'up', ctrl: false, shift: false, alt: false, raw: Buffer.from('up'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();
        
        // Should clamp to 10
        expect(input.rawValue).toBe('10');
        expect(screen.lastFrame().join('\n')).toContain('10');

        // Test min clamp
        input.rawValue = '0';
        input.handleKey({ key: 'down', ctrl: false, shift: false, alt: false, raw: Buffer.from('down'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        expect(input.rawValue).toBe('0');
        expect(screen.lastFrame().join('\n')).toContain('0');

        screen.unmount();
    });
});

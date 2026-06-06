import { describe, it, expect } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement, useRef } from '@termuijs/jsx';
import { PasswordInput } from './PasswordInput.js';

describe('PasswordInput', () => {
    it('renders a mask instead of the raw characters', () => {
        let input!: PasswordInput;
        const screen = render(createElement(() => {
            const ref = useRef<PasswordInput | null>(null);
            if (!ref.current) {
                ref.current = new PasswordInput();
                ref.current.value = 'secret';
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        const maskChar = (input as any)._maskChar;
        const expectedDisplay = maskChar.repeat(6);
        
        expect(screen.lastFrame().join('\n')).toContain(expectedDisplay);
        expect(screen.lastFrame().join('\n')).not.toContain('secret');
        screen.unmount();
    });

    it('updates value on keypress', () => {
        let input!: PasswordInput;
        const screen = render(createElement(() => {
            const ref = useRef<PasswordInput | null>(null);
            if (!ref.current) {
                ref.current = new PasswordInput();
            }
            input = ref.current;
            return ref.current;
        }, null));
        
        input.handleKey({ key: 'p', ctrl: false, shift: false, alt: false, raw: Buffer.from('p'), stopPropagation: () => {}, preventDefault: () => {} });
        screen.rerender();

        expect(input.value).toBe('p');
        
        const maskChar = (input as any)._maskChar;
        expect(screen.lastFrame().join('\n')).toContain(maskChar);
        screen.unmount();
    });
});

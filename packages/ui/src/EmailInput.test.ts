import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { EmailInput } from './EmailInput.js';

describe('EmailInput', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initial render shows placeholder', () => {
        const input = new EmailInput({}, { placeholder: 'Enter email...' });
        const screen = new Screen(20, 3);
        
        input.updateRect({ x: 0, y: 0, width: 20, height: 3 });
        input.render(screen);
        
        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toContain('Enter email...');
    });

    it('typing a valid email makes isValid() return true', () => {
        const input = new EmailInput();
        
        const chars = 'a@b.com'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('a@b.com');
        expect(input.isValid()).toBe(true);
    });

    it('typing an invalid email makes isValid() return false', () => {
        const input = new EmailInput();
        
        const chars = 'notvalid'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('notvalid');
        expect(input.isValid()).toBe(false);
    });

    it('enter fires onSubmit when valid', () => {
        let submittedValue = '';
        const input = new EmailInput({}, {
            onSubmit: (val) => { submittedValue = val; }
        });
        
        const chars = 'test@example.com'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.isValid()).toBe(true);
        
        // Press enter
        input.handleKey({ key: 'enter', ctrl: false, shift: false, alt: false, raw: Buffer.from('enter'), stopPropagation: () => {}, preventDefault: () => {} });
        
        expect(submittedValue).toBe('test@example.com');
    });

    it('enter does not fire onSubmit when invalid', () => {
        let submittedValue = '';
        const input = new EmailInput({}, {
            onSubmit: (val) => { submittedValue = val; }
        });
        
        const chars = 'test@'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.isValid()).toBe(false);
        
        // Press enter
        input.handleKey({ key: 'enter', ctrl: false, shift: false, alt: false, raw: Buffer.from('enter'), stopPropagation: () => {}, preventDefault: () => {} });
        
        expect(submittedValue).toBe('');
    });

    it('tab completes domain suggestion', () => {
        const input = new EmailInput({}, {
            domains: ['gmail.com', 'outlook.com', 'yahoo.com']
        });
        
        const chars = 'user@g'.split('');
        for (const char of chars) {
            input.handleKey({ key: char, ctrl: false, shift: false, alt: false, raw: Buffer.from(char), stopPropagation: () => {}, preventDefault: () => {} });
        }

        expect(input.getValue()).toBe('user@g');
        
        // Press tab
        input.handleKey({ key: 'tab', ctrl: false, shift: false, alt: false, raw: Buffer.from('tab'), stopPropagation: () => {}, preventDefault: () => {} });
        
        expect(input.getValue()).toBe('user@gmail.com');
    });
});

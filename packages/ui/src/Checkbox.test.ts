import { describe, it, expect } from 'vitest';
import { Checkbox } from './Checkbox.js';

describe('Checkbox', () => {
    it('initial state uses defaultChecked', () => {
        const checkbox = new Checkbox({
            label: 'Enable logging',
            defaultChecked: true,
        });

        expect(checkbox.checked).toBe(true);
    });

    it('toggles on space key', () => {
        const checkbox = new Checkbox({
            label: 'Enable logging',
            defaultChecked: false,
        });

        checkbox.handleKey({
            key: 'space',
            ctrl: false,
            alt: false,
        } as any);

        expect(checkbox.checked).toBe(true);
    });
});
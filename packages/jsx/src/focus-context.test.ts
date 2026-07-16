import { describe, it, expect } from 'vitest';
import { FocusContext, type FocusContextValue } from './focus-context.js';

describe('FocusContext', () => {
    it('exposes a Provider component', () => {
        expect(typeof FocusContext.Provider).toBe('function');
    });

    it('has a unique internal id symbol', () => {
        expect(typeof FocusContext._id).toBe('symbol');
    });

    it('defaults to no focused element', () => {
        const value = FocusContext.defaultValue as FocusContextValue;
        expect(value.focused).toBeNull();
    });

    it('default focus/blur handlers are safe no-ops', () => {
        const value = FocusContext.defaultValue as FocusContextValue;
        expect(typeof value.focus).toBe('function');
        expect(typeof value.blur).toBe('function');
        expect(() => value.focus('element-1')).not.toThrow();
        expect(() => value.blur()).not.toThrow();
    });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useI18n, I18nContext, I18nProvider } from './i18n.js';
import { createFiber, setCurrentFiber, clearCurrentFiber, type Fiber } from './hooks.js';

describe('i18n hooks', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns default values when used outside a provider', () => {
        const result = useI18n();
        
        expect(result).toBeDefined();
        expect(result.locale).toBe('en');
        expect(result.direction).toBe('ltr');
        expect(result.t('hello.world')).toBe('hello.world');
    });

    it('supplies the provided locale, direction, and translation function', () => {
        const customI18n = {
            locale: 'ar',
            direction: 'rtl' as const,
            t: (key: string) => key === 'hello.world' ? 'مرحبا بالعالم' : key,
        };

        // Simulate what the Provider does when rendered
        I18nContext.Provider({ value: customI18n, children: undefined as any });
        
        const result = useI18n();
        
        expect(result).toBeDefined();
        expect(result.locale).toBe('ar');
        expect(result.direction).toBe('rtl');
        expect(result.t('hello.world')).toBe('مرحبا بالعالم');
        expect(result.t('other.key')).toBe('other.key');
    });
});

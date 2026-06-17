import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useI18n, I18nProvider } from './i18n.js';
import { createFiber, setCurrentFiber, clearCurrentFiber, type Fiber } from './hooks.js';
import { Screen } from '@termuijs/core';
import { reconcile, unmountAll } from './reconciler.js';
import { createElement as h } from './createElement.js';

describe('i18n hooks', () => {
    let fiber: Fiber;

    beforeEach(() => {
        fiber = createFiber();
        setCurrentFiber(fiber);
    });

    afterEach(() => {
        clearCurrentFiber();
        unmountAll();
    });

    it('returns default values when used outside a provider', () => {
        const result = useI18n();
        
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

        let result: ReturnType<typeof useI18n> | undefined;

        function Child() {
            result = useI18n();
            return h('text', {}, 'test');
        }

        clearCurrentFiber();

        const screen = new Screen(10, 10);
        const node = h(I18nProvider, { value: customI18n }, h(Child, {}));
        const widget = reconcile(node);
        
        widget.updateRect({ x: 0, y: 0, width: 10, height: 10 });
        widget.render(screen);
        
        expect(result!.locale).toBe('ar');
        expect(result!.direction).toBe('rtl');
        expect(result!.t('hello.world')).toBe('مرحبا بالعالم');
        expect(result!.t('other.key')).toBe('other.key');
    });
});

import { createContext, useContext } from './context.js';
import { createElement } from './createElement.js';
import type { VNode } from './vnode.js';

export interface I18nContextValue {
    locale: string;
    direction: 'ltr' | 'rtl';
    t: (key: string, params?: Record<string, any>) => string;
}

const defaultI18n: I18nContextValue = {
    locale: 'en',
    direction: 'ltr',
    t: (key: string) => key,
};

export const I18nContext = createContext<I18nContextValue>(defaultI18n);

export interface I18nProviderProps {
    value: I18nContextValue;
    children?: VNode | VNode[];
}

export function I18nProvider({ value, children }: I18nProviderProps) {
    return createElement(I18nContext.Provider, { value, children });
}

export function useI18n(): I18nContextValue {
    return useContext(I18nContext);
}

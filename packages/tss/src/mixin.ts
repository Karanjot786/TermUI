import { Style } from '@termuijs/core';
export type Mixin = Partial<Style>;
export function applyMixin(base: Partial<Style>, mixin: Mixin): Partial<Style> {
    return { ...base, ...mixin };
}

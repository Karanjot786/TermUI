import { describe, it, expect } from 'vitest';
import { installArgs } from './pm.js';

describe('installArgs', () => {
    it('uses install for npm/pnpm, add for yarn/bun', () => {
        expect(installArgs('npm', ['a', 'b'])).toEqual(['install', 'a', 'b']);
        expect(installArgs('pnpm', ['a'])).toEqual(['install', 'a']);
        expect(installArgs('bun', ['a'])).toEqual(['add', 'a']);
        expect(installArgs('yarn', ['a'])).toEqual(['add', 'a']);
    });
});

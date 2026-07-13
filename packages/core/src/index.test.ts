import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/core public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.Screen).toBeDefined();
        expect(pkg.Terminal).toBeDefined();
    });
});

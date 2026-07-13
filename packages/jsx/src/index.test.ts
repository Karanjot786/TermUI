import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/jsx public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.createElement).toBeDefined();
        expect(pkg.Fragment).toBeDefined();
    });
});

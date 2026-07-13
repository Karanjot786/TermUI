import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/data public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.cpu).toBeDefined();
        expect(pkg.processes).toBeDefined();
    });
});

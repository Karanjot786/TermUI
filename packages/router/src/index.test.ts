import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/router public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.Router).toBeDefined();
        expect(pkg.compilePattern).toBeDefined();
    });
});

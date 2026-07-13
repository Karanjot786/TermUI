import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/tss public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.tokenize).toBeDefined();
        expect(pkg.parse).toBeDefined();
    });
});

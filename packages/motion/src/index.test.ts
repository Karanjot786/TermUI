import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/motion public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.transition).toBeDefined();
        expect(pkg.fadeIn).toBeDefined();
    });
});

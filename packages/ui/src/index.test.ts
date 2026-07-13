import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/ui public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.Slider).toBeDefined();
        expect(pkg.RangeInput).toBeDefined();
    });
});

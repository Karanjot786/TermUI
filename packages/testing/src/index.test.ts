import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/testing public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.render).toBeDefined();
        expect(pkg.createFixture).toBeDefined();
    });
});

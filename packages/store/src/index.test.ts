import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/store public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.shallow).toBeDefined();
        expect(pkg.createStore).toBeDefined();
    });
});

import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/cli public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.runCli).toBeDefined();
        expect(Object.keys(pkg).length).toBeGreaterThan(0);
    });
});

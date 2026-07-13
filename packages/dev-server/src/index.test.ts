import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/dev-server public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.DevServer).toBeDefined();
        expect(pkg.FileWatcher).toBeDefined();
    });
});

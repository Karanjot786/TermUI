import { describe, it, expect } from 'vitest';
import * as pkg from './index.js';

describe('@termuijs/widgets public API', () => {
    it('exposes the expected public surface', () => {
        expect(pkg.Widget).toBeDefined();
        expect(pkg.Box).toBeDefined();
    });
});

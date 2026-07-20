// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Divider component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Divider } from './Divider.js';

describe('Divider', () => {
    it('creates with default character', () => {
        const d = new Divider();
        expect(d).toBeDefined();
    });

    it('accepts custom character', () => {
        const d = new Divider({ char: '═' });
        expect(d).toBeDefined();
    });

    it('accepts title option', () => {
        const d = new Divider({ title: 'Section' });
        expect(d).toBeDefined();
    });
});

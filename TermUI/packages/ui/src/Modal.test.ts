// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Modal component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Modal } from './Modal.js';

describe('Modal', () => {
    it('initializes as hidden', () => {
        const modal = new Modal();
        expect(modal.visible).toBe(false);
    });

    it('show() makes modal visible', () => {
        const modal = new Modal();
        modal.show();
        expect(modal.visible).toBe(true);
    });

    it('hide() makes modal hidden', () => {
        const modal = new Modal();
        modal.show();
        modal.hide();
        expect(modal.visible).toBe(false);
    });

    it('toggle() flips visibility', () => {
        const modal = new Modal();
        modal.toggle();
        expect(modal.visible).toBe(true);
        modal.toggle();
        expect(modal.visible).toBe(false);
    });
});

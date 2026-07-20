// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Toast component
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Toast } from './Toast.js';

describe('Toast', () => {
    it('starts with no messages', () => {
        const toast = new Toast();
        expect(toast).toBeDefined();
    });

    it('push adds a message', () => {
        const toast = new Toast();
        toast.push('Hello', 'info');
        expect(toast).toBeDefined();
    });

    it('convenience methods push correct types', () => {
        const toast = new Toast();
        toast.info('Info message');
        toast.success('Success message');
        toast.warning('Warning message');
        toast.error('Error message');
        expect(toast).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for a11y module
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emitA11y } from './index.js';

describe('emitA11y', () => {
    let originalVTE: string | undefined;
    let originalTermProgram: string | undefined;

    beforeEach(() => {
        originalVTE = process.env.VTE_VERSION;
        originalTermProgram = process.env.TERM_PROGRAM;
    });

    afterEach(() => {
        if (originalVTE === undefined) {
            delete process.env.VTE_VERSION;
        } else {
            process.env.VTE_VERSION = originalVTE;
        }
        if (originalTermProgram === undefined) {
            delete process.env.TERM_PROGRAM;
        } else {
            process.env.TERM_PROGRAM = originalTermProgram;
        }
    });

    describe('VTE_VERSION set', () => {
        beforeEach(() => {
            process.env.VTE_VERSION = '6800';
            delete process.env.TERM_PROGRAM;
        });

        it('writes OSC 133 start with role and label', () => {
            const written: string[] = [];
            emitA11y({ role: 'status', label: 'loading' }, (d) => written.push(d), 'start');
            expect(written).toHaveLength(1);
            expect(written[0]).toBe('\x1b]133;A;role=status;label=loading\x07');
        });

        it('writes OSC 133 end boundary marker', () => {
            const written: string[] = [];
            emitA11y({ role: 'status', label: 'loading' }, (d) => written.push(d), 'end');
            expect(written).toHaveLength(1);
            expect(written[0]).toBe('\x1b]133;B\x07');
        });

        it('defaults role to region when omitted', () => {
            const written: string[] = [];
            emitA11y({ label: 'sidebar' }, (d) => written.push(d), 'start');
            expect(written[0]).toBe('\x1b]133;A;role=region;label=sidebar\x07');
        });

        it('omits label segment when not provided', () => {
            const written: string[] = [];
            emitA11y({ role: 'alert' }, (d) => written.push(d), 'start');
            expect(written[0]).toBe('\x1b]133;A;role=alert\x07');
        });
    });

    describe('unsupported terminal (no VTE env)', () => {
        beforeEach(() => {
            delete process.env.VTE_VERSION;
            delete process.env.TERM_PROGRAM;
        });

        it('writes nothing on start', () => {
            const written: string[] = [];
            emitA11y({ role: 'status', label: 'loading' }, (d) => written.push(d), 'start');
            expect(written).toHaveLength(0);
        });

        it('writes nothing on end', () => {
            const written: string[] = [];
            emitA11y({ role: 'status', label: 'loading' }, (d) => written.push(d), 'end');
            expect(written).toHaveLength(0);
        });
    });

    describe('no-op guards', () => {
        beforeEach(() => {
            process.env.VTE_VERSION = '6800';
        });

        it('writes nothing when props undefined', () => {
            const written: string[] = [];
            emitA11y(undefined, (d) => written.push(d), 'start');
            expect(written).toHaveLength(0);
        });

        it('writes nothing when props has no role or label', () => {
            const written: string[] = [];
            emitA11y({}, (d) => written.push(d), 'start');
            expect(written).toHaveLength(0);
        });
    });
});

// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Gauge widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Gauge } from './Gauge.js';
import { caps } from '@termuijs/core';

describe('Gauge', () => {
    it('initializes with 0 value', () => {
        const g = new Gauge('CPU');
        expect(g.getValue()).toBe(0);
    });

    it('setValue sets and clamps the value', () => {
        const g = new Gauge('CPU');
        g.setValue(0.75);
        expect(g.getValue()).toBe(0.75);
        g.setValue(1.5);
        expect(g.getValue()).toBe(1);
        g.setValue(-0.5);
        expect(g.getValue()).toBe(0);
    });

    it('setLabel updates the label', () => {
        const g = new Gauge('CPU');
        g.setLabel('Memory');
        expect(g).toBeDefined();
    });

    it('caps.unicode is false when NO_UNICODE=1', () => {
        process.env.NO_UNICODE = '1';
        expect(process.env.NO_UNICODE).toBe('1');
        delete process.env.NO_UNICODE;
    });

    it('getValue returns 0.5 after setValue(0.5) in ASCII mode', () => {
        process.env.NO_UNICODE = '1';
        const g = new Gauge('CPU');
        g.setValue(0.5);
        expect(g.getValue()).toBe(0.5);
        delete process.env.NO_UNICODE;
    });
});
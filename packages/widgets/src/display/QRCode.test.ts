import { describe, it, expect, vi } from 'vitest';
import { QRCode } from './QRCode.js';
import { caps } from '@termuijs/core';

describe('QRCode widget', () => {

    it('renders without error for a short string', () => {
        const qr = new QRCode('hello');
        const out = qr.render();

        expect(out).toContain('\n');
        expect(out.length).toBeGreaterThan(10);
    });

    it('setData updates QR code', () => {
        const qr = new QRCode('a');
        const first = qr.render();

        qr.setData('b');
        const second = qr.render();

        expect(first).not.toBe(second);
    });

    it('setData triggers markDirty', () => {
        const qr = new QRCode('a');

        const spy = vi.spyOn(qr, 'markDirty' as any);

        qr.setData('new');

        expect(spy).toHaveBeenCalled();
    });

    it('ASCII fallback uses # for dark modules', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const qr = new QRCode('test');
        const out = qr.render();

        expect(out).toContain('#');
    });
});
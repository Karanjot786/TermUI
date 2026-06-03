import { describe, it, expect, vi, afterEach } from 'vitest';
import { QRCodePattern } from './QRCode.js';
import { caps, Screen } from '@termuijs/core';

function bufferToString(screen: Screen): string {
    return screen.back.map(row => row.map(cell => cell.char).join('')).join('\n');
}

describe('QRCodePattern widget', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders without error for a short string', () => {
        const qr = new QRCodePattern('hello');
        const screen = new Screen(21, 21);
        qr.updateRect({ x: 0, y: 0, width: 21, height: 21 });

        qr.render(screen);
        const out = bufferToString(screen);

        expect(out).toContain('\n');
        expect(out.length).toBeGreaterThan(10);
    });

    it('setData updates QR code', () => {
        const qr = new QRCodePattern('a');
        const screen = new Screen(21, 21);
        qr.updateRect({ x: 0, y: 0, width: 21, height: 21 });

        qr.render(screen);
        const first = bufferToString(screen);

        qr.setData('b');
        qr.render(screen);
        const second = bufferToString(screen);

        expect(first).not.toBe(second);
    });

    it('setData triggers markDirty', () => {
        const qr = new QRCodePattern('a');

        const spy = vi.spyOn(qr, 'markDirty' as any);

        qr.setData('new');

        expect(spy).toHaveBeenCalled();
    });

    it('ASCII fallback uses # for dark modules', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const qr = new QRCodePattern('test');
        const screen = new Screen(21, 21);
        qr.updateRect({ x: 0, y: 0, width: 21, height: 21 });
        qr.render(screen);
        const out = bufferToString(screen);

        expect(out).toContain('#');
    });
});
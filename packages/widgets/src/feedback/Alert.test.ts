// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Alert widge
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Alert } from './Alert.js';
import { Screen, caps } from '@termuijs/core';

function renderAlert(
    opts: ConstructorParameters<typeof Alert>[0],
    style: ConstructorParameters<typeof Alert>[1] = {},
    width = 30,
    height = 5,
) {
    const alert = new Alert(opts, style);
    const screen = new Screen(width, height);
    alert.updateRect({ x: 0, y: 0, width, height });
    alert.render(screen);
    return { alert, screen };
}

describe('Alert — Unicode rendering', () => {
    it('renders info variant with unicode icon and cyan border', () => {
        const { screen } = renderAlert({ variant: 'info', message: 'Info alert' });

        // Border corners (top-left should be ┌, bottom-right should be ┘)
        expect(screen.back[0][0].char).toBe('┌');
        expect(screen.back[4][29].char).toBe('┘');

        // Border color
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'cyan' });

        // Content row (row 2: border=1, padding=1)
        // Check unicode info icon (●) and message
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('● Info alert');

        // Check content color is cyan
        // Column 2: border(1) + padding(1) = cx = 2 (the icon)
        expect(screen.back[2][2].fg).toEqual({ type: 'named', name: 'cyan' });
    });

    it('renders success variant with unicode icon and green border', () => {
        const { screen } = renderAlert({ variant: 'success', message: 'Success alert' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('✓ Success alert');
    });

    it('renders warning variant with unicode icon and yellow border', () => {
        const { screen } = renderAlert({ variant: 'warning', message: 'Warning alert' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'yellow' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('! Warning alert');
    });

    it('renders error variant with unicode icon and red border', () => {
        const { screen } = renderAlert({ variant: 'error', message: 'Error alert' });

        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'red' });
        const rowChars = screen.back[2].map(c => c.char).join('');
        expect(rowChars).toContain('✗ Error alert');
    });
});

describe('Alert — ASCII fallback', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uses ASCII borders and fallback icon for info variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderAlert({ variant: 'info', message: 'Info' });
        expect(screen.back[0][0].char).toBe('+');
        expect(screen.back[0][1].char).toBe('-');
        expect(screen.back[1][0].char).toBe('|');
        expect(screen.back[2].map(c => c.char).join('')).toContain('i Info');
    });

    it('uses ASCII borders and fallback icon for success variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderAlert({ variant: 'success', message: 'Success' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[OK] Success');
    });

    it('uses ASCII borders and fallback icon for warning variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderAlert({ variant: 'warning', message: 'Warning' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[!] Warning');
    });

    it('uses ASCII borders and fallback icon for error variant when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderAlert({ variant: 'error', message: 'Error' });
        expect(screen.back[2].map(c => c.char).join('')).toContain('[x] Error');
    });
});

describe('Alert — Setters and Getters', () => {
    it('updates message and marks dirty', () => {
        const alert = new Alert({ message: 'initial' });
        alert.clearDirty();
        expect(alert.isDirty).toBe(false);

        alert.setMessage('updated');
        expect(alert.getMessage()).toBe('updated');
        expect(alert.isDirty).toBe(true);
    });

    it('updates variant and marks dirty', () => {
        const alert = new Alert({ message: 'test', variant: 'info' });
        alert.clearDirty();
        expect(alert.isDirty).toBe(false);

        alert.setVariant('success');
        expect(alert.getVariant()).toBe('success');
        expect(alert.isDirty).toBe(true);
    });

    it('does not mark dirty when setMessage receives the same value', () => {
        const alert = new Alert({ message: 'Build complete' });

        alert.clearDirty();

        alert.setMessage('Build complete');

        expect(alert.isDirty).toBe(false);
    });

    it('marks dirty when setMessage receives a different value', () => {
        const alert = new Alert({ message: 'Build complete' });

        alert.clearDirty();

        alert.setMessage('Build failed');

        expect(alert.isDirty).toBe(true);
    });

    it('does not mark dirty when setVariant receives the same value', () => {
        const alert = new Alert({
            message: 'Test',
            variant: 'success',
        });

        alert.clearDirty();

        alert.setVariant('success');

        expect(alert.isDirty).toBe(false);
    });

    it('marks dirty when setVariant receives a different value', () => {
        const alert = new Alert({
            message: 'Test',
            variant: 'info',
        });

        alert.clearDirty();

        alert.setVariant('error');

        expect(alert.isDirty).toBe(true);
    });

    describe('Alert — Custom padding overrides', () => {
        it('respects custom padding styling overrides', () => {
            const { screen } = renderAlert({ variant: 'info', message: 'Hello' }, { padding: 0 }, 30, 3);
            // With padding = 0, row 1 (inside 1 border height) is the content row.
            // Check content is rendered on row 1 (x + border(1) + padding(0) = cx = 1)
            const rowChars = screen.back[1].map(c => c.char).join('');
            expect(rowChars).toContain('● Hello');
        });
    });
});

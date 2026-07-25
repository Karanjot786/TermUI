// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Image widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

/**
 * Helper: create a solid RGBA buffer of the given color.
 */
function solidRgba(
    w: number,
    h: number,
    r: number,
    g: number,
    b: number,
    a = 255,
): Uint8Array {
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        buf[i * 4] = r;
        buf[i * 4 + 1] = g;
        buf[i * 4 + 2] = b;
        buf[i * 4 + 3] = a;
    }
    return buf;
}

describe('Image', () => {
    it('renders half-block characters for a solid colored image', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const data = solidRgba(4, 4, 255, 0, 0);
        const img = new Image({}, {
            data,
            imageWidth: 4,
            imageHeight: 4,
        });

        img.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        const screen = new Screen(10, 5);
        img.render(screen);

        // The half-block character ▀ should appear in rendered cells
        const chars = screen.back[0].map((c: { char: string }) => c.char);
        const hasHalfBlock = chars.some((ch: string) => ch === '\u2580');
        expect(hasHalfBlock).toBe(true);
    });

    it('sets correct fg and bg colors from pixel data', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const data = solidRgba(2, 2, 0, 128, 255);
        const img = new Image({}, {
            data,
            imageWidth: 2,
            imageHeight: 2,
        });

        img.updateRect({ x: 0, y: 0, width: 2, height: 1 });
        const screen = new Screen(2, 1);
        img.render(screen);

        const cell = screen.back[0][0];
        // fg should be the top pixel color (RGB 0, 128, 255)
        expect(cell.fg).toEqual({ type: 'rgb', r: 0, g: 128, b: 255 });
        // bg should be the bottom pixel color (same solid color)
        expect(cell.bg).toEqual({ type: 'rgb', r: 0, g: 128, b: 255 });
    });

    it('renders ASCII fallback when NO_UNICODE is set', async () => {
        vi.stubEnv('NO_UNICODE', '1');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        // Bright white pixels → high luminance → should use a dense char
        const data = solidRgba(4, 4, 255, 255, 255);
        const img = new Image({}, {
            data,
            imageWidth: 4,
            imageHeight: 4,
            fallback: 'ascii',
        });

        img.updateRect({ x: 0, y: 0, width: 4, height: 2 });
        const screen = new Screen(4, 2);
        img.render(screen);

        const rendered = screen.back[0].map((c: { char: string }) => c.char).join('');
        // Should NOT contain the half-block character
        expect(rendered).not.toContain('\u2580');
        // Should contain an ASCII density character (bright → '@')
        expect(rendered).toMatch(/[@%#*+=\-:. ]/);
    });

    it('renders nothing for empty data', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const img = new Image({});
        img.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        const screen = new Screen(10, 5);
        img.render(screen);

        // All cells should be the default empty space
        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toBe(' '.repeat(10));
    });

    it('renders nothing for zero-dimension image', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const img = new Image({}, {
            data: new Uint8Array(0),
            imageWidth: 0,
            imageHeight: 0,
        });

        img.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        const screen = new Screen(10, 5);
        // Should not throw
        img.render(screen);

        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toBe(' '.repeat(10));
    });

    it('setData updates pixel buffer and marks dirty', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const img = new Image({});
        img.updateRect({ x: 0, y: 0, width: 4, height: 2 });

        // Initially empty — renders nothing
        const screen1 = new Screen(4, 2);
        img.render(screen1);
        const row0Before = screen1.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0Before).toBe('    ');

        // Update with red pixel data
        const data = solidRgba(4, 4, 255, 0, 0);
        img.setData(data, 4, 4);
        expect(img.getImageWidth()).toBe(4);
        expect(img.getImageHeight()).toBe(4);

        const screen2 = new Screen(4, 2);
        img.render(screen2);
        const row0After = screen2.back[0].map((c: { char: string }) => c.char);
        const hasHalfBlock = row0After.some((ch: string) => ch === '\u2580');
        expect(hasHalfBlock).toBe(true);
    });

    it('renders a single-pixel image without crashing', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const data = solidRgba(1, 1, 42, 100, 200);
        const img = new Image({}, {
            data,
            imageWidth: 1,
            imageHeight: 1,
        });

        img.updateRect({ x: 0, y: 0, width: 5, height: 3 });
        const screen = new Screen(5, 3);
        img.render(screen);

        // Should render at least one half-block character
        const allChars = screen.back
            .flat()
            .map((c: { char: string }) => c.char);
        const hasContent = allChars.some((ch: string) => ch === '\u2580');
        expect(hasContent).toBe(true);
    });

    it('setPreserveAspectRatio toggles aspect ratio preservation', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        // Create a wide image (10×2 pixels) in a square widget (10×5 cells)
        const data = solidRgba(10, 2, 100, 100, 100);
        const img = new Image({}, {
            data,
            imageWidth: 10,
            imageHeight: 2,
            preserveAspectRatio: true,
        });

        img.updateRect({ x: 0, y: 0, width: 10, height: 5 });
        const screen1 = new Screen(10, 5);
        img.render(screen1);

        // With aspect ratio, image should not fill all 5 rows
        // because the image is very wide but short (10:2 = 5:1)
        const row4WithAR = screen1.back[4].map((c: { char: string }) => c.char).join('');
        expect(row4WithAR).toBe(' '.repeat(10));

        // Now disable aspect ratio — should fill the entire rect
        img.setPreserveAspectRatio(false);
        expect(img.getPreserveAspectRatio()).toBe(false);

        const screen2 = new Screen(10, 5);
        img.render(screen2);

        // Row 4 should now be rendered (stretched to fill)
        const row4NoAR = screen2.back[4].map((c: { char: string }) => c.char);
        const hasContent = row4NoAR.some((ch: string) => ch === '\u2580');
        expect(hasContent).toBe(true);
    });

    it('handles alpha transparency (blends against black)', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        // Semi-transparent white pixel (alpha = 128)
        const data = solidRgba(2, 2, 255, 255, 255, 128);
        const img = new Image({}, {
            data,
            imageWidth: 2,
            imageHeight: 2,
        });

        img.updateRect({ x: 0, y: 0, width: 2, height: 1 });
        const screen = new Screen(2, 1);
        img.render(screen);

        const cell = screen.back[0][0];
        // Alpha 128/255 ≈ 0.502 → RGB should be approximately 128
        expect(cell.fg).toEqual({
            type: 'rgb',
            r: Math.round((255 * 128) / 255),
            g: Math.round((255 * 128) / 255),
            b: Math.round((255 * 128) / 255),
        });
    });

    it('does not render outside the content rect', async () => {
        vi.stubEnv('NO_UNICODE', '');
        vi.stubEnv('COLORTERM', 'truecolor');
        vi.stubEnv('TERM', '');
        vi.resetModules();

        const { Screen } = await import('@termuijs/core');
        const { Image } = await import('./Image.js');

        const data = solidRgba(4, 4, 255, 0, 0);
        const img = new Image({}, {
            data,
            imageWidth: 4,
            imageHeight: 4,
        });

        // Place widget at offset (2, 1) with limited size
        img.updateRect({ x: 2, y: 1, width: 3, height: 2 });
        const screen = new Screen(10, 5);
        img.render(screen);

        // Row 0 should be entirely empty (widget starts at y=1)
        const row0 = screen.back[0].map((c: { char: string }) => c.char).join('');
        expect(row0).toBe(' '.repeat(10));

        // Column 0 should be empty (widget starts at x=2)
        expect(screen.back[1][0].char).toBe(' ');
        expect(screen.back[1][1].char).toBe(' ');

        // Cells beyond x+width should be empty
        expect(screen.back[1][5].char).toBe(' ');
    });
});

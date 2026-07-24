import { describe, it, expect } from 'vitest';
import { Screen } from './Screen.js';

describe('Screen.exportSVG()', () => {
    it('should export the correct dimensions and structure', () => {
        const screen = new Screen(10, 5);
        const svg = screen.exportSVG();
        expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" xml:space="preserve">');
        expect(svg).toContain('<rect width="80" height="80" fill="#121212" />');
        expect(svg).toContain('</svg>');
    });

    it('should render simple characters and preserve positions', () => {
        const screen = new Screen(10, 5);
        screen.writeString(1, 1, 'Hi');
        const svg = screen.exportSVG();
        expect(svg).toContain('x="8" y="28"');
        expect(svg).toContain('>H</text>');
        expect(svg).toContain('x="16" y="28"');
        expect(svg).toContain('>i</text>');
    });

    it('should escape XML special characters correctly', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, '<&>');
        const svg = screen.exportSVG();
        expect(svg).toContain('&lt;');
        expect(svg).toContain('&amp;');
        expect(svg).toContain('&gt;');
    });

    it('should support colors and inverse styles', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, 'A', {
            fg: { type: 'rgb', r: 255, g: 0, b: 0 },
            bg: { type: 'hex', hex: '#00ff00' }
        });
        const svg = screen.exportSVG();
        expect(svg).toContain('fill="#00ff00"'); // rect
        expect(svg).toContain('fill="#ff0000"'); // text

        // Test inverse style
        const screen2 = new Screen(10, 5);
        screen2.writeString(0, 0, 'A', {
            fg: { type: 'rgb', r: 255, g: 0, b: 0 },
            bg: { type: 'hex', hex: '#00ff00' },
            inverse: true
        });
        const svg2 = screen2.exportSVG();
        expect(svg2).toContain('fill="#ff0000"'); // rect (since colors are inverted, bg gets fg color)
        expect(svg2).toContain('fill="#00ff00"'); // text (since colors are inverted, fg gets bg color)
    });

    it('should support bold, italic, underline, strikethrough, and dim text', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, 'A', {
            bold: true,
            italic: true,
            underline: true,
            strikethrough: true,
            dim: true
        });
        const svg = screen.exportSVG();
        expect(svg).toContain('font-weight="bold"');
        expect(svg).toContain('font-style="italic"');
        expect(svg).toContain('text-decoration="underline line-through"');
        expect(svg).toContain('opacity="0.6"');
    });

    it('should correctly handle wide Unicode characters and skip continuation cells', () => {
        const screen = new Screen(10, 5);
        screen.writeString(0, 0, '🌍', { bg: { type: 'hex', hex: '#00ff00' } }); // width = 2
        const svg = screen.exportSVG();
        // Since width = 2, rect width should be 16
        expect(svg).toContain('width="16"');
        // It shouldn't render any text/rect for col 1 because it's a continuation cell (width = 0)
        expect(svg).not.toContain('x="8" y="12"');
        expect(svg).not.toContain('x="8" y="0"');
    });
});

// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Center widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Center } from './Center.js';
import { Widget } from '../base/Widget.js';
import { Screen, type Rect } from '@termuijs/core';

class TestChild extends Widget {
    renderedRect: Rect | null = null;
    private _char: string;

    constructor(char = '@') {
        super();
        this._char = char;
    }

    protected _renderSelf(screen: Screen): void {
        this.renderedRect = { ...this._rect };
        screen.setCell(this._rect.x, this._rect.y, { char: this._char });
    }
}

describe('Center widget', () => {
    describe("axis: 'x'", () => {
        it('Child should be horizontally centered within parent width', () => {
            const center = new Center({}, { horizontal: true, vertical: false });
            const child = new TestChild();
            center.addChild(child);

            // Parent size: 40x10. Child size: 10x4.
            center.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            child.updateRect({ x: 0, y: 0, width: 10, height: 4 });

            const screen = new Screen(40, 10);
            center.render(screen);

            // Horizontal offset = Math.floor((40 - 10) / 2) = 15
            // Vertical offset = 0 (since vertical centering is false)
            expect(child.renderedRect).toBeDefined();
            expect(child.renderedRect?.x).toBe(15);
            expect(child.renderedRect?.y).toBe(0);
            expect(child.renderedRect?.width).toBe(10);
            expect(child.renderedRect?.height).toBe(4);
        });
    });

    describe("axis: 'y'", () => {
        it('Child should be vertically centered within parent height', () => {
            const center = new Center({}, { horizontal: false, vertical: true });
            const child = new TestChild();
            center.addChild(child);

            // Parent size: 40x10. Child size: 10x4.
            center.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            child.updateRect({ x: 0, y: 0, width: 10, height: 4 });

            const screen = new Screen(40, 10);
            center.render(screen);

            // Horizontal offset = 0 (since horizontal centering is false)
            // Vertical offset = Math.floor((10 - 4) / 2) = 3
            expect(child.renderedRect).toBeDefined();
            expect(child.renderedRect?.x).toBe(0);
            expect(child.renderedRect?.y).toBe(3);
            expect(child.renderedRect?.width).toBe(10);
            expect(child.renderedRect?.height).toBe(4);
        });
    });

    describe("axis: 'both'", () => {
        it('Child should be centered horizontally and vertically', () => {
            const center = new Center({}, { horizontal: true, vertical: true });
            const child = new TestChild();
            center.addChild(child);

            // Parent size: 40x10. Child size: 10x4.
            center.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            child.updateRect({ x: 0, y: 0, width: 10, height: 4 });

            const screen = new Screen(40, 10);
            center.render(screen);

            // Horizontal offset = Math.floor((40 - 10) / 2) = 15
            // Vertical offset = Math.floor((10 - 4) / 2) = 3
            expect(child.renderedRect).toBeDefined();
            expect(child.renderedRect?.x).toBe(15);
            expect(child.renderedRect?.y).toBe(3);
            expect(child.renderedRect?.width).toBe(10);
            expect(child.renderedRect?.height).toBe(4);
        });
    });

    describe('Single character child centered in a 40x10 screen', () => {
        it('Verify the rendered position matches the expected coordinates', () => {
            const center = new Center({}, { horizontal: true, vertical: true });
            const child = new TestChild('@');
            center.addChild(child);

            // Parent size: 40x10. Single character child size: 1x1.
            center.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            child.updateRect({ x: 0, y: 0, width: 1, height: 1 });

            const screen = new Screen(40, 10);
            center.render(screen);

            // Horizontal offset = Math.floor((40 - 1) / 2) = 19
            // Vertical offset = Math.floor((10 - 1) / 2) = 4
            expect(child.renderedRect).toBeDefined();
            expect(child.renderedRect?.x).toBe(19);
            expect(child.renderedRect?.y).toBe(4);

            // Verify the character rendered in the screen buffer at the exact coordinates
            expect(screen.back[4][19].char).toBe('@');
        });
    });
});

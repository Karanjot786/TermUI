// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for SplitPane layout
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { SplitPane } from './SplitPane.js';
import { Box } from '../display/Box.js';
import {
    Screen,
    computeLayout,
    caps,
    type KeyEvent,
    type MouseEvent as TermMouseEvent,
} from '@termuijs/core';

function shiftKey(key: string): KeyEvent {
    return {
        key,
        shift: true,
        ctrl: false,
        alt: false,
        raw: Buffer.alloc(0),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

function mouseEvent(
    type: TermMouseEvent['type'],
    x: number,
    y: number,
): TermMouseEvent {
    return { x, y, button: 'left', type };
}

describe('SplitPane layout', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('left pane renders at expected width for ratio=0.5', () => {
        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 40, height: 10 }, { ratio: 0.5 });

        const node = pane.getLayoutNode();
        computeLayout(node, 40, 10);
        pane.syncLayout();

        expect(left.rect.width).toBe(20);
        expect(right.rect.width).toBe(19);
        expect(left.rect.x).toBe(0);
        expect(right.rect.x).toBe(21);
    });

    it('shift+right moves divider right by 1 cell', () => {
        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 40, height: 10 }, { ratio: 0.5 });

        const node = pane.getLayoutNode();
        computeLayout(node, 40, 10);
        pane.syncLayout();

        expect(left.rect.width).toBe(20);

        pane.handleKey(shiftKey('right'));
        pane.syncLayout();

        expect(left.rect.width).toBe(21);
        expect(right.rect.x).toBe(22);
    });

    it('ratio does not exceed 1 - minSize/totalWidth', () => {
        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 40, height: 10 }, { ratio: 0.5, minSize: 5 });

        const node = pane.getLayoutNode();
        computeLayout(node, 40, 10);
        pane.syncLayout();

        const maxRatio = 1 - 5 / 40;
        pane.setRatio(1);

        expect(pane.getRatio()).toBeLessThanOrEqual(maxRatio);
        expect(right.rect.width).toBeGreaterThanOrEqual(5);
    });

    it('renders ASCII divider when caps.unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 10, height: 3 }, { ratio: 0.5 });

        const node = pane.getLayoutNode();
        computeLayout(node, 10, 3);
        pane.syncLayout();

        const screen = new Screen(10, 3);
        pane.render(screen);

        expect(screen.back[0][5].char).toBe('|');
    });

    it('setRatio triggers markDirty', () => {
        const left = new Box();
        const right = new Box();
        const pane = new SplitPane(left, right, { width: 40, height: 10 });

        const node = pane.getLayoutNode();
        computeLayout(node, 40, 10);
        pane.syncLayout();

        const markDirtySpy = vi.spyOn(pane, 'markDirty');
        pane.setRatio(0.6);

        expect(markDirtySpy).toHaveBeenCalled();
    });

    describe('mouse drag', () => {
        function makePane(opts: { ratio?: number; minSize?: number } = {}) {
            const left = new Box();
            const right = new Box();
            const pane = new SplitPane(left, right, { width: 40, height: 10 }, opts);

            const node = pane.getLayoutNode();
            computeLayout(node, 40, 10);
            pane.syncLayout();

            return { left, right, pane };
        }

        it('mousedown on the divider starts a drag and a following mousemove updates the ratio', () => {
            const { pane } = makePane({ ratio: 0.5 });

            // divider sits at x=20 for ratio=0.5 over a width of 40
            pane.handleMouse(mouseEvent('mousedown', 20, 0));
            pane.handleMouse(mouseEvent('mousemove', 30, 0));

            expect(pane.getRatio()).toBeCloseTo(30 / 40, 5);
        });

        it('mousedown within the hit-tolerance of the divider still starts a drag', () => {
            const { pane } = makePane({ ratio: 0.5 });

            // divider is at x=20; grabbing the adjacent cell should still count
            pane.handleMouse(mouseEvent('mousedown', 21, 0));
            pane.handleMouse(mouseEvent('mousemove', 32, 0));

            expect(pane.getRatio()).toBeCloseTo(32 / 40, 5);
        });

        it('mouseup ends the drag so a later mousemove no longer updates the ratio', () => {
            const { pane } = makePane({ ratio: 0.5 });

            pane.handleMouse(mouseEvent('mousedown', 20, 0));
            pane.handleMouse(mouseEvent('mousemove', 25, 0));
            expect(pane.getRatio()).toBeCloseTo(25 / 40, 5);

            pane.handleMouse(mouseEvent('mouseup', 25, 0));
            pane.handleMouse(mouseEvent('mousemove', 35, 0));

            expect(pane.getRatio()).toBeCloseTo(25 / 40, 5);
        });

        it('mousedown away from the divider does not start a drag', () => {
            const { pane } = makePane({ ratio: 0.5 });

            pane.handleMouse(mouseEvent('mousedown', 5, 0));
            pane.handleMouse(mouseEvent('mousemove', 30, 0));

            expect(pane.getRatio()).toBe(0.5);
        });

        it('dragging past the min/max bounds clamps the ratio', () => {
            const { pane } = makePane({ ratio: 0.5, minSize: 5 });

            const minRatio = 5 / 40;
            const maxRatio = 1 - 5 / 40;

            pane.handleMouse(mouseEvent('mousedown', 20, 0));
            pane.handleMouse(mouseEvent('mousemove', -100, 0));
            expect(pane.getRatio()).toBeCloseTo(minRatio, 5);

            pane.handleMouse(mouseEvent('mousemove', 200, 0));
            expect(pane.getRatio()).toBeLessThanOrEqual(maxRatio);
            expect(pane.getRatio()).toBeCloseTo(maxRatio, 5);
        });
    });
});

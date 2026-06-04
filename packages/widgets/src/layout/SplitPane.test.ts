// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for SplitPane layout
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { SplitPane } from './SplitPane.js';
import { Box } from '../display/Box.js';
import { Screen, computeLayout, caps, type KeyEvent } from '@termuijs/core';

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
});

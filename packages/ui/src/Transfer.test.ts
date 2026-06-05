// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for Transfer component
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Transfer } from './Transfer.js';
import { Screen, caps } from '@termuijs/core';

const ITEMS = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
];

describe('Transfer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with all items in the source pane', () => {
        const transfer = new Transfer(ITEMS);
        expect(transfer.sourceItems).toEqual(ITEMS);
        expect(transfer.targetItems).toEqual([]);
        expect(transfer.targetValues).toEqual([]);
        expect(transfer.activePane).toBe('source');
        expect(transfer.sourceCursorIndex).toBe(0);
        expect(transfer.targetCursorIndex).toBe(0);
    });

    it('navigates cursors via selectNext and selectPrev', () => {
        const transfer = new Transfer(ITEMS);
        
        // Down in source
        transfer.selectNext();
        expect(transfer.sourceCursorIndex).toBe(1);
        
        // Up in source
        transfer.selectPrev();
        expect(transfer.sourceCursorIndex).toBe(0);

        // Switch to target (empty)
        transfer.toggleActivePane();
        expect(transfer.activePane).toBe('target');
        expect(transfer.targetCursorIndex).toBe(0);

        // Up/down in empty target should stay at 0
        transfer.selectNext();
        expect(transfer.targetCursorIndex).toBe(0);
        transfer.selectPrev();
        expect(transfer.targetCursorIndex).toBe(0);
    });

    it('toggles active pane with tab key', () => {
        const transfer = new Transfer(ITEMS);
        expect(transfer.activePane).toBe('source');
        
        transfer.handleKey({ key: 'tab' } as any);
        expect(transfer.activePane).toBe('target');

        transfer.handleKey({ key: 'tab' } as any);
        expect(transfer.activePane).toBe('source');
    });

    it('navigates via arrow keys', () => {
        const transfer = new Transfer(ITEMS);
        expect(transfer.sourceCursorIndex).toBe(0);

        transfer.handleKey({ key: 'down' } as any);
        expect(transfer.sourceCursorIndex).toBe(1);

        transfer.handleKey({ key: 'up' } as any);
        expect(transfer.sourceCursorIndex).toBe(0);
    });

    it('transfers item to target with right arrow and back with left arrow', () => {
        const onChange = vi.fn();
        const transfer = new Transfer(ITEMS, { onChange });

        // Left pane (source) is active, right arrow should transfer item
        transfer.handleKey({ key: 'right' } as any);
        expect(transfer.sourceItems).toEqual([ITEMS[1], ITEMS[2]]);
        expect(transfer.targetItems).toEqual([ITEMS[0]]);
        expect(transfer.targetValues).toEqual(['apple']);
        expect(onChange).toHaveBeenCalledWith(['apple']);
        expect(transfer.sourceCursorIndex).toBe(0);

        // If target is empty, pressing left on target pane should do nothing
        // Let's toggle to target pane and transfer it back
        transfer.handleKey({ key: 'tab' } as any);
        expect(transfer.activePane).toBe('target');
        expect(transfer.targetCursorIndex).toBe(0);

        transfer.handleKey({ key: 'left' } as any);
        expect(transfer.sourceItems).toEqual([ITEMS[1], ITEMS[2], ITEMS[0]]);
        expect(transfer.targetItems).toEqual([]);
        expect(transfer.targetValues).toEqual([]);
        expect(onChange).toHaveBeenLastCalledWith([]);
        expect(transfer.targetCursorIndex).toBe(0);
    });

    it('respects disabled items during navigation and transfer', () => {
        const itemsWithDisabled = [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', disabled: true },
            { label: 'C', value: 'c' },
        ];
        const onChange = vi.fn();
        const transfer = new Transfer(itemsWithDisabled, { onChange });

        // Cursor should start at 0
        expect(transfer.sourceCursorIndex).toBe(0);

        // Moving down should skip 1 (B is disabled) and land on 2 (C)
        transfer.selectNext();
        expect(transfer.sourceCursorIndex).toBe(2);

        // Moving up should skip 1 and land on 0
        transfer.selectPrev();
        expect(transfer.sourceCursorIndex).toBe(0);

        // Cannot transfer disabled items directly
        // (Just to test if we can somehow try to transfer disabled,
        // we'll temporarily force the index and try to transfer it)
        (transfer as any)._sourceCursorIndex = 1;
        transfer.transferToTarget();
        expect(transfer.targetItems).toEqual([]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('clamps cursor indices after transferring items', () => {
        const transfer = new Transfer(ITEMS);
        
        // Move to the last item
        transfer.selectNext();
        transfer.selectNext();
        expect(transfer.sourceCursorIndex).toBe(2);

        // Transfer last item (Cherry)
        transfer.transferToTarget();
        // Since Cherry was index 2, and now there are only 2 items left (Apple, Banana),
        // the source cursor should be clamped to 1 (Banana)
        expect(transfer.sourceCursorIndex).toBe(1);
        expect(transfer.sourceItems).toEqual([ITEMS[0], ITEMS[1]]);
        expect(transfer.targetItems).toEqual([ITEMS[2]]);
    });

    it('renders with unicode formatting (default)', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

        const screen = new Screen(21, 3);
        const transfer = new Transfer(ITEMS);
        transfer.updateRect({ x: 0, y: 0, width: 21, height: 3 });
        transfer.render(screen);

        // leftPaneWidth = Math.floor((21-1)/2) = 10
        // rightPaneWidth = 10
        // dividerIndex = 10
        // Row 0: source active index 0 (Apple), target empty
        // Source active: '❯ Apple   ' (length 10)
        // Divider: '│'
        // Target empty: '          ' (length 10)
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toBe('❯ Apple  │          ');

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toBe('  Banana  │          ');

        const row2 = screen.back[2].map(c => c.char).join('');
        expect(row2).toBe('  Cherry  │          ');
    });

    it('renders with ASCII formatting when unicode is false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const screen = new Screen(21, 3);
        const transfer = new Transfer(ITEMS);
        transfer.updateRect({ x: 0, y: 0, width: 21, height: 3 });
        transfer.render(screen);

        // Row 0: source active index 0 (Apple), target empty
        // Source active: '> Apple   ' (length 10)
        // Divider: '|'
        // Target empty: '          ' (length 10)
        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toBe('> Apple   |          ');

        const row1 = screen.back[1].map(c => c.char).join('');
        expect(row1).toBe('  Banana  |          ');
    });

    it('overwrites unused lines with blank spaces', () => {
        const screen = new Screen(21, 5);
        const transfer = new Transfer(ITEMS); // 3 items
        transfer.updateRect({ x: 0, y: 0, width: 21, height: 5 }); // 5 height viewport
        transfer.render(screen);

        const row3 = screen.back[3].map(c => c.char).join('');
        expect(row3).toBe('          │          ');

        const row4 = screen.back[4].map(c => c.char).join('');
        expect(row4).toBe('          │          ');
    });
});

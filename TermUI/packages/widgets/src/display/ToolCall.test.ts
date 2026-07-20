// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for ToolCall and ToolApproval widgets
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { ToolCall, ToolApproval } from './ToolCall.js';

// ── Helpers ──────────────────────────────────────────

function makeToolCall(
    overrides: Partial<Parameters<typeof ToolCall>[0]> = {},
    width = 60,
    height = 20,
): ToolCall {
    const widget = new ToolCall({
        name: 'read_file',
        args: { path: '/etc/hosts', encoding: 'utf8' },
        status: 'pending',
        collapsed: true,
        ...overrides,
    });
    widget.updateRect({ x: 0, y: 0, width, height });
    return widget;
}

function makeToolApproval(
    overrides: Partial<Parameters<typeof ToolApproval>[0]> = {},
    width = 60,
    height = 20,
): ToolApproval {
    const widget = new ToolApproval({
        name: 'bash',
        args: { command: 'rm -rf /' },
        status: 'pending',
        collapsed: false,
        ...overrides,
    });
    widget.updateRect({ x: 0, y: 0, width, height });
    return widget;
}

function render(widget: ToolCall, width = 60, height = 20): Screen {
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

// ── Tests ─────────────────────────────────────────────

describe('ToolCall', () => {

    describe('1. Renders tool name in first row', () => {
        it('shows the tool name on row 0', () => {
            const widget = makeToolCall();
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            expect(row0).toContain('read_file');
        });

        it('shows status label on row 0', () => {
            const widget = makeToolCall({ status: 'pending' });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            expect(row0).toContain('pending');
        });

        it('shows a chevron at the start of row 0', () => {
            const widget = makeToolCall({ collapsed: true });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // collapsed chevron: ▶ or >
            expect(row0).toMatch(/^[▶>]/);
        });
    });

    describe('2. Collapsed shows no args', () => {
        it('does not show args when collapsed=true', () => {
            const widget = makeToolCall({ collapsed: true });
            const screen = render(widget);
            // Args should not be visible
            const row1 = rowText(screen, 1);
            expect(row1.trim()).toBe('');
        });

        it('shows collapsed chevron when collapsed', () => {
            const widget = makeToolCall({ collapsed: true });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // ▶ (or >) indicates collapsed
            expect(row0).toMatch(/^[▶>]/);
        });
    });

    describe('3. Expand shows args', () => {
        it('shows args when collapsed=false', () => {
            const widget = makeToolCall({ collapsed: false });
            const screen = render(widget);

            // Args should appear after row 0
            let foundPath = false;
            for (let r = 1; r < 10; r++) {
                const row = rowText(screen, r);
                if (row.includes('path')) foundPath = true;
            }
            expect(foundPath).toBe(true);
        });

        it('shows expanded chevron when expanded', () => {
            const widget = makeToolCall({ collapsed: false });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // ▼ (or v) indicates expanded
            expect(row0).toMatch(/^[▼v]/);
        });

        it('each arg appears on its own line with 2-space indent', () => {
            const widget = makeToolCall({
                args: { foo: 'bar', baz: 42 },
                collapsed: false,
            });
            const screen = render(widget);

            const row1 = rowText(screen, 1);
            const row2 = rowText(screen, 2);

            expect(row1).toMatch(/^\s{2}foo:/);
            expect(row2).toMatch(/^\s{2}baz:/);
        });
    });

    describe('4. Space key toggles collapsed → expanded', () => {
        it('Space toggles from collapsed to expanded', () => {
            const widget = makeToolCall({ collapsed: true });
            widget.handleKey(' ');

            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // Now expanded — should show expanded chevron
            expect(row0).toMatch(/^[▼v]/);
        });

        it('Enter toggles from expanded to collapsed', () => {
            const widget = makeToolCall({ collapsed: false });
            widget.handleKey('Enter');

            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // Now collapsed — should show collapsed chevron
            expect(row0).toMatch(/^[▶>]/);
        });

        it('toggling twice returns to original state', () => {
            const widget = makeToolCall({ collapsed: true });
            widget.handleKey(' ');
            widget.handleKey(' ');

            const screen = render(widget);
            // Back to collapsed — row 1 should be empty
            const row1 = rowText(screen, 1);
            expect(row1.trim()).toBe('');
        });
    });

    describe('5. setStatus("done") changes status indicator', () => {
        it('setStatus("done") updates status label in row 0', () => {
            const widget = makeToolCall({ status: 'pending' });
            widget.setStatus('done');

            const screen = render(widget);
            const row0 = rowText(screen, 0);
            expect(row0).toContain('done');
            expect(row0).not.toContain('pending');
        });

        it('done status shows ✓ or + symbol', () => {
            const widget = makeToolCall({ status: 'done' });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // Unicode ✓ or ASCII +
            expect(row0).toMatch(/[✓+]/);
        });

        it('setStatus marks widget dirty', () => {
            const widget = makeToolCall({ status: 'pending' });
            widget.clearDirty();
            expect(widget.isDirty).toBe(false);

            widget.setStatus('running');
            expect(widget.isDirty).toBe(true);
        });

        it('error status shows ✗ or ! symbol', () => {
            const widget = makeToolCall({ status: 'error' });
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            expect(row0).toMatch(/[✗!]/);
        });
    });

    describe('6. setResult(value) stores result visible when expanded', () => {
        it('setResult stores result and shows it in expanded done state', () => {
            const widget = makeToolCall({
                args: { path: '/tmp/test' },
                status: 'done',
                collapsed: false,
            });
            widget.setResult('file contents here');

            const screen = render(widget);
            let foundResult = false;
            for (let r = 0; r < 20; r++) {
                const row = rowText(screen, r);
                if (row.includes('result') && row.includes('file contents here')) {
                    foundResult = true;
                }
            }
            expect(foundResult).toBe(true);
        });

        it('result is not visible when collapsed', () => {
            const widget = makeToolCall({
                status: 'done',
                collapsed: true,
            });
            widget.setResult('secret result');

            const screen = render(widget);
            let foundResult = false;
            for (let r = 1; r < 20; r++) {
                const row = rowText(screen, r);
                if (row.includes('secret result')) foundResult = true;
            }
            expect(foundResult).toBe(false);
        });

        it('result is not shown for pending status', () => {
            const widget = makeToolCall({
                status: 'pending',
                collapsed: false,
            });
            widget.setResult('premature result');

            const screen = render(widget);
            let foundResult = false;
            for (let r = 0; r < 20; r++) {
                const row = rowText(screen, r);
                if (row.includes('result:')) foundResult = true;
            }
            expect(foundResult).toBe(false);
        });

        it('setResult marks widget dirty', () => {
            const widget = makeToolCall({ status: 'done' });
            widget.clearDirty();
            expect(widget.isDirty).toBe(false);

            widget.setResult({ success: true });
            expect(widget.isDirty).toBe(true);
        });
    });

    describe('collapse() and expand() API', () => {
        it('collapse() collapses the widget', () => {
            const widget = makeToolCall({ collapsed: false });
            widget.collapse();
            const screen = render(widget);
            expect(rowText(screen, 1).trim()).toBe('');
        });

        it('expand() expands the widget', () => {
            const widget = makeToolCall({ collapsed: true, args: { x: 1 } });
            widget.expand();
            const screen = render(widget);
            expect(rowText(screen, 1)).toContain('x:');
        });
    });
});

describe('ToolApproval', () => {

    describe('7. ToolApproval renders [y] Approve [n] Deny row', () => {
        it('renders [y] Approve text', () => {
            const widget = makeToolApproval({ collapsed: false });
            const screen = render(widget);

            let found = false;
            for (let r = 0; r < 20; r++) {
                if (rowText(screen, r).includes('[y]')) found = true;
            }
            expect(found).toBe(true);
        });

        it('renders [n] Deny text', () => {
            const widget = makeToolApproval({ collapsed: false });
            const screen = render(widget);

            let found = false;
            for (let r = 0; r < 20; r++) {
                if (rowText(screen, r).includes('[n]')) found = true;
            }
            expect(found).toBe(true);
        });

        it('approval row appears after args', () => {
            const widget = makeToolApproval({
                args: { command: 'echo hello' },
                collapsed: false,
            });
            const screen = render(widget);

            // Row 0: header, Row 1: arg, Row 2: approval
            const row2 = rowText(screen, 2);
            expect(row2).toContain('[y]');
            expect(row2).toContain('[n]');
        });

        it('approval row appears right after header when collapsed', () => {
            const widget = makeToolApproval({ collapsed: true });
            const screen = render(widget);
            const row1 = rowText(screen, 1);
            expect(row1).toContain('[y]');
        });
    });

    describe('8. ToolApproval: y key calls onApprove', () => {
        it('y key triggers onApprove callback', () => {
            const onApprove = vi.fn();
            const widget = makeToolApproval({ onApprove });
            widget.handleKey('y');
            expect(onApprove).toHaveBeenCalledOnce();
        });

        it('Enter key triggers onApprove callback', () => {
            const onApprove = vi.fn();
            const widget = makeToolApproval({ onApprove });
            widget.handleKey('Enter');
            expect(onApprove).toHaveBeenCalledOnce();
        });

        it('onApprove is optional (no error when not set)', () => {
            const widget = makeToolApproval({ onApprove: undefined });
            expect(() => widget.handleKey('y')).not.toThrow();
        });
    });

    describe('9. ToolApproval: n key calls onDeny', () => {
        it('n key triggers onDeny callback', () => {
            const onDeny = vi.fn();
            const widget = makeToolApproval({ onDeny });
            widget.handleKey('n');
            expect(onDeny).toHaveBeenCalledOnce();
        });

        it('Escape key triggers onDeny callback', () => {
            const onDeny = vi.fn();
            const widget = makeToolApproval({ onDeny });
            widget.handleKey('Escape');
            expect(onDeny).toHaveBeenCalledOnce();
        });

        it('onDeny is optional (no error when not set)', () => {
            const widget = makeToolApproval({ onDeny: undefined });
            expect(() => widget.handleKey('n')).not.toThrow();
        });

        it('y does not call onDeny and n does not call onApprove', () => {
            const onApprove = vi.fn();
            const onDeny = vi.fn();
            const widget = makeToolApproval({ onApprove, onDeny });

            widget.handleKey('y');
            expect(onDeny).not.toHaveBeenCalled();

            widget.handleKey('n');
            expect(onApprove).toHaveBeenCalledOnce(); // only from 'y'
        });
    });

    describe('ToolApproval inherits ToolCall focusable behavior', () => {
        it('is focusable', () => {
            const widget = makeToolApproval();
            expect(widget.focusable).toBe(true);
        });

        it('Space still toggles collapse when not y/n/Enter/Escape (falls to super)', () => {
            // Space should toggle collapse
            const widget = makeToolApproval({ collapsed: true });
            // Space is not handled by ToolApproval, falls to super.handleKey
            widget.handleKey(' ');
            const screen = render(widget);
            const row0 = rowText(screen, 0);
            // Should now be expanded
            expect(row0).toMatch(/^[▼v]/);
        });
    });
});

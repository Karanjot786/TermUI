// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for TaskList widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Screen, caps } from '@termuijs/core';
import { TaskList } from './TaskList.js';
import type { TaskItem } from './TaskList.js';

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────

function render(widget: TaskList, width = 30, height = 5): string[] {
    const screen = new Screen(width, height);
    widget.updateRect({ x: 0, y: 0, width, height });
    widget.render(screen);
    return screen.back.map(row => row.map(c => c.char).join(''));
}

const TASKS: TaskItem[] = [
    { id: 1, label: 'Build',  status: 'pending' },
    { id: 2, label: 'Lint',   status: 'running' },
    { id: 3, label: 'Tests',  status: 'done'    },
    { id: 4, label: 'Deploy', status: 'error'   },
];

// ── Suite ─────────────────────────────────────────────

describe('TaskList', () => {
    it('renders pending status text', () => {
        const tl = new TaskList({}, { pendingText: 'WAIT' }, [
            { id: 1, label: 'Build', status: 'pending' },
        ]);
        const rows = render(tl);
        expect(rows[0]).toContain('Build');
        expect(rows[0]).toContain('WAIT');
    });

    it('renders done status text', () => {
        const tl = new TaskList({}, { doneText: 'DONE' }, [
            { id: 1, label: 'Tests', status: 'done' },
        ]);
        const rows = render(tl);
        expect(rows[0]).toContain('Tests');
        expect(rows[0]).toContain('DONE');
    });

    it('renders error status text', () => {
        const tl = new TaskList({}, { errorText: 'FAIL' }, [
            { id: 1, label: 'Deploy', status: 'error' },
        ]);
        const rows = render(tl);
        expect(rows[0]).toContain('Deploy');
        expect(rows[0]).toContain('FAIL');
    });

    it('renders runningText when wheelspin is false', () => {
        const tl = new TaskList({}, { runningText: 'RUN', wheelspin: false }, [
            { id: 1, label: 'Lint', status: 'running' },
        ]);
        const rows = render(tl);
        expect(rows[0]).toContain('Lint');
        expect(rows[0]).toContain('RUN');
    });

    it('renders unicode Braille spinner frame for running task when wheelspin is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const tl = new TaskList({}, { wheelspin: true }, [
            { id: 1, label: 'Lint', status: 'running' },
        ]);
        const rows = render(tl);
        // First Braille frame is '⠋' (codePoint > 127)
        const spinChar = rows[0].replace('Lint ', '').trim()[0];
        expect(spinChar?.codePointAt(0)).toBeGreaterThan(127);
    });

    it('renders ASCII spinner frame for running task when wheelspin true and unicode false', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const tl = new TaskList({}, { wheelspin: true }, [
            { id: 1, label: 'Lint', status: 'running' },
        ]);
        const rows = render(tl);
        // ASCII frames: |, /, -, \ — all codePoint <= 127
        const spinChar = rows[0].replace('Lint ', '').trim()[0];
        expect(spinChar?.codePointAt(0)).toBeLessThanOrEqual(127);
        expect(['|', '/', '-', '\\']).toContain(spinChar);
    });

    it('setTasks() replaces the list and calls markDirty()', () => {
        const tl = new TaskList({}, {}, []);
        const markDirtySpy = vi.spyOn(tl, 'markDirty');

        tl.setTasks(TASKS);
        expect(markDirtySpy).toHaveBeenCalledTimes(1);

        // Verify the new tasks are rendered
        const rows = render(tl, 30, 4);
        expect(rows[0]).toContain('Build');
        expect(rows[1]).toContain('Lint');
        expect(rows[2]).toContain('Tests');
        expect(rows[3]).toContain('Deploy');
    });

    it('tick() calls markDirty() only when the frame advances', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const tl = new TaskList({}, { wheelspin: true }, [
            { id: 1, label: 'Lint', status: 'running' },
        ]);
        const markDirtySpy = vi.spyOn(tl, 'markDirty');

        // Below threshold (80 ms) — no frame change, no dirty
        tl.tick(50);
        expect(markDirtySpy).not.toHaveBeenCalled();

        // Past threshold — frame advances, markDirty fires
        tl.tick(40); // total 90 ms >= 80 ms
        expect(markDirtySpy).toHaveBeenCalledTimes(1);
    });

    it('tick() does nothing when wheelspin is false', () => {
        const tl = new TaskList({}, { wheelspin: false }, [
            { id: 1, label: 'Lint', status: 'running' },
        ]);
        const markDirtySpy = vi.spyOn(tl, 'markDirty');
        tl.tick(1000);
        expect(markDirtySpy).not.toHaveBeenCalled();
    });

    it('tick() does nothing when no task is running', () => {
        const tl = new TaskList({}, { wheelspin: true }, [
            { id: 1, label: 'Build', status: 'done' },
        ]);
        const markDirtySpy = vi.spyOn(tl, 'markDirty');
        tl.tick(1000);
        expect(markDirtySpy).not.toHaveBeenCalled();
    });

    it('tasks beyond visible height are not rendered', () => {
        const tl = new TaskList({}, { pendingText: 'W' }, [
            { id: 1, label: 'Task1', status: 'pending' },
            { id: 2, label: 'Task2', status: 'pending' },
            { id: 3, label: 'Task3', status: 'pending' },
        ]);
        // Render with height=2 — only Task1 and Task2 should appear
        const rows = render(tl, 20, 2);
        expect(rows[0]).toContain('Task1');
        expect(rows[1]).toContain('Task2');
        // Row 3 is out of bounds — screen row 2 stays blank
        const row2 = rows[2] ?? '';
        expect(row2.trim()).toBe('');
    });

    it('renders default status texts when no options provided', () => {
        const tl = new TaskList({}, {}, TASKS);
        const rows = render(tl, 30, 4);
        // Default texts are '...' for all statuses
        expect(rows[0]).toContain('...');  // pending
        expect(rows[2]).toContain('...');  // done
        expect(rows[3]).toContain('...');  // error
    });

    it('returns task list via getTasks getter', () => {
        const tl = new TaskList({}, {}, TASKS);
        expect(tl.getTasks()).toBe(TASKS);
    });
});

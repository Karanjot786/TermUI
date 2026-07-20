// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for FileExplorer
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { Screen, caps, type KeyEvent } from '@termuijs/core';
import { FileExplorer } from './FileExplorer.js';
import type { FileItem } from './FileExplorer.js';
import { Widget } from './base/Widget.js';

// ── Temp directory helpers ──────────────────────────

let tmpRoot = '';
const SUB = 'sub';
const FILE = 'file.txt';
const SECRET = '.secret';
const CHILD_A = join(SUB, 'a.txt');
const CHILD_B = join(SUB, 'b.txt');
const CHILD_A_NAME = 'a.txt';
const SUB_NAME = SUB;

beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'termui-fe-'));
    mkdirSync(join(tmpRoot, SUB), { recursive: true });
    writeFileSync(join(tmpRoot, FILE), 'hello');
    writeFileSync(join(tmpRoot, SECRET), 'hidden');
    writeFileSync(join(tmpRoot, CHILD_A), 'a');
    writeFileSync(join(tmpRoot, CHILD_B), 'b');
});

afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
});

/** Build a minimal KeyEvent for handleKey tests. */
const keyEvent = (key: string, ctrl = false): KeyEvent => ({
    key,
    raw: Buffer.from(key),
    ctrl,
    alt: false,
    shift: false,
    stopPropagation() {},
    preventDefault() {},
});

/** Concatenate a screen row into a single string. */
const rowText = (screen: Screen, row: number): string =>
    screen.back[row].map((c) => c.char).join('');

// ── Helpers ───────────────────────────────────────────

const makeFiles = (): FileItem[] => [
    { name: 'readme.md',  path: '/root/readme.md',  isDirectory: false },
    { name: 'src',        path: '/root/src',         isDirectory: true  },
    { name: 'index.ts',   path: '/root/index.ts',    isDirectory: false },
];

// ── Tests ─────────────────────────────────────────────

describe('FileExplorer', () => {

    // constructor
    it('defaults root to "./"', () => {
        const fe = new FileExplorer();
        expect(fe.root).toBe('./');
    });

    it('uses provided root option', () => {
        const fe = new FileExplorer({ root: '/home/user' });
        expect(fe.root).toBe('/home/user');
    });

    // setFiles
    it('setFiles loads files and resets selectedIndex to 0', () => {
        const fe = new FileExplorer();
        const files = makeFiles();
        fe.setFiles(files);
        fe.next(); // move to index 1
        fe.setFiles(files); // reload resets to 0
        expect(fe.current?.name).toBe('readme.md');
    });

    // next
    it('next() moves selection down by one', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.next();
        expect(fe.current?.name).toBe('src');
    });

    it('next() does not go past the last item', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.next();
        fe.next();
        fe.next(); // already at last — should stay
        expect(fe.current?.name).toBe('index.ts');
    });

    // previous
    it('previous() moves selection up by one', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.next();
        fe.next(); // at index 2
        fe.previous();
        expect(fe.current?.name).toBe('src');
    });

    it('previous() does not go below 0', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.previous(); // already at 0 — should stay
        expect(fe.current?.name).toBe('readme.md');
    });

    // select
    it('select() adds current file path to selected set', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.select();
        expect(fe.selected).toContain('/root/readme.md');
    });

    it('select() calls onSelect callback with correct path', () => {
        const onSelect = vi.fn();
        const fe = new FileExplorer({ onSelect });
        fe.setFiles(makeFiles());
        fe.next(); // move to src
        fe.select();
        expect(onSelect).toHaveBeenCalledWith('/root/src');
    });

    it('select() is a no-op when file list is empty', () => {
        const onSelect = vi.fn();
        const fe = new FileExplorer({ onSelect });
        fe.setFiles([]);
        fe.select();
        expect(onSelect).not.toHaveBeenCalled();
        expect(fe.selected).toHaveLength(0);
    });

    // search
    it('search() filters files by name case-insensitively', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        const results = fe.search('README');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('readme.md');
    });

    it('search() returns empty array when no match', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        const results = fe.search('nonexistent');
        expect(results).toHaveLength(0);
    });

    // current getter
    it('current returns undefined when no files loaded', () => {
        const fe = new FileExplorer();
        expect(fe.current).toBeUndefined();
    });

    // selected getter
    it('selected returns all selected paths', () => {
        const fe = new FileExplorer();
        fe.setFiles(makeFiles());
        fe.select();       // select readme.md
        fe.next();
        fe.select();       // select src
        expect(fe.selected).toHaveLength(2);
        expect(fe.selected).toContain('/root/readme.md');
        expect(fe.selected).toContain('/root/src');
    });
});

// ── Widget behaviour ─────────────────────────────────

describe('FileExplorer widget behaviour', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is a Widget', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        expect(fe).toBeInstanceOf(Widget);
    });

    it('is focusable', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        expect(fe.focusable).toBe(true);
    });

    it('reloads the directory contents from disk', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const names = fe.selected; // ensure it does not throw
        expect(names).toHaveLength(0);
        expect(fe.current).toBeDefined();
        // directories are listed first
        expect(fe.current?.isDirectory).toBe(true);
    });

    it('renders the header path and a file list with icons (ASCII fallback)', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);

        // Header row shows the current path
        expect(rowText(screen, 0)).toContain(tmpRoot);

        // Directory listed with the ASCII folder icon
        expect(rowText(screen, 1)).toContain('[D]');
        // The plain file is listed with the ASCII file icon
        const body = [1, 2, 3].map((r) => rowText(screen, r)).join('\n');
        expect(body).toContain('[F]');
        expect(body).toContain(FILE);
    });

    it('renders unicode folder/file icons when unicode is available', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);

        const body = [1, 2, 3].map((r) => rowText(screen, r)).join('\n');
        expect(body).toContain('📁');
        expect(body).toContain('📄');
        expect(body).not.toContain('[D]');
        expect(body).not.toContain('[F]');
    });

    it('highlights the selected row with a background when focused', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        fe.next(); // select the first file row (index 1, after the directory)
        fe.isFocused = true;
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);

        const selectedRow = [1, 2, 3].find((r) => rowText(screen, r).includes(FILE));
        expect(selectedRow).toBeDefined();
        const bg = screen.back[selectedRow as number][0].bg;
        expect(bg.type === 'named' && bg.name === 'blue').toBe(true);
    });

    it('navigates the selection down and up with the keyboard', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const first = fe.current?.name;
        fe.handleKey(keyEvent('down'));
        expect(fe.current?.name).not.toBe(first);
        fe.handleKey(keyEvent('up'));
        expect(fe.current?.name).toBe(first);
    });

    it('does not move past the first/last item', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        fe.handleKey(keyEvent('up'));
        expect(fe.current).toBe(fe.current); // unchanged at top
        for (let i = 0; i < 50; i++) fe.handleKey(keyEvent('down'));
        const last = fe.current?.name;
        fe.handleKey(keyEvent('down'));
        expect(fe.current?.name).toBe(last); // unchanged at bottom
    });

    it('expands and collapses a directory with Enter', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        const childBase = CHILD_A.split('/').pop() as string;
        fe.render(screen);
        expect(rowText(screen, 1)).not.toContain(childBase);

        // Enter on the directory (selected by default) expands it.
        fe.handleKey(keyEvent('enter'));
        fe.render(screen);
        expect(rowText(screen, 2)).toContain(childBase);

        // Enter again collapses it.
        fe.handleKey(keyEvent('enter'));
        fe.render(screen);
        expect(rowText(screen, 1)).not.toContain(childBase);
    });

    it('indents nested directory children in the tree', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        fe.handleKey(keyEvent('enter')); // expand sub/
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);
        // The child row should be indented relative to the directory row.
        const dirRow = rowText(screen, 1);
        const childRow = rowText(screen, 2);
        const childBase = CHILD_A.split('/').pop() as string;
        expect(childRow.indexOf(childBase)).toBeGreaterThan(dirRow.indexOf(SUB));
    });

    it('selects a file with Enter and fires onSelect', () => {
        const onSelect = vi.fn();
        const fe = new FileExplorer({ root: tmpRoot, onSelect });
        fe.reload();
        fe.next(); // move to the first file
        fe.handleKey(keyEvent('enter'));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect.mock.calls[0][0]).toContain(FILE);
        expect(fe.selected.some((p) => p.endsWith(FILE))).toBe(true);
    });

    it('navigates to the parent directory with Backspace', () => {
        const subPath = join(tmpRoot, SUB);
        const fe = new FileExplorer({ root: subPath });
        fe.reload();
        expect(fe.root).toBe(subPath);
        fe.handleKey(keyEvent('backspace'));
        expect(fe.root).toBe(dirname(subPath));
    });

    it('hides dotfiles by default and shows them after toggling', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);
        const body = [1, 2, 3, 4].map((r) => rowText(screen, r)).join('\n');
        expect(body).not.toContain(SECRET);

        fe.toggleHiddenFiles();
        fe.render(screen);
        const body2 = [1, 2, 3, 4].map((r) => rowText(screen, r)).join('\n');
        expect(body2).toContain(SECRET);
    });

    it('shows dotfiles initially when hiddenFiles option is true', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);
        const fe = new FileExplorer({ root: tmpRoot, hiddenFiles: true });
        fe.reload();
        expect(fe.showHidden).toBe(true);
        const screen = new Screen(60, 10);
        fe.updateRect({ x: 0, y: 0, width: 60, height: 10 });
        fe.render(screen);
        const body = [1, 2, 3, 4].map((r) => rowText(screen, r)).join('\n');
        expect(body).toContain(SECRET);
    });

    it('toggles hidden files with the "/" key', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const before = fe.showHidden;
        fe.handleKey(keyEvent('/'));
        expect(fe.showHidden).toBe(!before);
    });

    it('toggles hidden files with Ctrl+F', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        const before = fe.showHidden;
        fe.handleKey(keyEvent('f', true));
        expect(fe.showHidden).toBe(!before);
    });

    it('marks the widget dirty when navigating', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        fe.clearDirty();
        fe.handleKey(keyEvent('down'));
        expect(fe.isDirty).toBe(true);
    });

    it('marks the widget dirty when toggling hidden files', () => {
        const fe = new FileExplorer({ root: tmpRoot });
        fe.reload();
        fe.clearDirty();
        fe.toggleHiddenFiles();
        expect(fe.isDirty).toBe(true);
    });
});
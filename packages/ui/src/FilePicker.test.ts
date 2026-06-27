// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for FilePicker widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Dirent } from 'node:fs';
import { createKeyEvent } from '@termuijs/core';

// ── fs mock setup ────────────────────────────────────
// We mock the 'node:fs' module (matching FilePicker.ts's import * as fs from 'node:fs')
// so no real filesystem IO happens in CI.

vi.mock('node:fs', () => {
    return {
        default: {},
        readdirSync: vi.fn(),
        statSync: vi.fn(),
    };
});

// Must import after vi.mock is hoisted
import * as fsMod from 'node:fs';
import * as nodePath from 'node:path';
// Cast through unknown so vi.mocked() doesn't fight the overloaded fs signatures
const readdirSync = fsMod.readdirSync as unknown as ReturnType<typeof vi.fn>;
const statSync    = fsMod.statSync    as unknown as ReturnType<typeof vi.fn>;

// ── Helpers ──────────────────────────────────────────

/** Build a minimal Dirent-like object for testing. */
function makeDirent(name: string, isDir: boolean, isSymlink = false): Dirent {
    return {
        name,
        isDirectory: () => isDir && !isSymlink,
        isFile: () => !isDir && !isSymlink,
        isSymbolicLink: () => isSymlink,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        path: '',
        parentPath: '',
    } as unknown as Dirent;
}

/**
 * Set up readdirSync to return the given entries for any path.
 * statSync is set to return { isDirectory: () => false } by default.
 */
function mockDir(entries: Array<{ name: string; isDir: boolean; isSymlink?: boolean }>): void {
    readdirSync.mockReturnValue(
        entries.map(e => makeDirent(e.name, e.isDir, e.isSymlink ?? false)) as any,
    );
    statSync.mockReturnValue({ isDirectory: () => false } as any);
}

/** Build a key event with sensible defaults. */
function key(k: string, mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}): ReturnType<typeof createKeyEvent> {
    return createKeyEvent({
        key: k,
        ctrl: mods.ctrl ?? false,
        alt: mods.alt ?? false,
        shift: mods.shift ?? false,
        raw: Buffer.alloc(0),
    });
}

// ── Suite ────────────────────────────────────────────

describe('FilePicker', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ══════════════════════════════════════════════════
    // 1. Constructor & Initialization
    // ══════════════════════════════════════════════════

    describe('constructor & initialization', () => {

        it('populates entries from the directory listing', async () => {
            mockDir([
                { name: 'src', isDir: true },
                { name: 'README.md', isDir: false },
                { name: 'package.json', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            // Should have '..' + 1 dir + 2 files = 4
            expect(picker.entries.length).toBe(4);
            // First real entry (after '..') should be the directory
            expect(picker.entries[1]!.name).toBe('src');
            expect(picker.entries[1]!.isDir).toBe(true);
        });

        it('defaults startPath to process.cwd() when omitted', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker();

            expect(picker.currentPath).toBe(nodePath.resolve(process.cwd()));
        });

        it('initializes cursorIndex to 0', async () => {
            mockDir([{ name: 'a.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(picker.cursorIndex).toBe(0);
        });

        it('initializes entries to a non-null array', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(Array.isArray(picker.entries)).toBe(true);
        });

        it('is focusable', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(picker.focusable).toBe(true);
        });

        it('initializes correctly with an empty directory', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            // Only the '..' entry
            expect(picker.entries.length).toBe(1);
            expect(picker.entries[0]!.name).toBe('..');
            expect(picker.cursorIndex).toBe(0);
        });

        it('selectedEntry is undefined when the list is empty (root with no children)', async () => {
            // Mock both calls: construction + any subsequent reload
            readdirSync.mockReturnValue([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);
            // Use the platform root so dirname(root) === root, which suppresses the '..' entry
            const root = nodePath.parse(process.cwd()).root;

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: root });

            // Root with an empty directory produces zero entries
            expect(picker.entries.length).toBe(0);
            expect(picker.selectedEntry).toBeUndefined();
        });
    });

    // ══════════════════════════════════════════════════
    // 2. Directory Loading
    // ══════════════════════════════════════════════════

    describe('directory loading', () => {

        it('directories render before files in the entry list', async () => {
            mockDir([
                { name: 'zebra.ts', isDir: false },
                { name: 'alpha', isDir: true },
                { name: 'beta', isDir: true },
                { name: 'apple.ts', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            // entries[0] = '..', entries[1] & [2] should be directories
            expect(picker.entries[1]!.isDir).toBe(true);
            expect(picker.entries[2]!.isDir).toBe(true);
            // entries[3] & [4] should be files
            expect(picker.entries[3]!.isDir).toBe(false);
            expect(picker.entries[4]!.isDir).toBe(false);
        });

        it('sorts directories alphabetically (case-insensitive)', async () => {
            mockDir([
                { name: 'Zebra', isDir: true },
                { name: 'apple', isDir: true },
                { name: 'Mango', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const dirNames = picker.entries.filter(e => e.isDir && e.name !== '..').map(e => e.name);
            expect(dirNames).toEqual(['apple', 'Mango', 'Zebra']);
        });

        it('sorts files alphabetically (case-insensitive)', async () => {
            mockDir([
                { name: 'zebra.ts', isDir: false },
                { name: 'Apple.ts', isDir: false },
                { name: 'mango.ts', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const fileNames = picker.entries.filter(e => !e.isDir).map(e => e.name);
            expect(fileNames).toEqual(['Apple.ts', 'mango.ts', 'zebra.ts']);
        });

        it('prepends a ".." entry for non-root directories', async () => {
            mockDir([{ name: 'index.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project/src' });

            expect(picker.entries[0]!.name).toBe('..');
            expect(picker.entries[0]!.isDir).toBe(true);
        });

        it('omits ".." entry at the filesystem root', async () => {
            mockDir([{ name: 'bin', isDir: true }]);

            const root = nodePath.parse(process.cwd()).root;

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: root });

            const names = picker.entries.map(e => e.name);
            expect(names).not.toContain('..');
        });

        it('treats symlink directories as directories', async () => {
            // Dirent says it is a symlink; statSync says the target is a directory
            readdirSync.mockReturnValue([makeDirent('linked-dir', false, true)] as any);
            statSync.mockReturnValue({ isDirectory: () => true } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const linked = picker.entries.find(e => e.name === 'linked-dir');
            expect(linked).toBeDefined();
            expect(linked!.isDir).toBe(true);
        });

        it('treats symlinks to files as regular files', async () => {
            readdirSync.mockReturnValue([makeDirent('linked-file.ts', false, true)] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const linked = picker.entries.find(e => e.name === 'linked-file.ts');
            expect(linked).toBeDefined();
            expect(linked!.isDir).toBe(false);
        });

        it('handles broken symlinks (statSync throws) without exception', async () => {
            readdirSync.mockReturnValue([makeDirent('broken-link', false, true)] as any);
            statSync.mockImplementation(() => { throw new Error('ENOENT'); });

            const { FilePicker } = await import('./FilePicker.js');

            expect(() => new FilePicker({ startPath: '/project' })).not.toThrow();
        });

        it('handles readdirSync failures gracefully (shows only ".." entry)', async () => {
            readdirSync.mockImplementation(() => { throw new Error('EACCES'); });
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/protected' });

            // Only '..' should remain; no exception thrown
            expect(picker.entries.length).toBe(1);
            expect(picker.entries[0]!.name).toBe('..');
        });

        it('fullPath on entries is the absolute path', async () => {
            mockDir([{ name: 'index.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const fileEntry = picker.entries.find(e => e.name === 'index.ts');
            expect(fileEntry!.fullPath).toBe(nodePath.resolve('/project', 'index.ts'));
        });
    });

    // ══════════════════════════════════════════════════
    // 3. Filtering
    // ══════════════════════════════════════════════════

    describe('filtering', () => {

        it('filter option hides files that do not match the extension list', async () => {
            mockDir([
                { name: 'main.ts', isDir: false },
                { name: 'style.css', isDir: false },
                { name: 'data.json', isDir: false },
                { name: 'lib', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: ['.ts'] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('main.ts');
            expect(names).toContain('lib');
            expect(names).not.toContain('style.css');
            expect(names).not.toContain('data.json');
        });

        it('multiple extensions in the filter work correctly', async () => {
            mockDir([
                { name: 'App.ts', isDir: false },
                { name: 'App.tsx', isDir: false },
                { name: 'App.css', isDir: false },
                { name: 'App.test.ts', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: ['.ts', '.tsx'] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('App.ts');
            expect(names).toContain('App.tsx');
            expect(names).toContain('App.test.ts');  // .ts extension
            expect(names).not.toContain('App.css');
        });

        it('extension matching is exact (e.g. ".json" does not match ".json5")', async () => {
            mockDir([
                { name: 'data.json', isDir: false },
                { name: 'config.json5', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: ['.json'] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('data.json');
            expect(names).not.toContain('config.json5');
        });

        it('directories are never filtered out regardless of extension filter', async () => {
            mockDir([
                { name: 'components.ts', isDir: true },  // dir whose name ends in .ts
                { name: 'styles.css', isDir: true },      // dir whose name ends in .css
                { name: 'main.ts', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: ['.ts'] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('components.ts');
            expect(names).toContain('styles.css');
        });

        it('empty filter array shows all files', async () => {
            mockDir([
                { name: 'a.ts', isDir: false },
                { name: 'b.css', isDir: false },
                { name: 'c.md', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: [] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('a.ts');
            expect(names).toContain('b.css');
            expect(names).toContain('c.md');
        });

        it('filter with a single .json extension only keeps .json files', async () => {
            mockDir([
                { name: 'package.json', isDir: false },
                { name: 'tsconfig.json', isDir: false },
                { name: 'index.ts', isDir: false },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', filter: ['.json'] });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('package.json');
            expect(names).toContain('tsconfig.json');
            expect(names).not.toContain('index.ts');
        });
    });

    // ══════════════════════════════════════════════════
    // 4. Hidden Files
    // ══════════════════════════════════════════════════

    describe('hidden files', () => {

        it('showHidden:true includes dot-files in the listing', async () => {
            mockDir([
                { name: '.env', isDir: false },
                { name: '.git', isDir: true },
                { name: 'src', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', showHidden: true });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('.env');
            expect(names).toContain('.git');
        });

        it('showHidden:false (default) excludes hidden files', async () => {
            mockDir([
                { name: '.env', isDir: false },
                { name: 'src', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const names = picker.entries.map(e => e.name);
            expect(names).not.toContain('.env');
            expect(names).toContain('src');
        });

        it('showHidden:false (default) excludes hidden directories', async () => {
            mockDir([
                { name: '.git', isDir: true },
                { name: 'src', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            const names = picker.entries.map(e => e.name);
            expect(names).not.toContain('.git');
            expect(names).toContain('src');
        });

        it('showHidden:true includes hidden directories', async () => {
            mockDir([
                { name: '.hidden-dir', isDir: true },
                { name: 'visible-dir', isDir: true },
            ]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', showHidden: true });

            const names = picker.entries.map(e => e.name);
            expect(names).toContain('.hidden-dir');
            expect(names).toContain('visible-dir');
        });

        it('".." entry is always present regardless of hidden settings', async () => {
            mockDir([{ name: '.dotfile', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const pickerHidden = new FilePicker({ startPath: '/project/src', showHidden: false });
            const pickerVisible = new FilePicker({ startPath: '/project/src', showHidden: true });

            expect(pickerHidden.entries[0]!.name).toBe('..');
            expect(pickerVisible.entries[0]!.name).toBe('..');
        });
    });

    // ══════════════════════════════════════════════════
    // 5. Navigation (selectNext / selectPrev)
    // ══════════════════════════════════════════════════

    describe('navigation (selectNext / selectPrev)', () => {

        it('selectNext moves cursor down by one', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(picker.cursorIndex).toBe(0);
            picker.selectNext();
            expect(picker.cursorIndex).toBe(1);
        });

        it('selectPrev moves cursor up by one', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext();
            expect(picker.cursorIndex).toBe(1);
            picker.selectPrev();
            expect(picker.cursorIndex).toBe(0);
        });

        it('selectPrev at index 0 stays at 0 (clamp)', async () => {
            mockDir([{ name: 'a.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectPrev();
            expect(picker.cursorIndex).toBe(0);
        });

        it('selectNext at last entry stays at last (clamp)', async () => {
            mockDir([{ name: 'only.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });
            // entries: ['..', 'only.ts'] → last index 1

            picker.selectNext(); // → 1
            picker.selectNext(); // clamped → still 1
            expect(picker.cursorIndex).toBe(1);
        });

        it('cursor never becomes negative', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            // Multiple selectPrev calls on a list with only '..'
            picker.selectPrev();
            picker.selectPrev();
            picker.selectPrev();
            expect(picker.cursorIndex).toBeGreaterThanOrEqual(0);
        });

        it('navigation in an empty directory (root, no entries) is safe', async () => {
            readdirSync.mockReturnValue([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const root = nodePath.parse(process.cwd()).root;

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: root });

            expect(() => {
                picker.selectNext();
                picker.selectPrev();
            }).not.toThrow();
        });
    });

    // ══════════════════════════════════════════════════
    // 6. Keyboard Controls
    // ══════════════════════════════════════════════════

    describe('keyboard controls', () => {

        it('"up" key calls selectPrev()', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext(); // cursor = 1
            picker.handleKey(key('up'));
            expect(picker.cursorIndex).toBe(0);
        });

        it('"down" key calls selectNext()', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.handleKey(key('down'));
            expect(picker.cursorIndex).toBe(1);
        });

        it('"k" key without modifiers calls selectPrev()', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext();
            picker.handleKey(key('k'));
            expect(picker.cursorIndex).toBe(0);
        });

        it('"j" key without modifiers calls selectNext()', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.handleKey(key('j'));
            expect(picker.cursorIndex).toBe(1);
        });

        it('"k" with ctrl modifier is ignored (does not call selectPrev)', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext(); // cursor = 1
            picker.handleKey(key('k', { ctrl: true }));
            // cursor should still be 1 because ctrl+k is ignored
            expect(picker.cursorIndex).toBe(1);
        });

        it('"j" with ctrl modifier is ignored (does not call selectNext)', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.handleKey(key('j', { ctrl: true }));
            expect(picker.cursorIndex).toBe(0);
        });

        it('"k" with alt modifier is ignored', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext(); // cursor = 1
            picker.handleKey(key('k', { alt: true }));
            expect(picker.cursorIndex).toBe(1);
        });

        it('"j" with alt modifier is ignored', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.handleKey(key('j', { alt: true }));
            expect(picker.cursorIndex).toBe(0);
        });

        it('"enter" calls confirm()', async () => {
            mockDir([{ name: 'config.json', isDir: false }]);

            const onSelect = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onSelect });

            picker.selectNext(); // move to 'config.json'
            picker.handleKey(key('enter'));
            expect(onSelect).toHaveBeenCalledOnce();
        });

        it('"return" behaves identically to "enter"', async () => {
            mockDir([{ name: 'config.json', isDir: false }]);

            const onSelect = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onSelect });

            picker.selectNext();
            picker.handleKey(key('return'));
            expect(onSelect).toHaveBeenCalledOnce();
        });

        it('"escape" fires onCancel', async () => {
            mockDir([]);

            const onCancel = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onCancel });

            picker.handleKey(key('escape'));
            expect(onCancel).toHaveBeenCalledOnce();
        });

        it('"backspace" navigates to parent directory', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('a', false)] as any)
                .mockReturnValueOnce([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project/src' });
            const before = picker.currentPath;

            picker.handleKey(key('backspace'));
            expect(picker.currentPath).not.toBe(before);
        });

        it('unrecognised keys are safely ignored', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(() => picker.handleKey(key('f1'))).not.toThrow();
            expect(() => picker.handleKey(key('tab'))).not.toThrow();
            expect(() => picker.handleKey(key('space'))).not.toThrow();
        });
    });

    // ══════════════════════════════════════════════════
    // 7. Directory Navigation
    // ══════════════════════════════════════════════════

    describe('directory navigation', () => {

        it('confirm() on a directory navigates into it', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('src', true)] as any)
                .mockReturnValueOnce([makeDirent('index.ts', false)] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext(); // move to 'src'
            expect(picker.selectedEntry!.name).toBe('src');

            picker.confirm();

            expect(picker.currentPath).toMatch(/src/);
            expect(picker.entries.some(e => e.name === 'index.ts')).toBe(true);
        });

        it('cursor resets to 0 after navigating into a directory', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('src', true), makeDirent('lib', true)] as any)
                .mockReturnValueOnce([makeDirent('index.ts', false)] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext();
            picker.selectNext(); // cursor = 2 → 'src' (alpha order: ['..', 'lib', 'src'])

            picker.confirm(); // navigate into 'src'
            expect(picker.cursorIndex).toBe(0);
        });

        it('navigating through ".." returns to parent directory', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('index.ts', false)] as any) // /project/src
                .mockReturnValueOnce([makeDirent('src', true)] as any);       // /project
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project/src' });

            // entries[0] == '..'
            picker.confirm(); // navigate via '..'

            expect(picker.currentPath).toBe(nodePath.resolve('/project'));
        });

        it('goUp() navigates to the parent directory', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('sub', true)] as any)
                .mockReturnValueOnce([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const startPath = nodePath.join(nodePath.sep, 'project', 'src');
            const picker = new FilePicker({ startPath });
            const before = picker.currentPath;

            picker.goUp();

            expect(picker.currentPath).not.toBe(before);
            expect(picker.currentPath).toBe(nodePath.dirname(before));
        });

        it('goUp() at root is a no-op', async () => {
            mockDir([]);

            const root = nodePath.parse(process.cwd()).root;

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: root });
            const before = picker.currentPath;

            expect(() => picker.goUp()).not.toThrow();
            expect(picker.currentPath).toBe(before);
        });

        it('repeated goUp() calls eventually reach root safely', async () => {
            // Provide enough mock returns to cover multiple up-navigations
            readdirSync.mockReturnValue([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/a/b/c/d/e' });

            expect(() => {
                for (let i = 0; i < 20; i++) picker.goUp();
            }).not.toThrow();
        });
    });

    // ══════════════════════════════════════════════════
    // 8. File Selection
    // ══════════════════════════════════════════════════

    describe('file selection', () => {

        it('confirm() on a file fires onSelect with the full path', async () => {
            mockDir([{ name: 'config.json', isDir: false }]);

            const onSelect = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onSelect });

            picker.selectNext(); // → 'config.json'
            picker.confirm();

            expect(onSelect).toHaveBeenCalledOnce();
            expect(onSelect.mock.calls[0]![0]).toMatch(/config\.json$/);
        });

        it('onSelect receives the absolute path string', async () => {
            mockDir([{ name: 'README.md', isDir: false }]);

            const onSelect = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onSelect });

            picker.selectNext();
            picker.confirm();

            expect(typeof onSelect.mock.calls[0]![0]).toBe('string');
            expect(nodePath.isAbsolute(onSelect.mock.calls[0]![0])).toBe(true);
        });

        it('confirm() on a directory does NOT fire onSelect', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('src', true)] as any)
                .mockReturnValueOnce([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const onSelect = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onSelect });

            picker.selectNext(); // move to 'src'
            picker.confirm();

            expect(onSelect).not.toHaveBeenCalled();
        });

        it('confirm() with no selected entry (empty list) does nothing', async () => {
            readdirSync.mockReturnValue([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const root = nodePath.parse(process.cwd()).root;
            const onSelect = vi.fn();

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: root, onSelect });

            // If there truly are no entries, confirm() should not throw
            expect(() => picker.confirm()).not.toThrow();
            expect(onSelect).not.toHaveBeenCalled();
        });

        it('cancel() fires onCancel callback', async () => {
            mockDir([]);

            const onCancel = vi.fn();
            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project', onCancel });

            picker.cancel();
            expect(onCancel).toHaveBeenCalledOnce();
        });

        it('cancel() is safe when no onCancel is provided', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(() => picker.cancel()).not.toThrow();
        });
    });

    // ══════════════════════════════════════════════════
    // 9. Rendering
    // ══════════════════════════════════════════════════

    describe('rendering', () => {

        it('renders without error when directory is empty', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);

            expect(() => picker.render(screen)).not.toThrow();
        });

        it('renders the current path in the header row', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 60, height: 10 });
            const screen = new Screen(60, 10);
            picker.render(screen);

            const headerRow = screen.back[0].map((c: { char: string }) => c.char).join('');
            expect(headerRow).toContain('project');
        });

        it('renders a separator on row 1', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);
            picker.render(screen);

            const sepRow = screen.back[1].map((c: { char: string }) => c.char).join('');
            // Separator is either unicode dashes or ASCII dashes — never blank
            expect(sepRow.trim().length).toBeGreaterThan(0);
        });

        it('renders file entry names in rows below the separator', async () => {
            mockDir([{ name: 'index.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);
            picker.render(screen);

            // Rows 2+ are entry rows; join all to find the filename
            const listContent = screen.back
                .slice(2)
                .map(row => row.map((c: { char: string }) => c.char).join(''))
                .join('\n');

            expect(listContent).toContain('index.ts');
        });

        it('renders ".." entry in rows below the separator', async () => {
            mockDir([]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project/src' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);
            picker.render(screen);

            const listContent = screen.back
                .slice(2)
                .map(row => row.map((c: { char: string }) => c.char).join(''))
                .join('\n');

            expect(listContent).toContain('..');
        });

        it('does not throw on very small screen width=1 height=1', async () => {
            mockDir([{ name: 'a.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 1, height: 1 });
            const screen = new Screen(1, 1);

            expect(() => picker.render(screen)).not.toThrow();
        });

        it('does not throw on zero-dimension screen width=0 height=0', async () => {
            mockDir([{ name: 'a.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 0, height: 0 });
            const screen = new Screen(1, 1); // screen must be at least 1x1

            expect(() => picker.render(screen)).not.toThrow();
        });

        it('blank rows are written for empty entry slots', async () => {
            // 1 entry + '..' → 2 entries, height = 10 → 8 list rows, 6 will be blank
            mockDir([{ name: 'only.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);

            expect(() => picker.render(screen)).not.toThrow();
        });
    });

    // ══════════════════════════════════════════════════
    // 10. Scrolling Behavior
    // ══════════════════════════════════════════════════

    describe('scrolling behavior', () => {

        it('scrolls down when cursor moves past the viewport', async () => {
            // 8 files — with '..' = 9 entries; height = 6 → listHeight = 4
            const manyFiles = Array.from({ length: 8 }, (_, i) => ({
                name: `file${i}.ts`, isDir: false,
            }));
            mockDir(manyFiles);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 6 });

            // Move cursor past the initial viewport
            for (let i = 0; i < 7; i++) picker.selectNext();

            const screen = new Screen(40, 6);
            expect(() => picker.render(screen)).not.toThrow();

            // The active filename should be visible somewhere in the rendered list
            const listContent = screen.back
                .slice(2)
                .map(row => row.map((c: { char: string }) => c.char).join(''))
                .join('\n');

            const activeEntry = picker.selectedEntry!;
            expect(listContent).toContain(activeEntry.name);
        });

        it('scrolls back up when cursor moves to the top', async () => {
            const manyFiles = Array.from({ length: 8 }, (_, i) => ({
                name: `file${i}.ts`, isDir: false,
            }));
            mockDir(manyFiles);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 6 });

            // Scroll to bottom then back to top
            for (let i = 0; i < 8; i++) picker.selectNext();
            for (let i = 0; i < 8; i++) picker.selectPrev();

            const screen = new Screen(40, 6);
            picker.render(screen);

            // '..' should be visible in the first list row
            const firstListRow = screen.back[2].map((c: { char: string }) => c.char).join('');
            expect(firstListRow).toContain('..');
        });
    });

    // ══════════════════════════════════════════════════
    // 11. Dirty State
    // ══════════════════════════════════════════════════

    describe('dirty state', () => {

        it('markDirty() is called when the directory changes (via confirm)', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('sub', true)] as any)
                .mockReturnValueOnce([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            (picker as any)._dirty = false;
            picker.selectNext();
            picker.confirm(); // navigates into 'sub'

            expect(picker.isDirty).toBe(true);
        });

        it('markDirty() is called when the selection changes', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            (picker as any)._dirty = false;
            picker.selectNext();

            expect(picker.isDirty).toBe(true);
        });

        it('markDirty() is called during initial directory load', async () => {
            mockDir([{ name: 'a.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            // Widget starts dirty because _loadEntries() calls markDirty()
            expect(picker.isDirty).toBe(true);
        });

        it('markDirty() is called when goUp() navigates to parent', async () => {
            readdirSync
                .mockReturnValueOnce([makeDirent('file.ts', false)] as any)
                .mockReturnValueOnce([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project/src' });

            (picker as any)._dirty = false;
            picker.goUp();

            expect(picker.isDirty).toBe(true);
        });

        it('markDirty() is NOT called when selectNext at last entry (clamp)', async () => {
            mockDir([{ name: 'only.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            picker.selectNext(); // cursor = 1 (last)
            (picker as any)._dirty = false;

            picker.selectNext(); // clamped — should NOT call markDirty
            expect(picker.isDirty).toBe(false);
        });

        it('markDirty() is NOT called when selectPrev at first entry (clamp)', async () => {
            mockDir([{ name: 'only.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            (picker as any)._dirty = false;
            picker.selectPrev(); // already at 0 — should NOT call markDirty
            expect(picker.isDirty).toBe(false);
        });
    });

    // ══════════════════════════════════════════════════
    // 12. Robustness
    // ══════════════════════════════════════════════════

    describe('robustness', () => {

        it('handles hundreds of files without throwing', async () => {
            const manyFiles = Array.from({ length: 300 }, (_, i) => ({
                name: `file${String(i).padStart(4, '0')}.ts`, isDir: false,
            }));
            mockDir(manyFiles);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 60, height: 20 });
            const screen = new Screen(60, 20);

            expect(() => picker.render(screen)).not.toThrow();
            expect(picker.entries.length).toBe(301); // '..' + 300 files
        });

        it('renders long filenames without throwing', async () => {
            const longName = 'a'.repeat(200) + '.ts';
            mockDir([{ name: longName, isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);

            expect(() => picker.render(screen)).not.toThrow();
        });

        it('handles invalid/broken symlink targets without throwing', async () => {
            readdirSync.mockReturnValue([makeDirent('bad-link', false, true)] as any);
            statSync.mockImplementation(() => { throw new Error('ENOENT'); });

            const { FilePicker } = await import('./FilePicker.js');
            const { Screen } = await import('@termuijs/core');

            const picker = new FilePicker({ startPath: '/project' });
            picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
            const screen = new Screen(40, 10);

            expect(() => picker.render(screen)).not.toThrow();
        });

        it('handles readdirSync returning an empty array', async () => {
            readdirSync.mockReturnValue([] as any);
            statSync.mockReturnValue({ isDirectory: () => false } as any);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(picker.entries.length).toBe(1); // only '..'
        });

        it('repeated navigation key presses do not throw', async () => {
            mockDir([{ name: 'a.ts', isDir: false }, { name: 'b.ts', isDir: false }]);

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(() => {
                for (let i = 0; i < 50; i++) picker.handleKey(key('down'));
                for (let i = 0; i < 50; i++) picker.handleKey(key('up'));
                for (let i = 0; i < 10; i++) picker.handleKey(key('j'));
                for (let i = 0; i < 10; i++) picker.handleKey(key('k'));
            }).not.toThrow();
        });

        it('handles mixed dirs, files, and broken symlinks together', async () => {
            readdirSync.mockReturnValue([
                makeDirent('src', true, false),
                makeDirent('linked-dir', false, true),
                makeDirent('broken-link', false, true),
                makeDirent('main.ts', false, false),
            ] as any);
            statSync
                .mockReturnValueOnce({ isDirectory: () => true })   // linked-dir → dir
                .mockImplementationOnce(() => { throw new Error('ENOENT'); }); // broken-link

            const { FilePicker } = await import('./FilePicker.js');
            const picker = new FilePicker({ startPath: '/project' });

            expect(picker.entries.length).toBeGreaterThanOrEqual(3);
            const names = picker.entries.map(e => e.name);
            expect(names).toContain('src');
            expect(names).toContain('main.ts');
        });
    });
});

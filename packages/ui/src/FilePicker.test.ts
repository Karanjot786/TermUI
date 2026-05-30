// ─────────────────────────────────────────────────────
// @termuijs/ui — Tests for FilePicker widget
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Dirent } from 'fs';
import { createKeyEvent } from '@termuijs/core';

// ── fs mock setup ────────────────────────────────────
// We mock the 'fs' module (matching PathInput.ts's import * as fs from 'fs')
// so no real filesystem IO happens in CI.

vi.mock('fs', () => {
    return {
        default: {},
        readdirSync: vi.fn(),
        statSync: vi.fn(),
    };
});

// Must import after vi.mock is hoisted
import * as fsMod from 'fs';
import * as nodePath from 'path';
// Cast through unknown so vi.mocked() doesn't fight the overloaded fs signatures
const readdirSync = fsMod.readdirSync as unknown as ReturnType<typeof vi.fn>;
const statSync    = fsMod.statSync    as unknown as ReturnType<typeof vi.fn>;

// ── Helpers ──────────────────────────────────────────

/** Build a minimal Dirent-like object for testing. */
function makeDirent(name: string, isDir: boolean): Dirent {
    return {
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
        isSymbolicLink: () => false,
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
function mockDir(entries: Array<{ name: string; isDir: boolean }>): void {
    readdirSync.mockReturnValue(
        entries.map(e => makeDirent(e.name, e.isDir)) as any,
    );
    statSync.mockReturnValue({ isDirectory: () => false } as any);
}

// ── Suite ────────────────────────────────────────────

describe('FilePicker', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ─── 1. Renders directory listing ────────────────

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

    // ─── 2. `..` entry is always present (non-root) ──

    it('prepends a ".." entry for non-root directories', async () => {
        mockDir([{ name: 'index.ts', isDir: false }]);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project/src' });

        expect(picker.entries[0]!.name).toBe('..');
        expect(picker.entries[0]!.isDir).toBe(true);
    });

    // ─── 3. Enter / confirm opens a directory ────────

    it('confirm() on a directory navigates into it', async () => {
        // First call: listing for /project
        readdirSync
            .mockReturnValueOnce([makeDirent('src', true)] as any)
            // Second call: listing for /project/src
            .mockReturnValueOnce([makeDirent('index.ts', false)] as any);
        statSync.mockReturnValue({ isDirectory: () => false } as any);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project' });

        // entries: ['..', 'src'] — move to 'src' (index 1)
        picker.selectNext();
        expect(picker.selectedEntry!.name).toBe('src');

        picker.confirm();

        expect(picker.currentPath).toMatch(/src/);
        // New listing should contain '..' + index.ts
        expect(picker.entries.some(e => e.name === 'index.ts')).toBe(true);
    });

    // ─── 4. filter hides non-matching file types ─────

    it('filter option hides files that do not match the extension list', async () => {
        mockDir([
            { name: 'main.ts', isDir: false },
            { name: 'style.css', isDir: false },
            { name: 'data.json', isDir: false },
            { name: 'lib', isDir: true },
        ]);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({
            startPath: '/project',
            filter: ['.ts'],
        });

        const names = picker.entries.map(e => e.name);
        expect(names).toContain('main.ts');   // passes filter
        expect(names).toContain('lib');        // dirs always shown
        expect(names).not.toContain('style.css');
        expect(names).not.toContain('data.json');
    });

    // ─── 5. onSelect fires with full path ────────────

    it('confirm() on a file fires onSelect with the full path', async () => {
        mockDir([{ name: 'config.json', isDir: false }]);

        const onSelect = vi.fn();
        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project', onSelect });

        // entries[0] = '..', entries[1] = 'config.json' → move to index 1
        picker.selectNext();
        expect(picker.selectedEntry!.name).toBe('config.json');

        picker.confirm();

        expect(onSelect).toHaveBeenCalledOnce();
        expect(onSelect.mock.calls[0]![0]).toMatch(/config\.json$/);
    });

    // ─── 6. Escape fires onCancel ────────────────────

    it('cancel() fires onCancel callback', async () => {
        mockDir([]);

        const onCancel = vi.fn();
        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project', onCancel });

        picker.cancel();

        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('handleKey with "escape" fires onCancel', async () => {
        mockDir([]);

        const onCancel = vi.fn();
        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project', onCancel });

        picker.handleKey(createKeyEvent({ key: 'escape', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

        expect(onCancel).toHaveBeenCalledOnce();
    });

    // ─── 7. Backspace / goUp navigates to parent ─────

    it('goUp() navigates to the parent directory', async () => {
        readdirSync
            .mockReturnValueOnce([makeDirent('sub', true)] as any)   // startPath
            .mockReturnValueOnce([] as any);                          // parent
        statSync.mockReturnValue({ isDirectory: () => false } as any);

        // nodePath is imported at the top of the file as a namespace import,
        // which is always valid regardless of moduleResolution settings.
        const { FilePicker } = await import('./FilePicker.js');
        const startPath = nodePath.join(nodePath.sep, 'project', 'src');

        const picker = new FilePicker({ startPath });
        const before = picker.currentPath;

        picker.goUp();

        // currentPath must have changed to the parent
        expect(picker.currentPath).not.toBe(before);
        expect(picker.currentPath).toBe(nodePath.dirname(before));
    });

    it('handleKey with "backspace" calls goUp()', async () => {
        readdirSync
            .mockReturnValueOnce([makeDirent('a', false)] as any)
            .mockReturnValueOnce([] as any);
        statSync.mockReturnValue({ isDirectory: () => false } as any);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project/src' });
        const before = picker.currentPath;

        picker.handleKey(createKeyEvent({ key: 'backspace', ctrl: false, alt: false, shift: false, raw: Buffer.alloc(0) }));

        expect(picker.currentPath).not.toBe(before);
    });

    // ─── 8. Navigation clamps at boundaries ──────────

    it('selectPrev at index 0 stays at 0', async () => {
        mockDir([{ name: 'a.ts', isDir: false }]);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project' });

        picker.selectPrev();   // already at 0
        expect(picker.cursorIndex).toBe(0);
    });

    it('selectNext at last entry stays at last', async () => {
        mockDir([{ name: 'only.ts', isDir: false }]);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project' });
        // entries: ['..', 'only.ts'] → length 2 → last index 1

        picker.selectNext(); // → 1
        picker.selectNext(); // clamped → still 1
        expect(picker.cursorIndex).toBe(1);
    });

    // ─── 9. markDirty on dir change + selection change

    it('markDirty() is called when the directory changes', async () => {
        readdirSync
            .mockReturnValueOnce([makeDirent('sub', true)] as any)
            .mockReturnValueOnce([] as any);
        statSync.mockReturnValue({ isDirectory: () => false } as any);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project' });

        // Reset dirty flag after construction
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

    // ─── 10. Empty directory renders without error ───

    it('renders without error when directory is empty', async () => {
        mockDir([]);

        const { FilePicker } = await import('./FilePicker.js');
        const { Screen } = await import('@termuijs/core');

        const picker = new FilePicker({ startPath: '/project' });
        picker.updateRect({ x: 0, y: 0, width: 40, height: 10 });
        const screen = new Screen(40, 10);

        expect(() => picker.render(screen)).not.toThrow();
    });

    // ─── 11. showHidden shows dotfiles ───────────────

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

    it('showHidden:false (default) excludes dot-files', async () => {
        mockDir([
            { name: '.env', isDir: false },
            { name: 'src', isDir: true },
        ]);

        const { FilePicker } = await import('./FilePicker.js');
        const picker = new FilePicker({ startPath: '/project' }); // showHidden defaults false

        const names = picker.entries.map(e => e.name);
        expect(names).not.toContain('.env');
        expect(names).toContain('src');
    });
});

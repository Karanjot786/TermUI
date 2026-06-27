// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for FileExplorer
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi } from 'vitest';
import { FileExplorer } from './FileExplorer.js';
import type { FileItem } from './FileExplorer.js';

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
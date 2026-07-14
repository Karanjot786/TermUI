import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeComponentFiles } from './add.js';

describe('writeComponentFiles', () => {
    it('writes files under <destRoot>/<slug>/', () => {
        const root = mkdtempSync(join(tmpdir(), 'tcli-'));
        const written = writeComponentFiles(root, 'spinner',
            [{ path: 'spinner.ts', content: 'export const x = 1;' }], { dryRun: false });
        const target = join(root, 'spinner', 'spinner.ts');
        expect(existsSync(target)).toBe(true);
        expect(readFileSync(target, 'utf-8')).toContain('export const x');
        expect(written).toContain(target);
    });

    it('dry-run writes nothing', () => {
        const root = mkdtempSync(join(tmpdir(), 'tcli-'));
        writeComponentFiles(root, 'spinner',
            [{ path: 'spinner.ts', content: 'x' }], { dryRun: true });
        expect(existsSync(join(root, 'spinner', 'spinner.ts'))).toBe(false);
    });

    it('strips registry component prefixes before writing files', () => {
        const root = mkdtempSync(join(tmpdir(), 'tcli-'));
        const written = writeComponentFiles(root, 'spinner',
            [{ path: 'registry/components/spinner/index.ts', content: 'x' }], { dryRun: false });

        const target = join(root, 'spinner', 'index.ts');
        expect(existsSync(target)).toBe(true);
        expect(written).toEqual([target]);
    });

    it('rejects a file path that escapes the destination root', () => {
        const root = mkdtempSync(join(tmpdir(), 'tcli-'));
        expect(() => writeComponentFiles(root, 'spinner',
            [{ path: '../../evil.ts', content: 'x' }], { dryRun: false }))
            .toThrow(/outside/);
    });
});

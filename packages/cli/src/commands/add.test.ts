import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planComponentFiles, writeComponentFiles } from './add.js';

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

    it('plans dry-run create and overwrite actions', () => {
        const root = mkdtempSync(join(tmpdir(), 'tcli-'));
        mkdirSync(join(root, 'spinner'), { recursive: true });
        writeFileSync(join(root, 'spinner', 'existing.ts'), 'old', 'utf-8');

        expect(planComponentFiles(root, 'spinner', [
            { path: 'existing.ts', content: 'new' },
            { path: 'new.ts', content: 'x' },
        ])).toEqual([
            { path: join(root, 'spinner', 'existing.ts'), action: 'overwrite' },
            { path: join(root, 'spinner', 'new.ts'), action: 'create' },
        ]);
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

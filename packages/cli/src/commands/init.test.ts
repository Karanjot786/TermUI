import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init.js';

describe('runInit', () => {
    let originalCwd: string;
    let tempDir: string;

    beforeAll(() => {
        originalCwd = process.cwd();
        tempDir = mkdtempSync(join(tmpdir(), 'termui-init-test-'));
        process.chdir(tempDir);
    });

    afterAll(() => {
        process.chdir(originalCwd);
    });

    it('creates config files and basic layout in an empty folder', async () => {
        await runInit();

        // 1. Check tsconfig.json
        const tsconfigPath = join(tempDir, 'tsconfig.json');
        expect(existsSync(tsconfigPath)).toBe(true);
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
        expect(tsconfig.compilerOptions.jsxImportSource).toBe('@termuijs/jsx');

        // 2. Check src/index.tsx
        const indexPath = join(tempDir, 'src', 'index.tsx');
        expect(existsSync(indexPath)).toBe(true);
        expect(readFileSync(indexPath, 'utf-8')).toContain('Welcome to TermUI!');

        // 3. Check package.json
        const packageJsonPath = join(tempDir, 'package.json');
        expect(existsSync(packageJsonPath)).toBe(true);
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        expect(pkg.dependencies['@termuijs/core']).toBe('latest');
        expect(pkg.dependencies['@termuijs/widgets']).toBe('latest');
        expect(pkg.dependencies['@termuijs/jsx']).toBe('latest');
    });

    it('updates dependencies in an existing package.json without overwriting user fields', async () => {
        const testDir = mkdtempSync(join(tmpdir(), 'termui-init-test-existing-'));
        const originalCwdInner = process.cwd();
        try {
            process.chdir(testDir);
            const userPkg = {
                name: 'my-custom-app',
                version: '1.2.3',
                dependencies: {
                    lodash: '^4.17.21',
                },
            };
            writeFileSync(join(testDir, 'package.json'), JSON.stringify(userPkg, null, 2), 'utf-8');

            await runInit();

            const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf-8'));
            expect(pkg.name).toBe('my-custom-app');
            expect(pkg.version).toBe('1.2.3');
            expect(pkg.dependencies.lodash).toBe('^4.17.21');
            expect(pkg.dependencies['@termuijs/core']).toBe('latest');
            expect(pkg.dependencies['@termuijs/widgets']).toBe('latest');
            expect(pkg.dependencies['@termuijs/jsx']).toBe('latest');
        } finally {
            process.chdir(originalCwdInner);
        }
    });

    it('skips updating when all termui dependencies are already present', async () => {
        const testDir = mkdtempSync(join(tmpdir(), 'termui-init-test-uptodate-'));
        const originalCwdInner = process.cwd();
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            process.chdir(testDir);

            // Pre-existing package.json with all termui deps at latest
            const userPkg = {
                name: 'my-app',
                version: '0.1.0',
                dependencies: {
                    '@termuijs/core': 'latest',
                    '@termuijs/widgets': 'latest',
                    '@termuijs/jsx': 'latest',
                },
            };
            writeFileSync(join(testDir, 'package.json'), JSON.stringify(userPkg, null, 2), 'utf-8');

            await runInit();

            // package.json should NOT have been modified (no '+' log for dependencies)
            const logCalls = consoleSpy.mock.calls.map(c => c[0] as string);
            const depUpdateCall = logCalls.find(l => l.includes('dependencies updated'));
            expect(depUpdateCall).toBeUndefined();
        } finally {
            consoleSpy.mockRestore();
            process.chdir(originalCwdInner);
        }
    });

    it('handles malformed package.json without crashing', async () => {
        const testDir = mkdtempSync(join(tmpdir(), 'termui-init-test-bad-json-'));
        const originalCwdInner = process.cwd();
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            process.chdir(testDir);

            // Write a malformed package.json (not valid JSON)
            writeFileSync(join(testDir, 'package.json'), '{ not valid json }', 'utf-8');

            // runInit should not throw — it catches the parse error
            await expect(runInit()).resolves.not.toThrow();

            // Should log a parse error
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('invalid JSON')
            );
        } finally {
            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
            process.chdir(originalCwdInner);
        }
    });
});

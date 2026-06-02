import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveImports } from './importer.js';
import { readFileSync } from 'node:fs';

// Tell Vitest to mock the internal node:fs module
vi.mock('node:fs');

describe('TSS Importer', () => {
    beforeEach(() => {
        // Reset the mock's history and behavior before each test runs
        vi.mocked(readFileSync).mockReset();
    });

    it('inlines a basic @import statement', () => {
        vi.mocked(readFileSync).mockImplementation((filePath) => {
            if (filePath.toString().endsWith('theme.tss')) {
                return 'Button { bg: blue; }';
            }
            return '';
        });

        const source = `@import "theme.tss";\nText { fg: red; }`;
        const result = resolveImports(source, '/mock/base.tss');

        expect(result).toContain('Button { bg: blue; }');
        expect(result).toContain('Text { fg: red; }');
    });

    it('handles single and double quotes', () => {
        vi.mocked(readFileSync).mockReturnValue('Box { width: 100; }');

        const source1 = `@import 'single.tss';`;
        const source2 = `@import "double.tss";`;

        expect(resolveImports(source1, '/mock/base.tss')).toContain('Box { width: 100; }');
        expect(resolveImports(source2, '/mock/base.tss')).toContain('Box { width: 100; }');
    });

    it('handles circular dependencies without throwing or infinite looping', () => {
        vi.mocked(readFileSync).mockImplementation((filePath) => {
            if (filePath.toString().endsWith('a.tss')) {
                return `@import "b.tss";\nA { fg: red; }`;
            }
            if (filePath.toString().endsWith('b.tss')) {
                return `@import "a.tss";\nB { fg: blue; }`;
            }
            return '';
        });

        const result = resolveImports(`@import "a.tss";`, '/mock/main.tss');
        
        expect(result).toContain('A { fg: red; }');
        expect(result).toContain('B { fg: blue; }');
        expect(result).toContain('Circular import avoided');
    });

    it('does not throw on missing files (graceful degradation)', () => {
        vi.mocked(readFileSync).mockImplementation(() => {
            throw new Error('ENOENT: no such file or directory');
        });

        const result = resolveImports(`@import "missing.tss";`, '/mock/main.tss');
        
        expect(result).toContain('/* Error: Could not resolve import missing.tss */');
    });

    it('leaves source unchanged if no imports exist', () => {
        const source = `Box { width: 100; }`;
        const result = resolveImports(source, '/mock/main.tss');
        
        expect(result).toBe(source);
    });
});
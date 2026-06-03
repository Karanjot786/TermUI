import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Resolves and inlines @import statements in TSS strings.
 * Syntax supported: @import "path/to/file.tss"; or @import 'path/to/file.tss';
 *
 * @param source The raw TSS string containing potential @import statements.
 * @param basePath The absolute path of the file being parsed (used to resolve relative imports).
 * @param visited A set of already visited file paths to prevent circular dependencies.
 * @returns The TSS string with all imports inlined.
 */
export function resolveImports(source: string, basePath: string, visited = new Set<string>()): string {
    const importRegex = /@import\s+(?:'([^']+)'|"([^"]+)");?/g;

    return source.replace(importRegex, (match, singleQuotePath, doubleQuotePath) => {
        const importPath = singleQuotePath || doubleQuotePath;
        if (!importPath) return match;

        const fullPath = resolve(dirname(basePath), importPath);

        // Edge case: Prevent infinite loops from circular dependencies
        if (visited.has(fullPath)) {
            return `/* Circular import avoided: ${importPath} */`;
        }

        visited.add(fullPath);

        try {
            const importedSource = readFileSync(fullPath, 'utf8');
            // Recursively resolve any imports within the newly loaded file
            return resolveImports(importedSource, fullPath, visited);
        } catch (error) {
            // Edge case: Do not throw on missing files, fail gracefully per acceptance criteria
            return `/* Error: Could not resolve import ${importPath} */`;
        }
    });
}
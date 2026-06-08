import { readFileSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';

const ALLOWED_EXTENSIONS = ['.tss', '.json', '.yaml', '.yml'];

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

        const baseDir = dirname(basePath);
        const fullPath = resolve(baseDir, importPath);

        // Path traversal protection: reject any path that escapes the base directory.
        // startsWith() is NOT safe here — "/themes-evil" starts with "/themes".
        // path.relative() correctly detects traversal via ".." segments.
        const rel = relative(baseDir, fullPath);
        if (rel.startsWith('..') || isAbsolute(rel)) {
            return `/* Error: Path traversal blocked */`;
        }

        // Only allow known theme file extensions
        const ext = fullPath.toLowerCase().slice(fullPath.lastIndexOf('.'));
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return `/* Error: Unsupported import extension: ${importPath} */`;
        }

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
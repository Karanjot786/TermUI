// ─────────────────────────────────────────────────────
// Scanner — discovers routes from filesystem
// ─────────────────────────────────────────────────────

import * as fs from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

export interface ScannedRoute {
    /** File-system relative path */
    filePath: string;
    /** Resolved URL path */
    urlPath: string;
    /** Whether this is an index route */
    isIndex: boolean;
    /** Whether this has dynamic params */
    isDynamic: boolean;
}

/**
 * Scan a directory for route files (.tsx, .ts, .jsx, .js).
 * Follows Next.js-style conventions:
 *   screens/index.tsx       → /
 *   screens/about.tsx       → /about
 *   screens/settings/index.tsx → /settings
 *   screens/tasks/[id].tsx  → /tasks/[id]
 */
export function scanRoutes(screensDir: string): ScannedRoute[] {
    if (!fs.existsSync(screensDir)) return [];
    const routes: ScannedRoute[] = [];
    const validExts = new Set(['.tsx', '.ts', '.jsx', '.js']);

    function walk(dir: string) {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (validExts.has(extname(entry))) {
                const name = basename(entry, extname(entry));
                if (name.startsWith('_') || name.startsWith('.')) continue; // skip private files

                const rel = relative(screensDir, fullPath);
                const isIndex = name === 'index';
                const dirPart = rel.substring(0, rel.lastIndexOf('/'));
                const urlPath = isIndex
                    ? (dirPart ? `/${dirPart}` : '/')
                    : `/${dirPart ? dirPart + '/' : ''}${name}`;

                routes.push({
                    filePath: rel,
                    urlPath: urlPath.replace(/\\/g, '/'),
                    isIndex,
                    isDynamic: urlPath.includes('['),
                });
            }
        }
    }

    walk(screensDir);
    // Sort: static routes first, then dynamic
    return routes.sort((a, b) => {
        if (a.isDynamic !== b.isDynamic) return a.isDynamic ? 1 : -1;
        return a.urlPath.localeCompare(b.urlPath);
    });
}

// @termuijs/dev-server — Hot-Reload Dev Server
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { findWorkspaceDeps } from './workspace.js'

export { DevServer } from './server.js';
export type { DevServerOptions } from './server.js';
export { FileWatcher } from './watcher.js';
export type { FileChange, WatcherEvents } from './watcher.js';
export { DevTools } from './devtools.js';
export type { WidgetNode, PerfMetrics } from './devtools.js';
export { ErrorOverlay, parseErrorStack } from './error-overlay.js';
export type { ParsedError } from './error-overlay.js';
export { WidgetTreeInspector } from './inspector.js';
export { cleanupActiveInstances } from './cleanup.js';

// ── CLI ARGUMENT PARSING ─────────────────────────────────────────────────
// This section would normally be in your CLI entry point.
// Since index.ts is a barrel file, the actual parsing happens elsewhere.
// If your server.ts or cli.ts contains the parseArgs logic, you'll need
// to add the 'watch-deps' option there instead.

// However, if you want to add --watch-deps support to this file as a module,
// here's how you'd expose it:

export interface DevServerCliOptions {
  entry?: string;
  port?: number;
  'watch-deps'?: boolean;
  [key: string]: unknown;
}

// Helper function to check if --watch-deps was passed
export function hasWatchDepsFlag(argv: string[] = process.argv): boolean {
  return argv.includes('--watch-deps') || argv.includes('-w');
}

// Helper to get workspace deps when watch-deps is enabled
export async function getWorkspaceDepsForWatching(sourceDir: string): Promise<string[]> {
  const watchPaths: string[] = [];
  const workspaceDeps = await findWorkspaceDeps(sourceDir);
  
  for (const depPath of workspaceDeps) {
    const distPath = join(depPath, 'dist');
    if (existsSync(distPath)) {
      watchPaths.push(distPath);
    }
  }
  
  if (workspaceDeps.length > 0) {
    console.log(
      `[dev-server] --watch-deps: watching ${workspaceDeps.length} @termuijs/* workspace package(s):`
    );
    for (const dep of workspaceDeps) {
      console.log(`  → ${dep}/dist`);
    }
  } else {
    console.log(
      '[dev-server] --watch-deps: no @termuijs/* workspace symlinks found in node_modules'
    );
  }
  
  return watchPaths;
}
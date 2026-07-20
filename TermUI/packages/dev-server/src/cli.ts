#!/usr/bin/env bun
// ─────────────────────────────────────────────────────
// termui dev — CLI entry point
//
// Usage:
//   termui dev [rootDir] [--entry src/app.tsx]
// ─────────────────────────────────────────────────────

import { DevServer } from './server.js';

const args = process.argv.slice(2);

// Parse arguments
let rootDir = '.';
let entry: string | undefined;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--entry' && args[i + 1]) {
        entry = args[++i];
    } else if (!args[i].startsWith('-')) {
        rootDir = args[i];
    }
}

const server = new DevServer({
    rootDir,
    entry,
    devTools: true,
    onReload: (change) => {
        // The server now handles restart automatically via child process
    },
});

process.on('SIGINT', () => { server.stop(); process.exit(0); });
process.on('SIGTERM', () => { server.stop(); process.exit(0); });

server.start();

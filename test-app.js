#!/usr/bin/env node
import { spawn } from 'child_process';

const child = spawn('npx', ['vitest', 'run', 'packages/core/src/app/App.test.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});

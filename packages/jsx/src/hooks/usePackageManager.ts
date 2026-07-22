// usePackageManager — detect and use the current package manager

import { useState } from '../hooks.js';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface PackageManagerCommands {
  pm: PackageManager;
  /** Install a package, or run bare install if no pkg given */
  install: (pkg?: string) => string;
  /** Run a package.json script */
  run: (script: string) => string;
  /** Execute a package binary (npx/bunx/pnpx/yarn dlx) */
  x: (cmd: string) => string;
}

const COMMANDS: Record<PackageManager, Omit<PackageManagerCommands, 'pm'>> = {
  npm: {
    install: (pkg?) => pkg ? `npm install ${pkg}` : 'npm install',
    run: (s) => `npm run ${s}`,
    x: (c) => `npx ${c}`,
  },
  yarn: {
    install: (pkg?) => pkg ? `yarn add ${pkg}` : 'yarn install',
    run: (s) => `yarn ${s}`,
    x: (c) => `yarn dlx ${c}`,
  },
  pnpm: {
    install: (pkg?) => pkg ? `pnpm add ${pkg}` : 'pnpm install',
    run: (s) => `pnpm run ${s}`,
    x: (c) => `pnpm dlx ${c}`,
  },
  bun: {
    install: (pkg?) => pkg ? `bun add ${pkg}` : 'bun install',
    run: (s) => `bun run ${s}`,
    x: (c) => `bunx ${c}`,
  },
};

/** Detect the running package manager from environment variables. */
export function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? '';
  if (agent) {
    if (agent.startsWith('bun/')) return 'bun';
    if (agent.startsWith('pnpm/')) return 'pnpm';
    if (agent.startsWith('yarn/')) return 'yarn';
    if (agent.startsWith('npm/')) return 'npm';
  }
  const execpath = process.env.npm_execpath ?? '';
  if (execpath.includes('pnpm')) return 'pnpm';
  if (execpath.includes('yarn')) return 'yarn';
  if (execpath.includes('bun')) return 'bun';
  return 'npm';
}

/** Return command helpers for the given package manager. */
export function getPackageManagerCommands(pm: PackageManager): PackageManagerCommands {
  return { pm, ...COMMANDS[pm] };
}

/** Hook: returns commands for the detected package manager (stable across renders). */
export function usePackageManager(): PackageManagerCommands {
  const [cmds] = useState(() => getPackageManagerCommands(detectPackageManager()));
  return cmds;
}

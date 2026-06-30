import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectPackageManager, getPackageManagerCommands } from './usePackageManager.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('detectPackageManager', () => {
  it('detects bun from npm_config_user_agent', () => {
    vi.stubEnv('npm_config_user_agent', 'bun/1.3.14 npm/? node/v22.0.0 linux x64');
    expect(detectPackageManager()).toBe('bun');
  });

  it('detects pnpm from npm_config_user_agent', () => {
    vi.stubEnv('npm_config_user_agent', 'pnpm/9.0.0 npm/? node/v22.0.0 linux x64');
    expect(detectPackageManager()).toBe('pnpm');
  });

  it('detects yarn from npm_config_user_agent', () => {
    vi.stubEnv('npm_config_user_agent', 'yarn/4.0.0 npm/? node/v22.0.0 linux x64');
    expect(detectPackageManager()).toBe('yarn');
  });

  it('detects npm from npm_config_user_agent', () => {
    vi.stubEnv('npm_config_user_agent', 'npm/10.0.0 node/v22.0.0 linux x64');
    expect(detectPackageManager()).toBe('npm');
  });

  it('falls back to npm when no env vars set', () => {
    vi.stubEnv('npm_config_user_agent', '');
    vi.stubEnv('npm_execpath', '');
    expect(detectPackageManager()).toBe('npm');
  });

  it('detects pnpm from npm_execpath path', () => {
    vi.stubEnv('npm_config_user_agent', '');
    vi.stubEnv('npm_execpath', '/usr/local/lib/node_modules/pnpm/bin/pnpm.cjs');
    expect(detectPackageManager()).toBe('pnpm');
  });
});

describe('getPackageManagerCommands', () => {
  it('bun: install generates "bun add <pkg>"', () => {
    const cmds = getPackageManagerCommands('bun');
    expect(cmds.install('react')).toBe('bun add react');
    expect(cmds.install()).toBe('bun install');
  });

  it('bun: run generates "bun run <script>"', () => {
    const cmds = getPackageManagerCommands('bun');
    expect(cmds.run('build')).toBe('bun run build');
  });

  it('bun: x generates "bunx <cmd>"', () => {
    const cmds = getPackageManagerCommands('bun');
    expect(cmds.x('create-react-app')).toBe('bunx create-react-app');
  });

  it('npm: install generates "npm install <pkg>"', () => {
    const cmds = getPackageManagerCommands('npm');
    expect(cmds.install('react')).toBe('npm install react');
    expect(cmds.install()).toBe('npm install');
  });

  it('pnpm: install generates "pnpm add <pkg>"', () => {
    const cmds = getPackageManagerCommands('pnpm');
    expect(cmds.install('react')).toBe('pnpm add react');
    expect(cmds.x('create-react-app')).toBe('pnpm dlx create-react-app');
  });

  it('yarn: install generates "yarn add <pkg>"', () => {
    const cmds = getPackageManagerCommands('yarn');
    expect(cmds.install('react')).toBe('yarn add react');
    expect(cmds.x('create-react-app')).toBe('yarn dlx create-react-app');
  });
});

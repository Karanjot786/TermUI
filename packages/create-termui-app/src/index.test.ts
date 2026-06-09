import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import * as prompts from './prompts.js';
import * as templates from './templates.js';
import * as addModule from './commands/add.js';

const createProjectFiles = [
  { path: 'package.json', content: '{ }' },
];

describe('CLI integration', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `termui-index-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('routes add command to runAddCommand and returns early', async () => {
    const addSpy = vi.spyOn(addModule, 'runAddCommand').mockResolvedValue(undefined);
    const indexModule = await import('./index');

    await indexModule.runCli(['add', 'Badge', '--dry-run', '--dir', 'src/shared', '--yes']);

    expect(addSpy).toHaveBeenCalledWith({
      component: 'Badge',
      dir: 'src/shared',
      dryRun: true,
      yes: true,
    });
  });

  it('preserves project scaffold flow for non-add invocations', async () => {
    const addSpy = vi.spyOn(addModule, 'runAddCommand').mockResolvedValue(undefined);
    vi.spyOn(prompts, 'textPrompt').mockResolvedValue('my-app');
    vi.spyOn(prompts, 'selectPrompt').mockResolvedValue(0);
    vi.spyOn(prompts, 'multiSelectPrompt').mockResolvedValue([false, false, true]);
    vi.spyOn(templates, 'generateProject').mockReturnValue(createProjectFiles as any);

    const indexModule = await import('./index');
    await indexModule.runCli(['my-app']);

    expect(existsSync(join(tempDir, 'my-app', 'package.json'))).toBe(true);
    expect(readFileSync(join(tempDir, 'my-app', 'package.json'), 'utf-8')).toBe('{ }');
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('rejects an unsafe project name before generating or writing files', async () => {
    const generateSpy = vi.spyOn(templates, 'generateProject');
    const indexModule = await import('./index');
    const unsafeName = `unsafe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const unsafePath = join(tempDir, '..', unsafeName);

    await expect(indexModule.runCli([`../${unsafeName}`])).rejects.toThrow(
      'Project name cannot contain path separators or traversal sequences',
    );

    expect(generateSpy).not.toHaveBeenCalled();
    expect(existsSync(unsafePath)).toBe(false);
  });
});

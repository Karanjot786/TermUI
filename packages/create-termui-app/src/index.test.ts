import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
} from 'node:fs';
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
    vi.spyOn(templates, 'generateProject').mockReturnValue(createProjectFiles);

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

  it('scaffolds project in non-interactive mode without calling prompts', async () => {
    const addSpy = vi.spyOn(addModule, 'runAddCommand').mockResolvedValue(undefined);
    const textPromptSpy = vi.spyOn(prompts, 'textPrompt');
    const selectPromptSpy = vi.spyOn(prompts, 'selectPrompt');
    const multiSelectPromptSpy = vi.spyOn(prompts, 'multiSelectPrompt');
    const generateSpy = vi.spyOn(templates, 'generateProject').mockReturnValue(createProjectFiles);

    const indexModule = await import('./index');
    await indexModule.runCli(['non-interactive-app', '--yes']);

    expect(textPromptSpy).not.toHaveBeenCalled();
    expect(selectPromptSpy).not.toHaveBeenCalled();
    expect(multiSelectPromptSpy).not.toHaveBeenCalled();
    expect(generateSpy).toHaveBeenCalledWith({
      name: 'non-interactive-app',
      template: 'empty',
      theme: 'default',
      features: {
        router: false,
        dataProviders: false,
        hotReload: true,
      },
    });

    expect(existsSync(join(tempDir, 'non-interactive-app', 'package.json'))).toBe(true);
    expect(addSpy).not.toHaveBeenCalled();
  });
  it('prints version and exits before scaffolding', async () => {
    const outputSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const generateSpy = vi.spyOn(templates, 'generateProject');

    const indexModule = await import('./index');

    await indexModule.runCli(['--version']);

    expect(outputSpy).toHaveBeenCalledWith(expect.any(String));
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('rejects non-interactive scaffold into a non-empty directory without --force', async () => {
    const existingDir = join(tempDir, 'existing-app');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'package.json'), '{ "name": "keep-me" }', 'utf-8');

    const generateSpy = vi.spyOn(templates, 'generateProject');
    const indexModule = await import('./index');

    await expect(indexModule.runCli(['existing-app', '--yes'])).rejects.toThrow(
      'Directory "existing-app" is not empty. Re-run with --force to overwrite.',
    );

    expect(generateSpy).not.toHaveBeenCalled();
    expect(readFileSync(join(existingDir, 'package.json'), 'utf-8')).toBe('{ "name": "keep-me" }');
  });

  it('overwrites a non-empty directory when --force is passed', async () => {
    const existingDir = join(tempDir, 'force-app');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'package.json'), '{ "name": "keep-me" }', 'utf-8');

    vi.spyOn(templates, 'generateProject').mockReturnValue(createProjectFiles);
    const indexModule = await import('./index');

    await indexModule.runCli(['force-app', '--yes', '--force']);

    expect(readFileSync(join(existingDir, 'package.json'), 'utf-8')).toBe('{ }');
  });

  it('allows scaffolding into an empty existing directory without --force', async () => {
    const emptyDir = join(tempDir, 'empty-app');
    mkdirSync(emptyDir, { recursive: true });

    vi.spyOn(templates, 'generateProject').mockReturnValue(createProjectFiles);
    const indexModule = await import('./index');

    await indexModule.runCli(['empty-app', '--yes']);

    expect(existsSync(join(emptyDir, 'package.json'))).toBe(true);
  });

  it('aborts interactive overwrite when the user declines', async () => {
    const existingDir = join(tempDir, 'interactive-app');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'package.json'), '{ "name": "keep-me" }', 'utf-8');

    vi.spyOn(prompts, 'selectPrompt').mockResolvedValue(0);
    vi.spyOn(prompts, 'multiSelectPrompt').mockResolvedValue([false, false, true]);
    vi.spyOn(prompts, 'confirmPrompt').mockResolvedValue(false);
    const generateSpy = vi.spyOn(templates, 'generateProject');

    const indexModule = await import('./index');
    await indexModule.runCli(['interactive-app']);

    expect(generateSpy).not.toHaveBeenCalled();
    expect(readFileSync(join(existingDir, 'package.json'), 'utf-8')).toBe('{ "name": "keep-me" }');
  });

  it('restores overwritten files when a later write fails', async () => {
    const existingDir = join(tempDir, 'rollback-app');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'package.json'), '{ "name": "keep-me" }', 'utf-8');
    // A file named `src` makes mkdirSync(src/) fail after package.json is overwritten.
    writeFileSync(join(existingDir, 'src'), 'not-a-directory', 'utf-8');

    vi.spyOn(templates, 'generateProject').mockReturnValue([
      { path: 'package.json', content: '{ "name": "new" }' },
      { path: 'src/index.tsx', content: 'export {}' },
    ]);

    const indexModule = await import('./index');

    await expect(indexModule.runCli(['rollback-app', '--yes', '--force'])).rejects.toThrow();

    expect(readFileSync(join(existingDir, 'package.json'), 'utf-8')).toBe('{ "name": "keep-me" }');
    expect(readFileSync(join(existingDir, 'src'), 'utf-8')).toBe('not-a-directory');
  });

  it('restores binary files byte-for-byte and removes created directories on rollback', async () => {
    const existingDir = join(tempDir, 'binary-rollback-app');
    const original = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, 'asset.bin'), original);
    writeFileSync(join(existingDir, 'blocked'), 'not-a-directory', 'utf-8');

    vi.spyOn(templates, 'generateProject').mockReturnValue([
      { path: 'asset.bin', content: 'replacement' },
      { path: 'nested/created.txt', content: 'created' },
      { path: 'blocked/child.txt', content: 'fails' },
    ]);

    const indexModule = await import('./index');
    await expect(indexModule.runCli(['binary-rollback-app', '--yes', '--force'])).rejects.toThrow();

    expect(readFileSync(join(existingDir, 'asset.bin'))).toEqual(original);
    expect(existsSync(join(existingDir, 'nested'))).toBe(false);
  });

  it('rejects generated paths that traverse a symbolic link', async () => {
    const existingDir = join(tempDir, 'symlink-app');
    const outsideDir = join(tempDir, 'outside');
    mkdirSync(existingDir, { recursive: true });
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(join(outsideDir, 'keep.txt'), 'keep', 'utf-8');
    symlinkSync(outsideDir, join(existingDir, 'linked'), 'dir');

    vi.spyOn(templates, 'generateProject').mockReturnValue([
      { path: 'linked/keep.txt', content: 'overwritten' },
    ]);

    const indexModule = await import('./index');
    await expect(indexModule.runCli(['symlink-app', '--yes', '--force'])).rejects.toThrow(
      'Refusing to write through symbolic link',
    );

    expect(readFileSync(join(outsideDir, 'keep.txt'), 'utf-8')).toBe('keep');
  });
});

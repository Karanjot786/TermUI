// ─────────────────────────────────────────────────────
// create-termui-app — Interactive CLI scaffolding tool
// ─────────────────────────────────────────────────────

import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  lstatSync,
  rmdirSync,
} from 'node:fs';
import { getBuiltinThemeNames } from '@termuijs/tss';
import { textPrompt, selectPrompt, multiSelectPrompt, confirmPrompt } from './prompts.js';
import { generateProject, type ProjectConfig } from './templates.js';
import { parseArgs, isNonInteractive, TEMPLATE_KEYS, type CliArgs } from './args.js';
import { runAddCommand } from './commands/add.js';
import { validateProjectName, validateResolvedPath } from "./validate.js";

const TEMPLATES = [
  'Empty (start from scratch)',
  'Dashboard (real-time data)',
  'Interactive Tool (forms, prompts)',
  'CLI Wrapper (wrap existing CLI)',
  'CLI Tool (minimal: box + text + useKeymap)',
  'File Manager',
  'AI Assistant (Claude + mock mode)',
  'Form Wizard',
];

const packageVersion = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../package.json', import.meta.url),
    ),
    'utf8',
  ),
).version as string;

const FEATURES = ['Screen Router', 'Data Providers', 'Hot Reload'];
const report = (message = ''): void => {
  process.stdout.write(`${message}\n`);
};

export async function runCli(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.version) {
    report(packageVersion);
    return;
  }

  if (args.command === 'add') {
    await runAddCommand({
      component: args.component ?? '',
      dir: args.dir,
      dryRun: args.dryRun,
      yes: args.yes,
    });
    return;
  }

  await runProjectScaffold(args);
}

async function runProjectScaffold(args: CliArgs): Promise<void> {
  report();
  report('  ┌──────────────────────────────────┐');
  report('  │       create-termui-app           │');
  report('  │   The React/Next.js for CLI apps  │');
  report('  └──────────────────────────────────┘');
  report();

  const nonInteractive = isNonInteractive(args);

  // ── Get project name from args or prompt ──
  let projectName = args.name;
  if (!projectName) {
    if (nonInteractive) {
      projectName = 'my-termui-app';
    } else {
      projectName = await textPrompt('Project name', 'my-termui-app');
    }
  }
  projectName = validateProjectName(projectName);
  validateResolvedPath(process.cwd(), projectName);

  // ── Template selection ──
  let template: typeof TEMPLATE_KEYS[number];
  if (args.template) {
    const templateIdx = TEMPLATE_KEYS.indexOf(args.template as typeof TEMPLATE_KEYS[number]);
    template = TEMPLATE_KEYS[templateIdx >= 0 ? templateIdx : 0];
  } else if (nonInteractive) {
    template = 'empty';
  } else {
    const templateIdx = await selectPrompt('What kind of app?', TEMPLATES);
    template = TEMPLATE_KEYS[templateIdx >= 0 ? templateIdx : 0];
  }

  // ── Theme selection ──
  const themes = getBuiltinThemeNames();
  let theme: string;
  if (args.theme) {
    const themeIdx = themes.indexOf(args.theme);
    theme = themes[themeIdx >= 0 ? themeIdx : 0];
  } else if (nonInteractive) {
    theme = themes[0] || 'default';
  } else {
    const themeIdx = await selectPrompt('Choose a theme', themes.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    theme = themes[themeIdx >= 0 ? themeIdx : 0];
  }

  // ── Feature selection ──
  const featureDefaults = [false, template === 'dashboard', true]; // Router off, Data on for dashboard, HotReload on
  const featureFlags = nonInteractive
    ? featureDefaults
    : await multiSelectPrompt('Features to include', FEATURES, featureDefaults);

  const config: ProjectConfig = {
    name: projectName,
    template,
    theme,
    features: {
      router: featureFlags[0],
      dataProviders: featureFlags[1],
      hotReload: featureFlags[2],
    },
  };

  // ── Generate project ──
  const projectDir = resolve(process.cwd(), projectName);
  if (existsSync(projectDir) && isNonEmptyDirectory(projectDir)) {
    if (args.force) {
      report(`\n  ⚠  Directory "${projectName}" is not empty. Overwriting with --force.\n`);
    } else if (nonInteractive) {
      throw new Error(
        `Directory "${projectName}" is not empty. Re-run with --force to overwrite.`,
      );
    } else {
      const overwrite = await confirmPrompt(
        `Directory "${projectName}" is not empty. Overwrite existing files?`,
        false,
      );
      if (!overwrite) {
        report('\n  Aborted. Existing files were left unchanged.\n');
        return;
      }
    }
  }

  report(`\n  Creating ${projectName}...`);

  const files = generateProject(config);
  writeProjectFiles(projectDir, files);

  report();
  report('  ┌──────────────────────────────────┐');
  report('  │  ✅ Project created successfully!  │');
  report('  └──────────────────────────────────┘');
  report();
  report('  Next steps:');
  report(`    cd ${projectName}`);
  report('    bun install');
  report('    bun run dev');
  report();
}

function isNonEmptyDirectory(dir: string): boolean {
  try {
    return readdirSync(dir).some(entry => entry !== '.git');
  } catch {
    return true;
  }
}

function assertNoSymbolicLinks(projectDir: string, targetPath: string): void {
  let current = targetPath;

  while (true) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing to write through symbolic link: ${current}`);
    }
    if (current === projectDir) return;

    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function createDirectories(
  projectDir: string,
  dir: string,
  createdDirectories: string[],
): void {
  const missing: string[] = [];
  let current = dir;

  while (!existsSync(current)) {
    missing.push(current);
    if (current === projectDir) break;
    current = dirname(current);
  }

  if (existsSync(current)) {
    const entry = lstatSync(current);
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      throw new Error(`Refusing to create files below non-directory path: ${current}`);
    }
  }

  for (const path of missing.reverse()) {
    try {
      mkdirSync(path);
      createdDirectories.push(path);
    } catch (error) {
      // Another process may have created the directory after the existence check.
      if (!existsSync(path)) throw error;
      const entry = lstatSync(path);
      if (entry.isSymbolicLink() || !entry.isDirectory()) throw error;
    }
  }
}

function writeProjectFiles(
  projectDir: string,
  files: Array<{ path: string; content: string }>,
): void {
  const backups = new Map<string, Buffer | null>();
  const attemptedWrites: string[] = [];
  const attemptedPaths = new Set<string>();
  const createdDirectories: string[] = [];

  try {
    assertNoSymbolicLinks(projectDir, projectDir);

    for (const file of files) {
      const fullPath = join(projectDir, file.path);
      const dir = dirname(fullPath);

      assertNoSymbolicLinks(projectDir, fullPath);
      if (!backups.has(fullPath)) {
        backups.set(fullPath, existsSync(fullPath) ? readFileSync(fullPath) : null);
      }

      createDirectories(projectDir, dir, createdDirectories);
      if (!attemptedPaths.has(fullPath)) {
        attemptedPaths.add(fullPath);
        attemptedWrites.push(fullPath);
      }
      writeFileSync(fullPath, file.content, 'utf-8');
      report(`    ✓ ${file.path}`);
    }
  } catch (error) {
    for (const path of attemptedWrites.reverse()) {
      const previous = backups.get(path);
      if (previous === null || previous === undefined) {
        try {
          unlinkSync(path);
        } catch {
          // Best-effort rollback of newly created files.
        }
      } else {
        try {
          writeFileSync(path, previous);
        } catch {
          // Best-effort restore of overwritten content.
        }
      }
    }

    for (const path of createdDirectories.reverse()) {
      try {
        // Only empty directories created by this invocation are removed. Any
        // concurrent content makes rmdirSync fail and is preserved.
        rmdirSync(path);
      } catch {
        // Best-effort rollback of directories created by this invocation.
      }
    }

    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}


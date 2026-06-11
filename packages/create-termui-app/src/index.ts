// ─────────────────────────────────────────────────────
// create-termui-app — Interactive CLI scaffolding tool
// ─────────────────────────────────────────────────────

import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { getBuiltinThemeNames } from '@termuijs/tss';
import { textPrompt, selectPrompt, multiSelectPrompt } from './prompts.js';
import { generateProject, type ProjectConfig } from './templates.js';
import { parseArgs, isNonInteractive, type CliArgs } from './args.js';
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

const TEMPLATE_KEYS = [
  'empty',
  'dashboard',
  'interactive-tool',
  'cli-wrapper',
  'cli-tool',
  'file-manager',
  'ai-assistant',
  'form-wizard',
] as const;
const FEATURES = ['Screen Router', 'Data Providers', 'Hot Reload'];

export async function runCli(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

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
  console.log();
  console.log('  ┌──────────────────────────────────┐');
  console.log('  │       create-termui-app           │');
  console.log('  │   The React/Next.js for CLI apps  │');
  console.log('  └──────────────────────────────────┘');
  console.log();

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
  if (existsSync(projectDir)) {
    console.log(`\n  ⚠  Directory "${projectName}" already exists. Files may be overwritten.\n`);
  }

  console.log(`\n  Creating ${projectName}...`);

  const files = generateProject(config);

  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    const dir = dirname(fullPath);

    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, file.content, 'utf-8');

    console.log(`    ✓ ${file.path}`);
  }

  console.log();
  console.log('  ┌──────────────────────────────────┐');
  console.log('  │  ✅ Project created successfully!  │');
  console.log('  └──────────────────────────────────┘');
  console.log();
  console.log(`  Next steps:`);
  console.log(`    cd ${projectName}`);
  console.log(`    bun install`);
  console.log(`    bun run dev`);
  console.log();
}

if (import.meta.main) {
  runCli(process.argv.slice(2)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// create-termui-app â€” Interactive CLI scaffolding tool
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { getBuiltinThemeNames } from '@termuijs/tss';
import { textPrompt, selectPrompt, multiSelectPrompt } from './prompts.js';
import { generateProject, type ProjectConfig } from './templates.js';

const TEMPLATES = [
  'Empty (start from scratch)',
  'Dashboard (real-time data)',
  'Interactive Tool (forms, prompts)',
  'CLI Wrapper (wrap existing CLI)',
  'CLI Tool (minimal: box + text + useKeymap)',
  'File Manager',
  'AI Assistant (Claude + mock mode)',
];

const TEMPLATE_KEYS = [
  'empty',
  'dashboard',
  'interactive-tool',
  'cli-wrapper',
  'cli-tool',
  'file-manager',
  'ai-assistant',
] as const;
const FEATURES = ['Screen Router', 'Data Providers', 'Hot Reload'];

async function main() {
    console.log();
    console.log('  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”');
    console.log('  â”‚       create-termui-app           â”‚');
    console.log('  â”‚   The React/Next.js for CLI apps  â”‚');
    console.log('  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜');
    console.log();

    // â”€â”€ Get project name from args or prompt â”€â”€
    let projectName = process.argv[2];
    if (!projectName) {
        projectName = await textPrompt('Project name', 'my-termui-app');
    }

    // â”€â”€ Template selection â”€â”€
    const templateIdx = await selectPrompt('What kind of app?', TEMPLATES);
    const template = TEMPLATE_KEYS[templateIdx];

    // â”€â”€ Theme selection â”€â”€
    const themes = getBuiltinThemeNames();
    const themeIdx = await selectPrompt('Choose a theme', themes.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    const theme = themes[themeIdx];

    // â”€â”€ Feature selection â”€â”€
    const featureDefaults = [false, template === 'dashboard', true]; // Router off, Data on for dashboard, HotReload on
    const featureFlags = await multiSelectPrompt('Features to include', FEATURES, featureDefaults);

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

    // â”€â”€ Generate project â”€â”€
    const projectDir = resolve(process.cwd(), projectName);
    if (existsSync(projectDir)) {
        console.log(`\n  âš   Directory "${projectName}" already exists. Files may be overwritten.\n`);
    }

    console.log(`\n  Creating ${projectName}...`);

    const files = generateProject(config);

    for (const file of files) {
        const fullPath = join(projectDir, file.path);
        const dir = fullPath.substring(0, Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\')));
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullPath, file.content, 'utf-8');
        console.log(`    âœ“ ${file.path}`);
    }

    console.log();
    console.log('  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”');
    console.log('  â”‚  âœ… Project created successfully!  â”‚');
    console.log('  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜');
    console.log();
    console.log(`  Next steps:`);
    console.log(`    cd ${projectName}`);
    console.log(`    bun install`);
    console.log(`    bun run dev`);
    console.log();
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});



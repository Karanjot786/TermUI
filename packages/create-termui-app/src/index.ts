// ─────────────────────────────────────────────────────
// create-termui-app — Interactive CLI scaffolding tool
// ─────────────────────────────────────────────────────

import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { getBuiltinThemeNames } from '@termuijs/tss';
import { textPrompt, selectPrompt, multiSelectPrompt } from './prompts.js';
import { generateProject, type ProjectConfig } from './templates.js';

const TEMPLATES = ['Empty (start from scratch)', 'Dashboard (real-time data)', 'Interactive Tool (forms, prompts)', 'CLI Wrapper (wrap existing CLI)', 'CLI Tool (minimal: box + text + useKeymap)'];
const TEMPLATE_KEYS = ['empty', 'dashboard', 'interactive-tool', 'cli-wrapper', 'cli-tool'] as const;
const FEATURES = ['Screen Router', 'Data Providers', 'Hot Reload'];

async function main() {
    console.log();
    console.log('  ┌──────────────────────────────────┐');
    console.log('  │       create-termui-app           │');
    console.log('  │   The React/Next.js for CLI apps  │');
    console.log('  └──────────────────────────────────┘');
    console.log();

    // ── Get project name from args or prompt ──
    let projectName = process.argv[2];
    if (!projectName) {
        projectName = await textPrompt('Project name', 'my-termui-app');
    }

    // ── Template selection ──
    const templateIdx = await selectPrompt('What kind of app?', TEMPLATES);
    const template = TEMPLATE_KEYS[templateIdx];

    // ── Theme selection ──
    const themes = getBuiltinThemeNames();
    const themeIdx = await selectPrompt('Choose a theme', themes.map(t => t.charAt(0).toUpperCase() + t.slice(1)));
    const theme = themes[themeIdx];

    // ── Feature selection ──
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

    // ── Generate project ──
    const projectDir = resolve(process.cwd(), projectName);
    if (existsSync(projectDir)) {
        console.log(`\n  ⚠  Directory "${projectName}" already exists. Files may be overwritten.\n`);
    }

    console.log(`\n  Creating ${projectName}...`);

    const files = generateProject(config);

    for (const file of files) {
        const fullPath = join(projectDir, file.path);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
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

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

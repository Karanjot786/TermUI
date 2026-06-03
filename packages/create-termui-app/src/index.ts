// ─────────────────────────────────────────────────────
// create-termui-app — Interactive CLI scaffolding tool
// ─────────────────────────────────────────────────────

import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { getBuiltinThemeNames } from "@termuijs/tss";
import {
    textPrompt,
    selectPrompt,
    multiSelectPrompt,
} from "./prompts.js";
import { generateProject, type ProjectConfig } from "./templates.js";
import { parseArgs, isNonInteractive } from "./args.js";

const TEMPLATES = [

    "Empty (start from scratch)",
    "Dashboard (real-time data)",
    "Interactive Tool (forms, prompts)",
    "CLI Wrapper (wrap existing CLI)",
    "CLI Tool (minimal: box + text + useKeymap)",
    "File Manager",
];

const TEMPLATE_KEYS = [
    "empty",
    "dashboard",
    "interactive-tool",
    "cli-wrapper",
    "cli-tool",
    "file-manager",

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

const FEATURES = ["Screen Router", "Data Providers", "Hot Reload"];

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const themes = getBuiltinThemeNames();

    let projectName = args.name;
    let template: string;
    let theme: string;
    let featureFlags: boolean[] = [false, false, true];

    console.log();
    console.log("  ┌──────────────────────────────────┐");
    console.log("  │       create-termui-app           │");
    console.log("  │   The React/Next.js for CLI apps  │");
    console.log("  └──────────────────────────────────┘");
    console.log();

    // ───────── CI MODE ─────────
    if (isNonInteractive(args)) {
        projectName ??= "my-termui-app";

        // validate template
        if (args.template && !TEMPLATE_KEYS.includes(args.template as any)) {
            throw new Error(
                `Invalid template "${args.template}". Valid: ${TEMPLATE_KEYS.join(", ")}`
            );
        }

        // validate theme
        if (args.theme && !themes.includes(args.theme)) {
            throw new Error(
                `Invalid theme "${args.theme}". Valid themes: ${themes.join(", ")}`
            );
        }

        template = args.template ?? "empty";
        theme = args.theme ?? themes[0];

        // IMPORTANT: correct feature behavior for CI
        featureFlags = [
            false,
            template === "dashboard",
            true,
        ];

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

        const projectDir = resolve(process.cwd(), projectName);

        const files = generateProject(config);

        for (const file of files) {
            const fullPath = join(projectDir, file.path);
            const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
            mkdirSync(dir, { recursive: true });
            writeFileSync(fullPath, file.content, "utf-8");
            console.log(`    ✓ ${file.path}`);
        }

        console.log();
        console.log("  ┌──────────────────────────────────┐");
        console.log("  │  ✅ Project created successfully! │");
        console.log("  └──────────────────────────────────┘");

        return;
    }
    // ───────── INTERACTIVE MODE ─────────

    if (!projectName) {
        projectName = await textPrompt("Project name", "my-termui-app");
    }

    const templateIdx = await selectPrompt("What kind of app?", TEMPLATES);
    template = TEMPLATE_KEYS[templateIdx];

    const themesList = themes.map((t) =>
        t.charAt(0).toUpperCase() + t.slice(1)
    );

    const themeIdx = await selectPrompt("Choose a theme", themesList);
    theme = themes[themeIdx];

    featureFlags = await multiSelectPrompt(
        "Features to include",
        FEATURES,
        [false, template === "dashboard", true]
    );

    const config: ProjectConfig = {
        name: projectName!,
        template,
        theme,
        features: {
            router: featureFlags[0],
            dataProviders: featureFlags[1],
            hotReload: featureFlags[2],
        },
    };

    const projectDir = resolve(process.cwd(), projectName!);

    const files = generateProject(config);


    for (const file of files) {
        const fullPath = join(projectDir, file.path);
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullPath, file.content, "utf-8");
        console.log(`    ✓ ${file.path}`);
    }

   for (const file of files) {


    const fullPath = join(projectDir, file.path);
    

    const dir = fullPath.substring(
        0,
        Math.max(fullPath.lastIndexOf('/'), fullPath.lastIndexOf('\\'))
    );


    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, file.content, 'utf-8');

    console.log(`    ✓ ${file.path}`);
}


    console.log();
    console.log("  ┌──────────────────────────────────┐");
    console.log("  │  ✅ Project created successfully! │");
    console.log("  └──────────────────────────────────┘");
}

main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);

});

});




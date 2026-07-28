import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { CliArgs } from '../args.js';
import { resolveComponent } from '../registry.js';
import { detectPackageManager, installArgs } from '../pm.js';

export interface ComponentFilePlan {
    path: string;
    action: 'create' | 'overwrite';
}

export function planComponentFiles(
    destRoot: string,
    slug: string,
    files: Array<{ path: string; content: string }>,
): ComponentFilePlan[] {
    const componentRoot = resolve(destRoot, slug);
    return files.map((file) => {
        const dest = resolve(componentRoot, normalizeComponentPath(slug, file.path));
        const rel = relative(componentRoot, dest);
        if (rel.startsWith('..') || isAbsolute(rel)) {
            throw new Error(`Refusing to write ${dest}: path is outside ${componentRoot}`);
        }

        return {
            path: dest,
            action: existsSync(dest) ? 'overwrite' : 'create',
        };
    });
}

/** Write a component's files under <destRoot>/<slug>/, refusing path escapes. */
export function writeComponentFiles(
    destRoot: string,
    slug: string,
    files: Array<{ path: string; content: string }>,
    opts: { dryRun: boolean },
): string[] {
    const plan = planComponentFiles(destRoot, slug, files);
    for (let i = 0; i < files.length; i++) {
        const dest = plan[i]!.path;
        if (opts.dryRun) continue;
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, files[i]!.content, 'utf-8');
    }
    return plan.map(entry => entry.path);
}

function normalizeComponentPath(slug: string, filePath: string): string {
    const prefix = `registry/components/${slug}/`;
    if (filePath.startsWith(prefix)) {
        return filePath.slice(prefix.length);
    }
    return filePath;
}

export async function runAdd(args: CliArgs): Promise<void> {
    const destRoot = resolve(process.cwd(), args.dir ?? 'src/components');
    const allDeps = new Set<string>();

    for (const slug of args.components) {
        const comp = await resolveComponent(slug);
        const componentDir = join(destRoot, slug);

        if (existsSync(componentDir) && !args.yes && !args.dryRun) {
            throw new Error(`${componentDir} already exists. Re-run with --yes to overwrite.`);
        }

        const plan = planComponentFiles(destRoot, slug, comp.files);
        const written = writeComponentFiles(destRoot, slug, comp.files, { dryRun: args.dryRun });
        for (const dep of comp.dependencies) allDeps.add(dep);

        console.log(`\n  ${args.dryRun ? 'would add' : 'added'} ${comp.name}:`);
        for (const w of written) {
            const action = plan.find(entry => entry.path === w)?.action ?? 'create';
            const marker = args.dryRun ? (action === 'overwrite' ? '~' : '+') : '+';
            const label = args.dryRun ? `${action} ` : '';
            console.log(`    ${marker} ${label}${relative(process.cwd(), w)}`);
        }
    }

    const deps = [...allDeps].sort();
    if (deps.length === 0) return;

    const pm = detectPackageManager();
    if (args.dryRun) {
        console.log(`\n  would install: ${pm} ${installArgs(pm, deps).join(' ')}`);
        return;
    }
    console.log(`\n  installing: ${deps.join(', ')} (${pm})`);
    execFileSync(pm, installArgs(pm, deps), { stdio: 'inherit' });
}

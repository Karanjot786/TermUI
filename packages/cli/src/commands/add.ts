import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { CliArgs } from '../args.js';
import { resolveComponent } from '../registry.js';
import { detectPackageManager, installArgs } from '../pm.js';

/** Write a component's files under <destRoot>/<slug>/, refusing path escapes. */
export function writeComponentFiles(
    destRoot: string,
    slug: string,
    files: Array<{ path: string; content: string }>,
    opts: { dryRun: boolean },
): string[] {
    const componentRoot = resolve(destRoot, slug);
    const written: string[] = [];
    for (const file of files) {
        const dest = resolve(componentRoot, file.path);
        const rel = relative(componentRoot, dest);
        if (rel.startsWith('..') || isAbsolute(rel)) {
            throw new Error(`Refusing to write ${dest}: path is outside ${componentRoot}`);
        }
        written.push(dest);
        if (opts.dryRun) continue;
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, file.content, 'utf-8');
    }
    return written;
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

        const written = writeComponentFiles(destRoot, slug, comp.files, { dryRun: args.dryRun });
        for (const dep of comp.dependencies) allDeps.add(dep);

        console.log(`\n  ${args.dryRun ? 'would add' : 'added'} ${comp.name}:`);
        for (const w of written) console.log(`    ${args.dryRun ? '·' : '✓'} ${relative(process.cwd(), w)}`);
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

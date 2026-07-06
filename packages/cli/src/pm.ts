export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

/** Detect the package manager from npm_config_user_agent / exec path, default npm. */
export function detectPackageManager(): PackageManager {
    const agent = process.env.npm_config_user_agent ?? '';
    if (agent.startsWith('bun/')) return 'bun';
    if (agent.startsWith('pnpm/')) return 'pnpm';
    if (agent.startsWith('yarn/')) return 'yarn';
    if (agent.startsWith('npm/')) return 'npm';
    const exec = process.env.npm_execpath ?? '';
    if (exec.includes('pnpm')) return 'pnpm';
    if (exec.includes('yarn')) return 'yarn';
    if (exec.includes('bun')) return 'bun';
    return 'npm';
}

/** Build the install argv for a package manager. bun/yarn use `add`; npm/pnpm use `install`. */
export function installArgs(pm: PackageManager, deps: string[]): string[] {
    const verb = pm === 'yarn' || pm === 'bun' ? 'add' : 'install';
    return [verb, ...deps];
}

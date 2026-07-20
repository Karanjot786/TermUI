import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export async function runInit(): Promise<void> {
    const cwd = process.cwd();

    // 1. tsconfig.json
    const tsconfigPath = resolve(cwd, 'tsconfig.json');
    const tsconfigContent = JSON.stringify({
        compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            jsxImportSource: '@termuijs/jsx',
            strict: true,
            esModuleInterop: true,
            outDir: 'dist',
            rootDir: 'src',
        },
        include: ['src'],
    }, null, 2) + '\n';

    if (!existsSync(tsconfigPath)) {
        writeFileSync(tsconfigPath, tsconfigContent, 'utf-8');
        console.log('  + tsconfig.json');
    } else {
        console.log('  - tsconfig.json (already exists)');
    }

    // 2. src/index.tsx (Basic layout)
    const indexPath = resolve(cwd, 'src/index.tsx');
    const indexContent = `/** @jsxImportSource @termuijs/jsx */
import { App } from '@termuijs/core';
import { Text } from '@termuijs/widgets';

function MainApp() {
    return <Text>Welcome to TermUI!</Text>;
}

const app = new App(<MainApp />, { fullscreen: true, mouse: true });
app.mount();
`;

    if (!existsSync(indexPath)) {
        mkdirSync(dirname(indexPath), { recursive: true });
        writeFileSync(indexPath, indexContent, 'utf-8');
        console.log('  + src/index.tsx');
    } else {
        console.log('  - src/index.tsx (already exists)');
    }

    // 3. package.json dependencies update (if package.json exists)
    const packageJsonPath = resolve(cwd, 'package.json');
    if (existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            let modified = false;

            if (!pkg.dependencies) {
                pkg.dependencies = {};
            }

            const deps = ['@termuijs/core', '@termuijs/widgets', '@termuijs/jsx'];
            for (const dep of deps) {
                if (!pkg.dependencies[dep]) {
                    pkg.dependencies[dep] = 'latest';
                    modified = true;
                }
            }

            if (modified) {
                writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
                console.log('  + package.json (dependencies updated)');
            } else {
                console.log('  - package.json (dependencies already up to date)');
            }
        } catch (err) {
            console.error('  ✖ failed to update package.json: invalid JSON');
        }
    } else {
        // Create basic package.json if not present
        const basicPkg = {
            name: 'termui-app',
            version: '0.1.0',
            type: 'module',
            scripts: {
                dev: 'bun --watch src/index.tsx',
                build: 'tsup src/index.tsx --format esm',
                start: 'bun dist/index.js',
            },
            dependencies: {
                '@termuijs/core': 'latest',
                '@termuijs/widgets': 'latest',
                '@termuijs/jsx': 'latest',
            },
            devDependencies: {
                '@types/bun': 'latest',
            },
        };
        writeFileSync(packageJsonPath, JSON.stringify(basicPkg, null, 2) + '\n', 'utf-8');
        console.log('  + package.json');
    }
}

// ─────────────────────────────────────────────────────
// Project Templates — generates files for new apps
// ─────────────────────────────────────────────────────

import { getBuiltinTheme } from '@termuijs/tss';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = resolve(__dirname, '../templates');

export interface ProjectConfig {
    name: string;
    template:
    | 'empty'
    | 'dashboard'
    | 'interactive-tool'
    | 'cli-wrapper'
    | 'cli-tool'
    | 'file-manager'
    | 'ai-assistant'
    | 'form-wizard';
    theme: string;
    features: {
        router: boolean;
        dataProviders: boolean;
        hotReload: boolean;
    };
}

export interface GeneratedFile {
    path: string;
    content: string;
}

export function generateProject(config: ProjectConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // ── package.json ──
    files.push({
        path: 'package.json',
        content: createPackageJson(config),
    });

    // ── tsconfig.json ──
    files.push({
        path: 'tsconfig.json',
        content: JSON.stringify({
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
        }, null, 2) + '\n',
    });

    // ── termui.config.ts ──
    files.push({
        path: 'termui.config.ts',
        content: `import { defineConfig } from '@termuijs/core';

export default defineConfig({
    theme: '${config.theme}',
    ${config.features.hotReload ? "hotReload: true," : ''}
    ${config.features.router ? "router: { dir: './screens' }," : ''}
});
`,
    });

    // ── Theme file ──
    const themeSrc = getBuiltinTheme(config.theme);
    if (themeSrc) {
        files.push({ path: `themes/${config.theme}.tss`, content: themeSrc.trim() + '\n' });
    }

    // ── Template-specific files ──
    switch (config.template) {
        case 'dashboard':
            files.push(...generateDashboardTemplate(config));
            break;
        case 'interactive-tool':
            files.push(...generateInteractiveTemplate(config));
            break;
        case 'cli-wrapper':
            files.push(...generateCliWrapperTemplate(config));
            break;
        case 'cli-tool':
            files.push(...generateCliToolTemplate(config));
            break;

        case 'ai-assistant':
            files.push(...generateAiAssistantTemplate(config));
            break;

        case 'file-manager':
            files.push(...generateFileManagerTemplate(config));
            break;
        case 'form-wizard':
            files.push(...generateFormWizardTemplate(config));
            break;

        default:
            files.push(...generateEmptyTemplate(config));
    }

    return files;
}

function createPackageJson(config: ProjectConfig): string {
    const isFileManager = config.template === 'file-manager';
    const isAiAssistant = config.template === 'ai-assistant';
    const isRestClient = config.template === 'rest-client';
    return JSON.stringify({
        name: config.name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
            dev: 'bun --watch src/index.tsx',
            build: 'tsup src/index.tsx --format esm',
            start: 'bun dist/index.js',
        },
        dependencies: isAiAssistant
            ? {
                '@termuijs/core': 'latest',
                '@termuijs/widgets': 'latest',
                '@termuijs/ui': 'latest',
                '@termuijs/jsx': 'latest',
                '@termuijs/tss': 'latest',
            }
            : isFileManager || isRestClient
            ? {
                '@termuijs/core': 'latest',
                '@termuijs/widgets': 'latest',
                '@termuijs/ui': 'latest',
                '@termuijs/jsx': 'latest',
                '@termuijs/tss': 'latest',
                ...(isRestClient ? { '@termuijs/data': 'latest' } : {}),
            }
            : {
                '@termuijs/core': 'latest',
                '@termuijs/widgets': 'latest',
                '@termuijs/ui': 'latest',
                '@termuijs/jsx': 'latest',
                '@termuijs/tss': 'latest',
                '@termuijs/quick': 'latest',
                '@termuijs/motion': 'latest',
                ...(config.features.dataProviders ? { '@termuijs/data': 'latest' } : {}),
                ...(config.features.router ? { '@termuijs/router': 'latest' } : {}),
            },
        devDependencies: {
            '@types/bun': 'latest',
            tsup: '^8.0.0',
            typescript: '^5.3.0',
        },
        engines: {
            bun: '>=1.3.0',
        },
    }, null, 2) + '\n';
}

function generateFormWizardTemplate(
    config: ProjectConfig
): GeneratedFile[] {
    return [
        {
            path: 'src/index.tsx',
            content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState } from '@termuijs/jsx';
import { Wizard } from '@termuijs/ui';
import { TextInput, Spinner } from '@termuijs/widgets';

function App() {
    const [name, setName] = useState('');
    const [theme, setTheme] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleComplete = async () => {
        setSubmitting(true);

        const data = {
            name,
            theme,
        };

        console.log(JSON.stringify(data, null, 2));

        setTimeout(() => {
            setSubmitting(false);
        }, 1000);
    };

    return (
        <box flexDirection="column" padding={1}>
            <text bold>Form Wizard</text>

            <Wizard
                steps={['Info', 'Preferences', 'Confirm']}
                onComplete={handleComplete}
            >
                <box flexDirection="column">
                    <text>Name</text>
                    <TextInput
                        value={name}
                        onChange={setName}
                    />
                </box>

                <box flexDirection="column">
                    <text>Theme</text>
                    <TextInput
                        value={theme}
                        onChange={setTheme}
                    />
                </box>

                <box flexDirection="column">
                    <text>Confirm Details</text>
                    <text>Name: {name}</text>
                    <text>Theme: {theme}</text>
                </box>
            </Wizard>

            {submitting && <Spinner />}
        </box>
    );
}

render(<App />, { title: '${config.name}' });
`,
        },
    ];
}

function generateEmptyTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState, useKeymap, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider } from '@termuijs/tss';

function App() {
    const [count, setCount] = useState(0);

    useKeymap([
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
        { key: '+', action: () => setCount(c => c + 1), description: 'Increment' },
        { key: '-', action: () => setCount(c => Math.max(0, c - 1)), description: 'Decrement' },
    ]);

    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => <text color="red">{err.message}</text>}>
                <box border="single" padding={1}>
                    <text bold>Welcome to ${config.name}!</text>
                    <text>Edit src/index.tsx to get started.</text>
                    <text>Count: {count}  (+/- to change, q to quit)</text>
                </box>
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}

function generateDashboardTemplate(config: ProjectConfig): GeneratedFile[] {
    return loadTemplateFiles('dashboard', config);
}

function loadTemplateFiles(templateName: string, config: ProjectConfig): GeneratedFile[] {
    const templatePath = resolve(TEMPLATES_ROOT, templateName);
    return walkTemplateDirectory(templatePath, templatePath, config);
}

function walkTemplateDirectory(rootPath: string, currentPath: string, config: ProjectConfig): GeneratedFile[] {
    const entries = readdirSync(currentPath, { withFileTypes: true });
    const files: GeneratedFile[] = [];

    for (const entry of entries) {
        const entryPath = join(currentPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkTemplateDirectory(rootPath, entryPath, config));
            continue;
        }

        if (entry.name === 'package.json') {
            continue;
        }

        const relativePath = relative(rootPath, entryPath).replace(/\\/g, '/');
        const content = replaceTemplatePlaceholders(readFileSync(entryPath, 'utf8'), config);
        files.push({ path: relativePath, content });
    }

    return files;
}

function replaceTemplatePlaceholders(content: string, config: ProjectConfig) {
    return content.replace(/{{name}}/g, config.name);
}

function generateInteractiveTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState, useKeymap, useRef, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider, useTheme } from '@termuijs/tss';
import { caps } from '@termuijs/core';

// ASCII-safe symbols
const CHECK  = caps.unicode ? '✓' : 'v';
const BULLET = caps.unicode ? '›' : '>';
const SEP    = caps.unicode ? '─'.repeat(40) : '-'.repeat(40);

const INITIAL_ITEMS = ['Option A', 'Option B', 'Option C'];

function InteractiveTool() {
    const [items,    setItems]    = useState<string[]>(INITIAL_ITEMS);
    const [selected, setSelected] = useState(0);
    const [input,    setInput]    = useState('');
    const [done,     setDone]     = useState<string[]>([]);
    const theme = useTheme();

    useKeymap([
        { key: 'q',          action: () => process.exit(0),               description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0),            description: 'Quit' },
        { key: 'ArrowUp',    action: () => setSelected(s => Math.max(0, s - 1)),              description: 'Move up' },
        { key: 'ArrowDown',  action: () => setSelected(s => Math.min(items.length - 1, s + 1)), description: 'Move down' },
        { key: 'k',          action: () => setSelected(s => Math.max(0, s - 1)),              description: 'Move up (vim)' },
        { key: 'j',          action: () => setSelected(s => Math.min(items.length - 1, s + 1)), description: 'Move down (vim)' },
        { key: 'Enter',      action: () => {
            const item = items[selected];
            if (item) setDone(d => d.includes(item) ? d.filter(x => x !== item) : [...d, item]);
        }, description: 'Toggle selected' },
        { key: 'Backspace',  action: () => setInput(v => v.slice(0, -1)),  description: 'Delete char' },
        { key: 'n',          action: () => {
            if (input.trim()) {
                setItems(prev => [...prev, input.trim()]);
                setInput('');
            }
        }, description: 'Add new item' },
    ]);

    return (
        <box flexDirection="column" padding={1}>
            <text bold color={theme.colors.primary}>${config.name}</text>
            <text color={theme.colors.muted}>j/k or arrows: navigate | Enter: toggle | n: add | q: quit</text>
            <text>{SEP}</text>

            <box flexDirection="column">
                {items.map((item, i) => (
                    <row key={item} gap={1}>
                        <text color={i === selected ? theme.colors.primary : undefined}>
                            {i === selected ? BULLET : ' '}
                        </text>
                        <text color={done.includes(item) ? theme.colors.success : undefined}>
                            {done.includes(item) ? CHECK + ' ' : '  '}{item}
                        </text>
                    </row>
                ))}
            </box>

            <text>{SEP}</text>
            <row gap={1}>
                <text color={theme.colors.muted}>New item:</text>
                <text>{input}_</text>
            </row>
            <text color={theme.colors.muted} dim>Type letters then press n to add</text>
        </box>
    );
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>Error</text>
                    <text>{err.message}</text>
                </box>
            )}>
                <InteractiveTool />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}

function generateCliToolTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useKeymap } from '@termuijs/jsx';
function App() {
    useKeymap([{ key: 'q', action: () => process.exit(0), description: 'Quit' }]);
    return (
        <box flexDirection="column">
            <text bold>${config.name}</text>
            <text dim>Press q to quit</text>
        </box>
    );
}
render(<App />, { title: '${config.name}' });
`,
    }];
}


function generateCliWrapperTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState, useEffect, useKeymap, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider, useTheme } from '@termuijs/tss';
import { caps } from '@termuijs/core';
import { spawn } from 'node:child_process';

// ASCII-safe symbols for terminals without full unicode support
const ICON_RUN  = caps.unicode ? '>' : '>';
const ICON_DONE = caps.unicode ? '*' : '*';
const ICON_ERR  = caps.unicode ? '!' : '!';
const SEP       = '-'.repeat(60);

type LogLevel = 'info' | 'debug' | 'error' | 'warn';
interface LogLine {
    level: LogLevel;
    text: string;
    ts: number;
}

function levelColor(level: LogLevel): string {
    switch (level) {
        case 'info':  return 'green';
        case 'debug': return 'cyan';
        case 'warn':  return 'yellow';
        case 'error': return 'red';
    }
}

function CliWrapper() {
    const [logs, setLogs]       = useState<LogLine[]>([
        { level: 'info',  text: 'Application started', ts: Date.now() },
        { level: 'debug', text: 'Press r to re-run, q to quit',   ts: Date.now() },
    ]);
    const [running, setRunning] = useState(false);
    const [exitCode, setExitCode] = useState<number | null>(null);
    const procRef = useRef<any>(null);
    const theme = useTheme();

    const addLog = (level: LogLevel, text: string) =>
        setLogs(prev => [...prev.slice(-200), { level, text, ts: Date.now() }]);

    // Example: run 'echo hello' — replace with your real command
    const runCommand = () => {
        if (running) return;
        setRunning(true);
        setExitCode(null);
        addLog('info', \`\${ICON_RUN} Running command...\`);

        const proc = spawn('echo', ['Hello from CLI wrapper!']);
        procRef.current = proc;
        proc.stdout.on('data', (d: Buffer) => {
            for (const line of d.toString().split('\\n').filter(Boolean)) {
                addLog('info', line);
            }
        });
        proc.stderr.on('data', (d: Buffer) => {
            for (const line of d.toString().split('\\n').filter(Boolean)) {
                addLog('error', line);
            }
        });
        proc.on('close', (code: number | null) => {
            setRunning(false);
            setExitCode(code);
            addLog(code === 0 ? 'info' : 'error',
                \`\${code === 0 ? ICON_DONE : ICON_ERR} Process exited with code \${code ?? 'null'}\`);
            procRef.current = null;
        });
    };

    // Auto-run on mount, kill process on unmount
    useEffect(() => {
        runCommand();
        return () => {
            if (procRef.current) {
                procRef.current.kill();
                procRef.current = null;
            }
        };
    }, []);

    useKeymap([
        { key: 'q',          action: () => process.exit(0),  description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
        { key: 'r',          action: runCommand,             description: 'Re-run command' },
        { key: 'l',          action: () => setLogs([]),       description: 'Clear logs' },
    ]);

    return (
        <box flexDirection="column" padding={1}>
            <row gap={2}>
                <text bold color={theme.colors.primary}>${config.name}</text>
                <text color={running ? theme.colors.warning : theme.colors.muted}>
                    {running ? 'Running...' : exitCode === null ? 'Ready' : \`Exit: \${exitCode}\`}
                </text>
                <spacer />
                <text color={theme.colors.muted}>r: re-run | l: clear | q: quit</text>
            </row>
            <text>{SEP}</text>

            <box flexDirection="column" flexGrow={1}>
                {logs.map((line, i) => (
                    <row key={i} gap={1}>
                        <text color={theme.colors.muted} dim>
                            {new Date(line.ts).toLocaleTimeString()}
                        </text>
                        <text color={levelColor(line.level)} bold>
                            {line.level.toUpperCase().padEnd(5)}
                        </text>
                        <text>{line.text}</text>
                    </row>
                ))}
            </box>

            {!caps.color && (
                <text color="yellow" dim>
                    Note: running in a terminal without color support (TERM={process.env.TERM ?? 'unset'})
                </text>
            )}
        </box>
    );
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>CLI Wrapper Error</text>
                    <text>{err.message}</text>
                    <text color="yellow">Check that the command exists and is executable.</text>
                </box>
            )}>
                <CliWrapper />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}

function generateFileManagerTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { render, useEffect, useKeymap, useMemo, useRef, useState, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider } from '@termuijs/tss';
import { AppShell, FilePicker } from '@termuijs/ui';
import { Box, DiffView, Tree, Text, type DiffLine, type TreeNode } from '@termuijs/widgets';

type Pane = 'tree' | 'picker' | 'preview';

function escapeText(value: string): string {
    return value.replace(/\r/g, '');
}

function readPreview(filePath: string): DiffLine[] {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = escapeText(content).split('\n');
        return lines.map((line, index) => ({ type: 'context' as const, content: line || ' ', lineNo: index + 1 }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return [{ type: 'context', content: message }];
    }
}

function findFirstPreviewPath(rootPath: string): string {
    try {
        const entries = fs.readdirSync(rootPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() || entry.name.startsWith('.')) continue;
            return path.join(rootPath, entry.name);
        }
    } catch {
        // Fall back to the current directory path when reading fails.
    }
    return rootPath;
}

function buildTree(rootPath: string, depth = 0, maxDepth = 3): TreeNode[] {
    const entries: TreeNode[] = [];

    if (depth === 0) {
        entries.push({ label: path.basename(rootPath) || rootPath, expanded: true, children: buildTree(rootPath, depth + 1, maxDepth) });
        return entries;
    }

    if (depth > maxDepth) {
        return entries;
    }

    try {
        const dirents = fs.readdirSync(rootPath, { withFileTypes: true });
        const sorted = [...dirents].sort((left, right) => left.name.localeCompare(right.name));

        for (const entry of sorted) {
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(rootPath, entry.name);
            if (entry.isDirectory()) {
                entries.push({
                    label: entry.name,
                    expanded: depth < 2,
                    data: { path: fullPath, type: 'directory' },
                    children: buildTree(fullPath, depth + 1, maxDepth),
                });
            } else {
                entries.push({
                    label: entry.name,
                    data: { path: fullPath, type: 'file' },
                });
            }
        }
    } catch (error) {
        entries.push({
            label: error instanceof Error ? error.message : String(error),
            data: { path: rootPath, type: 'error' },
        });
    }

    return entries;
}

function setPaneFocus(widget: Box, focused: boolean): void {
    widget.setStyle({
        borderColor: focused ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'brightBlack' },
    });
}

function FileManager() {
    const initialPath = process.cwd();
    const [cwd, setCwd] = useState(initialPath);
    const [previewPath, setPreviewPath] = useState(findFirstPreviewPath(initialPath));
    const [focusedPane, setFocusedPane] = useState<Pane>('picker');

    const tree = useRef<Tree>(new Tree({
        nodes: buildTree(initialPath),
        onSelect: (node) => {
            const payload = node.data as { path?: string; type?: string } | undefined;
            if (!payload?.path) return;
            if (payload.type === 'file') {
                setPreviewPath(payload.path);
            }
        },
    }, { flexGrow: 1 }));

    const filePicker = useRef(new FilePicker({
        startPath: initialPath,
        onSelect: (selectedPath: string) => {
            setPreviewPath(selectedPath);
        },
        onCancel: () => process.exit(0),
    }));
    const preview = useRef(new DiffView({ lines: readPreview(findFirstPreviewPath(initialPath)) }, { flexGrow: 1 }));

    const header = useMemo(() => new Box({
        flexDirection: 'row',
        border: 'single',
        padding: 1,
    }), []);

    const footer = useMemo(() => new Box({
        flexDirection: 'row',
        border: 'single',
        padding: 1,
    }), []);

    const leftPane = useMemo(() => new Box({
        flexDirection: 'column',
        border: 'single',
        padding: 1,
        flexGrow: 1,
    }), []);

    const centerPane = useMemo(() => new Box({
        flexDirection: 'column',
        border: 'single',
        padding: 1,
        flexGrow: 1,
    }), []);

    const rightPane = useMemo(() => new Box({
        flexDirection: 'column',
        border: 'single',
        padding: 1,
        flexGrow: 1,
    }), []);

    const mainArea = useMemo(() => new Box({
        flexDirection: 'row',
        gap: 1,
        flexGrow: 1,
    }), []);

    const shell = useMemo(() => new AppShell({
        header,
        footer,
        sidebar: leftPane,
        main: mainArea,
        sidebarWidth: 32,
    }), [footer, header, leftPane, mainArea]);

    useEffect(() => {
        header.clearChildren();
        header.addChild(new Text('Path: ' + cwd));
        header.addChild(new Text('Focus: ' + focusedPane));
    }, [cwd, focusedPane, header]);

    useEffect(() => {
        footer.clearChildren();
        footer.addChild(new Text('Tab / Shift+Tab: switch panes'));
        footer.addChild(new Text('Enter: open item | q: quit'));
    }, [footer]);

    useEffect(() => {
        tree.current.setNodes(buildTree(cwd));
    }, [cwd]);

    useEffect(() => {
        preview.current.setLines(readPreview(previewPath));
    }, [previewPath]);

    useEffect(() => {
        setPaneFocus(leftPane, focusedPane === 'tree');
        setPaneFocus(centerPane, focusedPane === 'picker');
        setPaneFocus(rightPane, focusedPane === 'preview');
    }, [centerPane, focusedPane, leftPane, rightPane]);

    useEffect(() => {
        leftPane.clearChildren();
        leftPane.addChild(tree.current);

        centerPane.clearChildren();
        centerPane.addChild(filePicker.current);

        rightPane.clearChildren();
        rightPane.addChild(preview.current);

        mainArea.clearChildren();
        mainArea.addChild(centerPane);
        mainArea.addChild(rightPane);

        setPaneFocus(leftPane, focusedPane === 'tree');
        setPaneFocus(centerPane, focusedPane === 'picker');
        setPaneFocus(rightPane, focusedPane === 'preview');
    }, [centerPane, focusedPane, leftPane, mainArea, rightPane]);

    const cyclePane = (direction: 1 | -1): void => {
        const order: Pane[] = ['tree', 'picker', 'preview'];
        const index = order.indexOf(focusedPane);
        const next = order[(index + direction + order.length) % order.length];
        setFocusedPane(next);
    };

    const syncPickerPath = (): void => {
        setCwd(filePicker.current.currentPath);
        const selected = filePicker.current.selectedEntry;
        setPreviewPath(
            selected && !selected.isDir
                ? selected.fullPath
                : findFirstPreviewPath(filePicker.current.currentPath),
        );
    };

    useKeymap([
        { key: 'tab', action: () => cyclePane(1), description: 'Next pane' },
        { key: 'tab', shift: true, action: () => cyclePane(-1), description: 'Previous pane' },
        { key: 'enter', action: () => {
            if (focusedPane === 'tree') {
                tree.current.handleKey('Enter');
                const selected = tree.current.selectedNode;
                const payload = selected?.data as { path?: string; type?: string } | undefined;
                if (payload?.type === 'file' && payload.path) {
                    setPreviewPath(payload.path);
                }
                return;
            }

            if (focusedPane === 'picker') {
                filePicker.current.confirm();
                syncPickerPath();
                return;
            }

            preview.current.handleKey('Enter');
        }, description: 'Open item' },
        { key: 'up', action: () => {
            if (focusedPane === 'tree') tree.current.handleKey('ArrowUp');
            else if (focusedPane === 'picker') filePicker.current.selectPrev();
            else preview.current.handleKey('ArrowUp');
        }, description: 'Move up' },
        { key: 'down', action: () => {
            if (focusedPane === 'tree') tree.current.handleKey('ArrowDown');
            else if (focusedPane === 'picker') filePicker.current.selectNext();
            else preview.current.handleKey('ArrowDown');
        }, description: 'Move down' },
        { key: 'left', action: () => {
            if (focusedPane === 'tree') tree.current.handleKey('ArrowLeft');
            else if (focusedPane === 'picker') {
                filePicker.current.goUp();
                syncPickerPath();
            }
        }, description: 'Collapse or go up' },
        { key: 'right', action: () => {
            if (focusedPane === 'tree') tree.current.handleKey('ArrowRight');
            else if (focusedPane === 'picker') {
                filePicker.current.confirm();
                syncPickerPath();
            }
        }, description: 'Expand or open' },
        { key: 'backspace', action: () => {
            if (focusedPane === 'picker') {
                filePicker.current.goUp();
                syncPickerPath();
            }
        }, description: 'Parent directory' },
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
    ]);

    return shell;
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>File Manager Error</text>
                    <text>{err.message}</text>
                </box>
            )}>
                <FileManager />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}



function generateAiAssistantTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState, useKeymap, useEffect, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider, useTheme } from '@termuijs/tss';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'assistant'; content: string; }
interface TokenUsageData { inputTokens: number; outputTokens: number; }

// ── Mock adapter (works without ANTHROPIC_API_KEY) ────────────────────────────

const MOCK_REPLIES = [
    'Hello! Running in mock mode. Set ANTHROPIC_API_KEY for real Claude.',
    'Mock mode active — your message was received!',
    'No API key needed in mock mode. Real Claude would answer here.',
];

async function* mockStream(_prompt: string): AsyncGenerator<string> {
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    for (const ch of reply) {
        yield ch;
        await new Promise(r => setTimeout(r, 20));
    }
}

async function* claudeStream(
    messages: Message[],
    onUsage: (u: TokenUsageData) => void,
): AsyncGenerator<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            stream: true,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
    });
    if (!res.ok) throw new Error('Claude API ' + res.status + ': ' + res.statusText);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') return;
            try {
                const ev = JSON.parse(raw);
                if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') yield ev.delta.text as string;
                if (ev.type === 'message_delta' && ev.usage) onUsage({ inputTokens: ev.usage.input_tokens ?? 0, outputTokens: ev.usage.output_tokens ?? 0 });
            } catch { /* skip */ }
        }
    }
}

// ── Components ────────────────────────────────────────────────────────────────

const IS_MOCK = !process.env.ANTHROPIC_API_KEY;

function AiAssistant() {
    const theme = useTheme();
    const [messages, setMessages] = useState<Message[]>([{
        role: 'assistant',
        content: IS_MOCK
            ? 'Hi! Running in mock mode (no ANTHROPIC_API_KEY). Type and press Enter!'
            : 'Hi! I am Claude. How can I help you?',
    }]);
    const [input, setInput]           = useState('');
    const [streaming, setStreaming]   = useState('');
    const [busy, setBusy]             = useState(false);
    const [usage, setUsage]           = useState<TokenUsageData>({ inputTokens: 0, outputTokens: 0 });

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;
        const next: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setBusy(true);
        setStreaming('');
        try {
            let full = '';
            const src = IS_MOCK ? mockStream(text) : claudeStream(next, setUsage);
            for await (const chunk of src) { full += chunk; setStreaming(full); }
            setMessages(m => [...m, { role: 'assistant', content: full }]);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setMessages(m => [...m, { role: 'assistant', content: 'Error: ' + msg }]);
        } finally { setStreaming(''); setBusy(false); }
    };

    useKeymap([
        { key: 'enter',     action: () => { void send(); },                   description: 'Send' },
        { key: 'backspace', action: () => setInput(v => v.slice(0, -1)),       description: 'Delete' },
        { key: 'c', ctrl: true, action: () => process.exit(0),                description: 'Quit' },
        ...(' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-_()').split('').map(ch => ({
            key: ch, action: () => { if (!busy) setInput(v => v + ch); }, description: '',
        })),
    ]);

    return (
        <box flexDirection="column" flexGrow={1} padding={1}>
            <box border="single" padding={1} flexDirection="row">
                <text bold>AI Assistant</text>
                <text> {IS_MOCK ? '[mock mode]' : '[claude-3-5-haiku]'}</text>
                <text color={theme.colors.muted}> in:{usage.inputTokens} out:{usage.outputTokens}</text>
            </box>

            <box flexDirection="column" flexGrow={1} padding={1}>
                {messages.map((m, i) => (
                    <box key={i} flexDirection="column" marginBottom={1}>
                        <text bold color={m.role === 'user' ? theme.colors.primary : theme.colors.success}>
                            {m.role === 'user' ? 'You' : 'Claude'}
                        </text>
                        <text>{m.content}</text>
                    </box>
                ))}
                {streaming.length > 0 && (
                    <box flexDirection="column">
                        <text bold color={theme.colors.success}>Claude</text>
                        <text>{streaming}█</text>
                    </box>
                )}
            </box>

            <box border="single" padding={1}>
                <text color={theme.colors.muted}>&gt; </text>
                <text>{input}{busy ? '' : '█'}</text>
                {busy && <text color={theme.colors.muted}> thinking...</text>}
            </box>

            <box padding={1}>
                <text dim>Ctrl+C to quit{IS_MOCK ? ' | Set ANTHROPIC_API_KEY for real Claude' : ''}</text>
            </box>
        </box>
    );
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>Error</text>
                    <text>{err.message}</text>
                </box>
            )}>
                <AiAssistant />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}

function generateRestClientTemplate(config: ProjectConfig): GeneratedFile[] {
    return [{
        path: 'src/index.tsx',
        content: `/** @jsxImportSource @termuijs/jsx */
import { render, useState, useKeymap, ErrorBoundary } from '@termuijs/jsx';
import { AutoThemeProvider } from '@termuijs/tss';
import { useFetch } from '@termuijs/data';
import { JSONView, Text } from '@termuijs/widgets';

function RestClient() {
    const result = useFetch<{ id: number; name: string; email: string }>(
        'https://jsonplaceholder.typicode.com/users/1',
    );

    useKeymap([
        { key: 'q', action: () => process.exit(0), description: 'Quit' },
        { key: 'c', ctrl: true, action: () => process.exit(0), description: 'Quit' },
    ]);

    return (
        <box flexDirection="column" padding={1} gap={1}>
            <text bold>${config.name}</text>
            {result.loading && <text>Loading...</text>}
            {result.error && <text color="red">Error: {String(result.error.message)}</text>}
            {result.data && <jsonview data={result.data} />}
        </box>
    );
}

function App() {
    return (
        <AutoThemeProvider>
            <ErrorBoundary fallback={(err) => (
                <box border="single" borderColor="red" padding={1}>
                    <text color="red" bold>Error</text>
                    <text>{err.message}</text>
                </box>
            )}>
                <RestClient />
            </ErrorBoundary>
        </AutoThemeProvider>
    );
}

render(<App />, { title: '${config.name}' });
`,
    }];
}

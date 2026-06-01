/** @jsxImportSource @termuijs/jsx */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { render, useEffect, useKeymap, useMemo, useRef, useState, ErrorBoundary } from '@termuijs/jsx';
import { AppShell, FilePicker } from '@termuijs/ui';
import { Box, DiffView, Tree, Text, type DiffLine, type TreeNode } from '@termuijs/widgets';

function readPreview(filePath: string): DiffLine[] {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.replace(/\r/g, '').split('\n').map((line, index) => ({
            type: 'context' as const,
            content: line || ' ',
            lineNo: index + 1,
        }));
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
        // Fall back to the directory path when reading fails.
    }
    return rootPath;
}

function buildTree(rootPath: string, depth = 0, maxDepth = 3): TreeNode[] {
    if (depth === 0) {
        return [{
            label: path.basename(rootPath) || rootPath,
            expanded: true,
            children: buildTree(rootPath, depth + 1, maxDepth),
        }];
    }

    if (depth > maxDepth) {
        return [];
    }

    const entries: TreeNode[] = [];
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

type Pane = 'tree' | 'picker' | 'preview';

function FileManager() {
    const rootPath = process.cwd();
    const [cwd, setCwd] = useState(rootPath);
    const [previewPath, setPreviewPath] = useState(findFirstPreviewPath(rootPath));
    const [focusedPane, setFocusedPane] = useState<Pane>('picker');

    const tree = useRef(new Tree({
        nodes: buildTree(rootPath),
        onSelect: (node) => {
            const payload = node.data as { path?: string; type?: string } | undefined;
            if (payload?.type === 'file' && payload.path) {
                setPreviewPath(payload.path);
            }
        },
    }, { flexGrow: 1 }));

    const filePicker = useRef(new FilePicker({
        startPath: rootPath,
        onSelect: (selectedPath: string) => {
            setPreviewPath(selectedPath);
        },
        onCancel: () => process.exit(0),
    }));

    const preview = useRef(new DiffView({
        lines: readPreview(findFirstPreviewPath(rootPath)),
        showLineNumbers: true,
        gutterWidth: 6,
    }, { flexGrow: 1 }));

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

    const header = useMemo(() => new Box({
        flexDirection: 'row',
        border: 'single',
        padding: 1,
        gap: 2,
    }), []);

    const footer = useMemo(() => new Box({
        flexDirection: 'row',
        border: 'single',
        padding: 1,
        gap: 2,
    }), []);

    const shell = useMemo(() => new AppShell({
        header,
        footer,
        sidebar: leftPane,
        main: mainArea,
        sidebarWidth: 32,
    }), [footer, header, leftPane, mainArea]);

    useEffect(() => {
        tree.current.setNodes(buildTree(cwd));
    }, [cwd]);

    useEffect(() => {
        preview.current.setLines(readPreview(previewPath));
    }, [previewPath]);

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
        setFocusedPane(order[(index + direction + order.length) % order.length]);
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

render(<App />, { title: 'file-manager' });

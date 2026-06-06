import * as fs from 'node:fs';
import * as path from 'node:path';
import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget, DirectoryTree, type TreeNode } from '@termuijs/widgets';
import { FilePicker } from '@termuijs/ui';

function buildTree(dirPath: string, depth = 0, maxDepth = 2): TreeNode[] {
    const nodes: TreeNode[] = [];
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                nodes.push({
                    name: entry.name,
                    type: 'dir',
                    children: depth < maxDepth ? buildTree(fullPath, depth + 1, maxDepth) : [],
                });
            } else {
                nodes.push({
                    name: entry.name,
                    type: 'file',
                });
            }
        }
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    } catch {
        // ignore errors
    }
    return nodes;
}

class FileManagerApp extends Widget {
    private tree: DirectoryTree;
    private picker: FilePicker;
    private leftPane: Box;
    private rightPane: Box;
    private activePane: 'tree' | 'picker' = 'tree';

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        const header = new Box({ height: 3, border: 'single', flexDirection: 'column' });
        header.addChild(new Text(' TermUI File Manager Example ', { bold: true, fg: { type: 'named', name: 'cyan' } }));
        header.addChild(new Text(' [Tab] Switch Pane | [Enter] Open/Select', { dim: true }));

        const main = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        this.leftPane = new Box({ flexGrow: 1, border: 'single' });
        this.tree = new DirectoryTree({
            tree: [{ name: path.basename(process.cwd()) || 'root', type: 'dir', children: buildTree(process.cwd()) }],
            onSelect: (node, p) => {
                if (node.type === 'dir') {
                    const absPath = path.join(path.dirname(process.cwd()), p);
                    this.rightPane.clearChildren();
                    this.picker = new FilePicker({ startPath: absPath });
                    this.rightPane.addChild(this.picker);
                    this.markDirty();
                }
            }
        }, { flexGrow: 1 });
        this.leftPane.addChild(this.tree);

        this.rightPane = new Box({ flexGrow: 2, border: 'single' });
        this.picker = new FilePicker({
            startPath: process.cwd(),
        });
        this.rightPane.addChild(this.picker);

        main.addChild(this.leftPane);
        main.addChild(this.rightPane);

        const footer = new Box({ height: 3, border: 'single' });
        footer.addChild(new Text(' q → quit | Ctrl+C → exit '));

        this.addChild(header);
        this.addChild(main);
        this.addChild(footer);

        this.updateFocus();
    }

    private updateFocus() {
        this.leftPane.setStyle({ borderColor: this.activePane === 'tree' ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'brightBlack' } });
        this.rightPane.setStyle({ borderColor: this.activePane === 'picker' ? { type: 'named', name: 'cyan' } : { type: 'named', name: 'brightBlack' } });
        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // Quit
        }

        if (event.key === 'tab') {
            this.activePane = this.activePane === 'tree' ? 'picker' : 'tree';
            this.updateFocus();
            return true;
        }

        // Pass events to active pane
        if (this.activePane === 'tree') {
            const keyStr = event.key === 'up' ? 'ArrowUp' :
                           event.key === 'down' ? 'ArrowDown' :
                           event.key === 'left' ? 'ArrowLeft' :
                           event.key === 'right' ? 'ArrowRight' :
                           event.key === 'enter' || event.key === 'return' ? 'Enter' : event.key;
            this.tree.handleKey(keyStr);
        } else {
            this.picker.handleKey(event);
        }

        return true;
    }

    protected _renderSelf(): void { }
}

async function main() {
    const exampleApp = new FileManagerApp();

    const app = new App(exampleApp, {
        fullscreen: true,
        title: 'File Manager',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = exampleApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});

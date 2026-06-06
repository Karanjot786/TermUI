// examples/json-explorer/src/index.tsx
import * as fs from 'node:fs';
import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget, JSONView, ScrollView } from '@termuijs/widgets';
import { FilePicker } from '@termuijs/ui';

// ---------------------------------------------------------------------------
// Fallback sample data shown when user dismisses the FilePicker
// ---------------------------------------------------------------------------
const SAMPLE_DATA = {
    name: 'json-explorer',
    version: '0.1.0',
    description: 'Browse any JSON file as a collapsible tree',
    author: {
        name: 'TermUI contributor',
        email: 'contributor@example.com',
    },
    features: ['collapsible tree', 'scroll support', 'file picker'],
    stats: {
        nodes: 42,
        depth: 5,
        nullable: null,
        active: true,
    },
    tags: ['terminal', 'json', 'tui'],
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
type AppState = 'picking' | 'browsing';

class JsonExplorerApp extends Widget {
    private state: AppState = 'picking';
    private picker: FilePicker;
    private scrollView: ScrollView;
    private jsonView: JSONView;
    private statusBar: Box;
    private statusText: Text;
    private titleText: Text;
    private mainArea: Box;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // ── Header ──────────────────────────────────────────────────────────
        const header = new Box({ height: 3, border: 'single' });
        this.titleText = new Text(
            '  JSON Explorer  —  pick a .json file to browse',
            { bold: true, fg: { type: 'named', name: 'cyan' } },
        );
        header.addChild(this.titleText);

        // ── Main area: either FilePicker or ScrollView+JSONView ─────────────
        this.mainArea = new Box({ flexGrow: 1, border: 'single' });

        this.jsonView = new JSONView(SAMPLE_DATA, { flexGrow: 1 });
        this.scrollView = new ScrollView({ flexGrow: 1 });
        this.scrollView.addChild(this.jsonView);

        this.picker = new FilePicker({
            startPath: process.cwd(),
            filter: (entry) => entry.isDirectory || entry.name.endsWith('.json'),
        });
        this.mainArea.addChild(this.picker);   // start in picking state

        // ── Status bar ──────────────────────────────────────────────────────
        this.statusBar = new Box({ height: 3, border: 'single' });
        this.statusText = new Text(
            '  [enter] select file   [esc] use sample data   [q] quit',
        );
        this.statusBar.addChild(this.statusText);

        this.addChild(header);
        this.addChild(this.mainArea);
        this.addChild(this.statusBar);
    }

    // ── Switch from FilePicker to JSON tree view ──────────────────────────
    private showJson(data: unknown, label: string): void {
        this.titleText.setText(`  ${label}`);
        this.jsonView.setData(data);
        this.mainArea.clearChildren();
        this.mainArea.addChild(this.scrollView);
        this.statusText.setText(
            '  [↑↓] scroll   [enter] expand/collapse   [q] quit',
        );
        this.state = 'browsing';
        this.markDirty();
    }

    private loadFile(filePath: string): void {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw) as unknown;
            this.showJson(data, filePath);
        } catch (err) {
            this.showJson(
                { error: 'Failed to parse JSON', file: filePath, detail: String(err) },
                `Parse error — ${filePath}`,
            );
        }
    }

    // ── Key routing ──────────────────────────────────────────────────────
    handleKey(event: KeyEvent): boolean {
        // q or Ctrl+C always quits
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        if (this.state === 'picking') {
            // esc → skip file picker, use sample data
            if (event.key === 'escape') {
                this.showJson(SAMPLE_DATA, 'sample data');
                return true;
            }
            // enter on a .json file → load it
            if (event.key === 'enter' || event.key === 'return') {
                const selected = this.picker.getSelected?.();
                if (selected && !selected.isDirectory && selected.name.endsWith('.json')) {
                    this.loadFile(selected.path);
                    return true;
                }
            }
            this.picker.handleKey(event);
            return true;
        }

        // Browsing state
        switch (event.key) {
            case 'up':
                this.scrollView.scrollBy(-1);
                break;
            case 'down':
                this.scrollView.scrollBy(1);
                break;
            case 'enter':
            case 'return':
                this.jsonView.handleKey(event);
                break;
            default:
                this.jsonView.handleKey(event);
        }
        this.markDirty();
        return true;
    }

    protected _renderSelf(): void {}
}

// ---------------------------------------------------------------------------
// Bootstrap — matches file-manager pattern exactly
// ---------------------------------------------------------------------------
async function main() {
    const explorerApp = new JsonExplorerApp();

    const app = new App(explorerApp, {
        fullscreen: true,
        title: 'JSON Explorer',
        fps: 30,
    });

    app.events.on('key', (event: KeyEvent) => {
        const shouldContinue = explorerApp.handleKey(event);
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

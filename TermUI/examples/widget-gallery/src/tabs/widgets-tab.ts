// ─────────────────────────────────────────────────────
// Widgets Tab — Tree, JSONView, DiffView, KeyValue
// ─────────────────────────────────────────────────────

import { Widget, Box, Text } from '@termuijs/widgets';
import { Tree, JSONView, DiffView, KeyValue } from '@termuijs/widgets';
import type { TreeNode, DiffLine } from '@termuijs/widgets';
import type { Screen } from '@termuijs/core';

// ── Column focus type ─────────────────────────────────

type FocusedColumn = 'tree' | 'json' | 'diff' | 'keyvalue';

// ── Tree data ──────────────────────────────────────────

const TREE_NODES: TreeNode[] = [
    {
        label: 'src',
        expanded: true,
        children: [
            {
                label: 'components',
                expanded: true,
                children: [
                    { label: 'Button.tsx' },
                    { label: 'Input.tsx' },
                ],
            },
            {
                label: 'utils',
                children: [
                    { label: 'helpers.ts' },
                    { label: 'types.ts' },
                ],
            },
            { label: 'index.ts' },
        ],
    },
    {
        label: 'tests',
        children: [
            {
                label: 'unit',
                children: [{ label: 'app.test.ts' }],
            },
        ],
    },
    { label: 'package.json' },
    { label: 'tsconfig.json' },
];

// ── JSON data ──────────────────────────────────────────

const JSON_DATA = {
    name: '@termuijs/widgets',
    version: '0.1.3',
    features: ['Tree', 'JSONView', 'DiffView'],
    config: { fps: 30, unicode: true, debug: false },
    stats: { widgets: 12, tests: 571, coverage: 94 },
};

// ── Diff data ──────────────────────────────────────────

const DIFF_LINES: DiffLine[] = [
    { type: 'context', content: 'export function greet(name: string) {', lineNo: 1 },
    { type: 'remove',  content: '  return `Hello ${name}`;', lineNo: 2 },
    { type: 'add',     content: '  return `Hello, ${name}!`;', lineNo: 2 },
    { type: 'context', content: '}', lineNo: 3 },
    { type: 'add',     content: '', lineNo: 4 },
    { type: 'add',     content: 'export function goodbye(name: string) {', lineNo: 5 },
    { type: 'add',     content: '  return `Goodbye, ${name}!`;', lineNo: 6 },
    { type: 'add',     content: '}', lineNo: 7 },
];

// ── KeyValue data ─────────────────────────────────────

const KV_DATA = {
    name: 'Alice',
    age: 30,
    address: {
        city: 'Berlin',
        zip: '10115',
        country: 'Germany'
    },
    preferences: {
        theme: 'dark',
        language: 'en',
        notifications: {
            email: true,
            push: false,
            sms: false
        }
    },
    active: true,
    tags: ['user', 'admin'],
    lastLogin: '2024-01-15T10:30:00Z'
};



// ── WidgetsTab ────────────────────────────────────────

export class WidgetsTab extends Widget {
    private _tree: Tree;
    private _jsonView: JSONView;
    private _diffView: DiffView;
    private _keyValue: KeyValue;
    private _focusedColumn: FocusedColumn = 'tree';
    private _focusBar: Text;

    constructor() {
        super({ flexDirection: 'column', flexGrow: 1 });

        // Header
        const header = new Text('Widgets Tab — Tree  |  JSONView  |  DiffView', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            height: 1,
        });

        // Focus indicator
        this._focusBar = new Text(
            '  Focus: [TREE]   Tab/Left/Right to switch  •  Up/Down Navigate  •  Space Toggle',
            { height: 1, fg: { type: 'named', name: 'yellow' }, bold: true },
        );

        // ── Four-column layout ────────────────────────
        const columns = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // Left: Tree
        const leftCol = new Box({ flexDirection: 'column', flexGrow: 1 });
        leftCol.addChild(new Text(' Tree — File Explorer', {
            height: 1,
            bold: true,
            fg: { type: 'named', name: 'green' },
        }));
        this._tree = new Tree(
            { nodes: TREE_NODES },
            { border: 'single', flexGrow: 1, height: 18 },
        );
        leftCol.addChild(this._tree);
        leftCol.addChild(new Text(' Up/Down move  Space/Enter expand', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        }));

        // Middle-left: JSONView
        const midLeftCol = new Box({ flexDirection: 'column', flexGrow: 1 });
        midLeftCol.addChild(new Text(' JSONView — Syntax Colored', {
            height: 1,
            bold: true,
            fg: { type: 'named', name: 'magenta' },
        }));
        this._jsonView = new JSONView(
            { data: JSON_DATA },
            { border: 'single', flexGrow: 1, height: 18 },
        );
        midLeftCol.addChild(this._jsonView);
        midLeftCol.addChild(new Text(' Expand objects with Space/Enter', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        }));

        // Middle-right: DiffView
        const midRightCol = new Box({ flexDirection: 'column', flexGrow: 1 });
        midRightCol.addChild(new Text(' DiffView — Unified Diff', {
            height: 1,
            bold: true,
            fg: { type: 'named', name: 'yellow' },
        }));
        this._diffView = new DiffView(
            { lines: DIFF_LINES },
            { border: 'single', flexGrow: 1, height: 18 },
        );
        midRightCol.addChild(this._diffView);
        midRightCol.addChild(new Text(' Up/Down scroll  green=add  red=remove', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        }));

        // Right: KeyValue
        const rightCol = new Box({ flexDirection: 'column', flexGrow: 1 });
        rightCol.addChild(new Text(' KeyValue — Expandable Pairs', {
            height: 1,
            bold: true,
            fg: { type: 'named', name: 'cyan' },
        }));
        this._keyValue = new KeyValue(
            KV_DATA,
            { border: 'single', flexGrow: 1, height: 18 },
        );
        rightCol.addChild(this._keyValue);
        rightCol.addChild(new Text(' Up/Down navigate  Space/Enter expand', {
            height: 1, fg: { type: 'named', name: 'brightBlack' },
        }));

        columns.addChild(leftCol);
        columns.addChild(midLeftCol);
        columns.addChild(midRightCol);
        columns.addChild(rightCol);

        this.addChild(header);
        this.addChild(this._focusBar);
        this.addChild(columns);

        // Start with tree focused
        this._tree.isFocused = true;
    }

    handleKey(key: string): void {
        // Tab / left / right to cycle column focus
        if (key === 'tab' || key === 'right') {
            this._cycleFocus(1);
            return;
        }
        if (key === 'left') {
            this._cycleFocus(-1);
            return;
        }

        // Forward to focused column
        switch (this._focusedColumn) {
            case 'tree':
                this._tree.handleKey(this._mapKey(key));
                break;
            case 'json':
                this._jsonView.handleKey(this._mapKey(key));
                break;
            case 'diff':
                this._diffView.handleKey(this._mapKey(key));
                break;
            case 'keyvalue':
                this._keyValue.handleKey(this._mapKey(key));
                break;
        }
    }

    private _mapKey(key: string): string {
        // Map showcase key names to widget key names
        switch (key) {
            case 'up':    return 'ArrowUp';
            case 'down':  return 'ArrowDown';
            case 'left':  return 'ArrowLeft';
            case 'right': return 'ArrowRight';
            case 'space': return ' ';
            case 'enter': return 'Enter';
            case 'home':  return 'Home';
            case 'end':   return 'End';
            default:      return key;
        }
    }

    private _cycleFocus(direction: 1 | -1): void {
        const order: FocusedColumn[] = ['tree', 'json', 'diff', 'keyvalue'];
        const idx = order.indexOf(this._focusedColumn);
        const next = (idx + direction + order.length) % order.length;
        this._focusedColumn = order[next];

        // Update isFocused on widgets
        this._tree.isFocused = this._focusedColumn === 'tree';
        this._jsonView.isFocused = this._focusedColumn === 'json';
        this._diffView.isFocused = this._focusedColumn === 'diff';
        this._keyValue.isFocused = this._focusedColumn === 'keyvalue';

        this._tree.markDirty();
        this._jsonView.markDirty();
        this._diffView.markDirty();
        this._keyValue.markDirty();

        const labels: Record<FocusedColumn, string> = {
            tree: 'TREE',
            json: 'JSONVIEW',
            diff: 'DIFFVIEW',
            keyvalue: 'KEYVALUE',
        };
        this._focusBar.setContent(
            `  Focus: [${labels[this._focusedColumn]}]   Tab/Left/Right to switch  •  Up/Down Navigate  •  Space Toggle`,
        );
    }

    protected _renderSelf(_screen: Screen): void { /* children handle rendering */ }
}

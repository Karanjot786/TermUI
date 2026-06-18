import { Database } from 'bun:sqlite';
import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget, Tree, Table, ScrollView, type TreeNode } from '@termuijs/widgets';


type TableNodeData = {
    type: 'table';
    name: string;
};

type ColumnNodeData = {
    type: 'column';
    name: string;
    table: string;
};

type RootNodeData = {
    type: 'root';
};

type NodeData = TableNodeData | ColumnNodeData | RootNodeData;

function quoteSqliteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}



function isTableNode(data: unknown): data is TableNodeData {
    return (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        data.type === 'table'
    );
}

// ── Tree builder ────────────────────────────────────────

function buildDbTree(db: Database): TreeNode[] {
    const tableNodes: TreeNode[] = [];
    const tables = db.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();

    for (const table of tables) {
        const colInfos = db.query<{ name: string }, []>(
            `PRAGMA table_info(${quoteSqliteIdentifier(table.name)})`
        ).all();
        const children: TreeNode[] = colInfos.map(col => ({
            label: col.name,
            data: { type: 'column', table: table.name, name: col.name },
        }));
        tableNodes.push({
            label: table.name,
            expanded: true,
            data: { type: 'table', name: table.name },
            children,
        });
    }

    return [
        {
            label: 'Database',
            expanded: true,
            data: { type: 'root' },
            children: tableNodes,
        },
    ];
}

// ── Translate core key names to the string format Tree.handleKey expects ────
//
// @termuijs/core InputParser emits lowercase names: 'up', 'down', 'left',
// 'right', 'enter', 'space', 'tab', 'home', 'end'.
//
// @termuijs/widgets Tree.handleKey expects: 'ArrowUp', 'ArrowDown',
// 'ArrowLeft', 'ArrowRight', 'Enter', ' ' (literal space), 'Home', 'End'.
//
function coreKeyToTreeKey(key: string): string {
    switch (key) {
        case 'up': return 'ArrowUp';
        case 'down': return 'ArrowDown';
        case 'left': return 'ArrowLeft';
        case 'right': return 'ArrowRight';
        case 'enter':
        case 'return': return 'Enter';
        case 'space': return ' ';
        case 'home': return 'Home';
        case 'end': return 'End';
        default: return key;
    }
}

// ── Translate core key names to the string format ScrollView.onKey expects ──
//
// ScrollView.onKey checks: 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'.
// Core emits: 'up', 'down', 'pageup', 'pagedown'.
//
function coreKeyToScrollKey(event: KeyEvent): KeyEvent {
    const keyMap: Record<string, string> = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        pageup: 'PageUp',
        pagedown: 'PageDown',
    };
    const mapped = keyMap[event.key];
    if (!mapped) return event;
    // Return a copy with the translated key. KeyEvent.stopPropagation /
    // preventDefault are bound methods so we spread and override only key.
    return { ...event, key: mapped };
}

// ── Main app widget ─────────────────────────────────────

export class DbBrowserApp extends Widget {
    private _db: Database;
    private _tree: Tree;
    private _scrollView: ScrollView;
    private _leftPane: Box;
    private _rightPane: Box;
    private _footerText: Text;
    private _activePane: 'tree' | 'table' = 'tree';
    private _currentTable = '';
    private _rowCount = 0;

    constructor(db: Database) {
        super({ flexDirection: 'column', flexGrow: 1 });
        this._db = db;

        // ── Header ──────────────────────────────────────
        // height:4 = 1 border-top + 2 content rows + 1 border-bottom.
        // Each Text child needs height:1 so the flex engine gives it 1 row.
        const header = new Box({ height: 4, border: 'single', flexDirection: 'column' });
        header.addChild(
            new Text(' TermUI SQLite Database Browser ', {
                bold: true,
                fg: { type: 'named', name: 'cyan' },
                height: 1,
            })
        );
        header.addChild(
            new Text(
                ' [Tab] Switch Pane | [↑↓] Navigate Tree | [←→] Expand/Collapse | [q] Quit ',
                { dim: true, height: 1 }
            )
        );

        // ── Main split ──────────────────────────────────
        const main = new Box({ flexDirection: 'row', flexGrow: 1, gap: 1 });

        // Left pane — tree
        this._leftPane = new Box({ flexGrow: 1, border: 'single' });
        const treeNodes = buildDbTree(this._db);
        this._tree = new Tree({ nodes: treeNodes }, { flexGrow: 1 });
        this._leftPane.addChild(this._tree);

        // Right pane — scrollable table
        this._rightPane = new Box({ flexGrow: 2, border: 'single' });
        this._scrollView = new ScrollView({ flexGrow: 1 }, { showScrollbar: true });
        this._rightPane.addChild(this._scrollView);

        main.addChild(this._leftPane);
        main.addChild(this._rightPane);

        // ── Footer ──────────────────────────────────────
        // flexGrow:1 on the Text so it fills the 1 content row the Box provides.
        const footer = new Box({ height: 3, border: 'single' });
        this._footerText = new Text(
            ' Table: none | Rows: 0 | [q] quit | [Ctrl+C] exit ',
            { dim: true, flexGrow: 1 }
        );
        footer.addChild(this._footerText);

        this.addChild(header);
        this.addChild(main);
        this.addChild(footer);

        // ── Initial selection ────────────────────────────
        // The tree starts with cursor on the root "Database" node (index 0).
        // Move down one row so the first table is highlighted, then load it.
        const firstTableNode = treeNodes[0]?.children?.[0];

        if (firstTableNode?.data && isTableNode(firstTableNode.data)) {
            const firstTableName = firstTableNode.data.name;
            this._tree.moveNext();
            this._loadTable(firstTableName);
        }

        this._updateFocus();
    }

    // ── Private helpers ─────────────────────────────────

    private _loadTable(tableName: string): void {
        const colInfos = this._db.query<{ name: string }, []>(
            `PRAGMA table_info(${quoteSqliteIdentifier(tableName)})`
        ).all();
        const columns = colInfos.map(col => ({ header: col.name, key: col.name }));

        const rows = this._db.query<Record<string, string | number>, []>(
            `SELECT * FROM ${quoteSqliteIdentifier(tableName)}`
        ).all();

        this._currentTable = tableName;
        this._rowCount = rows.length;

        // Rebuild the ScrollView contents
        this._scrollView.clearChildren();
        // height: 1 header line + 1 separator + N data rows
        const tableHeight = 2 + rows.length;
        const table = new Table(columns, rows, { flexGrow: 1, height: tableHeight });
        this._scrollView.addChild(table);
        this._scrollView.setContentHeight(tableHeight);
        this._scrollView.scrollTo(0);

        // Update footer
        this._footerText.setContent(
            ` Table: ${this._currentTable} | Rows: ${this._rowCount} | [q] quit | [Ctrl+C] exit `
        );

        this.markDirty();
    }

    private _updateFocus(): void {
        this._tree.isFocused = this._activePane === 'tree';
        this._scrollView.isFocused = this._activePane === 'table';

        this._leftPane.setStyle({
            borderColor: this._activePane === 'tree'
                ? { type: 'named', name: 'cyan' }
                : { type: 'named', name: 'brightBlack' },
        });
        this._rightPane.setStyle({
            borderColor: this._activePane === 'table'
                ? { type: 'named', name: 'cyan' }
                : { type: 'named', name: 'brightBlack' },
        });

        this.markDirty();
    }

    private _syncSelectedTable(): void {
        const selected = this._tree.selectedNode;
        if (!selected?.data) return;

        const data = selected.data as NodeData;

        let targetTable: string | null = null;

        if (isTableNode(data)) {
            targetTable = data.name;
        } else if (data.type === 'column') {
            targetTable = data.table;
        }

        if (targetTable && targetTable !== this._currentTable) {
            this._loadTable(targetTable);
        }
    }

    // ── Key handler (called by app.events.on('key', ...)) ───────────────────
    //
    // Returns false to signal the app should exit, true to continue.
    //
    handleKey(event: KeyEvent): boolean {
        // Global quit shortcuts
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        // Tab switches active pane.
        // IMPORTANT: call event.preventDefault() so the App's built-in focus
        // cycling (Phase 2 in App.ts) does not also fire and fight with us.
        if (event.key === 'tab') {
            event.preventDefault();
            this._activePane = this._activePane === 'tree' ? 'table' : 'tree';
            this._updateFocus();
            return true;
        }

        if (this._activePane === 'tree') {
            // Translate core key → Tree key and delegate
            this._tree.handleKey(coreKeyToTreeKey(event.key));
            // After navigation, sync the right-pane table
            this._syncSelectedTable();
        } else {
            // Translate core key → ScrollView key and delegate
            this._scrollView.onKey(coreKeyToScrollKey(event));
        }

        return true;
    }

    protected _renderSelf(): void { /* container widget — children do all painting */ }
}

// ── Entry point ─────────────────────────────────────────

async function main(): Promise<void> {
    const db = new Database(':memory:');

    db.run(`
        CREATE TABLE users (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT    NOT NULL,
            email TEXT    NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE products (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT    NOT NULL,
            price REAL    NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE orders (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            FOREIGN KEY(user_id)    REFERENCES users(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    `);

    db.run(`
        INSERT INTO users (name, email) VALUES
            ('Alice Smith',    'alice@example.com'),
            ('Bob Jones',      'bob@example.com'),
            ('Charlie Brown',  'charlie@example.com')
    `);
    db.run(`
        INSERT INTO products (name, price) VALUES
            ('Mechanical Keyboard', 99.99),
            ('Wireless Mouse',      49.50),
            ('USB-C Hub',           29.99)
    `);
    db.run(`
        INSERT INTO orders (user_id, product_id) VALUES (1, 1), (1, 2), (2, 3)
    `);

    const appWidget = new DbBrowserApp(db);

    const app = new App(appWidget, {
        fullscreen: true,
        title: 'SQLite Database Browser',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = appWidget.handleKey(event);
        if (!shouldContinue) {
            db.close();
            app.exit(0);
        }
        app.requestRender();
    });

    const exitCode = await app.mount();
    db.close();
    process.exit(exitCode);
}

if (import.meta.main) {
    main().catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
}

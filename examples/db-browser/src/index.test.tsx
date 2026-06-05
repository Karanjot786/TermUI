import { describe, it, expect, afterEach } from 'vitest';
import { Database } from 'bun:sqlite';
import { Screen, computeLayout, createKeyEvent } from '@termuijs/core';
import { DbBrowserApp } from './index.js';

// Helper: create a minimal KeyEvent using the core factory.
// Key names follow AGENTS.md (lowercase): 'up', 'down', 'enter', 'tab', etc.
function makeKey(key: string, opts: { ctrl?: boolean; shift?: boolean } = {}): ReturnType<typeof createKeyEvent> {
    return createKeyEvent({
        key,
        raw: Buffer.from([]),
        ctrl: opts.ctrl ?? false,
        alt: false,
        shift: opts.shift ?? false,
    });
}

// Helper: run layout + render on a 120×30 virtual screen, return all text.
// 120 columns avoids email-address truncation in the right-pane table.
function renderToText(widget: DbBrowserApp): string {
    const layoutRoot = widget.getLayoutNode();
    computeLayout(layoutRoot, 120, 30);
    widget.syncLayout();
    const screen = new Screen(120, 30);
    widget.render(screen);
    return screen.back.map(row => row.map(c => c.char).join('')).join('\n');
}

// Shared in-memory database fixture.
function makeDb(): Database {
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
    db.run(`INSERT INTO users (name, email) VALUES
        ('Alice Smith', 'alice@example.com'),
        ('Bob Jones',   'bob@example.com')
    `);
    db.run(`INSERT INTO products (name, price) VALUES
        ('Keyboard', 99.99),
        ('Mouse',    29.99)
    `);
    return db;
}

describe('DbBrowserApp', () => {
    let db: Database;

    afterEach(() => {
        db?.close();
    });

    it('renders the initial users table on startup', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);
        const text = renderToText(app);

        // Footer shows current table
        expect(text).toContain('Table: users');
        // Row data is visible — 120-column screen renders full values without truncation
        expect(text).toContain('Alice Smith');
        expect(text).toContain('alice@example.com');
    });

    it('arrow-down navigation switches table when crossing a table boundary', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);

        // Tree structure (all expanded):
        //  [0] Database (root)
        //  [1]   users
        //  [2]     id
        //  [3]     name
        //  [4]     email
        //  [5]   products
        //  [6]     id
        //  [7]     name
        //  [8]     price
        //
        // Constructor calls moveNext() → cursor at index 1 (users), loads users table.
        // Three more 'down' presses move past the user columns (indices 2, 3, 4)
        // and land on the products node (index 5) → triggers loadTable('products').

        const pressDown = () => app.handleKey(makeKey('down'));

        pressDown(); // → index 2 (id column, still users)
        pressDown(); // → index 3 (name column, still users)
        pressDown(); // → index 4 (email column, still users)

        // Render before the switch — should still show users data
        let text = renderToText(app);
        expect(text).toContain('Table: users');
        expect(text).toContain('Alice Smith');

        pressDown(); // → index 5 (products table node) — triggers table switch
        text = renderToText(app);

        expect(text).toContain('Table: products');
        expect(text).toContain('Keyboard');
        // Users data must no longer be visible in the right pane
        expect(text).not.toContain('Alice Smith');
    });

    it('arrow-up navigation switches back to previous table', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);

        const pressDown = () => app.handleKey(makeKey('down'));
        const pressUp   = () => app.handleKey(makeKey('up'));

        // Navigate down to products table (5 downs: moveNext in constructor + 4 here)
        pressDown(); // id
        pressDown(); // name
        pressDown(); // email
        pressDown(); // products ← table switch

        let text = renderToText(app);
        expect(text).toContain('Table: products');

        // Navigate back up through the products table boundary
        pressUp(); // email (users) ← table switch back
        text = renderToText(app);
        expect(text).toContain('Table: users');
        expect(text).toContain('Alice Smith');
    });

    it('q key signals exit (returns false)', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);
        const result = app.handleKey(makeKey('q'));
        expect(result).toBe(false);
    });

    it('Ctrl+C signals exit (returns false)', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);
        const result = app.handleKey(makeKey('c', { ctrl: true }));
        expect(result).toBe(false);
    });

    it('tab key toggles active pane (returns true)', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);
        // Tab should not quit
        const result = app.handleKey(makeKey('tab'));
        expect(result).toBe(true);
    });

    it('footer shows correct row count', () => {
        db = makeDb();
        const app = new DbBrowserApp(db);
        const text = renderToText(app);
        // users table has 2 rows
        expect(text).toContain('Rows: 2');
    });
});

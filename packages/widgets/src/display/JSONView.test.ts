// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for JSONView widget
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { JSONView, jsonToTree, type JSONNodeData } from './JSONView.js';
import { type TreeNode } from './Tree.js';

// ── Helpers ───────────────────────────────────────────

function makeView(data: unknown, width = 60, height = 20): JSONView {
    const view = new JSONView({ data });
    view.updateRect({ x: 0, y: 0, width, height });
    return view;
}

function renderView(view: JSONView, width = 60, height = 20): Screen {
    const screen = new Screen(width, height);
    view.updateRect({ x: 0, y: 0, width, height });
    view.render(screen);
    return screen;
}

function rowText(screen: Screen, row: number): string {
    let line = '';
    for (let col = 0; col < screen.cols; col++) {
        line += screen.back[row]?.[col]?.char ?? ' ';
    }
    return line.trimEnd();
}

// ── 1. Simple object ──────────────────────────────────

describe('JSONView — simple object', () => {
    it('creates visible top-level key nodes for a plain object', () => {
        const view = makeView({ name: 'Alice', age: 30 });
        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;

        const labels = visibleNodes.map(e => e.node.label);
        // Both properties should appear as leaf nodes
        expect(labels.some(l => l.includes('name'))).toBe(true);
        expect(labels.some(l => l.includes('age'))).toBe(true);
    });

    it('renders object keys on screen', () => {
        const view = makeView({ name: 'Alice', score: 100 });
        const screen = renderView(view);

        const allText = Array.from({ length: 5 }, (_, i) => rowText(screen, i)).join('\n');
        expect(allText).toContain('name');
        expect(allText).toContain('score');
    });
});

// ── 2. Array ──────────────────────────────────────────

describe('JSONView — array', () => {
    it('creates indexed child nodes for an array', () => {
        const view = makeView([10, 20, 30]);
        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;

        // Top-level items are the array elements with numeric string keys
        const labels = visibleNodes.map(e => e.node.label);
        expect(labels.some(l => l.includes('0'))).toBe(true);
        expect(labels.some(l => l.includes('1'))).toBe(true);
        expect(labels.some(l => l.includes('2'))).toBe(true);
    });

    it('renders array items on screen', () => {
        const view = makeView(['foo', 'bar']);
        const screen = renderView(view);

        const allText = Array.from({ length: 4 }, (_, i) => rowText(screen, i)).join('\n');
        expect(allText).toContain('foo');
        expect(allText).toContain('bar');
    });
});

// ── 3. Number values ──────────────────────────────────

describe('JSONView — number values', () => {
    it('produces nodes with number type metadata', () => {
        const node = jsonToTree(42, 'count');
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('number');
        expect(data.value).toBe(42);
        expect(data.key).toBe('count');
        expect(node.label).toBe('count: 42');
    });

    it('produces plain number node without key', () => {
        const node = jsonToTree(3.14);
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('number');
        expect(node.label).toBe('3.14');
    });
});

// ── 4. String values ──────────────────────────────────

describe('JSONView — string values', () => {
    it('produces nodes with string type metadata', () => {
        const node = jsonToTree('hello', 'greeting');
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('string');
        expect(data.value).toBe('hello');
        expect(data.key).toBe('greeting');
        expect(node.label).toBe('greeting: "hello"');
    });

    it('wraps string value in double quotes', () => {
        const node = jsonToTree('world');
        expect(node.label).toBe('"world"');
    });
});

// ── 5. Null values ────────────────────────────────────

describe('JSONView — null values', () => {
    it('renders without crashing for null data', () => {
        const view = makeView(null);
        const screen = renderView(view);
        const row0 = rowText(screen, 0);
        expect(row0).toContain('null');
    });

    it('produces null type metadata', () => {
        const node = jsonToTree(null, 'empty');
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('null');
        expect(node.label).toBe('empty: null');
    });

    it('null at top-level is displayed', () => {
        const node = jsonToTree(null);
        expect(node.label).toBe('null');
    });
});

// ── 6. Nested objects — collapsible ───────────────────

describe('JSONView — nested objects (collapsible)', () => {
    it('nested object starts collapsed', () => {
        const data = { outer: { inner: 'value' } };
        const view = makeView(data);

        // At start, "outer" is visible but "inner" should not be (collapsed)
        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;
        const labels = visibleNodes.map(e => e.node.label);

        expect(labels.some(l => l.includes('outer'))).toBe(true);
        expect(labels.some(l => l.includes('inner'))).toBe(false);
    });

    it('expanding a nested object reveals children', () => {
        const data = { address: { city: 'NYC', zip: '10001' } };
        const view = makeView(data);

        // "address" is selected and collapsed by default
        view.expand();

        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;
        const labels = visibleNodes.map(e => e.node.label);
        expect(labels.some(l => l.includes('city'))).toBe(true);
        expect(labels.some(l => l.includes('zip'))).toBe(true);
    });

    it('collapsing hides children again', () => {
        const data = { config: { debug: true, level: 3 } };
        const view = makeView(data);

        view.expand();   // expand "config"
        view.collapse(); // collapse it again

        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;
        const labels = visibleNodes.map(e => e.node.label);
        expect(labels.some(l => l.includes('debug'))).toBe(false);
        expect(labels.some(l => l.includes('level'))).toBe(false);
    });

    it('handles deeply nested objects', () => {
        const data = { a: { b: { c: { d: 'deep' } } } };
        // Should construct without throwing
        expect(() => makeView(data)).not.toThrow();

        const view = makeView(data);
        // Expand all the way down
        view.expand(); // a
        view.handleKey('down'); // move into a's child b
        view.expand(); // b
        view.handleKey('down'); // move into b's child c
        view.expand(); // c

        const visibleNodes: Array<{ node: TreeNode }> = (view as any)._visibleNodes;
        const labels = visibleNodes.map(e => e.node.label);
        expect(labels.some(l => l.includes('"deep"'))).toBe(true);
    });
});

// ── 7. jsonToTree() — additional cases ────────────────

describe('jsonToTree() helper', () => {
    it('handles boolean true', () => {
        const node = jsonToTree(true, 'flag');
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('boolean');
        expect(data.value).toBe(true);
        expect(node.label).toBe('flag: true');
    });

    it('handles boolean false', () => {
        const node = jsonToTree(false);
        const data = node.data as JSONNodeData;
        expect(data.type).toBe('boolean');
        expect(data.value).toBe(false);
        expect(node.label).toBe('false');
    });

    it('handles empty array', () => {
        const node = jsonToTree([]);
        expect(node.label).toBe('[0]');
        expect(node.children).toHaveLength(0);
    });

    it('handles empty object', () => {
        const node = jsonToTree({});
        expect(node.label).toBe('{0}');
        expect(node.children).toHaveLength(0);
    });

    it('array children have correct index-based keys', () => {
        const node = jsonToTree(['x', 'y', 'z']);
        expect(node.children).toHaveLength(3);
        expect(node.children![0].label).toBe('0: "x"');
        expect(node.children![1].label).toBe('1: "y"');
        expect(node.children![2].label).toBe('2: "z"');
    });

    it('object children reflect property names', () => {
        const node = jsonToTree({ foo: 1, bar: 2 });
        const labels = node.children!.map(c => c.label);
        expect(labels).toContain('foo: 1');
        expect(labels).toContain('bar: 2');
    });
});

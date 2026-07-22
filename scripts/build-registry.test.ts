import { describe, it, expect } from 'vitest';
import { buildRegistryEntries, toSlug, detectCategory, rewriteImports, collectDeps, extractDescription, extractApi } from './build-registry.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PKG = join(import.meta.dirname ?? __dirname, '..', 'packages');

describe('extractDescription recovery', () => {
  it('recovers a JSDoc separated from its export by a statement (Markdown)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/display/Markdown.ts'), 'utf-8');
    const d = extractDescription(src, 'Markdown');
    expect(d).not.toBe('Markdown component');
    expect(d.length).toBeGreaterThan(10);
  });
  it('binds a JSDoc to its real symbol, not a later export (QRCodePattern)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/display/QRCode.ts'), 'utf-8');
    const d = extractDescription(src, 'QRCodePattern');
    expect(d).not.toBe('QRCodePattern component');
  });
  it('recovers a top-of-file line comment (Carousel)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/display/Carousel.ts'), 'utf-8');
    const d = extractDescription(src, 'Carousel');
    expect(d).not.toBe('Carousel component');
  });
  it('binds to the class doc, not a field comment in the options interface (Badge)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/display/Badge.ts'), 'utf-8');
    const d = extractDescription(src, 'Badge');
    // Badge.ts has a `/** Variant determines background color. */` field doc
    // before the class. The class doc starts "Badge — a short inline label".
    expect(d.toLowerCase()).toContain('badge');
    expect(d).not.toContain('Variant determines');
  });
});

describe('extractApi', () => {
  it('parses Badge: positional text arg + variant option', () => {
    const src = readFileSync(join(PKG, 'widgets/src/display/Badge.ts'), 'utf-8');
    const api = extractApi(src, 'Badge');
    expect(api).not.toBeNull();
    expect(api!.signature).toContain('new Badge(');
    expect(api!.props.map((p) => p.name)).toContain('variant');
  });
  it('parses Spinner options (preset/label)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/feedback/Spinner.ts'), 'utf-8');
    const api = extractApi(src, 'Spinner');
    expect(api).not.toBeNull();
    const names = api!.props.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['preset', 'label']));
    expect(names).not.toContain('onDismiss');
  });
  it('returns null when no constructor is present', () => {
    expect(extractApi('export const x = 1', 'x')).toBeNull();
  });
  it('expands an inline object-literal options param (TextInput)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/input/TextInput.ts'), 'utf-8');
    const api = extractApi(src, 'TextInput');
    expect(api).not.toBeNull();
    const names = api!.props.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(['placeholder', 'mask', 'maxLength']));
    expect(names).not.toContain('options');
    // no truncated/garbage types: each prop type has no unclosed brace
    for (const p of api!.props) {
      expect(p.type).not.toMatch(/\{[^}]*$/);
    }
  });
  it('data-grid includes inherited TableOptions props', () => {
    const src = readFileSync(join(PKG, 'widgets/src/data/DataGrid.ts'), 'utf-8');
    const api = extractApi(src, 'DataGrid');
    const names = api!.props.map(p => p.name);
    expect(names).toEqual(expect.arrayContaining(['showHeader', 'stripe', 'onSort']));
  });
  it('list expands ListProps from the union first param', () => {
    const src = readFileSync(join(PKG, 'widgets/src/input/List.ts'), 'utf-8');
    const api = extractApi(src, 'List');
    const names = api!.props.map(p => p.name);
    expect(names).toContain('onSelect');
    expect(names).not.toContain('itemsOrProps');
  });
  it('progress extracts ProgressProps fields', () => {
    const src = readFileSync(join(PKG, 'widgets/src/feedback/Progress.ts'), 'utf-8');
    const api = extractApi(src, 'Progress');
    expect(api!.props.length).toBeGreaterThan(0);
    expect(api!.props.map(p => p.name)).toEqual(expect.arrayContaining(['tasks', 'columns']));
  });
  it('key-value keeps the positional pairs arg despite a multi-line comment', () => {
    const src = readFileSync(join(PKG, 'widgets/src/data/KeyValue.ts'), 'utf-8');
    const api = extractApi(src, 'KeyValue');
    expect(api!.props.map(p => p.name)).toContain('pairs');
  });
});

describe('field descriptions', () => {
  it('do not leak the previous field comment (Alert)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/feedback/Alert.ts'), 'utf-8');
    const api = extractApi(src, 'Alert');
    const message = api!.props.find(p => p.name === 'message');
    expect(message).toBeDefined();
    if (message && message.description) expect(message.description.toLowerCase()).not.toContain('variant');
  });
  it('do not leak the previous field comment (Panel borderColor vs title)', () => {
    const src = readFileSync(join(PKG, 'widgets/src/layout/Panel.ts'), 'utf-8');
    const api = extractApi(src, 'Panel');
    const borderColor = api!.props.find(p => p.name === 'borderColor');
    // borderColor's own comment legitimately mentions "title"; the leak to guard
    // against is the PREVIOUS field's distinct comment ("Required title shown in
    // the top border") bleeding into this one.
    if (borderColor && borderColor.description) {
      expect(borderColor.description.toLowerCase()).not.toContain('required title shown');
    }
  });
});

describe('rewriteImports', () => {
  it('rewrites relative imports to the package specifier', () => {
    const src = [
      `import { Widget } from '../base/Widget.js';`,
      `import { TableState } from './TableState.js';`,
      `import { Screen } from '@termuijs/core';`,
    ].join('\n');
    const out = rewriteImports(src, '@termuijs/widgets');
    expect(out).toContain(`from '@termuijs/widgets'`);
    expect(out).not.toContain(`../base/Widget.js`);
    expect(out).not.toContain(`./TableState.js`);
    expect(out).toContain(`from '@termuijs/core'`);
  });
});

describe('collectDeps', () => {
  it('collects unique sorted @termuijs/* specifiers', () => {
    const src = [
      `import { Widget } from '@termuijs/widgets';`,
      `import { Screen } from '@termuijs/core';`,
      `import { timerPoolSubscribe } from '@termuijs/motion';`,
      `import { Widget as W2 } from '@termuijs/widgets';`,
    ].join('\n');
    expect(collectDeps(src)).toEqual([
      '@termuijs/core', '@termuijs/motion', '@termuijs/widgets',
    ]);
  });
});

describe('registry build utilities', () => {
  it('toSlug converts PascalCase to kebab-case', () => {
    expect(toSlug('ProgressCircle')).toBe('progress-circle');
    expect(toSlug('HeatMap')).toBe('heat-map');
    expect(toSlug('BigText')).toBe('big-text');
    expect(toSlug('usePackageManager')).toBe('use-package-manager');
  });

  it('detectCategory returns correct category for widget paths', () => {
    expect(detectCategory('packages/widgets/src/display/ProgressCircle.ts')).toBe('display');
    expect(detectCategory('packages/widgets/src/feedback/Spinner.ts')).toBe('feedback');
    expect(detectCategory('packages/widgets/src/data/HeatMap.ts')).toBe('data');
    expect(detectCategory('packages/widgets/src/input/TextInput.ts')).toBe('input');
    expect(detectCategory('packages/jsx/src/hooks/usePackageManager.ts')).toBe('hook');
    expect(detectCategory('packages/ui/src/WelcomeScreen.ts')).toBe('template');
  });

  it('buildRegistryEntries returns an array with name/slug/package fields', () => {
    const entries = buildRegistryEntries();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    const first = entries[0]!;
    expect(first.name).toBeTruthy();
    expect(first.slug).toBeTruthy();
    expect(first.package).toMatch(/^@termuijs\//);
  });

  it('ProgressCircle entry exists in registry', () => {
    const entries = buildRegistryEntries();
    const pc = entries.find(e => e.name === 'ProgressCircle');
    expect(pc).toBeDefined();
    expect(pc!.slug).toBe('progress-circle');
    expect(pc!.package).toBe('@termuijs/widgets');
    expect(pc!.category).toBe('display');
  });

  it('usePackageManager hook entry exists', () => {
    const entries = buildRegistryEntries();
    const hook = entries.find(e => e.name === 'usePackageManager');
    expect(hook).toBeDefined();
    expect(hook!.category).toBe('hook');
    expect(hook!.package).toBe('@termuijs/jsx');
  });
});

// ─────────────────────────────────────────────────────
// @termuijs/quick — Shorthand widget constructors
// ─────────────────────────────────────────────────────

import type { Style, Color } from '@termuijs/core';
import {
    Text,
    Table,
    List,
    TextInput,
    Gauge as GaugeWidget,
    Sparkline as SparklineWidget,
    StatusIndicator as StatusWidget,
    LogView as LogViewWidget,
    Widget,
    Tree as TreeWidget,
    Skeleton as SkeletonWidget,
    Grid as GridWidget,
    BarChart as BarChartWidget,
    ProgressBar as ProgressBarWidget,
    Spinner as SpinnerWidget,
    JSONView as JSONViewWidget,
    DiffView as DiffViewWidget,
    StreamingText as StreamingTextWidget,
    ChatMessage as ChatMessageWidget,
    ToolCall as ToolCallWidget,
    CommandPalette as CommandPaletteWidget,
    MultiProgress as MultiProgressWidget,
} from '@termuijs/widgets';
import { Tabs, Select } from '@termuijs/ui';

import type { TreeNode, TreeOptions } from '@termuijs/widgets';
import type { BarGroup, BarChartOptions } from '@termuijs/widgets';
import type { SkeletonOptions } from '@termuijs/widgets';
import type { GridOptions } from '@termuijs/widgets';
import type { JSONViewOptions } from '@termuijs/widgets';
import type { DiffLine, DiffViewOptions } from '@termuijs/widgets';
import type { StreamingTextOptions } from '@termuijs/widgets';
import type { ChatMessageOptions } from '@termuijs/widgets';
import type { ToolCallOptions, ToolCallStatus } from '@termuijs/widgets';
import type { Command, CommandPaletteOptions } from '@termuijs/widgets';
import type { ProgressItem, MultiProgressOptions } from '@termuijs/widgets';
import type { Reactive } from './reactive.js';
import { resolve } from './reactive.js';

// ── Text ──

export interface QuickTextOptions {
    bold?: boolean;
    dim?: boolean;
    italic?: boolean;
    color?: Color;
    align?: 'left' | 'center' | 'right';
}

export function text(content: string | Reactive<string>, opts: QuickTextOptions = {}): Widget {
    const style: Partial<Style> = {
        height: 1,
        bold: opts.bold,
        dim: opts.dim,
        italic: opts.italic,
        fg: opts.color,
    };
    const resolved = typeof content === 'function' ? resolve(content) : content;
    const t = new Text(resolved, style, { align: opts.align });
    if (typeof content === 'function') {
        (t as any).__reactiveContent = content; // as any: Widget base has no reactive slot; patched at runtime
    }
    return t;
}

// ── Gauge ──

export interface QuickGaugeOptions {
    color?: Color;
}

export function gauge(label: string, value: Reactive<number>, opts: QuickGaugeOptions = {}): Widget {
    const g = new GaugeWidget(label, { height: 1, flexGrow: 1 }, {
        color: opts.color ?? { type: 'named', name: 'green' },
        showLabel: true,
    });
    g.setValue(resolve(value));
    (g as any).__reactiveValue = value; // as any: Widget base has no reactive slot; patched at runtime
    return g;
}

// ── Table ──

export type QuickTableRow = Record<string, string | number>;

export function table(
    title: string,
    data: Reactive<QuickTableRow[]>,
    columns: string[],
): Widget {
    const cols = columns.map(key => {
        return { header: key, key };
    });

    const resolved = resolve(data);
    const t = new Table(cols, resolved, {
        flexGrow: 1,
        border: 'single',
        borderColor: { type: 'named', name: 'brightBlack' },
        padding: 1,
    }, { stripe: true });

    (t as any).__reactiveData = data; // as any: Widget base has no reactive slot; patched at runtime
    (t as any).__tableTitle = title; // as any: Widget base has no reactive slot; patched at runtime
    return t;
}

// ── List ──

export interface QuickListOptions {
    selectable?: boolean;
    onSelect?: (index: number) => void;
    renderItem?: (item: string, index: number, selected: boolean) => string;
}

export function list(items: Reactive<string[]>, opts: QuickListOptions = {}): Widget {
    const resolved = resolve(items);
    const listItems = resolved.map(label => ({ label, value: label }));

    const onSelectCb = opts.onSelect
        ? (_item: any, idx: number) => opts.onSelect!(idx) // any: List callback provides full item; only index is used here
        : undefined;

    const l = new List(
        listItems,
        { flexGrow: 1, border: 'single', borderColor: { type: 'named', name: 'brightBlack' }, padding: 1 },
        onSelectCb,
    );

    (l as any).__reactiveItems = items; // as any: Widget base has no reactive slot; patched at runtime
    return l;
}

// ── Input ──

export interface QuickInputOptions {
    onSubmit?: (value: string) => void;
}

export function input(placeholder: string, opts: QuickInputOptions = {}): Widget {
    const i = new TextInput(
        { height: 1 },
        { placeholder, onSubmit: opts.onSubmit },
    );

    return i;
}

// ── Sparkline ──

export interface QuickSparklineOptions {
    color?: Color;
}

export function sparkline(label: string, data: Reactive<number[]>, opts: QuickSparklineOptions = {}): Widget {
    const s = new SparklineWidget(label, { height: 1, flexGrow: 1 }, {
        color: opts.color ?? { type: 'named', name: 'cyan' },
    });
    s.setData(resolve(data));
    (s as any).__reactiveData = data; // as any: Widget base has no reactive slot; patched at runtime
    return s;
}

// ── Status ──

export interface QuickStatusOptions {
    upColor?: Color;
    downColor?: Color;
}

export function status(label: string, isUp: Reactive<boolean>, opts: QuickStatusOptions = {}): Widget {
    const s = new StatusWidget(label, resolve(isUp), { height: 1, flexGrow: 1 }, {
        upColor: opts.upColor ?? { type: 'named', name: 'green' },
        downColor: opts.downColor ?? { type: 'named', name: 'red' },
    });
    (s as any).__reactiveStatus = isUp; // as any: Widget base has no reactive slot; patched at runtime
    return s;
}

// ── LogView ──

export interface QuickLogViewOptions {
    highlight?: Record<string, Color>;
}

export function logView(lines: Reactive<string[]>, opts: QuickLogViewOptions = {}): Widget {
    const lv = new LogViewWidget(
        { flexGrow: 1, border: 'single', borderColor: { type: 'named', name: 'brightBlack' }, padding: 1 },
        { highlight: opts.highlight, autoScroll: true },
    );
    lv.setLines(resolve(lines));
    (lv as any).__reactiveLines = lines; // as any: Widget base has no reactive slot; patched at runtime
    return lv;
}

// ── Tree ──

export interface QuickTreeOptions {
    onSelect?: (node: TreeNode, path: number[]) => void;
    indent?: number;
}

export function tree(data: TreeNode[], opts: QuickTreeOptions = {}): Widget {
    const options: TreeOptions = {
        nodes: data,
        onSelect: opts.onSelect,
        indent: opts.indent,
    };
    const t = new TreeWidget(options, {
        flexGrow: 1,
        border: 'single',
        borderColor: { type: 'named', name: 'brightBlack' },
        padding: 1,
    });
    (t as any).__reactiveTreeNodes = null; // as any: Widget base has no reactive slot; patched at runtime
    return t;
}

// ── Skeleton ──

export interface QuickSkeletonOptions {
    variant?: 'pulse' | 'shimmer';
    intervalMs?: number;
    color?: Color;
}

export function skeleton(opts: QuickSkeletonOptions = {}): Widget {
    const skeletonOpts: SkeletonOptions = {
        variant: opts.variant,
        intervalMs: opts.intervalMs,
        color: opts.color,
    };
    return new SkeletonWidget({ flexGrow: 1, height: 3 }, skeletonOpts);
}

// ── GridWidget ──

export interface QuickGridOptions {
    gap?: number;
    rowGap?: number;
    colGap?: number;
}

export function gridWidget(columns: number, items: Widget[], opts: QuickGridOptions = {}): Widget {
    const gridOpts: GridOptions = {
        columns,
        gap: opts.gap,
        rowGap: opts.rowGap,
        colGap: opts.colGap,
    };
    const g = new GridWidget({ flexGrow: 1 }, gridOpts);
    for (const item of items) {
        g.addChild(item);
    }
    return g;
}

// ── BarChart ──

export interface QuickBarChartOptions extends BarChartOptions {}

export function barChart(data: Reactive<BarGroup[]>, opts: QuickBarChartOptions = {}): Widget {
    const resolved = resolve(data);
    const bc = new BarChartWidget(resolved, { flexGrow: 1 }, opts);
    (bc as any).__reactiveBarData = data; // as any: Widget base has no reactive slot; patched at runtime
    return bc;
}

// ── ProgressBar ──

export interface QuickProgressBarOptions {
    color?: Color;
    showLabel?: boolean;
}

export function progressBar(value: Reactive<number>, opts: QuickProgressBarOptions = {}): Widget {
    const resolved = resolve(value);
    const pb = new ProgressBarWidget(
        { height: 1, flexGrow: 1 },
        {
            value: resolved,
            fillColor: opts.color ?? { type: 'named', name: 'green' },
            showLabel: opts.showLabel ?? true,
        },
    );
    (pb as any).__reactiveValue = value; // as any: Widget base has no reactive slot; patched at runtime
    return pb;
}

// ── Spinner ──

export interface QuickSpinnerOptions {
    label?: string;
    color?: Color;
}

export function spinner(opts: QuickSpinnerOptions = {}): Widget {
    return new SpinnerWidget(
        { height: 1 },
        {
            label: opts.label,
            color: opts.color,
        },
    );
}

// ── grid ──────────────────────────────────────────────────────────────────────

export function grid(columns: number, items: Widget[], opts: QuickGridOptions = {}): Widget {
    return gridWidget(columns, items, opts);
}

// ── JSONView ──────────────────────────────────────────────────────────────────

export interface QuickJSONViewOptions extends Pick<JSONViewOptions, 'onSelect' | 'indent'> {}

export function jsonView(data: unknown, opts: QuickJSONViewOptions = {}): Widget {
    return new JSONViewWidget({ data, ...opts }, { flexGrow: 1 });
}

// ── DiffView ──────────────────────────────────────────────────────────────────

export interface QuickDiffViewOptions extends Omit<DiffViewOptions, 'lines'> {}

export function diffView(diff: string | DiffLine[], opts: QuickDiffViewOptions = {}): Widget {
    const lines: DiffLine[] = typeof diff === 'string'
        ? diff.split('\n').map(line => {
              if (line.startsWith('+')) return { type: 'add' as const, content: line.slice(1) };
              if (line.startsWith('-')) return { type: 'remove' as const, content: line.slice(1) };
              return { type: 'context' as const, content: line };
          })
        : diff;
    return new DiffViewWidget({ lines, ...opts }, { flexGrow: 1 });
}

// ── StreamingText ─────────────────────────────────────────────────────────────

export function streamingText(opts: StreamingTextOptions, style: Partial<Style> = {}): Widget {
    return new StreamingTextWidget(opts, { flexGrow: 1, ...style });
}

// ── ChatMessage ───────────────────────────────────────────────────────────────

export function chatMessage(opts: ChatMessageOptions, style: Partial<Style> = {}): Widget {
    return new ChatMessageWidget(opts, { flexGrow: 1, ...style });
}

// ── ToolCall ──────────────────────────────────────────────────────────────────

export interface QuickToolCallOptions extends Omit<ToolCallOptions, 'args'> {
    args?: Record<string, unknown>;
}

export function toolCall(opts: QuickToolCallOptions, style: Partial<Style> = {}): Widget {
    return new ToolCallWidget({ args: {}, ...opts }, { flexGrow: 1, ...style });
}

// ── CommandPalette ────────────────────────────────────────────────────────────

export interface QuickCommand extends Omit<Command, 'id'> { id?: string; }

export function commandPalette(
    commands: QuickCommand[],
    opts: Omit<CommandPaletteOptions, 'commands'> = {},
): Widget {
    const fullCommands: Command[] = commands.map((c, i) => ({
        id: c.id ?? `cmd-${i}`,
        label: c.label,
        description: c.description,
        action: c.action,
    }));
    return new CommandPaletteWidget({ commands: fullCommands, ...opts }, { flexGrow: 1 });
}

// ── MultiProgress ─────────────────────────────────────────────────────────────

export function multiProgress(
    items: ProgressItem[] | Reactive<ProgressItem[]>,
    opts: Omit<MultiProgressOptions, 'items'> = {},
): Widget {
    const initialItems = resolve(items);
    const mp = new MultiProgressWidget({ items: initialItems, ...opts }, { flexGrow: 1 });
    if (typeof items === 'function') {
        (mp as any).__reactiveMultiItems = items; // as any: Widget base has no reactive slot; patched at runtime
    }
    return mp;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export interface QuickTabsOptions {
    /** Index of the initially active tab. Default: 0 */
    active?: number;
    /** Called when the active tab changes. */
    onChange?: (index: number) => void;
}

/** Tabbed container. `tabs` is a list of [label, content] pairs. */
export function tabs(items: Array<[string, Widget]>, opts?: QuickTabsOptions): Widget {
    const formattedTabs = items.map(([label, content]) => ({ label, content }));
    const t = new Tabs(formattedTabs, {
        activeIndex: opts?.active ?? 0,
        active: opts?.active ?? 0
    } as any); // as any: Tabs constructor options not exported from @termuijs/ui

    if (opts?.onChange) {
        if (typeof (t as any).on === 'function') { // as any: Tabs constructor options not exported from @termuijs/ui
            (t as any).on('change', opts.onChange); // as any: Tabs constructor options not exported from @termuijs/ui
        } else {
            (t as any).onChange = opts.onChange; // as any: Tabs constructor options not exported from @termuijs/ui
        }
    }

    return t;
}

// ── Select ────────────────────────────────────────────────────────────────────

export interface QuickSelectOptions {
    /** Called when an option is chosen. */
    onSelect?: (value: string, index: number) => void;
}

/** Single-choice select list from string options. */
export function select(options: string[], opts?: QuickSelectOptions): Widget {
    const formattedOptions = options.map(opt => ({ label: opt, value: opt }));
    return new Select(formattedOptions, {
        onSelect: opts?.onSelect 
            ? (option: any, index: number) => opts.onSelect!(option.value, index) // any: Widget base has no reactive slot; patched at runtime
            : undefined
    });
}

// ── Re-export types from @termuijs/widgets for convenience ──
export type { TreeNode } from '@termuijs/widgets';
export type { BarGroup, BarChartOptions } from '@termuijs/widgets';
export type { DiffLine, ToolCallStatus } from '@termuijs/widgets';
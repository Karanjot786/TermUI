// ─────────────────────────────────────────────────────
// @termuijs/jsx — Reconciler
//
// Converts VNode trees into real Widget trees.
// On re-render, diffs the old and new VNode trees
// and applies minimal Widget mutations.
// ─────────────────────────────────────────────────────

import {
    Box, Text, Widget, ProgressBar, Grid, Skeleton,
    StatusMessage, Banner, Card, KeyValue, Center, ScrollView, Sidebar,
    Spinner,
} from '@termuijs/widgets';
import type { Style, Color } from '@termuijs/core';
import { parseColor, invalidateLayout } from '@termuijs/core';
import type { VNode, VElement, FC } from './vnode.js';
import { isVElement, isVFragment, Fragment, flattenChildren } from './vnode.js';
import { applyDelegatedEvents } from './event-system.js';
import {
    createFiber, setCurrentFiber, clearCurrentFiber,
    runEffects, runLayoutEffects, destroyFiber, type Fiber,
} from './hooks.js';
import { ErrorBoundary } from './error-boundary.js';
import { Suspense } from './Suspense.js';
import { scheduleRender, currentFiber } from './hooks.js';
import { instanceMap, fiberToWidgetMap, suspendedFibers } from './globals.js';
// ── Component instance tracking ──

interface ComponentInstance {
    fiber: Fiber;
    component: FC<any>; // any: per-instance slot; specific type not knowable at interface definition
    props: Record<string, any>; // any: per-instance slot; specific type not knowable at interface definition
    children: VNode[];
    widget: Widget;
    childInstances: ComponentInstance[];
    lastVNode: VNode | Widget;
}

// ── Parent fiber tracking ──
// Tracks the currently-rendering fiber so child components
// can inherit the parent reference for context lookups.
let _parentFiber: Fiber | undefined = undefined;

// ── Intrinsic element mapping ──

/**  Map a string tag name to a Widget constructor call */
function createIntrinsicWidget(tag: string, props: Record<string, any>, children: VNode[]): Widget {
    const style = extractStyle(props);

    switch (tag.toLowerCase()) {
        case 'box': {
            const box = new Box({
                flexDirection: props.flexDirection ?? 'column',
                ...style,
            });
            return box;
        }

        case 'text': {
            // Children of Text are concatenated as content
            const content = children
                .map(c => (c == null || typeof c === 'boolean') ? '' : String(c))
                .join('');
            return new Text(content, {
                height: props.height ?? 1,
                ...style,
                bold: props.bold,
                dim: props.dim,
                italic: props.italic,
                fg: parseColorProp(props.color),
            }, { align: props.align });
        }

        case 'row': {
            return new Box({
                flexDirection: 'row',
                gap: props.gap ?? 1,
                ...style,
            });
        }

        case 'col':
        case 'column': {
            return new Box({
                flexDirection: 'column',
                ...style,
            });
        }

        case 'spacer': {
            return new Box({ flexGrow: props.grow ?? 1 });
        }

        case 'divider': {
            const char = props.char ?? '─';
            const color = parseColorProp(props.color) ?? { type: 'named' as const, name: 'brightBlack' as const };
            return new Text(char.repeat(200), {
                height: 1,
                fg: color,
                dim: true,
            });
        }

        case 'progressbar': {
            return new ProgressBar(style, {
                value: typeof props.value === 'number' ? props.value : 0,
                fillChar: props.fillChar,
                emptyChar: props.emptyChar,
                fillColor: props.fillColor ? parseColorProp(props.fillColor) : undefined,
                showLabel: props.showLabel !== false,
                labelFormat: props.labelFormat,
            });
        }

        case 'spinner': {
            return new Spinner(style, {
                preset: props.preset ?? props.spinner,
                label: props.label,
                color: props.color ? parseColorProp(props.color) : undefined,
                active: props.active !== false,
                doneText: props.doneText,
                interval: props.interval,
            });
        }

        case 'grid': {
            return new Grid({ ...style }, {
                columns: props.columns ?? 12,
                gap: props.gap,
                rows: props.rows,
            });
        }

        case 'skeleton': {
            return new Skeleton({ ...style }, {
                variant: props.variant,
                intervalMs: props.intervalMs,
                chars: props.chars,
            });
        }

        case 'statusmessage': {
            const content = children
                .map(c => (c == null || typeof c === 'boolean') ? '' : String(c))
                .join('') || props.message || '';
            return new StatusMessage(content, { height: 1, ...style }, {
                variant: props.variant,
                icon: props.icon,
            });
        }

        case 'banner': {
            return new Banner({ ...style }, {
                variant: props.variant,
                title: props.title,
                body: props.body,
            });
        }

        case 'card': {
            return new Card({ ...style }, {
                title: props.title,
                borderColor: props.borderColor ? parseColorProp(props.borderColor) : undefined,
            });
        }

        case 'keyvalue': {
            const pairs = props.pairs ?? props.data ?? {};
            return new KeyValue(pairs, { ...style }, {
                separator: props.separator,
                keyColor: props.keyColor ? parseColorProp(props.keyColor) : undefined,
                valueColor: props.valueColor ? parseColorProp(props.valueColor) : undefined,
            });
        }

        case 'center': {
            return new Center({ ...style }, {
                horizontal: props.horizontal !== false,
                vertical: props.vertical !== false,
            });
        }

        case 'scrollview': {
            return new ScrollView({ ...style }, {
                contentHeight: props.contentHeight,
                showScrollbar: props.showScrollbar !== false,
            });
        }

        case 'sidebar': {
            const items = props.items ?? [];
            return new Sidebar(items, { ...style }, {
                collapsed: props.collapsed,
                collapsedWidth: props.collapsedWidth,
                activeColor: props.activeColor ? parseColorProp(props.activeColor) : undefined,
                badgeColor: props.badgeColor ? parseColorProp(props.badgeColor) : undefined,
            });
        }

        default: {
            // Unknown tag — create a Box wrapper
            return new Box({ ...style });
        }
    }
}

/** Extract style-related props */
function extractStyle(props: Record<string, any>): Partial<Style> {
    const style: Partial<Style> = {};
    if (props.flexGrow != null) style.flexGrow = props.flexGrow;
    if (props.flexShrink != null) style.flexShrink = props.flexShrink;
    if (props.width != null) style.width = props.width;
    if (props.height != null) style.height = props.height;
    if (props.padding != null) style.padding = props.padding;
    if (props.margin != null) style.margin = props.margin;
    if (props.border != null) style.border = props.border;
    const ascii =
        typeof props.asciiOnly === 'string'
            ? props.asciiOnly.toLowerCase() === 'true'
            : !!props.asciiOnly;

    if (props.asciiOnly != null) style.asciiOnly = ascii;
    if (props.borderColor != null) style.borderColor = parseColorProp(props.borderColor);
    if (props.gap != null) style.gap = props.gap;
    if (props.x != null) style.x = props.x;
    if (props.y != null) style.y = props.y;
    if (props.groupId != null) style.groupId = props.groupId;
    if (props.constraints != null) style.constraints = props.constraints;
    return style;
}

/** Parse a color prop — accepts a named color string, hex string, or Color object */
function parseColorProp(value: any): Color | undefined { // any: JSX prop values are untyped at this call site
    if (!value) return undefined;
    if (typeof value === 'string') {
        if (value.startsWith('#')) return parseColor(value);
        return { type: 'named', name: value as any };
    }
    return value as Color;
}

// ── Reconciler ──

/**
 * Render a VNode tree into a real Widget tree.
 * This is called on every re-render cycle.
 */
export function reconcile(vnode: VNode, parentWidget?: Widget): Widget {
    // Null / boolean / undefined → empty box
    if (vnode == null || typeof vnode === 'boolean') {
        return new Box({ width: 0, height: 0 });
    }

    // String or number → Text widget
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return new Text(String(vnode), { height: 1 });
    }

    // Fragment — wrap children in a Box
    if (isVFragment(vnode)) {
        const box = new Box({ flexDirection: 'column' });
        for (const child of vnode.children) {
            box.addChild(reconcile(child, box));
        }
        return box;
    }

    // VElement
    if (isVElement(vnode)) {
        let { type, props, children } = vnode;
        children = flattenChildren(children ?? []);

        applyDelegatedEvents(props, children);

        // Map uppercase widget classes to their lowercase intrinsic tags
        const t = type as any;
        if (t === Box) type = 'box';
        else if (t === Text) type = 'text';
        else if (t === ProgressBar) type = 'progressbar';
        else if (t === Grid) type = 'grid';
        else if (t === Skeleton) type = 'skeleton';
        else if (t === StatusMessage) type = 'statusmessage';
        else if (t === Banner) type = 'banner';
        else if (t === Card) type = 'card';
        else if (t === KeyValue) type = 'keyvalue';
        else if (t === Center) type = 'center';
        else if (t === ScrollView) type = 'scrollview';
        else if (t === Sidebar) type = 'sidebar';
        else if (t === Spinner) type = 'spinner';

        // Suspense boundary — go through renderComponent so fiber context is set
        if (type === Suspense) {
            return renderComponent(SuspenseBoundary as any, props, children, (vnode as VElement).key);
        }

        // Functional component
        if (typeof type === 'function') {
            return renderComponent(type, props, children, (vnode as VElement).key);
        }

        // Intrinsic element (string tag)
        const { ref: refProp, ...restProps } = (props || {}) as Record<string, any>;
        const widget = createIntrinsicWidget(type, restProps, children);

        // Handle ref prop — set ref.current to the created widget
        if (refProp && typeof refProp === 'object' && 'current' in refProp) {
            refProp.current = widget;
        }

        // Add children (except for self-contained widgets that handle content via props/internal render)
        const SELF_CONTAINED = new Set(['text', 'statusmessage', 'banner', 'keyvalue', 'sidebar', 'divider', 'spinner']);
        if (!SELF_CONTAINED.has(type.toLowerCase())) {
            for (const child of children) {
                widget.addChild(reconcile(child, widget));
            }
        }

        return widget;
    }

    // Fallback
    return new Box({ width: 0, height: 0 });
}

// ── ErrorBoundary helpers ──

/** Walk the fiber parent chain looking for the nearest error boundary */
function findErrorBoundary(fiber: Fiber): Fiber | undefined {
    let f: Fiber | undefined = fiber.parent;
    while (f) {
        if (f.isErrorBoundary) return f;
        f = f.parent;
    }
    return undefined;
}

/** Default fallback VNode shown when no ErrorBoundary is present */
function defaultErrorVNode(err: Error): VNode {
    return {
        type: 'box',
        props: { border: 'single', borderColor: 'red', padding: 1 },
        children: [
            { type: 'text', props: { color: 'red', bold: true }, children: ['Error'] },
            { type: 'text', props: {}, children: [err.message] },
        ],
    } as any;
}

/**
 * SuspenseBoundary — a component wrapper that reconciles children and, if a
 * lazy-loaded component throws a Promise, renders the fallback instead.
 * Because it goes through renderComponent(), the fiber context
 * (_currentFiber, _parentFiber) is correctly set, so the fallback subtree
 * has proper parent references, context propagation, and error boundary
 * traversal.
 *
 * The thrown Promise is stored so that when it resolves, a re-render of
 * this boundary is scheduled. On re-render the lazy component's module is
 * available and the real content replaces the fallback.
 */
function SuspenseBoundary(props: Record<string, any>): any {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    const child = children.length === 1 ? children[0] : {
        type: Fragment,
        props: {},
        children,
    } as any;

    // Capture fiber before reconcile: renderComponent clears _currentFiber
    // when a Promise is thrown (to prevent stale hook context for error
    // boundaries), so currentFiber() in the catch block would fail.
    const thisFiber = currentFiber();

    try {
        return reconcile(child);
    } catch (err) {
        if (err instanceof Promise) {
            suspendedFibers.set(thisFiber.id, { promise: err, fiber: thisFiber });
            err.then(() => {
            .catch(err => console.error(err))
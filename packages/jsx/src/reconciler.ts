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
// ── Component instance tracking ──

interface ComponentInstance {
    fiber: Fiber;
    component: FC<any>;
    props: Record<string, any>;
    children: VNode[];
    widget: Widget;
    childInstances: ComponentInstance[];
    lastVNode: VNode | Widget;
}

const _instanceMap = new Map<Widget, ComponentInstance>();
/** Reverse map: Fiber → Widget for O(1) cleanup in destroyFiber */
const _fiberToWidgetMap = new Map<Fiber, Widget>();
// Expose globally so render() and @termuijs/testing can dispatch to useInput handlers and destroyFiber
(globalThis as any).__termuijs_instances = _instanceMap;
(globalThis as any).__termuijs_fiberToWidget = _fiberToWidgetMap;

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
                rowGap: props.rowGap,
                colGap: props.colGap,
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
function parseColorProp(value: any): Color | undefined {
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
        const widget = createIntrinsicWidget(type, props, children);

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
 */
function SuspenseBoundary(props: Record<string, any>): any {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    const child = children.length === 1 ? children[0] : {
        type: Fragment,
        props: {},
        children,
    } as any;

    try {
        return reconcile(child);
    } catch (err) {
        if (err instanceof Promise) {
            return reconcile(props.fallback ?? null);
        }
        throw err;
    }
}

/** Destroy child fibers in _prevChildFibers that were not re-visited this render */
function cleanupStaleChildFibers(fiber: Fiber): void {
    if (!fiber._prevChildFibers) return;
    for (const [key, entry] of fiber._prevChildFibers) {
        if (!fiber.childFibers?.has(key)) {
            destroyFiber(entry.fiber);
        }
    }
    fiber._prevChildFibers = undefined;
}

/**
 * Render a functional component — set up fiber, call the function, reconcile output.
 * Fibers are reused across renders by identity key (position + component name) so
 * useState/useEffect state survives re-renders. Component errors are routed to the
 * nearest ErrorBoundary.
 */
function renderComponent(
    component: FC<any>,
    props: Record<string, any>,
    children: VNode[] = [],
    key?: string | number
): Widget {
    const parentFiber = _parentFiber;

    // ── Fiber identity / reuse ──────────────────────────
    // Look up an existing child fiber from the previous render.
    // This preserves useState/useEffect state across reconcile passes.
    const childIdx = parentFiber ? (parentFiber._nextChildIdx ?? 0) : 0;
    if (parentFiber) parentFiber._nextChildIdx = childIdx + 1;

    const componentName = (component as any).displayName ?? (component as any).name ?? 'anon';
    const identityKey = key != null ? String(key) : `${childIdx}:${componentName}`;

    let fiber: Fiber;
    if (parentFiber?._prevChildFibers) {
        const existing = parentFiber._prevChildFibers.get(identityKey);
        if (existing && existing.component === component) {
            fiber = existing.fiber;
            // Transfer to current render's childFibers
            parentFiber.childFibers!.set(identityKey, { fiber, component });
        } else {
            // Different component at this position — destroy old, create new
            if (existing) destroyFiber(existing.fiber);
            fiber = createFiber(parentFiber);
            parentFiber.childFibers!.set(identityKey, { fiber, component });
        }
    } else {
        fiber = createFiber(parentFiber);
        if (parentFiber?.childFibers) {
            parentFiber.childFibers.set(identityKey, { fiber, component });
        }
    }

    // Mark ErrorBoundary fibers so the error handler can find them
    if (component === ErrorBoundary) {
        fiber.isErrorBoundary = true;
        const fallbackFn = props.fallback as ((err: Error) => VNode) | undefined;
        const onError = props.onError as ((err: Error) => void) | undefined;
        fiber.errorFallback = (err: Error) => {
            onError?.(err);
            return fallbackFn ? fallbackFn(err) : defaultErrorVNode(err);
        };
    }

    // Push this fiber as the parent for any child components
    const prevParent = _parentFiber;
    _parentFiber = fiber;

    // Set the current fiber context for hooks
    setCurrentFiber(fiber);

    // Call the component function — catch any render-time errors
    let vnode: VNode | Widget;
    try {
        vnode = component({ ...props, children: children.length === 1 ? children[0] : children });
        } catch (err) {
            clearCurrentFiber();
            _parentFiber = prevParent;

            if (err instanceof Promise) {
                throw err;
            }

            const error = err instanceof Error ? err : new Error(String(err));
            const boundary = findErrorBoundary(fiber);
            if (boundary?.errorFallback) {
                destroyFiber(fiber);
                _parentFiber = boundary;
                const fallbackVNode = boundary.errorFallback(error);
                return reconcile(fallbackVNode);
            }
            // No boundary found — destroy fiber and show default error widget
            destroyFiber(fiber);
            console.error('[TermUI] Unhandled component error:', error);
            return reconcile(defaultErrorVNode(error));
        }

    clearCurrentFiber();

    if (vnode instanceof Widget) {
        _parentFiber = prevParent;

        cleanupStaleChildFibers(fiber);
        runLayoutEffects(fiber);
        runEffects(fiber);

        _instanceMap.set(vnode, {
            fiber,
            component,
            props,
            children,
            widget: vnode,
            childInstances: [],
            lastVNode: vnode,
        });
        _fiberToWidgetMap.set(fiber, vnode);

        return vnode;
    }

    // Reconcile the returned VNode into a real widget
    const widget = reconcile(vnode);

    // Restore parent fiber
    _parentFiber = prevParent;

    // Destroy any child fibers not visited during this render (component unmounted)
    cleanupStaleChildFibers(fiber);

    // Run effects after render
    runLayoutEffects(fiber);
    runEffects(fiber);

    // Store instance for cleanup and re-renders
    _instanceMap.set(widget, {
        fiber,
        component,
        props,
        children,
        widget,
        childInstances: [],
        lastVNode: vnode,
    });
    _fiberToWidgetMap.set(fiber, widget);

    return widget;
}

/**
 * Recursively remove stale _instanceMap entries for a widget and all its
 * descendants. Fiber destruction is handled separately by
 * cleanupStaleChildFibers for stale subtrees after each reconcile pass.
 */
/** @internal exposed for testing */
export function _pruneInstancesForWidget(widget: Widget): void {
    const instance = _instanceMap.get(widget);
    if (instance && _fiberToWidgetMap.get(instance.fiber) === widget) {
        _fiberToWidgetMap.delete(instance.fiber);
    }
    _instanceMap.delete(widget);

    const children = widget.children;
    if (Array.isArray(children)) {
        for (const child of children) {
            if (child && typeof child === 'object') {
                _pruneInstancesForWidget(child);
            }
        }
    }
}

/**
 * Re-render a component (called when useState triggers a state change).
 */
export function reRenderComponent(instance: ComponentInstance): Widget {
    const { fiber, component, props, children } = instance;

    // Push this fiber as the parent for any child components
    const prevParent = _parentFiber;
    _parentFiber = fiber;

    setCurrentFiber(fiber);

    // Call the component function — catch any render-time errors (same as renderComponent)
    let vnode: VNode | Widget;
    try {
        vnode = component({ ...props, children: children.length === 1 ? children[0] : children });
    } catch (rawErr) {
        clearCurrentFiber();
        _parentFiber = prevParent;

        if (rawErr instanceof Promise) {
            throw rawErr;
        }

        const err = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
        const boundary = findErrorBoundary(fiber);
        if (boundary?.errorFallback) {
            destroyFiber(fiber);
            _pruneInstancesForWidget(instance.widget);
            invalidateLayout(instance.widget.getLayoutNode());
            _parentFiber = boundary;
            return reconcile(boundary.errorFallback(err));
        }
        // No error boundary found — destroy fiber and prune old widget
        destroyFiber(fiber);
        _pruneInstancesForWidget(instance.widget);
        invalidateLayout(instance.widget.getLayoutNode());
        console.error('[TermUI] Unhandled component error:', err);
        return reconcile(defaultErrorVNode(err));
    }

    clearCurrentFiber();

    if (vnode instanceof Widget) {
        _parentFiber = prevParent;

        cleanupStaleChildFibers(fiber);
        runLayoutEffects(fiber);
        runEffects(fiber);
        fiber.isDirty = false;

        // Invalidate old widget's layout cache before replacing
        invalidateLayout(instance.widget.getLayoutNode());
        _pruneInstancesForWidget(instance.widget);

        instance.widget = vnode;
        instance.lastVNode = vnode;
        _instanceMap.set(vnode, instance);
        _fiberToWidgetMap.set(fiber, vnode);

        return vnode;
    }

    // memo() optimization: if component returned same VNode reference, skip widget rebuild
    if (vnode === instance.lastVNode) {
        _parentFiber = prevParent;
        runLayoutEffects(fiber);
        runEffects(fiber);
        fiber.isDirty = false;
        return instance.widget;
    }

    // Rebuild the widget tree (fiber state is preserved via childFibers reuse)
    // Push fiber as parent so child components maintain their parent reference
    // for context lookups and error boundary traversal during re-renders.
    _parentFiber = fiber;
    const newWidget = reconcile(vnode);
    _parentFiber = prevParent;

    // Destroy child fibers not visited during this render
    cleanupStaleChildFibers(fiber);

    runLayoutEffects(fiber);
    runEffects(fiber);
    fiber.isDirty = false;

    // Invalidate old widget's layout cache before replacing
    invalidateLayout(instance.widget.getLayoutNode());
    // Remove old widget and all its descendant instances from the map to prevent memory leak
    _pruneInstancesForWidget(instance.widget);

    instance.widget = newWidget;
    instance.lastVNode = vnode;

    // Re-register with new widget
    _instanceMap.set(newWidget, instance);
    _fiberToWidgetMap.set(fiber, newWidget);

    return newWidget;
}

/**
 * Unmount all component instances — run cleanups.
 */
export function unmountAll(): void {
    for (const [, instance] of _instanceMap) {
        destroyFiber(instance.fiber);
    }
    _instanceMap.clear();
    _fiberToWidgetMap.clear();
}

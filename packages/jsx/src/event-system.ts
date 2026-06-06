import { type VNode, isVElement, isVFragment, Fragment } from './vnode.js';

export interface DelegatedEvent<E = any /* Supports various DOM/custom event shapes where type cannot be inferred */> {
    from: string;
    handler: (event?: E) => void;
}

/**
 * Checks if a set of props matches a CSS-style selector.
 * Supported selectors:
 * - `#id`: matches props.id
 * - `.class`: matches props.class or props.className
 */
export function matchesSelector(props: Record<string, any /* Props are arbitrary attributes from JSX runtime */>, selector: string): boolean {
    if (!selector) return false;

    // ID selector
    if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return props.id === id;
    }

    // Class selector
    if (selector.startsWith('.')) {
        const className = selector.slice(1);
        const classProp = props.class || props.className || '';
        const classes = classProp.split(/\s+/).filter(Boolean);
        return classes.includes(className);
    }

    return false;
}

type EventHandler = (...args: unknown[]) => unknown;

/**
 * Scans the props of a container element for delegated event handlers
 * (e.g., onPress={{ from: '#btn', handler: ... }}) and applies them
 * to any descendant VNode that matches the selector.
 */
export function applyDelegatedEvents(props: Record<string, unknown>, children: VNode[]): void {
    const delegates: Array<{ propName: string; from: string; handler: EventHandler }> = [];

    for (const key of Object.keys(props)) {
        if (key.startsWith('on')) {
            const value = props[key];
            if (value && typeof value === 'object' && 'from' in value && 'handler' in value) {
                delegates.push({
                    propName: key,
                    from: (value as any).from, // Cast required: TS cannot infer props on 'unknown' even after 'in' check
                    handler: (value as any).handler, // Cast required: same reason as above
                });
                delete props[key];
            }
        }
    }

    if (delegates.length === 0) return;

    function traverse(nodes: VNode[]) {
        for (const node of nodes) {
            if (isVElement(node)) {
                for (const delegate of delegates) {
                    if (matchesSelector(node.props, delegate.from)) {
                        const existing = node.props[delegate.propName];
                        if (existing && typeof existing === 'function') {
                            const handler = delegate.handler;
                            node.props[delegate.propName] = (...args: unknown[]) => {
                                existing(...args);
                                handler(...args);
                            };
                        } else {
                            node.props[delegate.propName] = delegate.handler;
                        }
                    }
                }
                if (node.children) {
                    traverse(node.children);
                }
            } else if (isVFragment(node)) {
                traverse(node.children);
            }
        }
    }

    traverse(children);
}

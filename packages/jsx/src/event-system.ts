import { type VNode, isVElement, Fragment } from './vnode.js';

export interface DelegatedEvent<E = any> {
    from: string;
    handler: (event?: E) => void;
}

/**
 * Checks if a set of props matches a CSS-style selector.
 * Supported selectors:
 * - `#id`: matches props.id
 * - `.class`: matches props.class or props.className
 */
export function matchesSelector(props: Record<string, any>, selector: string): boolean {
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

/**
 * Scans the props of a container element for delegated event handlers
 * (e.g., onPress={{ from: '#btn', handler: ... }}) and applies them
 * to any descendant VNode that matches the selector.
 */
export function applyDelegatedEvents(props: Record<string, any>, children: VNode[]): void {
    const delegates: Array<{ propName: string; from: string; handler: any }> = [];

    for (const key of Object.keys(props)) {
        if (key.startsWith('on')) {
            const value = props[key];
            if (value && typeof value === 'object' && 'from' in value && 'handler' in value) {
                delegates.push({
                    propName: key,
                    from: value.from,
                    handler: value.handler,
                });
                delete props[key];
            }
        }
    }

    if (delegates.length === 0) return;

    function traverse(nodes: VNode[]) {
        for (const node of nodes) {
            if (isVElement(node)) {
                let matched = false;
                for (const delegate of delegates) {
                    if (matchesSelector(node.props, delegate.from)) {
                        const existing = node.props[delegate.propName];
                        if (existing && typeof existing === 'function') {
                            const handler = delegate.handler;
                            node.props[delegate.propName] = (...args: any[]) => {
                                existing(...args);
                                handler(...args);
                            };
                        } else {
                            node.props[delegate.propName] = delegate.handler;
                        }
                        matched = true;
                    }
                }
                if (node.children) {
                    traverse(node.children);
                }
            } else if (node && typeof node === 'object' && 'type' in node && (node as any).type === Fragment) {
                traverse((node as any).children);
            }
        }
    }

    traverse(children);
}

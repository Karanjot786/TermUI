import { currentFiber, scheduleRender, type ContextSubscription, type Fiber } from './hooks.js';
import type { VNode, FC } from './vnode.js';

export interface Context<T> {
    readonly _id: symbol;
    readonly Provider: FC<{ value: T; children?: VNode | VNode[] }>;
    readonly defaultValue: T;
}

export type ContextSelector<T, S> = (value: T) => S;
export type ContextEqualityFn<S> = (a: S, b: S) => boolean;

export function createContext<T>(defaultValue: T): Context<T> {
    const id = Symbol('context');

    const Provider: FC<{ value: T; children?: VNode | VNode[] }> = ({ value, children }) => {
        const fiber = currentFiber();
        const oldValue = fiber.contextValues.get(id);
        const hasOldValue = fiber.contextValues.has(id);
        fiber.contextValues.set(id, value);

        if (hasOldValue && !Object.is(oldValue, value)) {
            const subs = fiber.contextSubscribers?.get(id);
            if (subs) {
                for (const sub of subs) {
                    if (!sub.selector) {
                        scheduleRender(sub.fiber);
                        continue;
                    }

                    const nextSelected = sub.selector(value);
                    const equal = sub.equalityFn ?? Object.is;
                    if (!equal(sub.selectedValue, nextSelected)) {
                        sub.selectedValue = nextSelected;
                        scheduleRender(sub.fiber);
                    }
                }
            }
        }

        if (Array.isArray(children)) {
            return { type: Symbol.for('termui.fragment'), children } as any;
        }
        return (children ?? null) as VNode;
    };

    (Provider as any).displayName = 'Context.Provider';

    return Object.freeze({ _id: id, Provider, defaultValue });
}

export function useContext<T>(context: Context<T>): T {
    return readContext(context, value => value, undefined, false);
}

export function useContextSelector<T, S>(
    context: Context<T>,
    selector: ContextSelector<T, S>,
    equalityFn: ContextEqualityFn<S> = Object.is,
): S {
    return readContext(context, selector, equalityFn, true);
}

function readContext<T, S>(
    context: Context<T>,
    selector: ContextSelector<T, S>,
    equalityFn: ContextEqualityFn<S> | undefined,
    selected: boolean,
): S {
    const fiber = currentFiber();

    let current: Fiber | undefined = fiber;
    while (current) {
        if (current.contextValues.has(context._id)) {
            const value = current.contextValues.get(context._id) as T;
            const selectedValue = selector(value);
            subscribeToContext(current, context._id, fiber, selected ? selector : undefined, selectedValue, equalityFn);
            return selectedValue;
        }
        current = current.parent;
    }

    return selector(context.defaultValue);
}

function subscribeToContext<T, S>(
    provider: Fiber,
    id: symbol,
    consumer: Fiber,
    selector: ContextSelector<T, S> | undefined,
    selectedValue: S,
    equalityFn: ContextEqualityFn<S> | undefined,
): void {
    if (!provider.contextSubscribers) provider.contextSubscribers = new Map();
    let subs = provider.contextSubscribers.get(id);
    if (!subs) {
        subs = new Set();
        provider.contextSubscribers.set(id, subs);
    }

    const existing = [...subs].find(sub => sub.fiber === consumer);
    if (existing) {
        existing.selector = selector;
        existing.selectedValue = selectedValue;
        existing.equalityFn = equalityFn as ContextEqualityFn<any> | undefined;
        return;
    }

    const subscription: ContextSubscription = {
        fiber: consumer,
        providerSubscribers: subs,
        selector,
        selectedValue,
        equalityFn: equalityFn as ContextEqualityFn<any> | undefined,
    };

    subs.add(subscription);

    if (!consumer.contextDependencies) consumer.contextDependencies = new Set();
    consumer.contextDependencies.add(subscription);
}

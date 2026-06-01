// ─────────────────────────────────────────────────────
// @termuijs/jsx — useModal
//
// Lightweight typed modal dialog controller with FIFO queueing.
// Each modal is shown in order, and show() resolves when the
// active modal is dismissed or hidden.
//
// Usage:
//   const confirm = useModal<{ message: string }, boolean>();
//   const ok = await confirm.show({ message: 'Delete this file?' });
// ─────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from '../hooks.js';

interface ModalEntry<Props, Result> {
    props: Props | undefined;
    resolve: (value: Result | undefined) => void;
}

type ModalShow<Props, Result> = [Props] extends [undefined]
    ? () => Promise<Result | undefined>
    : (props: Props) => Promise<Result | undefined>;

export interface UseModalResult<Props = unknown, Result = unknown> {
    /** True when a modal is currently active */
    visible: boolean;
    /** Props passed to the active modal, or undefined when no modal is active */
    props?: Props;
    /** Show a modal and await its resolution */
    show: ModalShow<Props, Result>;
    /** Hide the active modal and resolve it with undefined */
    hide: () => void;
    /** Dismiss the active modal and resolve it with the provided value */
    dismiss: (value: Result) => void;
}

/**
 * useModal — typed modal manager with queueing and cleanup.
 *
 * Manages a queue of modals and shows them one at a time. Each modal
 * can be dismissed with a typed result value or hidden (resolving undefined).
 * Modals are processed in FIFO order.
 *
 * ```tsx
 * const confirm = useModal<{ message: string }, boolean>();
 * const ok = await confirm.show({ message: 'Delete this file?' });
 * if (ok === true) deleteFile();
 * ```
 */
export function useModal<Props = unknown, Result = unknown>(): UseModalResult<Props, Result> {
    const [visible, setVisible] = useState(false);
    const [props, setProps] = useState<Props | undefined>(undefined);
    const queueRef = useRef<ModalEntry<Props, Result>[]>([]);

    // Cleanup on unmount: resolve all pending modals with undefined
    useEffect(() => {
        return () => {
            const queue = queueRef.current.splice(0);
            for (const entry of queue) {
                entry.resolve(undefined);
            }
        };
    }, []);

    const advanceQueue = useCallback(() => {
        const queue = queueRef.current;

        queue.shift();

        if (queue.length > 0) {
            setProps(queue[0]!.props);
            setVisible(true);
            return;
        }

        setProps(undefined);
        setVisible(false);
    }, []);

    const show = useCallback(((nextProps?: Props) => {
        return new Promise<Result | undefined>((resolve) => {
            const queue = queueRef.current;
            queue.push({ props: nextProps as Props | undefined, resolve });

            if (queue.length === 1) {
                setProps(nextProps as Props | undefined);
                setVisible(true);
            }
        });
    }) as ModalShow<Props, Result>, []);

    const hide = useCallback(() => {
        const queue = queueRef.current;
        if (queue.length === 0) return;

        queue[0]!.resolve(undefined);
        advanceQueue();
    }, [advanceQueue]);

    const dismiss = useCallback((value: Result) => {
        const queue = queueRef.current;
        if (queue.length === 0) return;

        queue[0]!.resolve(value);
        advanceQueue();
    }, [advanceQueue]);

    return {
        visible,
        props,
        show,
        hide,
        dismiss,
    };
}

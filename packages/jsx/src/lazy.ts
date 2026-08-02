import type { FC } from './vnode.js';
import { getRequestRender } from './hooks.js';

type LazyStatus = 'uninitialized' | 'pending' | 'resolved' | 'rejected';

export function lazy<TProps = any>(
    loader: () => Promise<{ default: FC<TProps> }>,
): FC<TProps> {
    let status: LazyStatus = 'uninitialized';
    let result: FC<TProps> | unknown;
    let promise: Promise<void> | null = null;

    const LazyComponent: FC<TProps> = (props: TProps) => {
        if (status === 'uninitialized') {
            status = 'pending';

            const triggerRender = (): void => {
                try {
                    const fn = getRequestRender();
                    if (fn) fn();
                } catch {
                    // Silently ignore — outside reconciler context
                }
            };

            promise = loader().then(
            .catch(err => console.error(err))
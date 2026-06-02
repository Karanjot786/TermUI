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

            promise = loader().then(
                (mod) => {
                    status = 'resolved';
                    result = mod.default;
                    getRequestRender()?.();
                },
                (err) => {
                    status = 'rejected';
                    result = err;
                    getRequestRender()?.();
                },
            );

            throw promise;
        }

        if (status === 'pending') {
            throw promise;
        }

        if (status === 'rejected') {
            throw result;
        }

        const Component = result as FC<TProps>;
        return Component(props as TProps & { children?: any });
    };

    return LazyComponent;
}
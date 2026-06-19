export interface UseWorkerOptions {
    exclusive?: boolean;
    group?: string;
}

export interface UseWorkerResult<TArgs extends unknown[], TResult> {
    run: (...args: TArgs) => Promise<TResult>;
    cancel: () => void;
    readonly status: 'idle' | 'running';
}

/**
 * Module-level map of group name → AbortController.
 * Group names must be stable/static across renders (not generated dynamically per render)
 * because this map is never cleaned up when a group becomes empty.
 * For temporary or dynamic groups, create an AbortController inside the component instead.
 */
const groupControllers = new Map<string, AbortController>();

export function useWorker<TArgs extends unknown[], TResult>(
    worker: (
        signal: AbortSignal,
        ...args: TArgs
    ) => Promise<TResult>,
    options: UseWorkerOptions = {},
): UseWorkerResult<TArgs, TResult> {
    let controller: AbortController | null = null;
    let status: 'idle' | 'running' = 'idle';

    async function run(...args: TArgs): Promise<TResult> {
        if (options.exclusive && options.group) {
            const existing = groupControllers.get(options.group);

            if (existing && !existing.signal.aborted) {
                existing.abort();
            }
        }

        controller = new AbortController();

        if (options.exclusive && options.group) {
            groupControllers.set(options.group, controller);
        }

        status = 'running';

        try {
            return await worker(controller.signal, ...args);
        } finally {
            status = 'idle';

            if (
                options.exclusive &&
                options.group &&
                groupControllers.get(options.group) === controller
            ) {
                groupControllers.delete(options.group);
            }
        }
    }

    function cancel(): void {
        controller?.abort();
    }

    return {
        run,
        cancel,
        get status() {
            return status;
        },
    };
}
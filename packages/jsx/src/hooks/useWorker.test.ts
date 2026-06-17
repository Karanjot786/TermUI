import { describe, it, expect } from 'vitest';
import { useWorker } from './useWorker.js';

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {
        promise,
        resolve,
        reject,
    };
}

describe('useWorker', () => {
    it('passes AbortSignal to worker', async () => {
        let received!: AbortSignal;

        const worker = useWorker(async signal => {
            received = signal;
            return 'ok';
        });

        const result = await worker.run();

        expect(result).toBe('ok');
        expect(received).toBeInstanceOf(AbortSignal);
    });

    it('cancels previous call in the same exclusive group', async () => {
        const signals: AbortSignal[] = [];

        const gate1 = deferred<void>();
        const gate2 = deferred<void>();

        const worker = useWorker(
            async (signal, value: number) => {
                signals.push(signal);

                if (value === 1) {
                    await gate1.promise;
                } else {
                    await gate2.promise;
                }

                return value;
            },
            {
                exclusive: true,
                group: 'search',
            },
        );

        void worker.run(1);
        void worker.run(2);

        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);

        gate1.resolve();
        gate2.resolve();
    });

    it('allows concurrent runs when not exclusive', async () => {
        const signals: AbortSignal[] = [];

        const gate1 = deferred<void>();
        const gate2 = deferred<void>();

        const worker = useWorker(async (signal, value: number) => {
            signals.push(signal);

            if (value === 1) {
                await gate1.promise;
            } else {
                await gate2.promise;
            }

            return value;
        });

        void worker.run(1);
        void worker.run(2);

        expect(signals).toHaveLength(2);
        expect(signals[0].aborted).toBe(false);
        expect(signals[1].aborted).toBe(false);

        gate1.resolve();
        gate2.resolve();
    });

    it('cancel aborts the current run', async () => {
        let signal!: AbortSignal;

        const gate = deferred<void>();

        const worker = useWorker(async s => {
            signal = s;
            await gate.promise;
        });

        void worker.run();

        worker.cancel();

        expect(signal.aborted).toBe(true);

        gate.resolve();
    });

    it('does not cancel workers in different groups', async () => {
        let signalA!: AbortSignal;
        let signalB!: AbortSignal;

        const gateA = deferred<void>();
        const gateB = deferred<void>();

        const workerA = useWorker(
            async signal => {
                signalA = signal;
                await gateA.promise;
            },
            {
                exclusive: true,
                group: 'search',
            },
        );

        const workerB = useWorker(
            async signal => {
                signalB = signal;
                await gateB.promise;
            },
            {
                exclusive: true,
                group: 'upload',
            },
        );

        void workerA.run();
        void workerB.run();

        expect(signalA.aborted).toBe(false);
        expect(signalB.aborted).toBe(false);

        gateA.resolve();
        gateB.resolve();
    });

    it('updates status while running', async () => {
        const gate = deferred<void>();

        const worker = useWorker(async () => {
            await gate.promise;
            return 'done';
        });

        const promise = worker.run();

        expect(worker.status).toBe('running');

        gate.resolve();

        await promise;

        expect(worker.status).toBe('idle');
    });
});
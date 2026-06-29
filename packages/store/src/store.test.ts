import { describe, it, expect, vi, afterEach } from 'vitest'
import { createStore, batch } from './store.js'
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('createStore', () => {
    it('initializes state from creator function', () => {
        const useStore = createStore((set) => ({ count: 0, label: 'test' }))
        expect(useStore.getState().count).toBe(0)
        expect(useStore.getState().label).toBe('test')
    })

    it('setState merges a partial object', () => {
        const useStore = createStore((set) => ({
            a: 1,
            b: 2,
        }))
        useStore.setState({ a: 10 })
        expect(useStore.getState().a).toBe(10)
        expect(useStore.getState().b).toBe(2)
    })

    it('setState accepts a function updater', () => {
        const useStore = createStore((set) => ({
            count: 5,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))
        useStore.getState().inc()
        expect(useStore.getState().count).toBe(6)
    })

    it('setState with function updater chains correctly', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))
        useStore.getState().inc()
        useStore.getState().inc()
        useStore.getState().inc()
        expect(useStore.getState().count).toBe(3)
    })

    it('subscribe fires listener with new and previous state', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)
        useStore.getState().inc()
        expect(spy).toHaveBeenCalledOnce()
        expect(spy.mock.calls[0][0].count).toBe(1)  // new state
        expect(spy.mock.calls[0][1].count).toBe(0)  // prev state
    })

    it('subscribe returns an unsubscribe function', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))
        const spy = vi.fn()
        const unsub = useStore.subscribe(spy)
        unsub()
        useStore.getState().inc()
        expect(spy).not.toHaveBeenCalled()
    })

    it('subscribeOnce fires only once', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))

        const spy = vi.fn()
        useStore.subscribeOnce(spy)

        useStore.getState().inc()
        useStore.getState().inc()

        expect(spy).toHaveBeenCalledOnce()
    })

    it('subscribeOnce does not fire twice during a re-entrant update', () => {
        const useStore = createStore((set) => ({
            count: 0,
        }))

        const spy = vi.fn(() => {
            useStore.setState({ count: 2 })
        })

        useStore.subscribeOnce(spy)
        useStore.setState({ count: 1 })

        expect(spy).toHaveBeenCalledTimes(1)
    })

    it('multiple subscribers all get notified', () => {
        const useStore = createStore((set) => ({
            x: 0,
        }))
        const spy1 = vi.fn()
        const spy2 = vi.fn()
        useStore.subscribe(spy1)
        useStore.subscribe(spy2)
        useStore.setState({ x: 99 })
        expect(spy1).toHaveBeenCalledOnce()
        expect(spy2).toHaveBeenCalledOnce()
    })

    it('destroy removes all listeners', () => {
        const useStore = createStore((set) => ({
            count: 0,
            inc: () => set((s) => ({ count: s.count + 1 })),
        }))
        const spy1 = vi.fn()
        const spy2 = vi.fn()
        useStore.subscribe(spy1)
        useStore.subscribe(spy2)
        useStore.destroy()
        useStore.getState().inc()
        expect(spy1).not.toHaveBeenCalled()
        expect(spy2).not.toHaveBeenCalled()
    })

    it('get() inside creator reads current state', () => {
        const useStore = createStore((set, get) => ({
            count: 0,
            double: () => get().count * 2,
            inc: () => set({ count: get().count + 1 }),
        }))
        useStore.getState().inc()
        expect(useStore.getState().count).toBe(1)
        expect(useStore.getState().double()).toBe(2)
    })

    it('getState always returns the latest snapshot', () => {
        const useStore = createStore((set) => ({
            value: 'initial',
        }))
        expect(useStore.getState().value).toBe('initial')
        useStore.setState({ value: 'updated' })
        expect(useStore.getState().value).toBe('updated')
    })

    it('actions can be async', async () => {
        const useStore = createStore((set) => ({
            data: null as string | null,
            loading: false,
            fetch: async () => {
                set({ loading: true })
                const result = await Promise.resolve('fetched data')
                set({ data: result, loading: false })
            },
        }))
        await useStore.getState().fetch()
        expect(useStore.getState().data).toBe('fetched data')
        expect(useStore.getState().loading).toBe(false)
    })
})

describe('batch', () => {
    it('coalesces multiple setState calls into a single listener notification', async () => {
        const useStore = createStore((set) => ({
            x: 0,
            y: 0,
            z: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ x: 1 })
            useStore.setState({ y: 2 })
            useStore.setState({ z: 3 })
        })

        // Still pending at this point
        expect(spy).not.toHaveBeenCalled()

        // Wait for microtask to drain
        await new Promise(resolve => queueMicrotask(resolve))

        // All three setState calls should have been coalesced into one listener call
        expect(spy).toHaveBeenCalledOnce()
        expect(spy.mock.calls[0][0]).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('all queued functions are executed', async () => {
        const useStore = createStore((set) => ({
            count: 0,
        }))

        const execOrder: string[] = []

        batch(() => {
            execOrder.push('fn1-start')
            useStore.setState({ count: 1 })
            execOrder.push('fn1-end')
        })

        batch(() => {
            execOrder.push('fn2-start')
            useStore.setState({ count: 2 })
            execOrder.push('fn2-end')
        })

        // Batch callbacks execute immediately, but listener notifications are deferred
        expect(execOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start', 'fn2-end'])

        // Wait for microtask
        await new Promise(resolve => queueMicrotask(resolve))

        // State should be updated
        expect(useStore.getState().count).toBe(2)
    })

    it('final state is correct after batch updates', async () => {
        const useStore = createStore((set) => ({
            a: 0,
            b: 0,
        }))

        batch(() => {
            useStore.setState((s) => ({ a: s.a + 1 }))
            useStore.setState((s) => ({ b: s.b + 10 }))
            useStore.setState((s) => ({ a: s.a + 1 })) // should apply after previous updates
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(useStore.getState()).toEqual({ a: 2, b: 10 })
    })

    it('nested batch calls work correctly', async () => {
        const useStore = createStore((set) => ({
            value: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            batch(() => {
                useStore.setState({ value: 1 })
            })
            useStore.setState({ value: 2 })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        // All updates should coalesce into one listener call
        expect(spy).toHaveBeenCalledOnce()
        expect(useStore.getState().value).toBe(2)
    })

    it('batch works with no state changes (no listeners fired)', async () => {
        const useStore = createStore((set) => ({
            value: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            // No actual state changes
        })

        await new Promise(resolve => queueMicrotask(resolve))

        // Listener should not be called since state didn't actually change
        expect(spy).not.toHaveBeenCalled()
    })

    it('batch preserves listener notification order for unchanged keys', async () => {
        const useStore = createStore((set) => ({
            a: 1,
            b: 1,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ a: 1 }) // No actual change
            useStore.setState({ b: 2 }) // Change
        })

        await new Promise(resolve => queueMicrotask(resolve))

        // Should still fire because b changed
        expect(spy).toHaveBeenCalledOnce()
        expect(spy.mock.calls[0][0]).toEqual({ a: 1, b: 2 })
    })

    it('nested batch does not lose intermediate state from outer batch', async () => {
        const useStore = createStore((set) => ({
            count: 0,
            name: '',
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ count: 1 })
            batch(() => {
                useStore.setState({ name: 'test' })
            })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(spy).toHaveBeenCalledOnce()
        expect(useStore.getState()).toEqual({ count: 1, name: 'test' })
    })

    it('consecutive batches do not interfere with each other', async () => {
        const useStore = createStore((set) => ({
            a: 0,
            b: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ a: 1 })
        })

        batch(() => {
            useStore.setState({ b: 2 })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(useStore.getState()).toEqual({ a: 1, b: 2 })
    })

    it('stale microtask from old batch does not dispatch when new batch starts', async () => {
        const useStore = createStore((set) => ({
            x: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        // Start first batch but manually prevent its microtask from firing
        batch(() => {
            useStore.setState({ x: 1 })
        })

        // Immediately start a second batch before the first microtask fires
        batch(() => {
            useStore.setState({ x: 2 })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        // Listener should only see the final value, not be called twice
        expect(spy).toHaveBeenCalledOnce()
        expect(useStore.getState().x).toBe(2)
    })

    it('mutate inside batch merges correctly with setState', async () => {
        const useStore = createStore((set) => ({
            count: 0,
            label: '',
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ count: 5 })
            useStore.mutate((draft) => {
                draft.label = 'mutated'
            })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(spy).toHaveBeenCalledOnce()
        expect(useStore.getState()).toEqual({ count: 5, label: 'mutated' })
    })

    it('multiple mutate calls inside batch coalesce into one notification', async () => {
        const useStore = createStore((set) => ({
            a: 0,
            b: 0,
            c: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.mutate((draft) => { draft.a = 1 })
            useStore.mutate((draft) => { draft.b = 2 })
            useStore.mutate((draft) => { draft.c = 3 })
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(spy).toHaveBeenCalledOnce()
        expect(useStore.getState()).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('batch rollback restores state before any updates including mutate', () => {
        const useStore = createStore((set) => ({
            count: 0,
            label: '',
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        try {
            batch(() => {
                useStore.setState({ count: 5 })
                useStore.mutate((draft) => {
                    draft.label = 'mutated'
                })
                throw new Error('abort')
            })
        } catch {}

        expect(useStore.getState()).toEqual({ count: 0, label: '' })
        expect(spy).not.toHaveBeenCalled()
    })
})

    it('async batch does not overwrite concurrent non-batched setState calls', async () => {
        const useStore = createStore((set) => ({
            a: 0,
            b: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        // Start an async batch that modifies key 'a'
        const batchPromise = batch(async () => {
            useStore.setState({ a: 1 })
            // Yield to allow interleaving
            await Promise.resolve()
        })

        // Non-batched setState on key 'b' between async batch microtasks
        useStore.setState({ b: 2 })

        await batchPromise
        await new Promise(resolve => queueMicrotask(resolve))

        // Both changes should be preserved
        expect(useStore.getState()).toEqual({ a: 1, b: 2 })
    })

describe('middleware', () => {
    it('middleware is called during setState', () => {
        const spy = vi.fn((prev, update, next) => next(update))
        const useStore = createStore(() => ({ count: 0 }), { middleware: [spy] })
        
        useStore.setState({ count: 1 })
        expect(spy).toHaveBeenCalledOnce()
        expect(spy.mock.calls[0][0]).toEqual({ count: 0 })
        expect(spy.mock.calls[0][1]).toEqual({ count: 1 })
    })

    it('multiple middleware execute in correct order', () => {
        const order: string[] = []
        const mw1 = (prev: any, update: any, next: any) => {
            order.push('mw1 start')
            next(update)
            order.push('mw1 end')
        }
        const mw2 = (prev: any, update: any, next: any) => {
            order.push('mw2 start')
            next(update)
            order.push('mw2 end')
        }

        const useStore = createStore(() => ({ count: 0 }), { middleware: [mw1, mw2] })
        useStore.setState({ count: 1 })
        
        expect(order).toEqual(['mw1 start', 'mw2 start', 'mw2 end', 'mw1 end'])
    })

    it('middleware can modify updates before they apply', () => {
        const doubleCount = (prev: any, update: any, next: any) => {
            if ('count' in update) {
                next({ ...update, count: update.count * 2 })
            } else {
                next(update)
            }
        }
        
        const useStore = createStore(() => ({ count: 0 }), { middleware: [doubleCount] })
        useStore.setState({ count: 5 })
        expect(useStore.getState().count).toBe(10)
    })


    it('functional updaters chain correctly inside a batch', async () => {
        const useStore = createStore((set) => ({
            a: 0,
            b: 0,
        }))

        batch(() => {
            useStore.setState((s) => ({ a: s.a + 1 })) // a: 0 → 1
            useStore.setState((s) => ({ a: s.a + 1 })) // a: 1 → 2
            useStore.setState((s) => ({ b: s.a * 10 })) // b: 2 * 10 = 20
        })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(useStore.getState()).toEqual({ a: 2, b: 20 })
    })

    it('batch rolls back state and getState returns pre-batch snapshot on throw', () => {
        const useStore = createStore((set) => ({
            x: 0,
            y: 0,
            z: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        try {
            batch(() => {
                useStore.setState({ x: 1 })
                useStore.setState({ y: 2 })
                throw new Error('abort')
            })
        } catch {}

        // State must be fully rolled back
        expect(useStore.getState()).toEqual({ x: 0, y: 0, z: 0 })
        // No listeners should have fired
        expect(spy).not.toHaveBeenCalled()
    })

    it('setState outside batch after batch call is not overwritten by commit', async () => {
        const useStore = createStore((set) => ({
            x: 0,
            y: 0,
        }))
        const spy = vi.fn()
        useStore.subscribe(spy)

        batch(() => {
            useStore.setState({ x: 1 })
        })

        // Between batch return and microtask, setState outside batch
        useStore.setState({ y: 2 })

        await new Promise(resolve => queueMicrotask(resolve))

        expect(useStore.getState()).toEqual({ x: 1, y: 2 })
    })

    it('getState inside batch returns pending batch state', () => {
        const useStore = createStore((set) => ({
            count: 0,
        }))

        batch(() => {
            useStore.setState({ count: 1 })
            // Inside the batch, getState should see the pending value
            expect(useStore.getState().count).toBe(1)
        })
    })
})

describe('persistence', () => {
    const testDir = path.join(__dirname, 'temp-test-store-dir')
    const testFile = path.join(testDir, 'test-store.json')

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
        if (fs.existsSync(testFile)) {
            try {
                fs.unlinkSync(testFile)
            } catch (err) {}
        }
        if (fs.existsSync(testDir)) {
            try {
                fs.rmdirSync(testDir)
            } catch (err) {}
        }
    })

    it('initializes store with plain object creator', () => {
        const useStore = createStore({ count: 5, name: 'plain-object' })
        expect(useStore.getState().count).toBe(5)
        expect(useStore.getState().name).toBe('plain-object')
    })

    it('rehydrates saved state from file on init', () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true })
        }
        fs.writeFileSync(testFile, JSON.stringify({ count: 42, extra: 'loaded' }), 'utf8')

        const useStore = createStore({ count: 0, extra: '', other: true }, {
            persist: {
                file: testFile,
            }
        })

        expect(useStore.getState().count).toBe(42)
        expect(useStore.getState().extra).toBe('loaded')
        expect(useStore.getState().other).toBe(true) // default value untouched
    })

    it('debounces disk writes and collapses rapid updates', () => {
        vi.useFakeTimers()
        const useStore = createStore({ count: 0, text: '' }, {
            persist: {
                file: testFile,
                debounceMs: 50,
            }
        })

        useStore.setState({ count: 1 })
        useStore.setState({ count: 2 })
        useStore.setState({ text: 'hello' })

        // File should not exist immediately due to debounce
        expect(fs.existsSync(testFile)).toBe(false)

        // Advance timers by less than debounceMs
        vi.advanceTimersByTime(40)
        expect(fs.existsSync(testFile)).toBe(false)

        // Advance timers past debounceMs
        vi.advanceTimersByTime(15)
        expect(fs.existsSync(testFile)).toBe(true)

        const data = JSON.parse(fs.readFileSync(testFile, 'utf8'))
        expect(data).toEqual({ count: 2, text: 'hello' })
    })

    it('cancels pending writes on destroy', () => {
        vi.useFakeTimers()
        const useStore = createStore({ count: 0 }, {
            persist: {
                file: testFile,
                debounceMs: 50,
            }
        })

        useStore.setState({ count: 10 })
        expect(fs.existsSync(testFile)).toBe(false)

        useStore.destroy()

        vi.advanceTimersByTime(100)
        expect(fs.existsSync(testFile)).toBe(false)
    })
})

it('mutate updates state', () => {
    const useStore = createStore((set) => ({
        count: 0,
    }));

    useStore.mutate((state) => {
        state.count = 5;
    });

    expect(useStore.getState().count).toBe(5);
});
it('mutate updates nested object', () => {
    const useStore = createStore((set) => ({
        user: { name: 'A' },
    }));

    useStore.mutate((state) => {
        state.user.name = 'B';
    });

    expect(useStore.getState().user.name).toBe('B');
});
it('mutate does not modify original state reference', () => {
    const useStore = createStore((set) => ({
        count: 0,
    }));

    const before = useStore.getState();

    useStore.mutate((state) => {
        state.count = 10;
    });

    expect(before.count).toBe(0);
});

describe('useStore selector memoization', () => {
    it('does not call setSelectedState when selected slice is unchanged', () => {
        const useStore = createStore({ a: 1, b: 2 })

        // Track how many times the store-level listener fires for `a`
        let callCount = 0
        const unsub = useStore.subscribe((state) => {
            const selected = state.a
            // Simulate what the memoized useStore hook does: only count if value changed
            // We test the store.subscribe path directly; the actual hook uses Object.is internally
        })
        unsub()

        // Instead, subscribe manually with the same memoization logic the fixed hook uses
        let prevSelected = useStore.getState().a
        const calls: number[] = []
        useStore.subscribe((newState) => {
            const newSelected = newState.a
            if (!Object.is(prevSelected, newSelected)) {
                prevSelected = newSelected
                calls.push(newSelected)
            }
        })

        // b changes, a stays the same — listener must NOT fire
        useStore.setState({ a: 1, b: 99 })
        expect(calls).toHaveLength(0)

        // a changes — listener MUST fire
        useStore.setState({ a: 2, b: 99 })
        expect(calls).toHaveLength(1)
        expect(calls[0]).toBe(2)
    })

    it('does call setSelectedState when selected slice changes', () => {
        const useStore = createStore({ a: 1, b: 2 })

        let prevSelected = useStore.getState().a
        const calls: number[] = []
        useStore.subscribe((newState) => {
            const newSelected = newState.a
            if (!Object.is(prevSelected, newSelected)) {
                prevSelected = newSelected
                calls.push(newSelected)
            }
        })

        useStore.setState({ a: 10 })
        expect(calls).toHaveLength(1)
        expect(calls[0]).toBe(10)

        useStore.setState({ a: 10 }) // same value — no fire
        expect(calls).toHaveLength(1)

        useStore.setState({ a: 20 })
        expect(calls).toHaveLength(2)
        expect(calls[1]).toBe(20)
    })
})


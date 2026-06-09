import { describe, it, expect, vi, afterEach } from 'vitest'
import { createStore, batch, logger } from './store.js'
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

    it('logger middleware passes state through without calling console.log', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const useStore = createStore(() => ({ count: 0 }), { middleware: [logger] })

        useStore.setState({ count: 1 })

        // console.log is forbidden in TermUI source files — logger is a pass-through
        expect(logSpy).not.toHaveBeenCalled()
        expect(useStore.getState().count).toBe(1)

        logSpy.mockRestore()
    })
})

describe('persistence', () => {
    const testDir = path.join(__dirname, 'temp-test-store-dir')
    const testFile = path.join(testDir, 'test-store.json')

    afterEach(() => {
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


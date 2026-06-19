import { describe, it, expect, vi } from 'vitest'
import { shallow } from './shallow.js'
import { createStore } from './store.js'

describe('shallow', () => {
  it('returns true for equal flat objects', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
  })

  it('returns false when a value differs', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
  })

  it('returns false when key sets differ', () => {
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })
})

describe('useStore selector with shallow', () => {
  it('selector with shallow skips notify on equal slice', () => {
    const useStore = createStore({ obj: { a: 1, b: 2 }, other: 0 })
    const spy = vi.fn()

    let prev = useStore.getState().obj
    const unsub = useStore.subscribe(() => {
      const next = useStore.getState().obj
      if (!shallow(prev, next)) {
        prev = next
        spy(next)
      }
    })

    // mutate other key only; obj unchanged shallowly
    useStore.setState({ other: 1 })
    expect(spy).toHaveBeenCalledTimes(0)
    unsub()
  })

  it('selector with shallow notifies on changed slice', () => {
    const useStore = createStore({ obj: { a: 1, b: 2 }, other: 0 })
    const spy = vi.fn()

    let prev = useStore.getState().obj
    const unsub = useStore.subscribe(() => {
      const next = useStore.getState().obj
      if (!shallow(prev, next)) {
        prev = next
        spy(next)
      }
    })

    // change nested value
    useStore.setState({ obj: { a: 1, b: 3 } })
    expect(spy).toHaveBeenCalledTimes(1)
    unsub()
  })
})

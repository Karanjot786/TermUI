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

  it('returns false when comparing an array with an object containing identical keys', () => {
    expect(shallow([1, 2], { '0': 1, '1': 2 })).toBe(false)
  })
})

describe('shallow edge cases', () => {
  it('returns true for null compared to null', () => {
    expect(shallow(null, null)).toBe(true)
  })

  it('returns false for null compared to an object', () => {
    expect(shallow(null, {})).toBe(false)
    expect(shallow({}, null)).toBe(false)
  })

  it('returns true for undefined compared to undefined', () => {
    expect(shallow(undefined, undefined)).toBe(true)
  })

  it('returns false for undefined compared to an object', () => {
    expect(shallow(undefined, {})).toBe(false)
    expect(shallow({}, undefined)).toBe(false)
  })

  it('returns true for Date objects with the same ms value', () => {
    expect(shallow(new Date(0), new Date(0))).toBe(true)
  })

  it('returns true for Date objects with the same ms value', () => {
    expect(shallow(new Date(0), new Date(0))).toBe(true)
  })

  it('returns true for Date objects with different ms values (shallow: no own enumerable keys)', () => {
    // shallow() compares own enumerable keys. Date instances have no own enumerable keys,
    // so two Dates are always shallow-equal regardless of their internal timestamp.
    expect(shallow(new Date(0), new Date(1))).toBe(true)
  })

  it('returns true for two Map instances with identical entries (shallow: no own enumerable keys)', () => {
    // shallow() does not inspect Map/Symbol-keyed internals.
    // new Map() has zero own enumerable keys, so two Maps are always shallow-equal.
    const a = new Map([['x', 1]])
    const b = new Map([['x', 1]])
    expect(shallow(a, b)).toBe(true)
  })

  it('returns true for two Set instances with identical entries (shallow: no own enumerable keys)', () => {
    const a = new Set([1, 2, 3])
    const b = new Set([1, 2, 3])
    expect(shallow(a, b)).toBe(true)
  })

  it('returns true for NaN compared to NaN (Object.is behavior)', () => {
    expect(shallow(NaN, NaN)).toBe(true)
  })

  it('returns false for 0 compared to -0 (Object.is distinguishes these)', () => {
    expect(shallow(0, -0)).toBe(false)
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

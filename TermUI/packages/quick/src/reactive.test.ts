import { describe, it, expect } from 'vitest'
import { resolve, isReactive, type Reactive } from './reactive.js'

describe('resolve', () => {
    it('returns static number as-is', () => {
        expect(resolve(42)).toBe(42)
    })

    it('returns static string as-is', () => {
        expect(resolve('hello')).toBe('hello')
    })

    it('returns static object as-is', () => {
        const obj = { x: 1 }
        expect(resolve(obj)).toBe(obj)
    })

    it('calls function and returns its result', () => {
        expect(resolve(() => 99)).toBe(99)
    })

    it('calls function each time (not cached)', () => {
        let counter = 0
        const fn = () => ++counter
        expect(resolve(fn)).toBe(1)
        expect(resolve(fn)).toBe(2)
    })
})

describe('isReactive', () => {
    it('returns true for functions', () => {
        expect(isReactive(() => 1)).toBe(true)
    })

    it('returns false for numbers', () => {
        expect(isReactive(1)).toBe(false)
    })

    it('returns false for strings', () => {
        expect(isReactive('a')).toBe(false)
    })

    it('returns false for objects', () => {
        expect(isReactive({ x: 1 } as any)).toBe(false)
    })

    it('returns false for null/undefined', () => {
        expect(isReactive(null as any)).toBe(false)
        expect(isReactive(undefined as any)).toBe(false)
    })
})

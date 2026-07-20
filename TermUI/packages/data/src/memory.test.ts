import { describe, it, expect } from 'vitest'
import { memory } from './memory.js'

describe('memory provider', () => {
    it('percent is a number between 0 and 100', () => {
        expect(typeof memory.percent).toBe('number')
        expect(memory.percent).toBeGreaterThan(0)
        expect(memory.percent).toBeLessThanOrEqual(100)
    })

    it('used returns a human-readable string', () => {
        expect(typeof memory.used).toBe('string')
        expect(memory.used).toMatch(/\d/)  // contains digits
    })

    it('free returns a human-readable string', () => {
        expect(typeof memory.free).toBe('string')
        expect(memory.free).toMatch(/\d/)
    })

    it('total returns a human-readable string', () => {
        expect(typeof memory.total).toBe('string')
        expect(memory.total).toMatch(/\d/)
    })

    it('raw returns bytes as numbers', () => {
        const raw = memory.raw
        expect(typeof raw.used).toBe('number')
        expect(typeof raw.free).toBe('number')
        expect(typeof raw.total).toBe('number')
        expect(raw.total).toBe(raw.used + raw.free)
    })
})

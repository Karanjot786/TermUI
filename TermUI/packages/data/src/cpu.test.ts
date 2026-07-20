import { describe, it, expect } from 'vitest'
import { cpu } from './cpu.js'

describe('cpu provider', () => {
    it('percent is a number between 0 and 100', () => {
        expect(typeof cpu.percent).toBe('number')
        expect(cpu.percent).toBeGreaterThanOrEqual(0)
        expect(cpu.percent).toBeLessThanOrEqual(100)
    })

    it('count returns at least 1 core', () => {
        expect(typeof cpu.count).toBe('number')
        expect(cpu.count).toBeGreaterThanOrEqual(1)
    })

    it('model returns a non-empty string', () => {
        expect(typeof cpu.model).toBe('string')
        expect(cpu.model.length).toBeGreaterThan(0)
    })

    it('speed returns a non-negative number', () => {
        expect(typeof cpu.speed).toBe('number')
        expect(cpu.speed).toBeGreaterThanOrEqual(0)
    })

    it('loadAvg returns an array of 3 numbers', () => {
        const avg = cpu.loadAvg
        expect(Array.isArray(avg)).toBe(true)
        expect(avg.length).toBe(3)
        for (const v of avg) {
            expect(typeof v).toBe('number')
        }
    })

    it('perCore returns one value per core', () => {
        const perCore = cpu.perCore
        expect(Array.isArray(perCore)).toBe(true)
        expect(perCore.length).toBe(cpu.count)
    })
})

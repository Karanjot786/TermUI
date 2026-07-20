import { describe, it, expect } from 'vitest'
import { system } from './system.js'

describe('system provider', () => {
    it('platform returns a known OS', () => {
        expect(['darwin', 'linux', 'win32']).toContain(system.platform)
    })

    it('hostname returns a non-empty string', () => {
        expect(typeof system.hostname).toBe('string')
        expect(system.hostname.length).toBeGreaterThan(0)
    })

    it('arch returns a string', () => {
        expect(typeof system.arch).toBe('string')
        expect(system.arch.length).toBeGreaterThan(0)
    })

    it('uptime returns a human-readable string', () => {
        expect(typeof system.uptime).toBe('string')
        expect(system.uptime).toMatch(/\d/)
    })

    it('uptimeSeconds returns a positive number', () => {
        expect(typeof system.uptimeSeconds).toBe('number')
        expect(system.uptimeSeconds).toBeGreaterThan(0)
    })

    it('user returns a string', () => {
        expect(typeof system.user).toBe('string')
        expect(system.user.length).toBeGreaterThan(0)
    })

    it('nodeVersion starts with v', () => {
        expect(system.nodeVersion).toMatch(/^v\d+/)
    })

    it('release returns a version string', () => {
        expect(typeof system.release).toBe('string')
        expect(system.release.length).toBeGreaterThan(0)
    })

    it('type returns a known OS type', () => {
        expect(['Darwin', 'Linux', 'Windows_NT']).toContain(system.type)
    })
})

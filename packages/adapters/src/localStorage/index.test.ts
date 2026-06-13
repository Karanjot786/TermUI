import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const previousHome = process.env.HOME
const previousUserProfile = process.env.USERPROFILE

const tempHomeDir = mkdtempSync(join(tmpdir(), 'termui-test-'))
process.env.HOME = tempHomeDir
process.env.USERPROFILE = tempHomeDir

import { useLocalStorage } from './index'

describe('useLocalStorage', () => {
  const store = useLocalStorage('test-svc')

  beforeEach(() => store.clear())

  afterAll(() => {
    process.env.HOME = previousHome
    process.env.USERPROFILE = previousUserProfile
    rmSync(tempHomeDir, { recursive: true, force: true })
  })

  it('returns null for missing key', () => expect(store.get('x')).toBeNull())
  it('sets and gets string',  () => { store.set('k', 'v'); expect(store.get('k')).toBe('v') })
  it('sets and gets number',  () => { store.set('n', 42);  expect(store.get('n')).toBe(42)  })
  it('sets and gets object',  () => {
    store.set('o', { a: 1 })
    expect(store.get<{ a: number }>('o')).toEqual({ a: 1 })
  })
  it('removes a key',  () => { store.set('r', 'v'); store.remove('r'); expect(store.get('r')).toBeNull() })
  it('clears all keys', () => {
    store.set('a', 1); store.set('b', 2); store.clear()
    expect(store.get('a')).toBeNull(); expect(store.get('b')).toBeNull()
  })
})

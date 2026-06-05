import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockKeytarModule {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
}

let shouldThrowMissingKeytar = false
let mockKeytar: MockKeytarModule

function createMissingKeytarRequire(): NodeJS.Require {
  const missingRequire = Object.assign(
    (specifier: string) => {
      const error = new Error(`Cannot find module '${specifier}'`) as NodeJS.ErrnoException
      error.code = 'MODULE_NOT_FOUND'
      throw error
    },
    {
      resolve: (specifier: string) => specifier,
      cache: {},
      extensions: {},
      main: undefined,
    }
  )

  return missingRequire as NodeJS.Require
}

function createKeytarRequire(): NodeJS.Require {
  const requireFn = Object.assign(
    (specifier: string) => {
      if (specifier === 'keytar') return mockKeytar

      const error = new Error(`Cannot find module '${specifier}'`) as NodeJS.ErrnoException
      error.code = 'MODULE_NOT_FOUND'
      throw error
    },
    {
      resolve: (specifier: string) => specifier,
      cache: {},
      extensions: {},
      main: undefined,
    }
  )

  return requireFn as NodeJS.Require
}

async function loadUseKeychain() {
  vi.resetModules()
  return (await import('./index.js')).useKeychain
}

vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()

  return {
    ...actual,
    createRequire: (...args: Parameters<typeof actual.createRequire>) => {
      return shouldThrowMissingKeytar ? createMissingKeytarRequire() : createKeytarRequire()
    },
  }
})

describe('useKeychain', () => {
  const previousAnthropicApiKey = process.env.ANTHROPIC_API_KEY
  const previousOpenAiApiKey = process.env.OPEN_AI_API_KEY

  beforeEach(() => {
    mockKeytar = {
      getPassword: vi.fn(async (service: string, account: string) => `${service}:${account}:password`),
      setPassword: vi.fn(async () => undefined),
      deletePassword: vi.fn(async () => true),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    shouldThrowMissingKeytar = false

    if (previousAnthropicApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = previousAnthropicApiKey
    }

    if (previousOpenAiApiKey === undefined) {
      delete process.env.OPEN_AI_API_KEY
    } else {
      process.env.OPEN_AI_API_KEY = previousOpenAiApiKey
    }
  })

  it('gets, sets, and deletes passwords through keytar', async () => {
    const useKeychain = await loadUseKeychain()
    const keychain = useKeychain('my-cli-app')

    await keychain.set('anthropic-api-key', 'secret')
    const value = await keychain.get('anthropic-api-key')
    const deleted = await keychain.delete('anthropic-api-key')

    expect(value).toBe('my-cli-app:anthropic-api-key:password')
    expect(deleted).toBe(true)
    expect(mockKeytar.setPassword).toHaveBeenCalledWith('my-cli-app', 'anthropic-api-key', 'secret')
    expect(mockKeytar.getPassword).toHaveBeenCalledWith('my-cli-app', 'anthropic-api-key')
    expect(mockKeytar.deletePassword).toHaveBeenCalledWith('my-cli-app', 'anthropic-api-key')
  })

  it('falls back and warns when keytar is unavailable', async () => {
    shouldThrowMissingKeytar = true
    process.env.ANTHROPIC_API_KEY = 'env-secret'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useKeychain = await loadUseKeychain()

    const keychain = useKeychain('my-cli-app')
    const value = await keychain.get('anthropic-api-key')

    expect(value).toBe('env-secret')
    expect(warn).toHaveBeenCalledWith(
      'useKeychain() requires the optional peer dependency `keytar`. Install `keytar` before calling useKeychain().'
    )
  })

  it('reads environment variables in fallback mode', async () => {
    shouldThrowMissingKeytar = true
    process.env.OPEN_AI_API_KEY = 'openai-secret'
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useKeychain = await loadUseKeychain()

    const keychain = useKeychain('my-cli-app')

    expect(await keychain.get('open-ai-api-key')).toBe('openai-secret')
  })

  it('stores fallback set values in memory', async () => {
    shouldThrowMissingKeytar = true
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useKeychain = await loadUseKeychain()
    const keychain = useKeychain('my-cli-app')

    await keychain.set('anthropic-api-key', 'memory-secret')

    expect(await keychain.get('anthropic-api-key')).toBe('memory-secret')
  })

  it('deletes fallback store values', async () => {
    shouldThrowMissingKeytar = true
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useKeychain = await loadUseKeychain()
    const keychain = useKeychain('my-cli-app')

    await keychain.set('anthropic-api-key', 'memory-secret')
    const deleted = await keychain.delete('anthropic-api-key')

    expect(deleted).toBe(true)
    expect(await keychain.get('anthropic-api-key')).toBe(null)
  })

  it('falls back when keytar access fails at runtime', async () => {
    mockKeytar = {
      getPassword: vi.fn(async () => {
        throw new Error('Keychain access denied')
      }),
      setPassword: vi.fn(async () => {
        throw new Error('Keychain access denied')
      }),
      deletePassword: vi.fn(async () => {
        throw new Error('Keychain access denied')
      }),
    }
    process.env.ANTHROPIC_API_KEY = 'env-secret'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useKeychain = await loadUseKeychain()
    const keychain = useKeychain('my-cli-app')

    expect(await keychain.get('anthropic-api-key')).toBe('env-secret')
    await keychain.set('anthropic-api-key', 'memory-secret')
    expect(await keychain.get('anthropic-api-key')).toBe('memory-secret')
    expect(await keychain.delete('anthropic-api-key')).toBe(true)
    expect(await keychain.get('anthropic-api-key')).toBe('env-secret')
    expect(warn).toHaveBeenCalledWith('Keychain access denied')
  })
})

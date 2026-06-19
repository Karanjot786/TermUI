import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockClipboardyModule {
  read: () => Promise<string>
  write: (text: string) => Promise<void>
}

let shouldThrowMissingClipboardy = false
let mockClipboardy: MockClipboardyModule

function createMissingClipboardyRequire(): NodeJS.Require {
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

function createClipboardyRequire(): NodeJS.Require {
  const requireFn = Object.assign(
    (specifier: string) => {
      if (specifier === 'clipboardy') return mockClipboardy

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

async function loadUseClipboard() {
  vi.resetModules()
  return (await import('./index.js')).useClipboard
}

vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()

  return {
    ...actual,
    createRequire: (...args: Parameters<typeof actual.createRequire>) => {
      return shouldThrowMissingClipboardy
        ? createMissingClipboardyRequire()
        : createClipboardyRequire()
    },
  }
})

describe('useClipboard', () => {
  beforeEach(() => {
    mockClipboardy = {
      read: vi.fn(async () => 'clipboard contents'),
      write: vi.fn(async () => undefined),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    shouldThrowMissingClipboardy = false
  })

  it('writes delegates to clipboardy.write', async () => {
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()

    await clipboard.write('test text')

    expect(mockClipboardy.write).toHaveBeenCalledWith('test text')
  })

  it('read delegates to clipboardy.read', async () => {
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()

    const text = await clipboard.read()

    expect(text).toBe('clipboard contents')
    expect(mockClipboardy.read).toHaveBeenCalled()
  })

  it('lastCopied tracks the most recent successful write', async () => {
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()

    expect(clipboard.lastCopied).toBe(null)

    await clipboard.write('first text')
    expect(clipboard.lastCopied).toBe('first text')

    await clipboard.write('second text')
    expect(clipboard.lastCopied).toBe('second text')
  })

  it('throws a clear error when clipboardy is missing', async () => {
    shouldThrowMissingClipboardy = true
    const useClipboard = await loadUseClipboard()

    expect(() => {
      useClipboard()
    }).toThrow(/requires the optional peer dependency `clipboardy`/)
  })
})

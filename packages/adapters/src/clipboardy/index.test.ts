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
    createRequire: () => {
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

  it('write delegates to clipboardy.write', async () => {
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
    await clipboard.write('first text')
    expect(clipboard.lastCopied).toBe('first text')
    await clipboard.write('second text')
    expect(clipboard.lastCopied).toBe('second text')
  })

  it('falls back and warns when clipboardy is unavailable, without throwing', async () => {
    shouldThrowMissingClipboardy = true
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()
    expect(warn).toHaveBeenCalledWith(
      'useClipboard() requires the optional peer dependency `clipboardy`. Install `clipboardy` before calling useClipboard().'
    )
    await expect(clipboard.write('fallback text')).resolves.toBeUndefined()
  })

  it('stores writes in an in-memory fallback when clipboardy is missing', async () => {
    shouldThrowMissingClipboardy = true
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()
    await clipboard.write('memory text')
    expect(clipboard.lastCopied).toBe('memory text')
    const text = await clipboard.read()
    expect(text).toBe('memory text')
  })

  it('falls back when clipboardy access fails at runtime', async () => {
    mockClipboardy = {
      read: vi.fn(async () => { throw new Error('Clipboard access denied') }),
      write: vi.fn(async () => { throw new Error('Clipboard access denied') }),
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const useClipboard = await loadUseClipboard()
    const clipboard = useClipboard()
    await expect(clipboard.write('runtime text')).resolves.toBeUndefined()
    expect(clipboard.lastCopied).toBe('runtime text')
    expect(warn).toHaveBeenCalledWith('Clipboard access denied')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

let shouldThrowMissingOpen = false
const mockOpen = vi.fn()

function createMissingOpenRequire(): NodeJS.Require {
  const missingRequire = Object.assign(
    (specifier: string) => {
      // Cast to ErrnoException so the test can assign a MODULE_NOT_FOUND code.
      const error = new Error(
        `Cannot find module '${specifier}'`
      ) as NodeJS.ErrnoException

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
  // Cast because the stub only implements the subset of NodeJS.Require used by the test.
  return missingRequire as NodeJS.Require
}

function createOpenRequire(): NodeJS.Require {
  const requireFn = Object.assign(
    (specifier: string) => {
      if (specifier === 'open') {
        return { default: mockOpen }
      }
      // Cast to ErrnoException so the test can assign a MODULE_NOT_FOUND code.
      const error = new Error(
        `Cannot find module '${specifier}'`
      ) as NodeJS.ErrnoException

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
  // Cast because the stub only implements the subset of NodeJS.Require used by the test.
  return requireFn as NodeJS.Require
}

async function loadUseOpen() {
  vi.resetModules()
  return (await import('./index.js')).useOpen
}

vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()

  return {
    ...actual,
    createRequire: (..._args: Parameters<typeof actual.createRequire>) => {
      return shouldThrowMissingOpen
        ? createMissingOpenRequire()
        : createOpenRequire()
    },
  }
})

describe('useOpen', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mockOpen.mockReset()
    shouldThrowMissingOpen = false
  })

  it('open delegates the target to the library', async () => {
    const useOpen = await loadUseOpen()

    const adapter = useOpen()

    await adapter.open('https://termui.io')

    expect(mockOpen).toHaveBeenCalledWith('https://termui.io')
  })

  it('missing open throws a clear error', async () => {
    shouldThrowMissingOpen = true

    const useOpen = await loadUseOpen()

    expect(() => useOpen()).toThrow(
      'useOpen() requires the optional peer dependency `open`.'
    )
  })

  it('rejects when the library rejects', async () => {
    mockOpen.mockRejectedValueOnce(
      new Error('failed to open')
    )

    const useOpen = await loadUseOpen()

    const adapter = useOpen()

    await expect(
      adapter.open('file.txt')
    ).rejects.toThrow('failed to open')
  })
})

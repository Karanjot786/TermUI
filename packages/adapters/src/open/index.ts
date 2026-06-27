import { createRequire } from 'node:module'

export interface UseOpenResult {
  open: (target: string) => Promise<void>
  lastOpened: string | null
}

type OpenFunction = (target: string) => Promise<unknown>

function isMissingOpenError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
    && 'code' in error
    && error.code === 'MODULE_NOT_FOUND'
    && error.message.includes('open')
}

function resolveOpen(): OpenFunction {
  try {
    const require = createRequire(import.meta.url)
    // open may be exposed as either a CommonJS export or an ESM default export.
    // This assertion allows handling both module shapes.
    const loaded = require('open') as OpenFunction | { default: OpenFunction }

    return 'default' in loaded ? loaded.default : loaded
  } catch (error) {
    if (isMissingOpenError(error)) {
      throw new Error(
        'useOpen() requires the optional peer dependency `open`. Install `open` before calling useOpen().',
        { cause: error }
      )
    }

    throw error
  }
}

export function useOpen(): UseOpenResult {
  const openFn = resolveOpen()

  let lastOpened: string | null = null

  return {
    async open(target: string) {
      await openFn(target)
      lastOpened = target
    },

    get lastOpened() {
      return lastOpened
    },
  }
}

import { createRequire } from 'node:module'

interface ClipboardyModule {
  read: () => Promise<string>
  write: (text: string) => Promise<void>
}
export interface UseClipboardResult {
  read: () => Promise<string>
  write: (text: string) => Promise<void>
  lastCopied: string | null
}

function isMissingClipboardyError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    error.message.includes('clipboardy')
  )
}

function resolveClipboardy(): ClipboardyModule {
  try {
    const require = createRequire(import.meta.url)
    // clipboardy can be returned as either a CommonJS export or ESM default export.
    // Narrow the runtime-loaded module shape for both cases.
    const loaded = require('clipboardy') as ClipboardyModule | { default: ClipboardyModule }
    return 'default' in loaded ? loaded.default : loaded
  } catch (error) {
    if (isMissingClipboardyError(error)) {
      throw new Error(
        'useClipboard() requires the optional peer dependency `clipboardy`. Install `clipboardy` before calling useClipboard().',
        { cause: error }
      )
    }

    throw error
  }
}

export function useClipboard(): UseClipboardResult {
  const clipboardy = resolveClipboardy()
  let lastCopied: string | null = null

  return {
    read: async () => {
      const text = await clipboardy.read()
      return text
    },
    write: async (text: string) => {
      await clipboardy.write(text)
      lastCopied = text
    },
    get lastCopied() {
      return lastCopied
    },
  }
}

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import type {} from 'dotenv'

export type DotenvValues = Record<string, string>

export interface UseDotenvResult {
  values: DotenvValues
  reload: () => DotenvValues
}

interface DotenvModule {
  parse(src: string | Buffer): DotenvValues
}

// Checks whether a caught error is a missing-module error specifically for dotenv.
function isMissingDotenvError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    error.message.includes('dotenv')
  )
}

// Lazily loads dotenv via createRequire so it is not required at module load time.
function resolveDotenv(): DotenvModule {
  try {
    const require = createRequire(import.meta.url)
    return require('dotenv') as DotenvModule
  } catch (error) {
    if (isMissingDotenvError(error)) {
      throw new Error(
        'useDotenv() requires the optional peer dependency `dotenv`. Install `dotenv@^16.0.0` in your app before calling useDotenv().',
        { cause: error }
      )
    }
    throw error
  }
}

// Returns an empty record when the file does not exist instead of throwing.
function parseFile(filePath: string): DotenvValues {
  if (!existsSync(filePath)) {
    return {}
  }
  const dotenv = resolveDotenv()
  const content = readFileSync(filePath)
  return dotenv.parse(content)
}

export function useDotenv(path?: string): UseDotenvResult {
  // Resolve the path once; subsequent reloads reuse the same resolved path.
  const filePath = path ?? resolve(process.cwd(), '.env')
  let current: DotenvValues = parseFile(filePath)

  function reload(): DotenvValues {
    current = parseFile(filePath)
    return current
  }

  // Use a getter so result.values always reflects the latest reload() call.
  return {
    get values() { return current },
    reload,
  }
}

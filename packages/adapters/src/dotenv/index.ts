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

function isMissingDotenvError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    error.message.includes('dotenv')
  )
}

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

function parseFile(filePath: string): DotenvValues {
  if (!existsSync(filePath)) {
    return {}
  }
  const dotenv = resolveDotenv()
  const content = readFileSync(filePath)
  return dotenv.parse(content)
}

export function useDotenv(path?: string): UseDotenvResult {
  const filePath = path ?? resolve(process.cwd(), '.env')
  let current: DotenvValues = parseFile(filePath)

  function reload(): DotenvValues {
    current = parseFile(filePath)
    return current
  }

  return {
    get values() { return current },
    reload,
  }
}

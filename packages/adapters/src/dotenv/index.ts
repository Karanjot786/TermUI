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

let _dotenv: DotenvModule | undefined

const _require = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url
)

// Lazily loads dotenv. Uses a cached reference after first load.
function resolveDotenv(): DotenvModule {
  if (_dotenv) return _dotenv
  try {
    _dotenv = _require('dotenv') as DotenvModule // require via createRequire; dotenv has no named ESM exports
    return _dotenv
  } catch {
    throw new Error(
      'useDotenv() requires the optional peer dependency `dotenv`. Install `dotenv@^16.0.0` in your app before calling useDotenv().'
    )
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

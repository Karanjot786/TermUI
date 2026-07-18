import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Options as ConfOptions } from 'conf'

export type SetConfValue<T extends Record<string, unknown>> =
  (value: T | ((current: T) => T)) => T

export type UseConfResult<T extends Record<string, unknown>> = readonly [T, SetConfValue<T>]

type ConfConstructor = new <T extends Record<string, unknown> = Record<string, unknown>>(
  options?: Readonly<Partial<ConfOptions<T>>>
) => { store: T }

interface ConfStore<T extends Record<string, unknown>> {
  config: { store: T }
  value: T
  setValue: SetConfValue<T>
}

const configStores = new Map<string, ConfStore<Record<string, unknown>>>()

function isMissingConfError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
    && 'code' in error
    && error.code === 'MODULE_NOT_FOUND'
    && error.message.includes('conf')
}

let customLoader: (() => any) | null = null

export function _setCustomLoader(loader: (() => any) | null): void {
  customLoader = loader
}

function resolveConfConstructor(): ConfConstructor {
  try {
    const loaded = customLoader
      ? customLoader()
      : createRequire(import.meta.url)('conf') as ConfConstructor | { default: ConfConstructor }
    return 'default' in loaded ? loaded.default : loaded
  } catch (error) {
    if (isMissingConfError(error)) {
      throw new Error(
        'useConf() requires the optional peer dependency `conf`. Install `conf@^10.2.0` in your app before calling useConf().',
        { cause: error }
      )
    }

    throw error
  }
}

function resolveConfigDirectory(appName: string): string {
  return join(homedir(), '.config', appName)
}

function resolveNextValue<T extends Record<string, unknown>>(
  current: T,
  value: T | ((state: T) => T)
): T {
  return typeof value === 'function' ? value(current) : value
}

function createStore<T extends Record<string, unknown>>(appName: string, defaults: T): ConfStore<T> {
  const configDirectory = resolveConfigDirectory(appName)
  mkdirSync(configDirectory, { recursive: true })

  const Conf = resolveConfConstructor()
  const config = new Conf<T>({
    cwd: configDirectory,
    configName: 'config',
    defaults,
  })

  const store: ConfStore<T> = {
    config,
    value: config.store,
    setValue: (value) => {
      const nextValue = resolveNextValue(store.value, value)
      store.value = nextValue
      store.config.store = nextValue
      return store.value
    },
  }

  return store
}

export function useConf<T extends Record<string, unknown>>(appName: string, defaults: T): UseConfResult<T> {
  // The cache is keyed by app name, so callers are responsible for reusing a consistent config shape per app.
  const cachedStore = configStores.get(appName) as ConfStore<T> | undefined
  const store = cachedStore ?? createStore(appName, defaults)

  if (!cachedStore) {
    // Stores are cached as a generic record because the map is shared across app names.
    configStores.set(appName, store as ConfStore<Record<string, unknown>>)
  }

  return [store.value, store.setValue]
}

export function _clearConfigStoresCache(): void {
  configStores.clear()
}

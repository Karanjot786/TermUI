import { createRequire } from 'node:module'

export interface UseKeychainResult {
  get(account: string): Promise<string | null>
  set(account: string, password: string): Promise<void>
  delete(account: string): Promise<boolean>
}

interface KeytarModule {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
}

const fallbackStores = new Map<string, Map<string, string>>()

function isMissingKeytarError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    error.message.includes('keytar')
  )
}

function resolveKeytar(): KeytarModule {
  try {
    const require = createRequire(import.meta.url)
    const loaded = require('keytar') as KeytarModule | { default: KeytarModule }
    return 'default' in loaded ? loaded.default : loaded
  } catch (error) {
    if (isMissingKeytarError(error)) {
      throw new Error(
        'useKeychain() requires the optional peer dependency `keytar`. Install `keytar` before calling useKeychain().',
        { cause: error }
      )
    }

    throw error
  }
}

function getFallbackStore(service: string): Map<string, string> {
  const cachedStore = fallbackStores.get(service)
  if (cachedStore) return cachedStore

  const store = new Map<string, string>()
  fallbackStores.set(service, store)
  return store
}

function accountToEnvName(account: string): string {
  return account
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function warnFallback(error: unknown): void {
  console.warn(error instanceof Error ? error.message : 'useKeychain() could not access the system keychain.')
}

export function useKeychain(appName: string): UseKeychainResult {
  let keytar: KeytarModule | null = null

  try {
    keytar = resolveKeytar()
  } catch (error) {
    warnFallback(error)
  }

  const fallbackStore = getFallbackStore(appName)

  function getFallback(account: string): string | null {
    return fallbackStore.get(account) ?? process.env[accountToEnvName(account)] ?? null
  }

  return {
    async get(account: string): Promise<string | null> {
      if (!keytar) return getFallback(account)

      try {
        return await keytar.getPassword(appName, account)
      } catch (error) {
        warnFallback(error)
        keytar = null
        return getFallback(account)
      }
    },

    async set(account: string, password: string): Promise<void> {
      if (!keytar) {
        fallbackStore.set(account, password)
        return
      }

      try {
        await keytar.setPassword(appName, account, password)
      } catch (error) {
        warnFallback(error)
        keytar = null
        fallbackStore.set(account, password)
      }
    },

    async delete(account: string): Promise<boolean> {
      if (!keytar) {
        return fallbackStore.delete(account)
      }

      try {
        return await keytar.deletePassword(appName, account)
      } catch (error) {
        warnFallback(error)
        keytar = null
        return fallbackStore.delete(account)
      }
    },
  }
}

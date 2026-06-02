import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

let shouldThrowMissingConf = false

function createMissingConfRequire(): NodeJS.Require {
  // The real NodeJS.Require type has extra properties, so the test stub mirrors them.
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

async function loadUseConf() {
  vi.resetModules()
  return (await import('./index.js')).useConf
}

vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()

  return {
    ...actual,
    createRequire: (...args: Parameters<typeof actual.createRequire>) => {
      return shouldThrowMissingConf ? createMissingConfRequire() : actual.createRequire(...args)
    },
  }
})

describe('useConf', () => {
  let tempHomeDirectory = ''
  const previousHome = process.env.HOME
  const previousUserProfile = process.env.USERPROFILE
  const previousHomeDrive = process.env.HOMEDRIVE
  const previousHomePath = process.env.HOMEPATH

  function setHomeDirectory(directory: string) {
    process.env.HOME = directory
    process.env.USERPROFILE = directory
    delete process.env.HOMEDRIVE
    delete process.env.HOMEPATH
  }

  afterEach(() => {
    vi.restoreAllMocks()
    shouldThrowMissingConf = false
    process.env.HOME = previousHome
    process.env.USERPROFILE = previousUserProfile

    if (previousHomeDrive === undefined) {
      delete process.env.HOMEDRIVE
    } else {
      process.env.HOMEDRIVE = previousHomeDrive
    }

    if (previousHomePath === undefined) {
      delete process.env.HOMEPATH
    } else {
      process.env.HOMEPATH = previousHomePath
    }

    if (tempHomeDirectory) {
      rmSync(tempHomeDirectory, { recursive: true, force: true })
      tempHomeDirectory = ''
    }
  })

  it('returns defaults when no config file exists yet', async () => {
    tempHomeDirectory = mkdtempSync(join(tmpdir(), 'termui-conf-'))
    setHomeDirectory(tempHomeDirectory)

    const useConf = await loadUseConf()
    const defaults = { theme: 'dark', fontSize: 14 }

    const [config] = useConf('my-app', defaults)

    expect(config).toEqual(defaults)
  })

  it('reads an existing config file from disk', async () => {
    tempHomeDirectory = mkdtempSync(join(tmpdir(), 'termui-conf-'))
    setHomeDirectory(tempHomeDirectory)

    const configDirectory = join(tempHomeDirectory, '.config', 'my-app')
    const configPath = join(configDirectory, 'config.json')
    mkdirSync(configDirectory, { recursive: true })
    writeFileSync(configPath, JSON.stringify({ theme: 'light', fontSize: 16 }), 'utf8')

    const useConf = await loadUseConf()
    const [config] = useConf('my-app', { theme: 'dark', fontSize: 14 })

    expect(config).toEqual({ theme: 'light', fontSize: 16 })
  })

  it('updates in-memory state and writes the new config file', async () => {
    tempHomeDirectory = mkdtempSync(join(tmpdir(), 'termui-conf-'))
    setHomeDirectory(tempHomeDirectory)

    const useConf = await loadUseConf()
    const [config, setConfig] = useConf('my-app', { theme: 'dark', fontSize: 14 })

    const updated = setConfig({ ...config, theme: 'light' })
    const configPath = join(tempHomeDirectory, '.config', 'my-app', 'config.json')
    const persisted = JSON.parse(readFileSync(configPath, 'utf8'))
    const [cachedConfig] = useConf('my-app', { theme: 'dark', fontSize: 14 })

    expect(updated).toEqual({ theme: 'light', fontSize: 14 })
    expect(existsSync(configPath)).toBe(true)
    expect(persisted).toEqual({ theme: 'light', fontSize: 14 })
    expect(cachedConfig).toEqual({ theme: 'light', fontSize: 14 })
  })

  it('throws a helpful error when conf is not installed', async () => {
    tempHomeDirectory = mkdtempSync(join(tmpdir(), 'termui-conf-'))
    setHomeDirectory(tempHomeDirectory)
    shouldThrowMissingConf = true

    const useConf = await loadUseConf()

    expect(() => useConf('my-app', { theme: 'dark' })).toThrow(
      'useConf() requires the optional peer dependency `conf`.'
    )
  })
})

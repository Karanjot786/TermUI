import * as fs   from 'node:fs'
import * as path from 'node:path'
import * as os   from 'node:os'

export interface LocalStorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  clear(): void
}

function resolveStorePath(service: string): string {
  const dir = path.join(os.homedir(), '.config', 'termui')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${service}.json`)
}

function readStore(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  } catch { return {} }
}

function writeStore(filePath: string, data: Record<string, unknown>): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function useLocalStorage(service: string): LocalStorageAdapter {
  const storePath = resolveStorePath(service)
  return {
    get<T>(key: string): T | null {
      const s = readStore(storePath)
      return key in s ? (s[key] as T) : null
    },
    set<T>(key: string, value: T): void {
      const s = readStore(storePath)
      s[key] = value
      writeStore(storePath, s)
    },
    remove(key: string): void {
      const s = readStore(storePath)
      delete s[key]
      writeStore(storePath, s)
    },
    clear(): void { writeStore(storePath, {}) },
  }
}

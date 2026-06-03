import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { useDotenv } from './index.js'

describe('useDotenv', () => {
  const tempFiles: string[] = []

  function writeTempEnv(filename: string, content: string): string {
    const filePath = join(tmpdir(), filename)
    writeFileSync(filePath, content, 'utf8')
    tempFiles.push(filePath)
    return filePath
  }

  afterEach(() => {
    for (const file of tempFiles) {
      if (existsSync(file)) unlinkSync(file)
    }
    tempFiles.length = 0
  })

  it('parses a .env file into values', () => {
    const filePath = writeTempEnv('test-parse.env', 'KEY=hello\nFOO=bar\n')
    const { values } = useDotenv(filePath)
    expect(values['KEY']).toBe('hello')
    expect(values['FOO']).toBe('bar')
  })

  it('defaults to .env in cwd', () => {
    // Pass an explicit path matching the default resolution to avoid writing into the repo root.
    const filePath = writeTempEnv('cwd-default.env', 'DEFAULT_KEY=default_value\n')
    const { values } = useDotenv(filePath)
    expect(values['DEFAULT_KEY']).toBe('default_value')
  })

  it('missing file yields empty values', () => {
    const filePath = join(tmpdir(), 'nonexistent-totally-missing.env')
    const { values } = useDotenv(filePath)
    expect(values).toEqual({})
  })

  it('reload re-reads the file', () => {
    const filePath = writeTempEnv('test-reload.env', 'VERSION=1\n')
    const result = useDotenv(filePath)
    expect(result.values['VERSION']).toBe('1')

    writeFileSync(filePath, 'VERSION=2\n', 'utf8')
    const fresh = result.reload()
    expect(fresh['VERSION']).toBe('2')
    expect(result.values['VERSION']).toBe('2')
  })
})

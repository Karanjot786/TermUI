// packages/dev-server/src/workspace.test.ts

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findWorkspaceDeps } from './workspace.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupFakeMonorepo(): { projectDir: string; packagesDir: string; cleanup: () => void } {
  // Create a temp directory that mimics a monorepo workspace
  const rootDir = mkdtempSync(join(tmpdir(), 'termui-test-'))

  // Create packages/ directory (simulates the real monorepo packages/)
  const packagesDir = join(rootDir, 'packages')
  mkdirSync(packagesDir)

  // Create the project directory that would use dev-server
  const projectDir = join(rootDir, 'examples', 'my-app')
  mkdirSync(projectDir, { recursive: true })

  return {
    projectDir,
    packagesDir,
    cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
  }
}

function createFakePackage(packagesDir: string, name: string): string {
  const pkgPath = join(packagesDir, name)
  mkdirSync(join(pkgPath, 'dist'), { recursive: true })
  writeFileSync(join(pkgPath, 'dist', 'index.js'), `// ${name} dist output`)
  return pkgPath
}

function createNodeModulesSymlink(projectDir: string, pkgRealPath: string, pkgName: string): void {
  const nodeModulesDir = join(projectDir, 'node_modules', '@termuijs')
  mkdirSync(nodeModulesDir, { recursive: true })
  symlinkSync(pkgRealPath, join(nodeModulesDir, pkgName))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('findWorkspaceDeps', () => {
  let projectDir: string
  let packagesDir: string
  let cleanup: () => void

  beforeEach(() => {
    const setup = setupFakeMonorepo()
    projectDir = setup.projectDir
    packagesDir = setup.packagesDir
    cleanup = setup.cleanup
  })

  afterEach(() => {
    cleanup()
  })

  it('returns an empty array when node_modules/@termuijs/ does not exist', async () => {
    // projectDir has no node_modules at all
    const result = await findWorkspaceDeps(projectDir)
    expect(result).toEqual([])
  })

  it('returns an empty array when @termuijs dir is empty', async () => {
    // Create empty node_modules/@termuijs/
    mkdirSync(join(projectDir, 'node_modules', '@termuijs'), { recursive: true })

    const result = await findWorkspaceDeps(projectDir)
    expect(result).toEqual([])
  })

  it('returns the real path of a symlinked @termuijs/* workspace package', async () => {
    // Create a fake @termuijs/widgets package in packages/
    const widgetsPath = createFakePackage(packagesDir, 'widgets')

    // Symlink it into node_modules/@termuijs/widgets (workspace link)
    createNodeModulesSymlink(projectDir, widgetsPath, 'widgets')

    const result = await findWorkspaceDeps(projectDir)

    expect(result).toHaveLength(1)
    expect(result[0]).toContain('packages')          // Real path is inside packages/
    expect(result[0]).toContain('widgets')
  })

  it('returns multiple workspace packages when several are symlinked', async () => {
    const coreRealPath    = createFakePackage(packagesDir, 'core')
    const widgetsRealPath = createFakePackage(packagesDir, 'widgets')
    const jsxRealPath     = createFakePackage(packagesDir, 'jsx')

    createNodeModulesSymlink(projectDir, coreRealPath,    'core')
    createNodeModulesSymlink(projectDir, widgetsRealPath, 'widgets')
    createNodeModulesSymlink(projectDir, jsxRealPath,     'jsx')

    const result = await findWorkspaceDeps(projectDir)

    expect(result).toHaveLength(3)
    expect(result.some(p => p.includes('core'))).toBe(true)
    expect(result.some(p => p.includes('widgets'))).toBe(true)
    expect(result.some(p => p.includes('jsx'))).toBe(true)
  })

  it('does NOT include non-workspace @termuijs packages (those from npm cache)', async () => {
    // A package installed from npm — its real path is in the npm/bun cache,
    // NOT in packages/. Simulate this by pointing the symlink at a
    // directory outside of packages/.
    const npmCacheDir = join(projectDir, '..', '..', 'npm-cache', '@termuijs')
    mkdirSync(join(npmCacheDir, 'some-pkg', 'dist'), { recursive: true })

    createNodeModulesSymlink(projectDir, join(npmCacheDir, 'some-pkg'), 'some-pkg')

    const result = await findWorkspaceDeps(projectDir)

    // Should be empty — the real path doesn't contain '/packages/'
    expect(result).toEqual([])
  })

  it('skips a broken symlink without throwing', async () => {
    // Create a symlink pointing to a path that does not exist
    const nodeModulesDir = join(projectDir, 'node_modules', '@termuijs')
    mkdirSync(nodeModulesDir, { recursive: true })
    symlinkSync('/nonexistent/path/that/does/not/exist', join(nodeModulesDir, 'broken-pkg'))

    // Should not throw — just skip the broken symlink
    const result = await findWorkspaceDeps(projectDir)
    expect(result).toEqual([])
  })
})
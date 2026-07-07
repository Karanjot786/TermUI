// packages/dev-server/src/workspace.ts
//
// Finds @termuijs/* workspace-linked packages so --watch-deps
// can watch their dist/ directories for hot reload.

import { existsSync } from 'node:fs'
import { readdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Finds all @termuijs/* symlinked packages under `projectRoot/node_modules/@termuijs/`
 * that resolve to a path inside the monorepo's `packages/` directory.
 *
 * In a pnpm/Bun workspace, workspace packages are symlinked from
 * node_modules/<name> → ../../packages/<name>. This function resolves
 * those symlinks to their real paths and returns only the ones that
 * live inside `packages/` (i.e., local workspace members, not published deps).
 *
 * @param projectRoot - The root of the app using dev-server (e.g., examples/dashboard)
 * @returns Array of real absolute paths to found workspace packages
 */
export async function findWorkspaceDeps(projectRoot: string): Promise<string[]> {
  const nodeModulesDir = join(projectRoot, 'node_modules', '@termuijs')

  if (!existsSync(nodeModulesDir)) {
    return []
  }

  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(nodeModulesDir, { withFileTypes: true })
  } catch {
    return []
  }

  const symlinkedPaths: string[] = []

  for (const entry of entries) {
    const fullPath = join(nodeModulesDir, entry.name)

    // Only process symlinks and directories — skip regular files
    if (!entry.isSymbolicLink() && !entry.isDirectory()) {
      continue
    }

    let realPath: string
    try {
      realPath = await realpath(fullPath)
    } catch {
      // Broken symlink — skip it
      continue
    }

    // Only include paths inside the monorepo's packages/ directory.
    // This filters out @termuijs/* packages installed from npm (their
    // real path would be in a cache dir, not in packages/).
    if (realPath.includes('/packages/') || realPath.includes('\\packages\\')) {
      symlinkedPaths.push(realPath)
    }
  }

  return symlinkedPaths
}
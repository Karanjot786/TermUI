import { createRequire } from 'node:module'

export interface DefaultLogFields {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

export interface LogResult<T = DefaultLogFields> {
  all: T[]
  latest: T | null
  total: number
}

export interface CommitResult {
  author: null | { name: string; email: string }
  branch: string
  commit: string
  summary: {
    changes: number
    insertions: number
    deletions: number
  }
}

export interface PushResult {
  pushed: Array<{
    deleted: boolean
    alreadyUpdated: boolean
    new: boolean
    forced: boolean
    localRef: string
    remoteRef: string
  }>
  repo: string
  update: null | {
    head: {
      local: string
      remote: string
    }
    hash: {
      from: string
      to: string
    }
  }
}

export interface PullResult {
  files: string[]
  insertions: Record<string, number>
  deletions: Record<string, number>
  summary: {
    changes: number
    insertions: number
    deletions: number
  }
}

interface SimpleGitClient {
  status(): Promise<{
    modified: string[]
    not_added: string[]
    staged: string[]
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log<T = DefaultLogFields>(options?: any): Promise<LogResult<T>> // any: simple-git options bag type not exported from package
  add(files: string | string[]): Promise<string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commit(message: string, options?: any): Promise<CommitResult> // any: simple-git options bag type not exported from package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  push(remote?: string, branch?: string, options?: any): Promise<PushResult> // any: simple-git options bag type not exported from package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pull(remote?: string, branch?: string, options?: any): Promise<PullResult> // any: simple-git options bag type not exported from package
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diff(options?: any): Promise<string> // any: simple-git options bag type not exported from package
}

export interface GitStatusResult {
  modified: string[]
  untracked: string[]
  staged: string[]
}

export interface GitAdapter {
  status(): Promise<GitStatusResult>
  log<T = DefaultLogFields>(options?: unknown): Promise<LogResult<T>>
  stage(files: string | string[]): Promise<string>
  commit(message: string, options?: unknown): Promise<CommitResult>
  push(remote?: string, branch?: string, options?: unknown): Promise<PushResult>
  pull(remote?: string, branch?: string, options?: unknown): Promise<PullResult>
  diff(options?: unknown): Promise<string>
}

let simpleGitModule: unknown = null

async function getSimpleGit(cwd?: string): Promise<SimpleGitClient> {
  if (!simpleGitModule) {
    try {
      const require = createRequire(import.meta.url)
      simpleGitModule = require('simple-git')
    } catch (err) {
      throw new Error(
        'The "simple-git" package is required to use the Git adapter. ' +
          'Please install it as a dependency in your project. ' +
          String(err),
        { cause: err }
      )
    }
  }

  // Typecast simpleGitModule to any to allow accessing dynamic ESM/CJS exports cleanly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = simpleGitModule as any // as any: CJS/ESM interop shape varies at runtime
  const factory = mod.simpleGit || mod.default || mod
  if (typeof factory !== 'function') {
    throw new Error('Failed to resolve simpleGit factory function from "simple-git" module.')
  }

  // Typecast the factory to a function signature that takes options and returns SimpleGitClient.
  const gitFactory = factory as (options?: { baseDir: string }) => SimpleGitClient
  return gitFactory(cwd ? { baseDir: cwd } : undefined)
}

export function useGit(cwd?: string): GitAdapter {
  return {
    async status(): Promise<GitStatusResult> {
      const git = await getSimpleGit(cwd)
      const statusResult = await git.status()
      return {
        modified: statusResult.modified,
        untracked: statusResult.not_added,
        staged: statusResult.staged,
      }
    },

    async log<T = DefaultLogFields>(options?: unknown): Promise<LogResult<T>> {
      const git = await getSimpleGit(cwd)
      // Typecast options to any to pass options parameter cleanly to the underlying simple-git implementation.
      return git.log<T>(options as any)
    },

    async stage(files: string | string[]): Promise<string> {
      const git = await getSimpleGit(cwd)
      return git.add(files)
    },

    async commit(message: string, options?: unknown): Promise<CommitResult> {
      const git = await getSimpleGit(cwd)
      // Typecast options to any to pass options parameter cleanly to the underlying simple-git implementation.
      return git.commit(message, options as any)
    },

    async push(remote?: string, branch?: string, options?: unknown): Promise<PushResult> {
      const git = await getSimpleGit(cwd)
      // Typecast options to any to pass options parameter cleanly to the underlying simple-git implementation.
      return git.push(remote, branch, options as any)
    },

    async pull(remote?: string, branch?: string, options?: unknown): Promise<PullResult> {
      const git = await getSimpleGit(cwd)
      // Typecast options to any to pass options parameter cleanly to the underlying simple-git implementation.
      return git.pull(remote, branch, options as any)
    },

    async diff(options?: unknown): Promise<string> {
      const git = await getSimpleGit(cwd)
      // Typecast options to any to pass options parameter cleanly to the underlying simple-git implementation.
      return git.diff(options as any)
    },
  }
}

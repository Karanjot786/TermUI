import type {
  SimpleGit,
  LogResult,
  DefaultLogFields,
  CommitResult,
  PushResult,
  PullResult,
} from 'simple-git'

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

async function getSimpleGit(cwd?: string): Promise<SimpleGit> {
  if (!simpleGitModule) {
    try {
      simpleGitModule = await import('simple-git')
    } catch {
      throw new Error(
        'The "simple-git" package is required to use the Git adapter. ' +
          'Please install it as a dependency in your project.'
      )
    }
  }

  // Typecast simpleGitModule to any to allow accessing dynamic ESM/CJS exports cleanly.
  const mod = simpleGitModule as any
  const factory = mod.simpleGit || mod.default || mod
  if (typeof factory !== 'function') {
    throw new Error('Failed to resolve simpleGit factory function from "simple-git" module.')
  }

  // Typecast the factory to a function signature that takes options and returns SimpleGit.
  const gitFactory = factory as (options?: { baseDir: string }) => SimpleGit
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

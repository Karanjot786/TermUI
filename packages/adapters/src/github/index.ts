'use strict'

import { createRequire } from 'node:module'

type OctokitConstructor = new (options?: { auth?: string }) => OctokitInstance

type OctokitMethod = (params: Record<string, unknown>) => Promise<unknown>

interface OctokitInstance {
  paginate<T>(method: OctokitMethod, params: Record<string, unknown>): Promise<T[]>
  rest: {
    repos: {
      listForUser(params: Record<string, unknown>): Promise<unknown>
      listReleases(params: Record<string, unknown>): Promise<unknown>
    }
    issues: {
      listForRepo(params: Record<string, unknown>): Promise<unknown>
    }
    pulls: {
      list(params: Record<string, unknown>): Promise<unknown>
    }
  }
}

export type GitHubNamespace<TParams extends object, TItem> = {
  list(params: TParams): Promise<TItem[]>
}

export interface ReposListParams {
  username: string
  type?: 'all' | 'owner' | 'member'
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
}

export interface Repo {
  id: number
  name: string
  full_name: string
  private?: boolean
  html_url?: string
  description?: string | null
  url?: string
}

export interface IssuesListParams {
  owner: string
  repo: string
  milestone?: string
  state?: 'open' | 'closed' | 'all'
  assignee?: string
  creator?: string
  mentioned?: string
  labels?: string
  sort?: 'created' | 'updated' | 'comments'
  direction?: 'asc' | 'desc'
  since?: string
}

export interface Issue {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  user: {
    login: string
  }
}

export interface PrsListParams {
  owner: string
  repo: string
  state?: 'open' | 'closed' | 'all'
  head?: string
  base?: string
  sort?: 'created' | 'updated' | 'popularity' | 'long-running'
  direction?: 'asc' | 'desc'
}

export interface PullRequest {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  user: {
    login: string
  }
  draft?: boolean
}

export interface ReleasesListParams {
  owner: string
  repo: string
  per_page?: number
}

export interface Release {
  id: number
  tag_name: string
  name: string | null
  html_url: string
  prerelease: boolean
  draft: boolean
  published_at: string | null
}

export type UseGitHubResult = {
  repos: GitHubNamespace<ReposListParams, Repo>
  issues: GitHubNamespace<IssuesListParams, Issue>
  prs: GitHubNamespace<PrsListParams, PullRequest>
  releases: GitHubNamespace<ReleasesListParams, Release>
}

function isMissingOctokitError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'MODULE_NOT_FOUND' &&
    error.message.includes('@octokit/rest')
  )
}

function resolveOctokitConstructor(): OctokitConstructor {
  try {
    const require = createRequire(import.meta.url)
    const loaded = require('@octokit/rest') as unknown

    if (typeof loaded === 'function') {
      return loaded as OctokitConstructor
    }

    if (typeof loaded === 'object' && loaded !== null && 'Octokit' in loaded) {
      return (loaded as { Octokit: OctokitConstructor }).Octokit
    }

    throw new Error('Unable to load `@octokit/rest`: unexpected module shape.')
  } catch (error) {
    if (isMissingOctokitError(error)) {
      throw new Error(
        'useGitHub() requires the optional peer dependency `@octokit/rest`. Install `@octokit/rest` in your app before calling useGitHub().',
        { cause: error }
      )
    }

    throw error
  }
}

function paginate<TItem, TParams extends object>(
  octokit: OctokitInstance,
  method: OctokitMethod,
  params: TParams
): Promise<TItem[]> {
  return octokit.paginate<TItem>(method, params as Record<string, unknown>)
}

export function useGitHub(token?: string): UseGitHubResult {
  const Octokit = resolveOctokitConstructor()
  const octokit = new Octokit(token ? { auth: token } : undefined)

  return {
    repos: {
      list: (params) => paginate<Repo, ReposListParams>(octokit, octokit.rest.repos.listForUser, params),
    },
    issues: {
      list: (params) => paginate<Issue, IssuesListParams>(octokit, octokit.rest.issues.listForRepo, params),
    },
    prs: {
      list: (params) => paginate<PullRequest, PrsListParams>(octokit, octokit.rest.pulls.list, params),
    },
    releases: {
      list: (params) => paginate<Release, ReleasesListParams>(octokit, octokit.rest.repos.listReleases, params),
    },
  }
}

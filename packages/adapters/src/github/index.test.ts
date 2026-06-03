import { afterEach, describe, expect, it, vi } from 'vitest'

let shouldThrowMissingOctokit = false
let mockOctokitInstance: MockOctokit | null = null

class MockOctokit {
  public readonly rest: {
    repos: {
      listForUser: (params: Record<string, unknown>) => Promise<{ data: unknown[] }>
      listReleases: (params: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }
    issues: {
      listForRepo: (params: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }
    pulls: {
      list: (params: Record<string, unknown>) => Promise<{ data: unknown[] }>
    }
  }

  public readonly paginate = vi.fn(async (
    method: (params: Record<string, unknown>) => Promise<{ data: unknown[] }>,
    params: Record<string, unknown>
  ) => {
    const response = await method(params)
    return response.data
  })

  constructor(options?: { auth?: string }) {
    mockOctokitInstance = this

    this.rest = {
      repos: {
        listForUser: async (params: Record<string, unknown>) => ({ data: [{ id: 1, name: 'repo-one', full_name: 'me/repo-one' }] }),
        listReleases: async (params: Record<string, unknown>) => ({
          data: [{ id: 4, tag_name: 'v1.0', name: 'Release 1', html_url: 'https://github.com/me/repo-one/releases/1', prerelease: false, draft: false, published_at: '2026-06-03T00:00:00Z' }],
        }),
      },
      issues: {
        listForRepo: async (params: Record<string, unknown>) => ({
          data: [{ id: 2, number: 7, title: 'Issue one', state: 'open', html_url: 'https://github.com/me/repo-one/issues/7', user: { login: 'me' } }],
        }),
      },
      pulls: {
        list: async (params: Record<string, unknown>) => ({
          data: [{ id: 3, number: 11, title: 'PR one', state: 'open', html_url: 'https://github.com/me/repo-one/pull/11', user: { login: 'me' }, draft: false }],
        }),
      },
    }
  }
}

function createMissingOctokitRequire(): NodeJS.Require {
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

function createOctokitRequire(): NodeJS.Require {
  const requireFn = Object.assign(
    (specifier: string) => {
      if (specifier === '@octokit/rest') {
        return { Octokit: MockOctokit }
      }
      throw new Error(`Cannot find module '${specifier}'`)
    },
    {
      resolve: (specifier: string) => specifier,
      cache: {},
      extensions: {},
      main: undefined,
    }
  )

  return requireFn as NodeJS.Require
}

async function loadUseGitHub() {
  return (await import('./index.js')).useGitHub
}

vi.mock('node:module', async (importActual) => {
  const actual = await importActual<typeof import('node:module')>()

  return {
    ...actual,
    createRequire: (...args: Parameters<typeof actual.createRequire>) => {
      return shouldThrowMissingOctokit ? createMissingOctokitRequire() : createOctokitRequire()
    },
  }
})

describe('useGitHub', () => {
  afterEach(() => {
    shouldThrowMissingOctokit = false
    mockOctokitInstance = null
  })

  it('throws a helpful error when @octokit/rest is missing', async () => {
    shouldThrowMissingOctokit = true
    const useGitHub = await loadUseGitHub()

    expect(() => useGitHub('token')).toThrow(
      'useGitHub() requires the optional peer dependency `@octokit/rest`.'
    )
  })

  it('returns repos namespace and lists repositories', async () => {
    const useGitHub = await loadUseGitHub()
    const gh = useGitHub('token')

    const repos = await gh.repos.list({ username: 'me' })

    expect(repos).toEqual([{ id: 1, name: 'repo-one', full_name: 'me/repo-one' }])
    expect(mockOctokitInstance?.paginate).toHaveBeenCalledTimes(1)
    expect(mockOctokitInstance?.paginate).toHaveBeenCalledWith(
      mockOctokitInstance?.rest.repos.listForUser,
      { username: 'me' }
    )
  })

  it('returns issues namespace and lists issues', async () => {
    const useGitHub = await loadUseGitHub()
    const gh = useGitHub()

    const issues = await gh.issues.list({ owner: 'me', repo: 'repo-one', state: 'open' })

    expect(issues).toEqual([
      {
        id: 2,
        number: 7,
        title: 'Issue one',
        state: 'open',
        html_url: 'https://github.com/me/repo-one/issues/7',
        user: { login: 'me' },
      },
    ])
    expect(mockOctokitInstance?.paginate).toHaveBeenCalledTimes(1)
  })

  it('returns prs namespace and lists pull requests', async () => {
    const useGitHub = await loadUseGitHub()
    const gh = useGitHub()

    const prs = await gh.prs.list({ owner: 'me', repo: 'repo-one', state: 'open' })

    expect(prs).toEqual([
      {
        id: 3,
        number: 11,
        title: 'PR one',
        state: 'open',
        html_url: 'https://github.com/me/repo-one/pull/11',
        user: { login: 'me' },
        draft: false,
      },
    ])
    expect(mockOctokitInstance?.paginate).toHaveBeenCalledTimes(1)
  })

  it('returns releases namespace and lists releases', async () => {
    const useGitHub = await loadUseGitHub()
    const gh = useGitHub()

    const releases = await gh.releases.list({ owner: 'me', repo: 'repo-one', per_page: 10 })

    expect(releases).toEqual([
      {
        id: 4,
        tag_name: 'v1.0',
        name: 'Release 1',
        html_url: 'https://github.com/me/repo-one/releases/1',
        prerelease: false,
        draft: false,
        published_at: '2026-06-03T00:00:00Z',
      },
    ])
    expect(mockOctokitInstance?.paginate).toHaveBeenCalledTimes(1)
  })

  it('uses the octokit paginate API for all list methods', async () => {
    const useGitHub = await loadUseGitHub()
    const gh = useGitHub()

    await gh.repos.list({ username: 'me' })
    await gh.issues.list({ owner: 'me', repo: 'repo-one', state: 'open' })
    await gh.prs.list({ owner: 'me', repo: 'repo-one', state: 'open' })
    await gh.releases.list({ owner: 'me', repo: 'repo-one', per_page: 10 })

    expect(mockOctokitInstance?.paginate).toHaveBeenCalledTimes(4)
  })
})

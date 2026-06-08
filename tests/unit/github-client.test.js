import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_CLIENT_CODE = readFileSync('./js/features/github/github-client.js', 'utf8')

function createGithubClientContext(fetchImpl, storedToken = '') {
  const ctx = vm.createContext({
    sessionStorage: { getItem: () => storedToken },
    fetch: fetchImpl,
    URL,
  })
  vm.runInContext(GITHUB_CLIENT_CODE, ctx)
  return ctx
}

function okResponse(data = []) {
  return {
    ok: true,
    headers: { get: () => '' },
    json: async () => data,
  }
}

describe('ghFetchAllPages()', () => {
  it('fetches every GitHub API page while GitHub sends a next-page link', async () => {
    const paths = []
    const ctx = createGithubClientContext(
      async (url) => {
        paths.push(url.replace('https://api.github.com', ''))
        const page = Number(new URL(url).searchParams.get('page'))
        // First page is full to prove the helper depends on Link, not item count alone.
        const data = page === 1
          ? Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
          : [{ id: 101 }]

        return {
          ok: true,
          // The production helper follows GitHub's Link header to find the next page.
          headers: {
            get: (name) => name === 'Link' && page === 1
              ? '<https://api.github.com/repositories/1/issues?state=all&per_page=100&page=2>; rel="next"'
              : '',
          },
          json: async () => data,
        }
      },
    )

    // This protects against syncing only the first GitHub API page.
    const result = await ctx.ghFetchAllPages('/repos/demo/repo/issues?state=all', { token: 'token-123' })

    expect(result).toHaveLength(101)
    // The helper should preserve existing query params and append pagination params.
    expect(paths).toEqual([
      '/repos/demo/repo/issues?state=all&per_page=100&page=1',
      '/repos/demo/repo/issues?state=all&per_page=100&page=2',
    ])
  })
})

describe('ghFetch()', () => {
  it('sends a trimmed bearer token and GitHub API version header', async () => {
    let requestOptions
    const ctx = createGithubClientContext(async (_url, options) => {
      requestOptions = options
      return okResponse()
    })

    await ctx.ghFetch('/repos/demo/repo/issues?state=all', { token: '  github_pat_test-token  ' })

    expect(requestOptions.headers.Authorization).toBe('Bearer github_pat_test-token')
    expect(requestOptions.headers['X-GitHub-Api-Version']).toBe('2022-11-28')
  })

  it('explains private repo access when GitHub returns 404 with a token', async () => {
    const ctx = createGithubClientContext(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not Found' }),
    }))

    let error
    try {
      await ctx.ghFetch('/repos/private/repo/issues?state=all', { token: 'secret-token' })
    } catch (err) {
      error = err
    }

    expect(error.message).toContain('GitHub repository not found or inaccessible')
    expect(error.message).toContain('token is authorized for this repository')
    expect(error.message).toContain('Issues and Pull requests')
    expect(error.message).not.toContain('secret-token')
  })

  it('prompts for a token when a private repo 404 happens without auth', async () => {
    const ctx = createGithubClientContext(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not Found' }),
    }))

    await expect(ctx.ghFetch('/repos/private/repo/pulls?state=all')).rejects.toThrow(
      /Private repos require a token/,
    )
  })
})

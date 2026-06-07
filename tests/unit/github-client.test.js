import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import vm from 'vm'

const GITHUB_CLIENT_CODE = readFileSync('./js/features/github/github-client.js', 'utf8')

describe('ghFetchAllPages()', () => {
  it('fetches every GitHub API page while GitHub sends a next-page link', async () => {
    const paths = []
    const ctx = vm.createContext({
      sessionStorage: { getItem: () => '' },
      fetch: async (url) => {
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
      URL,
    })
    vm.runInContext(GITHUB_CLIENT_CODE, ctx)

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

import { test as base, expect } from '@playwright/test'

// Tests never reach the internet: the browser may only talk to the CMS under test, and the CMS's
// own calls to AI services are answered here unless a test opts in to a real (local) model with
// `test.use({ stubAI: false })`.
export const test = base.extend<{ stubAI: boolean }>({
  stubAI: [true, { option: true }],
  context: async ({ context, baseURL }, run) => {
    const cms = new URL(baseURL!).host
    await context.route(
      (url) => !['data:', 'blob:'].includes(url.protocol) && url.host !== cms,
      (route) => route.abort('blockedbyclient'),
    )
    await run(context)
  },
  page: async ({ page, stubAI }, run) => {
    if (stubAI) {
      // What a provider says to a test key: it refuses it, and reports nothing about its models.
      await page.route('**/api/assistant/models', (route) =>
        route.fulfill({ status: 422, json: { error: 'The provider refused the key.', code: 'key-refused' } }),
      )
      await page.route('**/api/assistant/capabilities**', (route) => route.fulfill({ json: { models: {} } }))
      await page.route('**/api/assistant/chat', (route) =>
        route.fulfill({ status: 422, json: { error: 'The provider refused the key.' } }),
      )
    }
    await run(page)
  },
})

export { expect }

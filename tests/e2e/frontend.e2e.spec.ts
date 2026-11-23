import { expect, test } from '../helpers/test'

test('the CMS home redirects to the admin', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/admin(?:\/|$)/)
})

test('GraphQL is switched off; websites use REST', async ({ request }) => {
  expect((await request.post('/api/graphql', { data: { query: '{ __typename }' } })).status()).toBe(404)
  expect((await request.get('/api/graphql-playground')).status()).toBe(404)
})

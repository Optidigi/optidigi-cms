import { readFile } from 'node:fs/promises'
import { defineCLICommand } from 'payload/cli'
import { z } from 'zod'

export const bootstrapOperator = defineCLICommand({
  description: 'Create the first platform operator from local runtime secrets.',
  input: z.object({}),
  handler: async ({ getPayload }) => {
    const payload = await getPayload()
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs) throw new Error('The operator can only be initialized on an empty user collection.')

    const email = process.env.OPS_BOOTSTRAP_EMAIL
    const file = process.env.OPS_BOOTSTRAP_PASSWORD_FILE
    if (!email || !file) throw new Error('Set the operator email and bootstrap password file.')
    const password = (await readFile(file, 'utf8')).trim()
    if (password.length < 20) throw new Error('Use a bootstrap password of at least 20 characters.')

    await payload.create({
      collection: 'users',
      context: { bootstrapUser: true },
      data: { email, password, role: 'platform-admin' },
      overrideAccess: true,
    })
    return { result: { created: true } }
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vite resolves the tsconfig paths (`@/…`) itself.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})

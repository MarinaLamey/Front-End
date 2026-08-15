/**
 * Runner for the seed audit (`npm run audit:seed`).
 *
 * The audit imports application source, so it needs TypeScript, the `@/` alias and
 * extensionless imports resolved. Rather than add a TS runner as a dependency, it
 * borrows Vite's own SSR module loader — which reads this project's vite.config.ts,
 * so the script resolves modules exactly as the app does.
 */
import { createServer } from 'vite'

// The mock API persists through localStorage; Node has none, so stand one up first.
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => void store.clear(),
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { runSeedAudit } = await server.ssrLoadModule('/scripts/auditSeed.ts')
  process.exitCode = await runSeedAudit()
} catch (error) {
  console.error('\nSeed audit could not run:\n', error)
  process.exitCode = 1
} finally {
  await server.close()
}

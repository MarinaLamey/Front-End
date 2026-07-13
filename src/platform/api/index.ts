import type { OnboardingApi } from './contracts'
import { mockApi } from './mock/mockApi'
import { mockDb } from './mock/db'

export * from './contracts'
export { ApiError, isApiError, toUiError, type ApiErrorCode } from './errors'

/**
 * The active API. This is the SINGLE swap point: today it's the mock; when a real BFF
 * exists, add an `httpApi` implementing {@link OnboardingApi} and select it here
 * (e.g. via `import.meta.env.VITE_USE_MOCK`). No consumer changes.
 */
export const api: OnboardingApi = mockApi

/** Reset the demo data back to its seed (dev/demo affordance). */
export function resetDemoData(): void {
  mockDb.reset()
}

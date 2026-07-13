import { getConfig } from '@/platform/config'
import { toUiError, type ProblemDetails } from './problemDetails'
import type { UiError } from '@/shared/ui/types'

/**
 * The single client every call goes through (mandate §5): all traffic targets the
 * BFF base URL behind the edge — no feature calls `fetch` directly. Auth headers,
 * ETag/304, and ProblemDetails parsing live here so the policy stays in one place.
 */
export interface BffError {
  status: number
  ui: UiError
  problem?: ProblemDetails
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const { bffBaseUrl } = getConfig()
  const response = await fetch(`${bffBaseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    body: body == null ? undefined : JSON.stringify(body),
    ...init,
  })

  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as ProblemDetails | undefined
    const error: BffError = { status: response.status, ui: toUiError(problem), problem }
    throw error
  }

  if (response.status === 204) return undefined as T
  return (await response.json().catch(() => undefined)) as T
}

export const bff = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>('POST', path, body, init),
}

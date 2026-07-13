import type { UiError } from '@/shared/ui/types'

/** RFC 7807 problem document — the BFF's sync error contract (.NET ProblemDetails). */
export interface ProblemDetails {
  type?: string
  title: string
  status?: number
  detail?: string
  instance?: string
  [key: string]: unknown
}

const GENERIC: UiError = {
  title: 'We hit a snag',
  detail: 'Please try again in a moment.',
}

/** Map a problem document to the UI's typed, non-cryptic error (Pillar 4). */
export function toUiError(problem: unknown): UiError {
  if (problem && typeof problem === 'object' && 'title' in problem) {
    const p = problem as ProblemDetails
    return { title: p.title, detail: p.detail }
  }
  return GENERIC
}

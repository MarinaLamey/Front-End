/**
 * Shared UI primitives' cross-cutting types.
 *
 * `UiError` is the ONLY error shape any component accepts — it is structurally
 * impossible to render a raw string or "Something went wrong" (Pillar 4).
 * The parent maps a backend failure (RFC 7807 ProblemDetails on the sync path, or
 * the async failure envelope delivered over the socket) into this shape.
 */
export interface UiErrorAction {
  /** Visible, explicit next step, e.g. "Retry transaction", "Contact support". */
  label: string
  /** Caller-owned intent. Components never know what the action does. */
  onAction: () => void
}

export interface UiError {
  /** Short, human, non-cryptic. Never a stack trace. */
  title: string
  /** Optional reassuring detail, e.g. "Funds were not deducted." */
  detail?: string
  /** Optional recovery actions surfaced to the user. */
  actions?: UiErrorAction[]
}

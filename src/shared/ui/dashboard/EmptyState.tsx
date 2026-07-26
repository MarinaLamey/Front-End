import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  message: ReactNode
  /** Optional action (a button — enabled when verified, locked otherwise). */
  action?: ReactNode
}

/**
 * EmptyState — the centered "nothing here yet" block used inside cards (e.g. My RFQs with no
 * RFQs). A soft icon medallion, a message, and an optional action.
 */
export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-sunken text-content-tertiary [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </span>
      <p className="max-w-xs text-sm text-content-tertiary">{message}</p>
      {action}
    </div>
  )
}

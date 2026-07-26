import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface Step {
  title: string
  desc: string
}

interface StepsCardProps {
  title: string
  titleIcon?: ReactNode
  subtitle?: string
  /** Header action (e.g. "Check verification status" / "Resubmit documents"). */
  action?: ReactNode
  steps: Step[]
  /** Dim the steps (pre-verified: the flow is explained but not yet available). */
  locked?: boolean
}

/**
 * StepsCard — the numbered "how it works" strip. One component serves all three dashboard
 * states: verified ("Get started in 3 steps"), pending ("Sourcing unlocks once verified"), and
 * rejected ("Resubmit to continue") — the only differences are the title, the header action, and
 * whether the steps are dimmed (`locked`).
 */
export function StepsCard({ title, titleIcon, subtitle, action, steps, locked = false }: StepsCardProps) {
  return (
    <section className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-content-primary">
            {titleIcon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-content-tertiary">{subtitle}</p>}
        </div>
        {action}
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={cn(
              'flex gap-3 rounded-lg border border-border-subtle p-3.5',
              locked && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                locked ? 'bg-bg-surface-sunken text-content-tertiary' : 'bg-brand-subtle text-brand-primary',
              )}
            >
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-content-primary">{step.title}</p>
              <p className="mt-0.5 text-xs text-content-tertiary">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

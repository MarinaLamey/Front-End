import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { CheckIcon } from '@/features/onboarding/components/registerIcons'

export type TimelineState = 'done' | 'current' | 'upcoming'

export interface TimelineStep {
  label: string
  state: TimelineState
  /** Optional trailing note on the current step (e.g. "In progress"). */
  note?: ReactNode
}

interface TimelineProps {
  steps: TimelineStep[]
}

/**
 * Timeline — a generic vertical progress list (order tracking: Published → Bids received →
 * Negotiating → Award → …). Each step is done / current / upcoming; done shows a filled check,
 * current a ringed + pulsing dot, upcoming a hollow dot. The connector fills for completed steps.
 *
 * Motion (all compositor-only — transform/opacity, zero layout/paint per frame, gated by
 * `motion-safe:`): steps cascade in with a per-step stagger; completed connectors "draw" down;
 * the current marker emits a soft ping. `backwards`/`both` fills leave the resting (reduced-motion)
 * state fully visible. Purely presentational and reusable across buyer & supplier flows.
 */
export function Timeline({ steps }: TimelineProps) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        return (
          <li
            key={step.label}
            className="flex gap-3 motion-safe:animate-stepper-in"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {/* Marker + connector column. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  step.state === 'done' && 'bg-status-success text-white',
                  step.state === 'current' && 'bg-brand-primary text-brand-primary-on ring-4 ring-brand-subtle',
                  step.state === 'upcoming' && 'border-2 border-border-default bg-bg-surface',
                )}
              >
                {/* Soft ping behind the current marker — draws the eye to "where we are now". */}
                {step.state === 'current' && (
                  <span aria-hidden className="absolute inset-0 rounded-full bg-brand-primary motion-safe:animate-stepper-pulse" />
                )}
                {step.state === 'done' && <CheckIcon className="h-3.5 w-3.5" />}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'mt-1 w-0.5 flex-1 origin-top',
                    step.state === 'done' ? 'bg-status-success motion-safe:animate-connector-draw' : 'bg-border-subtle',
                  )}
                  style={step.state === 'done' ? { animationDelay: `${index * 90 + 140}ms` } : undefined}
                />
              )}
            </div>
            {/* Label + note. */}
            <div className={cn('flex flex-1 items-center justify-between gap-2 pb-6', isLast && 'pb-0')}>
              <span
                className={cn(
                  'text-sm',
                  step.state === 'upcoming' ? 'text-content-tertiary' : 'font-medium text-content-primary',
                )}
              >
                {step.label}
              </span>
              {step.note}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

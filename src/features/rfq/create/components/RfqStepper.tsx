import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import type { RfqStep } from '../rfqDraftStore'

const STEPS = ['requirement', 'delivery', 'suppliers', 'review'] as const

interface RfqStepperProps {
  current: RfqStep
  className?: string
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="stepper-check h-4 w-4"
    >
      <path d="M13.333 4 6 11.333 2.667 8" />
    </svg>
  )
}

/**
 * RfqStepper — the horizontal 4-step header. Uses the register rail's animation language
 * verbatim: rows stagger in with `stepper-in` (80ms per step, on the row), and every done /
 * current marker carries the `cell-flash-strong` purple↔teal halo staggered 1000ms per step so
 * the flash ripples along the rail (same delays as OnboardingStepper). The connector between
 * nodes draws itself with a GPU `scaleX` (origin flips under RTL). Purely presentational.
 */
export function RfqStepper({ current, className }: RfqStepperProps) {
  const { t } = useTranslation()

  return (
    <ol className={cn('flex w-full', className)}>
      {STEPS.map((key, index) => {
        const position = (index + 1) as RfqStep
        const state = position < current ? 'done' : position === current ? 'current' : 'upcoming'
        const flash = state === 'done' || state === 'current'

        return (
          <li
            key={key}
            style={{ animationDelay: `${index * 80}ms` }}
            className="relative flex flex-1 flex-col items-center gap-2 motion-safe:animate-stepper-in"
          >
            {/* Connector entering this node from the previous one. */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-[18px] h-0.5 -translate-y-1/2 overflow-hidden rounded-full start-[-50%] end-1/2"
              >
                <span className="absolute inset-0 bg-border-subtle" />
                <span
                  className={cn(
                    'absolute inset-0 origin-left bg-brand-primary transition-transform duration-500 ease-out rtl:origin-right motion-reduce:transition-none',
                    position <= current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}

            <span
              // Staggered flash delay → the halo ripples along the done/current markers.
              style={{ animationDelay: `${index * 1000}ms` }}
              className={cn(
                'relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                'transition-colors duration-500 motion-reduce:transition-none',
                state === 'upcoming' &&
                  'bg-bg-surface-sunken text-content-tertiary ring-1 ring-inset ring-border-subtle',
                state === 'done' && 'bg-brand-primary text-white',
                state === 'current' && 'bg-brand-primary text-white ring-2 ring-inset ring-brand-primary/30',
                flash && 'motion-safe:animate-cell-flash-strong',
              )}
            >
              {state === 'done' ? <CheckMark /> : position}
            </span>

            <span
              className={cn(
                'text-sm transition-colors duration-300 motion-reduce:transition-none',
                state === 'current'
                  ? 'font-semibold text-brand-primary'
                  : state === 'done'
                    ? 'font-medium text-content-primary'
                    : 'text-content-tertiary',
              )}
            >
              {t(`rfq.create.steps.${key}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

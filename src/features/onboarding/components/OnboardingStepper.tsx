import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import type { WizardStep } from '../useOnboardingWizard'

/** The six phases, split into the two rail groups shown in the Figma. */
const GROUPS = [
  { header: 'createAccount', steps: ['account', 'verifyPhone', 'verifyEmail'] },
  { header: 'organization', steps: ['company', 'address', 'review'] },
] as const

type StepState = 'done' | 'current' | 'upcoming' | 'error'

interface OnboardingStepperProps {
  /** 1-based current step. */
  current: WizardStep
  /** Treat every step as done (KYC approved / pending outcome screens). */
  allDone?: boolean
  /** Mark the final step as failed (KYC "needs attention"). */
  rejected?: boolean
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="stepper-check h-4 w-4">
      <path d="M13.333 4 6 11.333 2.667 8" />
    </svg>
  )
}

function CrossMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M12 4 4 12M4 4l8 8" />
    </svg>
  )
}

/**
 * OnboardingStepper — the vertical progress rail in the wizard's side panel, grouped under
 * CREATE ACCOUNT / ORGANIZATION headers. Presentational: given the current step it renders
 * each phase as done / current / upcoming (or the final step as failed for a rejected KYC).
 * Rows stagger in with the shared `stepper-in` keyframe; the panel gradient is owned by the
 * SplitShell via OnboardingLayout.
 */
export function OnboardingStepper({ current, allDone = false, rejected = false }: OnboardingStepperProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-6 pt-10 ">
      {GROUPS.map((group, groupIndex) => {
        const offset = GROUPS.slice(0, groupIndex).reduce((total, g) => total + g.steps.length, 0)
        return (
          <div key={group.header} className="flex flex-col ">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
              {t(`onboarding.rail.${group.header}`)}
            </p>

            <ol className="flex flex-col">
              {group.steps.map((key, stepIndex) => {
                const position = (offset + stepIndex + 1) as WizardStep
                const isLastInGroup = stepIndex === group.steps.length - 1

              const state: StepState =
                rejected && position === 6
                  ? 'error'
                  : allDone || position < current
                    ? 'done'
                    : position === current
                      ? 'current'
                      : 'upcoming'

              return (
                <li
                  key={key}
                  style={{ animationDelay: `${(offset + stepIndex) * 80}ms` }}
                  className="flex gap-4 motion-safe:animate-stepper-in"
                >
                  {/* Marker + connector column. */}
                  <div className="flex flex-col items-center">
                    <span
                      // Staggered flash delay → the halo ripples down the done/current markers.
                      style={{ animationDelay: `${(offset + stepIndex) * 1000}ms` }}
                      className={cn(
                        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        'transition-colors duration-500 motion-reduce:transition-none',
                        state === 'upcoming' && 'bg-white/15 text-white/70 ring-1 ring-inset ring-white/25',
                        state === 'done' && 'bg-white text-brand-primary motion-safe:animate-cell-flash-strong',
                        state === 'current' &&
                          'bg-white text-brand-primary ring-2 ring-inset ring-white/60 motion-safe:animate-cell-flash-strong',
                        state === 'error' && 'bg-white text-status-danger ring-1 ring-inset ring-status-danger/40',
                      )}
                    >
                      {state === 'done' ? <CheckMark /> : state === 'error' ? <CrossMark /> : position}
                    </span>

                    {!isLastInGroup && (
                      <span aria-hidden="true" className="relative mt-1.5 w-px flex-1 overflow-hidden">
                        <span className="absolute inset-0 bg-white/20" />
                        <span
                          className={cn(
                            'absolute inset-0 origin-top bg-white/70 transition-transform duration-500 ease-out motion-reduce:transition-none',
                            state === 'done' ? 'scale-y-100' : 'scale-y-0',
                          )}
                        />
                      </span>
                    )}
                  </div>

                  {/* Text column. */}
                  <div
                    className={cn(
                      'pb-6 transition-opacity duration-300 motion-reduce:transition-none',
                      state === 'upcoming' && 'opacity-80',
                    )}
                  >
                    <p className="text-sm font-medium text-white">{t(`onboarding.rail.steps.${key}.title`)}</p>
                    <p className="mt-0.5 text-sm text-white/70">{t(`onboarding.rail.steps.${key}.desc`)}</p>
                  </div>
                </li>
              )
            })}
            </ol>
          </div>
          )
        })}
    </div>
  )
}

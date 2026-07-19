import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { CheckIcon, ClockIcon } from './registerIcons'

/** 'complete' = the Review screen (all steps done); 'review' = the KYC pending screen. */
type SummaryVariant = 'complete' | 'review'

interface StepItem {
  title: string
  desc: string
}

interface OnboardingSummaryPanelProps {
  variant: SummaryVariant
}

/**
 * OnboardingSummaryPanel — the side panel shown INSTEAD of the step rail on the Review and
 * KYC-pending screens. A status header (icon + title + progress bar + meta line) over a
 * numbered "what happens next" list. Presentational; lives on the gradient panel so all text
 * is white. Rows stagger in with the shared `stepper-in` keyframe.
 */
export function OnboardingSummaryPanel({ variant }: OnboardingSummaryPanelProps) {
  const { t } = useTranslation()
  const steps = t(`onboarding.summary.${variant}.steps`, { returnObjects: true }) as StepItem[]
  const complete = variant === 'complete'

  return (
    <div className="flex w-full flex-col gap-8 pt-10">
      {/* Status header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-white',
              complete ? 'bg-status-success' : 'bg-status-warning',
            )}
          >
            {complete ? <CheckIcon className="h-5 w-5" /> : <ClockIcon className="h-4.5 w-4.5" />}
          </span>
          <p className="text-lg font-semibold text-white">{t(`onboarding.summary.${variant}.title`)}</p>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700 ease-out',
              complete ? 'w-full bg-status-success' : 'w-1/3 bg-status-warning',
            )}
          />
        </div>

        <p className="text-sm text-white/70">
          {complete
            ? t('onboarding.summary.complete.progress', { done: 6, total: 6 })
            : t('onboarding.summary.review.meta')}
        </p>
      </div>

      {/* What happens next */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {t('onboarding.summary.whatsNext')}
        </p>
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              style={{ animationDelay: `${index * 80}ms` }}
              className="flex gap-3 motion-safe:animate-stepper-in"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white ring-1 ring-inset ring-white/25">
                {index + 1}
              </span>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="mt-0.5 text-sm text-white/70">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { RequisitionIcon, RfqIcon, BidsIcon, AwardIcon, EscrowIcon } from './authTimelineIcons'

/** The five procurement-flow steps shown in the sign-in side panel, in order. */
const STEPS = [
  { key: 'requisition', Icon: RequisitionIcon },
  { key: 'rfq', Icon: RfqIcon },
  { key: 'bids', Icon: BidsIcon },
  { key: 'award', Icon: AwardIcon },
  { key: 'escrow', Icon: EscrowIcon },
] as const

/**
 * HowItWorksPanel — the marketing timeline that fills the auth card's gradient panel:
 * request → settlement in one flow. Purely presentational; the gradient/shape/padding are
 * owned by SplitShell. Items stagger in with the shared `stepper-in` keyframe (motion-safe).
 */
export function HowItWorksPanel() {
  const { t } = useTranslation()

  return (
    <div className="w-full text-white">
      <p className="text-xs font-medium text-white/70">{t('auth.flow.eyebrow')}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-8">{t('auth.flow.headline')}</h2>

      <ol className="mt-8 flex flex-col">
        {STEPS.map(({ key, Icon }, index) => {
          const isLast = index === STEPS.length - 1
          return (
            <li
              key={key}
              style={{ animationDelay: `${index * 90}ms` }}
              className="flex gap-4 motion-safe:animate-stepper-in"
            >
              {/* Badge + connector column. */}
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25">
                  <Icon className="h-4 w-4" />
                </span>
                {!isLast && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-white/20" />}
              </div>

              {/* Text column. */}
              <div className={cn(isLast ? 'pb-0' : 'pb-7')}>
                <p className="text-sm font-semibold">{t(`auth.flow.${key}Title`)}</p>
                <p className="mt-0.5 text-sm text-white/70">{t(`auth.flow.${key}Desc`)}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

import { type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StepFrame } from './StepFrame'
import { WizardFooter } from './WizardFooter'
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  GridIcon,
  LockIcon,
  SlidersIcon,
  UsersIcon,
  WarningIcon,
} from './registerIcons'
import type { KycStatus } from '../useOnboardingWizard'

interface KycScreenProps {
  status: KycStatus
  onGoToDashboard: () => void
  /** Pending only — preview an approved/rejected outcome. */
  onPreview?: (status: KycStatus) => void
  /** Rejected only — go back to fix the details. */
  onResubmit?: () => void
}

/** One "Next steps" row on the pending screen. */
function NextStep({ Icon, title, desc, trailing }: { Icon: ComponentType<{ className?: string }>; title: string; desc: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-surface-sunken text-content-secondary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-content-primary">{title}</span>
        <span className="text-xs text-content-tertiary">{desc}</span>
      </div>
      {trailing}
    </div>
  )
}

/**
 * KycScreen — the post-submission outcome (pending review / verified / needs attention).
 * Pending shows the "Next steps" checklist under a centered success header; approved and
 * rejected keep the left-aligned title with a status notice. Reuses StepFrame + WizardFooter.
 */
export function KycScreen({ status, onGoToDashboard, onPreview, onResubmit }: KycScreenProps) {
  const { t } = useTranslation()

  if (status === 'pending') {
    return (
      <StepFrame
        footer={
          <WizardFooter
            leading={
              <span className="text-sm text-content-tertiary">
                {t('onboarding.kyc.preview')}{' '}
                <button type="button" onClick={() => onPreview?.('approved')} className="font-medium text-content-link hover:text-content-link-hover">
                  {t('onboarding.kyc.previewApproved')}
                </button>
                {' · '}
                <button type="button" onClick={() => onPreview?.('rejected')} className="font-medium text-content-link hover:text-content-link-hover">
                  {t('onboarding.kyc.previewRejected')}
                </button>
              </span>
            }
            continueLabel={t('onboarding.kyc.goToDashboard')}
            onContinue={onGoToDashboard}
          />
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-subtle text-status-success">
              <CheckIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-content-primary">{t('onboarding.kyc.pending.title')}</h1>
              <p className="mt-1.5 text-base text-content-secondary">{t('onboarding.kyc.pending.subtitle')}</p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-status-warning-subtle px-3 py-1.5 text-sm font-medium text-status-warning">
            <ClockIcon className="h-4 w-4" />
            {t('onboarding.kyc.pending.badge')}
          </span>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-content-primary">{t('onboarding.kyc.nextSteps')}</h2>
            <NextStep Icon={UsersIcon} title={t('onboarding.kyc.inviteTeam')} desc={t('onboarding.kyc.inviteTeamDesc')} />
            <NextStep
              Icon={SlidersIcon}
              title={t('onboarding.kyc.firstRfq')}
              desc={t('onboarding.kyc.firstRfqDesc')}
              trailing={
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-content-tertiary">
                  <LockIcon className="h-3.5 w-3.5" />
                  {t('onboarding.kyc.locked')}
                </span>
              }
            />
            <NextStep Icon={GridIcon} title={t('onboarding.kyc.exploreDashboard')} desc={t('onboarding.kyc.exploreDashboardDesc')} />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-subtle p-3 text-sm text-status-warning">
            <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('onboarding.kyc.pending.note')}</span>
          </div>
        </div>
      </StepFrame>
    )
  }

  if (status === 'approved') {
    return (
      <StepFrame
        title={t('onboarding.kyc.approved.title')}
        subtitle={t('onboarding.kyc.approved.subtitle')}
        footer={<WizardFooter continueLabel={t('onboarding.kyc.goToDashboard')} onContinue={onGoToDashboard} />}
      >
        <div className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-subtle p-3 text-sm text-status-success">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('onboarding.kyc.approved.note')}</span>
        </div>
      </StepFrame>
    )
  }

  return (
    <StepFrame
      title={t('onboarding.kyc.rejected.title')}
      subtitle={t('onboarding.kyc.rejected.subtitle')}
      footer={
        <WizardFooter
          leading={
            <button type="button" className="text-sm font-medium text-content-secondary hover:text-content-primary">
              {t('onboarding.kyc.contactSupport')}
            </button>
          }
          continueLabel={t('onboarding.kyc.resubmit')}
          onContinue={onResubmit}
        />
      }
    >
      <div className="rounded-xl border border-status-danger-border bg-status-danger-subtle p-4">
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4 text-status-danger" />
          <span className="text-sm font-semibold text-content-primary">{t('onboarding.kyc.rejected.whatToFix')}</span>
        </div>
        <p className="mt-1 text-sm text-content-secondary">{t('onboarding.kyc.rejected.note')}</p>
      </div>
    </StepFrame>
  )
}

import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import { InfoIcon } from '../registerIcons'
import type { UiError } from '@/shared/ui/types'
import { formatAddress, type OnboardingData, type WizardStep } from '../../useOnboardingWizard'

interface ReviewStepProps {
  data: OnboardingData
  onBack: () => void
  onEdit: (step: WizardStep) => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: UiError | null
}

function SummaryCard({ title, onEdit, editLabel, children }: { title: string; onEdit: () => void; editLabel: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-content-link hover:text-content-link-hover">
          {editLabel}
        </button>
      </div>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="text-end font-medium text-content-primary">{children}</dd>
    </div>
  )
}

function Badge({ children, tone }: { children: ReactNode; tone: 'success' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        tone === 'success' ? 'text-status-success' : 'text-status-warning',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

/** Step 6 — read-only summary across the three groups, then submit to create the org. */
export function ReviewStep({ data, onBack, onEdit, onSubmit, isSubmitting, submitError }: ReviewStepProps) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  const roleLabel =
    data.role === 'both'
      ? t('onboarding.company.both')
      : data.role === 'supplier'
        ? t('onboarding.company.seller')
        : t('onboarding.company.buyer')

  return (
    <StepFrame
      title={t('onboarding.review.title')}
      subtitle={t('onboarding.review.subtitle')}
      footer={
        <WizardFooter
          onBack={onBack}
          continueLabel={t('onboarding.review.submit')}
          onContinue={onSubmit}
          disabled={!confirmed}
          loading={isSubmitting}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <SummaryCard title={t('onboarding.review.account')} editLabel={t('onboarding.edit')} onEdit={() => onEdit(1)}>
          <Row label={t('onboarding.account.fullName')}>{data.fullName || '—'}</Row>
          <Row label={t('onboarding.review.role')}>{roleLabel}</Row>
          <Row label={t('onboarding.company.organization')}>{data.orgName || '—'}</Row>
          <Row label={t('onboarding.company.crNumber')}>{data.cr || '—'}</Row>
          <Row label={t('onboarding.company.crCertificate')}>
            {data.crCertificate ? <span className="text-content-link">{data.crCertificate}</span> : '—'}
          </Row>
          <Row label={t('onboarding.account.email')}>{data.email || '—'}</Row>
          <Row label={t('onboarding.account.mobile')}>{data.mobile || '—'}</Row>
        </SummaryCard>

        <SummaryCard title={t('onboarding.review.verification')} editLabel={t('onboarding.edit')} onEdit={() => onEdit(2)}>
          <Row label={t('onboarding.review.verifiedBy')}>
            <span className="inline-flex items-center gap-2">
              {t('onboarding.review.phoneAndEmail')}
              {data.phoneVerified && data.emailVerified && <Badge tone="success">{t('auth.verified')}</Badge>}
            </span>
          </Row>
          <Row label={t('onboarding.review.contact')}>{data.email || '—'}</Row>
          <Row label={t('onboarding.review.kyc')}>
            <Badge tone="warning">{t('onboarding.review.pendingReview')}</Badge>
          </Row>
        </SummaryCard>

        <SummaryCard title={t('onboarding.review.orgProfile')} editLabel={t('onboarding.edit')} onEdit={() => onEdit(4)}>
          <Row label={t('onboarding.company.vatNumber')}>{data.vat || '—'}</Row>
          <Row label={t('onboarding.company.vatCertificate')}>
            {data.vatCertificate ? <span className="text-content-link">{data.vatCertificate}</span> : '—'}
          </Row>
          <Row label={t('onboarding.address.address')}>{formatAddress(data) || '—'}</Row>
          <Row label={t('onboarding.address.categories')}>{data.categories.join(', ') || '—'}</Row>
        </SummaryCard>

        <div className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-subtle p-3 text-sm text-status-warning">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('onboarding.viewOnlyNote')}</span>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-border-default accent-brand-primary"
          />
          {t('onboarding.review.confirm')}
        </label>

        {submitError && (
          <p role="alert" className="text-sm text-status-danger">
            {submitError.title}
          </p>
        )}

        <p className="text-center text-sm text-content-secondary">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-medium text-content-link hover:text-content-link-hover">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </StepFrame>
  )
}

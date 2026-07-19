import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import type { UiError } from '@/shared/ui/types'
import type { OnboardingData, WizardStep } from '../../useOnboardingWizard'

interface ReviewStepProps {
  data: OnboardingData
  onEdit: (step: WizardStep) => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: UiError | null
}

function SummaryCard({ title, onEdit, editLabel, children }: { title: string; onEdit: () => void; editLabel: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
        <button type="button" onClick={onEdit} className="text-sm font-medium text-content-link hover:text-content-link-hover">
          {editLabel}
        </button>
      </div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  // A plain-text value is clamped to one line (with the full text on hover) so a long name,
  // email, or org name can never overflow its column and shove the layout. Non-text children
  // (the cert link, the multi-line address) manage their own wrapping.
  const value =
    typeof children === 'string' ? (
      <span title={children} className="block truncate">
        {children}
      </span>
    ) : (
      children
    )

  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-content-tertiary">{label}</dt>
      <dd className="min-w-0 text-end font-medium text-content-primary">{value}</dd>
    </div>
  )
}

/**
 * A certificate file name (mock: no download target). Clamped to one line with an ellipsis so
 * a long name can't break the layout; the full name shows on hover via the native title tooltip
 * (an overlay — it doesn't take up space or shift anything).
 */
function CertLink({ name }: { name: string }) {
  return name ? (
    <span title={name} className="block truncate text-content-link">
      {name}
    </span>
  ) : (
    <>—</>
  )
}

/**
 * Compose the National Address into the two display lines shown on the review card:
 *   line 1 — building + street, district
 *   line 2 — city zip · Add'l · Unit
 */
function addressLines(data: OnboardingData): string[] {
  const line1 = [[data.buildingNo, data.street].filter(Boolean).join(' '), data.district].filter(Boolean).join(', ')
  const line2 = [
    [data.city, data.zip].filter(Boolean).join(' '),
    data.additionalNo && `Add'l ${data.additionalNo}`,
    data.unitNo && `Unit ${data.unitNo}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return [line1, line2].filter(Boolean)
}

/** Step 6 — read-only summary grouped into Account and Organisation profile, then submit. */
export function ReviewStep({ data, onEdit, onSubmit, isSubmitting, submitError }: ReviewStepProps) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  const roleLabel =
    data.role === 'both'
      ? t('onboarding.company.both')
      : data.role === 'supplier'
        ? t('onboarding.company.seller')
        : t('onboarding.company.buyer')

  const lines = addressLines(data)

  return (
    <StepFrame
      title={t('onboarding.review.title')}
      subtitle={t('onboarding.review.subtitle')}
      footer={
        <WizardFooter
          continueLabel={t('onboarding.review.submit')}
          onContinue={onSubmit}
          disabled={!confirmed}
          loading={isSubmitting}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* Account — login identity (step 1) + role/org/CR (step 3). Edit jumps to the start. */}
        <SummaryCard title={t('onboarding.review.account')} editLabel={t('onboarding.edit')} onEdit={() => onEdit(1)}>
          <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            <dl className="flex flex-col gap-1.5">
              <Row label={t('onboarding.account.fullName')}>{data.fullName || '—'}</Row>
              <Row label={t('onboarding.review.role')}>{roleLabel}</Row>
              <Row label={t('onboarding.company.organization')}>{data.orgName || '—'}</Row>
              <Row label={t('onboarding.company.crNumber')}>{data.cr || '—'}</Row>
            </dl>
            <dl className="flex flex-col gap-1.5">
              <Row label={t('onboarding.company.crCertificate')}>
                <CertLink name={data.crCertificate} />
              </Row>
              <Row label={t('onboarding.account.email')}>{data.email || '—'}</Row>
              <Row label={t('onboarding.account.mobile')}>{data.mobile ? `+966 ${data.mobile}` : '—'}</Row>
            </dl>
          </div>
        </SummaryCard>

        {/* Organisation profile — VAT (step 4) + categories/address (step 5). Edit jumps to VAT. */}
        <SummaryCard title={t('onboarding.review.orgProfile')} editLabel={t('onboarding.edit')} onEdit={() => onEdit(4)}>
          <dl className="flex flex-col gap-1.5">
            <Row label={t('onboarding.company.vatNumber')}>{data.vat || '—'}</Row>
            <Row label={t('onboarding.company.vatCertificate')}>
              <CertLink name={data.vatCertificate} />
            </Row>
            <Row label={t('onboarding.review.categories')}>
              {data.categories.length > 0 ? data.categories.join(', ') : '—'}
            </Row>
            <Row label={t('onboarding.address.address')}>
              {lines.length > 0 ? (
                <span className="flex flex-col">
                  {lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              ) : (
                '—'
              )}
            </Row>
          </dl>
        </SummaryCard>

        <label className="flex items-start gap-2.5 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-border-default accent-brand-primary"
          />
          {t('onboarding.review.confirm')}
        </label>

        {submitError && (
          <p role="alert" className="text-sm text-status-danger">
            {submitError.title}
          </p>
        )}
      </div>
    </StepFrame>
  )
}

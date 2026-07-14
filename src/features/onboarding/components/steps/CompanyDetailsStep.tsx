import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/platform/api'
import { cn } from '@/shared/lib/cn'
import { Field } from '@/shared/ui/Field'
import { FileDrop } from '@/shared/ui/FileDrop'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import { CartIcon, StoreIcon, RepeatIcon, UploadIcon } from '../registerIcons'
import type { OnboardingData, RegisterRole } from '../../useOnboardingWizard'

interface CompanyDetailsStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
}

const TYPES: { id: RegisterRole; Icon: typeof CartIcon; labelKey: string }[] = [
  { id: 'buyer', Icon: CartIcon, labelKey: 'onboarding.company.buyer' },
  { id: 'supplier', Icon: StoreIcon, labelKey: 'onboarding.company.seller' },
  { id: 'both', Icon: RepeatIcon, labelKey: 'onboarding.company.both' },
]

const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png'

/** Step 4 — account type + organization identity, CR/VAT numbers and certificate uploads. */
export function CompanyDetailsStep({ data, patch, onNext }: CompanyDetailsStepProps) {
  const { t } = useTranslation()
  // CR uniqueness, checked once when the step is completed — not per keystroke.
  const [crTaken, setCrTaken] = useState(false)
  const availability = useMutation({ mutationFn: api.checkAvailability })

  const canContinue =
    data.orgName.trim().length > 0 &&
    /^\d{10}$/.test(data.cr) &&
    data.crCertificate.length > 0 &&
    /^\d{15}$/.test(data.vat) &&
    data.vatCertificate.length > 0

  // Editing the CR clears its stale "already registered" flag.
  const setCr = (cr: string) => {
    patch({ cr })
    if (crTaken) setCrTaken(false)
  }

  // Gate the step: confirm the CR isn't already registered before advancing.
  const handleContinue = async () => {
    try {
      const result = await availability.mutateAsync({ cr: data.cr })
      const isTaken = result.cr === 'taken'
      setCrTaken(isTaken)
      if (!isTaken) onNext()
    } catch {
      // Availability check unreachable — don't trap the user; final submit still guards.
      onNext()
    }
  }

  const crError =
    data.cr.length > 0 && !/^\d{10}$/.test(data.cr)
      ? { title: t('validation.crInvalid') }
      : crTaken
        ? { title: t('validation.crTaken') }
        : null

  return (
    <StepFrame
      title={t('onboarding.company.title')}
      subtitle={t('onboarding.company.subtitle')}
      footer={
        <WizardFooter
          continueLabel={t('onboarding.continue')}
          onContinue={handleContinue}
          disabled={!canContinue}
          loading={availability.isPending}
        />
      }
    >
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-content-primary">
            {t('onboarding.company.accountType')}
            <span className="ms-0.5 text-status-danger">*</span>
          </legend>
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(({ id, Icon, labelKey }) => {
              const selected = data.role === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patch({ role: id })}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl p-4 outline transition-colors',
                    selected
                      ? 'bg-brand-subtle outline-[1.5px] -outline-offset-[1.5px] outline-brand-primary'
                      : 'bg-bg-surface outline-1 -outline-offset-1 outline-border-subtle hover:outline-border-focus',
                  )}
                >
                  <Icon className={cn('h-6 w-6', selected ? 'text-brand-primary' : 'text-content-secondary')} />
                  <span className="text-sm font-medium text-content-primary">{t(labelKey)}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-content-primary">{t('onboarding.company.organization')}</h2>

          <Field
            label={t('onboarding.company.orgName')}
            required
            placeholder={t('onboarding.company.orgNamePlaceholder')}
            value={data.orgName}
            onChange={(event) => patch({ orgName: event.target.value })}
            success={data.orgName.trim().length > 0}
          />

          <Field
            label={t('onboarding.company.crNumber')}
            required
            inputMode="numeric"
            placeholder={t('onboarding.company.crPlaceholder')}
            value={data.cr}
            onChange={(event) => setCr(event.target.value.replace(/\D/g, '').slice(0, 10))}
            error={crError}
            success={/^\d{10}$/.test(data.cr)}
          />

          <FileDrop
            label={t('onboarding.company.crCertificate')}
            required
            prompt={t('onboarding.company.uploadPrompt')}
            hint={t('onboarding.company.uploadHint')}
            accept={UPLOAD_ACCEPT}
            icon={<UploadIcon className="h-5 w-5" />}
            fileName={data.crCertificate || undefined}
            onFile={(file) => patch({ crCertificate: file?.name ?? '' })}
            removeLabel={t('onboarding.company.remove')}
          />

          <Field
            label={t('onboarding.company.vatNumber')}
            required
            inputMode="numeric"
            placeholder={t('auth.vatPlaceholder')}
            value={data.vat}
            onChange={(event) => patch({ vat: event.target.value.replace(/\D/g, '').slice(0, 15) })}
            error={data.vat.length > 0 && !/^\d{15}$/.test(data.vat) ? { title: t('validation.vatInvalid') } : null}
            success={/^\d{15}$/.test(data.vat)}
          />

          <FileDrop
            label={t('onboarding.company.vatCertificate')}
            required
            prompt={t('onboarding.company.uploadPrompt')}
            hint={t('onboarding.company.uploadHint')}
            accept={UPLOAD_ACCEPT}
            icon={<UploadIcon className="h-5 w-5" />}
            fileName={data.vatCertificate || undefined}
            onFile={(file) => patch({ vatCertificate: file?.name ?? '' })}
            removeLabel={t('onboarding.company.remove')}
          />

          <p className="inline-flex items-center gap-2 text-sm font-medium text-status-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t('onboarding.company.pendingReview')}
          </p>
        </div>
      </div>
    </StepFrame>
  )
}

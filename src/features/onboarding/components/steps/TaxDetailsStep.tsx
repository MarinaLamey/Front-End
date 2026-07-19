import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field'
import { FileDrop } from '@/shared/ui/FileDrop'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import { UploadIcon } from '../registerIcons'
import type { OnboardingData } from '../../useOnboardingWizard'

interface TaxDetailsStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png'

const isVat = (vat: string) => /^\d{15}$/.test(vat)

/** Step 4 — VAT registration: the 15-digit number and its certificate. Split out of Company details. */
export function TaxDetailsStep({ data, patch, onNext, onBack }: TaxDetailsStepProps) {
  const { t } = useTranslation()

  const canContinue = isVat(data.vat) && data.vatCertificate.length > 0

  return (
    <StepFrame
      title={t('onboarding.tax.title')}
      subtitle={t('onboarding.tax.subtitle')}
      footer={
        <WizardFooter onBack={onBack} continueLabel={t('onboarding.continue')} onContinue={onNext} disabled={!canContinue} />
      }
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-content-primary">{t('onboarding.tax.section')}</h2>

        <Field
          label={t('onboarding.company.vatNumber')}
          required
          inputMode="numeric"
          placeholder={t('auth.vatPlaceholder')}
          value={data.vat}
          onChange={(event) => patch({ vat: event.target.value.replace(/\D/g, '').slice(0, 15) })}
          error={data.vat.length > 0 && !isVat(data.vat) ? { title: t('validation.vatInvalid') } : null}
          success={isVat(data.vat)}
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
      </div>
    </StepFrame>
  )
}

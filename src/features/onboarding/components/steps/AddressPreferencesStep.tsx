import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field'
import { MultiSelect } from '@/shared/ui/MultiSelect'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import type { OnboardingData } from '../../useOnboardingWizard'

interface AddressPreferencesStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const CATEGORIES = ['Construction', 'Logistics', 'Electrical', 'Industrial', 'IT & Software', 'Facilities']

// Saudi National Address formats.
const BUILDING_RE = /^\d{4}$/ // e.g. 7201
const ADDITIONAL_RE = /^\d{4}$/ // e.g. 2443
const ZIP_RE = /^\d{5}$/ // e.g. 13315
const UNIT_RE = /^\d{1,4}$/ // e.g. 12
// Names (city / district / street): a letter (any script incl. Arabic) followed by letters,
// spaces, or name punctuation (' . -). No digits or other symbols.
const NAME_RE = /^\p{L}[\p{L}\s'.-]*$/u

/** Strip to digits and clamp to `max` — for the numeric national-address fields. */
const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

/** True when a name field is non-empty and letters-only (validated on the trimmed value). */
const isValidName = (value: string) => NAME_RE.test(value.trim())

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
      {children}
    </div>
  )
}

/** Step 5 — Saudi National Address + preferred product categories. */
export function AddressPreferencesStep({ data, patch, onNext, onBack }: AddressPreferencesStepProps) {
  const { t } = useTranslation()

  const canContinue =
    BUILDING_RE.test(data.buildingNo) &&
    (data.additionalNo === '' || ADDITIONAL_RE.test(data.additionalNo)) &&
    isValidName(data.street) &&
    isValidName(data.district) &&
    isValidName(data.city) &&
    ZIP_RE.test(data.zip) &&
    UNIT_RE.test(data.unitNo) &&
    data.categories.length > 0

  return (
    <StepFrame
      title={t('onboarding.address.title')}
      subtitle={t('onboarding.address.subtitle')}
      footer={
        <WizardFooter onBack={onBack} continueLabel={t('onboarding.continue')} onContinue={onNext} disabled={!canContinue} />
      }
    >
      <div className="flex flex-col gap-6">
        <Section title={t('onboarding.address.address')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.buildingNo')}
              required
              inputMode="numeric"
              placeholder="7201"
              value={data.buildingNo}
              onChange={(event) => patch({ buildingNo: digits(event.target.value, 4) })}
              error={
                data.buildingNo.length > 0 && !BUILDING_RE.test(data.buildingNo)
                  ? { title: t('validation.buildingNoInvalid') }
                  : null
              }
            />
            <Field
              label={t('onboarding.address.additionalNo')}
              inputMode="numeric"
              placeholder="2443"
              value={data.additionalNo}
              onChange={(event) => patch({ additionalNo: digits(event.target.value, 4) })}
              error={
                data.additionalNo.length > 0 && !ADDITIONAL_RE.test(data.additionalNo)
                  ? { title: t('validation.additionalNoInvalid') }
                  : null
              }
            />
          </div>
          <Field
            label={t('onboarding.address.street')}
            required
            placeholder="King Fahd Road"
            value={data.street}
            onChange={(event) => patch({ street: event.target.value })}
            error={
              data.street.trim().length > 0 && !isValidName(data.street)
                ? { title: t('validation.lettersOnly') }
                : null
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.district')}
              required
              placeholder="As Sahafah"
              value={data.district}
              onChange={(event) => patch({ district: event.target.value })}
              error={
                data.district.trim().length > 0 && !isValidName(data.district)
                  ? { title: t('validation.lettersOnly') }
                  : null
              }
            />
            <Field
              label={t('onboarding.address.cityName')}
              required
              placeholder="Riyadh"
              value={data.city}
              onChange={(event) => patch({ city: event.target.value })}
              error={
                data.city.trim().length > 0 && !isValidName(data.city)
                  ? { title: t('validation.lettersOnly') }
                  : null
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.zip')}
              required
              inputMode="numeric"
              placeholder="13315"
              value={data.zip}
              onChange={(event) => patch({ zip: digits(event.target.value, 5) })}
              error={data.zip.length > 0 && !ZIP_RE.test(data.zip) ? { title: t('validation.zipInvalid') } : null}
            />
            <Field
              label={t('onboarding.address.unitNo')}
              required
              inputMode="numeric"
              placeholder="12"
              value={data.unitNo}
              onChange={(event) => patch({ unitNo: digits(event.target.value, 4) })}
              error={data.unitNo.length > 0 && !UNIT_RE.test(data.unitNo) ? { title: t('validation.unitNoInvalid') } : null}
            />
          </div>
        </Section>

        <Section title={t('onboarding.address.preferences')}>
          <MultiSelect
            label={t('onboarding.address.categories')}
            required
            options={CATEGORIES}
            value={data.categories}
            onChange={(categories) => patch({ categories })}
            placeholder={t('onboarding.address.categoriesPlaceholder')}
            removeLabel={t('onboarding.company.remove')}
          />
        </Section>
      </div>
    </StepFrame>
  )
}

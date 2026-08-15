import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Field } from '@/shared/ui/Field'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { isNameOnly } from '@/shared/lib/validators'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import type { UiError } from '@/shared/ui/types'
import type { OnboardingData, RegisterRole } from '../../useOnboardingWizard'

interface ReviewStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onSubmit: () => void
  isSubmitting: boolean
  submitError: UiError | null
}

const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png'

// Saudi National Address formats — mirrors AddressPreferencesStep so Review edits validate identically.
const BUILDING_RE = /^\d{4}$/
const ADDITIONAL_RE = /^\d{4}$/
const ZIP_RE = /^\d{5}$/
const UNIT_RE = /^\d{1,4}$/
const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

/** A bordered group card ("Account" / "Organisation") holding editable fields. */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-content-primary">{title}</h3>
      {children}
    </div>
  )
}

/**
 * An uploaded certificate row: the file name (link-coloured) with a Replace action that opens
 * the file picker. Mock: only the file NAME is stored, exactly like the step uploads.
 */
function FileRow({
  label,
  fileName,
  onFile,
  replaceLabel,
  uploadLabel,
}: {
  label: string
  fileName: string
  onFile: (file: File | null) => void
  replaceLabel: string
  uploadLabel: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content-primary">{label}</span>
      <div className="flex h-10 w-full items-center justify-between gap-3 rounded-lg bg-bg-surface px-3 outline outline-1 [outline-offset:-1px] outline-border-default">
        <span className={cn('truncate text-sm', fileName ? 'text-content-link' : 'text-content-tertiary')}>
          {fileName || '—'}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          {fileName ? replaceLabel : uploadLabel}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </div>
  )
}

/**
 * The National Address block — a composed read view with an Edit toggle that reveals the same
 * fields and validation as step 5. Cancel restores the pre-edit values; Save closes when valid.
 */
function AddressReview({
  data,
  patch,
}: {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
}) {
  const { t } = useTranslation()
  const cities = t('onboarding.address.cities', { returnObjects: true }) as string[]
  const [editing, setEditing] = useState(false)
  const snapshot = useRef<Partial<OnboardingData> | null>(null)

  const valid =
    BUILDING_RE.test(data.buildingNo) &&
    (data.additionalNo === '' || ADDITIONAL_RE.test(data.additionalNo)) &&
    isNameOnly(data.street) &&
    isNameOnly(data.district) &&
    isNameOnly(data.city) &&
    ZIP_RE.test(data.zip) &&
    UNIT_RE.test(data.unitNo)

  const openEdit = () => {
    snapshot.current = {
      buildingNo: data.buildingNo,
      additionalNo: data.additionalNo,
      street: data.street,
      district: data.district,
      city: data.city,
      zip: data.zip,
      unitNo: data.unitNo,
    }
    setEditing(true)
  }
  const cancel = () => {
    if (snapshot.current) patch(snapshot.current)
    setEditing(false)
  }
  const save = () => {
    if (valid) setEditing(false)
  }

  const line1 = [data.buildingNo, data.street].filter(Boolean).join(' ')
  const line2 = [data.district, [data.city, data.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  const detail = [
    data.additionalNo && `${t('onboarding.address.additionalNo')} ${data.additionalNo}`,
    data.unitNo && `${t('onboarding.address.unitNo')} ${data.unitNo}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-content-primary">
          {t('onboarding.address.address')}
        </h4>
        {!editing && (
          <button
            type="button"
            onClick={openEdit}
            className="text-sm font-medium text-content-link hover:text-content-link-hover"
          >
            {t('onboarding.review.edit')}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.buildingNo')}
              required
              inputMode="numeric"
              value={data.buildingNo}
              onChange={(e) => patch({ buildingNo: digits(e.target.value, 4) })}
              success={BUILDING_RE.test(data.buildingNo)}
              error={
                data.buildingNo.length > 0 && !BUILDING_RE.test(data.buildingNo)
                  ? { title: t('validation.buildingNoInvalid') }
                  : null
              }
            />
            <Field
              label={t('onboarding.address.additionalNo')}
              inputMode="numeric"
              value={data.additionalNo}
              onChange={(e) => patch({ additionalNo: digits(e.target.value, 4) })}
              success={data.additionalNo !== '' && ADDITIONAL_RE.test(data.additionalNo)}
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
            value={data.street}
            onChange={(e) => patch({ street: e.target.value })}
            success={isNameOnly(data.street)}
            error={
              data.street.trim().length > 0 && !isNameOnly(data.street)
                ? { title: t('validation.lettersOnly') }
                : null
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.district')}
              required
              value={data.district}
              onChange={(e) => patch({ district: e.target.value })}
              success={isNameOnly(data.district)}
              error={
                data.district.trim().length > 0 && !isNameOnly(data.district)
                  ? { title: t('validation.lettersOnly') }
                  : null
              }
            />
            <SearchSelect
              label={t('onboarding.address.cityName')}
              required
              options={cities}
              value={data.city}
              onChange={(city) => patch({ city })}
              placeholder={t('onboarding.address.cityPlaceholder')}
              searchPlaceholder={t('onboarding.address.searchCity')}
              emptyLabel={t('onboarding.address.noCity')}
              success={data.city.length > 0}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.address.zip')}
              required
              inputMode="numeric"
              value={data.zip}
              onChange={(e) => patch({ zip: digits(e.target.value, 5) })}
              success={ZIP_RE.test(data.zip)}
              error={
                data.zip.length > 0 && !ZIP_RE.test(data.zip)
                  ? { title: t('validation.zipInvalid') }
                  : null
              }
            />
            <Field
              label={t('onboarding.address.unitNo')}
              required
              inputMode="numeric"
              value={data.unitNo}
              onChange={(e) => patch({ unitNo: digits(e.target.value, 4) })}
              success={UNIT_RE.test(data.unitNo)}
              error={
                data.unitNo.length > 0 && !UNIT_RE.test(data.unitNo)
                  ? { title: t('validation.unitNoInvalid') }
                  : null
              }
            />
          </div>
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={cancel}
              className="text-sm font-medium text-content-secondary hover:text-content-primary"
            >
              {t('onboarding.review.cancel')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!valid}
              className="text-sm font-semibold text-content-link hover:text-content-link-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('onboarding.review.saveAddress')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-0.5 text-sm text-content-secondary">
          {line1 && <p>{line1}</p>}
          {line2 && <p>{line2}</p>}
          {detail && <p>{detail}</p>}
          {!line1 && !line2 && !detail && <p className="text-content-tertiary">—</p>}
        </div>
      )}
    </div>
  )
}

interface NextItem {
  title: string
  desc: string
}

/**
 * ReviewStep — step 6, full-width and fully EDITABLE: every value collected in earlier steps
 * can be corrected here directly (no jumping back). Certificates can be replaced in place, the
 * role re-chosen, and the "what happens next" strip explains the post-submit review window.
 */
export function ReviewStep({ data, patch, onSubmit, isSubmitting, submitError }: ReviewStepProps) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  const nextSteps = t('onboarding.review.next.steps', { returnObjects: true }) as NextItem[]

  // The role picker reuses the city SearchSelect (same panel + animations); it works on the
  // translated labels, so map label ↔ coded role value here.
  const roleOptions: { value: RegisterRole; label: string }[] = [
    { value: 'buyer', label: t('onboarding.company.buyer') },
    { value: 'supplier', label: t('onboarding.company.seller') },
    { value: 'both', label: t('onboarding.company.both') },
  ]

  // Same rules as the collecting steps — Submit stays disabled until everything is valid.
  const valid =
    isNameOnly(data.fullName) &&
    isNameOnly(data.orgName) &&
    /^\d{10}$/.test(data.cr) &&
    /^3\d{13}3$/.test(data.vat)

  return (
    <StepFrame
      title={t('onboarding.review.title')}
      subtitle={t('onboarding.review.subtitle')}
      footer={
        <WizardFooter
          continueLabel={t('onboarding.review.submit')}
          onContinue={onSubmit}
          disabled={!confirmed || !valid}
          loading={isSubmitting}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* Account — name + role, both editable. Email/mobile are verified so they're not here. */}
        <Card title={t('onboarding.review.account')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.account.fullName')}
              value={data.fullName}
              onChange={(event) => patch({ fullName: event.target.value })}
              success={isNameOnly(data.fullName)}
              error={
                data.fullName.trim().length > 0 && !isNameOnly(data.fullName)
                  ? { title: t('validation.lettersOnly') }
                  : null
              }
            />
            <SearchSelect
              label={t('onboarding.review.role')}
              options={roleOptions.map((option) => option.label)}
              value={roleOptions.find((option) => option.value === data.role)?.label ?? ''}
              onChange={(label) => {
                const next = roleOptions.find((option) => option.label === label)
                if (next) patch({ role: next.value })
              }}
              searchable={false}
              success={Boolean(data.role)}
            />
          </div>
        </Card>

        {/* Organisation — identity, tax and certificates, all editable in place. */}
        <Card title={t('onboarding.company.organization')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('onboarding.company.orgName')}
              value={data.orgName}
              onChange={(event) => patch({ orgName: event.target.value })}
              success={isNameOnly(data.orgName)}
              error={
                data.orgName.trim().length > 0 && !isNameOnly(data.orgName)
                  ? { title: t('validation.lettersOnly') }
                  : null
              }
            />
            <Field
              label={t('onboarding.company.vatNumber')}
              inputMode="numeric"
              value={data.vat}
              onChange={(event) => patch({ vat: event.target.value.replace(/\D/g, '').slice(0, 15) })}
              success={/^3\d{13}3$/.test(data.vat)}
              error={data.vat.length > 0 && !/^3\d{13}3$/.test(data.vat) ? { title: t('validation.vatInvalid') } : null}
            />
            <Field
              label={t('onboarding.company.crNumber')}
              inputMode="numeric"
              value={data.cr}
              onChange={(event) => patch({ cr: event.target.value.replace(/\D/g, '').slice(0, 10) })}
              success={/^\d{10}$/.test(data.cr)}
              error={data.cr.length > 0 && !/^\d{10}$/.test(data.cr) ? { title: t('validation.crInvalid') } : null}
            />
            <FileRow
              label={t('onboarding.company.vatCertificate')}
              fileName={data.vatCertificate}
              onFile={(file) => patch({ vatCertificate: file?.name ?? '' })}
              replaceLabel={t('onboarding.review.replace')}
              uploadLabel={t('onboarding.review.upload')}
            />
            <FileRow
              label={t('onboarding.company.crCertificate')}
              fileName={data.crCertificate}
              onFile={(file) => patch({ crCertificate: file?.name ?? '' })}
              replaceLabel={t('onboarding.review.replace')}
              uploadLabel={t('onboarding.review.upload')}
            />
            <FileRow
              label={t('onboarding.address.certificate')}
              fileName={data.addressCertificate}
              onFile={(file) => patch({ addressCertificate: file?.name ?? '' })}
              replaceLabel={t('onboarding.review.replace')}
              uploadLabel={t('onboarding.review.upload')}
            />
            <AddressReview data={data} patch={patch} />
          </div>
        </Card>

        {/* What happens next — the post-submit window, with "limited access" called out. */}
        <div className="rounded-xl bg-bg-surface-sunken p-4 sm:p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-content-tertiary">
            {t('onboarding.review.next.heading')}
          </p>
          <ol className="grid gap-4 sm:grid-cols-4">
            {nextSteps.map((step, index) => {
              // The "limited access" item is the state the user lands in — highlight it.
              const highlighted = index === 1
              return (
                <li key={step.title} className="flex gap-2.5">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      highlighted
                        ? 'bg-status-warning text-white'
                        : 'bg-interactive-hover text-content-secondary',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <p className={cn('text-sm font-medium', highlighted ? 'text-status-warning' : 'text-content-primary')}>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-content-tertiary">{step.desc}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

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

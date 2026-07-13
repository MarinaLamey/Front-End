import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { useTenant } from '@/platform/tenancy'
import type { OnboardingRole } from '@/platform/api'
import { ValidationCard } from '../../onboarding/components/ValidationCard'
import { useOrgProfile } from '../useOrgProfile'

interface OrgProfileWizardProps {
  orgId: string
  roles: OnboardingRole[]
  onSubmitted: () => void
}

/** Step 3 of onboarding — Organization Profile setup with CR/VAT validation (HLD §6). */
export function OrgProfileWizard({ orgId, roles, onSubmitted }: OrgProfileWizardProps) {
  const { t } = useTranslation()
  const { tenant } = useTenant()
  const {
    form,
    setField,
    setIdentifier,
    hasBuyer,
    hasSupplier,
    isDual,
    validation,
    validate,
    submit,
    canSubmit,
    isSubmitting,
    submitError,
  } = useOrgProfile({ orgId, roles, onSubmitted })

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-5 rounded-2xl border border-border-subtle bg-bg-surface p-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-content-primary">{t('auth.profileTitle')}</h1>
        <p className="text-sm text-content-secondary">
          {t('auth.profileSubtitle', { tenant: tenant.name })}
        </p>
      </div>

      {/* CR / VAT validation (shared identifiers). */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ValidationCard
          label={t('auth.crLabel')}
          placeholder={t('auth.crPlaceholder')}
          value={form.cr}
          onChange={(value) => setIdentifier('cr', value)}
          onValidate={() => validate('cr')}
          status={validation.cr.status}
          message={validation.cr.message}
        />
        <ValidationCard
          label={t('auth.vatLabel')}
          placeholder={t('auth.vatPlaceholder')}
          value={form.vat}
          onChange={(value) => setIdentifier('vat', value)}
          onValidate={() => validate('vat')}
          status={validation.vat.status}
          message={validation.vat.message}
        />
      </div>

      {/* Dual-role: the supplier entity may carry a different CR/VAT. */}
      {isDual && (
        <label className="flex items-center gap-2.5 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={form.useSeparateForSupplier}
            onChange={(event) => setField('useSeparateForSupplier', event.target.checked)}
            className="h-[18px] w-[18px] rounded border-border-default accent-brand-primary"
          />
          {t('auth.useSeparateCrVat')}
        </label>
      )}

      {isDual && form.useSeparateForSupplier && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ValidationCard
            label={`${t('auth.supplierProfile')} — ${t('auth.crLabel')}`}
            placeholder={t('auth.crPlaceholder')}
            value={form.supplierCr}
            onChange={(value) => setIdentifier('supplierCr', value)}
            onValidate={() => validate('supplierCr')}
            status={validation.supplierCr.status}
            message={validation.supplierCr.message}
          />
          <ValidationCard
            label={`${t('auth.supplierProfile')} — ${t('auth.vatLabel')}`}
            placeholder={t('auth.vatPlaceholder')}
            value={form.supplierVat}
            onChange={(value) => setIdentifier('supplierVat', value)}
            onValidate={() => validate('supplierVat')}
            status={validation.supplierVat.status}
            message={validation.supplierVat.message}
          />
        </div>
      )}

      {/* Shared contact + address. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t('auth.officialEmail')}
          type="email"
          value={form.officialEmail}
          onChange={(event) => setField('officialEmail', event.target.value)}
        />
        <Field
          label={t('auth.mobile')}
          inputMode="tel"
          placeholder={t('auth.mobilePlaceholder')}
          value={form.mobile}
          onChange={(event) => setField('mobile', event.target.value)}
        />
        <Field
          className="sm:col-span-2"
          label={t('auth.address')}
          placeholder={t('auth.addressPlaceholder')}
          value={form.address}
          onChange={(event) => setField('address', event.target.value)}
        />
        <Field
          label={t('auth.city')}
          value={form.city}
          onChange={(event) => setField('city', event.target.value)}
        />
        <Field
          label={t('auth.country')}
          value={form.country}
          onChange={(event) => setField('country', event.target.value)}
        />
      </div>

      {/* Per-role details. */}
      {hasBuyer && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-content-primary">{t('auth.buyerProfile')}</h2>
          <Field
            label={t('auth.preferredCategories')}
            placeholder={t('auth.categoriesPlaceholder')}
            value={form.buyerCategories}
            onChange={(event) => setField('buyerCategories', event.target.value)}
          />
        </div>
      )}

      {hasSupplier && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-content-primary">{t('auth.supplierProfile')}</h2>
          <Field
            label={t('auth.suppliedCategories')}
            placeholder={t('auth.categoriesPlaceholder')}
            value={form.supplierCategories}
            onChange={(event) => setField('supplierCategories', event.target.value)}
          />
          <Field
            label={t('auth.supplierType')}
            placeholder={t('auth.supplierTypePlaceholder')}
            value={form.supplierType}
            onChange={(event) => setField('supplierType', event.target.value)}
          />
        </div>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-status-danger">
          {submitError.title}
        </p>
      )}

      <div className="relative">
        <Button type="button" size="lg" fullWidth onClick={submit} disabled={isSubmitting || !canSubmit}>
          {t('auth.submitProfile')}
        </Button>
        {isSubmitting && <TracingBorder radius={8} />}
      </div>
    </div>
  )
}

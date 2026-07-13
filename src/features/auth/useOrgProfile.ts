import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError, type OnboardingRole, type OrgProfileInput, type RoleProfileInput } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'
import type { ValidationStatus } from '../onboarding/components/ValidationCard'

/** CR is 10 digits, VAT is 15 (HLD §6). */
const CR_RE = /^\d{10}$/
const VAT_RE = /^\d{15}$/
const isCrKey = (key: ValidationKey) => key === 'cr' || key === 'supplierCr'

/** The editable profile form. CR/VAT can differ for the supplier entity (HLD §6.2). */
export interface OrgProfileForm {
  cr: string
  vat: string
  supplierCr: string
  supplierVat: string
  useSeparateForSupplier: boolean
  address: string
  city: string
  country: string
  officialEmail: string
  mobile: string
  registrationDate: string
  expiryDate: string
  buyerCategories: string
  supplierCategories: string
  supplierType: string
}

/** Which fields carry their own CR/VAT validation action + result. */
export type ValidationKey = 'cr' | 'vat' | 'supplierCr' | 'supplierVat'

interface ValidationEntry {
  status: ValidationStatus
  message?: string
}

interface UseOrgProfileOptions {
  orgId: string
  roles: OnboardingRole[]
  onSubmitted: () => void
}

export interface UseOrgProfileResult {
  form: OrgProfileForm
  setField: <K extends keyof OrgProfileForm>(key: K, value: OrgProfileForm[K]) => void
  hasBuyer: boolean
  hasSupplier: boolean
  isDual: boolean
  /** Set a CR/VAT identifier — digits only, capped at its length; clears its prior result. */
  setIdentifier: (key: ValidationKey, raw: string) => void
  /** Per-field CR/VAT validation status + result message. */
  validation: Record<ValidationKey, ValidationEntry>
  /** Run the CR or VAT lookup for a field (format-checked first; mock registry). */
  validate: (key: ValidationKey) => void
  submit: () => void
  /** False until CR/VAT formats + mandatory contact fields are filled. */
  canSubmit: boolean
  isSubmitting: boolean
  submitError: UiError | null
}

const EMPTY_FORM: OrgProfileForm = {
  cr: '',
  vat: '',
  supplierCr: '',
  supplierVat: '',
  useSeparateForSupplier: false,
  address: '',
  city: '',
  country: '',
  officialEmail: '',
  mobile: '',
  registrationDate: '',
  expiryDate: '',
  buyerCategories: '',
  supplierCategories: '',
  supplierType: '',
}

const IDLE: ValidationEntry = { status: 'idle' }

function splitCategories(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * useOrgProfile — the onboarding profile wizard's behavior, with no markup (HLD §6).
 *
 * Owns the form state, the keyed CR/VAT validation (each field validates independently
 * against the mock registry, and a valid primary CR back-fills city + dates), and the
 * final submit. For dual-role orgs the supplier can carry a different CR/VAT via a toggle;
 * otherwise both profiles share the primary identifiers.
 */
export function useOrgProfile({ orgId, roles, onSubmitted }: UseOrgProfileOptions): UseOrgProfileResult {
  const { t } = useTranslation()
  const [form, setForm] = useState<OrgProfileForm>(EMPTY_FORM)
  const [validation, setValidation] = useState<Record<ValidationKey, ValidationEntry>>({
    cr: IDLE,
    vat: IDLE,
    supplierCr: IDLE,
    supplierVat: IDLE,
  })

  const hasBuyer = roles.includes('buyer')
  const hasSupplier = roles.includes('supplier')
  const isDual = hasBuyer && hasSupplier

  const setField: UseOrgProfileResult['setField'] = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setValidation1 = (key: ValidationKey, entry: ValidationEntry) =>
    setValidation((prev) => ({ ...prev, [key]: entry }))

  const setIdentifier: UseOrgProfileResult['setIdentifier'] = (key, raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, isCrKey(key) ? 10 : 15)
    setForm((prev) => ({ ...prev, [key]: digits }))
    setValidation1(key, IDLE) // editing invalidates the previous lookup result
  }

  const validate = async (key: ValidationKey) => {
    const value = form[key].trim()
    if (!value) return
    // Client-side format gate before hitting the registry.
    if (!(isCrKey(key) ? CR_RE : VAT_RE).test(value)) {
      setValidation1(key, {
        status: 'invalid',
        message: t(isCrKey(key) ? 'validation.crInvalid' : 'validation.vatInvalid'),
      })
      return
    }
    setValidation1(key, { status: 'validating' })
    try {
      if (key === 'cr' || key === 'supplierCr') {
        const record = await api.validateCr(value)
        setValidation1(key, { status: 'valid', message: record.organizationName })
        // A valid primary CR back-fills the shared address/registration fields.
        if (key === 'cr') {
          setForm((prev) => ({
            ...prev,
            city: prev.city || record.city,
            registrationDate: prev.registrationDate || record.registrationDate,
            expiryDate: prev.expiryDate || record.expiryDate,
          }))
        }
      } else {
        const record = await api.validateVat(value)
        setValidation1(key, { status: 'valid', message: record.organizationName })
      }
    } catch (error) {
      setValidation1(key, { status: 'invalid', message: toUiError(error).title })
    }
  }

  const buildProfile = (): OrgProfileInput => {
    const shared = {
      address: form.address,
      city: form.city,
      country: form.country,
      officialEmail: form.officialEmail,
      mobile: form.mobile,
      registrationDate: form.registrationDate || undefined,
      expiryDate: form.expiryDate || undefined,
    }
    const profile: OrgProfileInput = {}
    if (hasBuyer) {
      profile.buyer = {
        ...shared,
        cr: form.cr,
        vat: form.vat,
        productCategories: splitCategories(form.buyerCategories),
      } satisfies RoleProfileInput
    }
    if (hasSupplier) {
      profile.supplier = {
        ...shared,
        cr: form.useSeparateForSupplier ? form.supplierCr : form.cr,
        vat: form.useSeparateForSupplier ? form.supplierVat : form.vat,
        productCategories: splitCategories(form.supplierCategories),
        supplierType: form.supplierType,
      } satisfies RoleProfileInput
    }
    return profile
  }

  const submitMutation = useMutation({
    mutationFn: () => api.submitProfile(orgId, buildProfile()),
    onSuccess: onSubmitted,
  })

  // Mandatory-field gate (HLD §6.5): valid CR/VAT formats + the shared contact fields,
  // plus the supplier's own CR/VAT when it carries different identifiers.
  const identifiersOk = CR_RE.test(form.cr) && VAT_RE.test(form.vat)
  const supplierIdsOk =
    !(hasSupplier && form.useSeparateForSupplier) ||
    (CR_RE.test(form.supplierCr) && VAT_RE.test(form.supplierVat))
  const contactOk = [form.address, form.city, form.country, form.officialEmail, form.mobile].every(
    (field) => field.trim().length > 0,
  )
  const canSubmit = identifiersOk && supplierIdsOk && contactOk

  return {
    form,
    setField,
    setIdentifier,
    hasBuyer,
    hasSupplier,
    isDual,
    validation,
    validate,
    submit: () => submitMutation.mutate(),
    canSubmit,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error ? toUiError(submitMutation.error) : null,
  }
}

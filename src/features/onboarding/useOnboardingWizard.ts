import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError, type OnboardingRole } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6
/** Account type. 'supplier' is labelled "Seller" in the UI. */
export type RegisterRole = 'buyer' | 'supplier' | 'both'
export type KycStatus = 'pending' | 'approved' | 'rejected'

/** Everything collected across the six steps; submitted at Review. */
export interface OnboardingData {
  // Step 1 — Account details
  fullName: string
  email: string
  mobile: string
  password: string
  confirmPassword: string
  terms: boolean
  // Steps 2 & 3 — verification
  phoneVerified: boolean
  emailVerified: boolean
  // Step 4 — Company details
  role: RegisterRole
  orgName: string
  cr: string
  crCertificate: string
  vat: string
  vatCertificate: string
  // Step 5 — Address details
  buildingNo: string
  additionalNo: string
  street: string
  district: string
  city: string
  zip: string
  unitNo: string
  categories: string[]
}

const INITIAL_DATA: OnboardingData = {
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  terms: false,
  phoneVerified: false,
  emailVerified: false,
  role: 'buyer',
  orgName: '',
  cr: '',
  crCertificate: '',
  vat: '',
  vatCertificate: '',
  buildingNo: '',
  additionalNo: '',
  street: '',
  district: '',
  city: '',
  zip: '',
  unitNo: '',
  categories: [],
}

/**
 * Draft persistence — an interrupted registration is saved to localStorage so a returning
 * user can resume. Bump the key suffix on a breaking data-shape change. Note: real File
 * objects can't be persisted — only the certificate file *names* survive (enough for the
 * mock; a real BFF would re-request the upload).
 */
const DRAFT_KEY = 'miproc.register.draft.v1'

interface Draft {
  step: WizardStep
  data: OnboardingData
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Draft>
    if (typeof parsed.step !== 'number' || !parsed.data) return null
    const step = Math.min(6, Math.max(1, parsed.step)) as WizardStep
    // Merge onto INITIAL so an older draft tolerates newly-added fields.
    return { step, data: { ...INITIAL_DATA, ...parsed.data } }
  } catch {
    return null
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Only offer to resume once the user has actually entered something. */
function isResumable(draft: Draft | null): draft is Draft {
  return (
    !!draft &&
    (draft.step > 1 || draft.data.fullName.trim().length > 0 || draft.data.email.trim().length > 0)
  )
}

/** Maps the account type to the roles the org will hold. */
export function rolesFor(role: RegisterRole): OnboardingRole[] {
  return role === 'both' ? ['buyer', 'supplier'] : [role]
}

/** Compose the collected address parts into one line (for the API + review). */
export function formatAddress(data: OnboardingData): string {
  const line1 = [data.buildingNo, data.street].filter(Boolean).join(' ')
  const line2 = [data.district, data.city, data.zip].filter(Boolean).join(' ')
  const unit = data.unitNo ? `Unit ${data.unitNo}` : ''
  return [line1, line2, unit].filter(Boolean).join(', ')
}

export interface UseOnboardingWizardResult {
  step: WizardStep
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  next: () => void
  back: () => void
  goTo: (step: WizardStep) => void
  /** Submit at Review → creates the org → moves to the KYC outcome. */
  submit: () => void
  isSubmitting: boolean
  submitError: UiError | null
  /** Non-null once submitted; drives the KYC outcome screen. */
  kyc: KycStatus | null
  setKyc: (status: KycStatus | null) => void
  /** A saved draft exists → show the Resume / Start-over prompt before the wizard. */
  resumeAvailable: boolean
  /** The step the saved draft was left on (for the rail on the resume prompt). */
  resumeStep: WizardStep
  /** Load the saved draft and continue. */
  resume: () => void
  /** Discard the saved draft and start fresh. */
  startOver: () => void
}

/**
 * useOnboardingWizard — the registration wizard's state, with no markup.
 *
 * Holds the data collected across all six steps (Account → Verify phone → Verify email →
 * Company → Address → Review) and the current step; steps read/patch it. Review submits
 * everything via the mock/BFF `completeRegistration`, then the flow shows the KYC outcome
 * (pending by default; the demo can preview approved/rejected).
 */
export function useOnboardingWizard(): UseOnboardingWizardResult {
  // Read any saved draft once, at mount, before the persist effect can overwrite it.
  const [savedDraft] = useState<Draft | null>(() => readDraft())
  const [resumeAvailable, setResumeAvailable] = useState(() => isResumable(savedDraft))
  // Gate persistence until the user has chosen Resume / Start over (so the empty fresh
  // state doesn't clobber their saved draft before they decide).
  const [resumeResolved, setResumeResolved] = useState(() => !isResumable(savedDraft))

  const [step, setStep] = useState<WizardStep>(1)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [kyc, setKyc] = useState<KycStatus | null>(null)

  // Persist progress as they go — once the resume choice is made and before submission.
  useEffect(() => {
    if (!resumeResolved || kyc) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data }))
    } catch {
      /* storage unavailable — ignore */
    }
  }, [step, data, resumeResolved, kyc])

  const patch: UseOnboardingWizardResult['patch'] = (partial) =>
    setData((prev) => ({ ...prev, ...partial }))

  const clampStep = (value: number): WizardStep => Math.min(6, Math.max(1, value)) as WizardStep

  const submitMutation = useMutation({
    mutationFn: () =>
      api.completeRegistration({
        roles: rolesFor(data.role),
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        organizationName: data.orgName,
        cr: data.cr,
        vat: data.vat,
        address: formatAddress(data),
        city: data.city,
        country: 'Saudi Arabia',
        registrationDate: '',
        expiryDate: '',
        productCategories: data.categories,
      }),
    // Registration submitted → the draft is done.
    onSuccess: () => {
      clearDraft()
      setKyc('pending')
    },
  })

  return {
    step,
    data,
    patch,
    next: () => setStep((s) => clampStep(s + 1)),
    back: () => setStep((s) => clampStep(s - 1)),
    goTo: (target) => setStep(target),
    submit: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error ? toUiError(submitMutation.error) : null,
    kyc,
    setKyc,
    resumeAvailable,
    resumeStep: savedDraft?.step ?? 1,
    resume: () => {
      if (savedDraft) {
        setStep(savedDraft.step)
        setData(savedDraft.data)
      }
      setResumeResolved(true)
      setResumeAvailable(false)
    },
    startOver: () => {
      clearDraft()
      setResumeResolved(true)
      setResumeAvailable(false)
    },
  }
}

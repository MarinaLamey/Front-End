// Public surface for the onboarding feature. Nafath types are held back until the
// workflow doc lands (async flow / terminal states).
export { OnboardingPage } from './OnboardingPage'
export { validateCr, validateVat } from './services/onboardingService'
export { useCrValidation } from './hooks/useCrValidation'
export { useVatValidation } from './hooks/useVatValidation'
export { ValidationCard, type ValidationStatus } from './components/ValidationCard'

export type {
  WathqLookupRequest,
  WathqLookupResponse,
  WathqLookupStatus,
  WathqEntity,
  EntityStatus,
  AuthorizedRepresentative,
} from './types/wathq'

export type {
  CrValidationRequest,
  CrValidationResponse,
  VatValidationRequest,
  VatValidationResponse,
  ValidationOutcome,
} from './types/cr-vat'

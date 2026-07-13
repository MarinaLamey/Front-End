import { bff } from '@/platform/bff'
import { getConfig } from '@/platform/config'
import type {
  CrValidationRequest,
  CrValidationResponse,
  VatValidationRequest,
  VatValidationResponse,
} from '../types/cr-vat'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Decoupled CR / VAT validation. Each hits its own endpoint and returns its own
 * server-generated UUID. Mock outcomes key off the KSA digit lengths (CR 10, VAT 15)
 * so the form can be exercised end-to-end before the middleware is live.
 */
export async function validateCr(request: CrValidationRequest): Promise<CrValidationResponse> {
  if (getConfig().useMocks) {
    await delay(700)
    const isValid = /^\d{10}$/.test(request.crNumber)
    return {
      id: crypto.randomUUID(),
      crNumber: request.crNumber,
      businessName: isValid ? 'Acme Industries Co.' : undefined,
      status: isValid ? 'valid' : 'invalid',
      details: isValid ? undefined : 'CR number must be 10 digits.',
      verifiedAt: new Date().toISOString(),
    }
  }
  return bff.post<CrValidationResponse>('/v1/onboarding/validate-cr', request)
}

export async function validateVat(request: VatValidationRequest): Promise<VatValidationResponse> {
  if (getConfig().useMocks) {
    await delay(700)
    const isValid = /^\d{15}$/.test(request.vatNumber)
    return {
      id: crypto.randomUUID(),
      vatNumber: request.vatNumber,
      businessName: isValid ? 'Acme Industries Co.' : undefined,
      status: isValid ? 'valid' : 'invalid',
      details: isValid ? undefined : 'VAT number must be 15 digits.',
      verifiedAt: new Date().toISOString(),
    }
  }
  return bff.post<VatValidationResponse>('/v1/onboarding/validate-vat', request)
}

import { useMutation } from '@tanstack/react-query'
import { validateVat } from '../services/onboardingService'

/** Independent VAT validation state — decoupled from CR so a branch CR + group VAT
 *  validate separately, each anchored by its own UUID. */
export function useVatValidation() {
  return useMutation({ mutationFn: validateVat })
}

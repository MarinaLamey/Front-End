import { useMutation } from '@tanstack/react-query'
import { validateCr } from '../services/onboardingService'

/** Independent CR validation state (one instance per card). A mutation, so it never
 *  triggers a refetch/invalidation — it just holds isPending/data/error for this input. */
export function useCrValidation() {
  return useMutation({ mutationFn: validateCr })
}

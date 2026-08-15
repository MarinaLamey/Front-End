import { useOrganisationQuery } from './hooks/orgQueries'
import type { OrganisationData } from './types'

/**
 * useOrganisation — the read seam for the Org-Admin area, backed by {@link organisationApi}
 * through TanStack Query.
 *
 * It deliberately does NOT overlay `tenant.name`. That value is the PLATFORM brand pre-auth
 * ("Sign in to MI-Proc") and only becomes an org name after registration, so overlaying it made
 * the Overview header disagree with the profile form and the purchase-order PDF on the same
 * session. The organisation record is the single source of truth for who this company is.
 *
 * Returns `undefined` while loading; every consumer renders a spinner for that.
 */
export function useOrganisation(): { data?: OrganisationData; isLoading: boolean } {
  const { data, isLoading } = useOrganisationQuery()
  return { data, isLoading }
}

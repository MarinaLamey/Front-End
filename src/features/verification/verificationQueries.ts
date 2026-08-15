import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTenant } from '@/platform/tenancy'
import { DEMO_ORG } from '@/platform/demo'
import {
  verificationApi,
  type DocKey,
  type OrgRegistration,
  type OrgVerification,
} from '@/platform/api/verification'

export const verificationKeys = {
  org: (orgId: string) => ['verification', 'org', orgId] as const,
  queue: () => ['verification', 'queue'] as const,
}

/**
 * The current buyer org as a registration payload. `orgId` comes from the tenant store; the name
 * and the CR / VAT / National Address numbers are the demo organisation's own
 * ({@link DEMO_ORG}) — the same ones the Organisation record and the purchase orders carry, so a
 * demo login sees one company rather than two. Overwritten by the real values when the user
 * registers (OnboardingPage → openRequest).
 */
export function useCurrentOrgMeta(): OrgRegistration {
  const tenant = useTenant((s) => s.tenant)
  return {
    orgId: tenant.id,
    orgName: DEMO_ORG.legalName,
    cr: DEMO_ORG.cr,
    vat: DEMO_ORG.vat,
    nationalAddress: DEMO_ORG.nationalAddressCode,
  }
}

/**
 * Buyer read — the org's verification request. Reads the real record; if none exists yet (e.g. a
 * demo login that never went through registration) it opens one from `meta`. Registered orgs
 * already have a record, so their submitted numbers/decisions are never overwritten here.
 */
export function useOrgVerification(meta: OrgRegistration) {
  return useQuery({
    queryKey: verificationKeys.org(meta.orgId),
    queryFn: () => verificationApi.getOrg(meta.orgId).then((record) => record ?? verificationApi.openRequest(meta)),
  })
}

/** Admin read — the full review queue. */
export function useVerificationQueue() {
  return useQuery({
    queryKey: verificationKeys.queue(),
    queryFn: () => verificationApi.listQueue(),
  })
}

/** Admin decision on one document. Per the Zero-Fetch rule we project the result — no refetch. */
export function useDecideDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, doc, decision, reason }: { orgId: string; doc: DocKey; decision: 'verified' | 'rejected'; reason?: string }) =>
      verificationApi.decideDoc(orgId, doc, decision, reason),
    onSuccess: (updated) => project(qc, updated),
  })
}

/** Buyer re-submits one rejected document. */
export function useResubmitDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, doc }: { orgId: string; doc: DocKey }) => verificationApi.resubmitDoc(orgId, doc),
    onSuccess: (updated) => project(qc, updated),
  })
}

/** Write the updated record into both the org and queue caches so every view stays in step. */
function project(qc: QueryClient, updated: OrgVerification) {
  qc.setQueryData(verificationKeys.org(updated.orgId), updated)
  qc.setQueryData<OrgVerification[]>(verificationKeys.queue(), (old) =>
    old ? old.map((row) => (row.orgId === updated.orgId ? updated : row)) : old,
  )
}

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { organisationApi } from '../services/organisationApi'
import type { InviteInput, OrgAddress, OrgMemberRole, OrganisationData, OrgProfile, OrgSettings } from '../types'

export const orgKeys = {
  detail: () => ['organisation'] as const,
}

export function useOrganisationQuery() {
  return useQuery({ queryKey: orgKeys.detail(), queryFn: () => organisationApi.get() })
}

/**
 * Every mutation returns the authoritative record, so project it straight into the cache instead
 * of refetching (Zero-Fetch). One helper because all of them settle the same way.
 */
function project(qc: QueryClient, record: OrganisationData) {
  qc.setQueryData(orgKeys.detail(), record)
}

function useOrgMutation<TArgs>(fn: (args: TArgs) => Promise<OrganisationData>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (record) => project(qc, record),
  })
}

export function useSaveOrgProfile() {
  return useOrgMutation(({ profile, address }: { profile: OrgProfile; address: OrgAddress }) =>
    organisationApi.saveProfile(profile, address),
  )
}

/**
 * Settings have no Save button — each toggle writes on flip. The switch is painted from the
 * cache immediately so it never lags the tap, and rolls back if the write fails.
 */
export function useSaveOrgSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: OrgSettings) => organisationApi.saveSettings(settings),
    onMutate: (settings) => {
      const previous = qc.getQueryData<OrganisationData>(orgKeys.detail())
      if (previous) qc.setQueryData(orgKeys.detail(), { ...previous, settings })
      return { previous }
    },
    onError: (_err, _settings, context) => {
      if (context?.previous) qc.setQueryData(orgKeys.detail(), context.previous)
    },
    onSuccess: (record) => project(qc, record),
  })
}

export function useAddOrgDocument() {
  return useOrgMutation(({ type, fileName }: { type: string; fileName: string }) =>
    organisationApi.addDocument(type, fileName),
  )
}

export function useDeleteOrgDocument() {
  return useOrgMutation((docId: string) => organisationApi.deleteDocument(docId))
}

export function useReuploadOrgDocument() {
  return useOrgMutation(({ docId, fileName }: { docId: string; fileName: string }) =>
    organisationApi.reuploadDocument(docId, fileName),
  )
}

export function useInviteMember() {
  return useOrgMutation((input: InviteInput) => organisationApi.inviteMember(input))
}

export function useSetMemberRole() {
  return useOrgMutation(({ memberId, role }: { memberId: string; role: OrgMemberRole }) =>
    organisationApi.setMemberRole(memberId, role),
  )
}

export function useDisableMember() {
  return useOrgMutation((memberId: string) => organisationApi.disableMember(memberId))
}

export function useRestoreMember() {
  return useOrgMutation((memberId: string) => organisationApi.restoreMember(memberId))
}

export function useRemoveMember() {
  return useOrgMutation((memberId: string) => organisationApi.removeMember(memberId))
}

export function useResendInvite() {
  return useOrgMutation((memberId: string) => organisationApi.resendInvite(memberId))
}

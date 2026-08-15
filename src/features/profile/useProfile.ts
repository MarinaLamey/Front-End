import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, type Seat } from '@/platform/auth'
import { profileApi, type Profile } from './services/profileApi'

export const profileKeys = {
  detail: (seat: Seat) => ['profile', seat] as const,
}

/** The signed-in person's profile, resolved from their seat and whatever the session already knows. */
export function useProfile() {
  const user = useAuth((state) => state.user)
  const seat: Seat = user?.seat ?? 'buyer'
  const query = useQuery({
    queryKey: profileKeys.detail(seat),
    queryFn: () => profileApi.getProfile(seat, { name: user?.name, email: user?.email }),
  })
  return { seat, ...query }
}

/** Save the profile — projects the saved record straight into the cache (no refetch). */
export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ seat, profile }: { seat: Seat; profile: Profile }) => profileApi.saveProfile(seat, profile),
    onSuccess: (record, { seat }) => qc.setQueryData(profileKeys.detail(seat), record),
  })
}

// Verification is now server state (mock API + TanStack Query). The org-level status type lives
// with the API contract; the query hooks live in `@/features/verification`.
export type { VerificationStatus, DocStatus } from '@/platform/api/verification'

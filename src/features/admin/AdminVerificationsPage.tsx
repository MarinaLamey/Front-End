import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SectionCard,
  StatusBadge,
  EmptyState,
  ShieldDocIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@/shared/ui/dashboard'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { DOC_KEYS, type DocKey, type DocStatus, type VerificationStatus } from '@/platform/api/verification'
import { useVerificationQueue, useDecideDoc } from '@/features/verification'

type Tone = 'success' | 'warning' | 'danger'

const DOC_TONE: Record<DocStatus, Tone> = { verifying: 'warning', verified: 'success', rejected: 'danger' }
const ORG_TONE: Record<VerificationStatus, Tone> = { pending: 'warning', verified: 'success', rejected: 'danger' }
const DOC_ICON: Record<DocStatus, typeof ClockIcon> = {
  verifying: ClockIcon,
  verified: CheckCircleIcon,
  rejected: XCircleIcon,
}
const DOC_ICON_TONE: Record<DocStatus, string> = {
  verifying: 'text-status-warning-strong',
  verified: 'text-status-success-strong',
  rejected: 'text-status-danger-strong',
}

/**
 * AdminVerificationsPage — the super-admin review queue. Every registered org's request appears
 * here; the admin approves or rejects EACH document (CR, VAT) independently, and a rejection
 * carries a typed reason that surfaces on the buyer's dashboard. The org's overall status is
 * derived from its documents by the API. All reads/writes go through TanStack Query.
 */
export function AdminVerificationsPage() {
  const { t } = useTranslation()
  const { data: queue = [], isLoading } = useVerificationQueue()
  const decide = useDecideDoc()

  // Which (org, doc) is being rejected, and the reason being typed.
  const [rejecting, setRejecting] = useState<{ orgId: string; doc: DocKey } | null>(null)
  const [reason, setReason] = useState('')

  const pendingCount = queue.filter((org) => org.status === 'pending').length

  const isBusy = (orgId: string, doc: DocKey) =>
    decide.isPending && decide.variables?.orgId === orgId && decide.variables?.doc === doc

  const approve = (orgId: string, doc: DocKey) => decide.mutate({ orgId, doc, decision: 'verified' })

  const confirmReject = (orgId: string, doc: DocKey) => {
    decide.mutate({ orgId, doc, decision: 'rejected', reason: reason.trim() })
    setRejecting(null)
    setReason('')
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-content-primary">
          {t('admin.queueTitle')}
          {pendingCount > 0 && (
            <span className="rounded-full bg-status-warning-subtle px-2 py-0.5 text-sm font-bold text-status-warning-strong">
              {pendingCount}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-content-secondary">{t('admin.queueSubtitle')}</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : queue.length === 0 ? (
        <EmptyState icon={<ShieldDocIcon />} message={t('admin.empty')} />
      ) : (
        queue.map((org) => (
          <SectionCard
            key={org.orgId}
            title={
              <span className="flex items-center gap-2">
                {org.orgName}
                <StatusBadge label={t(`dashboard.status.${org.status}`)} tone={ORG_TONE[org.status]} strong dot={false} />
              </span>
            }
          >
            <ul className="flex flex-col divide-y divide-border-subtle">
              {DOC_KEYS.map((doc) => {
                const review = org.documents[doc]
                const DocIcon = DOC_ICON[review.status]
                const isRejecting = rejecting?.orgId === org.orgId && rejecting.doc === doc
                return (
                  <li key={doc} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <DocIcon className={`mt-0.5 h-5 w-5 shrink-0 stroke-2 ${DOC_ICON_TONE[review.status]}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-content-primary">{t(`dashboard.docs.${doc}`)}</p>
                          <p className="mt-0.5 text-xs text-content-tertiary">{review.number}</p>
                          {review.reason && <p className="mt-0.5 text-xs font-medium text-status-danger">{review.reason}</p>}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge label={t(`admin.docStatus.${review.status}`)} tone={DOC_TONE[review.status]} strong dot={false} />
                        {review.status === 'verifying' && !isRejecting && (
                          <>
                            <Button variant="primary" size="sm" isLoading={isBusy(org.orgId, doc)} onClick={() => approve(org.orgId, doc)}>
                              {t('admin.approve')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setRejecting({ orgId: org.orgId, doc }); setReason('') }}>
                              {t('admin.reject')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {isRejecting && (
                      <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface-sunken p-3">
                        <textarea
                          autoFocus
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={2}
                          placeholder={t('admin.reasonPlaceholder')}
                          className="w-full resize-none rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setRejecting(null); setReason('') }}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={!reason.trim()}
                            isLoading={isBusy(org.orgId, doc)}
                            onClick={() => confirmReject(org.orgId, doc)}
                          >
                            {t('admin.confirmReject')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        ))
      )}
    </div>
  )
}

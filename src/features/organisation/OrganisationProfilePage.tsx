import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { useCurrentOrgMeta, useOrgVerification, VERIFICATION_BADGE, DOC_BADGE } from '@/features/verification'
import { useOrganisation } from './useOrganisation'
import {
  useAddOrgDocument,
  useDeleteOrgDocument,
  useReuploadOrgDocument,
  useSaveOrgProfile,
} from './hooks/orgQueries'
import { AddDocumentDialog } from './components/AddDocumentDialog'
import { DeleteDocumentDialog } from './components/DeleteDocumentDialog'
import { ReuploadDocumentDialog } from './components/ReuploadDocumentDialog'
import type { OrgAddress, OrgDocStatus, OrgDocument, OrgProfile } from './types'

const inputClass =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary'

const DOC_TONE: Record<OrgDocStatus, 'success' | 'warning' | 'neutral'> = {
  valid: 'success',
  expiring: 'warning',
  pending: 'neutral',
}

/**
 * OrganisationProfilePage — the company record an Org Admin maintains: editable company details
 * and National Address on the left, the compliance documents beneath them, and the verification /
 * plan rail on the right. Suppliers see none of it until they are awarded, which the subtitle says.
 *
 * Company details and the address are one form behind a single Save; documents act immediately,
 * because each one is its own file operation rather than a field edit.
 */
export function OrganisationProfilePage() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useOrganisation()
  // Single source for "is this organisation verified?" — the back-office record, never a local flag.
  const { data: verification } = useOrgVerification(useCurrentOrgMeta())
  const saveProfile = useSaveOrgProfile()
  const addDoc = useAddOrgDocument()
  const deleteDoc = useDeleteOrgDocument()
  const reuploadDoc = useReuploadOrgDocument()

  const [form, setForm] = useState<{ profile: OrgProfile; address: OrgAddress } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<OrgDocument | null>(null)
  const [reuploading, setReuploading] = useState<OrgDocument | null>(null)

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const orgStatus = verification?.status ?? 'pending'
  const orgBadge = VERIFICATION_BADGE[orgStatus]
  const nationalAddress = verification && DOC_BADGE[verification.documents.nationalAddress.status]

  // Edits live in local state until Save, so an abandoned change never reaches the record.
  const draft = form ?? { profile: data.profile, address: data.address }
  const setProfile = (patch: Partial<OrgProfile>) =>
    setForm({ ...draft, profile: { ...draft.profile, ...patch } })
  const setAddress = (patch: Partial<OrgAddress>) =>
    setForm({ ...draft, address: { ...draft.address, ...patch } })

  const dateFull = (isoDate: string) =>
    isoDate
      ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(
          new Date(isoDate),
        )
      : '—'

  /** The line under a document: its expiry when known, otherwise that it is still in review. */
  const docMeta = (doc: OrgDocument) => {
    if (doc.status === 'pending') return `${doc.fileName} · ${t('org.profile.docs.pendingMeta')}`
    if (doc.status === 'expiring') {
      return `${doc.fileName} · ${t('org.profile.docs.expiresIn', { count: doc.expiresInDays ?? 0 })}`
    }
    return `${doc.fileName} · ${t('org.profile.docs.validUntil', { date: dateFull(doc.validUntil ?? '') })}`
  }

  const save = () => saveProfile.mutate(draft, { onSuccess: () => setForm(null) })

  /** The rail's amber note tracks whichever document is closest to lapsing. */
  const soonest = data.documents
    .filter((d) => d.status === 'expiring')
    .sort((a, b) => (a.expiresInDays ?? 0) - (b.expiresInDays ?? 0))[0]

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 motion-safe:animate-card-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('org.profile.title')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('org.profile.subtitle')}</p>
        </div>
        <Button onClick={save} isLoading={saveProfile.isPending} disabled={form === null}>
          {t('org.profile.save')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Company details. */}
          <Card>
            <h2 className="text-sm font-semibold text-content-primary">{t('org.profile.company.title')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('org.profile.company.legalName')}
                value={draft.profile.legalName}
                onChange={(v) => setProfile({ legalName: v })}
              />
              <TextField
                label={t('org.profile.company.tradeName')}
                value={draft.profile.tradeName}
                onChange={(v) => setProfile({ tradeName: v })}
              />
              <TextField
                label={t('org.profile.company.cr')}
                value={draft.profile.cr}
                onChange={(v) => setProfile({ cr: v })}
              />
              <TextField
                label={t('org.profile.company.vat')}
                value={draft.profile.vat}
                onChange={(v) => setProfile({ vat: v })}
              />
              <TextField
                label={t('org.profile.company.sector')}
                value={draft.profile.sector}
                onChange={(v) => setProfile({ sector: v })}
              />
              <TextField
                label={t('org.profile.company.size')}
                value={draft.profile.companySize}
                onChange={(v) => setProfile({ companySize: v })}
              />
            </div>
          </Card>

          {/* National Address. */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-content-primary">{t('org.profile.address.title')}</h2>
              {/* National Address carries the registry decision from the verification request —
                  the same row the admin reviews — so it can never disagree with it. */}
              {nationalAddress && (
                <StatusBadge label={t(nationalAddress.key)} tone={nationalAddress.tone} dot={false} />
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <TextField
                label={t('org.profile.address.buildingNumber')}
                value={draft.address.buildingNumber}
                onChange={(v) => setAddress({ buildingNumber: v })}
              />
              <TextField
                label={t('org.profile.address.street')}
                value={draft.address.street}
                onChange={(v) => setAddress({ street: v })}
              />
              <TextField
                label={t('org.profile.address.secondaryNumber')}
                value={draft.address.secondaryNumber}
                onChange={(v) => setAddress({ secondaryNumber: v })}
              />
              <TextField
                label={t('org.profile.address.district')}
                value={draft.address.district}
                onChange={(v) => setAddress({ district: v })}
              />
              <TextField
                label={t('org.profile.address.city')}
                value={draft.address.city}
                onChange={(v) => setAddress({ city: v })}
              />
              <TextField
                label={t('org.profile.address.postalCode')}
                value={draft.address.postalCode}
                onChange={(v) => setAddress({ postalCode: v })}
              />
            </div>
          </Card>

          {/* Documents. */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-content-primary">{t('org.profile.docs.title')}</h2>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                {t('org.profile.docs.add')}
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {data.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg-surface-sunken px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-content-primary">{doc.type}</p>
                      <StatusBadge
                        label={t(`org.profile.docs.status.${doc.status}`)}
                        tone={DOC_TONE[doc.status]}
                        dot={false}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-content-tertiary">{docMeta(doc)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {doc.status === 'expiring' && (
                      <Button variant="outline" size="sm" onClick={() => setReuploading(doc)}>
                        {t('org.profile.docs.reupload')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-status-danger hover:bg-status-danger-subtle"
                      onClick={() => setDeleting(doc)}
                    >
                      {t('org.profile.docs.delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right rail. */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-content-primary">{t('org.profile.verification.title')}</h2>
              <StatusBadge label={t(orgBadge.key)} tone={orgBadge.tone} dot={false} />
            </div>
            <p className="mt-2 text-sm text-content-secondary">{t(`org.profile.verification.body.${orgStatus}`)}</p>
            {soonest && (
              <p className="mt-3 rounded-lg bg-status-warning-subtle px-3 py-2 text-xs text-status-warning-strong">
                {t('org.profile.verification.expiryWarning', {
                  type: soonest.type,
                  count: soonest.expiresInDays ?? 0,
                })}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-content-primary">{t('org.profile.plan.title')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('org.profile.plan.plan')} value={data.plan.name} />
              <Row
                label={t('org.profile.plan.seatsUsed')}
                value={t('org.profile.plan.seatsValue', { used: data.seats.used, total: data.seats.total })}
              />
              <Row label={t('org.profile.plan.renews')} value={dateFull(data.plan.renewsAt)} />
            </dl>
          </Card>
        </div>
      </div>

      <AddDocumentDialog
        open={addOpen}
        orgName={data.identity.name}
        onClose={() => setAddOpen(false)}
        loading={addDoc.isPending}
        onSubmit={(type, fileName) =>
          addDoc.mutate({ type, fileName }, { onSuccess: () => setAddOpen(false) })
        }
      />

      <ReuploadDocumentDialog
        open={reuploading !== null}
        doc={reuploading}
        onClose={() => setReuploading(null)}
        loading={reuploadDoc.isPending}
        onSubmit={(docId, fileName) =>
          reuploadDoc.mutate({ docId, fileName }, { onSuccess: () => setReuploading(null) })
        }
      />

      <DeleteDocumentDialog
        open={deleting !== null}
        doc={deleting}
        uploadedOn={dateFull(deleting?.uploadedAt ?? '')}
        statusLabel={deleting ? t(`org.profile.docs.status.${deleting.status}`) : ''}
        onClose={() => setDeleting(null)}
        loading={deleteDoc.isPending}
        onConfirm={(docId) => deleteDoc.mutate(docId, { onSuccess: () => setDeleting(null) })}
      />
    </section>
  )
}

/* ── Local presentational bits ────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">{children}</div>
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-content-secondary">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass)} />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="font-semibold text-content-primary">{value}</dd>
    </div>
  )
}

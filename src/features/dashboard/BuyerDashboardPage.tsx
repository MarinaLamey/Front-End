import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCurrentOrgMeta, useOrgVerification, useResubmitDoc } from '@/features/verification'
import { DOC_KEYS, type DocKey, type OrgVerification } from '@/platform/api/verification'
import {
  StatCard,
  StatusBadge,
  SectionCard,
  ListRow,
  Timeline,
  EmptyState,
  QuickActionCard,
  StepsCard,
  VerificationBanner,
  type Step,
  FileIcon,
  CheckCircleIcon,
  ClockIcon,
  ChecklistIcon,
  PercentBadgeIcon,
  ChatIcon,
  BarsIcon,
  TruckIcon,
  AlertTriangleIcon,
  ArrowUpRightIcon,
  SparkleIcon,
  BoltIcon,
  UsersIcon,
  PlusIcon,
  EyeIcon,
  ShieldDocIcon,
  LockIcon,
  RefreshIcon,
} from '@/shared/ui/dashboard'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { useBuyerDashboard } from './useBuyerDashboard'
import { WelcomeHero } from './components/WelcomeHero'
import { VerificationStatusCard } from './components/VerificationStatusCard'

/** The three "how sourcing works" steps — reused across verified / pending / rejected. */
function sourcingSteps(t: (k: string) => string): Step[] {
  return [
    { title: t('dashboard.steps.create.title'), desc: t('dashboard.steps.create.desc') },
    { title: t('dashboard.steps.compare.title'), desc: t('dashboard.steps.compare.desc') },
    { title: t('dashboard.steps.award.title'), desc: t('dashboard.steps.award.desc') },
  ]
}

const STAT_ICON: Record<string, typeof FileIcon> = {
  activeRfqs: FileIcon,
  savings: PercentBadgeIcon,
  avgAward: ClockIcon,
  bidsToReview: CheckCircleIcon,
}

/** Zeroed KPI tiles for the pre-verified dashboards — same coloured icon boxes as verified. */
const MUTED_STATS = [
  { key: 'activeRfqs', value: '0', accent: 'brand' },
  { key: 'savings', value: '0%', accent: 'success' },
  { key: 'avgAward', value: '—', accent: 'warning' },
  { key: 'bidsToReview', value: '0', accent: 'secondary' },
] as const

/**
 * BuyerDashboardPage — one page, three states. The verification status (pending / verified /
 * rejected) decides which sections render: verified shows the full working dashboard; pending &
 * rejected show the KYB-review panels with locked sourcing. All data comes from the
 * {@link useBuyerDashboard} seam; the shared dashboard kit renders it.
 */
export function BuyerDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const orgMeta = useCurrentOrgMeta()
  const { data: record, isLoading: verificationLoading } = useOrgVerification(orgMeta)
  const data = useBuyerDashboard()
  const status = record?.status ?? 'pending'
  const verified = status === 'verified'

  // The green "verified" banner is a one-time celebration: it shows when the org first becomes
  // verified, then is dismissed on the next refresh so the dashboard is the clean verified view.
  const [notYetSeenVerified] = useState(() => {
    try {
      return localStorage.getItem(`miproc.verifiedSeen.${orgMeta.orgId}`) !== 'true'
    } catch {
      return true
    }
  })
  useEffect(() => {
    if (verified && notYetSeenVerified) {
      try {
        localStorage.setItem(`miproc.verifiedSeen.${orgMeta.orgId}`, 'true')
      } catch {
        /* storage unavailable */
      }
    }
  }, [verified, notYetSeenVerified, orgMeta.orgId])
  const showVerifiedBanner = verified && notYetSeenVerified

  // The banner's rejected message is the reason on the first rejected document (admin's typed note).
  const rejectionReason =
    (record && DOC_KEYS.map((doc) => record.documents[doc]).find((d) => d.status === 'rejected')?.reason) ||
    data.rejectionReason

  const createRfq = () => navigate('/buyer/rfqs/new')

  // Until the real verification status is loaded, show a spinner rather than defaulting to the
  // pending view — otherwise a verified org briefly flashes the pending dashboard on login.
  if (verificationLoading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Banner — variant per state. */}
      {status === 'pending' && (
        <VerificationBanner
          state="pending"
          title={t('dashboard.banner.pendingTitle')}
          message={t('dashboard.banner.pendingMessage')}
          badgeLabel={t('dashboard.status.pending')}
        />
      )}
      {status === 'rejected' && (
        <VerificationBanner
          state="rejected"
          title={t('dashboard.banner.rejectedTitle')}
          message={rejectionReason}
          badgeLabel={t('dashboard.status.rejected')}
        />
      )}
      {showVerifiedBanner && (
        <VerificationBanner
          state="verified"
          title={t('dashboard.banner.verifiedTitle')}
          message={t('dashboard.banner.verifiedMessage')}
          badgeLabel={t('dashboard.status.verified')}
        />
      )}

      {verified ? (
        <VerifiedDashboard data={data} onCreateRfq={createRfq} />
      ) : (
        <PreVerifiedDashboard record={record} status={status} />
      )}
    </div>
  )
}

/* ── Verified  */

function VerifiedDashboard({ data, onCreateRfq }: { data: ReturnType<typeof useBuyerDashboard>; onCreateRfq: () => void }) {
  const { t } = useTranslation()

  return (
    <>
      <WelcomeHero
        greeting={
          data.org.userName
            ? t('dashboard.welcome.greetingBack', { name: data.org.userName })
            : t('dashboard.welcome.greetingBackGeneric')
        }
        orgName={data.org.name}
        orgType={data.org.type}
        subtitle={t('dashboard.welcome.subtitle')}
        onCreateRfq={onCreateRfq}
      />

      {/* Verified-suppliers strip. */}
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-content-secondary">
        <CheckCircleIcon className="h-4 w-4 text-status-success" />
        {t('dashboard.verifiedSuppliersOnly')}
      </div>

      {/* KPI grid. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat, index) => {
          const Icon = STAT_ICON[stat.key] ?? FileIcon
          return (
            <div key={stat.key} style={{ animationDelay: `${index * 60}ms` }} className="motion-safe:animate-stepper-in">
              <StatCard icon={<Icon />} value={stat.value} label={t(`dashboard.stats.${stat.key}`)} accent={stat.accent} delta={stat.delta} />
            </div>
          )
        })}
      </div>

      {/* Pipeline strip. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
        <span className="text-sm font-semibold text-content-primary">{t('dashboard.pipeline')}</span>
        <div className="flex flex-wrap items-center gap-4">
          {data.pipeline.map((seg) => (
            <span key={seg.label} className="inline-flex items-center gap-1.5 text-sm text-content-secondary">
              <span className={`h-2 w-2 rounded-full ${seg.color}`} />
              {seg.label}
              <span className="font-semibold text-content-primary">{seg.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Action Required. */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-status-warning" />
            {t('dashboard.actionRequired')}
            <span className="rounded-full bg-status-danger-subtle px-1.5 text-xs font-semibold text-status-danger">
              {data.actionCount}
            </span>
          </span>
        }
      >
        <ul className="flex flex-col divide-y divide-border-subtle">
          {data.actions.map((action) => (
            <li key={action.id} className="py-2 first:pt-0 last:pb-0">
              <ListRow
                icon={action.kind === 'bid' ? <ChecklistIcon /> : <ChatIcon />}
                iconTone={action.kind === 'bid' ? 'brand' : 'success'}
                title={action.text}
                trailing={
                  <Button variant={action.primary ? 'primary' : 'ghost'} size="sm" onClick={() => undefined}>
                    {action.actionLabel}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* My RFQs + Track order. */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title={t('dashboard.myRfqs')}
          action={
            <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-content-link hover:text-content-link-hover">
              {t('dashboard.viewAll')}
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </button>
          }
        >
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.rfqs.map((rfq) => (
              <li key={rfq.id} className="py-1">
                <ListRow
                  icon={<FileIcon />}
                  iconTone="neutral"
                  title={rfq.title}
                  subtitle={
                    <>
                      {rfq.ref} · {rfq.meta}
                      {rfq.anonymous && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface-sunken px-1.5 py-0.5 text-[11px] text-content-tertiary">
                          <EyeIcon className="h-3 w-3" />
                          {t('dashboard.anonymous')}
                        </span>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <span className="text-sm font-semibold text-content-primary">{rfq.amount ?? 'SAR —'}</span>
                      <StatusBadge label={rfq.status} />
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('dashboard.trackOrder')}>
          <p className="-mt-1 mb-4 text-sm text-content-tertiary">
            {data.trackedOrder.ref} · {data.trackedOrder.meta}
          </p>
          <Timeline
            steps={data.trackedOrder.steps.map((step) =>
              step.state === 'current' ? { ...step, note: <StatusBadge label={t('dashboard.inProgress')} tone="brand" dot={false} /> } : step,
            )}
          />
        </SectionCard>
      </div>

      {/* AI recommendations. */}
      <SectionCard title={t('dashboard.aiRecommendations')} titleIcon={<SparkleIcon className="h-5 w-5 text-brand-primary" />}>
        <ul className="flex flex-col divide-y divide-border-subtle">
          {data.recommendations.map((rec) => (
            <li key={rec.id} className="py-2 first:pt-0 last:pb-0">
              <ListRow
                icon={rec.kind === 'supplier' ? <UsersIcon /> : <CheckCircleIcon />}
                iconTone="brand"
                title={rec.title}
                subtitle={rec.meta}
                trailing={
                  <div className="flex items-center gap-2">
                    <StatusBadge label={rec.match} tone="brand" dot={false} />
                    <Button variant="ghost" size="sm" onClick={() => undefined}>
                      {rec.actionLabel}
                    </Button>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Compliance & documents. */}
      <SectionCard
        title={t('dashboard.compliance')}
        action={
          <button type="button" className="text-sm font-medium text-content-link hover:text-content-link-hover">
            {t('dashboard.manage')}
          </button>
        }
      >
        <ul className="flex flex-col divide-y divide-border-subtle">
          {data.documents.map((doc) => {
            const expiring = doc.status.toLowerCase().startsWith('expiring')
            return (
              <li key={doc.id} className="py-1">
                <ListRow
                  icon={<FileIcon />}
                  iconTone={expiring ? 'warning' : 'success'}
                  title={doc.title}
                  subtitle={doc.meta}
                  trailing={<StatusBadge label={doc.status} tone={expiring ? 'warning' : 'success'} dot={false} />}
                />
              </li>
            )
          })}
        </ul>
      </SectionCard>

      {/* Quick actions. */}
      <QuickActions
        items={[
          { icon: <PlusIcon />, label: t('dashboard.actions.createNewRfq'), accent: 'brand', onClick: onCreateRfq },
          { icon: <BarsIcon />, label: t('dashboard.actions.compareBids'), accent: 'success' },
          { icon: <TruckIcon />, label: t('dashboard.actions.trackOrders'), accent: 'info' },
          { icon: <AlertTriangleIcon />, label: t('dashboard.actions.raiseDispute'), accent: 'danger' },
        ]}
      />
    </>
  )
}

/* ── Pending & rejected ───────────────────────────────────────────────────── */

function PreVerifiedDashboard({ record, status }: { record?: OrgVerification; status: 'pending' | 'rejected' }) {
  const { t } = useTranslation()
  const resubmit = useResubmitDoc()
  const rejected = status === 'rejected'

  // The "checking …" hint shown next to a document while it's still under review.
  const checking: Record<DocKey, string> = {
    cr: t('dashboard.verification.checkingWathiq'),
    vat: t('dashboard.verification.checkingZatca'),
  }

  // Real CR / VAT rows straight from the admin's per-document decisions.
  const verificationItems = record
    ? DOC_KEYS.map((doc) => {
        const review = record.documents[doc]
        return {
          title: t(`dashboard.docs.${doc}`),
          meta: review.status === 'verifying' ? `${review.number} · ${checking[doc]}` : review.number,
          state: review.status,
          reason: review.reason,
          action:
            review.status === 'rejected' ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={resubmit.isPending && resubmit.variables?.doc === doc}
                onClick={() => resubmit.mutate({ orgId: record.orgId, doc })}
              >
                {t('dashboard.verification.reupload')}
              </Button>
            ) : undefined,
        }
      })
    : []

  return (
    <>
      <VerificationStatusCard
        status={status}
        items={verificationItems}
        note={rejected ? t('dashboard.verification.rejectedNote') : t('dashboard.verification.pendingNote')}
      />

      {/* Locked sourcing steps + the state-specific action. */}
      <StepsCard
        locked
        titleIcon={<LockIcon className="h-4 w-4 text-content-tertiary" />}
        title={rejected ? t('dashboard.sourcing.resubmitTitle') : t('dashboard.sourcing.pendingTitle')}
        subtitle={rejected ? t('dashboard.sourcing.resubmitSubtitle') : t('dashboard.sourcing.pendingSubtitle')}
        steps={sourcingSteps(t)}
        action={
          <Button variant={rejected ? 'primary' : 'outline'} size="sm" leftIcon={<RefreshIcon className="h-4 w-4" />} onClick={() => undefined}>
            {rejected ? t('dashboard.sourcing.resubmit') : t('dashboard.sourcing.checkStatus')}
          </Button>
        }
      />

      {/* Muted KPI grid. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MUTED_STATS.map((stat) => {
          const Icon = STAT_ICON[stat.key] ?? FileIcon
          return <StatCard key={stat.key} muted accent={stat.accent} icon={<Icon />} value={stat.value} label={t(`dashboard.stats.${stat.key}`)} />
        })}
      </div>

      {/* Empty, locked My RFQs. */}
      <SectionCard title={t('dashboard.myRfqs')}>
        <EmptyState
          icon={<FileIcon />}
          message={rejected ? t('dashboard.emptyRfqs.rejected') : t('dashboard.emptyRfqs.pending')}
          action={
            <Button variant="neutral" size="sm" disabled leftIcon={<LockIcon className="h-4 w-4" />} onClick={() => undefined}>
              {t('dashboard.createRfq')}
            </Button>
          }
        />
      </SectionCard>

      {/* Quick actions (pre-verified set; Create is locked). */}
      <QuickActions
        items={[
          { icon: <PlusIcon />, label: t('dashboard.actions.createNewRfq'), accent: 'brand', locked: true },
          { icon: <FileIcon />, label: t('dashboard.actions.browseCategories'), accent: 'success' },
          { icon: <EyeIcon />, label: t('dashboard.actions.howAnonymity'), accent: 'info' },
          { icon: <ShieldDocIcon />, label: t('dashboard.actions.completeProfile'), accent: 'success' },
        ]}
      />
    </>
  )
}

/* ── Shared quick-actions grid ────────────────────────────────────────────── */

interface QuickActionSpec {
  icon: React.ReactNode
  label: string
  accent: 'brand' | 'success' | 'info' | 'danger'
  onClick?: () => void
  locked?: boolean
}

function QuickActions({ items }: { items: QuickActionSpec[] }) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-content-primary">{t('dashboard.quickActions')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <QuickActionCard key={item.label} icon={item.icon} label={item.label} accent={item.accent} onClick={item.onClick} locked={item.locked} />
        ))}
      </div>
    </div>
  )
}

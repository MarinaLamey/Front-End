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
  ChatIcon,
  BarsIcon,
  TruckIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  HelpIcon,
  PlusIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldDocIcon,
  LockIcon,
  RefreshIcon,
} from '@/shared/ui/dashboard'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { HelpSupportDialog } from '@/shared/ui/HelpSupportDialog'
import { cn } from '@/shared/lib/cn'
import { useSupplierDashboard } from './useSupplierDashboard'
import type { BuyerDashboardData, StatItem } from './types'
import { WelcomeHero } from './components/WelcomeHero'
import { VerificationStatusCard } from './components/VerificationStatusCard'

/** The three "how bidding works" steps — reused across verified / pending / rejected. */
function biddingSteps(t: (k: string) => string): Step[] {
  return [
    { title: t('supplier.steps.catalogue.title'), desc: t('supplier.steps.catalogue.desc') },
    { title: t('supplier.steps.bid.title'), desc: t('supplier.steps.bid.desc') },
    { title: t('supplier.steps.deliver.title'), desc: t('supplier.steps.deliver.desc') },
  ]
}

/** Greeting line — a supplier who has not bid yet gets the "welcome to mimony" variant. */
function greeting(t: (k: string, o?: Record<string, unknown>) => string, name: string, firstRun: boolean): string {
  if (firstRun) return name ? t('dashboard.welcome.greetingNew', { name }) : t('dashboard.welcome.greetingNewGeneric')
  return name ? t('dashboard.welcome.greetingBack', { name }) : t('dashboard.welcome.greetingBackGeneric')
}

const STAT_ICON: Record<string, typeof FileIcon> = {
  availableRfqs: FileIcon,
  activeBids: CheckCircleIcon,
  winRate: ClockIcon,
}

/**
 * Zeroed KPI tiles for the pre-verified dashboards — same coloured icon boxes as verified, and the
 * same THREE metrics: "Payments Received (MTD)" is deferred for phase 1 along with everything else
 * about money.
 */
const MUTED_STATS = [
  { key: 'availableRfqs', value: '0', accent: 'brand' },
  { key: 'activeBids', value: '0', accent: 'success' },
  { key: 'winRate', value: '—', accent: 'warning' },
] as const

/**
 * SupplierDashboardPage — one page, three states, mirroring the buyer dashboard with supplier data
 * and labels. Verification status (pending / verified / rejected) decides which sections render;
 * verified shows the full bidding dashboard, pending & rejected show the KYB-review panels with
 * bidding locked. Data comes from {@link useSupplierDashboard}; the shared kit renders it.
 */
export function SupplierDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const orgMeta = useCurrentOrgMeta()
  const { data: record, isLoading: verificationLoading, refetch: refetchVerification } = useOrgVerification(orgMeta)
  const { data, isLoading: dashboardLoading } = useSupplierDashboard()
  const resubmit = useResubmitDoc()
  const status = record?.status ?? 'pending'
  const verified = status === 'verified'

  /** Re-upload every flagged document at once — offered by the banner and by the steps card. */
  const resubmitAll = () => {
    if (!record) return
    for (const doc of DOC_KEYS) {
      if (record.documents[doc].status === 'rejected') resubmit.mutate({ orgId: record.orgId, doc })
    }
  }

  // One-time "verified" banner: shows when first verified, dismissed on the next refresh.
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

  const rejectionReason =
    (record && DOC_KEYS.map((doc) => record.documents[doc]).find((d) => d.status === 'rejected')?.reason) ||
    data?.rejectionReason ||
    ''

  const browseRfqs = () => navigate('/supplier/rfqs')

  if (verificationLoading || dashboardLoading || !data) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {status === 'pending' && (
        <VerificationBanner
          state="pending"
          title={t('dashboard.banner.pendingTitle')}
          message={t('supplier.banner.pendingMessage')}
          badgeLabel={t('dashboard.status.pending')}
        />
      )}
      {status === 'rejected' && (
        <VerificationBanner
          state="rejected"
          title={t('dashboard.banner.rejectedTitle')}
          message={rejectionReason}
          badgeLabel={t('dashboard.status.rejected')}
          action={
            <Button size="sm" isLoading={resubmit.isPending} onClick={resubmitAll}>
              {t('dashboard.sourcing.resubmit')}
            </Button>
          }
        />
      )}
      {showVerifiedBanner && (
        <VerificationBanner
          state="verified"
          title={t('dashboard.banner.verifiedTitle')}
          message={t('supplier.banner.verifiedMessage')}
          badgeLabel={t('dashboard.status.verified')}
        />
      )}

      {verified ? (
        <VerifiedDashboard data={data} onBrowseRfqs={browseRfqs} />
      ) : (
        <PreVerifiedDashboard
          record={record}
          status={status}
          onResubmit={resubmitAll}
          onCheckStatus={() => void refetchVerification()}
        />
      )}
    </div>
  )
}

/* ── Verified  */

function VerifiedDashboard({ data, onBrowseRfqs }: { data: BuyerDashboardData; onBrowseRfqs: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)
  // A supplier who has never bid gets the onboarding layout instead of a page of empty cards.
  const firstRun = data.rfqs.length === 0
  const quickActions = operatingQuickActions(t, navigate, onBrowseRfqs, () => setHelpOpen(true))
  const help = <HelpSupportDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

  const hero = (
    <WelcomeHero
      greeting={greeting(t, data.org.userName, firstRun)}
      orgName={data.org.name}
      orgType={data.org.type}
      subtitle={t('supplier.welcome.subtitle')}
      onCreateRfq={onBrowseRfqs}
      ctaLabel={t('supplier.browseRfqs')}
    />
  )

  if (firstRun) {
    return (
      <>
        {hero}

        <StepsCard
          title={t('supplier.sourcing.verifiedTitle')}
          subtitle={t('supplier.sourcing.verifiedSubtitle')}
          steps={biddingSteps(t)}
        />

        <StatGrid stats={MUTED_STATS.map((s) => ({ ...s }))} muted />

        <SectionCard title={t('supplier.myBids')}>
          <EmptyState
            icon={<FileIcon />}
            message={t('supplier.emptyBids.verified')}
            action={
              <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={onBrowseRfqs}>
                {t('supplier.browseRfqs')}
              </Button>
            }
          />
        </SectionCard>

        <QuickActions items={quickActions} />
        {help}
      </>
    )
  }

  return (
    <>
      {hero}

      {/* Verified-buyers strip. */}
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-content-secondary">
        <CheckCircleIcon className="h-4 w-4 text-status-success" />
        {t('supplier.verifiedBuyersOnly')}
      </div>

      <StatGrid stats={data.stats} />

      {/* Pipeline strip. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface px-5 py-4">
        <span className="text-sm font-semibold text-content-primary">{t('supplier.pipeline')}</span>
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

      {/* Action Required — only when something actually needs answering. */}
      {data.actions.length > 0 && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              {t('dashboard.actionRequiredToday')}
              <span className="rounded-full bg-status-danger-subtle px-1.5 text-xs font-semibold text-status-danger">
                {data.actionCount}
              </span>
            </span>
          }
        >
          <p className="-mt-2 mb-3 text-sm text-content-tertiary">
            {t('dashboard.actionItems', { count: data.actionCount })}
          </p>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.actions.map((action) => (
              <li key={action.id} className="py-2 first:pt-0 last:pb-0">
                <ListRow
                  icon={action.kind === 'bid' ? <ChecklistIcon /> : <ChatIcon />}
                  iconTone={action.kind === 'bid' ? 'brand' : 'success'}
                  title={action.text}
                  trailing={
                    <Button variant={action.primary ? 'primary' : 'outline'} size="sm" onClick={() => navigate(action.to)}>
                      {action.actionLabel}
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
          {/* Footer rail — presentational only; the day pager has no behaviour behind it yet, so it
              renders as text rather than advertising a control that does nothing. */}
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-border-subtle pt-3 text-xs text-content-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <ChevronRightIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
              {t('dashboard.today')}
              <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-180" />
            </span>
            <span>{t('dashboard.swipeLastDays')}</span>
          </div>
        </SectionCard>
      )}

      {/* My Bids + Track order. The tracker only appears when there is a live order to track. */}
      <div className={cn('grid gap-6', data.trackedOrder && 'lg:grid-cols-[1.6fr_1fr]')}>
        <SectionCard
          title={t('supplier.myBids')}
          action={
            <button
              type="button"
              onClick={() => navigate('/supplier/bids')}
              className="inline-flex items-center gap-1 text-sm font-medium text-content-link hover:text-content-link-hover"
            >
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
                          <EyeOffIcon className="h-3 w-3" />
                          {t('dashboard.anonymous')}
                        </span>
                      )}
                    </>
                  }
                  trailing={
                    <>
                      <span className="text-sm font-semibold text-content-primary">{rfq.amount ?? 'SAR —'}</span>
                      <StatusBadge label={rfq.status} tone={rfq.tone} />
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </SectionCard>

        {data.trackedOrder && (
          <SectionCard title={t('dashboard.trackOrder')}>
            <p className="-mt-1 mb-4 text-sm text-content-tertiary">
              {data.trackedOrder.ref} · {data.trackedOrder.meta}
            </p>
            <Timeline
              steps={data.trackedOrder.steps.map((step) =>
                // The step the order is sitting on is the supplier's to move.
                step.state === 'current'
                  ? { ...step, note: <StatusBadge label={t('supplier.track.yourAction')} tone="brand" dot={false} /> }
                  : step,
              )}
            />
          </SectionCard>
        )}
      </div>

      {/* Suggested RFQs — a plain region + category match; no fit score this phase. */}
      {data.recommendations.length > 0 && (
        <SectionCard title={t('supplier.suggestedRfqs')}>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.recommendations.map((rec) => (
              <li key={rec.id} className="py-2 first:pt-0 last:pb-0">
                <ListRow
                  icon={<FileIcon />}
                  iconTone="brand"
                  title={rec.title}
                  subtitle={rec.meta}
                  trailing={
                    <div className="flex items-center gap-2">
                      <StatusBadge label={rec.match} tone="brand" dot={false} />
                      <Button variant="outline" size="sm" onClick={() => rec.to && navigate(rec.to)}>
                        {rec.actionLabel}
                      </Button>
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Compliance & documents. */}
      <SectionCard
        title={t('dashboard.compliance')}
        action={
          <button
            type="button"
            onClick={() => navigate('/supplier/organisation/profile')}
            className="cursor-pointer text-sm font-medium text-content-link hover:text-content-link-hover"
          >
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

      <QuickActions items={quickActions} />
      {help}
    </>
  )
}

/**
 * The verified supplier's quick actions: Browse RFQs, Submit Bid, Track Orders, Help & support.
 * "Raise Dispute" is not part of this phase.
 */
function operatingQuickActions(
  t: (k: string) => string,
  navigate: (to: string) => void,
  onBrowseRfqs: () => void,
  onHelp: () => void,
): QuickActionSpec[] {
  return [
    { icon: <PlusIcon />, label: t('supplier.actions.browseRfqs'), accent: 'brand', onClick: onBrowseRfqs },
    { icon: <BarsIcon />, label: t('supplier.actions.submitBid'), accent: 'success', onClick: () => navigate('/supplier/bids') },
    { icon: <TruckIcon />, label: t('supplier.actions.trackOrders'), accent: 'info', onClick: () => navigate('/supplier/orders') },
    { icon: <HelpIcon />, label: t('dashboard.actions.helpSupport'), accent: 'info', onClick: onHelp },
  ]
}

/** The KPI row — three tiles; the fourth (Payments Received) is deferred with the rest of payment. */
function StatGrid({ stats, muted }: { stats: readonly StatItem[]; muted?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = STAT_ICON[stat.key] ?? FileIcon
        return (
          <div key={stat.key} style={{ animationDelay: `${index * 60}ms` }} className="motion-safe:animate-stepper-in">
            <StatCard
              icon={<Icon />}
              value={stat.value}
              label={t(`supplier.stats.${stat.key}`)}
              accent={stat.accent}
              delta={stat.delta}
              muted={muted}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ── Pending & rejected ───────────────────────────────────────────────────── */

function PreVerifiedDashboard({
  record,
  status,
  onResubmit,
  onCheckStatus,
}: {
  record?: OrgVerification
  status: 'pending' | 'rejected'
  onResubmit: () => void
  onCheckStatus: () => void
}) {
  const { t } = useTranslation()
  const resubmit = useResubmitDoc()
  const rejected = status === 'rejected'

  const checking: Record<DocKey, string> = {
    cr: t('dashboard.verification.checkingWathiq'),
    vat: t('dashboard.verification.checkingZatca'),
    nationalAddress: t('dashboard.verification.fromRegistration'),
  }

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

      {/* Locked bidding steps + the state-specific action. */}
      <StepsCard
        locked
        titleIcon={<LockIcon className="h-4 w-4 text-content-tertiary" />}
        title={rejected ? t('supplier.sourcing.resubmitTitle') : t('supplier.sourcing.pendingTitle')}
        subtitle={rejected ? t('supplier.sourcing.resubmitSubtitle') : t('supplier.sourcing.pendingSubtitle')}
        steps={biddingSteps(t)}
        action={
          <Button
            variant={rejected ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<RefreshIcon className="h-4 w-4" />}
            isLoading={rejected && resubmit.isPending}
            // Rejected resubmits every flagged document; pending re-reads the review, which the
            // query already does on focus — so the button simply refetches it.
            onClick={rejected ? onResubmit : onCheckStatus}
          >
            {rejected ? t('dashboard.sourcing.resubmit') : t('dashboard.sourcing.checkStatus')}
          </Button>
        }
      />

      <StatGrid stats={MUTED_STATS.map((s) => ({ ...s }))} muted />

      {/* Empty, locked My Bids. */}
      <SectionCard title={t('supplier.myBids')}>
        <EmptyState
          icon={<FileIcon />}
          message={rejected ? t('supplier.emptyBids.rejected') : t('supplier.emptyBids.pending')}
          action={
            <Button variant="neutral" size="sm" disabled leftIcon={<LockIcon className="h-4 w-4" />} onClick={() => undefined}>
              {t('supplier.browseRfqs')}
            </Button>
          }
        />
      </SectionCard>

      {/* Quick actions (pre-verified set). */}
      <QuickActions
        items={[
          { icon: <PlusIcon />, label: t('supplier.actions.browseRfqs'), accent: 'brand', locked: true },
          { icon: <FileIcon />, label: t('supplier.actions.completeCatalogue'), accent: 'success' },
          { icon: <EyeIcon />, label: t('supplier.actions.howBidding'), accent: 'info' },
          { icon: <ShieldDocIcon />, label: t('supplier.actions.completeProfile'), accent: 'success' },
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

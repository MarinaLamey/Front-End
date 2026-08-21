import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
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
  ArrowUpRightIcon,
  ChevronRightIcon,
  HelpIcon,
  UsersIcon,
  PlusIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldDocIcon,
  RefreshIcon,
} from '@/shared/ui/dashboard'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useBuyerDashboard } from './useBuyerDashboard'
import type { ActionItem, BuyerDashboardData, StatItem } from './types'
import { WelcomeHero } from './components/WelcomeHero'
import { VerificationStatusCard } from './components/VerificationStatusCard'

/**
 * The three "how sourcing works" steps. Steps 2 and 3 are the same everywhere; step 1 changes with
 * the org's status — a verified org creates and publishes an RFQ, an unverified one can only build
 * a draft, so telling them to "create an anonymous RFQ" would promise something that is gated.
 */
function sourcingSteps(t: (k: string) => string, verified: boolean): Step[] {
  const first = verified ? 'create' : 'draft'
  return [
    { title: t(`dashboard.steps.${first}.title`), desc: t(`dashboard.steps.${first}.desc`) },
    { title: t('dashboard.steps.compare.title'), desc: t('dashboard.steps.compare.desc') },
    { title: t('dashboard.steps.award.title'), desc: t('dashboard.steps.award.desc') },
  ]
}

/** Greeting line — first-run orgs get the "welcome to mimony" variant. */
function greeting(t: (k: string, o?: Record<string, unknown>) => string, name: string, firstRun: boolean): string {
  if (firstRun) return name ? t('dashboard.welcome.greetingNew', { name }) : t('dashboard.welcome.greetingNewGeneric')
  return name ? t('dashboard.welcome.greetingBack', { name }) : t('dashboard.welcome.greetingBackGeneric')
}

/** Icon per Action-Required kind — a supplier's acceptance reads as a signed-off checklist. */
const ACTION_ICON: Record<ActionItem['kind'], React.ReactNode> = {
  bid: <ChecklistIcon />,
  message: <ChatIcon />,
  accepted: <CheckCircleIcon />,
}

const STAT_ICON: Record<string, typeof FileIcon> = {
  activeRfqs: FileIcon,
  savings: PercentBadgeIcon,
  avgAward: ClockIcon,
  bidsToReview: CheckCircleIcon,
}

/** Zeroed KPI tiles for the pre-verified dashboards — same coloured icon boxes as verified. */
const MUTED_STATS: StatItem[] = [
  { key: 'activeRfqs', value: '0', accent: 'brand' },
  { key: 'avgAward', value: '—', accent: 'warning' },
  { key: 'bidsToReview', value: '0', accent: 'success' },
]

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
  const { data: record, isLoading: verificationLoading, refetch: refetchVerification } = useOrgVerification(orgMeta)
  const { data, isLoading: dashboardLoading, error, refetch, isRefetching } = useBuyerDashboard()
  // The backend's KYB status wins whenever the data seam can report it — that is the real
  // super-admin decision, and it must not be overridden by the local verification record. The
  // record is only consulted in mock mode, where the seam leaves `verification` undefined.
  const status = data?.verification ?? record?.status ?? 'pending'
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
    data?.rejectionReason ||
    ''

  const createRfq = () => navigate('/buyer/rfqs/new')

  // The failure check comes FIRST: on an error the seam has no data, so the `!data` clause below
  // would otherwise hold the page on a spinner that never resolves. A `forbidden` error gets no
  // retry button — this account will be refused again for as long as it is this account.
  if (error) {
    return (
      <ErrorState
        variant={error.variant}
        title={t('dashboard.errorTitle')}
        detail={error.status ? t('common.error.status', { status: error.status }) : undefined}
        onRetry={error.variant === 'forbidden' ? undefined : refetch}
        isRetrying={isRefetching}
      />
    )
  }

  // Until the real verification status AND the derived dashboard are loaded, show a spinner rather
  // than defaulting to the pending view — otherwise a verified org briefly flashes the pending
  // dashboard on login.
  if (verificationLoading || dashboardLoading || !data) {
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

      {!verified ? (
        <PreVerifiedDashboard
          record={record}
          status={status}
          onCreateRfq={createRfq}
          // Re-read the KYB decision AND the dashboard: if the super-admin has approved us since
          // the page loaded, both the status and the figures behind it have moved on.
          onCheckStatus={() => {
            refetchVerification()
            refetch()
          }}
          isChecking={verificationLoading || isRefetching}
        />
      ) : data.rfqs.length === 0 ? (
        // Verified but nothing sourced yet: the working dashboard would be a wall of empty cards,
        // so the first run explains the flow instead.
        <VerifiedEmptyDashboard data={data} onCreateRfq={createRfq} />
      ) : (
        <VerifiedDashboard data={data} onCreateRfq={createRfq} />
      )}
    </div>
  )
}

/* ── Verified  */

function VerifiedDashboard({ data, onCreateRfq }: { data: BuyerDashboardData; onCreateRfq: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <WelcomeHero
        greeting={greeting(t, data.org.userName, false)}
        orgName={data.org.name}
        orgType={data.org.type}
        subtitle={t('dashboard.welcome.subtitle')}
        onCreateRfq={onCreateRfq}
      />

      {/* Verified-suppliers strip. */}
      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface shadow-sm px-4 py-3 text-sm text-content-secondary">
        <CheckCircleIcon className="h-4 w-4 text-status-success" />
        {t('dashboard.verifiedSuppliersOnly')}
      </div>

      <StatGrid stats={data.stats} />

      {/* Pipeline strip. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface shadow-sm px-5 py-4">
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
        <ul className="flex flex-col divide-y divide-border-subtle motion-safe:animate-page-in">
          {data.actions.map((action) => (
            <li key={action.id} className="py-2 first:pt-0 last:pb-0">
              <ListRow
                icon={ACTION_ICON[action.kind]}
                iconTone={action.kind === 'message' ? 'success' : 'brand'}
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

      {/* My RFQs + Track order. Track order only appears when there is a live PO to track. */}
      <div className={cn('grid gap-5', data.trackedOrder && 'lg:grid-cols-[2.13fr_1fr]')}>
        <SectionCard
          title={t('dashboard.myRfqs')}
          action={
            <button
              type="button"
              onClick={() => navigate('/buyer/rfqs')}
              className="inline-flex items-center gap-1 text-sm font-medium text-content-link hover:text-content-link-hover"
            >
              {t('dashboard.viewAll')}
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </button>
          }
        >
          <ul className="flex flex-col divide-y divide-border-subtle motion-safe:animate-page-in">
            {data.rfqs.map((rfq) => (
              <li key={rfq.id} className="py-1">
                <ListRow
                  icon={<FileIcon />}
                  iconTone="neutral"
                  title={rfq.title}
                  subtitle={
                    <>
                      {/* Joined rather than interpolated: a row whose reference or meta is empty
                          must not render a dangling " · ". */}
                      {[rfq.ref, rfq.meta].filter(Boolean).join(' · ')}
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
          <SectionCard
            title={t('dashboard.trackOrder')}
            action={
              <button
                type="button"
                onClick={() => navigate(`/buyer/orders/${data.trackedOrder?.id}`)}
                className="inline-flex items-center gap-1 text-sm font-medium text-content-link hover:text-content-link-hover"
              >
                {t('dashboard.viewAll')}
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </button>
            }
          >
            <p className="-mt-1 mb-4 text-sm text-content-tertiary">
              {data.trackedOrder.ref} · {data.trackedOrder.meta}
            </p>
            <Timeline
              steps={data.trackedOrder.steps.map((step, index) => {
                if (step.state !== 'current') return step
                // Accept → dispatch → deliver are the supplier's moves; only the final step —
                // received-and-closed — is the buyer's. "Awaiting supplier" there would be wrong.
                const waitingOn = index === 4 ? 'awaitingYou' : 'awaitingSupplier'
                return { ...step, note: <StatusBadge label={t(`dashboard.track.${waitingOn}`)} tone="brand" dot={false} /> }
              })}
            />
          </SectionCard>
        )}
      </div>

      {/* Suggested suppliers. */}
      <SectionCard title={t('dashboard.suggestedSuppliers')}>
        <ul className="flex flex-col divide-y divide-border-subtle motion-safe:animate-page-in">
          {data.recommendations.map((rec) => (
            <li key={rec.id} className="py-2 first:pt-0 last:pb-0">
              <ListRow
                icon={rec.kind === 'supplier' ? <UsersIcon /> : <CheckCircleIcon />}
                iconTone="brand"
                title={rec.title}
                subtitle={rec.meta}
                trailing={
                  <div className="flex items-center gap-2">
                    <StatusBadge label={rec.match} tone="neutral" dot={false} />
                    <Button variant="outline" size="sm" onClick={() => undefined}>
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
          <button
            type="button"
            onClick={() => navigate('/buyer/organisation/profile')}
            className="text-sm font-medium text-content-link hover:text-content-link-hover"
          >
            {t('dashboard.manage')}
          </button>
        }
      >
        <ul className="flex flex-col divide-y divide-border-subtle motion-safe:animate-page-in">
          {data.documents.map((doc) => {
            const expiring = doc.status.toLowerCase().startsWith('expiring')
            return (
              <li key={doc.id} className="py-1">
                <ListRow
                  icon={<FileIcon />}
                  iconTone={expiring ? 'warning' : 'success'}
                  title={doc.title}
                  subtitle={doc.meta}
                  trailing={<StatusBadge label={doc.status} tone={expiring ? 'warning' : 'success'} dot={false} plain />}
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
          { icon: <BarsIcon />, label: t('dashboard.actions.compareBids'), accent: 'success', onClick: () => navigate('/buyer/bids') },
          { icon: <TruckIcon />, label: t('dashboard.actions.trackOrders'), accent: 'brand', onClick: () => navigate('/buyer/orders') },
          { icon: <HelpIcon />, label: t('dashboard.actions.helpSupport'), accent: 'brand' },
        ]}
      />
    </>
  )
}

/* ── Verified, nothing sourced yet ────────────────────────────────────────── */

/**
 * The first-run verified dashboard: the org is cleared to trade but has no RFQs, so the working
 * cards (pipeline, actions, track order, suggestions, compliance) would all be empty shells.
 * It explains the flow and points at the one thing worth doing instead.
 */
function VerifiedEmptyDashboard({ data, onCreateRfq }: { data: BuyerDashboardData; onCreateRfq: () => void }) {
  const { t } = useTranslation()

  return (
    <>
      <WelcomeHero
        greeting={greeting(t, data.org.userName, true)}
        orgName={data.org.name}
        orgType={data.org.type}
        subtitle={t('dashboard.welcome.subtitle')}
        onCreateRfq={onCreateRfq}
      />

      <StepsCard
        title={t('dashboard.sourcing.verifiedTitle')}
        subtitle={t('dashboard.sourcing.verifiedSubtitle')}
        steps={sourcingSteps(t, true)}
      />

      <StatGrid stats={data.stats} muted />

      <SectionCard title={t('dashboard.myRfqs')}>
        <EmptyState
          icon={<FileIcon />}
          message={t('dashboard.emptyRfqs.verified')}
          action={
            <Button variant="primary" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={onCreateRfq}>
              {t('dashboard.createRfq')}
            </Button>
          }
        />
      </SectionCard>

      <QuickActions items={onboardingQuickActions(t, onCreateRfq)} />
    </>
  )
}

/* ── Pending & rejected ───────────────────────────────────────────────────── */

function PreVerifiedDashboard({
  record,
  status,
  onCreateRfq,
  onCheckStatus,
  isChecking,
}: {
  record?: OrgVerification
  status: 'pending' | 'rejected'
  onCreateRfq: () => void
  onCheckStatus: () => void
  isChecking: boolean
}) {
  const { t } = useTranslation()
  const resubmit = useResubmitDoc()
  const rejected = status === 'rejected'

  // The "checking …" hint shown next to a document while it's still under review.
  const checking: Record<DocKey, string> = {
    cr: t('dashboard.verification.checkingWathiq'),
    vat: t('dashboard.verification.checkingZatca'),
    nationalAddress: t('dashboard.verification.fromRegistration'),
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

      {/* Sourcing steps. Neither pending nor rejected dims them and neither shows a padlock: an
          unverified org CAN build RFQs and save them as drafts — only publishing is held — so
          locking the card would state the opposite of the rule. */}
      <StepsCard
        title={rejected ? t('dashboard.sourcing.resubmitTitle') : t('dashboard.sourcing.pendingTitle')}
        subtitle={rejected ? t('dashboard.sourcing.resubmitSubtitle') : t('dashboard.sourcing.pendingSubtitle')}
        steps={sourcingSteps(t, false)}
        action={
          <Button
            variant={rejected ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<RefreshIcon className="h-4 w-4" />}
            isLoading={isChecking}
            onClick={onCheckStatus}
          >
            {rejected ? t('dashboard.sourcing.resubmit') : t('dashboard.sourcing.checkStatus')}
          </Button>
        }
      />

      <StatGrid stats={MUTED_STATS} muted />

      {/* Empty, locked My RFQs. */}
      <SectionCard title={t('dashboard.myRfqs')}>
        <EmptyState
          icon={<FileIcon />}
          message={rejected ? t('dashboard.emptyRfqs.rejected') : t('dashboard.emptyRfqs.pending')}
          action={
            <Button variant="primary" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={onCreateRfq}>
              {t('dashboard.createRfq')}
            </Button>
          }
        />
      </SectionCard>

      {/* Quick actions — Create RFQ is reachable while unverified (drafts only; publish gated). */}
      <QuickActions items={onboardingQuickActions(t, onCreateRfq)} />
    </>
  )
}

/* ── Shared building blocks ───────────────────────────────────────────────── */

/** The three KPI tiles. `muted` greys the values for the states with nothing to report. */
function StatGrid({ stats, muted = false }: { stats: BuyerDashboardData['stats']; muted?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = STAT_ICON[stat.key] ?? FileIcon
        return (
          <div key={stat.key} style={{ animationDelay: `${index * 60}ms` }} className="motion-safe:animate-stepper-in">
            <StatCard
              icon={<Icon />}
              value={stat.value}
              label={t(`dashboard.stats.${stat.key}`)}
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

/** Quick actions for an org that has not sourced yet — same set on first run and pre-verification. */
function onboardingQuickActions(t: (k: string) => string, onCreateRfq: () => void): QuickActionSpec[] {
  return [
    { icon: <PlusIcon />, label: t('dashboard.actions.createNewRfq'), accent: 'brand', onClick: onCreateRfq },
    { icon: <FileIcon />, label: t('dashboard.actions.browseCategories'), accent: 'success' },
    { icon: <EyeIcon />, label: t('dashboard.actions.howAnonymity'), accent: 'brand' },
    { icon: <ShieldDocIcon />, label: t('dashboard.actions.completeProfile'), accent: 'success' },
  ]
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

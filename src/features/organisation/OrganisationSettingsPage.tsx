import { useTranslation } from 'react-i18next'
import { Spinner } from '@/shared/ui/Spinner'
import { Switch } from '@/shared/ui/Switch'
import { useOrganisation } from './useOrganisation'
import { useSaveOrgSettings } from './hooks/orgQueries'
import type { OrgSettings } from './types'

/** The toggle rows, in frame order. Each key is both the settings field and its i18n leaf. */
const NOTIFICATIONS = ['notifyNewBid', 'notifyCounterOffer', 'notifyOrderStatus', 'notifyDocExpiry'] as const
const SOURCING = ['requireCertifications', 'allowPartialBids'] as const

/**
 * OrganisationSettingsPage — the org-wide switches, which apply to everyone rather than to the
 * signed-in user. There is no Save button: each toggle writes on flip and is painted from the
 * cache immediately, rolling back if the write fails.
 *
 * "Anonymous RFQs" is deliberately NOT a switch. Blind sourcing is the platform's core invariant,
 * so it reads "Always on" — offering a toggle would imply it could be turned off.
 */
export function OrganisationSettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useOrganisation()
  const saveSettings = useSaveOrgSettings()

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const settings = data.settings
  const toggle = (key: keyof OrgSettings) => (checked: boolean) =>
    saveSettings.mutate({ ...settings, [key]: checked })

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('org.settings.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('org.settings.subtitle')}</p>
      </div>

      <Card title={t('org.settings.notifications.title')}>
        {NOTIFICATIONS.map((key) => (
          <ToggleRow
            key={key}
            title={t(`org.settings.notifications.${key}.title`)}
            desc={t(`org.settings.notifications.${key}.desc`)}
            checked={settings[key]}
            onChange={toggle(key)}
          />
        ))}
      </Card>

      <Card title={t('org.settings.sourcing.title')}>
        {/* Not togglable — see the file comment. */}
        <Row
          title={t('org.settings.sourcing.anonymousRfqs.title')}
          desc={t('org.settings.sourcing.anonymousRfqs.desc')}
          trailing={<span className="text-sm text-content-tertiary">{t('org.settings.sourcing.alwaysOn')}</span>}
        />
        {SOURCING.map((key) => (
          <ToggleRow
            key={key}
            title={t(`org.settings.sourcing.${key}.title`)}
            desc={t(`org.settings.sourcing.${key}.desc`)}
            checked={settings[key]}
            onChange={toggle(key)}
          />
        ))}
      </Card>
    </section>
  )
}

/* ── Local presentational bits ────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
      <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
      <ul className="mt-2 divide-y divide-border-subtle">{children}</ul>
    </div>
  )
}

function Row({ title, desc, trailing }: { title: string; desc: string; trailing: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-content-primary">{title}</p>
        <p className="mt-0.5 text-xs text-content-tertiary">{desc}</p>
      </div>
      <span className="shrink-0">{trailing}</span>
    </li>
  )
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return <Row title={title} desc={desc} trailing={<Switch checked={checked} onChange={onChange} label={title} />} />
}

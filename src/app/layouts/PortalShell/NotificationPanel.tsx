import { useTranslation } from 'react-i18next'
import { ListRow, type RowTone } from '@/shared/ui/dashboard'
import { ChatIcon, CheckCircleIcon, FileIcon } from '@/shared/ui/dashboard'

export type NotificationKind = 'message' | 'bid' | 'document'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  time: string
  unread?: boolean
}

const KIND_ICON: Record<NotificationKind, { icon: typeof ChatIcon; tone: RowTone }> = {
  message: { icon: ChatIcon, tone: 'success' },
  bid: { icon: CheckCircleIcon, tone: 'brand' },
  document: { icon: FileIcon, tone: 'warning' },
}

interface NotificationPanelProps {
  items: NotificationItem[]
  onMarkAllRead: () => void
  onViewAll: () => void
}

/**
 * NotificationPanel — the dropdown under the topbar bell: a header with "mark all read", a list
 * of notifications (each an icon tile + title + time + unread dot, via the shared {@link ListRow}),
 * and a "view all" footer. Presentational; the parent owns open/close and the data.
 */
export function NotificationPanel({ items, onMarkAllRead, onViewAll }: NotificationPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="w-80 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-xl">
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <span className="text-sm font-semibold text-content-primary">{t('dashboard.notifications.title')}</span>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          {t('dashboard.notifications.markAllRead')}
        </button>
      </header>

      <ul className="max-h-96 overflow-auto px-2 py-1">
        {items.map((item) => {
          const { icon: Icon, tone } = KIND_ICON[item.kind]
          return (
            <li key={item.id}>
              <ListRow
                icon={<Icon />}
                iconTone={tone}
                title={item.title}
                subtitle={item.time}
                trailing={item.unread ? <span className="h-2 w-2 rounded-full bg-brand-primary" /> : null}
                onClick={() => undefined}
              />
            </li>
          )
        })}
      </ul>

      <footer className="border-t border-border-subtle">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-3 text-center text-sm font-medium text-content-link hover:bg-interactive-hover"
        >
          {t('dashboard.notifications.viewAll')}
        </button>
      </footer>
    </div>
  )
}

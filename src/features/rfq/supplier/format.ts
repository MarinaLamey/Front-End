import { useTranslation } from 'react-i18next'
import { formatSar, toHalalas } from '@/shared/lib/money'

/**
 * Formatting shared by every supplier surface: SAR amounts, the date shapes the screens use, and
 * the relative "3d ago" behind the activity lines. One hook so the active locale is resolved once
 * per page rather than at every call site.
 */
export function useSupplierFormat() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const money = (sar: number) => formatSar(toHalalas(sar), { locale })
  const moneyPlain = (sar: number) => formatSar(toHalalas(sar), { locale, symbol: false })
  const dateFull = (iso: string) =>
    iso
      ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
      : '—'
  const dateShort = (iso: string) =>
    iso ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }
  /** "2h ago" / "3d ago", falling back to a short date beyond a week (spec §10). */
  const ago = (iso: string) => {
    if (!iso) return '—'
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
    if (minutes < 60) return t('rfq.supplier.ago.minutes', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('rfq.supplier.ago.hours', { count: hours })
    const days = Math.floor(hours / 24)
    return days <= 7 ? t('rfq.supplier.ago.days', { count: days }) : dateShort(iso)
  }
  /** ISO → the `yyyy-mm-dd` a native date input needs. */
  const dateValue = (iso: string) => (iso ? iso.slice(0, 10) : '')

  return { money, moneyPlain, dateFull, dateShort, stamp, ago, dateValue, locale }
}

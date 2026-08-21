import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** One tab on the supplier lists — an i18n-resolved label and the count beside it. */
export interface SupplierTab<T extends string> {
  id: T
  label: string
  count: number
}

/**
 * Underlined tab bar used by Available RFQs. The count sits beside the label rather than in a
 * pill so the active tab reads as one word plus a number, exactly as the buyer's chips do.
 */
export function SupplierTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SupplierTab<T>[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex items-center gap-6 border-b border-border-subtle" role="tablist">
      {tabs.map((tab) => {
        const on = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={cn(
              'mp-press -mb-px cursor-pointer border-b-2 pb-3 text-sm transition-colors',
              on
                ? 'border-brand-primary font-semibold text-brand-primary'
                : 'border-transparent font-medium text-content-secondary hover:text-content-primary',
            )}
          >
            {tab.label}
            <span className={cn('ms-2', on ? 'text-brand-primary' : 'text-content-tertiary')}>{tab.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Filter-chip row used by My Bids — pill per status with its count. */
export function SupplierChips<T extends string>({
  chips,
  active,
  onChange,
}: {
  chips: SupplierTab<T>[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const on = chip.id === active
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              'mp-press cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              on
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-border-subtle text-content-secondary hover:text-content-primary',
            )}
          >
            {chip.label}
            <span className={cn('ms-1.5', on ? 'text-white/70' : 'text-content-tertiary')}>{chip.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A label/value pair in a right-rail summary card. */
export function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: ReactNode
  valueClass?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className={cn('text-end font-semibold', valueClass ?? 'text-content-primary')}>{value}</dd>
    </div>
  )
}

/** The card every supplier page hangs its content on. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5', className)}>
      {children}
    </div>
  )
}

/** Full-width notice above the fold — the one line telling the supplier where their bid stands. */
export function StatusNote({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'danger' | 'warning'
  children: ReactNode
}) {
  const toneClass = {
    info: 'bg-status-info-subtle text-status-info',
    success: 'bg-status-success-subtle text-status-success-strong',
    danger: 'bg-status-danger-subtle text-status-danger',
    warning: 'bg-status-warning-subtle text-status-warning-strong',
  }[tone]
  return <p className={cn('rounded-lg px-4 py-3 text-sm', toneClass)}>{children}</p>
}

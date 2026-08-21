import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/Input'
import { cn } from '@/shared/lib/cn'
import { CloseIcon, PlusIcon } from './icons'

interface ChipPickerProps {
  selected: string[]
  options: string[]
  onChange: (next: string[]) => void
  addLabel: string
  removeLabel: string
  searchPlaceholder?: string
  /** Allow free-text entries not in `options` (e.g. a custom certification). */
  allowCustom?: boolean
  customLabel?: string
  /** A static, non-removable chip shown when nothing is selected (e.g. "All regions"). */
  placeholderChip?: string
  /** Read-only mode — shows the selected chips without remove/add controls (e.g. locked on Amend). */
  locked?: boolean
  /**
   * Display-only translations, keyed by the value in `options`/`selected`.
   *
   * The picker keeps storing the VALUE, not the label: RFQ categories come from the backend
   * catalogue and have to travel back as the exact catalogue name to resolve to a GUID, but the
   * buyer should read them in their own language. A value with no entry renders as itself.
   */
  labels?: Record<string, string>
}

/**
 * ChipPicker — selected values as removable pills plus an "+ Add" control that opens an in-flow
 * searchable list (optionally allowing a custom entry). In-flow (not absolute) so the panel grows
 * the card instead of being clipped; RTL-safe. Reused for certifications and supplier regions.
 */
export function ChipPicker({
  selected,
  options,
  onChange,
  addLabel,
  removeLabel,
  searchPlaceholder,
  allowCustom = false,
  customLabel,
  placeholderChip,
  locked = false,
  labels,
}: ChipPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const labelOf = (value: string) => labels?.[value] ?? value
  // Search the label, not the value — with `labels` set they differ, and an Arabic reader typing
  // what is on screen must still find the option.
  const available = options.filter(
    (option) =>
      !selected.includes(option) && labelOf(option).toLowerCase().includes(query.trim().toLowerCase()),
  )
  const trimmed = query.trim()
  const canCustom =
    allowCustom &&
    trimmed.length > 0 &&
    !options.some((o) => labelOf(o).toLowerCase() === trimmed.toLowerCase()) &&
    !selected.some((s) => labelOf(s).toLowerCase() === trimmed.toLowerCase())

  const add = (value: string) => {
    if (value && !selected.includes(value)) onChange([...selected, value])
    setQuery('')
    setOpen(false)
  }
  const remove = (value: string) => onChange(selected.filter((s) => s !== value))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {selected.length === 0 && placeholderChip && (
          <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand-strong">
            {placeholderChip}
          </span>
        )}
        {selected.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand-strong"
          >
            {labelOf(chip)}
            {!locked && (
              <button
                type="button"
                aria-label={removeLabel}
                onClick={() => remove(chip)}
                className="cursor-pointer text-brand-strong/70 transition-colors hover:text-brand-strong"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!locked && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border-default px-2.5 py-1 text-xs font-medium text-content-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <PlusIcon className="h-3 w-3" />
            {addLabel}
          </button>
        )}
      </div>

      {!locked && open && (
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-2 shadow-sm">
          <Input
            size="sm"
            autoFocus
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className={cn('mt-1 max-h-52 overflow-auto', !available.length && !canCustom && 'py-0')}>
            {available.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => add(option)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm text-content-primary transition-colors hover:bg-bg-surface-sunken"
                >
                  {labelOf(option)}
                  <span className="text-xs font-medium text-brand-primary">{addLabel}</span>
                </button>
              </li>
            ))}
            {canCustom && (
              <li>
                <button
                  type="button"
                  onClick={() => add(trimmed)}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-primary transition-colors hover:bg-bg-surface-sunken"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  {customLabel} “{trimmed}”
                </button>
              </li>
            )}
            {!available.length && !canCustom && (
              <li className="px-2 py-2 text-sm text-content-tertiary">{t('common.noResults')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

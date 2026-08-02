import { cn } from '@/shared/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible group name (e.g. "What are you sourcing?"). */
  ariaLabel: string
  className?: string
}

/**
 * SegmentedControl — a sunken track of mutually-exclusive pills; the active pill lifts onto a
 * raised surface. Equal-width segments, keyboard/`aria-pressed` wired, RTL-safe. Used for the
 * Goods / Service / Both selector and reusable anywhere a compact single-choice is needed.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex w-full gap-1 rounded-lg bg-bg-surface-sunken p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
              'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50',
              active
                ? 'bg-bg-surface text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

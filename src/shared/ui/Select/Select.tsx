import { cn } from '@/shared/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: (string | SelectOption)[]
  placeholder?: string
  /** Accessible name when there's no visible label beside the control. */
  ariaLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.667}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

/**
 * Select — a native single-select styled to match SearchSelect / Input (rounded-lg surface,
 * `outline` focus that grows 1px→2px with zero reflow, chevron). Bare, RTL-safe; `size` mirrors
 * the Input scale. For a searchable/portal dropdown use SearchSelect instead.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  size = 'md',
  className,
}: SelectProps) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <div className={cn('relative', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full cursor-pointer appearance-none rounded-lg bg-bg-surface text-sm outline outline-1 [outline-offset:-1px] outline-border-default transition-colors',
          'hover:outline-border-focus focus:outline-2 focus:[outline-offset:-2px] focus:outline-border-focus',
          'disabled:cursor-not-allowed disabled:opacity-60',
          size === 'sm' ? 'h-9 ps-3 pe-8' : 'h-10 ps-3.5 pe-9',
          value ? 'text-content-primary' : 'text-content-tertiary',
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {opts.map((option) => (
          <option key={option.value} value={option.value} className="text-content-primary">
            {option.label}
          </option>
        ))}
      </select>
      <Chevron
        className={cn(
          'pointer-events-none absolute top-1/2 shrink-0 -translate-y-1/2 text-content-tertiary',
          size === 'sm' ? 'h-4 w-4 end-2.5' : 'h-5 w-5 end-3',
        )}
      />
    </div>
  )
}

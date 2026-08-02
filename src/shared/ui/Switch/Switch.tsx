import { cn } from '@/shared/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name when the switch has no visible label element beside it. */
  label: string
  id?: string
  className?: string
}

/**
 * Switch — a compositor-only on/off toggle (`role="switch"`). The knob slides with a GPU
 * transform, so it stays 60fps and RTL-correct (translate flips under `rtl:`). Callers own
 * the value and lay out any visible label/description next to it.
 */
export function Switch({ checked, onChange, disabled = false, label, id, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface',
        'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-primary' : 'bg-bg-surface-sunken',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out will-change-transform',
          'motion-reduce:transition-none',
          checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

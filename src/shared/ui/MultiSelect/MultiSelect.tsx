import { cn } from '@/shared/lib/cn'
import { useMultiSelect } from './useMultiSelect'

interface MultiSelectProps {
  label: string
  required?: boolean
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Accessible label for a chip's remove button, e.g. "Remove". */
  removeLabel: string
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.667} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

function XMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 4 12M4 4l8 8" />
    </svg>
  )
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.333 4 6 11.333 2.667 8" />
    </svg>
  )
}

/**
 * MultiSelect — labelled chip multiselect (pure presentation over {@link useMultiSelect}).
 * Selected values render as removable chips inside the control; a dropdown toggles options.
 * Self-contained icons so `shared` stays free of feature imports.
 */
export function MultiSelect({
  label,
  required = false,
  options,
  value,
  onChange,
  placeholder,
  removeLabel,
}: MultiSelectProps) {
  const { open, setOpen, toggle, remove, isSelected, containerRef } = useMultiSelect({ value, onChange })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content-primary">
        {label}
        {required && <span className="ms-0.5 text-status-danger">*</span>}
      </span>

      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-xl bg-bg-surface px-3 py-2.5 text-start outline outline-1 -outline-offset-1 outline-border-default transition-colors hover:outline-border-focus"
        >
          <span className="flex flex-1 flex-wrap gap-2">
            {value.length === 0 && placeholder && (
              <span className="text-sm text-content-tertiary">{placeholder}</span>
            )}
            {value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-md bg-brand-subtle px-2 py-0.5 text-sm text-brand-strong"
              >
                {v}
                <button
                  type="button"
                  aria-label={`${removeLabel} ${v}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    remove(v)
                  }}
                  className="text-brand-strong/70 hover:text-brand-strong"
                >
                  <XMark className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </span>
          <Chevron className={cn('h-5 w-5 shrink-0 text-content-tertiary transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          // In-flow (not absolute) so the dropdown grows the card height instead of overlaying
          // and being clipped by the card's overflow-hidden. Long lists scroll within max-h-56.
          <ul className="mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border-subtle bg-bg-surface p-1 shadow-lg">
            {options.map((option) => {
              const selected = isSelected(option)
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => toggle(option)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-interactive-hover',
                      selected ? 'font-medium text-brand-strong' : 'text-content-primary',
                    )}
                  >
                    {option}
                    {selected && <CheckMark className="h-4 w-4" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

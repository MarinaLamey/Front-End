interface CloseButtonProps {
  onClose: () => void
  /** Accessible name — the button shows only a glyph. */
  label: string
}

/**
 * CloseButton — the dismiss affordance in a {@link Modal} header. Lives here rather than beside
 * any one dialog because every dialog in the app wears the same one.
 */
export function CloseButton({ onClose, label }: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className="mp-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-bg-surface-sunken hover:text-content-primary"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.667} className="h-4 w-4">
        <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
      </svg>
    </button>
  )
}

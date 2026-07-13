import { useEffect, useRef, useState, type RefObject } from 'react'

interface UseMultiSelectOptions {
  value: string[]
  onChange: (next: string[]) => void
}

export interface UseMultiSelectResult {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: (option: string) => void
  remove: (option: string) => void
  isSelected: (option: string) => boolean
  /** Attach to the control wrapper — an outside click closes the menu. */
  containerRef: RefObject<HTMLDivElement>
}

/**
 * useMultiSelect — the chip-multiselect behavior, with no markup. Owns the open state, the
 * add/remove/toggle against the caller's value array, and the outside-click close (via a
 * container ref). The presentational {@link MultiSelect} only renders.
 */
export function useMultiSelect({ value, onChange }: UseMultiSelectOptions): UseMultiSelectResult {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const isSelected = (option: string) => value.includes(option)

  return {
    open,
    setOpen,
    isSelected,
    toggle: (option) => onChange(isSelected(option) ? value.filter((v) => v !== option) : [...value, option]),
    remove: (option) => onChange(value.filter((v) => v !== option)),
    containerRef,
  }
}

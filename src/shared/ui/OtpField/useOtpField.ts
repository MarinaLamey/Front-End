import {
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'

interface UseOtpFieldOptions {
  value: string
  onChange: (digits: string) => void
  length?: number
}

/** Prop bag spread onto each digit <input> by the presentational shell. */
export interface OtpCellProps {
  ref: (el: HTMLInputElement | null) => void
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void
  onFocus: (event: FocusEvent<HTMLInputElement>) => void
}

export interface UseOtpFieldResult {
  length: number
  cells: string[]
  /** Per-box behavior (ref, value, key/paste/focus handlers). Spread onto each <input>. */
  getCellProps: (index: number) => OtpCellProps
}

/**
 * useOtpField — the segmented-code input behavior, with no markup. Owns the per-box refs
 * and the auto-advance / backspace-to-previous / arrow-nav / paste-to-fill logic, exposing
 * a `getCellProps(i)` bag the presentational {@link OtpField} spreads onto each box. The
 * full code stays a plain string owned by the caller; box i mirrors `value[i]`.
 */
export function useOtpField({ value, onChange, length = 4 }: UseOtpFieldOptions): UseOtpFieldResult {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const cells = Array.from({ length }, (_, i) => value[i] ?? '')

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  const setCell = (i: number, digit: string) => {
    const next = cells.slice()
    next[i] = digit
    onChange(next.join('').replace(/\D/g, '').slice(0, length))
  }

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    setCell(i, digit)
    if (i < length - 1) focus(i + 1)
  }

  const handleKeyDown = (i: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (cells[i]) {
        setCell(i, '')
      } else if (i > 0) {
        event.preventDefault()
        setCell(i - 1, '')
        focus(i - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focus(i - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focus(i + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    onChange(digits)
    focus(digits.length)
  }

  const getCellProps = (i: number): OtpCellProps => ({
    ref: (el) => {
      inputs.current[i] = el
    },
    value: cells[i],
    onChange: (event) => handleChange(i, event.target.value),
    onKeyDown: (event) => handleKeyDown(i, event),
    onPaste: handlePaste,
    onFocus: (event) => event.target.select(),
  })

  return { length, cells, getCellProps }
}

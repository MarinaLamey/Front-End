import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'

interface UseFileDropOptions {
  /** Called with the picked/dropped file, or null when cleared. */
  onFile: (file: File | null) => void
}

interface RootProps {
  role: 'button'
  tabIndex: 0
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

interface InputProps {
  ref: (el: HTMLInputElement | null) => void
  type: 'file'
  className: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export interface UseFileDropResult {
  isDragging: boolean
  /** Open the OS file picker. */
  open: () => void
  /** Spread onto the dropzone container. */
  getRootProps: () => RootProps
  /** Spread onto the visually-hidden <input type=file>. */
  getInputProps: () => InputProps
}

/**
 * useFileDrop — the dropzone behavior, with no markup. Owns the hidden input ref, the
 * click-to-pick, keyboard activation, and drag state, exposing prop bags the presentational
 * {@link FileDrop} spreads. Selection is a single File handed back via `onFile`.
 */
export function useFileDrop({ onFile }: UseFileDropOptions): UseFileDropResult {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const open = () => inputRef.current?.click()
  const take = (files: FileList | null) => onFile(files?.[0] ?? null)

  return {
    isDragging,
    open,
    getRootProps: () => ({
      role: 'button',
      tabIndex: 0,
      onClick: open,
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      },
      onDragOver: (event) => {
        event.preventDefault()
        setIsDragging(true)
      },
      onDragLeave: (event) => {
        event.preventDefault()
        setIsDragging(false)
      },
      onDrop: (event) => {
        event.preventDefault()
        setIsDragging(false)
        take(event.dataTransfer.files)
      },
    }),
    getInputProps: () => ({
      ref: (el) => {
        inputRef.current = el
      },
      type: 'file',
      className: 'sr-only',
      onChange: (event) => take(event.target.files),
    }),
  }
}

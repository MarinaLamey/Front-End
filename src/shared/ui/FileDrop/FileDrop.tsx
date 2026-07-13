import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import type { UiError } from '@/shared/ui/types'
import { useFileDrop } from './useFileDrop'

interface FileDropProps {
  label: string
  required?: boolean
  /** Prompt inside the zone, e.g. "Click to upload or drag and drop". */
  prompt: string
  /** Sub-hint, e.g. "PDF, JPG or PNG · up to 5MB". */
  hint?: string
  /** `accept` attribute for the file input. */
  accept?: string
  /** Leading upload glyph. */
  icon?: ReactNode
  /** Name of the currently-selected file (controlled by the caller). */
  fileName?: string
  onFile: (file: File | null) => void
  removeLabel: string
  error?: UiError | null
}

/**
 * FileDrop — labelled upload dropzone (pure presentation over {@link useFileDrop}). Empty:
 * a dashed click/drop target; filled: the file name with a remove control. The caller owns
 * the selected value (`fileName`) so it survives step navigation.
 */
export function FileDrop({
  label,
  required = false,
  prompt,
  hint,
  accept,
  icon,
  fileName,
  onFile,
  removeLabel,
  error = null,
}: FileDropProps) {
  const { isDragging, getRootProps, getInputProps } = useFileDrop({ onFile })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content-primary">
        {label}
        {required && <span className="ms-0.5 text-status-danger">*</span>}
      </span>

      {fileName ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface px-4 py-3">
          <span className="truncate text-sm text-content-primary">{fileName}</span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="shrink-0 text-sm font-medium text-content-tertiary hover:text-status-danger"
          >
            {removeLabel}
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            isDragging ? 'border-brand-primary bg-brand-subtle' : 'border-border-default hover:border-border-focus',
            error && 'border-border-danger',
          )}
        >
          {icon && <span className="text-content-tertiary">{icon}</span>}
          <span className="text-sm text-content-secondary">{prompt}</span>
          {hint && <span className="text-xs text-content-tertiary">{hint}</span>}
          <input {...getInputProps()} accept={accept} />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-status-danger">
          {error.title}
        </p>
      )}
    </div>
  )
}

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

/**
 * Textarea — multi-line text control matching the Input surface (outline focus that grows
 * 1px→2px with zero reflow, rounded-xl, themed). Bare by design: wrap with a label/RfqField.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full resize-y rounded-xl bg-bg-surface px-3.5 py-2.5 text-sm text-content-primary',
        'outline outline-1 outline-border-default placeholder:text-content-tertiary',
        'transition-[outline-color] focus:outline-2 focus:outline-border-focus',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

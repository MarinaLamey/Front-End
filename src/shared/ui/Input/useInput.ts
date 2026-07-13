import {
  useImperativeHandle,
  useRef,
  type ForwardedRef,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { cn } from '@/shared/lib/cn'
import type { UiError } from '@/shared/ui/types'

/* 
 * STYLE CONFIG — single source of truth (same pattern as Button).
 *
 * Only `size` is a chosen design bucket here. The visual STATES (focus, error,
 * disabled) are runtime states, not options — they're driven by CSS state
 * variants (focus-within, data-[invalid], data-[disabled]) + ARIA in BASE below,
 * not by a prop the caller picks. Add a bucket here and the typed prop, the
 * className compile, and the DOM-prop split all update automatically.
 *
 *  Values must be COMPLETE, LITERAL class strings (Tailwind scans source text).
 * Colors are semantic tokens from the `@theme` layer → whitelabel-themeable.
 *  */


const styleConfig = {
  size: {
    sm: 'h-8 px-2',
    md: 'h-10 px-3',
    lg: 'h-12 px-4',
  },
} as const

type StyleConfig = typeof styleConfig
type StyleBucket = keyof StyleConfig // size 
type OptionOf<B extends StyleBucket> = keyof StyleConfig[B] //"sm" / "md"  / "lg"
type StyleSelection = { [B in StyleBucket]?: OptionOf<B> }

export type InputSize = OptionOf<'size'>

const styleDefaults: { [B in StyleBucket]: OptionOf<B> } = {
  size: 'md',
}

function resolveStyleClasses(selection: StyleSelection): string {
  return (Object.keys(styleConfig) as StyleBucket[])
    .map((bucket) => {
      const group = styleConfig[bucket] as Record<string, string>
      const option = (selection[bucket] ?? styleDefaults[bucket]) as string
      return group[option] ?? ''
    })
    .filter(Boolean)
    .join(' ')
}

/*  Structural base: the visual shell + a11y states + 60fps motion  */ // this wrraper is raping all the input 
const WRAPPER_BASE =
  'group relative inline-flex w-full items-center gap-2 rounded-lg bg-bg-surface text-content-primary ' +
  // outline (not border) → 1px↔2px focus change costs zero layout (no reflow/CLS).
  'outline outline-1 [outline-offset:-1px] outline-border-default ' +
  // only opacity animates; the outline COLOR snaps (color transitions are paint, not compositor).
  'transition-opacity duration-150 ease-out motion-reduce:transition-none ' +
  'focus-within:outline-2 focus-within:[outline-offset:-2px] focus-within:outline-border-focus ' +
  'data-[invalid=true]:outline-border-danger data-[invalid=true]:focus-within:outline-border-danger ' +
  'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-bg-surface-sunken ' +
  'data-[disabled=true]:opacity-60 data-[disabled=true]:outline-border-subtle'

const INPUT_BASE =
  'peer h-full w-full flex-1 border-0 bg-transparent p-0 text-sm font-normal text-content-primary ' +
  'placeholder:text-content-tertiary outline-none focus:outline-none ' +
  'disabled:cursor-not-allowed'

export const SPINNER_SIZE: Record<InputSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    StyleSelection {
  /** Decorative leading adornment (e.g. a search glyph). Hidden from a11y tree. */
  leftIcon?: ReactNode
  /** Decorative trailing adornment. Replaced by a spinner while `isLoading`. */
  rightIcon?: ReactNode
  /** Interactive trailing control (e.g. password show/hide). Rendered as a real button. */
  trailingAction?: {
    icon: ReactNode
    label: string
    onClick: () => void
    pressed?: boolean
  }
  /** Async validation in flight → trailing spinner + aria-busy. Does not block typing. */
  isLoading?: boolean
  /** Typed error context (Pillar 4). Drives the danger outline + aria-invalid. Never a string. */
  error?: UiError | null
  /** id of the element rendering the error message, wired to `aria-describedby`. */
  errorId?: string
  /** Extra classes for the inner <input> (the wrapper takes `className`). */
  inputClassName?: string
}

/** Everything the presentational shell needs — already computed. No JSX in here. */
export interface UseInputResult {
  /** Attach to the inner <input>; also re-exposed to the forwarded ref. */
  inputRef: Ref<HTMLInputElement> //to ref the specific input 
  wrapperProps: {
    className: string
    'data-invalid'?: 'true'
    'data-disabled'?: 'true'
    onMouseDown: (event: MouseEvent<HTMLDivElement>) => void // this func for if user click in outlines drop him into the input .
  }
  inputProps: InputHTMLAttributes<HTMLInputElement>
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  trailingAction?: InputProps['trailingAction']
  isLoading: boolean
  spinnerClassName: string
  /** Live-region text (the visible message is the parent's job). */
  statusText: string
}

/**
 * useInput — the behavioral contract of Input, with no markup.
 *
 * Owns the inner ref + click-anywhere-to-focus, splits style buckets from DOM props,
 * resolves the wrapper/input classes, and wires the typed-error a11y plumbing
 * (aria-invalid / aria-describedby / live announcement). The component just spreads
 * the returned prop bags.
 */
export function useInput(props: InputProps, ref: ForwardedRef<HTMLInputElement>): UseInputResult {
  const {
    leftIcon,
    rightIcon,
    trailingAction,
    isLoading = false,
    error = null,
    errorId,
    className,
    inputClassName,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    ...rest
  } = props

  // Generic split: style buckets feed the resolver; everything else → native <input>.
  const selection: StyleSelection = {}
  const domProps: Record<string, unknown> = {}
  for (const key of Object.keys(rest)) {
    const value = (rest as Record<string, unknown>)[key]
    if (Object.prototype.hasOwnProperty.call(styleConfig, key)) {
      ;(selection as Record<string, unknown>)[key] = value
    } else {
      domProps[key] = value
    }
  }

  const size = (selection.size ?? styleDefaults.size) as InputSize

  // Internal ref for click-to-focus, re-exposed to the forwarded ref.
  const innerRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, [])

  const describedBy =
    [ariaDescribedBy, error && errorId ? errorId : null].filter(Boolean).join(' ') || undefined

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      event.preventDefault()
      return
    }
    const input = innerRef.current
    if (input && event.target !== input) {
      // Focus the field when the padding/icon area is clicked, without stealing
      // the press from the input itself.
      event.preventDefault()
      input.focus()
    }
  }

  return {
    inputRef: innerRef,
    wrapperProps: {
      className: cn(WRAPPER_BASE, resolveStyleClasses(selection), className),
      'data-invalid': error ? 'true' : undefined,
      'data-disabled': disabled ? 'true' : undefined,
      onMouseDown: handleMouseDown,
    },
    inputProps: {
      disabled: disabled || undefined,
      'aria-invalid': error ? true : undefined,
      'aria-busy': isLoading || undefined,
      'aria-describedby': describedBy,
      className: cn(INPUT_BASE, inputClassName),
      ...(domProps as InputHTMLAttributes<HTMLInputElement>),
    },
    leftIcon,
    rightIcon,
    trailingAction,
    isLoading,
    spinnerClassName: SPINNER_SIZE[size],
    statusText: error ? error.title : '',
  }
}

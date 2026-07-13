import { type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import type { UiError } from '@/shared/ui/types'

/* ────────────────────────────────────────────────────────────────────────────
 * STYLE CONFIG — the single source of truth.
 *
 * Each top-level key is a "design bucket" (variant, size, …). Each bucket maps
 * option keys → a COMPLETE, LITERAL Tailwind class string. The component's prop
 * contract is derived from this object via `keyof typeof`, so adding a bucket or
 * an option here automatically (a) adds a typed prop, (b) gets compiled into the
 * className, and (c) is stripped from the DOM forward — no other edits required.
 *
 * ⚠️ Tailwind's compiler only emits classes it can find as literal text in source.
 *    Therefore every value below must be a full class string. NEVER build classes
 *    by interpolation (e.g. `bg-${x}`) — those would silently not be generated.
 *
 * Colors are SEMANTIC design-system utilities (bg-brand-primary, text-content-primary,
 * …) defined in the `@theme` token layer in index.css. Those tokens are CSS-
 * variable-backed, so whitelabel theming re-skins all buttons at runtime.
 * ──────────────────────────────────────────────────────────────────────────── */
const styleConfig = {
  variant: {
    primary:
      'bg-brand-primary text-brand-primary-on hover:bg-brand-primary-hover focus-visible:ring-brand-primary',
    secondary:
      'bg-brand-secondary text-brand-secondary-on hover:bg-brand-secondary-hover focus-visible:ring-brand-secondary',
    ghost:
      'bg-transparent text-content-primary hover:bg-interactive-hover focus-visible:ring-interactive-hover',
    danger:
      'bg-status-danger text-status-danger-on hover:bg-status-danger-hover focus-visible:ring-status-danger',
    link: 'bg-transparent text-content-link hover:text-content-link-hover focus-visible:ring-content-link',
  },
  size: {
    sm: 'h-8 px-3 text-sm gap-2',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-5 text-sm gap-2',
  },
} as const

/* ── Derived TypeScript contract — props follow the config, automatically ────── */
type StyleConfig = typeof styleConfig
type StyleBucket = keyof StyleConfig
type OptionOf<B extends StyleBucket> = keyof StyleConfig[B]
type StyleSelection = { [B in StyleBucket]?: OptionOf<B> }

/** Public option unions, exported for consumers. They track the config exactly. */
export type ButtonVariant = OptionOf<'variant'>
export type ButtonSize = OptionOf<'size'>

/** The default option per bucket. Typed against the config so it can't drift. */
const styleDefaults: { [B in StyleBucket]: OptionOf<B> } = {
  variant: 'primary',
  size: 'md',
}

/** Generic compiler: for each bucket, look up the selected (or default) option. */
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

/* ── Structural base (not a design bucket): layout, a11y, 60fps motion ───────── */
const BASE =
  'group relative inline-flex select-none items-center justify-center overflow-hidden ' +
  'whitespace-nowrap rounded-lg font-medium ' +
  'transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ' +
  'aria-[busy=true]:cursor-progress ' +
  'data-[state=error]:ring-2 data-[state=error]:ring-red-500'

const SPINNER_SIZE: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

/* ── Public props: config-derived style buckets + behavioral contract ────────── */
export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    StyleSelection {
  /** Stretch to the container width. */
  fullWidth?: boolean

  // Async presentation (visual-only — zero data-layer awareness).
  /** A request is in flight (e.g. the POST before a 202). Swaps the label for a spinner. */
  isLoading?: boolean
  /** Accepted (202), awaiting the confirming event. First-class state, not an error. */
  isPending?: boolean
  /** An optimistic projection is applied locally, awaiting backend confirmation. */
  isOptimistic?: boolean
  /** Accessible label announced while loading. Defaults to "Loading". */
  loadingText?: string

  /** Decorative content before the label. Hidden from the a11y tree. */
  leftIcon?: ReactNode
  /** Decorative content after the label. Hidden from the a11y tree. */
  rightIcon?: ReactNode

  /** Typed error context if the triggered action failed. Never a raw string. */
  error?: UiError | null
  /** id of the element describing the error, wired to `aria-describedby`. */
  errorId?: string
}

/** Everything the presentational shell needs — already computed. No JSX in here. */
export interface UseButtonResult {
  rootProps: ButtonHTMLAttributes<HTMLButtonElement> & {
    [key: `data-${string}`]: string | undefined
  }
  /** Classes for the label wrapper (fades out under the spinner → zero CLS). */
  contentClassName: string
  isLoading: boolean
  spinnerClassName: string
  showDot: boolean
  dotTone: 'pending' | 'optimistic'
  /** Live-region text announced to assistive tech. */
  statusText: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

/**
 * useButton — the entire behavioral contract of Button, with no markup.
 *
 * Resolves styling from `styleConfig`, splits style-bucket props from DOM props,
 * derives the async/disabled state machine (P3), the typed-error wiring (P4), and the
 * a11y/announcement plumbing (P1), and guards clicks while busy/disabled. The component
 * just spreads the returned `rootProps` and renders the pieces.
 */
export function useButton(props: ButtonProps): UseButtonResult {
  const {
    fullWidth = false,
    isLoading = false,
    isPending = false,
    isOptimistic = false,
    loadingText,
    leftIcon,
    rightIcon,
    error = null,
    errorId,
    className,
    children,
    type = 'button',
    onClick,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    ...rest
  } = props

  // Generically split the remaining props: style buckets feed the resolver,
  // everything else is forwarded to the native <button>. Adding a bucket to
  // styleConfig makes it "just work" here with no code change.
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

  const size = (selection.size ?? styleDefaults.size) as ButtonSize
  const isBusy = isLoading || isPending
  // Truly disabled only when `disabled` is set; while busy we keep the button
  // focusable (aria-disabled) so focus isn't lost mid-transaction.
  const isBlocked = disabled || isBusy

  const dataState = error
    ? 'error'
    : isLoading
      ? 'loading'
      : isPending
        ? 'pending'
        : isOptimistic
          ? 'optimistic'
          : 'idle'

  const showDot = !isLoading && (isPending || isOptimistic)

  const statusText = isLoading
    ? (loadingText ?? 'Loading')
    : error
      ? error.title
      : isPending
        ? 'Pending — awaiting confirmation'
        : isOptimistic
          ? 'Applied — confirming'
          : ''

  const describedBy =
    [ariaDescribedBy, error && errorId ? errorId : null].filter(Boolean).join(' ') || undefined

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isBlocked) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  const rootProps = {
    type,
    onClick: handleClick,
    disabled: disabled || undefined,
    'aria-busy': isBusy || undefined,
    'aria-disabled': (isBlocked && !disabled) || undefined,
    'aria-describedby': describedBy,
    'data-state': dataState,
    className: cn(BASE, resolveStyleClasses(selection), fullWidth && 'w-full', className),
    ...domProps,
  } as UseButtonResult['rootProps']

  return {
    rootProps,
    contentClassName: cn(
      'inline-flex items-center justify-center gap-2 transition-opacity motion-reduce:transition-none',
      isLoading && 'opacity-0',
    ),
    isLoading,
    spinnerClassName: SPINNER_SIZE[size],
    showDot,
    dotTone: isPending ? 'pending' : 'optimistic',
    statusText,
    leftIcon,
    rightIcon,
    children,
  }
}

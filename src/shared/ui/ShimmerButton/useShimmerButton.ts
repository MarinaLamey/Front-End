import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/shared/lib/cn'

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Keep the glow lit and the brand gradient filled (e.g. the active nav item). */
  active?: boolean
  /**
   * What lights the shimmer:
   * - 'hover' (default): glows while hovered/focused.
   * - 'click': a one-shot burst that sweeps once on each click, then fades.
   */
  trigger?: 'hover' | 'click'
  children: ReactNode
}

/** How long a click burst stays lit — one full sweep of the rim (matches the CSS spin). */
const BURST_MS = 1200

/** Everything the presentational shell needs — already computed. No JSX in here. */
export interface UseShimmerButtonResult {
  rootProps: ButtonHTMLAttributes<HTMLButtonElement> & {
    [key: `data-${string}`]: string | undefined
  }
  children: ReactNode
}

/**
 * useShimmerButton — the behavior of ShimmerButton, with no markup.
 *
 * In 'click' mode it owns the one-shot burst state (a `data-burst` flag dropped and
 * re-set on the next frame so rapid re-clicks restart the sweep), and cleans up its
 * timer on unmount. In 'hover' mode there is no state — the CSS drives everything off
 * `:hover`/`[data-active]`. Returns the button attribute bag the shell spreads.
 */
export function useShimmerButton(props: ShimmerButtonProps): UseShimmerButtonResult {
  const {
    active = false,
    trigger = 'hover',
    className,
    children,
    type = 'button',
    onClick,
    ...rest
  } = props

  const [burst, setBurst] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), [])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (trigger === 'click') {
      window.clearTimeout(timer.current ?? undefined)
      // Drop then re-set on the next frame so a rapid re-click restarts the sweep.
      setBurst(false)
      requestAnimationFrame(() => setBurst(true))
      timer.current = window.setTimeout(() => setBurst(false), BURST_MS)
    }
    onClick?.(event)
  }

  const rootProps = {
    type,
    'data-trigger': trigger,
    'data-active': active || undefined,
    'data-burst': burst || undefined,
    className: cn('shimmer-btn', className),
    onClick: handleClick,
    ...rest,
  } as UseShimmerButtonResult['rootProps']

  return { rootProps, children }
}

import { useShimmerButton, type ShimmerButtonProps } from './useShimmerButton'
import './ShimmerButton.css'

export type { ShimmerButtonProps } from './useShimmerButton'

/**
 * ShimmerButton — presentational shell over {@link useShimmerButton}. The hook owns the
 * click-burst state and the attribute bag; this file only lays out the label and the
 * decorative `.shimmer` span. The effect itself lives in ShimmerButton.css.
 *
 * The label is wrapped in a `relative z-10` span so it stays readable above the rim light.
 */
export function ShimmerButton(props: ShimmerButtonProps) {
  const { rootProps, children } = useShimmerButton(props)

  return (
    <button {...rootProps}>
      <span className="relative z-10">{children}</span>
      <span className="shimmer" aria-hidden="true" />
    </button>
  )
}

import { useState } from 'react'
import { resolveMotionTier, type MotionTier } from './motionTier'

/**
 * useMotionTier — the tier, resolved synchronously in the state initializer so there's no
 * flash of the full-motion version before a reduced-motion/low-end user gets downgraded.
 */
export function useMotionTier(): MotionTier {
  const [tier] = useState<MotionTier>(resolveMotionTier)
  return tier
}

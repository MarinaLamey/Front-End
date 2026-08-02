import { cn } from '@/shared/lib/cn'
import { kindOf, type Milestone, type MilestoneKind } from '../paymentRules'

/** Categorical colours for the payment segments — shared by the bar, legend and row badges. */
export const SEGMENT_CLASS: Record<MilestoneKind, string> = {
  advance: 'bg-brand-primary',
  delivery: 'bg-teal-500',
  installation: 'bg-blue-500',
  retention: 'bg-amber-500',
}

interface PaymentSplitBarProps {
  milestones: Milestone[]
  className?: string
}

/**
 * PaymentSplitBar — a stacked bar where each segment's width is its percentage of the whole.
 * Widths animate on the compositor (`width` transition) as percentages change; an under-100
 * schedule leaves the sunken track showing, an over-100 one clips (honest visual feedback).
 */
export function PaymentSplitBar({ milestones, className }: PaymentSplitBarProps) {
  return (
    <div
      className={cn(
        'flex h-2 w-full overflow-hidden rounded-full bg-bg-surface-sunken',
        className,
      )}
    >
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          style={{ width: `${milestone.percent}%` }}
          className={cn(
            'h-full transition-[width] duration-300 ease-out motion-reduce:transition-none',
            SEGMENT_CLASS[kindOf(milestone.trigger)],
          )}
        />
      ))}
    </div>
  )
}

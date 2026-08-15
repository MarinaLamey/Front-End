import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'

type Tone = 'danger' | 'warning'

/**
 * A required free-text field (e.g. a cancellation reason). When present, the dialog renders a
 * character-counted textarea and blocks Confirm until the trimmed length is within [min, max].
 */
interface ReasonField {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  min: number
  max: number
}

interface RfqActionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  title: string
  /** Right-aligned pill in the header (e.g. "7 bids at risk" or the RFQ reference). */
  badge?: { text: string; tone: 'danger' | 'neutral' }
  body: string
  callout: { heading: string; tone: Tone; bullets: string[] }
  /** Optional required reason captured before the action can proceed. */
  reason?: ReasonField
  confirmLabel: string
  /** Confirm button colour — destructive (Amend/Cancel) vs brand (Close). */
  confirmTone: 'danger' | 'primary'
  cancelLabel: string
}

const CALLOUT_BG: Record<Tone, string> = {
  danger: 'bg-status-danger-subtle',
  warning: 'bg-status-warning-subtle',
}
const CALLOUT_FG: Record<Tone, string> = {
  danger: 'text-status-danger',
  warning: 'text-status-warning-strong',
}
const DOT: Record<Tone, string> = {
  danger: 'bg-status-danger',
  warning: 'bg-status-warning-strong',
}

/** The confirm modal shared by the Amend / Close / Cancel RFQ actions. */
export function RfqActionDialog({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  badge,
  body,
  callout,
  reason,
  confirmLabel,
  confirmTone,
  cancelLabel,
}: RfqActionDialogProps) {
  const { t } = useTranslation()
  const reasonLength = reason ? reason.value.trim().length : 0
  const reasonInvalid = !!reason && (reasonLength < reason.min || reasonLength > reason.max)
  return (
    <Modal open={open} onClose={onClose} labelledBy="rfq-action-dialog-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="rfq-action-dialog-title" className="text-lg font-bold text-content-primary">
          {title}
        </h2>
        {badge && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
              badge.tone === 'danger'
                ? 'bg-status-danger-subtle text-status-danger'
                : 'bg-bg-surface-sunken text-content-secondary',
            )}
          >
            {badge.text}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-content-secondary">{body}</p>

      <div className={cn('mt-4 rounded-xl p-4', CALLOUT_BG[callout.tone])}>
        <p className={cn('text-sm font-semibold', CALLOUT_FG[callout.tone])}>{callout.heading}</p>
        <ul className="mt-2 space-y-1.5">
          {callout.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-content-secondary">
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', DOT[callout.tone])} />
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      {reason && (
        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-content-secondary">{reason.label}</label>
          <Textarea
            rows={3}
            value={reason.value}
            onChange={(e) => reason.onChange(e.target.value)}
            placeholder={reason.placeholder}
            maxLength={reason.max}
            aria-invalid={reasonInvalid}
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={cn(
                reasonLength > 0 && reasonLength < reason.min
                  ? 'text-status-danger'
                  : 'text-content-tertiary',
              )}
            >
              {t('common.minChars', { min: reason.min })}
            </span>
            <span className="tabular-nums text-content-tertiary">
              {reasonLength}/{reason.max}
            </span>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button
          variant={confirmTone === 'danger' ? 'danger' : 'primary'}
          fullWidth
          isLoading={loading}
          disabled={reasonInvalid}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  )
}

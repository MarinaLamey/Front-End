import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/Input'
import { Textarea } from '@/shared/ui/Textarea'
import { RfqCard, RfqField } from './RfqCard'
import { PlusIcon, TrashIcon } from './icons'
import type { Deliverable } from '../../types'

interface ScopeDeliverablesProps {
  scopeOfWork: string
  deliverables: Deliverable[]
  timeline: string
  onScopeChange: (value: string) => void
  onDeliverablesChange: (deliverables: Deliverable[]) => void
  onTimelineChange: (value: string) => void
}

function newDeliverable(): Deliverable {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d_${Date.now()}`
  return { id, text: '' }
}

/** Scope & deliverables — shown on step 1 only when sourcing is Service or Both. */
export function ScopeDeliverables({
  scopeOfWork,
  deliverables,
  timeline,
  onScopeChange,
  onDeliverablesChange,
  onTimelineChange,
}: ScopeDeliverablesProps) {
  const { t } = useTranslation()

  const patch = (id: string, text: string) =>
    onDeliverablesChange(deliverables.map((d) => (d.id === id ? { ...d, text } : d)))
  const remove = (id: string) => onDeliverablesChange(deliverables.filter((d) => d.id !== id))
  const add = () => onDeliverablesChange([...deliverables, newDeliverable()])

  return (
    <RfqCard title={t('rfq.create.scope.title')}>
      <div className="flex flex-col gap-4">
        <RfqField label={t('rfq.create.scope.scopeOfWork')}>
          <Textarea
            rows={4}
            placeholder={t('rfq.create.scope.scopePlaceholder')}
            value={scopeOfWork}
            onChange={(e) => onScopeChange(e.target.value)}
          />
        </RfqField>

        <RfqField label={t('rfq.create.scope.deliverables')}>
          <div className="flex flex-col gap-2">
            {deliverables.map((deliverable) => (
              <div key={deliverable.id} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  aria-label={t('rfq.create.scope.deliverables')}
                  placeholder={t('rfq.create.scope.deliverablePlaceholder')}
                  value={deliverable.text}
                  onChange={(e) => patch(deliverable.id, e.target.value)}
                />
                <button
                  type="button"
                  aria-label={t('rfq.create.lineItems.remove')}
                  onClick={() => remove(deliverable.id)}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-status-danger-subtle hover:text-status-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={add}
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
            >
              <PlusIcon className="h-4 w-4" />
              {t('rfq.create.scope.addDeliverable')}
            </button>
          </div>
        </RfqField>

        <RfqField label={t('rfq.create.scope.timeline')}>
          <Input
            placeholder={t('rfq.create.scope.timelinePlaceholder')}
            value={timeline}
            onChange={(e) => onTimelineChange(e.target.value)}
          />
        </RfqField>
      </div>
    </RfqCard>
  )
}

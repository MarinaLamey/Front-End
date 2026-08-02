import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/Input'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { cn } from '@/shared/lib/cn'
import type { LineInputMethod, LineItem } from '../../types'
import { ExcelImport } from './ExcelImport'
import { PlusIcon, TrashIcon } from './icons'

interface LineItemsEditorProps {
  items: LineItem[]
  method: LineInputMethod
  onItemsChange: (items: LineItem[]) => void
  onMethodChange: (method: LineInputMethod) => void
}

function newItem(): LineItem {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `li_${Date.now()}`
  return { id, name: '', specification: '', quantity: 0, unit: '' }
}

const GRID = 'grid grid-cols-[1.6fr_1.6fr_96px_128px_40px] gap-3'

/**
 * LineItemsEditor — the "Bundled RFQ" line-items card. Manual entry is an editable table
 * (item, specification, quantity, unit); Excel/link are alternative entry methods.
 */
export function LineItemsEditor({ items, method, onItemsChange, onMethodChange }: LineItemsEditorProps) {
  const { t } = useTranslation()
  const units = t('rfq.create.lineItems.units', { returnObjects: true }) as string[]
  // Link is an alternative entry path; the persisted truth is the `items` array, so its transient
  // input lives here rather than in the draft.
  const [linkUrl, setLinkUrl] = useState('')

  const patchItem = (id: string, partial: Partial<LineItem>) =>
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...partial } : item)))
  const removeItem = (id: string) => onItemsChange(items.filter((item) => item.id !== id))
  const addItem = () => onItemsChange([...items, newItem()])

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl<LineInputMethod>
        ariaLabel={t('rfq.create.lineItems.methodLabel')}
        value={method}
        onChange={onMethodChange}
        options={[
          { value: 'manual', label: t('rfq.create.lineItems.manual') },
          { value: 'excel', label: t('rfq.create.lineItems.excel') },
          { value: 'link', label: t('rfq.create.lineItems.link') },
        ]}
      />

      {method === 'manual' && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className={cn(GRID, 'items-center border-b border-border-subtle pb-2')}>
              <span className="text-xs font-medium text-content-tertiary">
                {t('rfq.create.lineItems.item')}
              </span>
              <span className="text-xs font-medium text-content-tertiary">
                {t('rfq.create.lineItems.specification')}
              </span>
              <span className="text-xs font-medium text-content-tertiary">
                {t('rfq.create.lineItems.qty')}
              </span>
              <span className="text-xs font-medium text-content-tertiary">
                {t('rfq.create.lineItems.unit')}
              </span>
              <span className="sr-only">{t('rfq.create.lineItems.remove')}</span>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-content-tertiary">
                {t('rfq.create.lineItems.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {items.map((item) => (
                  <li key={item.id} className={cn(GRID, 'items-end py-2')}>
                    <Input
                      aria-label={t('rfq.create.lineItems.item')}
                      placeholder={t('rfq.create.lineItems.itemPlaceholder')}
                      value={item.name}
                      onChange={(e) => patchItem(item.id, { name: e.target.value })}
                    />
                    <Input
                      aria-label={t('rfq.create.lineItems.specification')}
                      placeholder={t('rfq.create.lineItems.specPlaceholder')}
                      value={item.specification}
                      onChange={(e) => patchItem(item.id, { specification: e.target.value })}
                    />
                    <Input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      aria-label={t('rfq.create.lineItems.qty')}
                      value={item.quantity || ''}
                      onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) || 0 })}
                    />
                    <SearchSelect
                      label=""
                      searchable={false}
                      placeholder={t('rfq.create.lineItems.unitPlaceholder')}
                      value={item.unit}
                      options={units}
                      onChange={(unit) => patchItem(item.id, { unit })}
                    />
                    <button
                      type="button"
                      aria-label={t('rfq.create.lineItems.remove')}
                      onClick={() => removeItem(item.id)}
                      className="flex h-10 w-9 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-status-danger-subtle hover:text-status-danger"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={addItem}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
            >
              <PlusIcon className="h-4 w-4" />
              {t('rfq.create.lineItems.addItem')}
            </button>
          </div>
        </div>
      )}

      {method === 'excel' && (
        <ExcelImport
          onImport={(imported) => {
            onItemsChange([...items, ...imported])
            onMethodChange('manual')
          }}
        />
      )}

      {method === 'link' && (
        <Input
          type="url"
          inputMode="url"
          placeholder={t('rfq.create.lineItems.linkPlaceholder')}
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
      )}

      {/* Footer: item count. */}
      <div className="flex items-center border-t border-border-subtle pt-3">
        <span className="text-sm text-content-secondary">
          {t('rfq.create.lineItems.count', { count: items.length })}
        </span>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/Input'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import type { CategoryType, LineInputMethod, LineItem, RfqCategory } from '../../types'
import { ExcelImport } from './ExcelImport'
import { PlusIcon, TrashIcon } from './icons'

interface LineItemsEditorProps {
  /** The selected categories — one line-item group is rendered per category, in order. */
  categories: RfqCategory[]
  items: LineItem[]
  method: LineInputMethod
  /** The RFQ's estimated budget in SAR, echoed in the footer. `0` = none entered. */
  budget: number
  onItemsChange: (items: LineItem[]) => void
  onMethodChange: (method: LineInputMethod) => void
}

function newItem(categoryName: string): LineItem {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `li_${Date.now()}`
  return { id, categoryName, name: '', specification: '', quantity: 0, unit: '' }
}

const GRID = 'grid grid-cols-[1.6fr_1.4fr_88px_88px_88px_120px_40px] gap-3'

/** An empty bound is "unbounded", not zero — `undefined` keeps the field off the record entirely. */
const toBound = (raw: string): number | undefined => {
  const n = Number(raw)
  return raw.trim() === '' || Number.isNaN(n) || n <= 0 ? undefined : n
}

/** Max below min is the one combination that can never be satisfied, so the field flags itself. */
const rangeInverted = (item: LineItem): boolean =>
  item.minQuantity !== undefined && item.maxQuantity !== undefined && item.maxQuantity < item.minQuantity

/**
 * LineItemsEditor — the "Bundled RFQ" line-items card. Manual entry is a table PER category
 * group whose columns follow the category's type: goods → Item / Specification / Qty / Unit;
 * service → Deliverable / Scope / Duration / Basis. One flat `items` array backs every group
 * (each item tagged with its `categoryName`); Excel/link are alternative entry methods.
 */
export function LineItemsEditor({
  categories,
  items,
  method,
  budget,
  onItemsChange,
  onMethodChange,
}: LineItemsEditorProps) {
  const { t, i18n } = useTranslation()
  const units = t('rfq.create.lineItems.units', { returnObjects: true }) as string[]
  const bases = t('rfq.create.lineItems.bases', { returnObjects: true }) as string[]
  // Link is an alternative entry path; the persisted truth is the `items` array, so its transient
  // input lives here rather than in the draft.
  const [linkUrl, setLinkUrl] = useState('')

  const patchItem = (id: string, partial: Partial<LineItem>) =>
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...partial } : item)))
  const removeItem = (id: string) => onItemsChange(items.filter((item) => item.id !== id))
  const addItem = (categoryName: string) => onItemsChange([...items, newItem(categoryName)])

  /** Column labels + the unit/basis option list, per category schema. */
  const schema = (type: CategoryType) =>
    type === 'service'
      ? {
          col1: t('rfq.create.lineItems.deliverable'),
          col2: t('rfq.create.lineItems.scope'),
          col3: t('rfq.create.lineItems.duration'),
          col4: t('rfq.create.lineItems.basis'),
          namePlaceholder: t('rfq.create.lineItems.deliverablePlaceholder'),
          specPlaceholder: t('rfq.create.lineItems.scopePlaceholder'),
          unitPlaceholder: t('rfq.create.lineItems.basisPlaceholder'),
          options: bases,
        }
      : {
          col1: t('rfq.create.lineItems.item'),
          col2: t('rfq.create.lineItems.specification'),
          col3: t('rfq.create.lineItems.qty'),
          col4: t('rfq.create.lineItems.unit'),
          namePlaceholder: t('rfq.create.lineItems.itemPlaceholder'),
          specPlaceholder: t('rfq.create.lineItems.specPlaceholder'),
          unitPlaceholder: t('rfq.create.lineItems.unitPlaceholder'),
          options: units,
        }

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

      {method === 'manual' &&
        (categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-content-tertiary">
            {t('rfq.create.lineItems.pickCategory')}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {categories.map((category) => {
              const groupItems = items.filter((item) => item.categoryName === category.name)
              const s = schema(category.type)
              return (
                <div key={category.name} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-content-primary">{category.name}</span>
                    <span className="text-xs text-content-tertiary">
                      · {t(`rfq.create.lineItems.type.${category.type}`)} ·{' '}
                      {t('rfq.create.lineItems.count', { count: groupItems.length })}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <div className={cn(GRID, 'items-center border-b border-border-subtle pb-2')}>
                        <span className="text-xs font-medium text-content-tertiary">{s.col1}</span>
                        <span className="text-xs font-medium text-content-tertiary">{s.col2}</span>
                        <span className="text-xs font-medium text-content-tertiary">{s.col3}</span>
                        {/* The accepted range for THIS line. Both optional — an empty pair means the
                            supplier may offer any quantity, which is how the RFQ behaved before. */}
                        <span className="text-xs font-medium text-content-tertiary">{t('rfq.create.lineItems.minQty')}</span>
                        <span className="text-xs font-medium text-content-tertiary">{t('rfq.create.lineItems.maxQty')}</span>
                        <span className="text-xs font-medium text-content-tertiary">{s.col4}</span>
                        <span className="sr-only">{t('rfq.create.lineItems.remove')}</span>
                      </div>

                      {groupItems.length === 0 ? (
                        <p className="py-4 text-center text-sm text-content-tertiary">
                          {t('rfq.create.lineItems.empty')}
                        </p>
                      ) : (
                        <ul className="divide-y divide-border-subtle">
                          {groupItems.map((item) => (
                            <li key={item.id} className={cn(GRID, 'items-end py-2')}>
                              <Input
                                aria-label={s.col1}
                                placeholder={s.namePlaceholder}
                                value={item.name}
                                onChange={(e) => patchItem(item.id, { name: e.target.value })}
                              />
                              <Input
                                aria-label={s.col2}
                                placeholder={s.specPlaceholder}
                                value={item.specification}
                                onChange={(e) => patchItem(item.id, { specification: e.target.value })}
                              />
                              <Input
                                type="number"
                                min={0}
                                inputMode="decimal"
                                aria-label={s.col3}
                                value={item.quantity || ''}
                                onChange={(e) =>
                                  patchItem(item.id, { quantity: Number(e.target.value) || 0 })
                                }
                              />
                              <Input
                                type="number"
                                min={0}
                                inputMode="decimal"
                                aria-label={t('rfq.create.lineItems.minQty')}
                                placeholder={t('rfq.create.lineItems.anyQty')}
                                value={item.minQuantity ?? ''}
                                onChange={(e) => patchItem(item.id, { minQuantity: toBound(e.target.value) })}
                              />
                              <Input
                                type="number"
                                min={0}
                                inputMode="decimal"
                                aria-label={t('rfq.create.lineItems.maxQty')}
                                placeholder={t('rfq.create.lineItems.anyQty')}
                                value={item.maxQuantity ?? ''}
                                error={rangeInverted(item) ? { title: t('rfq.create.lineItems.rangeInverted') } : null}
                                onChange={(e) => patchItem(item.id, { maxQuantity: toBound(e.target.value) })}
                              />
                              <SearchSelect
                                label=""
                                searchable={false}
                                placeholder={s.unitPlaceholder}
                                value={item.unit}
                                options={s.options}
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
                        onClick={() => addItem(category.name)}
                        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
                      >
                        <PlusIcon className="h-4 w-4" />
                        {t('rfq.create.lineItems.addItem')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

      {method === 'excel' && (
        <ExcelImport
          categories={categories}
          onImport={(imported) => {
            // Rows already carry their validated, selected-category assignment from the template.
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

      {/* Footer: total item count across all groups, and the budget those items are priced against
          — labelled private, because suppliers never see it. */}
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <span className="text-sm text-content-secondary">
          {t('rfq.create.lineItems.count', { count: items.length })}
        </span>
        {budget > 0 && (
          <span className="text-sm text-content-tertiary">
            {t('rfq.create.lineItems.budgetPrivate', {
              amount: formatSar(toHalalas(budget), { locale: i18n.language }),
            })}
          </span>
        )}
      </div>
    </div>
  )
}

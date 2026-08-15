import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { downloadTemplate, parseLineItemsFile, toLineItems, type ParseResult, type ParsedRow } from '../lib/excel'
import type { LineItem, RfqCategory } from '../../types'
import { AlertIcon, CheckIcon, DownloadIcon, UploadIcon } from './icons'

interface ExcelImportProps {
  /** The RFQ's selected categories — seed the template and validate each row's Category cell. */
  categories: RfqCategory[]
  onImport: (items: LineItem[]) => void
}

/** Per-row status glyph for the preview. */
function StatusMark({ status }: { status: ParsedRow['status'] }) {
  if (status === 'ok') return <CheckIcon className="h-4 w-4 text-status-success" />
  if (status === 'warning') return <AlertIcon className="h-4 w-4 text-status-warning-strong" />
  return <AlertIcon className="h-4 w-4 text-status-danger" />
}

/**
 * ExcelImport — the Upload-Excel flow: download the template, drop the filled file, then preview
 * the parsed rows (each validated, units normalised) before adding the addable ones to the form.
 * SheetJS loads lazily inside the parser, so nothing here bloats the initial bundle.
 */
export function ExcelImport({ categories, onImport }: ExcelImportProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'idle' | 'parsing' | 'done'>('idle')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setPhase('parsing')
    setResult(await parseLineItemsFile(file, categories))
    setPhase('done')
  }

  const reset = () => {
    setPhase('idle')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const add = () => {
    if (!result) return
    onImport(toLineItems(result.addable))
    reset()
  }

  const download = async () => {
    setDownloading(true)
    try {
      await downloadTemplate(categories)
    } finally {
      setDownloading(false)
    }
  }

  const missingColumns = (result?.errorDetail ?? '')
    .split(',')
    .filter(Boolean)
    .map((key) => t(`rfq.create.excel.columns.${key}`))
    .join(', ')

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        isLoading={downloading}
        leftIcon={<DownloadIcon className="h-4 w-4" />}
        onClick={download}
      >
        {t('rfq.create.excel.downloadTemplate')}
      </Button>

      {phase !== 'done' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex min-h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
            dragOver ? 'border-brand-primary bg-brand-subtle' : 'border-border-default hover:border-brand-primary',
          )}
        >
          {phase === 'parsing' ? (
            <>
              <Spinner />
              <span className="mt-1 text-sm text-content-secondary">{t('rfq.create.excel.reading')}</span>
            </>
          ) : (
            <>
              <UploadIcon className="h-6 w-6 text-content-tertiary" />
              <span className="text-sm font-semibold text-content-primary">
                {t('rfq.create.excel.dropPrompt')}
              </span>
              <span className="text-xs text-content-tertiary">{t('rfq.create.excel.dropHint')}</span>
            </>
          )}
        </button>
      )}

      {/* File-level error. */}
      {phase === 'done' && result?.errorKey && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-status-danger/30 bg-status-danger-subtle p-4">
          <div className="flex items-center gap-2 text-status-danger">
            <AlertIcon className="h-4 w-4" />
            <p className="text-sm font-medium">
              {t(`rfq.create.excel.errors.${result.errorKey}`, { columns: missingColumns })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            {t('rfq.create.excel.chooseAnother')}
          </Button>
        </div>
      )}

      {/* Parsed preview. */}
      {phase === 'done' && result && !result.errorKey && (
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-content-primary">{t('rfq.create.excel.previewTitle')}</p>
            <p className="text-sm text-content-secondary">
              <span className="font-medium text-status-success-strong">
                {t('rfq.create.excel.ready', { count: result.readyCount })}
              </span>
              {result.attentionCount > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-status-warning-strong">
                    {t('rfq.create.excel.attention', { count: result.attentionCount })}
                  </span>
                </>
              )}
            </p>
          </div>

          <ul className="max-h-64 divide-y divide-border-subtle overflow-auto">
            {result.rows.map((row) => (
              <li key={row.row} className="flex items-start gap-3 py-2">
                <span className="mt-0.5 shrink-0">
                  <StatusMark status={row.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {row.category && (
                        <span className="shrink-0 rounded bg-bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-content-tertiary">
                          {row.category}
                        </span>
                      )}
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          row.status === 'error' ? 'text-content-tertiary' : 'text-content-primary',
                        )}
                      >
                        {row.name || t('rfq.create.excel.unnamed')}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-content-secondary">
                      {row.quantity ?? '—'} {row.unit}
                    </span>
                  </div>
                  {row.specification && (
                    <p className="truncate text-xs text-content-tertiary">{row.specification}</p>
                  )}
                  {row.issues.length > 0 && (
                    <p
                      className={cn(
                        'mt-0.5 text-xs',
                        row.status === 'error' ? 'text-status-danger' : 'text-status-warning-strong',
                      )}
                    >
                      {row.issues.map((issue) => t(`rfq.create.excel.issues.${issue}`)).join(' · ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Button size="sm" disabled={result.readyCount === 0} onClick={add}>
              {t('rfq.create.excel.addItems', { count: result.readyCount })}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              {t('rfq.create.excel.chooseAnother')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

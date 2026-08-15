import { useTranslation } from 'react-i18next'
import { Select } from '@/shared/ui/Select'
import { cn } from '@/shared/lib/cn'

interface PaginationProps {
  /** 1-based current page. */
  page: number
  pageSize: number
  /** Total number of rows across every page. */
  total: number
  /** Selectable page sizes; the first is the default. */
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 5l-5 5 5 5"
        stroke="currentColor"
        strokeWidth={1.667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Compute the windowed page list: always the first and last page, the current page and its
 * neighbours, with `'gap'` markers standing in for the elided ranges. Keeps the control a fixed
 * width no matter how many pages exist (1 … 4 5 6 … 20).
 */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const window = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const pages = [...window].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  let prev = 0
  for (const p of pages) {
    if (p - prev > 1) out.push('gap')
    out.push(p)
    prev = p
  }
  return out
}

/**
 * Pagination — a polished, RTL-safe pager: a "Showing X–Y of Z" readout with a rows-per-page
 * selector on one side, windowed page buttons with prev/next on the other. Motion is limited to
 * colour/opacity transitions (GPU-friendly, zero layout shift); the active page is a solid brand
 * chip. Purely presentational — the parent owns page/size state (typically the URL).
 */
export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages)
    if (clamped !== current) onPageChange(clamped)
  }

  const pageBtn =
    'flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 text-sm',
        className,
      )}
    >
      {/* Readout + rows-per-page */}
      <div className="flex items-center gap-3 text-content-secondary">
        <span className="tabular-nums">{t('common.pagination.showing', { from, to, total })}</span>
        <span className="flex items-center gap-2">
          <span className="text-content-tertiary">{t('common.pagination.rows')}</span>
          <Select
            size="sm"
            ariaLabel={t('common.pagination.rows')}
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
            className="w-[76px]"
          />
        </span>
      </div>

      {/* Page controls */}
      <nav className="flex items-center gap-1" aria-label={t('common.pagination.label')}>
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current <= 1}
          aria-label={t('common.pagination.prev')}
          className={cn(
            pageBtn,
            'text-content-secondary hover:bg-bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          )}
        >
          <ArrowIcon className="h-4 w-4 rtl:-scale-x-100" />
        </button>

        {pageWindow(current, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="flex h-8 w-8 items-center justify-center text-content-tertiary">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              aria-current={item === current ? 'page' : undefined}
              className={cn(
                pageBtn,
                'tabular-nums',
                item === current
                  ? 'bg-brand-primary text-brand-primary-on'
                  : 'text-content-secondary hover:bg-bg-surface-sunken',
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current >= totalPages}
          aria-label={t('common.pagination.next')}
          className={cn(
            pageBtn,
            'text-content-secondary hover:bg-bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          )}
        >
          <ArrowIcon className="h-4 w-4 rotate-180 rtl:-scale-x-100" />
        </button>
      </nav>
    </div>
  )
}

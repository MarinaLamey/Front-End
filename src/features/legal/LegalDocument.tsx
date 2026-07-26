import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/shared/ui/BrandLogo'

/** A titled document section: numbered heading + its body (paragraphs / bullet lists). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-content-primary">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-6 text-content-secondary">{children}</div>
    </section>
  )
}

/** Bulleted list from an array of nodes. */
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-5 marker:text-content-tertiary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

interface LegalPageProps {
  title: string
  /** Rendered after "Last Updated: ". */
  updated: string
  /** Optional notice under the date (e.g. a temporary-document disclaimer). */
  note?: ReactNode
  children: ReactNode
}

/**
 * LegalPage — the shell shared by the public policy documents (Privacy, Terms): its own
 * header with the logo + back link, the title/date, and the stacked {@link Section} body.
 *
 * dir="ltr": these documents are English-only, so they must read left-to-right even when the
 * app is in Arabic (otherwise the text inherits RTL and the punctuation/numbering flips).
 * Opened in a new tab from the register agree-terms links, so a user mid-wizard keeps progress.
 */
export function LegalPage({ title, updated, note, children }: LegalPageProps) {
  return (
    <div dir="ltr" className="min-h-screen bg-bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="mimony home">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-medium text-content-link hover:text-content-link-hover">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-content-primary">{title}</h1>
        <p className="mt-2 text-sm text-content-tertiary">Last Updated: {updated}</p>
        {note && <p className="mt-2 text-sm text-content-tertiary">{note}</p>}

        <div className="mt-8 flex flex-col gap-8">{children}</div>
      </main>
    </div>
  )
}

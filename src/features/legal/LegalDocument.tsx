import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import type { Locale } from '@/platform/i18n'
import type { Block, Inline, LegalDoc } from './content'

/** The locale the documents are written in — `i18n.language` can carry a region suffix. */
export function useDocLocale(): Locale {
  const { i18n } = useTranslation()
  return i18n.language.startsWith('ar') ? 'ar' : 'en'
}

/** A mailto/website link styled like the rest of the document body. */
function DocLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="font-medium text-content-link hover:text-content-link-hover"
    >
      {children}
    </a>
  )
}

/** One run of body copy: plain text, a bold lead-in, or a link. */
function Runs({ runs }: { runs: Inline[] }) {
  return (
    <>
      {runs.map((run, i) => {
        if (typeof run === 'string') return run
        if ('bold' in run) {
          return (
            <span key={i} className="font-medium text-content-primary">
              {run.bold}
            </span>
          )
        }
        return (
          <DocLink key={i} href={run.href}>
            {run.link}
          </DocLink>
        )
      })}
    </>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) =>
        'p' in block ? (
          <p key={i}>
            <Runs runs={block.p} />
          </p>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-2 ps-5 marker:text-content-tertiary">
            {block.list.map((item, j) => (
              <li key={j}>
                <Runs runs={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  )
}

/**
 * LegalPage — the shell shared by the public policy documents (Privacy, Terms): its own header with
 * the logo + back link, the title/date, and the stacked sections.
 *
 * The whole page follows the ACTIVE LANGUAGE, `dir` included. It used to force `dir="ltr"` because
 * the documents were English-only, so Arabic direction would have flipped their punctuation and
 * numbering; now that both translations exist, an Arabic reader gets an Arabic document laid out
 * right-to-left, and forcing LTR would be the bug.
 *
 * Opened in a new tab from the register agree-terms links, so a user mid-wizard keeps progress —
 * the locale is persisted in localStorage, so the new tab opens in the language they chose.
 */
export function LegalPage({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="mimony home">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-content-link hover:text-content-link-hover"
          >
            {/* The arrow points back the way the text runs, so it mirrors with the layout. */}
            <span aria-hidden="true" className="rtl:rotate-180">
              ←
            </span>
            {doc.backToHome}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-content-primary">{doc.title}</h1>
        <p className="mt-2 text-sm text-content-tertiary">
          {doc.updatedLabel}: {doc.updated}
        </p>
        {doc.note && <p className="mt-2 text-sm text-content-tertiary">{doc.note}</p>}

        <div className="mt-8 flex flex-col gap-8">
          {doc.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-content-primary">{section.title}</h2>
              <div className="flex flex-col gap-2 text-sm leading-6 text-content-secondary">
                <Blocks blocks={section.blocks} />
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

import { LegalPage, useDocLocale } from './LegalDocument'
import { TERMS } from './content'

/**
 * TermsPage — the MI-Mony Terms of Use and Conditions, rendered in-app at `/terms`.
 *
 * A standalone public document (see {@link LegalPage}); opened in a new tab from the register
 * agree-terms link so a user in the wizard never loses their progress. The Arabic and English texts
 * live in `./content/terms`; this picks the one matching the language the reader chose.
 */
export function TermsPage() {
  const locale = useDocLocale()
  return <LegalPage doc={TERMS[locale]} locale={locale} />
}

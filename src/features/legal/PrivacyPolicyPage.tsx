import { LegalPage, useDocLocale } from './LegalDocument'
import { PRIVACY } from './content'

/**
 * PrivacyPolicyPage — the MI Technology privacy policy, rendered in-app at `/privacy`.
 *
 * A standalone public document (see {@link LegalPage}); opened in a new tab from the register
 * agree-terms link so a user in the wizard never loses their progress. The Arabic and English texts
 * live in `./content/privacy`; this picks the one matching the language the reader chose.
 */
export function PrivacyPolicyPage() {
  const locale = useDocLocale()
  return <LegalPage doc={PRIVACY[locale]} locale={locale} />
}

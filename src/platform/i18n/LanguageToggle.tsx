import { useTranslation } from 'react-i18next'
import { setLocale, type Locale } from './i18n'

/** Toggles between English and Arabic. The label shows the language you'd switch TO. */
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const next: Locale = i18n.language === 'ar' ? 'en' : 'ar'
  const label = next === 'ar' ? 'العربية' : 'English'

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className="text-sm font-medium text-content-link hover:text-content-link-hover"
    >
      {label}
    </button>
  )
}

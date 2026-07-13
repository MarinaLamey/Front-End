import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { ar } from './locales/ar'

export const SUPPORTED_LOCALES = ['en', 'ar'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

const STORAGE_KEY = 'miproc.locale'

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ar'
}

/** Resolve the initial locale: stored choice, else Arabic (KSA default). */
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return 'ar'
}

/** Keep <html dir/lang> in sync with the active locale (mirrors the inline head script). */
export function applyDirection(locale: Locale): void {
  const root = document.documentElement
  root.setAttribute('lang', locale)
  root.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
}

/** Switch locale: persist, update i18next, and flip direction. */
export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* storage unavailable */
  }
  void i18n.changeLanguage(locale)
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
})

i18n.on('languageChanged', (lng) => {
  if (isLocale(lng)) applyDirection(lng)
})
applyDirection(i18n.language as Locale)

export default i18n

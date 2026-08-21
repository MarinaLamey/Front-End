import type { Locale } from '@/platform/i18n'
import type { LegalDoc } from './types'
import { PRIVACY_AR, PRIVACY_EN } from './privacy'
import { TERMS_AR, TERMS_EN } from './terms'

export type { Block, Inline, LegalDoc, LegalSection } from './types'

/**
 * Pick a document for the active locale.
 *
 * Keyed by `Locale`, so adding a third language is a compile error here until its translation
 * exists — a legal page silently falling back to English is the failure worth preventing.
 */
export const TERMS: Record<Locale, LegalDoc> = { en: TERMS_EN, ar: TERMS_AR }
export const PRIVACY: Record<Locale, LegalDoc> = { en: PRIVACY_EN, ar: PRIVACY_AR }

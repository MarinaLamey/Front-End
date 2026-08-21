/* ────────────────────────────────────────────────────────────────────────────
 * The shape of a legal document.
 *
 * These pages are DOCUMENTS, not UI, so their text lives here beside the feature rather than in
 * `platform/i18n/locales`: a policy is hundreds of lines of prose that no screen shares, and burying
 * it in the locale files would make the app's string table mostly legal boilerplate. Both languages
 * are still declared side by side, which is what the bilingual rule is actually protecting — nothing
 * is hardcoded in one language, and a missing translation is a missing export, caught by the
 * compiler rather than by a user.
 *
 * The model is deliberately small: a document is sections, a section is paragraphs and lists, and a
 * paragraph is a run of text with the occasional bold lead-in or link. Anything richer would be a
 * markdown renderer, which these two documents do not need.
 * ──────────────────────────────────────────────────────────────────────────── */

/** One run inside a paragraph or list item. A bare string is plain text. */
export type Inline =
  | string
  /** A bold lead-in, e.g. the defined term in "**Platform / MI-Mony:** Refers to…". */
  | { bold: string }
  /** A mailto: or external link. */
  | { link: string; href: string }

/** A block of body copy: one paragraph, or one bulleted list. */
export type Block = { p: Inline[] } | { list: Inline[][] }

export interface LegalSection {
  /** Includes its own number ("1. Definitions") — Arabic and English number identically here. */
  title: string
  blocks: Block[]
}

export interface LegalDoc {
  title: string
  /** Already formatted for the language; not a date to run through Intl. */
  updated: string
  /** Label before {@link updated}, e.g. "Last Updated". */
  updatedLabel: string
  /** The header's return link. */
  backToHome: string
  /** Optional notice under the date (the temporary-document disclaimer on Terms). */
  note?: string
  sections: LegalSection[]
}

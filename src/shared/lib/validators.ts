// Names (full name, city / district / street): a letter of any script (incl. Arabic) followed
// by letters, spaces, or name punctuation (' . -). No digits or other symbols.
export const NAME_RE = /^\p{L}[\p{L}\s'.-]*$/u

/** True when a name field is non-empty and letters-only (validated on the trimmed value). */
export const isNameOnly = (value: string) => NAME_RE.test(value.trim())

// Saudi mobile entered after the +966 prefix: 9 digits starting with 5 (no leading 0).
export const MOBILE_RE = /^5\d{8}$/

/** Keep digits only; drop a pasted 966 country code and any leading 0; clamp to 9 digits. */
export const cleanMobile = (raw: string) =>
  raw.replace(/\D/g, '').replace(/^966/, '').replace(/^0+/, '').slice(0, 9)

/** True when a mobile is a valid Saudi number (9 digits starting with 5), ignoring spaces. */
export const isSaudiMobile = (value: string) => MOBILE_RE.test(value.replace(/\s/g, ''))

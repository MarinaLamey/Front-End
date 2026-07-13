// Names (full name, city / district / street): a letter of any script (incl. Arabic) followed
// by letters, spaces, or name punctuation (' . -). No digits or other symbols.
export const NAME_RE = /^\p{L}[\p{L}\s'.-]*$/u

/** True when a name field is non-empty and letters-only (validated on the trimmed value). */
export const isNameOnly = (value: string) => NAME_RE.test(value.trim())

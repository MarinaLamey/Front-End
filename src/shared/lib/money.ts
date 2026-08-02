/* ────────────────────────────────────────────────────────────────────────────
 * MONEY — exact SAR arithmetic.
 *
 * Every amount lives here as an integer number of *halalas* (1 SAR = 100 halalas),
 * so all math is integer math and IEEE-754 drift (the `0.1 + 0.2` problem) never
 * enters the money path. Values stay far inside Number.MAX_SAFE_INTEGER (~9×10¹⁵):
 * SAR 500,000 is 50,000,000 halalas.
 *
 * Percentage splits use the largest-remainder method so the parts sum EXACTLY to
 * the total — no leftover halala, no off-by-0.01 in the milestone rows.
 *
 * If requirements ever grow (fractional percentages across many parts, VAT chains,
 * multi-currency), swap the internals for a decimal library behind this same API —
 * consumers only ever see `Halalas` and the helpers below.
 * ──────────────────────────────────────────────────────────────────────────── */

/** A money amount in SAR minor units (halalas). Always an integer. */
export type Halalas = number

const HALALAS_PER_SAR = 100

/** SAR (major units, possibly fractional) → integer halalas, rounded to the nearest halala. */
export function toHalalas(sar: number): Halalas {
  return Math.round(sar * HALALAS_PER_SAR)
}

/** Integer halalas → SAR (major units) as a Number — for display/formatting only. */
export function toSar(halalas: Halalas): number {
  return halalas / HALALAS_PER_SAR
}

/** `qty × unitPrice` as exact halalas (unit price given in halalas). */
export function lineTotal(quantity: number, unitPriceHalalas: Halalas): Halalas {
  return Math.round(quantity * unitPriceHalalas)
}

/** Sum a list of halala amounts. */
export function sum(amounts: Halalas[]): Halalas {
  return amounts.reduce((total, amount) => total + amount, 0)
}

/**
 * A single percentage of a total, rounded to the nearest halala. Used for the per-row
 * `= SAR …` display while a schedule is being edited (including invalid, mid-edit states).
 * `total × percent` is an exact integer before the divide, so only the final rounding matters.
 */
export function percentOf(totalHalalas: Halalas, percent: number): Halalas {
  return Math.round((totalHalalas * percent) / 100)
}

/**
 * Split `totalHalalas` across parts by whole-number percentages, using the largest-remainder
 * method so the returned parts sum EXACTLY to the total whenever the percentages sum to 100.
 * (When they don't — an invalid schedule mid-edit — each part is simply its rounded share;
 * validation, not this function, is what blocks the user.)
 */
export function splitByPercent(totalHalalas: Halalas, percents: number[]): Halalas[] {
  if (percents.length === 0) return []

  const totalPercent = percents.reduce((a, p) => a + p, 0)
  // Invalid schedule: independent rounded shares are good enough for display.
  if (totalPercent !== 100) return percents.map((p) => percentOf(totalHalalas, p))

  // `total × percent` is an exact integer; floor-divide by 100, then hand the leftover
  // halalas to the parts with the largest fractional remainders (largest-remainder method).
  const scaled = percents.map((p) => totalHalalas * p)
  const base = scaled.map((s) => Math.floor(s / 100))
  const remainder = scaled.map((s) => s - Math.floor(s / 100) * 100) // 0..99
  const allocated = base.reduce((a, b) => a + b, 0)
  const leftover = totalHalalas - allocated // integer in [0, parts) when percents sum to 100

  const byRemainderDesc = remainder
    .map((r, index) => ({ r, index }))
    .sort((a, b) => b.r - a.r || a.index - b.index)

  const result = base.slice()
  for (let k = 0; k < leftover; k++) {
    result[byRemainderDesc[k].index] += 1
  }
  return result
}

/**
 * Format halalas as a grouped SAR string, e.g. `SAR 500,000` (whole) or `SAR 500,000.50`.
 * Locale-aware for Arabic-Indic digits; pass the active i18n language. Set `symbol: false`
 * for a bare number (e.g. inside a cell that already shows the currency).
 */
export function formatSar(
  halalas: Halalas,
  { locale = 'en', symbol = true }: { locale?: string; symbol?: boolean } = {},
): string {
  const value = toSar(halalas)
  const hasFraction = halalas % HALALAS_PER_SAR !== 0
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)
  return symbol ? `SAR ${number}` : number
}

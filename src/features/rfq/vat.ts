/* ────────────────────────────────────────────────────────────────────────────
 * VAT — the one place the 15% rule lives.
 *
 * VAT IS INCLUSIVE. Every price a supplier types — unit price, line total, bid
 * total, counter-offer total — ALREADY carries the 15%. Nothing anywhere adds VAT
 * on top. The subtotal is derived by dividing back out of the entered figure, and
 * the VAT line is the difference:
 *
 *     total    = sum(qty × entered unit price)      ← what the supplier typed
 *     subtotal = total / 1.15
 *     vat      = total − subtotal
 *
 * This is one rule across the request, bidding, negotiation, comparison and the
 * purchase order, so a figure can never shift by 15% as it moves between screens.
 *
 * Direction changed 15 Aug 2026. The previous model had suppliers typing EX-VAT
 * prices with 15% added on top; `withVat` was applied at every seam. If you find a
 * `withVat(lineSum)` anywhere, it is a leftover from that model and is a defect —
 * the line sum is now the total already.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Saudi standard rate. */
export const VAT_RATE = 0.15

/** The VAT contained WITHIN a VAT-inclusive total, rounded to the halala. */
export function vatIn(totalSar: number): number {
  return Math.round((totalSar - exVat(totalSar)) * 100) / 100
}

/** VAT-inclusive total → the ex-VAT subtotal behind it. */
export function exVat(totalSar: number): number {
  return Math.round((totalSar / (1 + VAT_RATE)) * 100) / 100
}

/**
 * The three figures every pricing footer prints, from the VAT-INCLUSIVE sum of the
 * priced lines. `total` is returned unchanged — it is what the supplier entered —
 * so the footer can never disagree with the line totals above it.
 */
export function priceTotals(totalSar: number): { subtotal: number; vat: number; total: number } {
  const total = Math.round(totalSar * 100) / 100
  const subtotal = exVat(total)
  return { subtotal, vat: Math.round((total - subtotal) * 100) / 100, total }
}

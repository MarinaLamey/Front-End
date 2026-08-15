/* ────────────────────────────────────────────────────────────────────────────
 * Purchase-order PDF — builds a real `application/pdf` file for the PO document,
 * DEPENDENCY-FREE (hand-written PDF 1.7, the two built-in Helvetica faces, WinAnsi).
 * Layout mirrors the PO document in Figma: header, both parties, the agreed line
 * items, Subtotal / VAT 15% / Total, and the terms line.
 *
 * The document is English — Helvetica carries no Arabic glyphs, so a localized/Arabic
 * PO would need an embedded font (follow-up, not needed for the current release).
 * ──────────────────────────────────────────────────────────────────────────── */

import { isSupplierRevealed, orderTotals, supplierDisplayName } from './lib'
import type { Order } from './types'

/* Helvetica advance widths (per 1000 units/em) for the glyphs we right-align. Digits and separators
 * are identical in regular and bold, so numeric columns line up in either weight; only S/A/R (for the
 * "SAR" prefix) differ, handled below. Any other glyph falls back to 556, which is fine for the
 * left-aligned text that never needs measuring. */
const GLYPH_W: Record<string, number> = {
  ' ': 278, '.': 278, ',': 278, '/': 278, ':': 278, '-': 333, '%': 889,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  S: 667, A: 667, R: 722,
}
function widthOf(s: string, size: number, bold = false): number {
  let u = 0
  for (const ch of s) {
    let w = GLYPH_W[ch] ?? 556
    if (bold && (ch === 'S' || ch === 'A' || ch === 'R')) w = 722
    u += w
  }
  return (u * size) / 1000
}

/** Escape a PDF text string (WinAnsi): backslash-escape ( ) \, and drop anything outside Latin-1. */
function esc(s: string): string {
  return s.replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7E]/g, ' ')
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '.' : s
}

function wrap(s: string, maxChars: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of s.split(' ')) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) out.push(line)
      line = word
    } else {
      line = line ? line + ' ' + word : word
    }
  }
  if (line) out.push(line)
  return out
}

export function buildPurchaseOrderPdf(order: Order): Blob {
  const { subtotal, vat, total } = orderTotals(order)
  const money = (n: number) => 'SAR ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '-'
  const deliveryDate = order.shipment.expectedArrival ?? order.shipment.deliveredAt ?? order.issuedAt

  const BLACK = '0.09 0.10 0.13'
  const GRAY = '0.42 0.45 0.50'
  const RULE = '0.86 0.88 0.92'
  const BRAND = '0.31 0.27 0.90'

  const C: string[] = []
  const text = (x: number, y: number, s: string, o: { size?: number; bold?: boolean; color?: string } = {}) => {
    const size = o.size ?? 10
    C.push(`${o.color ?? BLACK} rg BT /${o.bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(s)}) Tj ET`)
  }
  const right = (xr: number, y: number, s: string, o: { size?: number; bold?: boolean; color?: string } = {}) =>
    text(xr - widthOf(s, o.size ?? 10, o.bold), y, s, o)
  const rule = (x1: number, y: number, x2: number, w = 0.6, color = RULE) =>
    C.push(`${w} w ${color} RG ${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`)

  const L = 50
  const Rt = 545
  let y = 800

  // Header
  text(L, y, 'PURCHASE ORDER', { size: 18, bold: true })
  right(Rt, y + 4, 'mimony', { size: 13, bold: true, color: BRAND })
  right(Rt, y - 9, `From agreed offer v${order.offerVersion}`, { size: 8, color: GRAY })
  y -= 18
  text(L, y, `${order.poNumber}   Issued ${dateFull(order.issuedAt)}`, { size: 9, color: GRAY })
  y -= 14
  rule(L, y, Rt, 0.8)
  y -= 24

  // Parties
  const party = (x: number, label: string, p: Order['buyer']) => {
    text(x, y, label.toUpperCase(), { size: 8, bold: true, color: GRAY })
    text(x, y - 15, p.name, { size: 11, bold: true })
    text(x, y - 28, `CR ${p.cr}   VAT ${p.vat}`, { size: 8, color: GRAY })
    text(x, y - 39, p.location, { size: 8, color: GRAY })
  }
  party(L, 'Buyer', order.buyer)
  if (isSupplierRevealed(order)) {
    party(310, 'Supplier', order.supplier)
  } else {
    text(310, y, 'SUPPLIER', { size: 8, bold: true, color: GRAY })
    text(310, y - 15, supplierDisplayName(order), { size: 11, bold: true })
    text(310, y - 28, 'Revealed when they accept this purchase order', { size: 8, color: GRAY })
  }
  y -= 58
  rule(L, y, Rt, 0.8)
  y -= 16

  // Item table
  const colDesc = 68
  const colQty = 350
  const colUnit = 452
  text(L, y, '#', { size: 8, bold: true, color: GRAY })
  text(colDesc, y, 'DESCRIPTION', { size: 8, bold: true, color: GRAY })
  right(colQty, y, 'QTY', { size: 8, bold: true, color: GRAY })
  right(colUnit, y, 'UNIT PRICE', { size: 8, bold: true, color: GRAY })
  right(Rt, y, 'LINE TOTAL', { size: 8, bold: true, color: GRAY })
  y -= 6
  rule(L, y, Rt, 0.6)
  y -= 16

  order.lines.forEach((l, i) => {
    text(L, y, String(i + 1), { size: 9, color: GRAY })
    text(colDesc, y, truncate(l.description, 42), { size: 9 })
    right(colQty, y, l.quantity.toLocaleString('en-US'), { size: 9, color: GRAY })
    right(colUnit, y, l.unitPriceSar.toFixed(2), { size: 9, color: GRAY })
    right(Rt, y, (l.quantity * l.unitPriceSar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), { size: 9, bold: true })
    y -= 8
    rule(L, y, Rt, 0.4)
    y -= 14
  })

  // Totals
  y -= 6
  const totalRow = (label: string, value: string, strong = false) => {
    text(360, y, label, { size: strong ? 10 : 9, bold: strong, color: strong ? BLACK : GRAY })
    right(Rt, y, value, { size: strong ? 11 : 9, bold: strong, color: strong ? BRAND : BLACK })
    y -= strong ? 0 : 15
  }
  totalRow('Subtotal', money(subtotal))
  totalRow('VAT 15%', money(vat))
  rule(360, y + 6, Rt, 0.6)
  y -= 4
  totalRow('TOTAL', money(total), true)
  y -= 26

  // Terms
  text(L, y, 'TERMS', { size: 8, bold: true, color: GRAY })
  y -= 14
  const terms = `Payment ${order.paymentTermsLabel}, settled offline between the parties. Delivery by ${dateFull(deliveryDate)} to ${order.shipment.deliverTo ?? '-'}.`
  for (const ln of wrap(terms, 96)) {
    text(L, y, ln, { size: 9, color: GRAY })
    y -= 13
  }

  // Footer
  text(L, 40, `${order.poNumber}   Generated by mimony`, { size: 8, color: GRAY })

  return assemble(C.join('\n'))
}

/** Wrap the drawing commands in a minimal, valid single-page PDF file. */
function assemble(content: string): Blob {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]

  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets[i] = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n'
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  // PDF is a byte format; every char here is < 256, so encode Latin-1 (charCode & 0xff) into bytes.
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff
  return new Blob([bytes], { type: 'application/pdf' })
}

/**
 * Build the PO and hand it to the browser as a download. Both sides of an order offer this, so the
 * object-URL dance lives here once rather than at each call site.
 */
export function downloadPurchaseOrderPdf(order: Order): void {
  const url = URL.createObjectURL(buildPurchaseOrderPdf(order))
  const link = document.createElement('a')
  link.href = url
  link.download = `${order.poNumber}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

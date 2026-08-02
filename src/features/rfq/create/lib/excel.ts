/* ────────────────────────────────────────────────────────────────────────────
 * EXCEL — template download + spreadsheet parsing for the line-items importer.
 *
 * SheetJS is loaded on demand (dynamic import) so the ~parser only ships when the
 * buyer actually opens the Upload-Excel tab — it never touches the main bundle.
 * All parsing is tolerant: headers match case-insensitively with aliases, units
 * normalise to our dropdown set (unknowns are flagged, not dropped), and every
 * row comes back with a status + issue list for the preview.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { LineItem } from '../../types'

/** The template's columns → our line-item model (Description is intentionally omitted). */
const HEADER_ALIASES: Record<'name' | 'specification' | 'quantity' | 'unit', string[]> = {
  name: ['item name', 'item', 'name'],
  specification: ['specification', 'specifications', 'spec', 'specs'],
  quantity: ['quantity', 'qty'],
  unit: ['unit', 'uom'],
}

/** Canonical units — mirrors the EN unit dropdown; parsed units resolve to these. */
const CANONICAL_UNITS = [
  'tonnes', 'kg', 'units', 'pieces', 'meters', 'm²', 'm³', 'litres', 'boxes', 'pallets', 'rolls', 'sets', 'bags', 'hours',
]

const UNIT_ALIASES: Record<string, string> = {
  tonne: 'tonnes', ton: 'tonnes', tons: 'tonnes', mt: 'tonnes',
  kgs: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
  unit: 'units', u: 'units',
  pcs: 'pieces', piece: 'pieces', pc: 'pieces', each: 'pieces', ea: 'pieces', nos: 'pieces',
  meter: 'meters', metre: 'meters', metres: 'meters', m: 'meters', lm: 'meters',
  m2: 'm²', sqm: 'm²', 'square meters': 'm²', 'square meter': 'm²',
  m3: 'm³', cbm: 'm³', 'cubic meters': 'm³', 'cubic meter': 'm³',
  liter: 'litres', liters: 'litres', litre: 'litres', l: 'litres',
  box: 'boxes', pallet: 'pallets', roll: 'rolls', set: 'sets', bag: 'bags',
  hour: 'hours', hr: 'hours', hrs: 'hours',
}

/** An issue key on a parsed row — maps to a localised message in the preview. */
export type RowIssue =
  | 'nameRequired'
  | 'quantityInvalid'
  | 'unitMissing'
  | 'unitUnknown'
  | 'duplicate'

/** A top-level file failure key — maps to a localised message. */
export type FileError = 'unsupportedType' | 'tooLarge' | 'unreadable' | 'empty' | 'missingColumns'

export interface ParsedRow {
  /** 1-based sheet row (for "Row 4: …" messages). */
  row: number
  name: string
  specification: string
  quantity: number | null
  unit: string
  status: 'ok' | 'warning' | 'error'
  issues: RowIssue[]
}

export interface ParseResult {
  rows: ParsedRow[]
  /** Rows that can be added (no blocking error). */
  addable: ParsedRow[]
  readyCount: number
  attentionCount: number
  errorKey: FileError | null
  /** For `missingColumns`: the comma-joined missing column keys (UI localises them). */
  errorDetail?: string
}

const MAX_SIZE = 5 * 1024 * 1024

function fail(errorKey: FileError, errorDetail?: string): ParseResult {
  return { rows: [], addable: [], readyCount: 0, attentionCount: 0, errorKey, errorDetail }
}

/** Resolve a raw unit to our canonical set. `known: false` → keep the raw value but flag it. */
function normalizeUnit(raw: string): { unit: string; known: boolean } {
  const value = raw.trim()
  if (!value) return { unit: '', known: false }
  const lower = value.toLowerCase()
  const exact = CANONICAL_UNITS.find((u) => u.toLowerCase() === lower)
  if (exact) return { unit: exact, known: true }
  const alias = UNIT_ALIASES[lower]
  if (alias) return { unit: alias, known: true }
  return { unit: value, known: false }
}

/** Parse an uploaded spreadsheet into line-item rows with per-row validation. */
export async function parseLineItemsFile(file: File): Promise<ParseResult> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return fail('unsupportedType')
  if (file.size > MAX_SIZE) return fail('tooLarge')

  let matrix: unknown[][]
  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return fail('empty')
    matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' })
  } catch {
    return fail('unreadable')
  }

  if (matrix.length < 2) return fail('empty')

  const headers = (matrix[0] as unknown[]).map((h) => String(h ?? '').trim().toLowerCase())
  const colOf = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h))
  const idx = {
    name: colOf(HEADER_ALIASES.name),
    specification: colOf(HEADER_ALIASES.specification),
    quantity: colOf(HEADER_ALIASES.quantity),
    unit: colOf(HEADER_ALIASES.unit),
  }

  const missing = (['name', 'quantity', 'unit'] as const).filter((k) => idx[k] < 0)
  if (missing.length > 0) return fail('missingColumns', missing.join(','))

  const seen = new Set<string>()
  const rows: ParsedRow[] = []

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r] as unknown[]
    const cell = (i: number) => (i >= 0 ? String(cells[i] ?? '').trim() : '')

    const name = cell(idx.name)
    const specification = cell(idx.specification)
    const quantityRaw = cell(idx.quantity)
    const unitRaw = cell(idx.unit)

    // Skip a fully-empty row silently.
    if (!name && !specification && !quantityRaw && !unitRaw) continue

    const issues: RowIssue[] = []
    if (!name) issues.push('nameRequired')

    const quantityNum = Number(quantityRaw.replace(/,/g, ''))
    const quantity =
      quantityRaw !== '' && Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : null
    if (quantity === null) issues.push('quantityInvalid')

    const { unit, known } = normalizeUnit(unitRaw)
    if (!unit) issues.push('unitMissing')
    else if (!known) issues.push('unitUnknown')

    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`
    if (name && seen.has(key)) issues.push('duplicate')
    if (name) seen.add(key)

    const blocking = issues.includes('nameRequired') || issues.includes('quantityInvalid')
    const status: ParsedRow['status'] = blocking ? 'error' : issues.length > 0 ? 'warning' : 'ok'

    rows.push({ row: r + 1, name, specification, quantity, unit, status, issues })
  }

  const addable = rows.filter((row) => row.status !== 'error')
  const attentionCount = rows.filter((row) => row.issues.length > 0).length
  return { rows, addable, readyCount: addable.length, attentionCount, errorKey: null }
}

/** Turn addable parsed rows into line items ready for the form. */
export function toLineItems(rows: ParsedRow[]): LineItem[] {
  return rows.map((row, i) => ({
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `li_${Date.now()}_${i}`,
    name: row.name,
    specification: row.specification,
    quantity: row.quantity ?? 0,
    unit: row.unit,
  }))
}

/** Generate + download the blank 4-column template as a real .xlsx (with example rows). */
export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx')
  const aoa: (string | number)[][] = [
    ['Item Name', 'Specification', 'Quantity', 'Unit'],
    ['Steel Rebar', 'Grade 60 · 12mm diameter', 1000, 'kg'],
    ['Cement Bags', 'Portland cement · 50kg each', 500, 'bags'],
    ['Construction Sand', 'Fine aggregate · washed & graded', 10, 'm³'],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  sheet['!cols'] = [{ wch: 24 }, { wch: 34 }, { wch: 12 }, { wch: 12 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Line items')
  XLSX.writeFile(book, 'mi-proc-rfq-line-items-template.xlsx')
}

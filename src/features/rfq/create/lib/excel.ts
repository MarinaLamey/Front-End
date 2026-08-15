/* ────────────────────────────────────────────────────────────────────────────
 * EXCEL — template download + spreadsheet parsing for the line-items importer.
 *
 * SheetJS is loaded on demand (dynamic import) so the ~parser only ships when the
 * buyer actually opens the Upload-Excel tab — it never touches the main bundle.
 * All parsing is tolerant: headers match case-insensitively with aliases, units
 * normalise to our dropdown set (unknowns are flagged, not dropped), and every
 * row comes back with a status + issue list for the preview.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { LineItem, RfqCategory } from '../../types'

/** The template's columns → our line-item model. `category` assigns each row to a selected category. */
const HEADER_ALIASES: Record<'category' | 'name' | 'specification' | 'quantity' | 'unit', string[]> = {
  category: ['category', 'category name', 'categoryname'],
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
  | 'categoryMissing'
  | 'categoryUnknown'
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
  /** The selected-category name this row is assigned to (canonicalised), or the raw value if unknown. */
  category: string
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

/**
 * Parse an uploaded spreadsheet into line-item rows with per-row validation. `categories` is the
 * RFQ's selected category set — each row's Category cell is matched against it so imported items
 * land in the right group (no order-based guessing); unmatched/blank categories are flagged.
 */
export async function parseLineItemsFile(file: File, categories: RfqCategory[]): Promise<ParseResult> {
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
    category: colOf(HEADER_ALIASES.category),
    name: colOf(HEADER_ALIASES.name),
    specification: colOf(HEADER_ALIASES.specification),
    quantity: colOf(HEADER_ALIASES.quantity),
    unit: colOf(HEADER_ALIASES.unit),
  }

  const missing = (['category', 'name', 'quantity', 'unit'] as const).filter((k) => idx[k] < 0)
  if (missing.length > 0) return fail('missingColumns', missing.join(','))

  // Match an imported Category cell (case-insensitively) to one of the RFQ's selected categories.
  const canonicalCategory = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.name]))
  const seen = new Set<string>()
  const rows: ParsedRow[] = []

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r] as unknown[]
    const cell = (i: number) => (i >= 0 ? String(cells[i] ?? '').trim() : '')

    const categoryRaw = cell(idx.category)
    const name = cell(idx.name)
    const specification = cell(idx.specification)
    const quantityRaw = cell(idx.quantity)
    const unitRaw = cell(idx.unit)

    // Skip a fully-empty row silently.
    if (!categoryRaw && !name && !specification && !quantityRaw && !unitRaw) continue

    const issues: RowIssue[] = []

    // Assign to a selected category from the row's Category cell — never by order/assumption.
    const category = categoryRaw ? (canonicalCategory.get(categoryRaw.toLowerCase()) ?? categoryRaw) : ''
    if (!categoryRaw) issues.push('categoryMissing')
    else if (!canonicalCategory.has(categoryRaw.toLowerCase())) issues.push('categoryUnknown')

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

    const blocking =
      issues.includes('categoryMissing') ||
      issues.includes('categoryUnknown') ||
      issues.includes('nameRequired') ||
      issues.includes('quantityInvalid')
    const status: ParsedRow['status'] = blocking ? 'error' : issues.length > 0 ? 'warning' : 'ok'

    rows.push({ row: r + 1, category, name, specification, quantity, unit, status, issues })
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
    // Each row already carries its validated, selected-category assignment from the parser.
    categoryName: row.category,
    name: row.name,
    specification: row.specification,
    quantity: row.quantity ?? 0,
    unit: row.unit,
  }))
}

/** Worked example rows per schema — cycled so no two seeded rows are identical. */
const GOODS_EXAMPLES: (string | number)[][] = [
  ['Steel rebar', 'Grade 60 · 12mm diameter', 1000, 'kg'],
  ['Cement bags', 'Portland cement · 50kg each', 500, 'bags'],
  ['Construction sand', 'Fine aggregate · washed & graded', 10, 'm³'],
]
const SERVICE_EXAMPLES: (string | number)[][] = [
  ['Site supervisor', '2 shifts per day', 6, 'months'],
  ['Safety inspection', 'Weekly site walkthrough', 12, 'visits'],
  ['Installation crew', 'On-site assembly & commissioning', 3, 'weeks'],
]

/**
 * Generate + download the line-items template as a real .xlsx. The first column is **Category**,
 * so each row is explicitly assigned to one of the RFQ's selected categories on import (no order
 * guessing). Example rows are pre-filled with the buyer's actual categories, and a second sheet
 * lists the valid category values for reference.
 */
export async function downloadTemplate(categories: RfqCategory[]): Promise<void> {
  const XLSX = await import('xlsx')
  // Dedupe by name (case-insensitive) so the template never repeats a category; fall back to a
  // neutral placeholder only if somehow called with no categories selected.
  const seen = new Set<string>()
  const cats: RfqCategory[] = (
    categories.length ? categories : [{ name: 'Category name', type: 'goods' as const }]
  ).filter((c) => {
    const key = c.name.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  const header = ['Category', 'Item Name', 'Specification', 'Quantity', 'Unit']
  const exampleRows = cats.map((c, i) => {
    const pool = c.type === 'service' ? SERVICE_EXAMPLES : GOODS_EXAMPLES
    return [c.name, ...pool[i % pool.length]]
  })
  const sheet = XLSX.utils.aoa_to_sheet([header, ...exampleRows])
  sheet['!cols'] = [{ wch: 26 }, { wch: 24 }, { wch: 34 }, { wch: 12 }, { wch: 12 }]

  // Reference sheet: the exact Category values that are accepted for this RFQ.
  const refSheet = XLSX.utils.aoa_to_sheet([
    ['Valid categories for this RFQ', 'Type'],
    ...cats.map((c) => [c.name, c.type]),
  ])
  refSheet['!cols'] = [{ wch: 30 }, { wch: 12 }]

  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Line items')
  XLSX.utils.book_append_sheet(book, refSheet, 'Categories')
  XLSX.writeFile(book, 'mi-proc-rfq-line-items-template.xlsx')
}

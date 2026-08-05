/* ────────────────────────────────────────────────────────────────────────────
 * ORDERS API — mock-first seam, localStorage-backed (store key miproc.orders.v1).
 * Seeds a lived-in set of demo orders across every lifecycle state on first load;
 * the buyer's actions (confirm receipt, cancel, report issue, resolve a decline)
 * mutate and persist. Swapping to the real BFF is a body change here.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Order, OrderIssue, OrderLine, OrderMessage, OrderParty, ReceiptLine } from '../types'

const STORE_KEY = 'miproc.orders.v1'
const LATENCY = 380

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

function readStore(): Order[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

function writeStore(records: Order[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

function upsert(order: Order): Order {
  const records = readStore()
  const index = records.findIndex((o) => o.id === order.id)
  if (index >= 0) records[index] = order
  else records.push(order)
  writeStore(records)
  return order
}

const BUYER: OrderParty = {
  name: 'Al-Faisal Contracting Co.',
  cr: '1010229481',
  vat: '300012938400003',
  location: 'Riyadh, Saudi Arabia',
}

const REBAR_LINES: OrderLine[] = [
  { description: 'Steel rebar 12mm', quantity: 4000, unit: 'pcs', unitPriceSar: 2.75 },
  { description: 'Steel rebar 16mm', quantity: 3500, unit: 'pcs', unitPriceSar: 3.28 },
  { description: 'Steel rebar 20mm', quantity: 2500, unit: 'pcs', unitPriceSar: 4.02 },
  { description: 'Binding wire 1.6mm', quantity: 1200, unit: 'coil', unitPriceSar: 46.9 },
]

/** Demo orders — dates are relative to first load so the timeline always reads sensibly. */
function seed(): Order[] {
  const now = Date.now()
  const DAY = 86_400_000
  const at = (days: number, h = 9, m = 0) => new Date(now + days * DAY + (h * 60 + m) * 60_000).toISOString()

  const supplier = (name: string, cr: string, vat: string, location: string): OrderParty => ({ name, cr, vat, location })
  const genericLines = (label: string, qty: number, unit: string, price: number): OrderLine[] => [
    { description: label, quantity: qty, unit, unitPriceSar: price },
  ]

  const orders: Order[] = [
    // Hero — DELIVERED, awaiting the buyer's receipt (the interactive receipt screen).
    {
      id: 'ORD-2026-0088',
      poNumber: 'PO-2026-0088',
      rfqReference: 'RFQ-2026-0142',
      rfqId: 'RFQ-2026-0142',
      splitIndex: 1,
      splitTotal: 2,
      offerVersion: 3,
      title: 'Steel Rebar, Grade 60',
      status: 'delivered',
      buyer: BUYER,
      supplier: supplier('Al-Rajhi Steel Industries LLC', '1010384726', '300047382900003', 'Industrial City 2, Riyadh'),
      supplierShort: 'Al-Rajhi Steel',
      lines: REBAR_LINES,
      paymentTermsLabel: '30 / 60 / 10',
      shipment: {
        dispatchedAt: at(-6, 8, 15),
        expectedArrival: at(-1),
        deliveredAt: at(-1, 7, 50),
        method: 'Supplier own fleet · 3 vehicles',
        reference: 'DN-88214 / DN-88215 / DN-88216',
        deliverTo: 'Al-Faisal site, Industrial City 2, Riyadh',
      },
      issuedAt: at(-9, 11, 20),
      acceptedAt: at(-9, 16, 40),
    },
    // Split sibling of ORD-0088 — the runner-up covers the one item Al-Rajhi could not supply.
    {
      id: 'ORD-2026-0089',
      poNumber: 'PO-2026-0089',
      rfqReference: 'RFQ-2026-0142',
      rfqId: 'RFQ-2026-0142',
      splitIndex: 2,
      splitTotal: 2,
      offerVersion: 1,
      title: 'Steel Rebar, Grade 60',
      status: 'awaiting_acceptance',
      buyer: BUYER,
      supplier: supplier('Najd Industrial Supplies Co.', '1010992014', '300091114900003', 'Riyadh'),
      supplierShort: 'Najd Industrial Supplies Co.',
      lines: [{ description: 'Rebar spacers, plastic 25mm cover', quantity: 1200, unit: 'box', unitPriceSar: 8.0 }],
      paymentTermsLabel: '30 / 70',
      shipment: { deliverTo: 'Al-Faisal site, Industrial City 2, Riyadh' },
      issuedAt: at(-9, 11, 25),
    },
    // AWAITING acceptance (two).
    {
      id: 'ORD-2026-0074',
      poNumber: 'PO-2026-0074',
      rfqReference: 'RFQ-2026-0138',
      rfqId: 'RFQ-2026-0138',
      offerVersion: 2,
      title: 'Office Furniture, 120 Workstations',
      status: 'awaiting_acceptance',
      buyer: BUYER,
      supplier: supplier('Modern Interiors LLC', '1010556231', '300088112900003', 'Al Khobar'),
      supplierShort: 'Modern Interiors LLC',
      lines: [
        { description: 'Workstation desk 1.4m', quantity: 120, unit: 'pcs', unitPriceSar: 1450 },
        { description: 'Ergonomic task chair', quantity: 120, unit: 'pcs', unitPriceSar: 890 },
      ],
      paymentTermsLabel: '50 / 50',
      shipment: { deliverTo: 'Al-Faisal HQ, Al Olaya, Riyadh' },
      issuedAt: at(-1, 10, 5),
      runnerUp: { supplierLabel: 'Supplier B', totalSar: 279900, itemsCovered: 2, itemsTotal: 2, validUntil: at(20) },
    },
    {
      id: 'ORD-2026-0071',
      poNumber: 'PO-2026-0071',
      rfqReference: 'RFQ-2026-0135',
      rfqId: 'RFQ-2026-0135',
      offerVersion: 1,
      title: 'Diesel Generators ×4',
      status: 'awaiting_acceptance',
      buyer: BUYER,
      supplier: supplier('Power Systems Arabia', '1010667342', '300099223900003', 'Dammam'),
      supplierShort: 'Power Systems Arabia',
      lines: genericLines('500 kVA diesel generator', 4, 'unit', 78500),
      paymentTermsLabel: '40 / 40 / 20',
      shipment: { deliverTo: 'Al-Faisal depot, Dammam' },
      issuedAt: at(-2, 14, 30),
    },
    // IN TRANSIT (three).
    {
      id: 'ORD-2026-0081',
      poNumber: 'PO-2026-0081',
      rfqReference: 'RFQ-2026-0131',
      rfqId: 'RFQ-2026-0131',
      offerVersion: 2,
      title: 'HVAC Maintenance, 12 months',
      status: 'in_transit',
      buyer: BUYER,
      supplier: supplier('Gulf Facilities Co.', '1010445123', '300066554900003', 'Jeddah'),
      supplierShort: 'Gulf Facilities Co.',
      lines: genericLines('HVAC preventive maintenance, annual contract', 12, 'month', 34333),
      paymentTermsLabel: 'Monthly',
      shipment: {
        dispatchedAt: at(-3, 8, 0),
        expectedArrival: at(6),
        method: 'Scheduled service',
        reference: 'SVC-2026-0081',
        deliverTo: 'Al-Faisal HQ, Riyadh',
      },
      issuedAt: at(-8, 9, 0),
      acceptedAt: at(-8, 12, 0),
    },
    {
      id: 'ORD-2026-0079',
      poNumber: 'PO-2026-0079',
      rfqReference: 'RFQ-2026-0129',
      rfqId: 'RFQ-2026-0129',
      offerVersion: 1,
      title: 'Steel Pipes, API 5L',
      status: 'in_transit',
      buyer: BUYER,
      supplier: supplier('Eastern Steel Works LLC', '1010773451', '300077665900003', 'Al Khobar'),
      supplierShort: 'Eastern Steel Works',
      lines: genericLines('API 5L pipe, 12in ×6m', 480, 'pcs', 512),
      paymentTermsLabel: '30 / 70',
      shipment: {
        dispatchedAt: at(-2, 7, 30),
        expectedArrival: at(3),
        method: 'Third-party freight',
        reference: 'DN-44120',
        deliverTo: 'Al-Faisal yard, Jubail',
      },
      issuedAt: at(-6, 10, 0),
      acceptedAt: at(-6, 15, 20),
    },
    {
      id: 'ORD-2026-0077',
      poNumber: 'PO-2026-0077',
      rfqReference: 'RFQ-2026-0127',
      rfqId: 'RFQ-2026-0127',
      offerVersion: 2,
      title: 'Water Tanks, GRP',
      status: 'in_transit',
      buyer: BUYER,
      supplier: supplier('Najd Water Systems', '1010882234', '300055447900003', 'Buraydah'),
      supplierShort: 'Najd Water Systems',
      lines: genericLines('GRP sectional tank, 50m³', 6, 'unit', 41200),
      paymentTermsLabel: '50 / 50',
      shipment: {
        dispatchedAt: at(-1, 9, 15),
        expectedArrival: at(4),
        method: 'Supplier own fleet',
        reference: 'DN-99012',
        deliverTo: 'Al-Faisal site, Qassim',
      },
      issuedAt: at(-5, 11, 0),
      acceptedAt: at(-5, 13, 0),
    },
    // CLOSED (five).
    ...(
      [
        ['ORD-2026-0066', 'PO-2026-0066', 'RFQ-2026-0121', 'Safety Equipment, PPE Bundle', 'SafeGuard Arabia', 'SafeGuard Arabia', 'PPE bundle (helmet, gloves, boots)', 1200, 'set', 80.2],
        ['ORD-2026-0061', 'PO-2026-0061', 'RFQ-2026-0116', 'Cement Supply, Q2', 'Saudi Building Materials Co.', 'Saudi Building Materials', 'OPC cement, 50kg bag', 15000, 'bag', 14],
        ['ORD-2026-0058', 'PO-2026-0058', 'RFQ-2026-0113', 'Cleaning Services, Annual', 'Sparkle Facilities', 'Sparkle Facilities', 'Annual cleaning contract', 12, 'month', 11000],
        ['ORD-2026-0052', 'PO-2026-0052', 'RFQ-2026-0108', 'Forklift Spare Parts', 'MRO Industrial Supply', 'MRO Industrial Supply', 'Forklift spare parts kit', 30, 'kit', 1620],
        ['ORD-2026-0049', 'PO-2026-0049', 'RFQ-2026-0104', 'IT Networking Refresh', 'NetLink Technologies', 'NetLink Technologies', 'Managed switch, 48-port', 42, 'unit', 4200],
      ] as const
    ).map(([id, po, rfq, title, name, short, lineLabel, qty, unit, price], i): Order => ({
      id,
      poNumber: po,
      rfqReference: rfq,
      rfqId: rfq,
      offerVersion: 1 + (i % 3),
      title,
      status: 'closed',
      buyer: BUYER,
      supplier: supplier(name, `10105${i}03421`, `3000${i}2211900003`, 'Riyadh'),
      supplierShort: short,
      lines: genericLines(lineLabel, qty, unit, price),
      paymentTermsLabel: '30 / 70',
      shipment: {
        dispatchedAt: at(-40 - i * 3, 8, 0),
        expectedArrival: at(-34 - i * 3),
        deliveredAt: at(-34 - i * 3, 10, 0),
        method: 'Supplier own fleet',
        reference: `DN-${72000 + i}`,
        deliverTo: 'Al-Faisal site, Riyadh',
      },
      issuedAt: at(-45 - i * 3, 11, 0),
      acceptedAt: at(-45 - i * 3, 15, 0),
      closedAt: at(-33 - i * 3, 9, 0),
    })),
    // CANCELLED (one) — buyer cancelled before acceptance.
    {
      id: 'ORD-2026-0059',
      poNumber: 'PO-2026-0059',
      rfqReference: 'RFQ-2026-0114',
      rfqId: 'RFQ-2026-0114',
      offerVersion: 1,
      title: 'Warehouse Racking System',
      status: 'cancelled',
      buyer: BUYER,
      supplier: supplier('Steel Systems Co.', '1010991123', '300033889900003', 'Riyadh'),
      supplierShort: 'Steel Systems Co.',
      lines: genericLines('Heavy-duty pallet racking bay', 200, 'bay', 770),
      paymentTermsLabel: '50 / 50',
      shipment: { deliverTo: 'Al-Faisal warehouse, Riyadh' },
      issuedAt: at(-12, 10, 0),
      cancelledAt: at(-11, 14, 0),
      cancelReason: 'budget_withdrawn',
      cancelNote: 'Capital budget for the quarter was withdrawn.',
    },
    // DECLINED (one) — supplier declined the PO (void).
    {
      id: 'ORD-2026-0069',
      poNumber: 'PO-2026-0069',
      rfqReference: 'RFQ-2026-0124',
      rfqId: 'RFQ-2026-0124',
      offerVersion: 2,
      title: 'Aluminium Cladding Panels',
      status: 'declined',
      buyer: BUYER,
      supplier: supplier('Gulf Fabrication & Trading', '1010334512', '300044556900003', 'Jeddah'),
      supplierShort: 'Gulf Fabrication',
      lines: genericLines('ACP panel 4mm, PVDF', 900, 'm²', 128),
      paymentTermsLabel: '40 / 60',
      shipment: { deliverTo: 'Al-Faisal tower, Jeddah' },
      issuedAt: at(-4, 11, 0),
      declinedAt: at(-3, 8, 47),
      declineReason: 'Our production line was reallocated and we cannot source the full quantity before your required date. We would welcome the chance to bid again next quarter.',
      declineReasonTag: 'stock_unavailable',
      declinedByName: 'Khalid Al-Otaibi, Sales',
      declineHeldHours: 21,
      runnerUp: { supplierLabel: 'Supplier B', totalSar: 110900, itemsCovered: 5, itemsTotal: 5, validUntil: at(21) },
    },
  ]

  return orders
}

function ensureSeeded(): Order[] {
  let records = readStore()
  if (records.length === 0) {
    records = seed()
    writeStore(records)
  }
  return records
}

export const ordersApi = {
  listOrders(): Promise<Order[]> {
    const records = ensureSeeded()
    return delay(records.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)))
  },

  /** Resolve by order id, or by the linked RFQ (so "View order" from the award screen works). */
  getOrder(idOrRfq: string): Promise<Order | null> {
    const records = ensureSeeded()
    const order =
      records.find((o) => o.id === idOrRfq) ??
      records.find((o) => o.rfqId === idOrRfq || o.rfqReference === idOrRfq) ??
      null
    return delay(order)
  },

  /** Confirm receipt — full closes the order; partial keeps it open for the shortfall. */
  confirmReceipt(id: string, receipt: Record<number, ReceiptLine>, full: boolean): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(
      upsert({
        ...order,
        receipt,
        status: full ? 'closed' : order.status,
        closedAt: full ? new Date().toISOString() : order.closedAt,
      }),
    )
  },

  /** Cancel a not-yet-accepted PO. */
  cancelOrder(id: string, reason: string, note: string): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(
      upsert({ ...order, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: reason, cancelNote: note }),
    )
  },

  /** Attach a reported issue — the order stays in its current state. */
  reportIssue(id: string, issue: OrderIssue): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(upsert({ ...order, issue }))
  },

  /** Append a message to the order's supplier conversation. */
  appendMessage(id: string, message: OrderMessage): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(upsert({ ...order, messages: [...(order.messages ?? []), message] }))
  },
}

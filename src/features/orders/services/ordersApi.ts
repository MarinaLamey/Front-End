/* ────────────────────────────────────────────────────────────────────────────
 * ORDERS API — mock-first seam, localStorage-backed (store key miproc.orders.v1).
 * Seeds a lived-in set of demo orders across every lifecycle state on first load;
 * the buyer's actions (confirm receipt, cancel, report issue, resolve a decline)
 * mutate and persist. Swapping to the real BFF is a body change here.
 * ──────────────────────────────────────────────────────────────────────────── */

import { DEMO_ORG } from '@/platform/demo'
import { SUPPLIER_ORG_NAME } from '../supplier/supplierOrders'
import type { Order, OrderIssue, OrderLine, OrderMessage, OrderParty, ReceiptLine, Shipment } from '../types'

// v5 — per-line delivery; required-documents removed; supplierAnonLabel added.
// v6 — supplier-side orders added to the same store (one dataset, two views: each side filters by
// its own party), plus shipment updates, PO acceptance and cancellation requests. Bump re-seeds.
// v7: the hero order gained offerHistory + itemsCovered/itemsTotal + a supplier contact name, which
// the Order conversation reads. A v6 record has none of them, so the seed shape has to re-run.
// v8: VAT went INCLUSIVE (SoT §4), so every agreedTotalSar authored as lineSum x 1.15 is corrected
// to the line sum itself; plus the two states §2.2 was missing — accepted_awaiting_dispatch and
// expired — each with a seeded order. A v7 record carries the old totals, so it has to re-seed.
const STORE_KEY = 'miproc.orders.v8'
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

/** Us, on every purchase order — the same identity the Organisation record carries. */
const BUYER: OrderParty = {
  name: DEMO_ORG.legalName,
  cr: DEMO_ORG.cr,
  vat: DEMO_ORG.vat,
  location: DEMO_ORG.location,
}

// Prices are VAT-INCLUSIVE (SoT §4): 11,000 + 11,550 + 10,000 + 55,450 = 88,000, and that sum IS the
// agreed total — the subtotal (76,521.74) and VAT (11,478.26) divide back out of it, nothing is added
// on top. Per-line delivery = the agreed line schedule.
const REBAR_LINES: OrderLine[] = [
  { description: 'Steel rebar 12mm', quantity: 4000, unit: 'pcs', unitPriceSar: 2.75, deliveryDate: '2026-08-24T00:00:00.000Z' },
  { description: 'Steel rebar 16mm', quantity: 3500, unit: 'pcs', unitPriceSar: 3.3, deliveryDate: '2026-08-24T00:00:00.000Z' },
  { description: 'Steel rebar 20mm', quantity: 2500, unit: 'pcs', unitPriceSar: 4.0, deliveryDate: '2026-08-26T00:00:00.000Z' },
  { description: 'Binding wire 1.6mm', quantity: 1200, unit: 'coil', unitPriceSar: 46.208333, deliveryDate: '2026-08-22T00:00:00.000Z' },
]

/** Demo orders — dates are relative to first load so the timeline always reads sensibly. */
function seed(): Order[] {
  const now = Date.now()
  const DAY = 86_400_000
  const at = (days: number, h = 9, m = 0) => new Date(now + days * DAY + (h * 60 + m) * 60_000).toISOString()

  const supplier = (name: string, cr: string, vat: string, location: string, contactName?: string): OrderParty => ({
    name,
    cr,
    vat,
    location,
    contactName,
  })
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
      agreedTotalSar: 88000,
      title: 'Steel Rebar, Grade 60',
      status: 'delivered',
      buyer: BUYER,
      supplier: supplier('Al-Rajhi Steel Industries LLC', '1010384726', '300047382900003', 'Industrial City 2, Riyadh', 'Khalid Al-Otaibi'),
      supplierShort: 'Al-Rajhi Steel',
      supplierAnonLabel: 'Supplier A',
      lines: REBAR_LINES,
      paymentTermsLabel: '30 / 60 / 10',
      // Four of the RFQ's five lines — the fifth (rebar spacers) went to the split sibling, which is
      // why the conversation reads "4 of 5" rather than the PO's own line count.
      itemsCovered: 4,
      itemsTotal: 5,
      /**
       * The three negotiation rounds the agreed terms came from. Append-only and immutable: v3 is
       * what the PO was built from, and v1/v2 stay exactly as they were said.
       */
      offerHistory: [
        {
          version: 1,
          by: 'supplier',
          tag: 'original',
          totalSar: 104966,
          deliveryDate: at(-13),
          paymentTermsLabel: '30 / 60 / 10',
          itemsCovered: 4,
          itemsTotal: 5,
          message: 'Rebar spacers are not in our range. All other lines can be supplied from stock.',
          at: at(-12, 10, 24),
        },
        {
          version: 2,
          by: 'buyer',
          tag: 'counter',
          totalSar: 97500,
          deliveryDate: at(-15),
          paymentTermsLabel: '30 / 60 / 10',
          itemsCovered: 4,
          itemsTotal: 5,
          message: 'We need delivery two days earlier to meet the site pour date. Can you match 97,500 on the four lines?',
          at: at(-12, 15, 2),
        },
        {
          version: 3,
          by: 'supplier',
          tag: 'latest',
          totalSar: 101200,
          deliveryDate: at(-14),
          paymentTermsLabel: '30 / 60 / 10',
          itemsCovered: 4,
          itemsTotal: 5,
          message: 'We can bring delivery forward. 97,500 is below our mill cost on the 20mm line. 101,200 is our best.',
          at: at(-11, 9, 41),
        },
      ],
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
      agreedTotalSar: 9600,
      title: 'Steel Rebar, Grade 60',
      status: 'awaiting_acceptance',
      buyer: BUYER,
      supplier: supplier('Najd Industrial Supplies Co.', '1010992014', '300091114900003', 'Riyadh'),
      supplierShort: 'Najd Industrial Supplies Co.',
      supplierAnonLabel: 'Supplier B',
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
      agreedTotalSar: 280800,
      title: 'Office Furniture, 120 Workstations',
      status: 'awaiting_acceptance',
      buyer: BUYER,
      supplier: supplier('Modern Interiors LLC', '1010556231', '300088112900003', 'Al Khobar'),
      supplierShort: 'Modern Interiors LLC',
      supplierAnonLabel: 'Supplier C',
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
      supplierAnonLabel: 'Supplier E',
      lines: genericLines('500 kVA diesel generator', 4, 'unit', 78500),
      paymentTermsLabel: '40 / 40 / 20',
      shipment: { deliverTo: 'Al-Faisal depot, Dammam' },
      issuedAt: at(-2, 14, 30),
    },
    // ACCEPTED, AWAITING DISPATCH (one) — the supplier has committed but has not entered a dispatch
    // date, so nothing is moving yet. This is a step in its own right (SoT §2.2), not a flavour of
    // in-transit: the buyer is waiting on a date, not on a delivery.
    {
      id: 'ORD-2026-0087',
      poNumber: 'PO-2026-0087',
      rfqReference: 'RFQ-2026-0141',
      rfqId: 'RFQ-2026-0141',
      offerVersion: 2,
      agreedTotalSar: 63000,
      title: 'Site Scaffolding Hire, 6 months',
      status: 'accepted_awaiting_dispatch',
      buyer: BUYER,
      supplier: supplier('Arabian Access Systems', '1010774521', '300077665500003', 'Riyadh', 'Faisal Al-Harbi'),
      supplierShort: 'Arabian Access Systems',
      supplierAnonLabel: 'Supplier F',
      lines: genericLines('Scaffolding bay hire, per month', 6, 'month', 10500),
      paymentTermsLabel: '30 / 70',
      shipment: { deliverTo: 'Al-Faisal site, Industrial City 2, Riyadh' },
      issuedAt: at(-3, 9, 15),
      acceptedAt: at(-3, 13, 40),
    },
    // EXPIRED (one) — issued and never answered. 168 hours from issue, so the clock has run out.
    // The word is Expired, never auto-cancelled, and never "void" (SoT §8, §2.2).
    {
      id: 'ORD-2026-0068',
      poNumber: 'PO-2026-0068',
      rfqReference: 'RFQ-2026-0126',
      rfqId: 'RFQ-2026-0126',
      offerVersion: 1,
      agreedTotalSar: 47500,
      title: 'Traffic Management Barriers',
      status: 'expired',
      buyer: BUYER,
      supplier: supplier('Highway Safety Supplies', '1010223877', '300044119900003', 'Riyadh'),
      supplierShort: 'Highway Safety Supplies',
      supplierAnonLabel: 'Supplier G',
      lines: genericLines('Plastic water-filled barrier, 2m', 250, 'unit', 190),
      paymentTermsLabel: '50 / 50',
      shipment: { deliverTo: 'Al-Faisal site, Riyadh' },
      issuedAt: at(-14, 10, 0),
    },
    // IN TRANSIT (three).
    {
      id: 'ORD-2026-0081',
      poNumber: 'PO-2026-0081',
      rfqReference: 'RFQ-2026-0131',
      rfqId: 'RFQ-2026-0131',
      offerVersion: 2,
      agreedTotalSar: 411996,
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
        ['ORD-2026-0066', 'PO-2026-0066', 'RFQ-2026-0121', 'Safety Equipment, PPE Bundle', 'SafeGuard Arabia', 'SafeGuard Arabia', 'PPE bundle (helmet, gloves, boots)', 1200, 'set', 80.2, 96240],
        ['ORD-2026-0061', 'PO-2026-0061', 'RFQ-2026-0116', 'Cement Supply, Q2', 'Saudi Building Materials Co.', 'Saudi Building Materials', 'OPC cement, 50kg bag', 15000, 'bag', 14, 210000],
        ['ORD-2026-0058', 'PO-2026-0058', 'RFQ-2026-0113', 'Cleaning Services, Annual', 'Sparkle Facilities', 'Sparkle Facilities', 'Annual cleaning contract', 12, 'month', 11000, 132000],
        ['ORD-2026-0052', 'PO-2026-0052', 'RFQ-2026-0108', 'Forklift Spare Parts', 'MRO Industrial Supply', 'MRO Industrial Supply', 'Forklift spare parts kit', 30, 'kit', 1620, 48600],
        ['ORD-2026-0049', 'PO-2026-0049', 'RFQ-2026-0104', 'IT Networking Refresh', 'NetLink Technologies', 'NetLink Technologies', 'Managed switch, 48-port', 42, 'unit', 4200, 176400],
      ] as const
    ).map(([id, po, rfq, title, name, short, lineLabel, qty, unit, price, agreed], i): Order => ({
      id,
      poNumber: po,
      rfqReference: rfq,
      rfqId: rfq,
      offerVersion: 1 + (i % 3),
      agreedTotalSar: agreed,
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
      agreedTotalSar: 154000,
      title: 'Warehouse Racking System',
      status: 'cancelled',
      buyer: BUYER,
      supplier: supplier('Steel Systems Co.', '1010991123', '300033889900003', 'Riyadh'),
      supplierShort: 'Steel Systems Co.',
      supplierAnonLabel: 'Supplier D',
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
      supplierAnonLabel: 'Supplier F',
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

  return [...orders, ...supplierSeed(at)]
}

/**
 * Orders where the signed-in SUPPLIER is the selling party. The buyer's seed above is one buyer
 * against many suppliers; this is the mirror — one supplier against many buyers — so the supplier's
 * list has every stage on it from a fresh session. Both sets live in the same store and each side
 * filters to its own party, so an order is one record read from two ends.
 *
 * ORD-2026-0088 is deliberately absent here: it already exists above with Al-Rajhi as the supplier,
 * so it appears on BOTH lists — the one order in the seed that genuinely has two sides.
 */
function supplierSeed(at: (days: number, h?: number, m?: number) => string): Order[] {
  const us: OrderParty = {
    name: 'Al-Rajhi Steel Industries LLC',
    cr: '1010384726',
    vat: '300047382900003',
    location: 'Industrial City 2, Riyadh',
  }
  const buyer = (name: string, cr: string, location: string): OrderParty => ({
    name,
    cr,
    vat: `3000${cr.slice(4, 9)}00003`,
    location,
  })

  const GULF = buyer('Gulf Property Group', '1010774512', 'Jeddah, Saudi Arabia')
  const DESERT = buyer('Desert Logistics Co.', '1010663318', 'Dammam, Saudi Arabia')
  const RIYADH_WORKS = buyer('Riyadh Works Co.', '1010445902', 'Riyadh, Saudi Arabia')

  return [
    // TO REVIEW — a PO just issued from the agreed offer; the buyer stays masked until acceptance.
    {
      id: 'ORD-2026-0083',
      poNumber: 'PO-2026-0083',
      rfqReference: 'RFQ-2026-0131',
      rfqId: 'RFQ-2026-0131',
      offerVersion: 3,
      // 224,000 + 102,000 + 30,000 = 356,000 — VAT-inclusive, so that sum IS the agreed total.
      agreedTotalSar: 356000,
      title: 'HVAC Maintenance, 12 months',
      status: 'awaiting_acceptance',
      buyer: GULF,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [
        { description: 'Preventive maintenance', quantity: 4, unit: 'visit', unitPriceSar: 56000, deliveryDate: at(20) },
        { description: 'Filter replacement', quantity: 12, unit: 'month', unitPriceSar: 8500, deliveryDate: at(20) },
        { description: 'Emergency call-out cover', quantity: 12, unit: 'month', unitPriceSar: 2500, deliveryDate: at(20) },
      ],
      paymentTermsLabel: '30 / 60 / 10',
      paymentMilestones: [
        { trigger: 'on_confirmation', percent: 30 },
        { trigger: 'on_delivery', percent: 60 },
        { trigger: 'on_inspection', percent: 10 },
      ],
      itemsCovered: 3,
      itemsTotal: 3,
      shipment: { deliverTo: 'Gulf Property Group, Jeddah' },
      issuedAt: at(-1, 11, 20),
    },
    // CANCELLATION REQUESTED — the buyer wants out BEFORE the supplier accepts, which is the only
    // point at which a cancellation can be asked for (SoT §12). Nothing changes until the supplier
    // answers: consent cancels the order, refusing leaves it to be accepted or declined as normal.
    {
      id: 'ORD-2026-0086',
      poNumber: 'PO-2026-0086',
      rfqReference: 'RFQ-2026-0140',
      rfqId: 'RFQ-2026-0140',
      offerVersion: 2,
      agreedTotalSar: 78200,
      title: 'Water Tanks, GRP',
      status: 'awaiting_acceptance',
      buyer: DESERT,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [
        { description: 'GRP water tank 10m³', quantity: 8, unit: 'unit', unitPriceSar: 7300, deliveryDate: at(12) },
        { description: 'Tank base frame', quantity: 8, unit: 'set', unitPriceSar: 2475, deliveryDate: at(12) },
      ],
      paymentTermsLabel: '50 / 50',
      paymentMilestones: [
        { trigger: 'on_confirmation', percent: 50 },
        { trigger: 'on_delivery', percent: 50 },
      ],
      itemsCovered: 2,
      itemsTotal: 2,
      shipment: { deliverTo: 'Desert Logistics depot, Dammam' },
      issuedAt: at(-2, 9, 40),
      cancellationRequest: {
        reasonTag: 'budget_withdrawn',
        note: 'Our capital budget for this quarter has been withdrawn. We expect to reissue this requirement in Q4 and would welcome your bid again.',
        requestedByName: 'Sara Al-Dossary, Buyer',
        requestedAt: at(0, -2, 12),
      },
    },
    // IN FULFILMENT — accepted, dispatched, the supplier owes shipment updates.
    {
      id: 'ORD-2026-0080',
      poNumber: 'PO-2026-0080',
      rfqReference: 'RFQ-2026-0129',
      rfqId: 'RFQ-2026-0129',
      offerVersion: 2,
      title: 'Steel Pipes, API 5L',
      status: 'in_transit',
      buyer: RIYADH_WORKS,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [
        { description: 'Steel pipe 6in', quantity: 860, unit: 'm', unitPriceSar: 148, deliveryDate: at(6) },
        { description: 'Steel pipe 8in', quantity: 570, unit: 'm', unitPriceSar: 212, deliveryDate: at(6) },
        { description: 'Weld neck flange 6in', quantity: 340, unit: 'pcs', unitPriceSar: 240, deliveryDate: at(8) },
      ],
      paymentTermsLabel: '30 / 70',
      paymentMilestones: [
        { trigger: 'on_confirmation', percent: 30 },
        { trigger: 'on_delivery', percent: 70 },
      ],
      shipment: {
        dispatchedAt: at(-2, 8, 15),
        expectedArrival: at(3),
        method: 'Own fleet · 3 vehicles',
        reference: 'DN-88214 / DN-88215 / DN-88216',
        statusNote: 'Dispatched, in transit',
        deliverTo: 'Riyadh Works Co., Riyadh',
      },
      issuedAt: at(-7, 9, 30),
      acceptedAt: at(-7, 14, 5),
    },
    // CANCELLATION REQUESTED — accepted, dispatched, and the buyer now wants out.
    {
      id: 'ORD-2026-0076',
      poNumber: 'PO-2026-0076',
      rfqReference: 'RFQ-2026-0126',
      rfqId: 'RFQ-2026-0126',
      offerVersion: 1,
      title: 'Uniforms, 300 Sets',
      status: 'in_transit',
      buyer: DESERT,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [
        { description: 'Coverall, 2-piece', quantity: 300, unit: 'set', unitPriceSar: 185, deliveryDate: at(5) },
        { description: 'Safety boots', quantity: 300, unit: 'pr', unitPriceSar: 240, deliveryDate: at(5) },
      ],
      paymentTermsLabel: '30 / 60 / 10',
      shipment: {
        dispatchedAt: at(-1, 9, 0),
        expectedArrival: at(4),
        method: 'Own fleet · 2 vehicles',
        reference: 'DN-90114 / DN-90115',
        statusNote: 'Dispatched, in transit',
        deliverTo: 'Desert Logistics depot, Dammam',
      },
      issuedAt: at(-6, 10, 0),
      acceptedAt: at(-6, 15, 30),
    },
    // CLOSED (two) and CANCELLED (one) — history the supplier can read but not act on.
    {
      id: 'ORD-2026-0064',
      poNumber: 'PO-2026-0064',
      rfqReference: 'RFQ-2026-0119',
      rfqId: 'RFQ-2026-0119',
      offerVersion: 1,
      title: 'Rebar spacers, 25mm',
      status: 'closed',
      buyer: RIYADH_WORKS,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [{ description: 'Rebar spacers, plastic 25mm', quantity: 1200, unit: 'box', unitPriceSar: 13.33 }],
      paymentTermsLabel: '30 / 70',
      shipment: {
        dispatchedAt: at(-24, 8, 0),
        expectedArrival: at(-18),
        deliveredAt: at(-18, 10, 30),
        method: 'Own fleet',
        reference: 'DN-71880',
        deliverTo: 'Riyadh Works Co., Riyadh',
      },
      issuedAt: at(-28, 10, 0),
      acceptedAt: at(-28, 13, 0),
      closedAt: at(-17, 9, 0),
    },
    {
      id: 'ORD-2026-0060',
      poNumber: 'PO-2026-0060',
      rfqReference: 'RFQ-2026-0115',
      rfqId: 'RFQ-2026-0115',
      offerVersion: 2,
      title: 'Binding wire, galvanised',
      status: 'closed',
      buyer: GULF,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [{ description: 'Binding wire 1.6mm, 25kg coil', quantity: 1750, unit: 'coil', unitPriceSar: 47.9 }],
      paymentTermsLabel: '50 / 50',
      shipment: {
        dispatchedAt: at(-40, 8, 0),
        expectedArrival: at(-34),
        deliveredAt: at(-34, 11, 0),
        method: 'Third-party freight',
        reference: 'DN-70551',
        deliverTo: 'Gulf Property Group, Jeddah',
      },
      issuedAt: at(-44, 11, 0),
      acceptedAt: at(-44, 16, 0),
      closedAt: at(-33, 10, 0),
    },
    {
      id: 'ORD-2026-0055',
      poNumber: 'PO-2026-0055',
      rfqReference: 'RFQ-2026-0110',
      rfqId: 'RFQ-2026-0110',
      offerVersion: 1,
      title: 'Steel plate, 10mm',
      status: 'cancelled',
      buyer: RIYADH_WORKS,
      supplier: us,
      supplierShort: 'Al-Rajhi Steel',
      lines: [{ description: 'Steel plate 10mm, S275', quantity: 500, unit: 'sheet', unitPriceSar: 382.6 }],
      paymentTermsLabel: '30 / 70',
      shipment: { deliverTo: 'Riyadh Works Co., Riyadh' },
      issuedAt: at(-26, 9, 0),
      cancelledAt: at(-25, 14, 0),
      cancelReason: 'requirement_changed',
      cancelNote: 'The structural design changed and this plate specification is no longer required.',
    },
  ]
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
  /** The BUYER's orders — the store holds both sides, so each view filters to its own party. */
  listOrders(): Promise<Order[]> {
    const records = ensureSeeded().filter((order) => order.buyer.name === BUYER.name)
    return delay(records.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)))
  },

  /** The signed-in SUPPLIER's orders — everything they have won. */
  listSupplierOrders(): Promise<Order[]> {
    const records = ensureSeeded().filter((order) => order.supplier.name === SUPPLIER_ORG_NAME)
    return delay(records.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)))
  },

  /** Accept the purchase order — binding, and it locks the terms to the agreed offer version. */
  acceptPurchaseOrder(id: string): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(upsert({ ...order, status: 'in_transit', acceptedAt: new Date().toISOString() }))
  },

  /** Decline the purchase order — it ends there and the buyer is told why. */
  declinePurchaseOrder(id: string, reasonTag: string, note: string): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(
      upsert({
        ...order,
        status: 'declined',
        declinedAt: new Date().toISOString(),
        declineReasonTag: reasonTag,
        declineReason: note,
      }),
    )
  },


  /** Save a shipment update — the buyer sees it on their order immediately. */
  saveShipment(id: string, shipment: Shipment): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    return delay(upsert({ ...order, shipment: { ...order.shipment, ...shipment } }))
  },

  /** Mark delivered — the order closes only once the BUYER confirms receipt. */
  markDelivered(id: string): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order) return Promise.reject(new Error('Order not found'))
    const deliveredAt = new Date().toISOString()
    return delay(upsert({ ...order, status: 'delivered', shipment: { ...order.shipment, deliveredAt } }))
  },

  /**
   * Answer the buyer's cancellation request. Agreeing cancels the order; declining leaves it
   * binding and in fulfilment — an accepted order cannot be cancelled one-sidedly.
   */
  answerCancellation(id: string, outcome: 'agreed' | 'declined'): Promise<Order> {
    const order = readStore().find((o) => o.id === id)
    if (!order?.cancellationRequest) return Promise.reject(new Error('No cancellation request'))
    const respondedAt = new Date().toISOString()
    return delay(
      upsert({
        ...order,
        status: outcome === 'agreed' ? 'cancelled' : order.status,
        cancelledAt: outcome === 'agreed' ? respondedAt : order.cancelledAt,
        cancelReason: outcome === 'agreed' ? order.cancellationRequest.reasonTag : order.cancelReason,
        cancelNote: outcome === 'agreed' ? order.cancellationRequest.note : order.cancelNote,
        cancellationRequest: { ...order.cancellationRequest, outcome, respondedAt },
      }),
    )
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

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE LINE ITEMS — what a seeded RFQ is actually asking for.
 *
 * Demo RFQs carry no line items of their own, so they are filled from the pool whose
 * subject matches the RFQ's title and category. Each item carries a representative
 * quantity and unit price, which is what keeps a 12-month maintenance contract reading
 * as "4 visits + 12 months" rather than "11,900 units of Primary supply", and keeps the
 * bid totals in a believable range for what is being bought.
 *
 * Only the FALLBACK pool is generic. An RFQ the buyer created has its own line items and
 * never reaches here.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SampleItem {
  name: string
  specification: string
  unit: string
  /** Representative quantity — jittered slightly per RFQ so bids differ. */
  qty: number
  /** Representative VAT-inclusive unit price in SAR. */
  price: number
}

interface Pool {
  /** Matched against "<category> <title>", lower-cased. First match wins, so order by specificity. */
  match: RegExp
  items: SampleItem[]
}

const POOLS: Pool[] = [
  {
    match: /coupler/,
    items: [
      { name: 'Rebar coupler 16mm', specification: 'Parallel thread, Type 2', unit: 'pcs', qty: 6000, price: 9.4 },
      { name: 'Rebar coupler 20mm', specification: 'Parallel thread, Type 2', unit: 'pcs', qty: 4500, price: 12.8 },
      { name: 'Rebar coupler 25mm', specification: 'Parallel thread, Type 2', unit: 'pcs', qty: 2000, price: 18.5 },
      { name: 'Threading service', specification: 'On-site, per bar end', unit: 'pcs', qty: 12500, price: 2.2 },
      { name: 'Coupler wrench set', specification: 'Calibrated torque', unit: 'set', qty: 12, price: 640 },
    ],
  },
  {
    match: /racking|pallet|warehouse/,
    items: [
      { name: 'Upright frame 6m', specification: 'Galvanised, 1100mm depth', unit: 'pcs', qty: 240, price: 780 },
      { name: 'Beam 2700mm', specification: 'Box beam, 2,500kg UDL', unit: 'pcs', qty: 960, price: 165 },
      { name: 'Wire mesh deck', specification: '900×1100mm, welded', unit: 'pcs', qty: 960, price: 92 },
      { name: 'Column guard', specification: 'Bolt-down, 400mm', unit: 'pcs', qty: 120, price: 145 },
      { name: 'Installation & load test', specification: 'Certified, per bay', unit: 'bay', qty: 240, price: 210 },
    ],
  },
  {
    match: /scaffold/,
    items: [
      { name: 'Standard 3m', specification: 'Cuplock, galvanised', unit: 'pcs', qty: 600, price: 96 },
      { name: 'Ledger 2.5m', specification: 'Cuplock, galvanised', unit: 'pcs', qty: 900, price: 68 },
      { name: 'Steel plank 2.5m', specification: 'Perforated, anti-slip', unit: 'pcs', qty: 1200, price: 74 },
      { name: 'Base jack', specification: 'Adjustable, 600mm', unit: 'pcs', qty: 600, price: 42 },
      { name: 'Erection & dismantling', specification: 'Certified crew, per month', unit: 'month', qty: 6, price: 18500 },
    ],
  },
  {
    match: /rebar|steel rebar|construction|building materials/,
    items: [
      { name: 'Steel rebar 12mm', specification: 'ASTM A615 Grade 60', unit: 'pcs', qty: 4000, price: 2.85 },
      { name: 'Steel rebar 16mm', specification: 'ASTM A615 Grade 60', unit: 'pcs', qty: 3500, price: 3.4 },
      { name: 'Steel rebar 20mm', specification: 'ASTM A615 Grade 60', unit: 'pcs', qty: 2500, price: 4.15 },
      { name: 'Binding wire 1.6mm', specification: 'Galvanised, 25kg coil', unit: 'coil', qty: 1200, price: 48 },
      { name: 'Rebar spacers', specification: 'Plastic, 25mm cover', unit: 'box', qty: 800, price: 12 },
    ],
  },
  {
    match: /cement|concrete|aggregate/,
    items: [
      { name: 'Portland cement OPC 43', specification: 'SASO GSO 1914, 50kg bag', unit: 'bag', qty: 2400, price: 16.5 },
      { name: 'Ready-mix concrete C30', specification: 'Pumped, 120mm slump', unit: 'm³', qty: 600, price: 285 },
      { name: 'Washed sand', specification: 'Zone II, chloride tested', unit: 'm³', qty: 450, price: 78 },
      { name: 'Aggregate 20mm', specification: 'Crushed, washed', unit: 'm³', qty: 600, price: 92 },
      { name: 'Plasticiser admixture', specification: 'ASTM C494 Type F, 200L', unit: 'drum', qty: 120, price: 640 },
    ],
  },
  {
    match: /pipe|api 5l|metals|fabrication/,
    items: [
      { name: 'Steel pipe 6in', specification: 'API 5L Grade B, SCH 40', unit: 'm', qty: 900, price: 148 },
      { name: 'Steel pipe 8in', specification: 'API 5L Grade B, SCH 40', unit: 'm', qty: 600, price: 212 },
      { name: 'Elbow 90°, 6in', specification: 'ASME B16.9, butt weld', unit: 'pcs', qty: 240, price: 165 },
      { name: 'Weld neck flange 6in', specification: 'ASME B16.5, 150#', unit: 'pcs', qty: 320, price: 240 },
      { name: 'Gasket & bolt set', specification: 'Spiral wound, per joint', unit: 'set', qty: 320, price: 96 },
    ],
  },
  {
    match: /hvac|maintenance/,
    items: [
      { name: 'Preventive maintenance', specification: 'Quarterly, all AHU and chillers', unit: 'visit', qty: 4, price: 56000 },
      { name: 'Filter replacement', specification: 'MERV 13, monthly', unit: 'month', qty: 12, price: 8500 },
      { name: 'Emergency call-out cover', specification: '4-hour response, 24/7', unit: 'month', qty: 12, price: 2500 },
    ],
  },
  {
    match: /catering|food|beverage|canteen/,
    items: [
      { name: 'Hot lunch service', specification: '250 covers, 5 days a week', unit: 'cover', qty: 5000, price: 27 },
      { name: 'Breakfast service', specification: '250 covers, 5 days a week', unit: 'cover', qty: 5000, price: 14 },
      { name: 'Beverage station', specification: 'Stocked and serviced daily', unit: 'month', qty: 12, price: 6400 },
      { name: 'Disposables & consumables', specification: 'Biodegradable, monthly', unit: 'month', qty: 12, price: 3800 },
    ],
  },
  {
    match: /cleaning|janitorial/,
    items: [
      { name: 'Daily office cleaning', specification: '6 staff, 5 days a week', unit: 'month', qty: 12, price: 24500 },
      { name: 'Deep clean', specification: 'Quarterly, all floors', unit: 'visit', qty: 4, price: 18000 },
      { name: 'Window cleaning', specification: 'External, monthly', unit: 'visit', qty: 12, price: 4200 },
      { name: 'Consumables restock', specification: 'Washroom and pantry', unit: 'month', qty: 12, price: 5600 },
    ],
  },
  {
    match: /water|tank|wastewater/,
    items: [
      { name: 'GRP water tank 10 m³', specification: 'Sectional, food grade', unit: 'unit', qty: 12, price: 9800 },
      { name: 'GRP water tank 25 m³', specification: 'Sectional, food grade', unit: 'unit', qty: 6, price: 21500 },
      { name: 'Float valve assembly', specification: 'Brass, 2in', unit: 'set', qty: 18, price: 640 },
      { name: 'Insulation jacket', specification: '50mm, UV stable', unit: 'set', qty: 18, price: 1850 },
      { name: 'Installation & commissioning', specification: 'Per tank, certified', unit: 'unit', qty: 18, price: 2400 },
    ],
  },
  {
    match: /furniture|fixtures|workstation/,
    items: [
      { name: 'Desk 1600×800', specification: 'Oak veneer, cable port', unit: 'pcs', qty: 120, price: 780 },
      { name: 'Task chair, mesh back', specification: 'Adjustable lumbar, 5-year', unit: 'pcs', qty: 120, price: 520 },
      { name: 'Pedestal unit, 3-drawer', specification: 'Lockable, mobile', unit: 'pcs', qty: 120, price: 245 },
      { name: 'Monitor arm, dual', specification: 'Gas spring, VESA 100', unit: 'pcs', qty: 120, price: 310 },
      { name: 'Acoustic desk screen', specification: '1600mm, PET felt', unit: 'pcs', qty: 120, price: 165 },
    ],
  },
  {
    match: /it,|networking|software|server/,
    items: [
      { name: 'Access switch, 48-port', specification: 'PoE+, 10G uplinks', unit: 'pcs', qty: 24, price: 7400 },
      { name: 'Wireless access point', specification: 'Wi-Fi 6E, ceiling mount', unit: 'pcs', qty: 120, price: 1450 },
      { name: 'SFP+ module', specification: '10G, multimode', unit: 'pcs', qty: 48, price: 380 },
      { name: 'Structured cabling drop', specification: 'Cat6A, tested and certified', unit: 'drop', qty: 600, price: 165 },
      { name: 'Support licence, 3-year', specification: '24/7 with hardware cover', unit: 'licence', qty: 24, price: 2100 },
    ],
  },
  {
    match: /safety|ppe|security|fire/,
    items: [
      { name: 'Safety helmet, vented', specification: 'EN 397, with chinstrap', unit: 'pcs', qty: 900, price: 26 },
      { name: 'Safety goggles, anti-fog', specification: 'EN 166 1F', unit: 'pcs', qty: 900, price: 12 },
      { name: 'Hi-vis vest, class 2', specification: 'EN ISO 20471', unit: 'pcs', qty: 750, price: 19 },
      { name: 'Cut-resistant gloves L5', specification: 'EN 388 4X43C', unit: 'pr', qty: 600, price: 14.5 },
      { name: 'Ear defenders, 30dB', specification: 'EN 352-1', unit: 'pcs', qty: 300, price: 22 },
    ],
  },
  {
    match: /generator|machinery|heavy equipment/,
    items: [
      { name: 'Diesel generator 500 kVA', specification: 'Prime rating, Stage IIIA', unit: 'unit', qty: 4, price: 245000 },
      { name: 'Automatic transfer switch', specification: '800A, 4-pole', unit: 'unit', qty: 4, price: 28500 },
      { name: 'Fuel day tank', specification: '1,000L, bunded', unit: 'unit', qty: 4, price: 12400 },
      { name: 'Acoustic canopy', specification: '75 dB(A) at 1m', unit: 'unit', qty: 4, price: 34000 },
      { name: 'Commissioning & load bank test', specification: '8-hour, certified', unit: 'unit', qty: 4, price: 9600 },
    ],
  },
  {
    match: /tyre|vehicle|automotive|fleet/,
    items: [
      { name: 'Tyre 315/80R22.5', specification: 'Steer axle, 3PMSF', unit: 'pcs', qty: 240, price: 1450 },
      { name: 'Tyre 295/80R22.5', specification: 'Drive axle, deep tread', unit: 'pcs', qty: 180, price: 1620 },
      { name: 'Valve & balance kit', specification: 'Per wheel', unit: 'set', qty: 420, price: 85 },
      { name: 'Fitting & disposal', specification: 'On-site, per wheel', unit: 'unit', qty: 420, price: 65 },
    ],
  },
  {
    match: /uniform|textile|clothing/,
    items: [
      { name: 'Coverall, 2-piece', specification: 'FR cotton, embroidered', unit: 'set', qty: 300, price: 185 },
      { name: 'Safety boots', specification: 'S3 SRC, composite toe', unit: 'pr', qty: 300, price: 240 },
      { name: 'Cap, embroidered', specification: 'Cotton twill', unit: 'pcs', qty: 300, price: 32 },
      { name: 'Winter jacket', specification: 'Hi-vis, quilted lining', unit: 'pcs', qty: 150, price: 310 },
    ],
  },
  {
    match: /consult|professional|audit|advisory/,
    items: [
      { name: 'Process discovery', specification: 'Interviews and as-is mapping', unit: 'phase', qty: 1, price: 86000 },
      { name: 'Gap analysis report', specification: 'Against ISO 9001 and internal policy', unit: 'report', qty: 1, price: 64000 },
      { name: 'Workshop facilitation', specification: 'Full-day, on-site', unit: 'day', qty: 6, price: 12500 },
      { name: 'Implementation roadmap', specification: '18-month, costed', unit: 'report', qty: 1, price: 48000 },
    ],
  },
  {
    match: /mro|spare parts|forklift/,
    items: [
      { name: 'Hydraulic filter', specification: 'OEM, 10 micron', unit: 'pcs', qty: 120, price: 185 },
      { name: 'Drive wheel', specification: 'Polyurethane, 343×114', unit: 'pcs', qty: 48, price: 640 },
      { name: 'Fork carriage roller', specification: 'Sealed bearing', unit: 'pcs', qty: 96, price: 210 },
      { name: 'Traction battery cell', specification: '2V 620Ah', unit: 'pcs', qty: 24, price: 1150 },
      { name: 'Seal kit', specification: 'Mast cylinder, complete', unit: 'set', qty: 60, price: 340 },
    ],
  },
  {
    match: /solar|renewable|panel/,
    items: [
      { name: 'PV panel 550W', specification: 'Monocrystalline, bifacial', unit: 'pcs', qty: 600, price: 620 },
      { name: 'String inverter 100kW', specification: 'IP66, with monitoring', unit: 'unit', qty: 6, price: 34000 },
      { name: 'Mounting rail', specification: 'Anodised aluminium, 4.4m', unit: 'm', qty: 1200, price: 78 },
      { name: 'DC cabling', specification: '6mm² solar cable, UV rated', unit: 'm', qty: 2400, price: 14 },
    ],
  },
  {
    match: /stationery|office supplies/,
    items: [
      { name: 'A4 paper, 5-ream box', specification: '80gsm, FSC certified', unit: 'box', qty: 240, price: 82 },
      { name: 'Toner cartridge', specification: 'OEM, high yield', unit: 'pcs', qty: 60, price: 410 },
      { name: 'Notebook, A5', specification: 'Hardback, 160 pages', unit: 'pcs', qty: 600, price: 18 },
      { name: 'Desk organiser', specification: 'Mesh, 5-compartment', unit: 'pcs', qty: 120, price: 46 },
    ],
  },
  {
    match: /laboratory|medical|lab /,
    items: [
      { name: 'Benchtop centrifuge', specification: '15,000 rpm, refrigerated', unit: 'unit', qty: 4, price: 38500 },
      { name: 'Analytical balance', specification: '0.1mg, internal calibration', unit: 'unit', qty: 6, price: 14200 },
      { name: 'Fume hood', specification: '1500mm, ducted', unit: 'unit', qty: 3, price: 42000 },
      { name: 'Consumables pack', specification: 'Pipette tips and tubes', unit: 'box', qty: 120, price: 320 },
    ],
  },
]

/** Used only when nothing matches — a buyer-created RFQ brings its own items and never lands here. */
const FALLBACK: SampleItem[] = [
  { name: 'Primary supply', specification: 'Per attached spec sheet', unit: 'units', qty: 1200, price: 42 },
  { name: 'Secondary supply', specification: 'Grade A', unit: 'units', qty: 800, price: 28 },
  { name: 'Consumables pack', specification: 'Standard issue', unit: 'box', qty: 240, price: 65 },
  { name: 'Spare parts kit', specification: 'OEM', unit: 'set', qty: 60, price: 480 },
  { name: 'Installation accessories', specification: 'Complete set', unit: 'set', qty: 60, price: 190 },
]

/** The items a seeded RFQ is asking for, chosen by what its title and category describe. */
export function sampleItemsFor(categoryLabel: string, title: string): SampleItem[] {
  const key = `${categoryLabel} ${title}`.toLowerCase()
  return POOLS.find((pool) => pool.match.test(key))?.items ?? FALLBACK
}

/** Every sample item across every pool — used to price them back by name. */
export function allSampleItems(): SampleItem[] {
  return [...POOLS.flatMap((pool) => pool.items), ...FALLBACK]
}

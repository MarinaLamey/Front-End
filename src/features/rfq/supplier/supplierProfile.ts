/* ────────────────────────────────────────────────────────────────────────────
 * SUPPLIER PROFILE — the signed-in supplier organisation (mock).
 *
 * Stands in for the registration record the BFF will serve: the categories and
 * delivery regions that decide what "Matched" means, and the certificates already
 * on file that the bid form offers as attachments. One persona per session.
 * ──────────────────────────────────────────────────────────────────────────── */

/** A document already on file at registration — offered on the bid form, never re-uploaded. */
export interface SavedDocument {
  name: string
  sizeKb: number
  /** The required-certification name this document satisfies. */
  certifies: string
}

export interface SupplierProfile {
  /** Sourcing categories the organisation registered under — drives the Matched tab. */
  categories: string[]
  /** Delivery regions served — drives Browse all (every live RFQ delivering into one of these). */
  regions: string[]
  city: string
  savedDocuments: SavedDocument[]
}

/**
 * The signed-in supplier. Categories deliberately cover roughly half the seeded RFQ set so
 * Matched reads as a genuine subset of Browse all rather than a copy of it.
 */
export const SUPPLIER_PROFILE: SupplierProfile = {
  categories: [
    'Construction & building materials',
    'Cement, concrete & aggregates',
    'Steel, metals & fabrication',
    'Safety, security & PPE',
    'Facility management services',
    'Furniture & fixtures',
    'Vehicles & automotive parts',
  ],
  regions: ['Riyadh', 'Makkah', 'Eastern Province'],
  city: 'Riyadh',
  savedDocuments: [
    { name: 'ISO_9001_2026.pdf', sizeKb: 210, certifies: 'ISO 9001' },
    { name: 'SASO_conformity_2026.pdf', sizeKb: 180, certifies: 'SASO Conformity' },
    { name: 'Mill_test_certificate_batch_A.pdf', sizeKb: 240, certifies: 'Mill test certificate' },
  ],
}

/** True when the supplier already holds a document covering this required certification. */
export function hasCertificateOnFile(certification: string): boolean {
  return SUPPLIER_PROFILE.savedDocuments.some((doc) => doc.certifies === certification)
}

/** The documents that would satisfy an RFQ's required certifications, in the RFQ's own order. */
export function documentsFor(certifications: string[]): SavedDocument[] {
  return certifications
    .map((cert) => SUPPLIER_PROFILE.savedDocuments.find((doc) => doc.certifies === cert))
    .filter((doc): doc is SavedDocument => doc !== undefined)
}

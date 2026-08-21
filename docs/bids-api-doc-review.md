# Bids API Documentation Review — endpoint by endpoint

**Reviewed 2026-08-21.** Analysis only — no code written, nothing probed live.

| # | Source | Short name |
|---|---|---|
| A | `Bids doc.pdf` — "Miproc — Bids API", document version 1.0, 14 Aug 2026 | **DOC** |
| B | `bids postmanclollection.json` — "Miproc – Bids API", schema v2.1.0 | **COLLECTION** |
| C | This repo: `src/features/rfq/**` (MI-Proc mock) + `myapp-frontend-new/src/features/rfq/**` | **FE** |

> **Framing.** DOC's own control table says *"Matches deployed code: **Not verified**. Documented
> from the Postman collection, not from a running environment."* Every prior module told the same
> story and then diverged on contact with the wire: the RFQ guide was wrong about the create path,
> the response envelope, the error shape and the status vocabulary
> (`docs/rfq-api-doc-review.md`), and the dashboard doc was wrong about the profile block and the
> 403 body (`docs/dashboard-api-doc-review.md`). **Treat everything below as a hypothesis until a
> live probe confirms it.** DOC also carries its own 15 open items and marks 6 of 8
> Definition-of-Done rows Partial/Not-verified, including *"Frontend has enough information to
> integrate without guessing: **Not yet**"*.

---

## PART 1 — CONTRACT EXTRACTION

### Cross-cutting conventions

| Topic | DOC says | FE reality |
|---|---|---|
| Base URL | `https://localhost:5001` (collection var); shared env URL "must be supplied by Backend at handover" | `apiClient` uses same-origin `/api`, proxied. No change needed — but the deployed host must be confirmed. |
| Auth | JWT **Bearer** on every endpoint | Web is **cookie-first** (HttpOnly `access_token`); the login body token is `""` by design. `apiClient` sends the cookie via `withCredentials` and attaches a Bearer only if one is in memory. Works either way — but DOC never mentions the cookie model. |
| Caller identity | JWT **plus** an explicit `supplierId` / `buyerUserId` on **every** endpoint | **FE has no source for either UUID.** `/auth/me` describes the person only; `orgIdentity.ts` states this explicitly. `GET /onboarding/resume` returns `id` (onboarding profile) and `identityUserId` — whether either is the expected value is unknown. DOC's own Open item 1 calls this "the highest-priority item" and an IDOR. |
| Errors | `application/problem+json` `{type,title,status,detail}` | Plausible for 400/404. But on this backend **401/403 return an EMPTY `text/html` body** (verified live during the dashboard work, in both directions). DOC exemplifies no 401/403/409/500 anywhere and warns not to assume they cannot occur. |
| Dates | ISO 8601, UTC `Z` | Matches — FE stores ISO strings throughout. ✅ |
| Ids | `uuid` | FE mock ids are `rfq_<uuid>` / seeded strings; opaque either way. ✅ |
| Money | plain decimal, 2 dp, **no currency field**, all SAR | FE formats with `formatSar` and assumes SAR. Same TEMPORARY assumption the dashboard carries. DOC Open item 10 asks for a currency field. |
| VAT | **INCLUSIVE.** `subtotal = round(total/1.15, 2)`, `vat = total − subtotal`, "the bid composer must not multiply by 1.15" | **Exact match** with `src/features/rfq/vat.ts` (inclusive since 15 Aug 2026) and the `bid-vat-rule` decision. ✅ The single largest thing that could have gone wrong, and it did not. |
| Pagination | `pageNumber` (1-based, default 1), `pageSize` (default 25), max not stated | Only `available-rfqs` echoes `pageNumber`/`pageSize`. `my-bids` and `buyer/bids` return `total` only — DOC itself calls this out as unpageable. FE currently paginates **nothing** on any bid surface; it filters/sorts the whole store client-side. |
| Anonymity | labels until award commit; award response is the first payload carrying a real `supplierId` | FE reveals at award **AND purchase-order acceptance** (`src/features/rfq/identity.ts`, CLAUDE.md constraint #5). **Contradiction — see D-12.** |

### Supplier endpoints (`/api/bids/*`, role `Supplier | BuyerAndSupplier`)

**1. `GET /api/bids/available-rfqs`**
Query: `supplierId` (uuid, **required**), `tab` (`BrowseAll|Matched|Declined`, default BrowseAll), `search`, `category`, `deliveryRegion`, `closingBefore` (ISO), `sort` (**keys not stated**), `pageNumber`, `pageSize`.
Returns: `{tab, total, pageNumber, pageSize, items[]}`; item = `{rfqId, number, title, closingDate, deliveryRegion, lineItemCount, isMatched}`.
Codes: 200; 401/403 assumed, not documented.
Limits: no bid count by design ✅. **Browse-all and Matched are both BLOCKED — "supplier delivery regions are not yet modelled in the database".** Match-reason strings and the percentage match are not returned.

**2. `GET /api/bids/available-rfqs/{rfqId}`**
Path `rfqId`; query `supplierId` (required).
Returns: `{rfqId, number, title, buyerLabel, closingDate, requiredDeliveryDate, paymentPlan, requirementsAndCriteria, requiredCertifications, items[]}`; item = `{rfqItemId, lineNumber, description, specification, quantity, unitOfMeasure, neededBy}`.
Codes: 200; 404 problem+json (`Entity "Rfq" (id) was not found`) — also returned when simply *not visible to this supplier*; 401/403 undocumented.
Limits: `paymentPlan` is an **opaque code** (`"PlanA"`) with no stated mapping to percentages; `requiredCertifications` is a **comma-joined string** with no per-cert on-file state; the buyer's notes (RFQ description) and the payment terms as percentages **do not appear at all**.

**3. `GET /api/bids/my-bids`**
Query: `supplierId` (required), `tab` (only `All` exemplified; accepted values **not stated**), `pageNumber`, `pageSize`.
Returns: `{tab, total, items[]}` — **no page echo**; item = `{quotationId, rfqId, rfqNumber, rfqTitle, status, bidTotal, submittedAt, closingDate}`.
Limits: last-activity not returned. Declined/Withdrawn/Expired/Cancelled have no tab and live under All.

**4. `GET /api/bids/rfq/{rfqId}/my-bid`**
Path `rfqId`; query `supplierId`.
Returns: `{quotationId, rfqId, status, bidTotal, bidValidUntil, paymentTermsResponse, notes, lines[], attachments[]}`; line = `{quotationItemId, rfqItemId, description, unitOfMeasure, requestedQuantity, quantity, unitPrice, isIncluded, proposedDeliveryDate}`.
Codes: 200; **204 = no bid yet, empty body — must be read as "no bid", not an error**; 401/403/404 undocumented.
Limits: unique index on `(RfqId, SupplierId)` — one bid per pair ✅ matches FE. `attachments[]` element shape is **undocumented** (assumed to match §9's response). Subtotal/VAT not returned (derived).

**5. `POST /api/bids/rfq/{rfqId}/draft`** — upsert, always 200 (never 201).
Body: `supplierId`, `lines[]` (`rfqItemId`, `isIncluded`, `quantity`, `unitPrice`, `proposedDeliveryDate` — all required per line), `bidValidUntil`, `paymentTermsResponse` (**required, free text**), `notes` (optional, max 2000).
Returns: `{quotationId, rfqId, status:"Draft", bidTotal, bidValidUntil, lines[]}`.
Codes: 200; 400 (conditions **not enumerated**).
Limits: `bidTotal` = Σ(qty × unitPrice) over included lines, server-computed. Draft expires when the RFQ closes, never auto-submits. **Lead time is out of the contract** — replaced by `proposedDeliveryDate`.

**6. `POST /api/bids/rfq/{rfqId}/submit`** — body identical to §5, `notes` nullable.
Returns: `{quotationId, rfqId, status:"Bidding", bidTotal, submittedAt}`.
Codes: 200; 400 "Bidding is closed for this RFQ" + unenumerated validation.
Limits: whole bid, not a delta. Attachments need a `quotationId`, so the real flow is **save draft → upload → submit**. No unilateral revision after submit — the buyer must open a negotiation, or the supplier withdraws. Offer dies at `min(bidValidUntil, RFQ closing)` ✅ matches FE.

**7. `POST /api/bids/rfq/{rfqId}/decline`** — query `supplierId`, no body. → 204.
Limits: creates no bid row. Behaviour when already declined / already bid / closed is **unspecified**. **No endpoint reverses a decline** despite the screen's "Bid anyway" (Open item 7).

**8. `POST /api/bids/{quotationId}/withdraw`** — query `supplierId`; body `{reason}` **20–500 chars**.
Returns: `{quotationId, status:"Withdrawn", withdrawReason}`. 400 on reason length.
Limits: reason shown to the buyer in full. No withdrawal timestamp in the response. A withdrawn bid cannot rejoin unless the buyer reopens — **that reopen path is not in this collection**.

**9. `POST /api/bids/{quotationId}/attachments`** — multipart, field `file`, query `supplierId`; **max 5 MB**; accepted content types and per-bid count **not stated**.
Returns: `{attachmentId, fileName, contentType, sizeBytes, uploadedAt}`. 400/413 on limit (code not documented).
Limits: **no `scrubbed` flag** (EXIF/author metadata can de-anonymise a supplier during comparison — backend has accepted this as an addition but the contract does not expose it); **no `source` field**, so a bid upload is indistinguishable from a wallet copy; **no endpoint for attaching a saved wallet certificate at all**, despite the "Choose from saved certificates" control on the bid form.

**10. `DELETE /api/bids/attachments/{attachmentId}`** — query `supplierId`. → 204; 400 behaviour post-submit/award/withdraw **not documented**. Path carries no `quotationId`, so ownership rests entirely on the query param.

### Buyer endpoints (`/api/buyer/bids/*`, role `Buyer | BuyerAndSupplier`)

**11. `GET /api/buyer/bids`** — query `buyerUserId` (required), `tab` (only `All` exemplified; SoT lists All/Submitted/Negotiation/Withdrawn/Declined/Expired/Won/Lost/Cancelled — **not stated**), `search`, `compliantOnly` (default false), `sort` (**keys not stated**), `pageNumber`, `pageSize`.
Returns: `{tab, total, items[]}` — **no page echo**; item = `{rfqId, rfqNumber, rfqTitle, status, bidsReceived, lowestBidTotal, closingDate, negotiatingCount}`.

**12. `GET /api/buyer/bids/rfq/{rfqId}/bidders`** — query `buyerUserId`.
Returns: `{rfqId, rfqNumber, identityNotice, bidders[]}`; bidder = `{quotationId, bidderLabel, statusChip, bidTotal, itemsCovered, itemsRequested, complianceLabel, submittedAt}`.
Codes: 200; 404 problem+json.
Limits: every row keyed by `quotationId`, so **a declined supplier cannot be represented** even though the buyer's screen shows declined rows (Open item 12). `complianceLabel` is a rendered string, not a pair of counts. Labels must be random per (RFQ, supplier), stable for the RFQ's life.

**13. `POST /api/buyer/bids/compare`** — query `buyerUserId`; body `{rfqId, quotationIds[], view: "Summary"|"LineByLine", includeInAward: bool}`.
Returns: `{rfqId, rfqNumber, rfqTitle, headerContext, identityNotice, view, columns[], lines[], compliance[], awardSummary}`.
`columns[]` = `{quotationId, bidderLabel, statusChip, bidTotal, differenceVsLowest, isLowestTotal, itemsCovered, itemsRequested, quantityCoveredPercent, quantityCoveredNote, latestDelivery, paymentTermsLabel, complianceLabel, complianceComplete, coverageChip, coverageChipKind, termsResponseLabel, actionLabel}`.
`lines[]` = `{lineNumber, description, unitOfMeasure, requestedQuantity, cells[{quotationId, isIncluded, unitPrice, quantity, proposedDeliveryDate, isBestUnitPrice, isShortQuantity}]}`.
`compliance[]` = `{requirementName, cells[{quotationId, status (free text), isSatisfied}]}`.
`awardSummary` = `{selectedSuppliers, coveredItems, totalItems, coveragePercent, agreedTotal, savingsVsOriginal, allocationLine, latestDelivery, canIssuePOs}`.
Limits: **POST for a read** — no caching, no bookmarkable URL. Compliance status is free text and unenumerated. `savingsVsOriginal` sums negotiated and untouched columns **on different bases** and does not say which offer version each column reflects. Heavy rendered-English payload. The Summary view is expected to carry negotiation rounds and saved-vs-original columns — **neither appears**.

**14. `POST /api/buyer/bids/award/preview`** — body `{rfqId, quotationIds[], view, includeInAward}`.
Returns: `{rfqId, rfqNumber, supplierCount, agreedTotal, confirmHeadline, confirmBody, confirmBullets[], allocations[], requiresComplianceOverride, canAward}`; allocation = `{quotationId, bidderLabel, provisionalPoNumber, amount, lineNumbers[], allocationLine, hasMissingCompliance, missingCertifications[]}`.
Limits: **the server computes the allocation** — nothing in the request says which lines go to which supplier. `provisionalPoNumber` is returned before commit and it is unstated whether it consumes the PO counter. No currency.

**15. `POST /api/buyer/bids/award`** — body `{rfqId, quotationIds[], overrides[]?}`; override = `{quotationId, reason (20–500), acceptResponsibility (must be true), riskLevel (**values not enumerated**)}`.
Returns: `{rfqId, rfqStatus, purchaseOrders[{purchaseOrderId, number, quotationId, supplierId, amount, lineNumbers[]}]}`.
Codes: 200; 400 missing override / bad reason / `acceptResponsibility:false`; 401/403/404/409 undocumented — **a second award on an already-awarded RFQ has no documented behaviour**.
Limits: awards **and** issues POs in one non-idempotent call — a retry after a timeout could raise a second set of POs. No accepted offer version, no `awardedAt`/`awardedBy`, no supplier primary contact.

---

## PART 2 — DEFECT LOG (FE impact)

### 🔴 BLOCKERS

- **D-1 · No source for `supplierId` / `buyerUserId`.** Required on all 15 endpoints. `/auth/me`
  carries the person only; nothing in FE holds a supplier tenant id. Until the backend takes the
  caller from the token (Open item 1), **no bid endpoint is callable at all.**
- **D-2 · Split award cannot be expressed.** `includeInAward` is one request-level boolean. FE's
  `CompareBidsPage` has a **per-column** "Include in award" checkbox and allocates lines locally
  (`award.ts → buildAwards`, lowest-unit-price-per-line). The contract cannot carry that intent,
  and the server's own allocation rule is undocumented. Either the rule is published and FE stops
  computing, or the request needs a per-line allocation array. Blocks Compare + Award.
- **D-3 · Award is not idempotent and carries no offer version.** A retry issues a second set of
  POs. FE's award card shows "from offer v3" and `RfqAward.offerVersion` feeds it; there is no
  field for it. Blocks the commit call.
- **D-4 · Negotiation is entirely absent.** Our `negotiating` bid status, the buyer and supplier
  negotiation inboxes, the whole append-only offer thread (`deriveNegotiation.ts`, `OfferVersion`)
  have **no endpoint anywhere in this collection** (Open item 14). Yet `buyer/bids` returns
  `negotiatingCount` and `my-bids`' tab list includes `Negotiation`. Half the bid lifecycle is
  unreachable.
- **D-5 · No bidding-rule data on the RFQ detail.** `bidRules.ts` gates Submit on
  `partialBidsAllowed`, `minItemsPerBid`, `maxItemsPerBid`, per-line `minQuantity`/`maxQuantity`
  and `partialDeliveryAllowed`. **None of the six is in the supplier RFQ-detail payload.** Client
  validation collapses to "≥1 priced line", and the 400 conditions are unenumerated, so the user
  learns the rule only by being refused.
- **D-6 · Two words for one status, and no enum anywhere.** Supplier `"Bidding"` vs buyer
  `"Submitted"` for the same bid. `statusChip` is explicitly a *display* string. RFQ status,
  bid status and every tab vocabulary are unenumerated. FE cannot build a `Record<Status, Tone>`
  map — and `MyBidsPage`'s `STATUS_TONE` is exactly that.

### 🟠 MAJOR

- **D-7 · Rendered English in the payload.** `headerContext` (with a relative "Closes in 3 days"),
  `identityNotice`, `confirmHeadline`/`confirmBody`/`confirmBullets`, `coverageChip`, `actionLabel`,
  `complianceLabel`, `allocationLine`, `paymentTermsLabel`, `termsResponseLabel`, compliance
  `status`. This app is bilingual with **full RTL** and every user-facing string must resolve
  through `en.ts`/`ar.ts`. Rendering these as-is puts English into the Arabic UI and hardcodes
  Gregorian relative time. Open item 9.
- **D-8 · Attachments do not match the bid form.** FE offers "Choose from saved certificates" from
  the registration wallet (`supplierProfile.savedDocuments`) and stores attachments as **names**.
  The API has only file upload, requires a `quotationId` first, and has **no wallet-attach
  endpoint**. Also no `scrubbed` flag — an unscrubbed PDF's metadata can de-anonymise the supplier
  to the buyer mid-comparison, which is a direct breach of the blind-marketplace rule.
- **D-9 · `paymentTermsResponse` is one free-text field.** FE holds `{paymentTermsLabel,
  paymentTermsKind: 'accepted'|'counter'}` and renders them separately. Round-tripping through
  `"Countered: 40/50/10"` is lossy, unparseable and English.
- **D-10 · `paymentPlan` is an opaque code.** The supplier detail screen renders the buyer's terms
  as percentages ("30 / 60 / 10"); `"PlanA"` has no published mapping.
- **D-11 · No un-decline endpoint.** `AvailableRfqsPage` has a working "Bid anyway" on the Declined
  tab. Nothing reverses a decline. Open item 7.
- **D-12 · Identity-reveal moment disagrees with ours.** DOC: the award-commit response is the
  first payload with a real `supplierId`. FE (`identity.ts`, CLAUDE.md constraint #5): identities
  are exchanged when the awarded supplier **accepts the purchase order** — the Award-confirmed page
  deliberately prints "Revealed on acceptance" for CR/VAT/address/contact, and that was a fixed
  identity-leak bug. Needs a product decision.
- **D-13 · Award response cannot rebuild `RfqAward`.** Provided: PO number, amount, `quotationId`,
  `supplierId`, `lineNumbers`. Missing: `awardedAt`, `bidderLabel`, the supplier identity block
  (company/CR/VAT/address/contact), `unsourcedItems`, `savedVsOriginalSar`, `offerVersion`,
  `negotiationRounds`, `deliveryDate`, `paymentTermsLabel`.
- **D-14 · Buyer bid-status chips have no source.** `BidsInboxPage` aggregates counts per **bid**
  status across all RFQs (all/submitted/negotiating/withdrawn/declined/expired). `buyer/bids`
  returns **RFQ** rows and no per-bid-status counts; getting them would mean one `/bidders` call
  per RFQ.
- **D-15 · Declined suppliers cannot appear on the buyer's list.** `bidders[]` is keyed by
  `quotationId` and a decline creates no bid row. Open item 12.
- **D-16 · Line identity is `rfqItemId`, ours is a 0-based index.** `SupplierBidLine.index`,
  `OfferLine.index`, `RfqAward.lineIndexes` and `Bid.unitPrices[]` are all positional. The API uses
  `rfqItemId` (uuid) on requests and `lineNumber` (**1-based**) on responses. Every write needs the
  RFQ detail in hand to translate, and `lineNumbers` must be shifted by one.

### 🟡 MINOR / WATCH

- **D-17** `my-bids` and `buyer/bids` accept paging but echo no page — unpageable as specified.
  FE paginates none of these lists today, so adopting server paging is itself a UI change.
- **D-18** `sort` keys unstated on all three lists. FE offers closing / newest / most-line-items;
  `newest` has no field on the available-RFQ item (no `createdAt`/`publishedAt`).
- **D-19** Available-RFQ rows carry no per-supplier bid state, no category, no total units and no
  status — all four are rendered on `OpportunityCard` today. Tab counts (`browsable`/`matched`/
  `declined`) would each need their own request.
- **D-20** `isMatched` is a boolean; FE's `matchReason` distinguishes `category` from
  `categoryAndRegion` and prints a different line for each.
- **D-21** `Bid.matchPct` (the "{{pct}}% match" chip) has no field anywhere. DOC says match
  percentage is deliberately not returned.
- **D-22** `Bid.validUntil` is never exposed to the buyer; only the supplier's own `my-bid`.
- **D-23** `riskLevel` is required on an override with **no enumerated values**; FE's
  `CompareOverrideDialog` collects only reason + accept-responsibility.
- **D-24** No currency on any amount (Open item 10). We assume SAR, as the dashboard does.
- **D-25** 401/403 bodies: DOC promises problem+json but exemplifies neither; this backend has been
  observed returning **empty `text/html`** on auth failures. The error parser must not read
  `data.title`.
- **D-26** `available-rfqs/{rfqId}` returns 404 once an RFQ is no longer visible to the supplier, so
  a won/lost bid screen may lose its RFQ context. `my-bid` + the `my-bids` row together carry
  enough (`rfqNumber`, `rfqTitle`, per-line description/unit/requestedQuantity) to render without it.

---

## PART 3 — STILL UNKNOWN (must be answered or probed)

1. What UUID is `supplierId` / `buyerUserId`, and where does the web client get it?
2. Every enum: bid status, RFQ status, all three `tab` vocabularies, compliance `status`,
   `riskLevel`, `coverageChipKind`, `paymentPlan`.
3. `sort` keys, and `pageSize` maximum.
4. `attachments[]` element shape on `my-bid`.
5. Are `category` / `deliveryRegion` filters ids or names? (Master data serves GUIDs.)
6. Accepted content types and per-bid file count for uploads.
7. Does saving a draft implicitly clear a decline?
8. Is a single line splittable by quantity, or are awards whole lines only?
9. Does `provisionalPoNumber` consume the PO counter?
10. What does a second award on an awarded RFQ do?
11. Which of close-early / extend / reopen-negotiation / notifications / the expiry sweep are out of
    scope versus simply unwritten?

---

## Addendum — collection v2 (`bidsproccollection (1).json`), reviewed 2026-08-21

### ✅ Fixed in the collection

| Item | Now |
|---|---|
| Certificate wallet | `GET` + `POST /api/bids/certificates` documented, with the `certificateId` variable |
| Attach from saved | `POST /api/bids/{quotationId}/attachments/from-saved` documented, body `{certificateId}` |
| `saveToWallet` | on the upload request, with the metadata-stripping note |
| Identity reveal, buyer side | `identityNotice` now reads *"Supplier identities stay hidden until they accept the purchase order."* — matches the platform rule |
| Award commit | `purchaseOrders[].supplierId: null`, plus a new `buyerBanner` field |
| Award preview copy | the old *"reveal your company details to them"* is gone; the bullets now say identities are revealed on acceptance |

That closes D-12 in the documentation as well as on the wire.

### ❌ Still stale — the collection does not match the deployed API

Verified against live captures the same day. A client built from these examples still breaks.

| Endpoint | Collection says | Deployed returns |
|---|---|---|
| Upload attachment | `attachmentId` | **`id`** — confirmed on both upload *and* from-saved in the same run |
| List available RFQs | 7 fields, `isMatched`, `{tab,total,pageNumber,pageSize}` | 17 fields, `matchReason` string, `{items,total,browseAllCount,matchedCount,declinedCount}` |
| RFQ detail (supplier) | `requiredCertifications` as a comma string; no bidding rules | an **array**, plus `status`, `rfqType`, `buyerCity`, `identityNotice`, `allowPartialBids`, `allowPartialDelivery`, `minItemsPerBid` |
| List my bids | `{tab,total,items}` | `{items,total,allCount,draftCount,biddingCount,negotiatingCount,wonCount,lostCount}` |
| my-bid / draft / submit / withdraw | 5–6 fields | ~30, incl. `currency`, `subtotal`, `vat`, `actions[]`, `bannerKind`, `rfqNumber`, `rfqTitle` |
| Withdraw 400 | "between 20 and 500 characters" | "must be at least 20 characters" |
| — | not documented | **`DELETE /api/bids/certificates/{certificateId}`** exists and returns 204 |
| `lines[].isIncluded: false` | "the line is kept" and still sent | sending it is a **500** — only included lines may be sent |

Our DTOs follow the deployed shapes, so nothing above needs a client change — but the collection
should be regenerated from the running API before anyone else integrates from it.

### Still unanswered by v2

1. **No `source` on the attachment** — re-checked live, still absent. Detach-vs-delete stays ambiguous.
2. **No download route** — `…/attachments/{id}/download` and `…/certificates/{id}/download` both 404.
3. **What the order payload carries once identity is revealed** — `supplierId` + `supplierDisplayName`
   are named, but `AwardConfirmedPage` renders company name, CR, VAT, address and contact.
4. Supplier bid read (`my-bid` / `my-bids`) — the blocker; unchanged.

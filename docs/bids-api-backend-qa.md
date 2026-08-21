# Bids API — Q&A sheet for the Backend team

**From:** Frontend · **Date:** 2026-08-21 · **Environment:** `https://dev-api-miproc.mi-mony.com`

Every question below was reproduced on the deployed dev build on 2026-08-21. Anything already fixed
has been left out — see "Already resolved" at the bottom so nothing is re-investigated.

**Please answer inline on the `Answer:` line under each question.** Evidence and full captures:
`docs/bids-api-live-test-results.md`. Contract diffs: `docs/bids-api-doc-review.md`.

## Triage

| # | Question | Priority | Who is blocked |
|---|---|---|---|
| Q1 | `kind: both` cannot use `/api/bids/*` | **P0** | Dual-role bidding, + our Compare/split-award testing |
| Q2 | Award creates no Order, so identity can never be revealed | **P0** | Whole post-award flow |
| Q3 | `lines[].isIncluded: false` returns 500 | **P0** | Anyone integrating from the doc |
| Q4 | Compare unverified (needs 2 bids) | P1 | Compare screen — unblocks with Q1 |
| Q5 | `allowSplitAward` collected but not enforced | P1 | Product correctness |
| Q6 | Buyer list has no closing date | P2 | Buyer Bids inbox |
| Q7 | `/bidders` has no `submittedAt`, no cert names | P2 | Buyer Bids inbox |
| Q8 | `paymentPlan` is an opaque code | P2 | Supplier RFQ detail |
| Q9 | Postman collection does not match the API | P2 | Next integrator |
| Q10 | Composed English in payloads | P3 | Arabic / RTL, all modules |
| Q11 | Attachment filename identifies the supplier | P3 | Blind-marketplace rule |
| Q12 | No un-decline endpoint | P3 | Supplier "Bid anyway" |
| Q13 | Withdrawn bidder returns null figures | P3 | Confirmation only |
| Q14 | `riskLevel` values unenumerated | P3 | Award override dialog |

---

## P0

### Q1 — Why can a `kind: both` account not use any `/api/bids/*` endpoint?

Two separate `kind: both` accounts both get `400 {"title":"Unknown supplier."}` on every supplier bid
endpoint, while the one `kind: supplier` account works:

| Account | kind | role | accountType | `/api/bids/*` |
|---|---|---|---|---|
| `t61jc….@inbox.testmail.app` | **supplier** | Admin | Supplier | **200** ✓ |
| `marinalamey16@gmail.com` | **both** | User | Both | 400 Unknown supplier |
| `saima.khanum@mi-technologies.sa` | **both** | **Admin** | **Buyer** | 400 Unknown supplier |
| `Mikelnjoba@gmail.com` | buyer | SuperAdmin | — | 403 (correct) |

`role` and `accountType` differ between the two failures, so they are ruled out — **`kind` is the
only variable left.** The gate is fine (a `kind: buyer` caller gets 403, these get 400, so they were
admitted and the *supplier-record lookup* failed). Both failing accounts resolve as suppliers in
`/api/dashboard/supplier` (`availableRfqs: 16`) and as buyers in `/api/buyer/bids`.

Impact beyond testing: dual-role is a core product rule and the Bids doc lists `BuyerAndSupplier` on
every supplier endpoint. Today a dual-role company cannot bid at all.

**Answer:**

---

### Q2 — Should `POST /api/buyer/bids/award` create the Order rows?

Award returned `purchaseOrderId d2fe3d75-c0a8-4af0-90ed-b3b9fd091222` / `PO-2026-0001` for RFQ-0061.
Nothing resolves it, for either party:

```
GET /api/orders        (buyer)    → 200 {"all":0, … "items":[]}
GET /api/orders        (supplier) → 200 {"all":0, … "items":[]}
GET /api/orders/{poId} (both)     → 404 {"title":"Order not found."}
```

Also 404: `/orders/by-po/{id}`, `/orders/purchase-order/{id}`, `/purchase-orders/{id}`,
`/orders/quotation/{qid}`, `/orders/rfq/{rfqId}`. Persisted for hours, so not projection lag.

Identity reveal is defined as `GET /api/orders/{orderId}` → `supplierIdentityRevealed`. With no
Order, the supplier cannot accept, so **identity can never be revealed** and accept → dispatch →
deliver → close is unreachable.

**Answer:**

---

### Q3 — Is omitting excluded bid lines the intended contract?

On `RFQ-2026-0037` (`allowPartialBids: true`, 3 items, `minItemsPerBid: 2`):

| Body | Result |
|---|---|
| only the 2 included lines sent | **200** — server reports `itemsPriced 2/3` correctly |
| all 3 sent, excluded one as `isIncluded: false, unitPrice: 0` | **500** `{"title":"An unexpected error occurred."}` |

The doc says the excluded line *is still sent* ("the line is kept so the compare grid can still show
the quantity"). A client built to the doc 500s on every partial bid. We omit them, so we are fine.

**Answer:**

---

## P1

### Q4 — Compare: nothing to ask, just flagging the dependency

`POST /api/buyer/bids/compare` → `400 "Select at least two bids to compare."` No RFQ on dev has ever
had two bids, because only one account can bid (Q1). Its response shape has therefore never been
observed, and we have not wired the Compare screen. We will capture it ourselves once Q1 lands.

**Answer (only if the ≥2 minimum is not intended):**

---

### Q5 — Should `allowSplitAward` be enforced at award?

It is collected from the buyer in the Create-RFQ wizard and stored, but not checked at award — so a
buyer who explicitly chose "single supplier only" can still be split-awarded. Either enforce it, or
we stop asking for it; right now the field is a promise the system does not keep.

**Answer:**

---

## P2 — Missing data (we render blank rather than guess; no frontend change needed when fixed)

### Q6 — Can `GET /api/buyer/bids` groups carry a closing date?

Group keys today: `rfqId, rfqNumber, rfqTitle, bidsReceived, closingLabel, statusChip`.
`closingLabel` is rendered English (`"In 102 days"`), so the inbox cannot show a countdown or sort by
closing — it renders `—`. The doc also promises `lowestBidTotal` and `negotiatingCount`; neither is
present.

**Answer:**

---

### Q7 — Can `/bidders` return `submittedAt` and structured compliance?

Bidder keys today: `quotationId, bidderLabel, status, statusChip, bidTotal, itemsPriced,
itemsRequested, latestDelivery, complianceLabel, complianceComplete, isLowestTotal`.

- `submittedAt` is documented but absent — the buyer's table has a "submitted" column with no source.
- `complianceLabel` is a sentence (`"3 of 3 documents"`, or `"—"`). We parse the numbers back out.
  Certificate **names** are never published, so we can show a count but never *which* document is
  missing. Structured (e.g. `[{ requirementName, isSatisfied }]`) would fix both.

**Answer:**

---

### Q8 — Can the RFQ detail return the payment schedule as structured percentages?

Supplier detail returns `paymentPlan: "PlanA"` with no published mapping. The percentages exist only
inside a rendered English string on the bid payload (`paymentPlanLabel: "Buyer terms 30 / 60 / 10"`),
which we currently parse with a regex. Either structured percentages, or publish the `PlanA` mapping.

**Answer:**

---

### Q9 — Can the Postman collection be regenerated from the running API?

Verified side by side. A client built from the collection breaks in eight places:

| Endpoint | Collection | Deployed |
|---|---|---|
| Upload attachment | `attachmentId` | **`id`** (both upload and from-saved) |
| List available RFQs | 7 fields, `isMatched`, `{tab,pageNumber,pageSize}` | 17 fields, `matchReason`, `{items,total,browseAllCount,matchedCount,declinedCount}` |
| RFQ detail | certs as comma string, no bidding rules | certs **array**, plus `status`, `rfqType`, `buyerCity`, `allowPartialBids`, `allowPartialDelivery`, `minItemsPerBid` |
| List my bids | `{tab,total,items}` | `{items,total,allCount,draftCount,biddingCount,negotiatingCount,wonCount,lostCount}` |
| my-bid / draft / submit / withdraw | 5–6 fields | ~30, incl. `currency`, `subtotal`, `vat`, `actions[]`, `bannerKind` |
| Buyer list | `items[]` with `lowestBidTotal` | **`groups[]`**, no `lowestBidTotal` |
| Withdraw 400 | "between 20 and 500 characters" | "must be at least 20 characters" |
| — | not documented | `DELETE /api/bids/certificates/{certificateId}` exists (204) |

**Answer:**

---

## P3

### Q10 — Structured values or `Accept-Language` for composed English?

Roughly 19 fields are finished English sentences — `closingLabel`, `statusChip`, `notice`,
`complianceLabel`, `activityLine`, `partialBidNote`, `actionHint`, `lineSummary`, `bannerMessage`,
`identityNotice`, `paymentPlanLabel`, `confirmHeadline`, `confirmBody`, `confirmBullets`,
`allocationLine`, `pageHeadline`, `pageBody`, `nextSteps`, `buyerBanner` — and several contain
relative time ("In 102 days").

This app is bilingual with full RTL and the platform rule is that translation lives in frontend i18n,
so we ignore all of it and key our own copy. That works — but the backend is composing copy nobody
renders, and it will recur more heavily in Orders and Negotiations. Worth settling once, now.

*(One deliberate exception: `awardCards[].identityFields`, which we render verbatim because they model
the reveal rule exactly and re-deriving them risks disagreeing about when identity is revealed.)*

**Answer:**

---

### Q11 — Can buyer-facing downloads serve a neutral filename?

Metadata sanitization is confirmed working — a PDF uploaded with
`/Author(WALLET SOURCE ACME SUPPLIER)` comes back `/Author()`, all Info values emptied, dates zeroed.
But the download sets `Content-Disposition: attachment; filename=FE-PROBE-WALLET-SOURCE.pdf`, so the
original name survives. `ACME_Steel_ISO9001.pdf` identifies its supplier just as effectively as the
EXIF did. We render our own label in the UI, but the download itself is outside our control.

**Answer:**

---

### Q12 — Does saving a draft clear a decline, or is an un-decline endpoint needed?

`POST /api/bids/rfq/{rfqId}/decline` → 204 and the RFQ moves to the Declined tab. The supplier screen
offers **"Bid anyway"** there. Probed: `DELETE …/decline` → 405, `…/undecline` → 404.

**Answer:**

---

### Q13 — Is nulling a withdrawn bidder's figures deliberate?

`/bidders` still returns the row after withdrawal, but with null figures:

```
RFQ-0033 → Supplier A · Withdrawn · bidTotal null · itemsPriced null · itemsRequested null · latestDelivery null
RFQ-0030 → Supplier A · Submitted · SAR 880,000 · 2 / 2                                     (for contrast)
```

The doc types all four as non-nullable. We handle null now and render an em dash, so nothing is
blocked — just confirm whether the row should keep its last submitted total for the buyer's record.

**Answer:**

---

### Q14 — What are the allowed `riskLevel` values on an award override?

`POST /api/buyer/bids/award` takes `overrides[].riskLevel`, required when awarding a bid with missing
documents. No values are published; `"Low"` is the only example. We have never been able to trigger
the path — no test RFQ requires certifications. Our override dialog collects a reason and an
"I accept responsibility" checkbox, and has no risk-level control yet.

**Answer:**

---

## Already resolved — please do not re-investigate

Verified fixed on dev and integrated: the supplier read path (`my-bid` / `my-bids`),
`proposedDeliveryDate` no longer overwritten, the certificate wallet (list / upload / delete),
`attachments/from-saved`, `saveToWallet`, the PDF/PNG/JPG allow-list **and** magic-byte check,
metadata sanitization (confirmed by downloading the stored bytes), the attachment `source` field,
the attachment download route, the identity-reveal contract (`supplierId` null at award,
`identityFields` on the award card), duplicate-award prevention, `provisionalPoNumber` not consuming
the PO counter, and the `Matched` tab.

## Test data left on dev for your investigation

| What | Id | Why it is there |
|---|---|---|
| RFQ-0061 | `146d2c8f-7234-49d3-8274-69b960772443` | Awarded; PO-2026-0001 (`d2fe3d75-…`) issued but unreachable — **Q2** |
| Quotation on RFQ-0061 | `775b78a1-0a7e-4690-b4db-b5ed3ce34e5e` | Won |
| RFQ-2026-0037 | `ebcca3e6-8077-446b-8066-69ed62cb4792` | Draft quotation `a02a28bc-…`, 2 of 3 lines — **Q3** |
| RFQ-0021 | `eff22a3e-a9be-4832-9e36-de94d9a48058` | Declined, cannot be reversed — **Q12** |
| RFQ-0033 / RFQ-0026 | — | Withdrawn bidders with null figures — **Q13** |

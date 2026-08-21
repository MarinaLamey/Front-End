# Bids API — open questions for Backend

**Prepared 2026-08-21**, after integrating the Bids module against deployed dev
(`https://dev-api-miproc.mi-mony.com`) and re-verifying every item below on that build the same day.

**Everything already fixed has been removed from this list.** For the record, these are resolved and
need no further action: the supplier read path (`my-bid` / `my-bids`), `proposedDeliveryDate`, the
certificate wallet and attach-from-saved, `saveToWallet`, the file-type and magic-byte allow-list,
metadata sanitization (verified by downloading the stored bytes), the attachment `source` field, the
attachment download route, the identity-reveal contract, duplicate-award prevention,
`provisionalPoNumber` not consuming the PO counter, and the `Matched` tab (now returns 2 rows).

Frontend state: the **supplier** surface is fully wired to the real API and live. The **buyer** Bids
inbox is wired. Compare and Award are written but not wired, for the reason in Q3.

---

## P0 — Blocking

### Q1. A `kind: both` account cannot use any `/api/bids/*` endpoint

`marinalamey16@gmail.com` (`user.id 5e645379-30a0-4fa8-b546-2ea8e56b75cc`) authenticates fine and is
fully onboarded, but every supplier bid endpoint answers `400 {"title":"Unknown supplier."}`:

```
GET /api/auth/me            → 200  kind: both · status: Verified · tenantStatus: Active
GET /api/onboarding/resume  → 200  accountType "Both" · status "Completed"
GET /api/dashboard/supplier → 200  counts.availableRfqs = 16     ← resolves as a supplier here
GET /api/bids/available-rfqs?supplierId={id}  → 400 Unknown supplier
GET /api/bids/my-bids       → 400   GET /api/bids/certificates → 400
POST /api/bids/rfq/{id}/decline → 400
```

Re-tested 2026-08-21 with a SECOND `kind: both` account, `saima.khanum@mi-technologies.sa`
(`a9685342-732c-46c0-85b7-079b40baede0`) — identical `400 "Unknown supplier."` on every endpoint.

That second account isolates the variable, because it differs from the first everywhere except
`kind`:

| Account | kind | role | onboarding accountType | `/api/bids/*` |
|---|---|---|---|---|
| `t61jc…@inbox.testmail.app` | **supplier** | Admin | Supplier | **200** ✓ |
| `marinalamey16@gmail.com` | **both** | User | Both | 400 Unknown supplier |
| `saima.khanum@mi-technologies.sa` | **both** | **Admin** | **Buyer** | 400 Unknown supplier |
| `Mikelnjoba@gmail.com` | buyer | SuperAdmin | — | 403 (correct) |

`role` varies (User / Admin) and `accountType` varies (Both / Buyer), yet both `kind: both` accounts
fail and the only `kind: supplier` account succeeds. **The determining factor is `kind`, and
`/api/bids/*` handles only `kind: supplier`.**

The gate itself is fine — a `kind: buyer` account is refused with **403**, whereas these get **400**,
so they were admitted and then failed the supplier-record lookup. Both also resolve as suppliers in
the dashboard module (`/api/dashboard/supplier` → 200, `availableRfqs: 16`) and as buyers in
`/api/buyer/bids`.

**Question:** why does `/api/bids/*` resolve `kind: supplier` but not `kind: both`, when the other
modules handle both? This is not only a test blocker — dual-role ("one company can be both buyer and
supplier") is a core product rule, and the Bids doc lists `BuyerAndSupplier` on every supplier
endpoint. Today a dual-role company cannot bid at all.

**Unblocks:** Q3 and Q4 below, and the last of our end-to-end testing.

### Q2. Awarding does not create an Order, so identity can never be revealed

`POST /api/buyer/bids/award` returned `purchaseOrderId d2fe3d75-c0a8-4af0-90ed-b3b9fd091222` /
`PO-2026-0001` for RFQ-0061. Nothing can resolve it, for either party, and re-checked today:

```
GET /api/orders          (buyer)    → 200 {"all":0, … "items":[]}
GET /api/orders          (supplier) → 200 {"all":0, … "items":[]}
GET /api/orders/{poId}   (both)     → 404 {"title":"Order not found."}
```

Also 404: `/orders/by-po/{id}`, `/orders/purchase-order/{id}`, `/purchase-orders/{id}`,
`/orders/quotation/{qid}`, `/orders/rfq/{rfqId}`. Not projection lag — it has persisted for hours.

The award clearly records the PO inside the bids module, but no Order row appears in the orders
service.

**Why it matters beyond Orders:** the agreed identity rule is that identity is revealed when the
supplier accepts the PO, read from `GET /api/orders/{orderId}` → `supplierIdentityRevealed`. With no
Order, the supplier cannot accept, so **identity can never be revealed** and the whole post-award
flow (accept → dispatch → deliver → close) is unreachable.

**Question:** should `POST /api/buyer/bids/award` create the Order rows, or is a separate step
expected? If separate, which endpoint, and who calls it?

### Q3. `lines[].isIncluded: false` returns a 500

Confirmed again today on `RFQ-2026-0037` (`allowPartialBids: true`, 3 items, `minItemsPerBid: 2`):

| Body | Result |
|---|---|
| only the 2 included lines sent | **200** — server correctly reports `itemsPriced 2/3` |
| all 3 sent, the excluded one as `isIncluded: false, unitPrice: 0` | **500** `{"title":"An unexpected error occurred."}` |

The documentation explicitly says the excluded line *is still sent* ("the line is kept so the compare
grid can still show the quantity"). A client built to that contract 500s on **every** partial bid.

Our client omits excluded lines, so we are unaffected — but this needs fixing, and the doc corrected,
before anyone else integrates.

**Question:** is omitting excluded lines the intended contract? If so we will keep doing it and the
doc should say so; if not, the zero-price path needs the fix.

---

## P1 — Untestable until Q1 lands

### Q4. Compare has never returned a 200, so its response shape is unverified

`POST /api/buyer/bids/compare` refuses fewer than two quotations:

```
400 {"title":"Select at least two bids to compare."}
```

No RFQ on dev has ever had two bids, because only one account can bid (Q1). Re-checked today:
RFQ-0061 has 1, RFQ-2026-0037 has 0.

We have therefore **not wired the Compare screen**. Its shape in the Postman collection cannot be
trusted — the collection has been wrong about every other payload in this module (Q9).

**Question:** none needed if Q1 lands — we will capture it ourselves. Flagging so the dependency is
visible.

### Q5. The split-award rule has never been observed running

The published rule is: only `Bidding`/`Negotiating` quotations are considered; per RFQ line, the
lowest `unitPrice` among bids that include it takes the **whole** line at their quoted quantity;
quantity is never split; ties resolve to the first entry in `quotationIds`; `allowSplitAward` is not
checked.

We have only ever awarded a single supplier, so no split has been produced. We render
`award/preview → allocations[].lineNumbers` rather than computing our own, so we do not need the rule
in code — but the **award is the irreversible, money-moving step**, and we would rather see it run
once before shipping the screen.

**Also still open on this rule:** `allowSplitAward` is collected from the buyer in the Create-RFQ
wizard and stored, but not enforced at award. So a buyer who explicitly chose "single supplier only"
can still be split-awarded.

**Question:** should `allowSplitAward` be enforced at award, or should we stop asking the buyer for
it? Right now the field is a promise the system does not keep.

---

## P2 — Missing data (screens render blank)

Each of these is rendered as empty rather than guessed, so a fix needs no frontend change.

### Q6. `GET /api/buyer/bids` groups carry no closing date

Group keys today: `rfqId, rfqNumber, rfqTitle, bidsReceived, closingLabel, statusChip`.

`closingLabel` is rendered English (`"In 102 days"`). There is no date, so the Bids inbox cannot show
a countdown or sort by closing — it currently renders `—` rather than parse the sentence.

The doc also promises `lowestBidTotal` and `negotiatingCount` on this row; neither is present.

**Question:** can the group carry `closingDate` (ISO), plus `lowestBidTotal` and `negotiatingCount`?

### Q7. `/bidders` carries no `submittedAt` and no certification names

Bidder keys today: `quotationId, bidderLabel, status, statusChip, bidTotal, itemsPriced,
itemsRequested, latestDelivery, complianceLabel, complianceComplete, isLowestTotal`.

- **`submittedAt` is absent**, though the doc lists it. The buyer's bid table has a "submitted"
  column with nothing to fill it.
- **`complianceLabel` is a sentence** (`"3 of 3 documents"`, or `"—"` when the RFQ requires none). We
  parse the two numbers back out of it. The certification **names** are never published, so we cannot
  show *which* document is missing — only a count.

**Question:** can `/bidders` return `submittedAt`, and the compliance state as structured data
(e.g. `[{ requirementName, isSatisfied }]`) rather than a rendered sentence?

### Q8. `paymentPlan` is an opaque code

The supplier RFQ detail returns `paymentPlan: "PlanA"` with no published mapping. The percentages
exist only inside a rendered English string on the bid payload
(`paymentPlanLabel: "Buyer terms 30 / 60 / 10"`), which we parse with a regex.

**Question:** can the RFQ detail return the payment schedule as structured percentages, or at least
publish the `PlanA` → `30 / 60 / 10` mapping?

---

## P3 — Contract and policy

### Q9. The Postman collection does not match the deployed API

Verified side by side on 2026-08-21. A client built from the collection breaks in six places:

| Endpoint | Collection says | Deployed returns |
|---|---|---|
| Upload attachment | `attachmentId` | **`id`** (both upload *and* from-saved) |
| List available RFQs | 7 fields, `isMatched`, `{tab,pageNumber,pageSize}` | 17 fields, `matchReason` string, `{items,total,browseAllCount,matchedCount,declinedCount}` |
| RFQ detail (supplier) | `requiredCertifications` as a comma string; no bidding rules | an **array**, plus `status`, `rfqType`, `buyerCity`, `allowPartialBids`, `allowPartialDelivery`, `minItemsPerBid` |
| List my bids | `{tab,total,items}` | `{items,total,allCount,draftCount,biddingCount,negotiatingCount,wonCount,lostCount}` |
| my-bid / draft / submit / withdraw | 5–6 fields | ~30, incl. `currency`, `subtotal`, `vat`, `actions[]`, `bannerKind` |
| Buyer list | `items[]` with `lowestBidTotal` | **`groups[]`**, no `lowestBidTotal` |
| Withdraw 400 | "between 20 and 500 characters" | "must be at least 20 characters" |
| — | not documented | `DELETE /api/bids/certificates/{certificateId}` exists (204) |

**Question:** can the collection be regenerated from the running API? Our DTOs follow the wire, so
nothing changes for us — but the next integrator will be misled.

### Q10. Composed English is returned where the platform is bilingual

The payloads carry finished English sentences: `closingLabel`, `statusChip`, `notice`,
`complianceLabel`, `activityLine`, `partialBidNote`, `actionHint`, `lineSummary`, `bannerMessage`,
`identityNotice`, `paymentPlanLabel`, `confirmHeadline`, `confirmBody`, `confirmBullets`,
`allocationLine`, `pageHeadline`, `pageBody`, `nextSteps`, `buyerBanner` — and some contain relative
time ("In 102 days", "Closes in 3 days").

This app is **bilingual with full RTL**, and the platform rule is that translation lives in frontend
i18n. We ignore all of it and key our own copy from the structured fields beside it. That works, but
it means the backend is composing copy nobody renders — and it will recur, more heavily, in Orders
and Negotiations.

**One deliberate exception:** the award response's `awardCards[].identityFields` — those we render
verbatim, because they model our screen exactly and re-deriving them risks disagreeing about when
identity is revealed.

**Question:** should we settle a policy now, before Orders? Either return structured values, or
honour `Accept-Language`. We do not need it for Bids; we would rather not repeat the conversation per
module.

### Q11. The attachment file name still identifies the supplier

Metadata sanitization is confirmed working — a PDF uploaded with
`/Author(WALLET SOURCE ACME SUPPLIER)` comes back with `/Author()`, every Info value emptied and both
dates zeroed. But the download sets:

```
Content-Disposition: attachment; filename=FE-PROBE-WALLET-SOURCE.pdf
```

The original name survives. `ACME_Steel_ISO9001.pdf` identifies its supplier to the buyer just as
effectively as the EXIF did, which defeats the sanitisation for the one string the buyer definitely
sees.

**Question:** for buyer-facing reads, can the download serve a neutral name (the stored
`{timestamp}-{uuid}.ext`, or a name derived from the certificate type)? We will render our own label
in the UI either way, but the download itself is outside our control.

### Q12. No endpoint reverses a decline

`POST /api/bids/rfq/{rfqId}/decline` → 204 and the RFQ moves to the Declined tab. The supplier screen
offers **"Bid anyway"** on those rows. Probed today: `DELETE …/decline` → 405, `…/undecline` → 404.

**Question:** does saving a draft implicitly clear the decline, or is an un-decline endpoint needed?
We have left the action wired to the mock until this is answered.

### Q13. Are a withdrawn bidder's figures nulled on purpose?

`GET /api/buyer/bids/rfq/{id}/bidders` returns the row, but with NULL figures once the bid is
withdrawn — captured on RFQ-0033 and RFQ-0026:

```
Supplier A · Withdrawn · bidTotal null · itemsPriced null · itemsRequested null · latestDelivery null
Supplier A · Submitted · SAR 880,000 · 2 / 2                                    (for contrast)
```

The doc types all three as non-nullable. We now handle null and render an em dash, so nothing is
blocked — but confirm the intent: should a withdrawn row keep the last submitted total (useful for
the buyer's record), or is nulling it deliberate?

### Q14. `riskLevel` on an award override is unenumerated

`POST /api/buyer/bids/award` takes `overrides[].riskLevel` as required when awarding a bid with
missing documents. No allowed values are published; `"Low"` is the only example. We have never been
able to trigger the path — no test RFQ has required certifications.

**Question:** what are the allowed values? Our override dialog collects a reason and an
"I accept responsibility" checkbox, and has no risk-level control today.

---

## Notes, not questions

- **`source` on attachments is correct going forward**, but rows created before the 2026-08-21 deploy
  were backfilled as `upload` regardless of origin — including one we created via `from-saved`. So
  provenance is trustworthy only for attachments created since. No action needed; recorded so it is
  not mistaken for a bug later.
- **The RFQ wizard cannot express partial bids.** `POST /api/rfq-draft/{id}/step2` has no field for
  `allowPartialBids` or `minItemsPerBid`, and `allowPartialDelivery: true` came back `false` on the
  published RFQ. Every RFQ created through the wizard therefore demands a price on every line. This
  is an RFQ-module gap rather than a Bids one, but it is what stopped us testing partial bids through
  the supported flow.

---

## Test data left on dev

| What | Id | State |
|---|---|---|
| RFQ-0061 | `146d2c8f-7234-49d3-8274-69b960772443` | **Awarded**; PO-2026-0001 (`d2fe3d75-…`) issued but unreachable — kept for Q2 |
| Quotation on RFQ-0061 | `775b78a1-0a7e-4690-b4db-b5ed3ce34e5e` | Won |
| RFQ-2026-0037 | `ebcca3e6-8077-446b-8066-69ed62cb4792` | Draft quotation `a02a28bc-…`, 2 of 3 lines |
| RFQ-0026 / RFQ-0019 | — | quotations Withdrawn |
| RFQ-0021 | `eff22a3e-…` | Declined — cannot be reversed (Q12) |

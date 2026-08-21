# Bids API — live test results

**Tested 2026-08-21** against `https://dev-api-miproc.mi-mony.com`, ~45 calls.
Account: `t61jc.1787059681357@inbox.testmail.app` — `kind: supplier`, `status: verified`,
`role: Admin`, org "QA Test Company 1787059744058", onboarding `Completed`.

> Everything here is a real capture. Where the deployed API and `Bids doc.pdf` disagree, **the wire
> wins** and the difference is called out. The doc's own control table says "Matches deployed code:
> Not verified" — it is now verified, and it is wrong in most places.

## Identity resolved

`POST /api/auth/login` → 200, sets HttpOnly `access_token` (8h, path `/`) + `refresh_token`
(30d, path `/api/auth/refresh`); body `token`/`refreshToken` are `""` by design (cookie-first web).

```
user.id          = 15905e2d-2154-4e72-b8a6-212a990e46bc   ← the supplierId, per Marina 2026-08-21
JWT sub          = 15905e2d-2154-4e72-b8a6-212a990e46bc   (same)
JWT claims       = role:Admin · status:verified · kind:supplier
onboarding.id    = 72ca4fe5-7716-482d-8e5a-db8a8b87e877   (onboarding profile — NOT the supplierId)
```

Both Bearer and cookie auth work. No auth at all → **401**.

## Endpoint status

| § | Endpoint | Result |
|---|---|---|
| 1 | `GET /api/bids/available-rfqs` | ✅ 200 — 14 live RFQs. **Matched/Declined tabs return 0 rows** |
| 2 | `GET /api/bids/available-rfqs/{rfqId}` | ✅ 200 — far richer than documented |
| 3 | `GET /api/bids/my-bids` | 🔴 200 but **always empty**, even with a submitted bid |
| 4 | `GET /api/bids/rfq/{rfqId}/my-bid` | 🔴 **always 204**, even with a submitted bid |
| 5 | `POST …/draft` | ✅ 200 — upsert confirmed (same `quotationId` on re-POST) |
| 6 | `POST …/submit` | ✅ 200 — `status: "Bidding"`, `submittedAt` stamped |
| 7 | `POST …/decline` | ⚠️ 204 — persists, but **the Declined tab still shows 0** |
| 8 | `POST /api/bids/{quotationId}/withdraw` | ✅ 200 — `status: "Withdrawn"`, full bid echoed |
| 9 | `POST /api/bids/{quotationId}/attachments` | ✅ 200 — response field is **`id`**, not `attachmentId` |
| 10 | `DELETE /api/bids/attachments/{id}` | ✅ 204; repeat → 404 (not idempotent) |
| 11–15 | all `/api/buyer/bids/*` | ⛔ **403, zero-byte body** — this account is `kind: supplier`. **Untested; needs a buyer account** |

---

## 🔴 BLOCKER — every supplier GET is blind to its own writes

A bid can be created, submitted, withdrawn and attached to. **It can never be read back.**

```
POST /draft                        → 200  quotationId 113a040c-…  status Draft
GET  /rfq/{id}/my-bid              → 204  (empty)
GET  /my-bids?tab=All              → 200  {"total":0,"allCount":0,"draftCount":0,…}
POST /submit                       → 200  status Bidding, submittedAt 2026-08-21T07:08:01Z
GET  /rfq/{id}/my-bid              → 204  ← still empty AFTER submit
GET  /my-bids?tab=All              → 200  {"total":0,…}
GET  /available-rfqs → that row's  myBid = null,  declinedCount = 0
```

Tried with **both** candidate identifiers — `user.id` and the onboarding profile `id`. Both return
`total: 0`. So this is not "we are sending the wrong id".

### Root cause — proved

`GET /api/dashboard/supplier`, same token, **no `supplierId` parameter**, sees everything:

```json
{"counts":{"totalRfqs":2,"activeBids":1,"submittedRfqs":5,"negotiationsSent":1,
           "acceptedNegotiations":1,"availableRfqs":14,"completedOrdersAmount":0},
 "bids":[{"id":"df018ae8-…","rfqId":"1cac1a7a-…","amount":2000,"currency":"SAR",
          "status":"withdrawn","submittedAt":"2026-08-21T07:13:45Z"},
         {"id":"2ff5137c-…","rfqId":"eff22a3e-…","amount":0,"currency":"SAR",
          "status":"declined","submittedAt":"2026-08-21T07:08:40Z"}, …5 rows]}
```

The data is stored correctly. The dashboard resolves the supplier **from the token**; `/api/bids/*`
resolves it from the **`supplierId` query parameter** and matches nothing.

**The fix is the doc's own Open item 1** — take the caller from the token and drop the parameter.
That one change fixes the read bug *and* closes the IDOR below.

## 🔴 SECURITY — `supplierId` is not validated against the token

```
GET /my-bids                (no supplierId)                → 400 {"title":"Supplier id is required."}
GET /my-bids?supplierId=00000000-0000-0000-0000-000000000001 → 200  (served, not refused)
GET /available-rfqs         (no auth at all)               → 401
```

Authentication is enforced; **authorisation is not**. The server accepts a `supplierId` that is not
the caller and answers with that supplier's view rather than 403. Every one of the 10 supplier
endpoints — including `withdraw`, `draft`, `submit` and `DELETE …/attachments` — takes the same
unvalidated parameter, so this is a write vector, not just a read one.

## 🔴 SECURITY — attachment uploads have no content-type allow-list

```
POST /api/bids/{qid}/attachments   file=probe.exe  type=application/x-msdownload  → 200
  {"id":"60f5a630-…","fileName":"probe.exe","contentType":"application/x-msdownload","sizeBytes":2}
```

Stored and echoed back. The response also carries **no `scrubbed` flag and no `source` field**, so
an unscrubbed PDF's EXIF/author metadata can identify the supplier to the buyer during comparison —
a direct breach of the blind-marketplace rule, and the doc's Open item 8.

## 🟠 `proposedDeliveryDate` is silently discarded

Sent `2026-12-10` and `2026-12-12` on two lines. Both came back **`2026-12-15`** — the RFQ's
`requiredDeliveryDate`. `earliestDelivery` and `latestDelivery` both read `2026-12-15` too.
Confirmed on two separate RFQs. The supplier's proposed per-line delivery date cannot be expressed,
which is the one field the source of truth introduced to replace lead time.

---

## Actual response shapes (vs documented)

### `GET /api/bids/available-rfqs` — envelope is different, and better

```json
{"items":[…], "total":14, "browseAllCount":14, "matchedCount":0, "declinedCount":0}
```
**No `tab`, `pageNumber` or `pageSize` echo** (doc claims all three). Instead it returns the three
**tab counts** — which is exactly what the tab bar needs.

```json
{"rfqId":"1cac1a7a-…","number":"RFQ-0019","title":"QA Test RFQ",
 "buyerLabel":"Verified buyer · Electrical Equipment","category":"Electrical Equipment",
 "buyerCity":null,"itemCount":2,"totalUnits":200,"deliverTo":"—","matchReason":"Open to bid",
 "closingDate":"2026-09-15T17:00:00Z","daysToClose":26,"closingSoon":false,
 "liveChip":"Live","closedChip":null,"declinedAt":null,"myBid":null}
```
Documented as 7 fields; actually 17. `category`, `itemCount`, `totalUnits`, `daysToClose`,
`closingSoon`, `declinedAt` and `myBid` are all present and all needed by our card.
`isMatched` does **not** exist — `matchReason` is a string (`"Open to bid"`) instead.
`deliverTo` is the literal string `"—"`; `buyerCity` is null on rows but populated on detail.

### `GET /api/bids/available-rfqs/{rfqId}` — resolves most of our blockers

```json
{"rfqId":"663053b7-…","number":"RFQ-0026","title":"E2E SUPPLIER BID VALIDATION - safe to delete",
 "status":"Live","buyerLabel":"Verified buyer · Electrical Equipment · Al Qassim",
 "buyerCategory":"Electrical Equipment","buyerCity":"Al Qassim",
 "identityNotice":"Buyer identity is revealed when you accept the purchase order.",
 "closingDate":"2026-11-30T17:00:00Z","daysToClose":102,
 "requiredDeliveryDate":"2026-12-15T00:00:00Z","deliveryAddress":null,
 "paymentPlan":"PlanA","paymentTermsNotes":null,"rfqType":"Goods",
 "allowPartialDelivery":false,"allowPartialBids":false,"minItemsPerBid":null,
 "requirementsAndCriteria":null,"requiredCertifications":[],
 "items":[{"rfqItemId":"f103f2af-…","lineNumber":1,"description":"Industrial Cable 120mm",
           "specification":"Copper, XLPE insulated","quantity":500,"unitOfMeasure":"Box",
           "neededBy":"2026-12-15T00:00:00Z"}, …]}
```
- **`requiredCertifications` is an ARRAY**, not the comma-joined string the doc describes.
- **`allowPartialBids` / `minItemsPerBid` / `allowPartialDelivery` exist** — our bid-rule engine has
  a source after all. Still missing: `maxItemsPerBid`, per-line `minQuantity`/`maxQuantity`.
- **`identityNotice` says "revealed when you accept the purchase order"** — the backend agrees with
  `src/features/rfq/identity.ts` and CLAUDE.md constraint #5, *not* with the doc's "identities are
  revealed at award". Our model is correct.
- `deliveryAddress`, `paymentTermsNotes`, `requirementsAndCriteria` all null — the RFQ-module
  publish bug (publish drops `deliveryAddress`) showing through to suppliers.

### `POST …/draft` · `…/submit` · `…/withdraw` — one shared, rich payload

All three return the same object (~30 fields, not the 5–6 documented):

```json
{"quotationId":"113a040c-…","rfqId":"663053b7-…","rfqNumber":"RFQ-0026","rfqTitle":"…",
 "status":"Draft","submittedAt":null,"awardedAt":null,"closedAt":null,
 "bidValidUntil":"2026-11-25T00:00:00Z","currency":"SAR",
 "subtotal":49430.43,"vat":7414.57,"bidTotal":56845.00,"totalLabel":"Bid total",
 "itemsPriced":2,"itemsRequested":2,"lineSummary":"All 2 items quoted.",
 "earliestDelivery":"2026-12-15T00:00:00Z","latestDelivery":"2026-12-15T00:00:00Z",
 "paymentPlanLabel":"Buyer terms 30 / 60 / 10","paymentResponseLabel":"accepted",
 "paymentTermsResponse":"Accepted","notes":"…","withdrawReason":null,
 "identityNotice":"Buyer identity is revealed when you accept the purchase order.",
 "bannerKind":"None","bannerMessage":null,"actions":["ViewRfq"],"purchaseOrderId":null,
 "lines":[{"quotationItemId":"50228a86-…","rfqItemId":"f103f2af-…",
           "description":"Industrial Cable 120mm","unitOfMeasure":"Box",
           "requestedQuantity":500,"quantity":500,"unitPrice":23.69,"lineTotal":11845,
           "proposedDeliveryDate":"2026-12-15T00:00:00Z","isIncluded":true}, …],
 "attachments":[]}
```

Wins over the doc:
- **`currency: "SAR"` is returned** — the doc says no amount carries a currency.
- **`subtotal` and `vat` are returned**, server-derived. `56845 / 1.15 = 49430.43` ✅ — VAT is
  inclusive exactly as `vat.ts` models it.
- `rfqNumber` + `rfqTitle` ride along, so the bid page needs no second call.
- **`paymentResponseLabel` is derived from the free text**: `"Accepted"` → `"accepted"`,
  `"Countered: 40/50/10"` → `"countered"`. Our `paymentTermsKind` has a source.
- `paymentPlanLabel: "Buyer terms 30 / 60 / 10"` — the buyer's percentages exist, wrapped in English.
- `actions[]` + `bannerKind`/`bannerMessage` — a flag model like the RFQ detail's `availableActions`.
  Observed: `["ViewRfq"]` on Draft, `["Withdraw","ViewRfq"]` on Bidding. `bannerKind`: `None`, `Info`.
- **`attachments[]` shape is now known** (the doc leaves it unspecified) — and it is
  `{id, fileName, contentType, sizeBytes, uploadedAt}`, i.e. `id`, not `attachmentId`.

### Enums — pinned by probe

| Enum | Accepted (200) | Rejected (400) |
|---|---|---|
| `my-bids?tab=` | `All` `Draft` `Bidding` `Negotiating` `Won` `Lost` | `Submitted` `Withdrawn` `Expired` |
| `available-rfqs?tab=` | `BrowseAll` `Matched` `Declined` | anything else |
| bid `status` | `Draft` `Bidding` `Withdrawn` observed | — |
| `bannerKind` | `None` `Info` observed | — |
| `actions[]` | `ViewRfq` `Withdraw` observed | — |

`Submitted` is **not** a valid tab — the supplier vocabulary is `Bidding`. Withdrawn/Expired have no
tab, matching the doc. The count fields (`draftCount`/`biddingCount`/`negotiatingCount`/`wonCount`/
`lostCount`) mirror the tab set exactly.

### Validation rules — none of which the doc enumerates

| Sent | Response |
|---|---|
| 1 of 2 lines, `allowPartialBids:false` | 400 `"This RFQ requires a price on every line."` |
| `unitPrice: 0` or `-5` | 400 `errors["Lines[0].UnitPrice"]: "Unit price (VAT inclusive) is required on priced lines."` |
| `quantity` above requested | 400 `"Quantity for line 1 exceeds the requested 80.0000."` |
| **`bidValidUntil` < 7 days out** | 400 `errors["BidValidUntil"]: "Bid must remain valid for at least 7 days."` |
| unknown `rfqItemId` | 400 `"Bid references items that are not on this RFQ."` |
| `lines: []` | 400 `errors["Lines"]: ["'Lines' must not be empty.","Price at least one line before submitting."]` |
| `paymentTermsResponse` omitted | **200** — despite the doc marking it Required |
| withdraw `reason` < 20 chars | 400 `errors["Reason"]: "Withdrawal reason must be at least 20 characters."` |
| attach to a withdrawn bid | 400 `"Cannot attach files to a closed bid."` |

Two rules matter for the UI and are in neither the doc nor our form:
- **`bidValidUntil` ≥ 7 days** — our `isFutureDate()` only requires "in the future".
- **`quantity` ≤ requested** — the server's version of our per-line `maxQuantity`.

### Error shapes — two coexist, plus a third for auth

```
ValidationProblemDetails : {type?, title:"One or more validation errors occurred.", status:400,
                            errors:{Field:[msg]}, traceId?}
ProblemDetails (business): {title:"<user-facing English sentence>", status:400}
Auth failures            : 401 / 403 with a ZERO-BYTE body — no JSON at all
```
`title` on the business shape is a finished English sentence intended for display. The auth case
matches the dashboard exactly: **never read `data.title` on 401/403.**

---

## Left on dev (test data)

- `RFQ-0026` (`663053b7-…`) — quotation `113a040c-…`, **Withdrawn**.
- `RFQ-0019` (`1cac1a7a-…`) — quotation `df018ae8-…`, **Withdrawn**. Both attachments deleted.
- `RFQ-0021` (`eff22a3e-…`) — **declined** (quotation `2ff5137c-…`). No un-decline endpoint exists.

## Untested — needs a buyer account

Endpoints 11–15 (`/api/buyer/bids`, `/bidders`, `/compare`, `/award/preview`, `/award`) all return
**403 with an empty body** for a `kind: supplier` token. Nothing about the buyer half of this
contract has been verified — including the split-award question, the award idempotency guarantee,
and whether `provisionalPoNumber` consumes the PO counter.

---

# Round 2 — the certificates / wallet + sanitization contract (tested 2026-08-21, ~08:00Z)

Backend described a wallet picker, an attach-from-saved route, a `saveToWallet` flag, a
PDF/PNG/JPG allow-list and metadata sanitization on all three upload paths. **None of it is on dev.**

| Claim | Probe | Result |
|---|---|---|
| `GET /api/bids/certificates?supplierId=` | with / without / wrong supplierId | **404, 0 bytes, `text/html`** |
| `POST /api/bids/certificates` (wallet upload) | multipart PDF | **404** |
| `POST /api/bids/{qid}/attachments/from-saved` | `{"certificateId":"6666…"}` | **404** |
| `POST …/attachments?saveToWallet=true` | multipart PDF | 200 — but unobservable, the wallet list route does not exist |
| Allowed types PDF/PNG/JPG only | `.exe` as `application/x-msdownload` | **200 — stored** |
| " | `.txt` as `text/plain` | **200 — stored** |
| " | 4 `.exe` bytes declared `application/pdf`, named `evil.pdf` | **200 — stored** |
| PDF metadata stripped, pages copied to a new file | valid 614-byte PDF with a fat `/Info` (Author, Title, Creator, Producer, Keywords) | **stored `sizeBytes` = 614, byte-identical** |
| `source` / `scrubbed` / `certificateId` on the attachment | draft echo `attachments[]` | keys unchanged: `id, fileName, contentType, sizeBytes, uploadedAt` |

**The 404s are routing 404s, not business 404s.** `GET /api/bids/certificates` returns exactly what
`GET /api/bids/totally-not-a-route` returns — 0 bytes, `text/html`. A real not-found on this API is
ProblemDetails JSON (`{"title":"QuotationAttachment '…' was not found.","status":404}`), which is
what a repeat DELETE gives. So the routes are not registered in the deployed build.

**The sanitization test is the decisive one.** "Pages are copied into a new file" cannot produce a
byte-identical output: the `/Info` dictionary alone is ~250 of those 614 bytes, and a rebuild
rewrites object order and xref offsets. 614 in → 614 stored means the file was persisted verbatim.
The 4-byte fake PDF is the corroborating case — it is unparseable, so any real PDF rewrite would
have thrown; it was accepted and stored instead.

## Also found: no attachment can be read back at all

| Probe | Result |
|---|---|
| `GET /api/bids/attachments/{id}` | 405 (route exists for DELETE only) |
| `GET /api/bids/{qid}/attachments` | 405 (route exists for POST only) |
| `GET /api/bids/attachments/{id}/download` · `/content` | 404 |
| `GET /api/bids/{qid}/attachments/{id}/download` | 404 |
| `GET /api/rfq/documents/{id}/download` | 404 |

The only way to see a bid's attachments today is the `attachments[]` array echoed by
`POST …/draft`, and there is **no route that returns the file itself** — so the buyer cannot open a
supplier's mill test certificate, and the supplier cannot re-download their own.

## Test data left on dev (round 2)

- `RFQ-0011` (`28734a69-…`) — quotation `f95d9e56-b96a-4b66-bdc6-29e3741a8827`, status **Draft**,
  0 attachments (all 7 test uploads deleted, verified). Never submitted. No endpoint deletes a draft.

---

# Round 3 — identity reveal (tested 2026-08-21, ~08:30Z)

Backend confirmed the rule: `purchaseOrders[].supplierId` is **always null** on award commit, and
identity becomes visible only via `GET /api/orders/{orderId}` → `supplierIdentityRevealed` /
`supplierId` / `supplierDisplayName`, true only after the supplier accepts the PO.

**This matches `src/features/rfq/identity.ts` and CLAUDE.md constraint #5 exactly.** D-12 is closed
in our favour — the Bids doc was the thing that was wrong, not our implementation.

## What is verifiable today

| Check | Result |
|---|---|
| `GET /api/orders` | ✅ 200 `{all, awaitingSupplier, inTransit, delivered, closed, cancelled, declined, items[]}` |
| …and it takes **no `supplierId`** | ✅ identical response with and without — **resolves the caller from the token**, which is exactly the pattern `/api/bids/*` needs |
| `GET /api/orders/{orderId}` route registered | ✅ ProblemDetails `{"title":"Order not found.","status":404}` for an unknown GUID (an unregistered route gives 0-byte `text/html`) |
| `POST /api/orders/{orderId}/accept` route registered | ✅ GET → **405 Method Not Allowed** = route exists for another verb |
| Buyer→supplier direction, live | ✅ every supplier RFQ-detail and bid payload returns `identityNotice: "Buyer identity is revealed when you accept the purchase order."` |
| `supplierIdentityRevealed` / `supplierId` / `supplierDisplayName` on an order | ⛔ **unverified** — `items: []`, this supplier has no orders |
| `purchaseOrders[].supplierId === null` on award commit | ⛔ **unverified** — award is 403 for `kind: supplier` |

Closing the last two needs a buyer account and a full cycle: award → PO issued → supplier accepts.

## Two conflicting `confirmBody` strings in what Backend sent

The award-preview payload appears twice in their message with **different copy**:

```
old: "This will notify the selected suppliers and reveal your company details to them."
new: "…Terms lock to their current offers now. Identities are revealed when they accept
      their purchase order… The other bidders are told only that the RFQ closed"
```

The old string asserts reveal **at award**, in the buyer→supplier direction, and contradicts the
agreed rule. Backend must confirm the new copy is what is deployed.

## What the reveal payload must carry

`AwardConfirmedPage` renders company name, CR, VAT, address, contact name and contact role. The
record Backend quoted exposes only `SupplierDisplayName`, `SupplierIdentityRevealed` and
`SupplierId`. **An id and a display name are not enough to populate that screen** — either the order
payload carries the full identity block once revealed, or there must be an endpoint that resolves
`supplierId` → company profile after acceptance.

---

# Round 4 — re-test after Backend's fix announcement (2026-08-21, ~09:00Z)

Backend reported: `purchaseOrders[].supplierId` now null, `proposedDeliveryDate` overwrite fixed,
split-award rule published, certificates/wallet + sanitization delivered.

**Nothing is on dev.** All three supplier-testable items are unchanged:

| Claim | Re-test | Result |
|---|---|---|
| `proposedDeliveryDate` overwrite fixed | RFQ-0011 (`allowPartialDelivery: false`), sent `2026-11-03` / `2026-11-17` | **still overwritten** — both returned `2026-10-01` (the RFQ `requiredDeliveryDate`) |
| supplier GETs blind to own writes | `my-bid` / `my-bids` | **unchanged** — 204 and `total: 0` |
| certificates / wallet routes | `GET /api/bids/certificates` | **unchanged** — 0-byte `text/html` 404, identical to a nonsense route |

The `allowPartialDelivery: false` case is precisely the one named as fixed, so this is the same
build as this morning.

## Split award — published rule vs `award.ts → buildAwards()`

Backend's rule: only `Bidding`/`Negotiating` quotations from the request are considered; per RFQ
line, among bids where `isIncluded`, lowest `unitPrice` takes the **whole** line at their quoted
quantity; quantity is never split; a bid that excluded the line cannot win it; ties resolve to the
first entry in `quotationIds` (stable); a selected supplier winning no lines gets no PO;
`allowSplitAward` is **not** checked at award.

Our mock already implements the same algorithm. Three divergences, all mock-side:

| # | Backend | `buildAwards()` |
|---|---|---|
| 1 | Ties → first in **`quotationIds` request order** | `const selected = detail.bids.filter(b => selectedBidIds.includes(b.id))` — ties resolve in **`detail.bids` order**, not the caller's order |
| 2 | Only `Bidding` / `Negotiating` considered | no status filter; a withdrawn/declined/expired bid passed via `?bids=` would be allocated |
| 3 | `allowSplitAward` ignored | UI gates on `rfq.splitAwardAllowed` |

None of these matter in real mode, because Backend's instruction is to render
`award/preview → allocations[].lineNumbers` instead of computing locally — which is what we will do.
They matter only if the mock is meant to stay a faithful spec of the backend; #1 and #2 are worth
correcting there regardless.

## Identity reveal — the contract is now unambiguous

| Field on `GET /api/orders/{orderId}` | Before accept | After accept |
|---|---|---|
| `supplierIdentityRevealed` | `false` | `true` |
| `supplierId` | `null` | GUID |
| `supplierDisplayName` | anonymous alias (`Supplier A`) | real supplier ref |

`purchaseOrders[].supplierId` on award commit is **always null** (it previously leaked the real id —
Backend's own finding). Rule: treat `supplierIdentityRevealed` + `supplierId` **on the order** as the
only buyer-facing identity; never read award `supplierId`.

This matches `src/features/rfq/identity.ts` exactly, and `supplierDisplayName` is a direct
server-side equivalent of our `supplierDisplayName()` helper.

---

# Round 5 — after the deploy (2026-08-21, ~11:05Z)

## ✅ Fixed and verified

| Item | Evidence |
|---|---|
| `proposedDeliveryDate` no longer overwritten | RFQ-0011 (`allowPartialDelivery: false`) — sent `2026-11-03` / `2026-11-17`, **got both back**; `earliestDelivery`/`latestDelivery` now reflect the real spread instead of collapsing to `requiredDeliveryDate` |
| `GET /api/bids/certificates` | 200, and a wallet upload **reads back** — `{certificateId, fileName, contentType, sizeBytes, uploadedAt}` |
| `POST /api/bids/certificates` | 200 → `certificateId` |
| `DELETE /api/bids/certificates/{id}` | 204 (not in Backend's message, but deployed and needed by the picker) |
| `POST /api/bids/{qid}/attachments/from-saved` | 200 → attachment `id`, carrying the sanitized 2152-byte copy |
| `saveToWallet` | defaults **true** (a bid upload appeared in the wallet); `saveToWallet=false` **honoured** (PNG not added) |
| Content-type allow-list, **both** upload paths | `.exe` and `.txt` → 400 `"Only PDF, PNG, JPG, and JPEG documents are supported."` |
| **Magic-byte validation** | exe bytes declared `application/pdf` named `evil.pdf` → 400 `"File content does not match the declared file type. Ensure the file is a valid .pdf document."` — stronger than requested |
| Metadata sanitization, **both** paths | 614-byte PDF with a fat `/Info` → stored **2152 bytes** on wallet upload *and* on direct bid upload. The file is rebuilt, not passed through (it was byte-identical at 614 before the deploy) |

## 🔴 Still broken — the one blocker

Supplier GETs remain blind to their own writes, unchanged:

```
POST /draft            → 200  quotation f95d9e56-…  status Draft
GET  /rfq/{id}/my-bid  → 204
GET  /my-bids?tab=All  → 200  {"total":0,"allCount":0,"draftCount":0,…}
GET  /available-rfqs   → that row's myBid = null,  declinedCount = 0
```

**The deploy sharpened the diagnosis.** `GET /api/bids/certificates?supplierId={same id}` now reads
back correctly. Same parameter, same supplier, same controller prefix — the wallet query resolves the
supplier and the quotation queries do not. So this is **not** a general "supplierId cannot be
resolved" problem; the quotation read path specifically joins on something the write path does not
set (or on a different id). `GET /api/orders` and `GET /api/bids/certificates` are both working
examples inside the same API.

## 🟠 Still missing

1. **No `source` on `attachments[]`.** Keys are still `{id, fileName, contentType, sizeBytes,
   uploadedAt}`. The frontend cannot tell a wallet-sourced attachment from a direct upload, so
   "remove" cannot honour the agreed rule that detaching a wallet document must never delete the
   wallet copy.
2. **No download route.** `GET …/attachments/{id}/download`, `…/certificates/{id}/download` → 404;
   `…/certificates/{id}` → 405. The buyer still cannot open a supplier's certificate, and the
   supplier cannot re-download their own.
   This also means **sanitization is verified only by size, not by content** — a 614→2152 rewrite
   proves the file was rebuilt, but without a download I cannot confirm the `Author` string is gone.
3. Buyer endpoints still 403 (`kind: supplier`). Award, split allocation and the identity reveal
   remain unverified end to end.

## Test data left on dev

`RFQ-0011` (`28734a69-…`) — quotation `f95d9e56-b96a-4b66-bdc6-29e3741a8827`, status **Draft**,
0 attachments, wallet emptied (verified). Never submitted; no endpoint deletes a draft.

---

# Round 6 — validating the client against the wire (2026-08-21, ~14:40Z)

Two behaviours probed while building `bidsMappers.ts`, on `RFQ-2026-0037`
(`ebcca3e6-8077-446b-8066-69ed62cb4792`) — the only RFQ on dev with `allowPartialBids: true`
(3 items, `minItemsPerBid: 2`).

## 🔴 The documented line shape returns a 500

The doc says of `lines[].isIncluded`: *"False means not supplying this line; the line is kept so the
compare grid can still show the quantity."* Sending that shape crashes the server.

| Body | Result |
|---|---|
| **Only the included lines** (2 of 3 sent) | **200** — `itemsPriced 2/3`, `lineSummary "2 of 3 items quoted."`, `bidTotal 3075` (120×15 + 85×15 ✓) |
| **All 3 lines, the excluded one as `isIncluded: false, unitPrice: 0`** | **500** `{"title":"An unexpected error occurred.","status":500}` |

So a partial bid can only be expressed by **omitting** the excluded lines, and the server reads that
correctly — it still reports the line count as `2/3`. `toBidLineRequests()` sends only included
lines for exactly this reason.

Two asks for Backend: fix the 500 (an unhandled zero/`isIncluded:false` path), and correct the doc,
because a client built to the documented shape fails on every partial bid.

A follow-up POST confirmed the 500 leaves **no corruption** — the draft re-saved cleanly with the
same `quotationId`.

## ✅ `minItemsPerBid` is enforced

Submitting 1 of 3 lines where the buyer set a floor of 2:

```
POST …/submit → 400 {"title":"At least 2 of 3 items must be priced.","status":400}
```

Together with `allowPartialBids: false` → `"This RFQ requires a price on every line."`, the buyer's
partial-bid rules are honoured end to end. Both are mirrored client-side so the Submit button
explains itself before the round-trip.

---

# Round 7 — the read fix landed (2026-08-21, ~13:15Z)

## ✅ THE BLOCKER IS FIXED

Supplier reads now resolve. Same draft, same `supplierId`:

```
GET /bids/rfq/{id}/my-bid  → 200, the full ~30-field bid
GET /bids/my-bids?tab=All  → 200, allCount 8 · draft 4 · bidding 1 · negotiating 0 · won 0 · lost 3
GET /bids/available-rfqs   → that row's myBid populated; declinedCount 1, matchedCount 2
```

`my-bid` returns **exactly the same shape** as draft/submit/withdraw, so one DTO serves all four.

**Two payloads are richer than anything we modelled**, and both fill gaps the doc called unavailable:

`GET /my-bids` row —
```json
{"quotationId":"a02a28bc-…","rfqId":"ebcca3e6-…","rfqNumber":"RFQ-2026-0037",
 "rfqTitle":"Rebar and site cabling package - Riyadh tower fit-out",
 "category":"Electrical Equipment","partialBidNote":"partial bid · 2 of 3 items",
 "status":"Draft","bidTotal":3075,"submittedAt":null,
 "activityLine":"Draft saved","activityAt":"2026-08-21T11:39:08Z","actionHint":"Resume"}
```
`activityLine`/`activityAt` are the My Bids last-activity column the doc said was not returned, and
`partialBidNote` is the "2 of 3 items" subtitle. `closingDate` — which the doc promises — is absent.

Available-RFQ row `myBid` —
```json
{"quotationId":"a02a28bc-…","status":"Draft","bidTotal":3075,
 "activityLine":"Draft saved","activityAt":"2026-08-21T11:39:08Z"}
```
So the opportunity card can say "Your bid · SAR 3,075 · Draft saved" with no per-row second call.

## ✅ `source` is on the attachment, and it is correct

```
from-saved (created after the deploy) → "saved"
direct upload                          → "upload"
```

⚠️ The two attachments created **before** the deploy both read `"upload"`, including the one made via
`from-saved` — they were backfilled with the default. Provenance is only trustworthy for rows created
since. Not a defect, but it means the field cannot be used to audit older attachments.

## ✅ Download works — and sanitization is now verified by CONTENT, not just size

`GET /api/bids/attachments/{id}/download` → **200**, `application/pdf`,
`Content-Disposition: attachment; filename=…`.

Downloading the stored copy of a PDF uploaded with a deliberately identifying `/Info` block:

```
stored:   /CreationDate(D:19700101000000+00'00')/Title()/Author()/Subject()/Keywords()
          /Creator()/Producer(PDFsharp 6.2.1)/ModDate(D:19700101000000+00'00')
original: /Author(WALLET SOURCE ACME SUPPLIER)/Title(FE PROBE - safe to delete)/Creator(FE-Probe)
```

Every identifying value emptied, both dates zeroed to epoch. A whole-file grep for the author,
title and creator strings comes back clean, so the XMP stream is clean too. The only surviving value
is `Producer(PDFsharp 6.2.1)` — the sanitizer's own name, identical for every supplier, so it
identifies the platform rather than the bidder.

⚠️ **The one remaining leak is the file name**, exactly as Backend flagged: the download's
`Content-Disposition` carries the ORIGINAL name (`FE-PROBE-WALLET-SOURCE.pdf`). A file called
`ACME_Steel_ISO9001.pdf` still identifies its supplier to the buyer. Buyer-facing surfaces must
render their own label rather than the stored name.

## ❌ Still open

| | |
|---|---|
| `lines[].isIncluded: false` | still **500**. Only included lines may be sent — our mapper already does this |
| Buyer endpoints 11–15 | still **403**; no `kind: buyer` account, nothing verified |
| Order payload once identity is revealed | does it carry company / CR / VAT / address / contact, or only `supplierId` + `supplierDisplayName`? |

---

# Round 8 — the buyer half, end to end (2026-08-21, ~13:40Z)

Account `Mikelnjoba@gmail.com`. NB it reports **`kind: buyer`** (role `SuperAdmin`), not `both`, so
it cannot bid — the flow below is two accounts: this buyer, and the QA supplier from earlier rounds.

It owned no RFQs and had no bids, so the whole chain was built from scratch:
**publish RFQ-0061 (`146d2c8f-…`) → supplier bids (`775b78a1-…`, SAR 5,275, 3/3 lines) → buyer awards.**

## ✅ Closed

| Question | Answer |
|---|---|
| Buyer endpoints reachable | Yes with a buyer token; the earlier 403s were purely the missing role |
| `GET /api/buyer/bids` shape | **`groups[]`**, not `items[]` — `{rfqId, rfqNumber, rfqTitle, bidsReceived, closingLabel, statusChip}` — plus top-level **per-bid-status counts** (`allCount/submittedCount/negotiatingCount/wonCount/lostCount/withdrawnCount/declinedCount/expiredCount`). **D-14 closed**: the buyer's status chips have a source after all. No `lowestBidTotal`/`negotiatingCount` on the group, which the doc promised |
| `/bidders` shape | top level is **`notice`**, not `identityNotice`; rows carry `{quotationId, bidderLabel, status, bidTotal, itemsPriced, itemsRequested, latestDelivery, complianceLabel, complianceComplete, isLowestTotal, statusChip}` — both vocabularies side by side (`status: "Bidding"` + `statusChip: "Submitted"`). No `submittedAt`, which the doc promised |
| Compare minimum | **≥ 2 bids** — `400 "Select at least two bids to compare."` The doc said the count was "not stated"; it is now |
| Award preview | 200. `allocations[].lineNumbers` are **1-based** `[1,2,3]`; `canAward`, `requiresComplianceOverride` present |
| **Does preview consume the PO counter?** | **No.** Four consecutive previews all returned `PO-2026-0001`. **DOC Open item 15 closed** |
| Award commit — identity | **`purchaseOrders[].supplierId: null`.** No leak |
| **What the reveal payload carries** | The award response already models our screen exactly: `awardCards[].identityFields` = Commercial registration / VAT number / Registered address / Primary contact / Certifications, each `"Revealed on acceptance"` with `revealedNow: false`, plus `identityFooter`. **This was my open question, and the answer is: nothing more is needed** |
| **D-13 — rebuilding `RfqAward`** | Closed. `awardCards[].agreedTerms` carries `sourceLabel: "from offer v1"`, `agreedTotal`, `itemsCovered/Requested`, `deliveryDate`, `paymentTermsLabel`, `negotiationRounds`, `savedVsOriginalBid`; plus `winningQuotationIds` / `losingQuotationIds` |
| Duplicate award | **Prevented.** A repeat of the identical call → `400 "This RFQ can no longer be awarded."` Not idempotent in the return-the-original sense, but it cannot issue a second set of POs — which is the property that matters |
| Bid outcome | Supplier's `my-bids` flips to `status: "Won"`, `activityLine: "You were awarded"`, `wonCount: 1` |

## 🔴 NEW BLOCKER — the purchase order does not exist in the Orders module

The award returns `purchaseOrderId: d2fe3d75-c0a8-4af0-90ed-b3b9fd091222` / `PO-2026-0001`.
Nothing can resolve it:

```
GET /api/orders            (supplier) → 200 {"all":0, … "items":[]}
GET /api/orders            (buyer)    → 200 {"all":0, … "items":[]}
GET /api/orders/{poId}     (supplier) → 404 {"title":"Order not found."}
GET /api/orders/{poId}     (buyer)    → 404 {"title":"Order not found."}
```

Also 404: `/orders/by-po/{id}`, `/orders/purchase-order/{id}`, `/purchase-orders/{id}`,
`/orders/quotation/{qid}`, `/orders/rfq/{rfqId}`, `/buyer/orders`. Re-polling both lists after the
award changes nothing, so it is not an async projection lag.

**Consequences.** The supplier cannot accept the PO, so:
- **the identity reveal cannot happen at all** — it is defined as `GET /api/orders/{orderId}` →
  `supplierIdentityRevealed`, and there is no order to read;
- `POST /api/orders/{orderId}/accept` has no valid target (the route is registered — a bogus GUID
  gives ProblemDetails, not a routing 404 — but no order exists to accept);
- the entire post-award flow (accept → dispatch → deliver → close) is unreachable.

The award clearly writes a PO reference inside the bids module; no Order record is created in the
orders service. The Bids doc notes these are "a different service and database … scalar references,
not foreign keys" — that boundary is currently not being crossed.

## ⛔ Still untested, and why

| | |
|---|---|
| **Compare (§13)** | needs ≥ 2 bids on one RFQ, i.e. a **second supplier account** |
| **Split award** | same — one supplier cannot produce a split. The published rule (lowest unit price per whole line, no quantity splitting) is therefore still unverified on the wire |
| **Identity reveal** | blocked on the missing order, above |

## 🟠 Side finding — the RFQ wizard cannot express partial bids

`POST /api/rfq-draft/{id}/step2` has no field for `allowPartialBids` or `minItemsPerBid`, and the
`allowPartialDelivery: true` I sent came back **false** on the supplier's view of the published RFQ.
So a buyer creating an RFQ through the wizard can never allow a partial bid — every RFQ it produces
demands a price on every line. (The only dev RFQ with `allowPartialBids: true`, RFQ-2026-0037, was
not created through this path.) This is an RFQ-module gap, not a Bids one, but it blocks testing the
partial-bid and split-award behaviour through the supported flow.

## Test data left on dev

`RFQ-0061` (`146d2c8f-7234-49d3-8274-69b960772443`) — **Awarded**, quotation `775b78a1-…` **Won**,
`PO-2026-0001` (`d2fe3d75-…`) issued but unreachable. Left in place for Backend to trace.

---

# Round 9 — second supplier account (2026-08-21, ~18:00Z)

Goal: two bids on one RFQ, to finally exercise **Compare** (which needs ≥2) and **split award**.

**Blocked.** The second account cannot use the supplier bid API at all.

## `marinalamey16@gmail.com` — every `/api/bids/*` call returns `400 "Unknown supplier."`

The account is healthy by every other measure:

```
GET /api/auth/me           → 200  kind: both · role: User · status: Verified · tenantStatus: Active
GET /api/onboarding/resume → 200  accountType: "Both" · status: "Completed" · org "Marina"
GET /api/profile/status    → 200  {"status":"Verified"}
GET /api/dashboard/supplier→ 200
GET /api/dashboard/buyer   → 200
```

Yet:

```
GET  /api/bids/available-rfqs?supplierId={id}   → 400 {"title":"Unknown supplier."}
GET  /api/bids/my-bids?supplierId={id}          → 400 Unknown supplier
GET  /api/bids/rfq/{id}/my-bid?supplierId={id}  → 400 Unknown supplier
GET  /api/bids/certificates?supplierId={id}     → 400 Unknown supplier
POST /api/bids/rfq/{id}/decline?supplierId={id} → 400 Unknown supplier
```

## The diagnosis: a `Both` account resolves as a buyer, not as a supplier

Same account, same token, same `user.id`:

```
GET /api/buyer/bids?buyerUserId={id}            → 200  (it even OWNS RFQ-2026-0037)
GET /api/bids/available-rfqs/{rfqId}?supplierId={id} → 200  (RFQ detail — no supplier lookup needed)
everything else on /api/bids/*                  → 400  Unknown supplier
```

So the role gate passes (a wrong-role caller gets **403**, as the buyer account does — not 400); it is the
**supplier-record lookup** that fails. The buyer half of the same tenant resolves fine.

| Account | kind | `/api/bids/*` | Meaning |
|---|---|---|---|
| `t61jc…@inbox.testmail.app` | `supplier` | **200** ✓ | gate passes, lookup succeeds |
| `marinalamey16@gmail.com` | `both` | **400 Unknown supplier** | gate passes, **lookup fails** |
| `Mikelnjoba@gmail.com` | `buyer` | 403 | gate refuses (correct) |

**The gate is `kind`, and it is behaving correctly** — `buyer` is refused with 403, `both` is admitted.
The failure is downstream of it, in the supplier-record lookup.

### The decisive comparison: two modules disagree on the same account

```
GET /api/dashboard/supplier   → 200   counts.availableRfqs = 16
GET /api/bids/available-rfqs  → 400   Unknown supplier
GET /api/bids/certificates    → 400   Unknown supplier
```

The dashboard resolves this `kind: both` account as a supplier — it even counts the 16 RFQs the
account could bid on. The bids module, same token and same `kind`, cannot resolve it at all. So this
is not an account-data problem and not a permissions problem: **`/api/bids/*` handles
`kind: supplier` but not `kind: both`, where every other module does.**

**Product impact beyond testing.** "One email/company can be both buyer and supplier" is a core
domain rule (CLAUDE.md §1, and the doc's own `BuyerAndSupplier` permission on every supplier
endpoint). Today a `Both` account cannot bid at all, so the dual-role product does not work.

## Consequently still untested

| | Needs |
|---|---|
| **Compare (§13)** | two bids on one RFQ — `400 "Select at least two bids to compare."` with one |
| **Split award** | two suppliers; the published rule (lowest unit price per whole line, no quantity splitting) has still never been observed running |

Both unblock the moment a second account can resolve as a supplier — either fix `Both`, or provide a
second `accountType: Supplier` account.

---

# Round 10 — third account, and a null-figure defect (2026-08-21, ~19:30Z)

## Q1 confirmed with a second `kind: both` account

`saima.khanum@mi-technologies.sa` (`a9685342-…`) — `kind: both`, `role: Admin`, onboarding
`accountType: "Buyer"` — returns the same `400 "Unknown supplier."` on every `/api/bids/*` endpoint.

It differs from the first failing account in **role** (Admin vs User) and **accountType** (Buyer vs
Both), so those are ruled out. The only constant across both failures is `kind: both`, and the only
success is `kind: supplier`. `/api/bids/*` handles just the one value.

Its `/api/dashboard/supplier` returns 200 with `availableRfqs: 16`, and `/api/buyer/bids` returns
its 8 RFQs — so the account resolves everywhere except the bids supplier lookup.

**Compare and split award remain untestable**: this account cannot bid either, and none of its 8
RFQs has more than one bid (RFQ-0033: 1, RFQ-0030: 1, RFQ-0026: 1).

## 🟠 New defect found — and fixed on our side

A **Withdrawn** bidder returns NULL figures, which the doc does not mention and our DTO typed as
non-nullable:

```
GET /api/buyer/bids/rfq/{id}/bidders
  RFQ-0033 → Supplier A · Withdrawn · bidTotal null · itemsPriced null · itemsRequested null
  RFQ-0026 → Supplier A · Withdrawn · bidTotal null · itemsPriced null · itemsRequested null
  RFQ-0030 → Supplier A · Submitted/Bidding · SAR 880,000 · 2/2
```

Left unhandled this would have printed "SAR null" in the buyer's Bids inbox. Fixed: the three fields
are nullable in `ApiBidderDto` and `BidderRow`, `latestDelivery` too, and the inbox renders an em
dash for a bid with no figures — the same treatment a declined bid already got. Pinned by a test
against the capture.

**Question for Backend (minor):** is nulling the figures on withdrawal intended, or should the row
keep the last submitted total? Either is workable; we handle null today.

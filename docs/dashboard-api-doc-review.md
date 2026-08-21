# Buyer & Supplier Dashboard API — documentation review

**Reviewed 2026-08-19.** Source: `Buyer-and-Supplier-Dashboard-API-Documentation 1.pdf`
("**DOC**" below), version 1.0, last updated 18 August 2026.

Cross-checked against the implemented screens:
[BuyerDashboardPage.tsx](../src/features/dashboard/BuyerDashboardPage.tsx),
[useBuyerDashboard.ts](../src/features/dashboard/useBuyerDashboard.ts),
[SupplierDashboardPage.tsx](../src/features/dashboard/SupplierDashboardPage.tsx),
[useSupplierDashboard.ts](../src/features/dashboard/useSupplierDashboard.ts),
[types.ts](../src/features/dashboard/types.ts).

---

## 0. Framing — read this before anything else

Three statements in DOC's own front matter set the ceiling on how much of it we can trust.

> **Matches deployed code?** | Unknown for deployed environments. This document matches the
> current workspace code after merging origin/dev into negotation_orders. It has not been
> verified against a live HTTP response in this review.
> — DOC p1, header table

> Accuracy: a real request was not tested for this fill. Field names match DTOs, not a captured
> payload.
> — DOC p10, "Part B — Frontend review notes"

> 14 | No live request was tested for this document (Part B Accuracy). Backend or QA should
> capture a real 200 body before Frontend marks it ready.
> — DOC p10, open items

So: **this documents a feature branch (`negotation_orders`), not `dev`, and not a captured
response.** Every field name below is read off a C# DTO, not off the wire. Before we write a
mapper we need one real `200` body from each endpoint on `dev-api-miproc.mi-mony.com`.

DOC is also explicit that it could not do the UI gap analysis, which is the part this review adds:

> No screen designs were supplied, so no missing-endpoint flags can be raised from UI.
> — DOC p9, "Missing endpoints (screens were not attached)"

---

## 1. Endpoint inventory

DOC covers **exactly two endpoints**. Both are `GET`, both take **no parameters at all**.

### Buyer surface

| Endpoint | Purpose (DOC's words) | Params |
|---|---|---|
| `GET /api/dashboard/buyer` | "Returns the authenticated buyer's profile, up to five latest RFQs (published RFQs merged with drafts), the latest related purchase order (or null), and aggregate counts for the buyer home screen." (p2) | None — "No path, query, or body parameters are defined on this action in the controller or DTOs." (p2 §2.2) |

### Supplier surface

| Endpoint | Purpose (DOC's words) | Params |
|---|---|---|
| `GET /api/dashboard/supplier` | "Returns the authenticated supplier's profile, up to five latest bids (quotations), the latest related purchase order (or null), and RFQ/bid counts for the supplier home screen." (p6) | None — "No path, query, or body parameters are defined on this action." (p6 §2.2) |

### Shared between the two

- **The `user` object.** Supplier's `user` is literally the buyer's DTO: "Same type as buyer user
  (**BuyerDashboardUserDto**). Same field table as Section 1." (p7). → **one mapper serves both
  surfaces.**
- **The `order` object.** The buyer's order is also typed with the supplier's DTO —
  "order (**SupplierDashboardOrderDto**, nullable)" (p4). Same three fields on both sides.
- **The auth scheme, the error middleware, and the 5-second profile timeout.**

### Named in DOC but NOT documented / out of scope

| Endpoint | DOC's statement |
|---|---|
| `GET /api/dashboard` (legacy aggregate) | "GET /api/dashboard (legacy aggregate) and super-admin verification endpoints are out of scope." (p1) and "GET /api/dashboard is a different payload and is out of scope." (p2) |
| Super-admin verification endpoints | Same line, p1. |
| `/api/orders` | Referenced only to say the dashboard does **not** use it: "Not the dump table purchase_order used by /api/orders." (p6) |
| Login / token issuance | "Login/token issuance is outside this module." (p2) |

**There is no third endpoint.** Everything the two dashboards render must come out of these two
payloads, or from an endpoint nobody has documented yet.

---

## 2. Request shape

**NOT APPLICABLE — and that is stated, not assumed.** Both §2.2 tables read:

> | Not applicable | — | — | No request fields | — |

Consequences we should be explicit about:

- No `?range=30d`, no date filter, no pagination, no `?take=`. The 5-row cap is server-side and
  fixed: "Latest RFQ list is capped at 5 (take: 5)." (p5) / "Latest bids capped at 5" (p8).
- No way to ask for a different slice for the "View all" link — that must hit the RFQ/bids list
  endpoints, not this one.
- Identity of the caller comes **entirely from the JWT**. There is no `orgId` or `supplierId`
  parameter.

---

## 3. Auth and role requirements

| | Buyer | Supplier |
|---|---|---|
| Policy | `VerifiedBuyer` | `VerifiedSupplier` |
| Required claims | "status=verified; kind=buyer or both" (p2) | "status=verified; kind=supplier or both" (p6) |
| Class-level policy | "The controller also has a class-level Verified policy (status=verified)." (p2) | "Class-level Verified policy also applies (status=verified)." (p6) |
| Transport | "Bearer JWT in the Authorization header (scheme Bearer). Token is also accepted from the httpOnly cookie named access_token (Program.cs JWT events)." (p2) | "Same as buyer" (p6) |
| Lifetime | "Default access-token lifetime in Jwt:ExpiryMinutes is 480 minutes." (p2) | "Default expiry 480 minutes" (p6) |

Two things matter enormously here:

1. **Cookie auth is supported**, which means our existing cookie-first axios instance with
   `withCredentials` works unchanged. No new auth work. (Consistent with the finished auth
   integration — see CLAUDE.md §3.)
2. **`kind` gates everything, and new accounts do not have it:**

> kind is omitted from the JWT until onboarding selects an account type; without kind, this policy
> fails.
> — DOC p2

This is the **same class of blocker that stopped the RFQ integration** (ENV-1: test account is role
`Requester` with no org claim → 403). We need a token that carries `status=verified` **and**
`kind`. A "Both" account would unblock both surfaces with one login.

**Note a contradiction with our own RFQ findings:** DOC says the role enum is
> Current enum values: Admin, User, SuperAdmin.
> — DOC p3, `user.role`

but the account we tested during RFQ integration reported role **`Requester`**. Either DOC's enum is
stale, or our token is. → question B-13 below.

---

## 4. Error format

| Code | DOC's statement | Verdict |
|---|---|---|
| 200 | "Also returned when RFQ/order/count loading throws: rfqs=[], order=null, counts zeroed; the failure is logged." (p5) | ⚠️ **Silent degradation** — see Gap M-1 |
| 401 | "ProblemDetails body: { status, title } via ExceptionHandlingMiddleware (application/problem+json). **Framework 401 body shape is not specified in dashboard sources.**" (p5) | Partially answered |
| 403 | "Not listed on this action's ProducesResponseType or in the OpenAPI excerpt for this path… **Exact status code and body for policy failure are not stated in the dashboard sources.**" (p5) | **NOT ANSWERED IN DOCS** |
| 400 | "Not applicable for this GET… No request body/query to validate." (p5) | Answered |
| 409 | "Not applicable. Not thrown by this endpoint in the supplied code." (p5) | Answered |
| 429 | "Not applicable. No rate limit is stated in the supplied sources." (p5) | **NOT ANSWERED** (absence of evidence, not evidence of absence) |
| 500 | "Unhandled exceptions outside the RFQ/order try/catch become { title: 'An unexpected error occurred.', status: 500 }." (p5) | Answered |

The error envelope is the **same `ProblemDetails {status, title}`** our auth layer already parses.
Nothing new to build. But note DOC's own open item #4: "Confirm 500 vs 401 when identity user load
fails".

---

## 5. Buyer response — exact shape

`200` body type `BuyerDashboardDto`, four top-level keys (p2 §2.3): `user`, `rfqs`, `order`,
`counts`. camelCase, enums as strings, dates ISO-8601, Guids as UUID strings (p1).

### `user` (`BuyerDashboardUserDto`) — p3

| Field | Type | DOC note |
|---|---|---|
| `id` | uuid | "Identity user id" |
| `email` | string | |
| `phoneNumber` | string | |
| `fullName` | string | "Display name from identity" |
| `role` | string enum | "Admin, User, SuperAdmin. Buyer/supplier capability is not this field; it lives on JWT kind." |
| `accountType` | string \| null | "Enum values: Buyer, Supplier, Both. Null if no onboarding profile was loaded." |
| `companyName` | string \| null | `OnboardingProfile.OrganizationName` |
| `companyAddress` | string \| null | "Comma-joined non-empty parts: AddressLine1, AddressLine2, 'Bldg {BuildingNumber}', StreetName, DistrictName, City, Region, PostalCode, Country." |
| `accountStatus` | string | "TenantUsers.Status.ToString()… Values: PendingAssignment, Active, Suspended. **If no row or lookup fails/times out: PendingAssignment.**" |
| `documents` | array | "Empty array if no profile." |

### `user.documents[]` (`BuyerAccountDocumentDto`) — p3–4

| Field | Type | DOC note |
|---|---|---|
| `id` | uuid \| null | "Null when the row is inferred from a profile URL field" |
| `kind` | string | inferred set: "CommercialRegistration, VatCertificate, NationalIdCertificate, NationalAddressCertificate" |
| `title` | string \| null | "inferred rows use the kind string as title" |
| `url` | string \| null | |
| `status` | string | "From document Status, or 'PENDING' if that is null… **Full set of stored Status values is not listed in dashboard sources.**" |
| `expiresAt` | date-time \| null | "Always null on inferred rows." |

### `rfqs[]` (`BuyerDashboardRfqDto`) — p4 — **only four fields**

| Field | Type | DOC note |
|---|---|---|
| `id` | uuid | "**RFQ id or RFQ draft id**" |
| `categories` | string | "**Comma-separated** distinct category names… Empty string if none." e.g. `"Steel, Cement"` |
| `amount` | number \| null | "EstimatedBudget on the RFQ or draft" |
| `status` | string | mapping at p6 (below) |

Status mapping (p6):
> Draft→draft, AwaitingVerification→pending, Live→published, Closed→closed, **Cancelled→deleted**,
> Awarded→awarded, PartiallyAwarded→partially_awarded, Expired→expired. Any other enum value:
> ToString().ToLowerInvariant().

### `order` (`SupplierDashboardOrderDto`, nullable) — p4 — **three fields**

`id` (uuid), `status` (string), `dueDate` (`PurchaseOrder.ExpectedDate`, nullable).

> Loaded from legacy PurchaseOrders (IOrderDbContext), not from snake_case purchase_order. Buyer:
> RFQs created by this user, then the newest PurchaseOrder whose RfqId is in that set. If the buyer
> has no RFQs, order is null.

Status mapping (p6): `Issued→issued, Acknowledged→acknowledged, Received→received, Closed→closed,
Cancelled→cancelled`.

### `counts` (`BuyerDashboardCountsDto`) — p4–5 — **five numbers**

| Field | DOC's definition |
|---|---|
| `totalRfqs` | "Count of RFQs created by this user plus count of that user's draft RFQs (Status = Draft)" |
| `draftRfqs` | "Count of RfqDrafts for this buyer with Status = Draft" |
| `bidsToReview` | "**Quotations with Status = Bidding** on this buyer's RFQs" |
| `currentNegotiating` | "Quotations with Status = Negotiating on this buyer's RFQs" |
| `avgRfqToAward` | "Average of (ClosingDate.Date − PublishedAt.Date) in days… **The field name does not mean 'days until award'; the code comment says publish-to-closing.**" |

---

## 6. Supplier response — exact shape

`200` body type `SupplierDashboardDto` (p7): `user`, `bids`, `order`, `counts`.

### `bids[]` (`SupplierDashboardBidDto`) — p7 — **seven fields**

| Field | Type | DOC note |
|---|---|---|
| `id` | uuid | Quotation id |
| `rfqId` | uuid | "Related RFQ id" |
| `categories` | string | "From RFQ line-item categories; empty string if unresolved" |
| `amount` | number | "Sum of included quotation lines: Quantity × UnitPrice (IsIncluded)" |
| `currency` | string | "Quotation.Currency; if blank, the code substitutes 'SAR'" |
| `status` | string | mapping below |
| `submittedAt` | date-time \| null | "SubmittedAt ?? CreatedAt from the quotation" |

Bid status mapping (p8):
> Draft→draft, Bidding→**submitted**, Won→**awarded**, Declined→declined, Negotiating→negotiating,
> Withdrawn→withdrawn, Expired→expired. Other enum values (Lost, Cancelled exist on
> QuotationStatus): ToString().ToLowerInvariant() (lost, cancelled).

### `counts` (`SupplierDashboardCountsDto`) — p7 — **two numbers**

| Field | DOC's definition |
|---|---|
| `totalRfqs` | "Distinct RfqId values on RfqSuppliers where SupplierId is in the resolved supplier id list. 0 if no supplier ids." |
| `activeBids` | "Quotations for those supplier ids with Status **Bidding or Negotiating**" |

### Supplier identity resolution — p8

> Supplier ids are resolved by **case-insensitive email match** on onboarding Suppliers. No match →
> totalRfqs 0, activeBids 0, bids [], order null.

A silent, total blank-out on an email mismatch, with a `200`. See Gap M-1.

---

## 7. What each screen can be built from **today**

Legend: ✅ buildable from DOC's contract · ⚠️ buildable but semantics differ · ❌ no data.

### Buyer dashboard — verified state

| Screen element (code ref) | Source in API | Verdict |
|---|---|---|
| WelcomeHero: org name, org type, user name | `user.companyName`, `user.accountType`, `user.fullName` | ✅ |
| "Verified suppliers only" strip | static copy | ✅ |
| Tile — **Active RFQs** (`live` + `partially_awarded`) | — `counts` has `totalRfqs` and `draftRfqs` only | ❌ **no count of live RFQs** |
| Tile — **Avg RFQ→Award** | `counts.avgRfqToAward` | ⚠️ **measures publish→closing, not →award** |
| Tile — **Bids to Review** | `counts.bidsToReview` | ⚠️ = all `Bidding` quotations; our UI means *bids nobody has opened yet* (`openedBidIds`) |
| Pipeline strip — Open / Bidding / **Negotiating** / Awarded / Completed | only `counts.currentNegotiating` | ❌ **4 of 5 segments have no source** |
| Action Required — supplier accepted → issue PO | — | ❌ no negotiation/thread data |
| Action Required — N bids to review on RFQ *X* | — | ❌ needs per-RFQ unopened-bid count |
| Action Required — supplier replied, open thread | — | ❌ no negotiation data |
| My RFQs row — **title** | — | ❌ **`rfqs[]` has no title** |
| My RFQs row — **reference** (`RFQ-2026-0042`) | — | ❌ **no reference field** |
| My RFQs row — "N bids" meta | — | ❌ no per-RFQ bid count |
| My RFQs row — amount | `rfqs[].amount` | ✅ (currency/VAT basis unconfirmed) |
| My RFQs row — status chip | `rfqs[].status` | ⚠️ `Cancelled→"deleted"`; no derived **Negotiating** chip |
| My RFQs row — anonymity pill | static | ✅ |
| Track order — PO number | — | ❌ `order` has `id` only |
| Track order — supplier label / anon label | — | ❌ |
| Track order — 5-stage timeline | `order.status` (single value) | ⚠️ status-only; **no `acceptedAt` / `dispatchedAt` / `deliveredAt`**, and our stage model is 5 steps vs DOC's 5 *statuses* that don't line up |
| Track order — due date | `order.dueDate` | ✅ |
| Track order — "View all" → `/buyer/orders/{id}` | `order.id` | ⚠️ **different table** from `/api/orders` — id may not resolve |
| Suggested suppliers | — | ❌ not in API (currently derived client-side) |
| Compliance & documents — title, status, expiry | `user.documents[]` | ⚠️ mostly ✅; no CR/VAT **reference number**, status value set unconfirmed |
| Quick actions | static | ✅ |

### Buyer dashboard — pending / rejected state

| Screen element | Source | Verdict |
|---|---|---|
| Verification banner (pending / verified / **rejected**) | `user.accountStatus` is `PendingAssignment \| Active \| Suspended` — **tenant seat status, not KYB** | ❌ **no rejected state exists** |
| VerificationStatusCard — per-doc CR / VAT / National Address with `verifying \| verified \| rejected` | `user.documents[].status` gives `PENDING` / `VERIFIED` | ❌ **no rejected, no reason text** |
| Rejection reason copy | — | ❌ |
| "Re-upload" mutation | — | ❌ not in these endpoints (super-admin verification endpoints "out of scope", p1) |

**The entire pre-verified dashboard — two of the page's three states — has no API behind it.**

### Supplier dashboard — verified state

| Screen element | Source in API | Verdict |
|---|---|---|
| WelcomeHero | `user.*` | ✅ |
| Tile — **Available RFQs** (matched, not yet bid) | `counts.totalRfqs` = distinct RFQs I'm linked to, all time | ❌ wrong metric; DOC p8: "top-level availableRfqs [is] not on SupplierDashboardDto" |
| Tile — **Active Bids** | `counts.activeBids` = `Bidding` + `Negotiating` | ✅ **exact semantic match** with our `submitted \|\| negotiating` |
| Tile — **Win Rate** | — | ❌ DOC p8: "winRate… [is] not on SupplierDashboardDto" |
| Pipeline — Invited / Submitted / Negotiating / Won / Lost | — | ❌ no per-status counts (only 5 bid rows) |
| Action Required — new invitation | — | ❌ no `invited` state in `bids[]`; an un-quoted invitation has no Quotation row at all |
| Action Required — buyer countered | — | ❌ no negotiation data |
| My Bids row — **RFQ title** | — | ❌ |
| My Bids row — **reference** | — | ❌ |
| My Bids row — "N of M items quoted" | — | ❌ |
| My Bids row — amount | `bids[].amount` + `currency` | ✅ |
| My Bids row — status chip | `bids[].status` | ⚠️ `Won→"awarded"` (we use `won`); no `invited` |
| Track order | same three fields as buyer | ⚠️/❌ same gaps |
| Suggested RFQs + match reason | — | ❌ |
| Compliance & documents | `user.documents[]` | ⚠️ same as buyer |

### Where the same endpoint returns different data per role

Nowhere — they are **two different endpoints with two different DTOs**. The only genuinely shared
payload is `user` (identical DTO, p7) and `order` (identical DTO, p4). A "Both" account calls
**both** endpoints and gets two independent payloads; DOC says nothing about a combined view.

### Anonymity check (Constraint #5)

Neither payload leaks counterpart identity: the buyer's `rfqs[]`/`order` carry no supplier fields,
the supplier's `bids[]` carry no buyer fields. **No anonymity violation.** The flip side is that the
buyer's Track-order card cannot even render *"Supplier A"* — there is no supplier label field at
all, anonymised or otherwise.

---

## 8. Gaps and blockers, ranked

### 🔴 BLOCKER

**B-1 — Which contract is actually live?** DOC flags a full-payload conflict, twice:

> FLAG — CONFLICT — Dashboard Endpoints Curl.txt shows GET /api/dashboard/buyer returning
> openRequests, activeRfqs, suppliers, committedSpend, sourcing, recentRequests, verification. That
> shape is not BuyerDashboardDto… **Do not implement the buyer dashboard against the Curl sample.**
> — DOC p6

> FLAG — CONFLICT — Dashboard Endpoints Curl.txt shows GET /api/dashboard/supplier returning
> availableRfqs, activeBids, winRate, paymentsReceivedMtd.
> — DOC p8

**This is the single most important finding in the review, and DOC gets the recommendation
backwards for our purposes.** The Curl shape maps onto our Figma dashboards far better than the DTO
shape does:

| Curl field | Our screen |
|---|---|
| `activeRfqs` | buyer tile 1 — **missing from the DTO** |
| `verification` | buyer verification card — **missing from the DTO** |
| `recentRequests` | My RFQs |
| `sourcing` | pipeline strip |
| `suppliers` | suggested suppliers |
| `winRate` | supplier tile 3 — **missing from the DTO** |
| `availableRfqs` | supplier tile 1 — **missing from the DTO** |

Either the Curl sample is an obsolete artefact of `GET /api/dashboard` (DOC's theory), or it is a
*newer* dashboard contract built against these designs. **We cannot write a line of mapper until
this is settled with a live call.** Verifying it costs one `curl`.

**B-2 — No account can call either endpoint.** "kind is omitted from the JWT until onboarding
selects an account type; without kind, this policy fails" (p2). Our known test accounts fail the RFQ
endpoints for the same reason. Until an account with `status=verified` + `kind=Both` exists on
`dev-api-miproc`, nothing here is testable — this is ENV-1 all over again.

**B-3 — The document describes a feature branch.** "matches the current workspace code after
merging origin/dev into negotation_orders" (p1). We do not know what `dev` serves. Everything below
is provisional on B-1/B-3.

**B-4 — List rows are unrenderable.** `rfqs[]` has **no title and no reference**; `bids[]` has
**no RFQ title, no reference, no line-item counts**. "My RFQs" and "My Bids" are the largest cards
on both pages and neither can be built. Comma-joined `categories` is not a substitute for a title.

**B-5 — The pipeline strip has no data.** Buyer: 1 of 5 segments (`currentNegotiating`). Supplier:
0 of 5. Both need per-status counts over the whole set, not a 5-row sample.

**B-6 — "Action Required" has no data on either side.** Every row we render is driven by
negotiation-thread state or per-bid read state. Neither exists in either payload, and no negotiation
endpoint is documented anywhere.

**B-7 — The pre-verified dashboards have no API.** `accountStatus` (`PendingAssignment | Active |
Suspended`) is a **tenant seat status**, not KYB verification, and has no `rejected` value. Document
`status` gives only `PENDING`/`VERIFIED` (p4). No rejection reason, no re-upload. Two of the three
page states are unbuildable, and the super-admin verification endpoints are explicitly "out of
scope" (p1).

### 🟠 MAJOR

**M-1 — The API degrades silently to a valid-looking empty dashboard.** Three separate paths return
`200` with zeroed data and no error signal:

> Also returned when RFQ/order/count loading throws: rfqs=[], order=null, counts zeroed (p5)
> Onboarding profile and tenant account-status lookups use a 5-second timeout. Failure or timeout:
> profile null / accountStatus PendingAssignment; the endpoint still returns 200. (p5)
> No match [on supplier email] → totalRfqs 0, activeBids 0, bids [], order null. (p8)

A buyer with 40 live RFQs would see *"0 Active RFQs, no RFQs yet"* and a supplier would see the
first-run empty state — presented as fact. This also breaks our **graceful failure** pillar: we
cannot show a retry because we cannot detect the failure. **Ask for a partial-failure flag.**

**M-2 — `avgRfqToAward` does not measure what its name (or our tile) says.** DOC is unusually blunt:
"The field name does not mean 'days until award'; the code comment says publish-to-closing" (p5).
Our tile is labelled *Avg RFQ→Award* and our code counts only full awards, explicitly excluding
partial ones. Wiring these together would print a wrong number under a right label.

**M-3 — `bidsToReview` semantics differ.** DOC = all `Bidding` quotations (p4). Our tile = bids
**nobody in the org has opened yet**, which is why the number falls as the buyer works. Same label,
different number.

**M-4 — Supplier `totalRfqs` ≠ "Available RFQs".** DOC = distinct RFQs the supplier is linked to via
`RfqSuppliers`, all time, any state (p7). Our tile = matched RFQs **not yet bid on**.

**M-5 — Two different order tables.** "Loaded from legacy PurchaseOrders (IOrderDbContext), not from
snake_case purchase_order" / "Not the dump table purchase_order used by /api/orders" (p4, p6). The
Track-order card links to `/buyer/orders/{id}` — an id from the legacy table may not resolve in the
Orders module. DOC raises this itself as open item #6.

**M-6 — Order timeline cannot be built.** We render 5 stages from `acceptedAt`, `dispatchedAt`,
`deliveredAt` and status. The API gives one status string and a `dueDate`. DOC's status set
(`issued/acknowledged/received/closed/cancelled`) also does not align with our Order statuses
(`awaiting_acceptance/in_transit/delivered/closed`) — "acknowledged" vs "accepted", and nothing maps
to `in_transit`.

**M-7 — `categories` is a comma-joined English string.** "Comma-separated distinct category names"
(p4). We are a bilingual RTL app; category names must be localisable, and CLAUDE.md keeps reference
lists in i18n for exactly this reason. A pre-joined string cannot be translated or re-punctuated for
Arabic. **Ask for `categoryIds[]`.**

**M-8 — `rfqs[].id` may be an RFQ id *or* a draft id** ("RFQ id or RFQ draft id", p4) with no
discriminator. Clicking a draft row would route to an RFQ detail id that does not exist. A
`isDraft` boolean (or separate arrays) is needed.

**M-9 — Status vocabulary mismatches.** `Cancelled→"deleted"` (p6) — an RFQ the buyer cancelled must
not read "deleted"; and `Won→"awarded"` on bids (p8) where our supplier UI says `won`/`lost`. Also
no derived **Negotiating** chip for an RFQ, which our list and dashboard both show.

**M-10 — Document `kind` and `status` sets are open.** Inferred kinds are
`CommercialRegistration | VatCertificate | NationalIdCertificate | NationalAddressCertificate`
(p3) — our `DOC_KEYS` are `cr | vat | nationalAddress`, so `NationalIdCertificate` is unmapped — and
"Full set of stored Status values is not listed in dashboard sources" (p4). We cannot write an
exhaustive switch. DOC's own open item #10.

### 🟡 MINOR

- **N-1 — 403 body/status unspecified** (p5). Our interceptor needs to know whether a wrong-`kind`
  user gets 401 (→ we'd log them out, wrongly) or 403 (→ show "no access").
- **N-2 — `amount` has no currency on the buyer side.** Supplier `bids[]` has `currency`; buyer
  `rfqs[]` does not. VAT basis is **NOT ANSWERED IN DOCS** — and CLAUDE.md's rule is SAR ex-VAT per
  line with 15% on the subtotal, so this matters.
- **N-3 — No dates on `rfqs[]`.** No created/published/closing date, so we cannot show "closes in
  N days" or re-sort client-side (server sorts by `CreatedAt desc`, p5).
- **N-4 — Rate limiting / caching unknown.** "Rate limits, file size, cooldowns: not stated in
  sources" and "No request caching behaviour is stated in sources" (p6). Affects our `staleTime`.
- **N-5 — Supplier resolution by email only** (p8) — fragile, and it means a supplier who changes
  their email silently loses their whole dashboard. DOC's open item #11.
- **N-6 — 480-minute token vs an always-open dashboard tab.** Refresh already handled by our auth
  layer; just confirm the deployed `Jwt:ExpiryMinutes`.

---

## 9. Open questions for the backend team (forward as-is)

**Contract identity**

1. Which response shape does `GET /api/dashboard/buyer` return **on `dev-api-miproc.mi-mony.com`
   right now** — the DTO shape (`user`, `rfqs`, `order`, `counts`) or the Curl-sample shape
   (`openRequests`, `activeRfqs`, `suppliers`, `committedSpend`, `sourcing`, `recentRequests`,
   `verification`)? Please paste a real captured `200` body for both `/buyer` and `/supplier`.
2. Is the branch `negotation_orders` merged to `dev`? If not, which of the fields below exist on
   `dev` today?
3. The Curl sample's fields (`activeRfqs`, `verification`, `winRate`, `availableRfqs`) are exactly
   the ones our approved dashboard designs need and the DTO lacks. Was the Curl sample built against
   these screens? If it is obsolete, are those fields planned for the DTO, and when?

**Access**

4. Please provide (or tell us how to provision) a **verified account with JWT `kind=Both`** on dev,
   so we can call both endpoints. Our existing test accounts have no `kind` claim.
5. When an authenticated user fails `VerifiedBuyer` / `VerifiedSupplier`, what exact status code and
   body come back — 401 or 403, and is the body `ProblemDetails`? We must not log a user out on what
   is really an authorisation failure.
6. Confirm `Jwt:ExpiryMinutes` on the dev environment (config default is 480).

**Fields we need added**

7. `rfqs[]` currently has `id`, `categories`, `amount`, `status`. Our "My RFQs" card needs **`title`,
   `reference` (RFQ-2026-NNNN), `bidCount`, `createdAt`/`closingDate`**. Can these be added?
8. `bids[]` needs the same treatment: **RFQ `title`, RFQ `reference`, and `itemsQuoted`/`itemsTotal`**
   for the "3 of 5 items" line.
9. `rfqs[].id` may be "RFQ id or RFQ draft id" with no discriminator. Can you add an `isDraft`
   boolean, or return drafts in a separate array? We route the two to different pages.
10. `categories` is a comma-joined display string. Can we get `categoryIds: uuid[]` instead (or as
    well)? We localise category names in the frontend for Arabic and cannot translate a pre-joined
    English string.
11. Does buyer `rfqs[].amount` (EstimatedBudget) include VAT, and what currency is assumed? The
    supplier's `bids[]` carries `currency` but the buyer's `rfqs[]` does not.

**Counts we need that don't exist**

12. Buyer pipeline needs counts across the **whole** RFQ set, not a 5-row sample: RFQs that are
    live-with-no-bids, live-with-bids, negotiating, awarded/partially-awarded, and completed orders.
    Only `currentNegotiating` exists. Can a `pipeline` counts block be added?
13. Buyer tile 1 needs **count of RFQs in `Live` + `PartiallyAwarded`**. `counts` has only
    `totalRfqs` and `draftRfqs`.
14. Confirm the intended meaning of `counts.avgRfqToAward` — the doc says the code computes average
    **publish-to-closing** days, not time-to-award. Our tile is labelled "Avg RFQ → Award". Which is
    intended, and can we get true time-to-award (publish → first award)?
15. `counts.bidsToReview` counts all quotations in `Bidding`. Our tile means **bids not yet opened by
    anyone in the buyer org**. Is per-bid read state tracked server-side? If not, we need it, or the
    tile has to change meaning.
16. Supplier needs **`winRate`** (won ÷ (won + lost)) and **`availableRfqs`** (matched RFQs not yet
    bid on). `counts.totalRfqs` is "distinct RfqId on RfqSuppliers", which is a different number. Can
    these be added?
17. Supplier pipeline needs counts by bid status: invited / submitted / negotiating / won / lost.
    Note there is no `invited` state in `bids[]` at all — is an un-quoted invitation represented
    anywhere?

**Action Required feed**

18. Both dashboards show an "Action Required" list driven by negotiation state: *supplier accepted →
    issue PO*, *buyer countered → reply*, *N unread bids*. None of this is in either payload. Is
    there a negotiations/threads endpoint, or should the dashboard endpoint return an `actions[]`
    array? This is the top card on both pages.

**Verification / KYB**

19. `user.accountStatus` is `PendingAssignment | Active | Suspended` (tenant seat status). Our
    dashboards render **pending / verified / rejected KYB** states with a per-document breakdown
    (CR, VAT, National Address), a rejection reason, and a re-upload action. Which endpoint serves
    that? DOC marks the super-admin verification endpoints out of scope.
20. Confirm the complete value sets for `user.documents[].kind` and `.status`. DOC lists inferred
    kinds only and says the stored `status` set is not enumerated. We map `cr`, `vat`,
    `nationalAddress` — where does `NationalIdCertificate` belong?

**Orders**

21. The dashboard `order` comes from legacy `PurchaseOrders`, while `/api/orders` uses
    `purchase_order`. Will an `order.id` from the dashboard resolve against `/api/orders/{id}`? Our
    card links straight there.
22. Track-order renders 5 stages. We need **`poNumber`**, **`acceptedAt`**, **`dispatchedAt`**,
    **`deliveredAt`** and an anonymised supplier label — the DTO has only `id`, `status`, `dueDate`.
    Can these be added, or should the card call the Orders endpoint instead?
23. Confirm the order status vocabulary: is `acknowledged` the same event our UI calls "accepted by
    supplier"? Nothing in your set maps to our `in_transit`.

**Behaviour**

24. On partial failure the endpoint returns `200` with zeroed counts / empty lists (and
    `accountStatus: PendingAssignment` on a profile timeout). The frontend cannot distinguish that
    from a genuinely empty account, so it will show "0 RFQs" as fact. Can the response carry a
    `degraded: true` / `partialFailure: [...]` flag so we can show a retry instead?
25. Is `user.role` really `Admin | User | SuperAdmin`? Our RFQ test token reported role `Requester`.
26. Any rate limit or cache headers on these two endpoints? We want to set a sensible `staleTime`.

---

## 10. Proposed integration order

All of this lands in **myapp only** (Constraint #2); MI-Proc stays mock. Behind a
`useRealDashboard` flag in `platform/config.ts`, mirroring `useRealRfq`.

### Phase 0 — Unblock (no code)
Answer Q1–Q6. Concretely: a `kind=Both` verified account + one captured `200` from each endpoint on
dev. **Until this lands, any mapper we write is guesswork against a feature branch.** Everything
below assumes the DTO shape is confirmed live.

### Phase 1 — The `user` block (both surfaces, one mapper) ✅ *safe to start the moment Phase 0 lands*
`BuyerDashboardUserDto` is shared verbatim by both endpoints (p7). One DTO + one mapper serves:
- WelcomeHero (org name, org type, user name) — both dashboards
- Compliance & documents card — both dashboards

Smallest surface, highest confidence, zero contested semantics. It also proves auth, the cookie
path, the base URL and the error envelope end-to-end before we touch anything harder.

### Phase 2 — The counts that are honest ✅
Wire only the two that survive scrutiny:
- Supplier **Active Bids** ← `counts.activeBids` (exact semantic match)
- Buyer pipeline **Negotiating** segment ← `counts.currentNegotiating`

Leave `avgRfqToAward`, `bidsToReview` and supplier `totalRfqs` on mock until Q14–Q16 are answered.
**Do not ship a tile whose number contradicts its label.**

### Phase 3 — List rows ⛔ *blocked on Q7–Q10*
"My RFQs" / "My Bids". Cannot start: no title, no reference, ambiguous ids, unlocalisable
categories. When the fields land, this is a straightforward row mapper.

### Phase 4 — Track order ⛔ *blocked on Q21–Q23*
Blocked on the two-table question and the missing timestamps. Possibly resolved by having the card
read the Orders module endpoint instead of the dashboard payload — worth proposing.

### Phase 5 — Action Required & pipeline ⛔ *blocked on Q12, Q17, Q18*
No contract exists. This is new backend work, not integration work.

### Phase 6 — Verification states ⛔ *blocked on Q19–Q20*
A separate module (KYB), not these endpoints.

### Safe to run in parallel
Buyer and supplier are **two independent endpoints sharing only the `user` and `order` DTOs**. Once
the shared `user` mapper exists (Phase 1), the buyer surface and the supplier surface can be built
by two people without touching each other's files — the only shared code is
`dashboardDtos.ts` / `dashboardMappers.ts`.

**Not parallel-safe:** the i18n locale files and anything under `features/rfq/` while the supplier
tab is active (Constraints #12, #13).

### The honest summary
Of the ~35 distinct data points the two dashboards render, this contract supplies roughly **8**
cleanly, **6** with the wrong semantics, and leaves **the rest with no source at all**. Phases 1–2
are perhaps a day's work. Phases 3–6 are backend work first, integration second.

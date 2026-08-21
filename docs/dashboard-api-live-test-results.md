# Buyer Dashboard API — live test against deployed `dev`

**Tested 2026-08-19, 01:48–02:10 UTC.** Account `saima.khanum@mi-technologies.sa`.
Everything below is observed from real HTTP calls (~40 requests). No claim here comes from the PDF
or from a DTO. Where I could not test something, it is marked **NOT TESTABLE** with the reason.

---

## 1. Environment

| Fact | Result |
|---|---|
| `https://dev-api-miproc.mi-mony.com/api` | **Works directly.** (Contradicts the RFQ-era finding that the direct host timed out — that is fixed.) |
| `https://dev-miproc.mi-mony.com/api` (browser proxy path) | **Works identically** — login sets cookies on the proxy host, dashboard returns the same body. The real browser path is proven. |
| Swagger / OpenAPI | **Not deployed.** 404 on `/swagger/v1/swagger.json`, `/openapi/v1.json`, `/swagger/index.html`, `/api/swagger/v1/swagger.json`. |

### Login — `POST /api/auth/login` → `200`

```json
{"token":"","refreshToken":"","user":{"id":"a9685342-732c-46c0-85b7-079b40baede0",
"email":"saima.khanum@mi-technologies.sa","phoneNumber":"+966545678762","fullName":"saima",
"role":"Admin","kind":"buyer","tenantStatus":"Active","requiresOnboarding":false,"status":"Verified"}}
```

```
Set-Cookie: access_token=…; max-age=28800; path=/; secure; samesite=strict; httponly
Set-Cookie: refresh_token=…; max-age=2592000; path=/api/auth/refresh; secure; samesite=strict; httponly
```

- Empty `token`/`refreshToken` in the body is the expected web behaviour. Cookie-first is intact.
- `max-age=28800` = **480 minutes — the documented `Jwt:ExpiryMinutes` is correct on this env.**
- **Decoded JWT claims:** `role=Admin`, `status=verified`, `kind=buyer`, `iss=miproc`,
  `aud=miproc-clients`. So the account meets `VerifiedBuyer`.
- ⚠️ Casing differs between layers: the JWT claim is `status=verified` (lowercase), the login body
  says `"status":"Verified"`. You described the account as `status: Validated` — the API reports
  **Verified**, not Validated. Do not string-compare this value in the frontend.

---

## 2. The real response — `GET /api/dashboard/buyer` → `200`

Final clean capture, 02:10 UTC, unedited:

```json
{
  "user": {
    "id": "a9685342-732c-46c0-85b7-079b40baede0",
    "email": "saima.khanum@mi-technologies.sa",
    "phoneNumber": "+966545678762",
    "fullName": "saima",
    "role": "Admin",
    "accountType": null,
    "companyName": null,
    "companyAddress": null,
    "accountStatus": "Active",
    "documents": []
  },
  "rfqs": [
    { "id": "8d0400da-6e75-45a0-a37e-2e37ea79aae8", "categories": "Electrical Equipment", "amount": -5,     "status": "draft" },
    { "id": "446d53c4-2afb-4b6c-8daa-43f071cb6cf7", "categories": "Electrical Equipment", "amount": 500000, "status": "draft" },
    { "id": "8c0a2568-eacd-4244-bbe0-673c53f82c68", "categories": "Electrical Equipment", "amount": 500000, "status": "draft" },
    { "id": "f276d662-126f-4d36-8349-00dc1f952cda", "categories": "",                     "amount": null,   "status": "draft" },
    { "id": "54f932b7-5959-4d81-801f-1a8d89c3ed8d", "categories": "",                     "amount": null,   "status": "draft" }
  ],
  "order": null,
  "counts": { "totalRfqs": 18, "draftRfqs": 11, "bidsToReview": 0, "currentNegotiating": 0, "avgRfqToAward": 0 }
}
```

**The shape is confirmed:** `user`, `rfqs`, `order`, `counts`. It is **not** the Curl-sample shape.
Field names match the documented DTO exactly. That question is settled — build against this.

### But the Curl sample is *also* live — at a different path

`GET /api/dashboard` → `200`:

```json
{"openRequests":0,"activeRfqs":5,"suppliers":4,"committedSpend":0,
 "sourcingByStatus":{"rfqsSent":5,"bidsReceived":0,"awarded":0,"ordersCreated":0},
 "recentRequests":[]}
```

Two corrections to the documentation's account of it: the key is **`sourcingByStatus`**, not
`sourcing`, and **there is no `verification` object** — that part of the Curl sample does not exist
anywhere. But this endpoint is **not obsolete**: it carries `activeRfqs`, `suppliers` and
`committedSpend`, three numbers our buyer dashboard needs and `/dashboard/buyer` does not provide.

---

## 3. Auth and error behaviour — tested, not assumed

| Test | Result |
|---|---|
| No credentials | **401**, `Content-Type: text/html`, **body 0 bytes** |
| Garbage bearer token | **401**, `text/html`, empty |
| Invalid cookie value | **401**, `text/html`, 0 bytes |
| `Authorization: Bearer <token>` instead of cookie | **200** — identical body. Both transports work. |
| **`kind=buyer` calling `/api/dashboard/supplier`** | **403 Forbidden**, `text/html`, **empty body** |

**This contradicts the documentation.** The PDF says 401 returns
`ProblemDetails {status, title}` as `application/problem+json`. In reality **every framework auth
failure returns an empty `text/html` body with no JSON at all.**

`ProblemDetails` *is* used, but only for application-level errors:

```
{"title":"An unexpected error occurred.","status":500}
{"title":"RfqDraft '8c0a2568-…' was not found.","status":404}
```

**Frontend consequence:** our error parser must not assume a JSON body on 401/403 — it will throw on
`response.data.title` of an empty string. And 403 must be handled distinctly from 401: a
wrong-`kind` user gets 403, and if we treat that as 401 we will log a valid user out.

Open item #3 from the PDF is now answered: **403, empty body.**

---

## 4. Issues found

### 🔴 CRITICAL

**L-1 — The onboarding profile never loads. Every company field is null.**
`accountType`, `companyName`, `companyAddress` are `null` and `documents` is `[]` on **10 out of 10
calls**, deterministically, warm and cold, on both hosts. This is not the documented 5-second
timeout — a timeout would be intermittent; this never succeeds.

It is also not "the account isn't onboarded": `/api/auth/me` returns
`"requiresOnboarding": false, "status": "Verified", "tenantStatus": "Active"`.

**Impact:** WelcomeHero has no company name and no account type; the Compliance & documents card is
empty. This was the *one* thing I rated safe to build first — it is not buildable.

**L-2 — `rfqs[]` contains only drafts. Published RFQs never appear.**
Proven by watching a record change state mid-test:

- At 01:50, draft `77f5810a` ("QA E2E RFQ - safe to delete") was in `rfqs[]` with `status:"draft"`;
  `counts` = `totalRfqs 17, draftRfqs 11`.
- By 02:06 that record's own endpoint reported `"status": "Live"`.
- It had **vanished from `rfqs[]` entirely**. `draftRfqs` fell 11 → 10 while `totalRfqs` stayed 17 —
  i.e. it moved from the draft bucket into the published bucket, and the published bucket is not
  rendered.

Across every capture, all five rows were `status: "draft"`. `counts` says 18 total / 11 drafts, so
**7 non-draft RFQs exist and not one is shown.** A buyer would open the dashboard and see only their
own unfinished drafts.

**L-3 — The RFQ read path is down: `GET /api/rfq` and `GET /api/rfq/{id}` return 500 for everything.**

```
GET /api/rfq                                   → 500
GET /api/rfq?pageNumber=1&pageSize=10          → 500
GET /api/rfq?page=1 / ?PageNumber= / ?status=  → 500
GET /api/rfq/{any id from the dashboard}       → 500
GET /api/rfq/00000000-0000-0000-0000-000000000000 → 500   ← should be 404
```

The zero-GUID also 500s, so this is a broken code path, not missing data. This very likely **causes
L-2**: the dashboard's published-RFQ query throws, the `try/catch` swallows it, and only the drafts
survive — exactly the silent-degradation risk, now observed in production behaviour rather than
theorised.

**Impact:** "My RFQs → View all" is dead, and every row click is dead.

**L-4 — `rfqs[]` mixes two entity types with no discriminator, and they need different endpoints.**

| id from `rfqs[]` | `/api/rfq-draft/{id}` | `/api/rfq/{id}` |
|---|---|---|
| `8c0a2568…` | **404** "RfqDraft … was not found" | 500 |
| `77f5810a…` | **200** | 500 |
| `f276d662…` | **200** | 500 |
| `54f932b7…` | **200** | 500 |
| `630097e6…` | **200** | 500 |

Four are `RfqDraft` rows; one is an `Rfq` row with `Status=Draft`. All five arrive labelled
`"status":"draft"` with nothing to tell them apart. The frontend cannot route a row without probing
two endpoints and catching a 404.

### 🟠 MAJOR

**L-5 — No `title`, no `reference` — confirmed live, and the data exists upstream.**
`rfqs[]` has exactly four fields. But `GET /api/rfq-draft/{id}` returns:

```json
{"id":"77f5810a-…","title":"QA E2E RFQ - safe to delete","description":"End-to-end contract test",
 "currentStep":4,"status":"Live","createdAt":"2026-08-19T01:32:21.186247Z","updatedAt":"…",
 "step1Data":{"title":"…","categories":[{"id":"c1000001-0000-0000-0000-000000000004","name":"Electrical Eq…"}]},
 "step2Data":{"customDeliveryAddress":"Riyadh Industrial City, KSA","requiredDeliveryDate":"2026-12-01T00:00:00Z","rfqClosingDate":"2026-11-15T17:00:00…"},
 "step4Data":{"visibilityType":2,"targetedRegionIds":["a1000001-…"],"isAnonymous":true}}
```

So `title`, `createdAt`, `rfqClosingDate` and — importantly — **category objects with real `id`s**
all exist. This makes the ask a *projection* change, not new data modelling. It also means
`categoryIds[]` is available and the comma-joined English `categories` string is a lossy choice, not
a necessary one.

**L-6 — A negative budget is persisted and served.** `"amount": -5`. Our card would render
`SAR -5`. No server-side guard.

**L-7 — Inconsistent numeric serialization.** The same value appeared as `500000.0000`,
`500000.00` and `500000` across captures. Parse defensively; never string-compare.

**L-8 — The two live dashboard endpoints disagree about the same buyer.**
`/api/dashboard/buyer` → `totalRfqs 18, draftRfqs 11` (⇒ 7 non-draft).
`/api/dashboard` → `activeRfqs 5, rfqsSent 5`.
Two endpoints, two different answers for "this buyer's RFQs", neither reconcilable with the other.

**L-9 — `GET /api/dashboard`'s `recentRequests` is `[]`** despite 18 RFQs — that endpoint's list is
broken too, so it is not a fallback for L-2.

### 🟡 MINOR / ENVIRONMENT

- **L-10 — Cold start ~13s.** First two calls took **12.7s and 14.5s**; once warm, 8 consecutive
  calls ran 0.50–0.87s. Cloud Run scale-to-zero. Our client's timeout must exceed ~20s or the first
  dashboard load after an idle period will fail.
- **L-11 — No cache or rate-limit headers.** Response carries only `Content-Type`,
  `Transfer-Encoding`, `Connection`, `cf-cache-status: DYNAMIC`. 12 rapid-fire calls → all `200`, no
  throttling.
- **L-12 — `GET /api/master-data/{categories,regions,units}` now 404** (they previously returned
  `200 []`). Relevant to the paused RFQ integration, not to the dashboard.
- **L-13 — No `GET` to read the onboarding profile back.** `/api/onboarding/review` returns **405**
  (route exists, PUT only); `/onboarding/status`, `/onboarding/profile`, `/onboarding/me`,
  `/organization`, `/tenant/me` all 404. So the frontend cannot work around L-1.

### NOT TESTABLE with this account

| Item | Why |
|---|---|
| `counts.bidsToReview`, `currentNegotiating`, `avgRfqToAward` semantics | All three returned `0` — this buyer has no bids and no awards. Needs a buyer with live bids. |
| `order` object and the whole Track-order card | `order` was `null` on every call; `GET /api/orders` returns `{"all":0,…,"items":[]}`. Needs a buyer with a purchase order. |
| RFQ status vocabulary (`published`/`pending`/`awarded`/`deleted`) | Only `"draft"` was ever emitted, because of L-2. Mapping unverified. |
| `user.documents[].kind` / `.status` value sets | `documents` was always `[]` (L-1). |
| Supplier dashboard | This account is `kind=buyer` → 403. Needs a `kind=supplier` or `kind=both` account. |

**Useful side-finding:** `GET /api/orders` returns
`{all, awaitingSupplier, inTransit, delivered, closed, cancelled, declined, items[]}` — those buckets
line up with our Orders module statuses far better than the dashboard's `order` object does. The
Track-order card should probably read from there instead.

---

## 5. What is actually buildable today

| Buildable now | Source |
|---|---|
| User identity — name, email, phone, role | `user.id/email/fullName/phoneNumber/role` — all populated and correct |
| Seat status | `user.accountStatus: "Active"` |
| Two RFQ counters | `counts.totalRfqs`, `counts.draftRfqs` (semantics plausible, unvalidated against a second source — see L-8) |

**That is the complete list.** Everything else on the buyer dashboard is blocked by L-1 through L-4:
no company name, no documents, no titles, no references, no published RFQs, no clickable rows, no
order, and three of five counts frozen at zero with no data to validate them.

I would not start the mapper yet. L-1 and L-2 are server-side defects, not contract gaps — they will
change the payload when fixed, and anything built against today's behaviour would be rewritten.

---

## 5b. Can `/api/auth/me` supply the missing profile? — tested, answer is **no**

Verified 2026-08-19 02:2x UTC. `GET /api/auth/me` → `200`, `237 bytes`, **9 fields, unedited**:

```json
{"id":"a9685342-732c-46c0-85b7-079b40baede0","email":"saima.khanum@mi-technologies.sa",
 "phoneNumber":"+966545678762","fullName":"saima","role":"Admin","kind":"buyer",
 "tenantStatus":"Active","requiresOnboarding":false,"status":"Verified"}
```

Field-by-field against `/api/dashboard/buyer` → `user`:

| field | `/api/auth/me` | `dashboard.user` |
|---|---|---|
| `id` | `"a9685342-…"` | `"a9685342-…"` |
| `email` | `"saima.khanum@…"` | same |
| `phoneNumber` | `"+966545678762"` | same |
| `fullName` | `"saima"` | same |
| `role` | `"Admin"` | `"Admin"` |
| `kind` | `"buyer"` | **absent** |
| `requiresOnboarding` | `false` | **absent** |
| `status` | `"Verified"` | **absent** |
| `tenantStatus` | `"Active"` | absent (equivalent to `accountStatus: "Active"`) |
| `accountStatus` | **absent** | `"Active"` |
| **`accountType`** | **absent** | `null` |
| **`companyName`** | **absent** | `null` |
| **`companyAddress`** | **absent** | `null` |
| **`documents`** | **absent** | `[]` |

**`/api/auth/me` does not carry company data at all.** The four fields we need are not null there —
they do not exist there. It is an identity endpoint, not a profile endpoint, so it cannot substitute
for the broken profile join in L-1.

**What it does buy us (genuinely useful, just not the profile):**
- `kind` (`"buyer"`) is a **partial substitute for `accountType`** — enough to render the WelcomeHero
  "org type" line and to pick the portal. Note the casing differs from `accountType`'s documented
  `Buyer | Supplier | Both`, so normalise before comparing.
- `status` and `requiresOnboarding` give us a real signal for gating, which the dashboard payload
  has no equivalent for.
- `tenantStatus` duplicates `accountStatus`, so either source works for the seat status.

**Still blocked after using `/auth/me`:** company **name**, company **address**, and the whole
**documents** array — i.e. the WelcomeHero org name and the entire Compliance & documents card.

**There is no other GET on this deployment that returns them.** Swept 22 candidate paths; everything
returned 404 except:

| path | result |
|---|---|
| `/api/onboarding` | `405`, `allow: POST` — write-only |
| `/api/onboarding/review` | `405`, `allow: PUT` — write-only |
| `/api/onboarding/cities` | `200` — reference list only (`{id, name_en, name_ar, displayOrder}`) |

404: `/api/onboarding/{documents,status,profile,me,summary,data}`, `/api/profile`, `/api/profile/me`,
`/api/users/me`, `/api/user/me`, `/api/account`, `/api/account/profile`, `/api/organizations/me`,
`/api/organization/me`, `/api/organisations/me`, `/api/companies/me`, `/api/company`,
`/api/tenants/me`, `/api/tenant-users/me`, `/api/buyers/me`, `/api/verification`, `/api/kyb`,
`/api/documents`.

The onboarding profile is **writable but not readable** on this environment. Two ways out, both
backend-side: fix the profile lookup in `DashboardService` (preferred — one call, one field set), or
add a `GET /api/onboarding/review` next to the existing `PUT`.

---

## 5c. Supplier dashboard — live test (account supplied 2026-08-19)

Account `t61jc.1787059681357@inbox.testmail.app`. Login `200`; JWT claims `kind=supplier`,
`status=verified`, `role=Admin`; `/auth/me` reports `requiresOnboarding: false`, `tenantStatus: Active`.

**`GET /api/dashboard/supplier` → `200`** (0.78s warm), unedited body:

```json
{
  "user": {
    "id": "15905e2d-2154-4e72-b8a6-212a990e46bc",
    "email": "t61jc.1787059681357@inbox.testmail.app",
    "phoneNumber": "+966547205103",
    "fullName": "QA Automation Test",
    "role": "Admin",
    "accountType": null, "companyName": null, "companyAddress": null,
    "accountStatus": "Active", "documents": []
  },
  "bids": [],
  "order": null,
  "counts": { "totalRfqs": 0, "activeBids": 0 }
}
```

**Contract confirmed.** `{user, bids, order, counts{totalRfqs, activeBids}}` — exactly the documented
shape, and exactly what the frontend was already coded against. The curl sample's `availableRfqs` /
`winRate` / `paymentsReceivedMtd` do not exist, as the doc predicted.

### What the supplier test adds

| Finding | Detail |
|---|---|
| **The profile defect is SYSTEMIC, not buyer-specific** | Same `accountType`/`companyName`/`companyAddress` = null and `documents` = [] on a different account, different `kind`, different tenant. One backend fix covers both dashboards. |
| ~~**403 is symmetric and consistent**~~ **— NO LONGER TRUE, see §5g** | On 19 Aug both directions refused: supplier token → `/dashboard/buyer` = 403 and buyer token → `/dashboard/supplier` = 403. On a **21 Aug re-test the buyer → supplier direction returns 200**. |
| **Counts are still unverifiable** | `bids: []`, `totalRfqs: 0`, `activeBids: 0`. Per the doc, supplier ids resolve by *email match on onboarding Suppliers* — so `0` may mean "no bids" **or** "no supplier record matched this email", and the payload cannot distinguish the two. |
| ⚠️ **`GET /api/dashboard` looks tenant-unscoped** | Called with the SUPPLIER token it returns `activeRfqs: 6, rfqsSent: 6, suppliers: 4` — buyer-shaped sourcing figures, for an account with zero RFQs and zero bids. The buyer account saw 4 → 5 → 6 on the same counter over the session. This appears to be **global data served to any authenticated caller**. Needs a backend answer before anyone builds on it. |
| **`GET /api/rfq` → 403 for a supplier** (it 500s for the buyer) | So a supplier has **no endpoint at all** for browsing available RFQs. The "Available RFQs" tile and page have no data source. |
| `GET /api/orders` → `200` | `{all:0,…,items:[]}` — works, empty, consistent with `order: null`. |

Three consecutive calls returned identical bodies; no caching or rate-limit headers.

**Note:** the decision to scope each dashboard to its own endpoint turned out to be protective — the
legacy aggregate we would otherwise have read for `activeRfqs` is the very endpoint that appears to
leak other tenants' figures.

---

## 5d. Re-test checklist — run this when Backend ships a dashboard change

Pending as of 2026-08-19: Backend is implementing **Available RFQs**. When it lands, re-run the
buyer suite below with `saima.khanum@mi-technologies.sa` (Admin, `kind=buyer`) and diff against the
captures in §2 and §5c, which are the BEFORE baseline.

**Baseline to diff against (buyer, 02:10 UTC 2026-08-19):** `user.companyName` null ·
`user.documents` [] · `rfqs[]` 5 rows, **all `status:"draft"`**, no title/reference, one
`amount: -5` · `order` null · `counts` `{totalRfqs 18, draftRfqs 11, bidsToReview 0,
currentNegotiating 0, avgRfqToAward 0}`.

| # | Check | Pass condition |
|---|---|---|
| 1 | `POST /api/auth/login` | `200`; cookies set; JWT decodes to `status=verified`, `kind=buyer` |
| 2 | `GET /api/dashboard/buyer` | `200`; capture the body verbatim before reading it |
| 3 | **Profile block** | `accountType` / `companyName` / `companyAddress` non-null, `documents` populated → the L-1 defect is fixed |
| 4 | **Published RFQs** | at least one row with a status other than `draft` → L-2 fixed |
| 5 | **New fields** | `title`, `reference`, `isDraft`, `categoryIds[]` present on `rfqs[]` |
| 6 | **Row routing** | every `rfqs[].id` resolves on `/api/rfq/{id}` **or** `/api/rfq-draft/{id}` without a 500 |
| 7 | **Counts** | `bidsToReview` / `currentNegotiating` / `avgRfqToAward` non-zero if the account now has bids — record what each actually measures |
| 8 | **Budget hygiene** | no negative `amount`; consistent decimal scale |
| 9 | **Auth contract** | no-cookie → `401`; supplier token → `403`; both still empty `text/html` (or now ProblemDetails — either way, record it) |
| 10 | **Latency** | note cold vs warm; anything over ~20s breaks the client timeout |

**Then verify the frontend handles it**, which is the point of the exercise:
- Update the pinned capture in `dashboardMappers.test.ts` (`BUYER_LIVE`) to the NEW body and run
  `npx vitest run` — failures there are the contract telling us it moved.
- Remove whichever `TEMPORARY` compensations the new fields make redundant (row title placeholder,
  categories-as-reference), rather than leaving them to mask real data.
- Re-check `tsc -b` in both repos and `npm run build` in myapp.

⚠️ **Scope note:** "Available RFQs" is a **supplier** tile (`availableRfqs` in
`useSupplierDashboard`), and the supplier's RFQ browsing is what currently 403s on `GET /api/rfq`.
A buyer-only re-test will not exercise it — see the question raised with the user.

---

## 5e. Buyer RE-TEST — 2026-08-19, after the backend fix

Same account (`saima.khanum@mi-technologies.sa`). `GET /api/dashboard/buyer` → `200`, 1.13s, 2029 b
(was 898 b). Diffed against the §2 baseline.

### ✅ Fixed

| Was | Now |
|---|---|
| **L-1** `accountType`/`companyName`/`companyAddress` null, `documents` `[]` | `"Buyer"` · `"test"` · `"test, test, Bldg 2345, test, test, Al Qassim, test, 76567, saudi arabia"` · **4 documents**, all `status: "VERIFIED"` |
| **L-2** `rfqs[]` drafts only | A **`status: "published"`** row now appears (`591b5230…`) |
| **L-3** `GET /api/rfq` → 500 on every input | **`200`**, returns `items[]` with `number` (`"RFQ-2026-0017"`), `title`, `firstCategory`, `status`, `bidsReceived`, `closingStatus` |
| **L-4** row ids 500'd on both detail endpoints | Every id now resolves cleanly on exactly one: `3142b08e`/`591b5230` → `/api/rfq/{id}` `200`, `/api/rfq-draft/{id}` `404`; `8d0400da` → the reverse |

`counts` moved 18/11 → **21/12**, consistent with new RFQs created during the day.

### ❌ Still open

- **`rfqs[]` still has no `title` and no `reference`** — even though `/api/rfq` now returns both.
  This is now purely a *projection* gap on the dashboard payload.
- **No `isDraft` discriminator.** Ids resolve, but only by probing two endpoints and catching a 404.
- **`amount: -5` is still served** (`8d0400da…`). No server-side validation.
- `bidsToReview` / `currentNegotiating` / `avgRfqToAward` still `0`; `order` still `null`.
- **`documents[].id` is `null` on all four rows** — they are inferred from profile URL fields, not
  real document rows. `url` is a **`gs://` URI**, not an HTTPS link, so it cannot be opened from the
  browser as-is.

### Frontend changes made in response

1. **`accountType` is now localised.** It arrives as the raw enum `"Buyer"`; rendering it directly
   would have printed an English enum to an Arabic reader. Mapped through `onboarding.company.*`.
2. **Documents are now localised.** `kind` → `org.profile.docs.type.*` (with `NationalIdCertificate`
   borrowing the existing `auth.nationalId`), `status: "VERIFIED"` → `org.profile.docs.status.valid`.
   Previously these would have rendered as `CommercialRegistration` / `VERIFIED`.
3. **Dangling-separator fix.** With a published row now present and no bid count available, `meta`
   is empty, so the row subtitle rendered `"Electrical Equipment · "`. `BuyerDashboardPage` now joins
   the non-empty parts. Applied byte-identically in **both** repos.
4. **Pinned capture updated** to the new body; the tests failed exactly where the contract moved.

**The TEMPORARY compensations were KEPT**, because the fields that would retire them did not arrive:
the row-title placeholder (`rfq.list.untitled`) and categories-as-reference both still stand. They
come out the day `rfqs[]` gains `title` and `reference`.

---

## 5f. End-to-end attempt: real RFQ + real supplier bid (2026-08-19)

Goal: publish a real RFQ as the buyer, bid on it as the supplier, and validate `bids[]` against real
data. **Half succeeded.** The RFQ is live; the bid is impossible — no supplier bid API is deployed.

### ✅ Buyer side — a real RFQ is published

**`RFQ-0026`, id `663053b7-cf5b-4059-a7f1-22419ac0cd71`, status `Live`, `matchedSupplierCount: 3`**,
2 line items (Industrial Cable 120mm ×500, Distribution Panel 400A ×10), closing 2026-11-30.

Getting there exposed four backend defects:

| Finding | Evidence |
|---|---|
| **`POST /api/rfq` returns 500 but PERSISTS the record** | The call 500'd; `RFQ-2026-0018` "E2E BID VALIDATION - safe to delete" was created anyway and appears in `/api/rfq`. A client retrying on 500 would create duplicates. |
| **`POST /api/rfq/{id}/publish` 500s for every RFQ** | Tried on two different drafts incl. one with `availableActions.canPublish: true` and `primaryActionLabel: "Publish"`. Never publishes — status stays `Draft`. |
| **The working publish route is the DRAFT one** | `POST /api/rfq-draft/{id}/publish` returns real validation (`400 "Step 1 (Requirements) is incomplete."`) and, once steps 1/2/4 are saved, a clean `200` with the Live RFQ. **`Rfq` and `RfqDraft` are two different entities with two different publish paths, and only the draft one works.** |
| **`GET /api/rfq-draft` (collection) → 502 Bad Gateway** | Gateway-level failure, not a handled error. |

Also: no reachable route creates an `RfqDraft` — `POST /api/rfq-draft` 404s, `/api/rfq-draft/step1`
405s on every method, and a client-generated GUID 404s (no upsert). The wizard steps save via
**`POST /api/rfq-draft/{id}/step1|step2|step4`**, but the draft must already exist.

### ❌ Supplier side — BLOCKED, no bid API exists

`GET /api/rfq/{id}` is **403** for a supplier, and **every** candidate bid/quotation route 404s:

```
/api/quotation  /api/quotations  /api/quotation/submit  /api/quotation/available-rfqs
/api/quotation/my-quotations  /api/bid  /api/bids  /api/offer  /api/offers
/api/rfq/{id}/quotation  /api/supplier  /api/suppliers  /api/supplier/quotations
/api/supplier/bids  /api/rfq-supplier  /api/rfq-suppliers  /api/sourcing
/api/tender  /api/tenders  /api/proposal  /api/proposals
/api/rfq/available  /api/rfq/matched  /api/rfq/open  /api/marketplace
```

**A supplier cannot see an RFQ or submit a bid through the deployed API.** This is the same gap as
"Available RFQs", which Backend is building — it is broader than one tile: the entire supplier
bidding surface is absent.

### ⚠️ And a new question for Backend

After `RFQ-0026` went Live with **`matchedSupplierCount: 3`**, the supplier dashboard still returned
`counts.totalRfqs: 0` and `bids: []`. `totalRfqs` is documented as *distinct `RfqId` on
`RfqSuppliers` for the resolved supplier ids*, and supplier ids resolve by **email match on
onboarding Suppliers**. So either this account is not among the 3 matched, or the email match
resolves nothing — and the payload cannot tell the two apart. **This is exactly the ambiguity flagged
earlier, now reproduced with a real live RFQ in the system.**

### Test artefacts left on dev (both named "safe to delete")
- `RFQ-2026-0018` — Draft, created by the 500'ing `POST /api/rfq`.
- `RFQ-0026` (`663053b7…`) — **Live**, the published E2E RFQ. Leaving it live so a bid can be placed
  against it the moment the supplier API exists.

---

## 6. For the backend team (evidence-backed, forward as-is)

1. **`/api/dashboard/buyer` returns `accountType`, `companyName`, `companyAddress` = null and
   `documents` = [] for `saima.khanum@mi-technologies.sa`, on 10/10 calls**, while `/api/auth/me`
   reports `requiresOnboarding: false`, `status: Verified`, `tenantStatus: Active`. Is the onboarding
   profile missing for this user, or is the profile join in `DashboardService` failing? This blocks
   the header and the compliance card on both dashboards.
   **`/api/auth/me` is not a workaround** — it returns 9 identity fields and carries no
   `companyName` / `companyAddress` / `accountType` / `documents` at all (see §5b). We swept 22
   candidate routes; the onboarding profile is **writable but not readable** on this deployment
   (`/api/onboarding/review` is `405 allow: PUT`). Either fix the dashboard's profile lookup, or add
   a `GET /api/onboarding/review`.
2. **`rfqs[]` only ever contains drafts.** `counts` reports 18 total / 11 drafts, so 7 published RFQs
   exist, and none appear. A draft that went Live during testing (`77f5810a`) disappeared from the
   array entirely rather than reappearing as published. Is the published-RFQ query failing and being
   swallowed by the try/catch?
3. **`GET /api/rfq` and `GET /api/rfq/{id}` return 500 for every input, including the all-zero
   GUID** (which should 404). This looks like the root cause of (2), and it also breaks "View all"
   and every row link.
4. **`rfqs[]` mixes `Rfq` rows and `RfqDraft` rows with no discriminator.** `8c0a2568…` 404s on
   `/api/rfq-draft/{id}`; the other four succeed. All five are labelled `"status":"draft"`. Please
   add an `isDraft` flag (or split the arrays) so we can route a click.
5. **Please add `title` and `reference` to `rfqs[]`** — `GET /api/rfq-draft/{id}` already returns
   `title`, `createdAt` and `step1Data.categories[].id`, so the data is there. Also `bidCount` and
   `closingDate` if possible.
6. **Please return `categoryIds` rather than (or alongside) the comma-joined `categories` string.**
   We localise category names for Arabic and cannot translate `"Electrical Equipment"` glued into a
   display string. The ids are already on the draft record.
7. **401 and 403 return an empty `text/html` body**, not `ProblemDetails`. Application errors do use
   `ProblemDetails` (`{"title":"…","status":500}`). Is the empty auth body intended? Confirm 403 is
   the permanent response for a `kind` mismatch so we can distinguish it from a session expiry.
8. **`amount: -5` is persisted and served** on RFQ `8d0400da…`. Is there validation on
   `EstimatedBudget`? Also, the same value serializes as `500000.0000`, `500000.00` and `500000` —
   can the scale be made consistent?
9. **`/api/dashboard` and `/api/dashboard/buyer` disagree**: `activeRfqs 5` / `rfqsSent 5` vs
   `totalRfqs 18` / `draftRfqs 11`. Which is authoritative? And `/api/dashboard`'s `recentRequests`
   is `[]` despite 18 RFQs.
10. **`/api/dashboard` is live and has `activeRfqs`, `suppliers`, `committedSpend`** — three numbers
    our buyer dashboard needs and `/dashboard/buyer` lacks. Should those move onto
    `/dashboard/buyer`, or should the frontend call both? There is no `verification` object on
    either, which our pending/rejected dashboard states require.
11. **Cold start is ~13 seconds** (12.7s and 14.5s on the first two calls; 0.5s warm). Is a minimum
    instance count possible on dev? A 13-second first dashboard load is not shippable.
12. **`/api/master-data/categories|regions|units` now return 404** (previously `200 []`). Were these
    moved? This is the RFQ integration's ENV-2 blocker.
13. Please provide a **`kind=supplier` (or `kind=both`) verified account** so the supplier dashboard
    can be tested — this account gets a clean 403.
14. To validate `bidsToReview`, `currentNegotiating`, `avgRfqToAward` and the `order` object, we need
    **a buyer account with live bids and at least one purchase order**. All four are currently
    `0`/`null`, so their semantics remain unverified.

---

## 5g. Item #7 re-tested end-to-end (2026-08-21)

Run against deployed dev with both accounts. Status, `Content-Type` and exact body length captured
per call — nothing inferred from the implementation.

| Case | Status | Content-Type | Bytes | Body |
|---|---|---|---|---|
| No credentials | `401` | `text/html` | **0** | *(empty)* |
| Garbage bearer | `401` | `text/html` | **0** | *(empty)* |
| Garbage cookie | `401` | `text/html` | **0** | *(empty)* |
| **supplier token → `/dashboard/buyer`** | `403` | `text/html` | **0** | *(empty)* |
| **buyer token → `/dashboard/supplier`** | **`200`** | `application/json` | 1518 | full payload |
| Known route, unknown id (`/rfq-draft/{zero-guid}`) | `404` | **`application/problem+json`** | 97 | `{"title":"RfqDraft '…' was not found.","status":404}` |
| Unknown route (`/api/does-not-exist`) | `404` | `text/html` | **0** | *(empty)* |
| Control: buyer token → `/dashboard/buyer` | `200` | `application/json` | 2074 | full payload |

### Confirmed
The core of item #7 holds: **framework auth failures carry no body at all** — `text/html`, zero
bytes, on 401 and 403 alike. `ProblemDetails` is used *only* for application-level errors, and then
correctly, with `application/problem+json`. A parser that reads `data.title` on a 401/403 gets
`undefined`. An unknown ROUTE also returns a bodiless 404, so ProblemDetails cannot be assumed from
the status code alone — only from the content type.

### ⚠️ Changed since 19 Aug — a previous finding is now WRONG
`buyer token → /dashboard/supplier` returned **403 on 19 Aug** and returns **200 today**. The
earlier note that "403 is symmetric in both directions" is retracted (§5c corrected).

The account is `kind=buyer`, `role=Admin`, `accountType=Buyer` — no supplier capability by any
measure — and it receives a full supplier payload: `availableRfqs: 14`, `negotiationsSent: 1`.

- **Not a tenant leak.** The payload is the caller's OWN org: same `user.id`, same `companyName`
  (`"test"`) as its buyer dashboard. Nobody else's data is exposed.
- **But the `kind` gate on `/dashboard/supplier` is no longer enforced**, while `/dashboard/buyer`
  still enforces it. That asymmetry is almost certainly unintended.
- It also **invalidates the earlier explanation** of why `Mikelnjoba@gmail.com` (`role=SuperAdmin`)
  reached the supplier dashboard. That was attributed to a SuperAdmin bypass; it is not — a plain
  `role=Admin` buyer now gets the same 200. The endpoint simply stopped checking.

### Frontend behaviour on these responses — verified by reading the path, not assumed
`toDashboardError` never touches the response body, so a zero-byte 401/403 cannot throw. 401 and
403 both classify to `forbidden` (rendered without a retry button, since neither becomes a 200 by
asking again); everything else is `server`; a request with no response at all is `offline`.
`retryDashboard` refuses to retry any status < 500, so a refusal costs one call, not three.

### For Backend
1. Should `/api/dashboard/supplier` accept `kind=buyer`? It did not on 19 Aug and does now.
2. If not, restore the gate — and note `/dashboard/buyer` still refuses `kind=supplier`, so the two
   endpoints currently disagree about whether `kind` matters.
3. Independently: give 401/403 a ProblemDetails body, so a client can tell "session expired" from
   "wrong portal" without inferring it from the status alone.

# RFQ API Integration — Analysis, Fixes Applied & Phased Plan

**Date:** 2026-08-18 (rev. 2 — incorporates Marina's clarifications on master data, roles, and the Amend requirement)
**Source document:** `RFQ_API_Integration_Guide.pdf` v1.1 (11 Aug 2026, .NET Backend Team)
**Repos:** `d:\MI-Proc` (mock reference) · `d:\MI-Proc\myapp-frontend-new` (myapp — real-API target)

> **Rev. 2 changes:** roles corrected to the real three-role model (§2.11, §4); Phase-1 frontend fixes
> **implemented and verified** (§5); the Amend risk analysed in full with a worked example (§6); the
> plan re-cut along the four categories requested (§7).
>
> **Rev. 4 (live testing with an RFQ-capable account):** **the budget question is RESOLVED — the API
> accepts `0` and even `-5`, and never lists `EstimatedBudget` as required. Guide §8.3 is wrong, the
> Figma "(optional)" label is right, and the guard I added in rev. 2 has been REMOVED** (§5.9). The
> 403 was confirmed to be **`kind`**, which is carried in the JWT (§5.10). A **new P0 blocker**
> replaces it: every RFQ endpoint that reaches the handler returns **500** for an authorised account,
> while validation still returns correct 400s — a backend fault (§5.11). The full validation contract
> was extracted from those 400s and **matches our client rules on all eight points tested** (§5.14),
> now pinned by tests.
>
> **Rev. 3 (same day, after a second live probe):** **master data is now SEEDED and verified** —
> ENV-2 and ENV-3 are resolved (§3.3, §7B). The budget requirement was **attempted empirically and
> could not be resolved**: `POST /api/rfq` returns 403 before validation and no OpenAPI document is
> exposed (§5.9). A better-evidenced explanation of the 403 replaces the "missing org claim" theory —
> the account's **`kind` is null** (§5.10). Two new defects were found in the live seed: a
> **duplicate category name** (fixed defensively, §5.12) and a **unit-vocabulary mismatch** (§5.11).
> The three-layer `role`/`kind`/`status` model is now typed and encoded — **`UserDto` had no `status`
> field at all** (§5.13).

---

## 0. Scope note — the backend is not in this repository

`find . \( -name "*.cs" -o -name "*.csproj" -o -name "*.sln" \)` → **0 files.** This is a
frontend-only workspace. The backend of Appendix §11.1 (`RfqStatusRules.cs`, `RfqCreateService.cs`,
…) lives elsewhere, so no backend audit or C# DTO proposal is offered here — proposing either from a
codebase I have not read would be invention. Everything below is frontend, and per CLAUDE.md
Constraint #2 all real-API work is **myapp-only**; paths are relative to `myapp-frontend-new/`.

---

## 1. Executive summary

The RFQ real-API integration is ~85–90% written and, until this session, **0% defensible under
failure** — the create/publish path swallowed every error, so flipping the flag produced a Submit
button that silently did nothing. That is now fixed, along with four related defects, all verified
(`tsc -b` clean, lint clean, 26 new unit tests passing). Master data is no longer treated as a
blocker: per your clarification the backend will seed it, and the frontend now codes against the
documented master-data APIs with a guard that explains itself if the catalogue is empty rather than
posting an invalid body. The role model has been corrected to the real three roles — `Admin`, `User`,
`SuperAdmin` — which mattered more than it looks: the previous `UserRole` union did not even contain
`User`, the value a live `/auth/me` actually returns, so TypeScript believed a real API value was
impossible, and the code comments still described a `Requester`-based model that no longer exists.
The one genuinely dangerous area is **Amend**, and the analysis in §6 concludes something stronger
than the earlier draft did: given your stated requirement — *edit specific fields, preserve
everything else* — the current full-body design **cannot satisfy it under any of the three plausible
backend behaviours**, because our body sends 16 fields the detail endpoint never returned, as
*present-but-empty* keys rather than absent ones. Merge semantics would not save us; only sending a
genuine partial diff does. Amend therefore stays disabled, and §6.9 lists the exact two backend
facts to verify before it can be enabled. Everything else is sequenced in §7 under the four headings
you asked for: fixed now, expected from backend seeding, awaiting contract verification, and blocked.

---

## 2. Document digest

### 2.1 Endpoints

| # | Method | Path | Purpose | §/page |
|---|---|---|---|---|
| 1 | POST | `/api/auth/token` | Login → tokens (mobile/Postman) | §3.1 p4 |
| 2 | POST | `/api/auth/login` | Login → **httpOnly cookies (web)** | §3.1 p4 |
| 3 | POST | `/api/auth/refresh` | Refresh access token | §3.1 p4 |
| 4 | POST | `/api/rfq` | Path A quick create → Draft | §3.2 p4-5 |
| 5 | POST | `/api/rfq/{rfqId}/publish` | Publish | §3.2 p5 |
| 6-9 | POST/GET | `/api/rfq-draft`, `/{id}`, `/{id}/auto-save`, `/{id}/publish` | Path B wizard | §3.3 p6-7 |
| 10 | GET | `/api/rfq?status=&pageNumber=&pageSize=&sortBy=` | Paginated list | §3.4 p7 |
| 11 | GET | `/api/rfq/{rfqId}` | Detail + status metadata | §3.4 p8 |
| 12 | GET | `/api/rfq/stats/counts` | Tab badge counts | §3.4 p8 |
| 13 | PUT | `/api/rfq/{rfqId}` | Update — **Draft only** | §3.5 p9 |
| 14 | PATCH | `/api/rfq/{rfqId}/amend` | Amend a published RFQ | §3.5 p9 |
| 15 | POST | `/api/rfq/{rfqId}/close-early` | Close early — **no body** | §3.5 p9 |
| 16 | DELETE | `/api/rfq/{rfqId}?reason=…` | Cancel — **query param**, 20–500 chars | §3.5 p9-10 |
| 17 | GET | `/api/rfq/documents/{rfqId}/download` | Spec document (binary) | §3.6 p10 |
| 18 | POST | `/api/rfq/{rfqId}/upload-items` | Excel import (multipart, field `file`) | §3.6 p10 |
| 19-22 | GET | `/api/rfq/master-data/{categories,regions,certifications,units}` | Reference data | §3.7 p11 |

"Pick one per screen — **do not mix**" Path A and Path B (§2 p3).

### 2.2 Create payload (§3.2) — 22 fields

`title`, `estimatedBudget`, `deliveryAddress`, `requiredDeliveryDate`, `closingDate`,
`categoryIds` (**GUIDs, not names**), `targetedRegions` (**CSV string**), `invitedSupplierIds` (CSV),
`allowPartialBids`, `allowPartialDelivery`, `minItemsPerBid`, `maxItemsPerBid`, `allowSplitAward`,
`paymentPlan`, `paymentMilestones[]`, `paymentTermsNotes`, `requirementsAndCriteria`,
`requiredCertifications` (CSV), `minimumWarranty`, `specificationDocumentPath`, `lineItems[]`
(**≥1 required**; each `{categoryId, itemType, lineNumber, itemName, specification, quantity,
unitOfMeasure}` — note **`itemName`**, not `description`).

### 2.3 Create/publish response — branch on `resultType`, **never `status`**

`DraftSaved` | `RfqPublished` | `SavedAsDraftAwaitingVerification` (only this one carries
`willPublishAt`). Plus `rfqId`, `number` (`RFQ-YYYY-NNNN`), `message`, `matchedSuppliersCount`.
§3.2 p5 is explicit: "Reading response.status here yields undefined."

### 2.4 Status enum (§5.1) — string names

`Draft`, `AwaitingVerification`, `Live`, `PartiallyAwarded`, `Awarded`, `Cancelled`, `Expired`,
`Closed` *(internal only — close-early "is never Closed")*. **`Negotiating` is not in the enum** yet
appears in the list filter and `stats/counts` — the doc's own open item #1.

### 2.5 Status metadata — the core UI rule

`availableActions{canPublish,canCompareBids,canAmend,canCloseEarly,canCancel,canViewOrders}`,
`fieldVisibility{showBids,showPaymentTerms,showCancellationReason,allowQuantityDownAmendmentOnly}`,
`primaryActionLabel`. **"Read the flags; do not branch on the status string."** (§5.4)

### 2.6 Business rules (§5.7, §11.2)

Immutable states (Awarded/Cancelled/Expired) · Amend resets all bids on Live, automatically ·
PartiallyAwarded = quantity-**down** only, no add/remove · Cancellation final, reason 20–500 chars,
shared with all suppliers · Close-early self-resolves (all→Awarded, some→PartiallyAwarded,
none→Cancelled) · `amendmentCount`/`lastAmendedAt`/`cancelledAt` always tracked ·
Amend **"cannot change category or regions"** (§3.5).

### 2.7 Errors (§7)

`{error, message, statusCode}`; 200/201/400/401/403/404/409/500. §8.4: a 400's `message` is "written
to be shown as-is".

### 2.8 Pagination (§3.4)

`pageNumber` 1-based · `pageSize` 1–100 (default 25) · `sortBy` created|title|title_desc|closing ·
envelope `{items, pageNumber, pageSize, totalCount, totalPages, hasNextPage}` — the doc flags these
names as unconfirmed against a Postman test asserting a flat `total`.

### 2.9 Files

Download binary w/ `Content-Disposition`; upload `.xlsx` multipart field **`file`**, columns
Description/Specification/Quantity/UoM/RequiredDeliveryDate, partial success → `isSuccess:false` +
per-row `errors[]`.

### 2.10 Idempotency / concurrency / versioning / rate limits

**The document is silent on all four.** No ETag, `If-Match`, idempotency key, rate-limit headers, or
versioning scheme. Notably `POST /{id}/publish` carries no idempotency guarantee — see V-4.

### 2.11 Roles — corrected model (your clarification, 2026-08-18)

| Role | Who it is | Frontend consequence |
|---|---|---|
| `Admin` | The person who **registered the organisation** and completed onboarding. **Not** a platform super-admin. | `orgAdmin` seat → sees the Organisation section. |
| `User` | A member the Admin created via `POST /api/admin/users`. **Did not register the org and has no onboarding profile of their own.** | Member seat. Org identity must come from `/auth/me`'s `kind`, never from onboarding. |
| `SuperAdmin` | Platform back-office; provisioned by the backend. | Member seat in a tenant portal — must **not** inherit `orgAdmin` over an org it does not own. |

**No role encodes buyer-vs-supplier.** That comes from `kind` / `accountType`.

---

## 3. Current state audit

Backend column omitted throughout — see §0. ✅ = fixed this session.

| # | Capability | Frontend status | Evidence (file:line) | Notes |
|---|---|---|---|---|
| 1 | `POST /auth/token` | Missing (deliberate) | — | Web is cookie-first; correct omission. |
| 2 | `POST /auth/login` | Done | `platform/http/apiClient.ts:12-13` | `withCredentials`, signed off. |
| 3 | `POST /auth/refresh` | Done | `platform/http/apiClient.ts:32,45-53` | Single-flight guard. |
| 4 | `POST /api/rfq` | **Done ✅** | `services/rfqHttpApi.ts:35`; `create/useRfqWizard.ts:98-113` | Errors surfaced + pre-flight guard added. |
| 5 | `POST /{id}/publish` | **Done ✅** | `rfqHttpApi.ts:39`; `useRfqWizard.ts:145-165` | `resultType` branch correct; failures now toast. |
| 6-9 | Path B `rfq-draft` ×4 | Missing (deliberate) | 0 hits | Doc open item #5: A and B "cannot both be built". |
| 10 | `GET /api/rfq` | Done | `rfqHttpApi.ts:27`; `hooks/useRfqs.ts:84-119` | Server pagination + `status=`. |
| 11 | `GET /api/rfq/{id}` | Done | `rfqHttpApi.ts:31`; `hooks/rfqQueries.ts:41-57` | Flag-gated; API flags passed through. |
| 12 | `GET /stats/counts` | Missing | `useRfqs.ts:116` (`counts: null`) | 404 on dev. Chip badges blank in real mode. |
| 13 | `PUT /api/rfq/{id}` | Stubbed | `rfqQueries.ts:242-248` | Hook exists, **no caller**. |
| 14 | `PATCH /{id}/amend` | **Blocked — see §6** | `rfqHttpApi.ts:58`; `rfqMappers.ts:225-277` | Must not ship. |
| 15 | `POST /{id}/close-early` | Done | `rfqHttpApi.ts:62`; `rfqQueries.ts:215-221` | |
| 16 | `DELETE /{id}?reason=` | Done | `rfqHttpApi.ts:66` | Correctly a query param. |
| 17 | `documents/{id}/download` | Missing | 0 hits | |
| 18 | `POST /{id}/upload-items` | Stubbed | `rfqHttpApi.ts:70-79` (only hit) | No UI caller; import is client-side `xlsx`. |
| 19 | `master-data/categories` | **Done ✅** | `hooks/useRfqMasterData.ts:23-32,60-66` | Flag-gated; resolver + empty-catalogue guard. |
| 20 | `master-data/regions` | Partial | `useRfqMasterData.ts:34-41` | Fetched; **picker still uses i18n lists**. |
| 21 | `master-data/units` | Partial | `useRfqMasterData.ts:43-50` | Fetched; no consumer. |
| 22 | `master-data/certifications` | Missing | 0 hits | Doc marks optional (§3.7). |
| 23 | Status metadata consumption | Done | `detail/rfqDetailView.ts:113+` | `statusRules.ts` is mock-only. Matches §8.1. |
| 24 | Status labels §5.5 | Conflicts (accepted) | `i18n/locales/en.ts:1753` | Repo/Figma wording wins — see C-4. |
| 25 | Error handling §7/§8.4 | **Done ✅** | `services/rfqErrors.ts` (new); `useRfqWizard.ts:55-58` | Was fully swallowed. |
| 26 | Client validation §8.3 | **Done ✅** | `create/validation.ts:9-19,62-65`; `useRfqWizard.ts:77-96` | Budget rule added at the API boundary — see §5.4. |
| 27 | Pagination §8.5 | Done | `useRfqs.ts:92-96` | |
| 28 | Zero-Fetch compliance | **Done ✅** | `rfqQueries.ts:209-241` | `invalidateQueries` replaced with a projection. |
| 29 | Role model | **Done ✅** | `auth/api/authTypes.ts:4-20`; `platform/api/auth/authContract.ts:15-21` | Corrected to Admin/User/SuperAdmin. |
| 30 | Mapper test coverage | **Done ✅** | `services/rfqMappers.test.ts` (26 tests) | Was zero; no test runner existed. |

### 3.1 Repo conventions the plan follows

| Concern | Established pattern | Evidence |
|---|---|---|
| HTTP | One axios instance, `/api`, `withCredentials`, single-flight refresh | `platform/http/apiClient.ts:12,32,45` |
| Query keys | Namespaced const; real caches separated from mock | `rfqQueries.ts:17-24` |
| Mutations | **Zero-Fetch** `setQueryData`, never invalidate | `rfqQueries.ts:159-170` |
| Errors | Pure mapper → `UiError` → `showToast` | `auth/api/authErrors.ts:45-85` |
| Zustand | `persist` + `createJSONStorage`, flat slice | `create/rfqDraftStore.ts:2,51` |
| Flag isolation | dual `useQuery` + `enabled` | `rfqQueries.ts:42-53` |

### 3.2 Git archaeology

`myapp-frontend-new` is **gitignored by the root repo** and is its own git repo. The entire real-API
layer landed in **one commit, `4278d0f`**; **seven commits since** changed the mock RFQ domain,
three touching files the real path also consumes (`create/outcome.ts`, `create/rfqDraftStore.ts`,
`create/validation.ts`). The previous session stopped **cleanly at a backend wall**, not mid-edit.

### 3.3 Live probe — **rev. 2, re-run 2026-08-18 (later the same day)**

Master data was seeded between the two runs. Current state:

```
POST /api/auth/login   → 200   role "User", kind null, status "Verified", tenantStatus "Active"
GET  /api/auth/me      → 200   (same three layers)
JWT claims             → sub, email, name, role="User", status="verified", exp, iss, aud
                         ← NO organization claim, NO kind claim
GET  /api/rfq          → 403   (empty body)
POST /api/rfq          → 403   ← with a fully valid body and real category GUIDs
GET  /api/rfq/stats/counts → 404 (still not deployed)

GET  /api/rfq/master-data/categories     → 200  17 rows  ✅ SEEDED
GET  /api/rfq/master-data/regions        → 200  13 rows  ✅ SEEDED
GET  /api/rfq/master-data/units          → 200  20 rows  ✅ SEEDED
GET  /api/rfq/master-data/certifications → 200   8 rows  ✅ SEEDED
```

**Also changed:** the direct API host `https://dev-miproc-api.mitechnologies.org` now **responds**
(it previously timed out, which is why ENV-3 existed). It serves `/api/*` but returns 404 for
`/swagger/*` and `/openapi/*` — **no OpenAPI document is exposed**, on either host. The
`/swagger/…` 200s seen on the frontend host are the SPA's `index.html`, not a spec. That matters
because a spec would have answered the budget/amend questions outright.

**The decisive result: `POST /api/rfq` returns 403 with a fully valid body.** Authorization runs
before model binding and validation in this pipeline, so the server never reaches the field rules.
**That is why the budget question cannot be answered empirically yet** — see §5.9.

---

## 4. Role correction — what was wrong and what changed

**The bug:** `UserRole` was declared as
`'Admin' | 'Requester' | 'Approver' | 'Buyer' | 'Supplier' | 'BuyerAndSupplier'` in **two** places
(`features/auth/api/authTypes.ts:4` and `platform/api/auth/authContract.ts:16`). A live `/auth/me`
returns **`"User"`** — a value that union did not contain. TypeScript therefore treated a value the
API genuinely sends as impossible, which is the kind of wrong that stays invisible until someone
writes an exhaustive `switch` and gets a runtime fall-through.

Two further consequences flowed from the stale model:

1. **`membershipsForRole` switched on `Supplier` / `BuyerAndSupplier`** — roles the backend no longer
   serves. Those branches were dead code pretending to be logic.
2. **A code comment asserted "every account registered through this app comes back as `Requester`"** —
   now simply false, and misleading to the next reader.

**What changed (all verified, `tsc -b` clean):**

| File | Change |
|---|---|
| `features/auth/api/authTypes.ts:4-20` | Union → `'Admin' \| 'User' \| 'SuperAdmin'`, with a doc block spelling out that a `User` **did not register the org and has no onboarding profile**. |
| `platform/api/auth/authContract.ts:15-21` | Same union, cross-referenced. |
| `features/auth/useResolveAfterLogin.ts:12-24` | `membershipsForRole` reduced to the honest fallback (`['buyer']`) — no real role encodes buyer-vs-supplier. |
| `features/auth/useResolveAfterLogin.ts:71-92` | `seatForRole` documents all three roles; `SuperAdmin` deliberately does **not** get `orgAdmin` over a tenant it does not own. |
| `features/auth/useResolveAfterLogin.ts:27-31` | Stale `Requester` comment corrected. |

**Runtime behaviour is unchanged** for every role the backend actually sends — portal membership was
already derived from `kind`/`accountType`, not role, and `Admin` still maps to `orgAdmin`. This
removes a lie from the type system rather than altering the signed-off login flow.

> **The `User`-has-no-onboarding-profile point has a downstream consequence worth watching:**
> `useCurrentOrgMeta` (`features/verification/verificationQueries.ts:26-36`) builds org identity from
> `currentOrg()`, which is seeded from onboarding. For an Admin-created `User` that record does not
> exist, so CR/VAT/org-name read blank. It does **not** affect real-mode RFQ publishing (the real path
> takes its outcome from `resultType`, not the local `verified` flag), but it will affect anything that
> displays org identity to a non-Admin member. Logged as V-5.

---

## 5. Frontend fixes applied this session

All in `myapp-frontend-new`. Verified: **`npx tsc -b` → 0 errors · `npx eslint` → clean · `npx vitest run` → 26/26 passing.**

### 5.1 RFQ error handling — `services/rfqErrors.ts` *(new)*

A pure `toRfqError(unknown): UiError` mirroring the established `authErrors.ts` pattern. It reads
**all three** error shapes rather than trusting the guide's alone — `{error,message,statusCode}`
(§7), ASP.NET `{title,status}` (what dev actually returns, observed twice), and
`ValidationProblemDetails.errors{}`. Per §8.4 a usable server `message` wins; 401 and 403 are pulled
out ahead of it because their server text explains nothing to a buyer, and **403 specifically means
the token carries no organization claim** — the current dev blocker, now named rather than
re-diagnosed each time. Developer-facing text (endpoint paths, HTTP verbs, URLs) is screened out.

### 5.2 Failures now surface — `create/useRfqWizard.ts:55-58, 102, 142, 164`

The two `.catch(() => undefined)` calls and the un-handled `createReal.mutate` are routed through
`reportFailure` → `showToast({tone:'error'})`. **This was the single highest-value fix**: before it,
flipping the flag gave a Submit button that did nothing at all.

### 5.3 Invalid payloads blocked — `services/rfqMappers.ts:119-148` + `useRfqWizard.ts:60-96`

New pure `unresolvedCategoryNames(draft, resolve)` reports every category — from **both**
`draft.categories` and `lineItems[].categoryName` — with no master-data GUID, de-duplicated and in
draft order. The wizard runs it before create, publish and amend, and refuses to send, naming the
offenders. Without it, an unresolvable category is silently dropped and the request describes a
narrower RFQ than the one on screen; with an empty catalogue it would post `categoryIds: []` and
blank line-item GUIDs. A test locks the hazard in place (`rfqMappers.test.ts` → "DOCUMENTS THE
HAZARD") so the guard cannot be deleted as redundant.

### 5.4 `estimatedBudget > 0` — `useRfqWizard.ts:90-93`

Enforced, **but deliberately at the API boundary rather than as a step-1 rule**, and you should know
why: the field is labelled **"Estimated budget (optional)"** in both `en.ts:2706` and `ar.ts:2646`,
and `types.ts:148` documents `0` as "none entered (the field is optional)". Guide §8.3 requires
`> 0`. Those are contradictory contracts. Blocking step 1 would have made a Figma-approved
"(optional)" field silently required in the mock demo too — a design change I am not going to slip in
through validation (Constraint #11). So real-mode submits are blocked with a clear message, and mock
behaviour is untouched. **Open question Q-1: if budget should be required everywhere, the label must
drop "(optional)" in both languages first — your call.**

### 5.5 Mock mode no longer calls the real API — `hooks/useRfqMasterData.ts:20-50`

All three reference queries gained `enabled: getConfig().useRealRfq`. Previously, opening Create-RFQ
in **mock mode — the default the app ships with** — fired a live request at
`/api/rfq/master-data/categories` (and a 401 for anyone not signed in).

### 5.6 Zero-Fetch restored — `hooks/rfqQueries.ts:209-241`

`projectRealDetail` no longer calls `invalidateQueries` (a flagged defect under pillar 3 and the
audit protocol). It now projects the authoritative DTO into every cached list page via
`setQueriesData`, copying only fields the detail response genuinely carries. `resumeAvailable` is the
one derived value — once an RFQ leaves `Draft` it cannot be resumed (§4), so a stale `true` would
offer Resume on a cancelled RFQ.

### 5.7 Test suite — `services/rfqMappers.test.ts` *(new)* + vitest

**There was no test runner in this project at all** — no vitest, no jest, zero test files. Added
`vitest` as a dev dependency plus `test` / `test:watch` scripts. 26 tests cover status round-trips,
`Closed`→`live` degradation, `resultType` mapping, the `{triggerType, percentageOfBudget}`-only
milestone write shape, 0%-advance omission, CSV serialisation, title/item trimming, `lineNumber`
contiguity, `maxItemsPerBid: 0` → real count, ISO dates, preset-vs-Custom milestones, the new
category guard including the empty-catalogue case — and, explicitly, that **`invitedSupplierIds` is
always empty** (anonymity, Constraint #5).

### 5.9 ✅ **BUDGET — RESOLVED EMPIRICALLY. The guide is wrong; the Figma label is right.**

With the `marinalamey16@gmail.com` account (`kind: "both"`, `status: "Verified"`) the API became
reachable enough to answer this definitively. **`POST /api/rfq` runs full model validation before the
handler**, so the contract can be read straight off the 400s.

**An empty body `{}` returns the complete required-field list:**

```json
{"title":"One or more validation errors occurred.","status":400,"errors":{
  "Title":               ["RFQ title is required"],
  "CategoryIds":         ["At least one category must be selected"],
  "LineItems":           ["At least one line item is required"],
  "DeliveryAddress":     ["Delivery address is required"],
  "RequiredDeliveryDate":["Required delivery date is required","Required delivery date must be in the future"],
  "ClosingDate":         ["RFQ closing date is required","Closing date must be in the future"]
}}
```

**`EstimatedBudget` is not in it.** And varying it directly:

| Body | Result |
|---|---|
| `estimatedBudget: 125000` | passes validation |
| **`estimatedBudget: 0`** | **passes validation** |
| **`estimatedBudget: -5`** | **passes validation** — there is not even a range check |

**Verdict: `estimatedBudget` is OPTIONAL, with no minimum. Guide §8.3 ("Budget is greater than 0") is
incorrect. The wizard's "Estimated budget (optional)" label and `RfqDraft.budget`'s `0 = none
entered` were both correct all along.**

**Action taken:** the budget guard added earlier in this session has been **removed**
(`create/useRfqWizard.ts`), along with its `budgetRequired` i18n keys in `en.ts`/`ar.ts`. It enforced
a rule the API does not have and would have blocked submissions the backend accepts. This is exactly
why the question was worth testing rather than reasoning about — and it means **no label change is
needed**, so Q-1 is closed.

> Worth reporting back to Backend as a separate hardening note: a **negative** budget is accepted.
> That is almost certainly not intended.

### 5.10 ✅ **The 403 was `kind` — confirmed**

Rev. 2 hypothesised that the 403 was about `kind`, not a missing organization claim. Comparing the
two accounts settles it:

| | `habibablal6@` | `marinalamey16@` |
|---|---|---|
| `role` | `User` | `User` |
| `status` | `Verified` | `Verified` |
| **`kind`** | **`null`** | **`both`** |
| **JWT claims** | sub, email, name, role, status | sub, email, name, role, status, **`kind`** |
| `GET /api/rfq` | **403** | **500** |

`kind` is carried **in the JWT** and its presence is what moves the request past authorisation.
`status: "Verified"` alone is not sufficient — proving the three layers really are independent, and
validating the model encoded in `accessModel.ts` (§5.13).

### 5.11 🔴 **BUG-1 — the RFQ data path returns 500 for every account, including a perfect one**

Tested across **three accounts**. Authorisation is no longer the issue; the endpoints crash instead.

| Account | `role` | `kind` | `status` | `tenantStatus` | `GET /api/rfq` |
|---|---|---|---|---|---|
| `habibablal6@gmail.com` | User | **null** | Verified | Active | **403** (no `kind`) |
| `marinalamey16@gmail.com` | User | both | Verified | Active | **500** |
| `saima.khanum@mi-technologies.sa` | **Admin** | **buyer** | **Verified** | **Active** | **500** |

The third account is the ideal profile — org Admin, buyer, verified, active, onboarding
`status: Completed`, `accountType: Buyer` — and it fails identically. **So this is not an account-data
problem and not a permissions problem.**

**Endpoint matrix (Admin/buyer/Verified):**

| Request | Result |
|---|---|
| `GET /api/rfq` — with, without and with any params, `/rfq/` trailing slash, `?status=Live` | **500** every time |
| `GET /api/rfq/{any-guid}` | **500** (should be **404** for an unknown id) |
| `POST /api/rfq` — **valid** body | **500** |
| `POST /api/rfq` — **invalid** body | **400** with correct validation errors |
| `GET /api/rfq/master-data/*` | **200** |
| `GET /api/auth/me` · `/onboarding/resume` · `/onboarding/cities` | **200** — the session is completely healthy |

**Three facts that localise the fault:**

1. **It is not the payload.** `GET /api/rfq` carries no body at all and still 500s.
2. **It is not auth or the cookie session.** Every non-RFQ authenticated endpoint returns 200.
3. **It is not the whole RFQ controller.** `master-data/*` — the one RFQ route with no organisation
   scoping — works. Everything that touches an actual RFQ record fails.

**Most probable cause:** the handler resolves the caller's organisation and gets nothing. The JWT
carries `sub, email, name, role, status, kind` — and **no organization/tenant claim** — while
`GET /onboarding/resume` returns an `organizationName` (`"test"`) but **no organization id field at
all**. A 500 on `GET /api/rfq/{unknown-guid}`, where a 404 is expected, points the same way: the
handler is throwing *before* it gets as far as "does this RFQ exist".

**Trace id for the backend's logs:** `x-cloud-trace-context: 080cafd31a017180862820fd3528415c`

**Consequence:** no RFQ can be created, so **V-1, V-2, V-3, V-5** (amend semantics, detail field set,
`categoryIds`) stay unanswerable. Everything learnable *without* a persisted RFQ has now been
learned — see §5.14.

### 5.14 ✅ Validation contract — extracted from the live API

Read directly off the 400s. **Our client-side rules match the server's on every point tested**, which
is the outcome guide §5 asks for ("mirror them so the user never sees an avoidable error"):

| Server rule (verbatim message) | Frontend equivalent | Match |
|---|---|---|
| "RFQ title is required" | `requirementValid` | ✅ |
| "At least one category must be selected" | `requirementValid` + `unresolvedCategoryNames` | ✅ |
| "At least one line item is required" | `requirementValid` / `isLineItemValid` | ✅ |
| "Delivery address is required" | `deliveryValid` | ✅ |
| "Closing date must be in the future" | `closingInFuture` | ✅ |
| **"Closing date must be on or before the required delivery date"** | `closingBeforeDelivery` | ✅ |
| "Payment plan must be PlanA, PlanB, or Custom" | `PAYMENT_PLAN_TO_API` | ✅ |
| "MinItemsPerBid and MaxItemsPerBid must be valid and within line item count" | `itemsPerBidValid` | ✅ |

**Not validated by the server** (each passed validation and reached the handler):

| Field | Probe | Meaning |
|---|---|---|
| `estimatedBudget` | `0`, `-5` | optional, no range — §5.9 |
| `unitOfMeasure` | `"bags"` (absent from catalogue) and `"Kilogram"` | **V-10 answered: free text, not checked against master data.** The unit divergence in §5.11 will not cause errors, but it does mean line-item units are uncontrolled vocabulary |
| `targetedRegions` | `"Atlantis"` | not checked against master data |
| `categoryIds` | unknown GUID `99999999-…` | no referential check *at validation time* (may still fail in the handler) |

All eight matching rules are now pinned by tests in `create/validation.test.ts`, quoting the server
messages so either side changing is easy to reconcile.

> **Error-shape note (C-5 confirmed twice over):** every error came back as ASP.NET
> `ProblemDetails` / `ValidationProblemDetails` — `{title, status}` and `{title, status, errors:{}}` —
> **never** the guide's documented `{error, message, statusCode}`. `toRfqError` handles all of them,
> and the field-validation branch it ships with is the one that actually fires.

### 5.15 Contracts verified against the live master data

Now that the catalogue is seeded, several things could be checked rather than assumed:

| Check | Result |
|---|---|
| `ApiMasterCategory {id, name, description?}` | ✅ **Matches** — live keys are exactly `["id","name","description"]` |
| `ApiMasterRegion {id, code?, name}` | ✅ **Matches** — `["id","code","name"]`, e.g. `{code:"BAH", name:"Al Bahah"}` |
| `ApiMasterUnit {id, name, symbol?}` | ✅ **Matches** — `["id","name","symbol"]`, e.g. `{name:"Kilogram", symbol:"kg"}` |
| Certifications endpoint | ✅ Live, 8 rows (`CE Marking, HALAL, ISO 14001, ISO 27001, ISO 45001, ISO 9001, SASO, SFDA`) — **no DTO, not wired** |
| **Region names vs the wizard's i18n list** | ✅ **Exact match, all 13.** The picker sends names the catalogue recognises — G-9 is a **non-issue for regions**, verified rather than assumed |
| **Unit names vs the wizard's i18n list** | ❌ **Mismatch — 11 of 14 do not exist in the catalogue** (below) |
| **Category name uniqueness** | ❌ **17 rows, 16 distinct names** — `"Steel Reinforcement"` is duplicated (below) |

**Units.** The wizard offers `tonnes, kg, units, pieces, meters, m², m³, litres, boxes, pallets,
rolls, sets, bags, hours`. The catalogue holds `Tonne(t), Kilogram(kg), Each(ea), Meter(m), Litre(L),
Box(box), Pallet(plt), Roll(roll), Set(set), Hour(hr), Square Meter(m²), Cubic Meter(m³), …`. Only
`kg`, `m²` and `m³` coincide with a catalogue **symbol**; `"bags"` has no catalogue equivalent at
all. Whether this breaks anything depends on whether the backend validates `unitOfMeasure` — the
guide's own example uses `"pcs"`, which is *also* absent from the seed, which hints it is free text.
**Unverified either way (V-10), but the divergence is real and will corrupt any future
reporting or matching that keys on unit.**

**Duplicate category — fixed defensively (§5.12).**

### 5.12 Duplicate category names — a real defect the seed data exposed

`GET …/master-data/categories` returns **two rows named `"Steel Reinforcement"`**, with GUIDs
`22222222-2222-2222-2222-222222222221` and `c1000001-0000-0000-0000-000000000002`.

`useCategoryIdResolver` built its index with `new Map(categories.map(c => [c.name, c.id]))`, so a
duplicated name resolved to **whichever row came last** — an arbitrary, silent choice between two
genuinely different categories. A buyer picking "Steel Reinforcement" could have their RFQ filed
under an id they never selected, changing which suppliers it matches, with nothing on screen to show
for it.

**Fixed** (`hooks/useRfqMasterData.ts`): the index is now built by a pure, tested
`buildCategoryIdIndex` that keeps the **first** occurrence — not "correct" (only the catalogue owner
knows which is intended) but deterministic instead of order-dependent — plus `duplicateCategoryNames`
and a dev-only console warning. **The real fix is on the backend: de-duplicate the seed (V-11).**

### 5.13 The three-layer authorisation model — typed and encoded

Your clarification exposed a gap: **`UserDto` had no `status` field at all**, even though `/auth/me`
returns one. The frontend was modelling two of the three layers.

| Change | File |
|---|---|
| `UserStatus` type — open union, only `'Verified'` confirmed live | `features/auth/api/authTypes.ts:45-58` |
| `status` added to `UserDto`, with the three layers documented as independent | `features/auth/api/authTypes.ts:68-92` |
| **New** pure model: `isOrgAdmin`, `isPlatformAdmin`, `portalsForKind`, `isBuyer`, `isSupplier`, `isVerified`, `canManageRfqs`, `rfqAccessBlocker` | `features/auth/accessModel.ts` |
| 22 tests, fixtured on the **verbatim live response** | `features/auth/accessModel.test.ts` |

Two decisions worth flagging:

- **`portalsForKind(null)` returns `[]`, not `['buyer']`.** A null `kind` means the backend has
  granted no marketplace side; defaulting to buyer would hand out a portal the backend never did —
  and the live account in exactly that state gets 403 from every RFQ endpoint.
- **`canManageRfqs` requires `kind` + `status`, not `role`.** Both an `Admin` and a `User` may raise
  RFQs for their organisation; `role` governs administrative reach (the Organisation section), not
  whether you may source. This mirrors the observable backend rule but is **unconfirmed** — no
  available account passes it, so nothing has ever returned 200 to check it against.

**Deliberately NOT done:** rewiring the live portal/seat gating in `PortalShell` and
`useResolveAfterLogin` to consume this model. That changes who sees what in a signed-off, deployed
auth flow (Constraint #8), and it should be a reviewed change of its own rather than a side effect of
an RFQ task. The model is pure, tested and ready for it — see Q-7.

### 5.8 Cross-repo position

None of the above needs syncing to MI-Proc: every touched file is real-API (myapp-only per
Constraint #2), MI-Proc has **no `rfqMappers.ts`**, and `create/validation.ts` was deliberately left
unchanged. **Pre-existing debt noted, not fixed:** MI-Proc's `validation.ts` is missing
`closingInFuture`, which myapp gained in commit `783abd8` — a genuine two-repo divergence for a
separate pass.

---

## 6. The Amend risk, in full

### 6.1 What the frontend actually gets from `GET /api/rfq/{rfqId}`

Per the guide's own example (§3.4 p8) and the real response recorded on 12 Aug, the detail endpoint
returns:

```
id · number · title · status · statusDisplay · publishedAt · timeLeft · bidsReceived
lineItems[] · estimatedBudget · paymentPlan · paymentMilestones[]
amendmentCount · lastAmendedAt · cancellationReason · cancelledAt
availableActions{} · fieldVisibility{} · primaryActionLabel
```

### 6.2 What the Amend request requires

`PATCH /api/rfq/{id}/amend` is typed in our code as `ApiCreateRfqRequest` — the **same 22-field body
as create** (`services/rfqHttpApi.ts:58`, `services/rfqDtos.ts:58-84`).

### 6.3 Which fields are missing from the GET response

**16 of the 22.** Present in the create body, absent from the detail response:

| # | Field | # | Field |
|---|---|---|---|
| 1 | `deliveryAddress` | 9 | `allowSplitAward` |
| 2 | `requiredDeliveryDate` | 10 | `minItemsPerBid` |
| 3 | `closingDate` * | 11 | `maxItemsPerBid` |
| 4 | `categoryIds` | 12 | `paymentTermsNotes` |
| 5 | `targetedRegions` | 13 | `requirementsAndCriteria` |
| 6 | `invitedSupplierIds` | 14 | `requiredCertifications` |
| 7 | `allowPartialBids` | 15 | `minimumWarranty` |
| 8 | `allowPartialDelivery` | 16 | `specificationDocumentPath` |

\* `closingDate` appears in the **list** row example but not in the detail example.

Only 6 survive the round-trip: `title`, `estimatedBudget`, `lineItems`, `paymentPlan`,
`paymentMilestones`, and `id`/`number`.

> Our DTO declares all 16 as **optional** (`rfqDtos.ts:160-178`) precisely because their presence was
> never confirmed. Optional in TypeScript means `undefined` at runtime — which is exactly what feeds
> the failure below.

### 6.4 How `toDraftFromApiDetail` reconstructs the draft

`services/rfqMappers.ts:225-277`. It starts from `createBlankDraft()` and applies
`dto.<field> ?? base.<field>` for every field. The intent is honest — *"a field the detail genuinely
does not return stays at that neutral default rather than an invented value"* — and for **display**
that is defensible. For a **write**, it is the whole problem: a neutral default is indistinguishable
from a real value once it is in the draft.

### 6.5 What happens to fields the GET does not return

They silently become `createBlankDraft()`'s defaults (`services/rfqApi.ts:89-117`):

| Field | Value the wizard ends up holding | Character |
|---|---|---|
| `deliveryAddress` | `''` | blank |
| `requiredDeliveryDate` / `closingDate` | `''` | blank |
| `categoryIds` | `[]` | blank |
| `targetedRegions` | `[]` | blank |
| `requiredCertifications` | `[]` | blank |
| `requirementsAndCriteria` | `''` | blank |
| `minimumWarranty` | `''` | blank |
| `paymentTermsNotes` | `''` (hard-coded at `rfqMappers.ts:166`) | blank |
| `specificationDocumentPath` | `null` (hard-coded at `:170`) | blank |
| **`allowPartialBids`** | **`true`** | **wrong value, not blank** |
| **`allowPartialDelivery`** | **`true`** | **wrong value, not blank** |
| `allowSplitAward` | `false` | wrong value |
| `minItemsPerBid` | `1` | wrong value |
| `maxItemsPerBid` | `0` → **recomputed to the line-item count** (`:161`) | wrong value |

The last five are the nastiest: they are not empty, so no "ignore blanks" safety net on the backend
would catch them. They are confident, plausible, **wrong** values.

> **The "categories are locked during Amend" safeguard is illusory here.** The wizard does lock the
> category picker (`amending` → `ChipPicker locked`), which preserves whatever was loaded. But nothing
> was loaded — `dto.categoryIds` is `undefined`, so the lock faithfully preserves an empty list.

### 6.6 What the frontend would actually PATCH

`toApiCreateRequest(store.draft, resolveCategoryId)` serialises the whole draft
(`useRfqWizard.ts:130-133`). Editing only the title on an RFQ whose detail omitted those 16 fields
produces:

```jsonc
PATCH /api/rfq/{id}/amend
{
  "title": "Steel Supply - Updated",   // the one intended change
  "estimatedBudget": 100000,           // survived the GET
  "lineItems": [ /* survived */ ],
  "paymentPlan": "PlanA",              // survived
  "paymentMilestones": [],

  "deliveryAddress": "",               // ← was "Riyadh"
  "requiredDeliveryDate": "",          // ← was a real date
  "closingDate": "",                   // ← was a real date
  "categoryIds": [],                   // ← was ["<cement-guid>"]
  "targetedRegions": "",               // ← was "Riyadh,Jeddah"
  "requiredCertifications": "",        // ← was "ISO 9001"
  "minimumWarranty": "",               // ← was "2 years"
  "requirementsAndCriteria": "",       // ← was the acceptance criteria
  "paymentTermsNotes": "",             // ← was "30 days"
  "specificationDocumentPath": null,   // ← was a real path
  "invitedSupplierIds": "",
  "allowPartialBids": true,            // ← may have been false
  "allowPartialDelivery": true,        // ← may have been false
  "allowSplitAward": false,
  "minItemsPerBid": 1,
  "maxItemsPerBid": 3                  // ← recomputed from item count
}
```

**Every key is present.** None is omitted.

### 6.7 Replace vs merge — and why merge does *not* rescue us

The distinction you drew is the right one, but there are **three** possible backend behaviours, not
two, and only the third would save the current design:

| Behaviour | Rule | Result for the body above |
|---|---|---|
| **(a) Replace** | Every field in the DTO is written; absent → default/null | 🔴 **Catastrophic.** All 16 fields overwritten. |
| **(b) Merge on present keys** | Only keys **present in the JSON** are applied | 🔴 **Still catastrophic.** Our 16 blanks *are* present keys. Merge protects *omitted* fields — we omit nothing. |
| **(c) Merge + ignore null/empty** | Present-but-empty values are skipped | 🟡 Survives by luck. But then a buyer could never legitimately *clear* a field, and the five wrong-value booleans/numbers above are not empty, so they still overwrite. |

> **This is the key correction to the earlier draft of this report.** It is not "full-body is risky if
> the backend replaces". It is: **a full body assembled from an incomplete GET is unsafe under (a) and
> (b), and only accidentally safe under (c).** The shape of the request is the problem, independent of
> the backend's choice.

### 6.8 Worked example — your exact scenario

```
Existing RFQ (backend truth)
  title            = "Steel Supply"
  budget           = 100000
  deliveryAddress  = "Riyadh"
  warranty         = "2 years"
  paymentTerms     = "30 days"

GET /api/rfq/{id} returns → title, budget, lineItems, paymentPlan, paymentMilestones
                            (deliveryAddress, warranty, paymentTerms NOT returned)

Wizard shows           → title "Steel Supply", budget 100000,
                          deliveryAddress "", warranty "", paymentTerms ""      ← already misleading

User edits             → title = "Steel Supply - Updated"

Frontend PATCHes       → { title: "Steel Supply - Updated", estimatedBudget: 100000,
                           deliveryAddress: "", minimumWarranty: "", paymentTermsNotes: "", … }

Result under (a) or (b):
  title            = "Steel Supply - Updated"   ✅
  budget           = 100000                     ✅
  deliveryAddress  = ""                         ❌ WAS "Riyadh"
  warranty         = ""                         ❌ WAS "2 years"
  paymentTerms     = ""                         ❌ WAS "30 days"
```

Three fields destroyed on a **live RFQ with bids**, by a user who changed only the title — and the
amend also resets every submitted bid (§5.7) and notifies suppliers, so the damage is broadcast.

Note the failure begins **before** the write: at the "Wizard shows" line the buyer is already looking
at an RFQ that misrepresents itself. Even a perfectly safe backend leaves that display bug.

### 6.9 Does the current contract guarantee your requirement?

**No.** Your requirement — *edit specific fields, preserve everything else* — is not guaranteed by
either side today:

- **The frontend does not request it.** It sends all 22 fields, so it is asking the backend to set
  every one of them, including the 16 it does not actually know.
- **The backend behaviour is unverified.** No saved Postman example, no live test, no statement in
  the guide beyond a §3.5 example showing a 3-field partial body — which *hints* at merge but proves
  nothing.

**The only design that satisfies your requirement under all three behaviours is a genuine partial
body: send exactly the fields the user changed, and omit the rest.** Concretely — keep the draft
returned by `toDraftFromApiDetail` as an immutable baseline, diff the edited draft against it on
submit, and serialise only the changed keys. Under (a) the untouched fields are absent so a
replace-style handler has nothing to overwrite them with; under (b) they are correctly skipped; under
(c) likewise. It is also the only shape that lets a buyer *deliberately* clear a field, because then
the empty value is present **because they meant it**.

### 6.10 What must be verified before Amend is enabled

| ID | Must verify | How | Blocks |
|---|---|---|---|
| **V-1** | Does `PATCH /amend` **merge or replace**? | BEFORE → `PATCH` a single field → AFTER. Compare every field. | Everything below |
| **V-2** | If it merges — does it merge on **key presence** or also **ignore empty values**? | Second PATCH sending `minimumWarranty: ""` on an RFQ that has one. If it survives → (c); if cleared → (b). | Whether blanks are ever safe |
| **V-3** | Exactly which fields does `GET /api/rfq/{id}` return for a **Live** RFQ? | One authenticated GET, diffed against the 22-field create body. | The wizard misrepresenting the RFQ (§6.8) |
| **V-4** | Is `PATCH /amend` **idempotent**? Does a retry increment `amendmentCount` twice and reset bids twice? | Same PATCH sent twice; inspect `amendmentCount`. | Retry safety |
| **V-5** | Does `GET /api/rfq/{id}` return `categoryIds` at top level, or only `lineItems[].categoryId`? | Same GET as V-3. | The categories-blanked bug |

Until **V-1 and V-3** are answered, Amend stays disabled. That is not caution for its own sake: it is
the only item in this backlog that can destroy a buyer's live RFQ data, silently, on a correct-looking
user action.

---

## 7. The plan, re-cut

### A. Frontend issues fixable now — ✅ **DONE this session**

| Item | Status |
|---|---|
| RFQ error mapper + toasts (§5.1, §5.2) | ✅ Implemented, verified |
| Pre-flight guard against invalid payloads (§5.3) | ✅ |
| `estimatedBudget > 0` (§5.4) | ✅ (at the API boundary — see Q-1) |
| Mock mode no longer hits real master-data (§5.5) | ✅ |
| Zero-Fetch correction (§5.6) | ✅ |
| Mapper unit tests + test runner (§5.7) | ✅ 26/26 |
| i18n error keys, en + ar (§5.1) | ✅ |
| Role model correction (§4) | ✅ |

**Verification:** `npx tsc -b` → 0 errors · `npx eslint` → clean · `npx vitest run` → 26 passed.

**Still fixable without the backend, not yet done:**

| Item | Size | Notes |
|---|---|---|
| Wire `sortBy` into the list request | S | `RfqListParams` already accepts it; nothing sends it. |
| Wire `PUT /api/rfq/{id}` for Draft edit (G-10) | M | Today a resumed Draft in real mode would create a **second** RFQ. |
| Extend tests to `listView` / `rfqDetailView` mappers | M | Same argument as §5.7. |
| Re-verify post-`4278d0f` mock/real drift (§3.2) | M | `outcome.ts`, `validation.ts`, `rfqDraftStore.ts`. |

### B. Backend data seeding — ✅ **DONE, verified live**

Seeded between the two probe runs today. Verified, not assumed:

| Endpoint | Rows | DTO match | Frontend today |
|---|---|---|---|
| `master-data/categories` | 17 (**16 distinct names**) | ✅ | Consumed; resolver now duplicate-safe (§5.12) |
| `master-data/regions` | 13 | ✅ | Fetched; picker uses i18n list — **names match exactly**, so safe (§5.11) |
| `master-data/units` | 20 | ✅ | Fetched; picker uses i18n list — **11 of 14 names do not exist in the catalogue** (§5.11) |
| `master-data/certifications` | 8 | n/a | **Not wired** — no DTO, no hook |

Two data-quality items came back with it: the duplicate category name (V-11) and the unit vocabulary
divergence (V-10).

### C. Backend contract behaviour still needing verification

Every one of these was attempted against the live API today. **All of the RFQ-endpoint questions are
blocked behind the same 403** — see §5.9/§5.10.

| ID | Question | Status after live testing | Priority |
|---|---|---|---|
| **BUG-1** | **`GET /api/rfq`, `GET /api/rfq/{id}` and `POST /api/rfq` all return 500** for an authorised account (`kind: both`, `status: Verified`). Validation returns correct 400s; every request that reaches the handler crashes. Suspect the organisation lookup — the JWT carries `kind` but **no organization/tenant claim**. | 🔴 **THE blocker. Backend fault, not frontend.** Nothing can be created, so V-1/V-2/V-3/V-5 stay unanswerable. | **P0** |
| **V-1** | `PATCH /amend` merge or replace? | 🔴 Blocked by BUG-1 (§6) | **P0** |
| **V-2** | If merge: key-presence or empty-ignoring? | 🔴 Blocked by BUG-1 | **P0** |
| **V-3** | Exact field set of `GET /api/rfq/{id}` | 🔴 Blocked by BUG-1 | **P0** |
| **V-5** | Top-level `categoryIds` on detail? | 🔴 Blocked by BUG-1 | **P0** |
| **V-15** | Negative `estimatedBudget` (`-5`) is accepted. Intended? | 🟠 **Newly found** — almost certainly not | P1 |
| **V-11** | De-duplicate `"Steel Reinforcement"` in the category seed | 🟠 Confirmed live; frontend now fails safe (§5.12) | **P1** |
| **V-13** | Why is `habibablal6@` `requiresOnboarding: false` yet `kind: null`? | 🟠 Inconsistent account state | P1 |
| **V-4** | Is `publish` / `amend` idempotent? | 🔴 Blocked by BUG-1 | P1 |
| **V-6** | List envelope: `totalCount` or flat `total`? | 🔴 Blocked by BUG-1 | P1 |
| **V-14** | Will an OpenAPI/Swagger document be exposed on dev? | 🟠 404 on both hosts | P2 |
| **V-7** | Does `Negotiating` ship as a status? | ⚪ Unchanged; four sources say no | P2 |
| **V-8** | `stats/counts` deployment | ⚪ Still **404** | P2 |
| **V-9** | Idempotency / concurrency / versioning / rate limits | ⚪ Doc silent (§2.10) | P2 |

**✅ RESOLVED by live testing:**

| ID | Question | Answer |
|---|---|---|
| **V-12** | Is `estimatedBudget` required? | **No — optional, no minimum.** Guide §8.3 is wrong (§5.9). Frontend guard removed. |
| **ENV-1** | What grants RFQ access? | **`kind` in the JWT.** `status: Verified` alone is not enough (§5.10). |
| **ENV-2** | Master data seeded? | **Yes** — 17/13/20/8 rows, all DTOs match (§5.15). |
| **ENV-3** | Direct API host reachable? | **Yes**, it responds now. |
| **V-10** | Is `unitOfMeasure` validated against master data? | **No — free text** (§5.14). Same for `targetedRegions`. |
| **C-5** | Which error shape does the API really use? | **ASP.NET ProblemDetails**, never the documented `{error,message,statusCode}` (§5.14). |
| **Q-1** | Must the budget label change? | **No** — "(optional)" was correct. Closed. |

### D. Amend — **disabled until V-1, V-3 and V-5 are answered**

Do not enable. Do not "try it on a test RFQ" against a live-shaped RFQ with bids. When the answers
land:

1. If **merge on key presence (b)** or **replace (a)** → implement the **partial-diff PATCH** of §6.9.
   This is the shape your requirement actually needs and it is safe under every behaviour.
2. Fix `toDraftFromApiDetail` to reconstruct `categoryIds` from distinct `lineItems[].categoryId`
   (V-5) regardless.
3. If V-3 shows the GET is still lean, the amend wizard must **hide** fields it did not receive rather
   than render them blank — a blank box that means "we don't know" is indistinguishable from one that
   means "empty", and the buyer cannot tell which they are about to save.
4. Keep the bid-reset confirmation dialog (§3.5) — amend resets every submitted bid and notifies
   suppliers.

**The business requirement is unchanged and is the thing being protected:** amend specific fields,
preserve all other existing RFQ data.

---

## 8. Open questions

| # | Question | Recommended default |
|---|---|---|
| **Q-1** | Budget is labelled "(optional)" but §8.3 requires `> 0`. Make it required everywhere (label changes in en + ar), or keep it enforced only at the API boundary as now? | **Keep as now** until you decide — the label is a Figma contract and changing it is a design call, not a validation tweak. |
| **Q-2** | Should I draft the backend escalation for ENV-1 (org claim) + V-1/V-3/V-5 using today's probe output? | **Yes** — ENV-1 is the only thing standing between us and a validated integration. |
| **Q-3** | Switch region/unit pickers to master data as soon as it is seeded? | **Yes**, behind the flag — i18n lists risk sending values the backend does not recognise. |
| **Q-4** | Wire `PUT /api/rfq/{id}` now (Draft edit creates a duplicate RFQ today)? | **Yes** — it needs no backend verification and is a real bug. |
| **Q-5** | Extend tests to the list/detail view-model mappers? | **Yes** — same reasoning as the create mappers. |
| **Q-6** | Fix MI-Proc's missing `closingInFuture` (two-repo divergence)? | **Yes, separately** — it is unrelated to this integration. |

---

## 8b. For the .NET Backend Team — copy-paste

> **P0 — every RFQ data endpoint returns 500 on dev**
>
> **Environment:** `https://dev-miproc.mitechnologies.org/api` (same via `dev-miproc-api…`)
> **Date:** 2026-08-18 · **Trace:** `x-cloud-trace-context: 080cafd31a017180862820fd3528415c`
>
> **Repro** — sign in as `saima.khanum@mi-technologies.sa` (`role: Admin`, `kind: buyer`,
> `status: Verified`, `tenantStatus: Active`, onboarding `Completed`, `accountType: Buyer`), then:
>
> ```
> GET  /api/rfq                      → 500 {"title":"An unexpected error occurred.","status":500}
> GET  /api/rfq/{any-guid}           → 500   (expected 404)
> POST /api/rfq   (valid body)       → 500
> POST /api/rfq   (invalid body)     → 400   ✅ validation works
> GET  /api/rfq/master-data/*        → 200   ✅
> GET  /api/auth/me, /onboarding/*   → 200   ✅ session healthy
> ```
>
> Reproduced on **three** accounts. Not payload-related (`GET` has no body), not auth-related
> (everything else authenticates fine), not the whole controller (`master-data` works).
>
> **Likely cause:** the handler resolves the caller's organisation and gets null. The JWT contains
> `sub, email, name, role, status, kind` and **no organization/tenant claim**, and
> `GET /onboarding/resume` returns `organizationName` but **no organization id**.
>
> **Also please confirm/fix while you are in there:**
> 1. `estimatedBudget` accepts **negative** values (`-5` passes validation). Intended? *(Separately:
>    it is correctly **optional** — please update Integration Guide §8.3, which says "> 0".)*
> 2. `GET /api/rfq/stats/counts` → **404**, not deployed.
> 3. `master-data/categories` contains **duplicate names**: `"Steel Reinforcement"` appears under both
>    `22222222-2222-2222-2222-222222222221` and `c1000001-0000-0000-0000-000000000002`.
> 4. Errors are ASP.NET `ProblemDetails`, not the guide's `{error, message, statusCode}` — please
>    correct §7 of the guide (we already handle both).
> 5. Could dev expose **Swagger/OpenAPI**? It 404s on both hosts and would remove most of these questions.
>
> **Once the 500 is fixed we still need one contract answer to finish Amend:** does
> `PATCH /api/rfq/{id}/amend` **merge** (only supplied keys applied) or **replace** (unsupplied keys
> cleared)? And does `GET /api/rfq/{id}` return the full editable field set, including top-level
> `categoryIds`? See §6.

---

## 9. Files changed this session

**Created**
- `src/features/rfq/services/rfqErrors.ts` — RFQ error mapper
- `src/features/rfq/services/rfqMappers.test.ts` — 26 tests
- `src/features/auth/accessModel.ts` — the three-layer role/kind/status model
- `src/features/auth/accessModel.test.ts` — 22 tests, fixtured on the live `/auth/me` response
- `src/features/rfq/hooks/useRfqMasterData.test.ts` — duplicate-category index tests

**Modified**
- `src/features/rfq/services/rfqMappers.ts` — `unresolvedCategoryNames`
- `src/features/rfq/create/useRfqWizard.ts` — error surfacing + payload guard
- `src/features/rfq/hooks/useRfqMasterData.ts` — flag gate; duplicate-safe `buildCategoryIdIndex`
- `src/features/rfq/hooks/rfqQueries.ts` — Zero-Fetch projection
- `src/features/auth/api/authTypes.ts` — role model + **`UserStatus` / `status` (the missing third layer)**
- `src/platform/api/auth/authContract.ts` — role model
- `src/features/auth/useResolveAfterLogin.ts` — role consumers + comments
- `src/platform/i18n/locales/en.ts` + `ar.ts` — `rfq.create.errors.*`
- `package.json` — `vitest` dev dependency, `test` scripts

**Verification:** `npx tsc -b` → 0 errors · `npx eslint` (changed files) → clean ·
`npx vitest run` → **48 passed, 3 files**.

**Untouched by design:** `platform/http/apiClient.ts` (frozen auth), `create/validation.ts`,
`features/onboarding/*`, and everything under `d:\MI-Proc\src` (MI-Proc needs no sync — §5.8).

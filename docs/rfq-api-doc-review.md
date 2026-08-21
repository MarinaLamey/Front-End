# RFQ API Documentation Review — section by section

**Reviewed 2026-08-18.** Sources, and the short names used throughout:

| # | File | Short name | Version |
|---|---|---|---|
| A | `API Integration guide for RFQ.txt` | **GUIDE-v1.0** | footer: `**API Version**: 1.0` / `**Last Updated**: August 2026` |
| B | `rfq_status_handling_collection.json` | **COLLECTION** | `"name": "RFQ Status Handling - Complete"` |
| C | `summary of RFQ endpoints completed.txt` | **SUMMARY** | `- **v1.0** (August 2026)` |
| D | `RFQ_API_Integration_Guide.pdf` (sent earlier this session) | **GUIDE-v1.1** | `API version 1.1`, `Last updated 11 August 2026` |
| E | Live dev backend, probed today | **LIVE** | `https://dev-miproc.mitechnologies.org/api` |

> **The single most important framing point.** GUIDE-v1.1 supersedes GUIDE-v1.0 and says so
> explicitly: *"Version 1.0 of this document described section 3 from an earlier build. The create
> payload, the publish and create result shape, and the cancellation contract have all been corrected
> here against the Postman collection."* (GUIDE-v1.1, §5.8, p17). **Files A and C are the superseded
> build.** Most of the Blocker defects below are cases where A and C still describe v1.0 behaviour.
> If your frontend was built against A or C, it is built against a contract that no longer exists.

---

## PART 1 — ANSWERS: what the docs establish, per section

### A1. GUIDE-v1.0 §Quick Start

**Says:**
> `- baseUrl: https://localhost:5001 (development) or your production API URL`
> `   email: test@example.com`
> `   password: TestPass123!`

**Establishes:** a local dev base URL and shared test credentials.
**Status:** both stale. LIVE base is `https://dev-miproc.mitechnologies.org/api`. I could not verify
the credentials work (they are not our dev accounts). COLLECTION contradicts the base URL — its own
setup note says `// baseUrl: http://localhost:5000` (COLLECTION, "1. Environment Variables"). Three
files, three different base URLs.

### A2. GUIDE-v1.0 §API Architecture Overview — two creation paths

**Says:**
> `#### Path A: Quick Create (Single Request)` … `**Endpoint**: POST /api/rfq`
> `#### Path B: Wizard Mode (Multi-Step)` … `POST /api/rfq-draft`, `GET /api/rfq-draft/{id}`,
> `POST /api/rfq-draft/{id}/auto-save`, `POST /api/rfq-draft/{id}/publish`

**Establishes:** two mutually-exclusive creation flows. Path A is create-then-publish; Path B is
draft-with-resume.
**Gap:** COLLECTION contains **zero** `/api/rfq-draft/*` requests — Path B is documented in prose and
exercised nowhere. SUMMARY lists a fifth Path B endpoint that appears in no other file:
> `- DELETE /api/rfq-draft/{id} - Delete draft` (SUMMARY, §Wizard Mode (5))

### A3. GUIDE-v1.0 §Authentication

**Says:**
> \| `/api/auth/token` \| POST \| Login & get tokens (for mobile/Postman) \|
> \| `/api/auth/login` \| POST \| Login with httpOnly cookies (for web) \|
> `- accessToken: Use in Authorization: Bearer header`

**Establishes:** two auth routes with different mechanisms — Bearer for mobile, cookies for web.
**This part is correct**, and LIVE confirms both: `/auth/token` returns a real ~732-char token;
`/auth/login` returns `{"token":"","refreshToken":"","user":{…}}` and sets HttpOnly `access_token`
(path `/`) + `refresh_token` (path `/api/auth/refresh`).
**But** the response field name is wrong everywhere — see Defect **BLK-7**.

### A4. GUIDE-v1.0 §RFQ Creation — the create body

**Says:**
> `"categories": ["Construction"],`
> `"targetedRegions": ["Riyadh", "Eastern Province"],`
> `"description": "Steel rebar 12mm",` (inside `lineItems`)
> `"invitedSupplierIds": []`

**Establishes:** name-based arrays for categories and regions, `description` on line items, and an
array for invited suppliers.
**All four are wrong.** See **BLK-1**, **BLK-2**, **BLK-3**. LIVE settles it: `POST /api/rfq` with
`{}` returns
```json
"errors":{"Title":["RFQ title is required"],"CategoryIds":["At least one category must be selected"],
          "LineItems":["At least one line item is required"], …}
```
The field is **`CategoryIds`**, not `categories`.

**Also incomplete:** the GUIDE-v1.0 create example omits `minItemsPerBid`, `maxItemsPerBid`,
`allowSplitAward`, `paymentMilestones` and `specificationDocumentPath`, all of which COLLECTION sends
in its "Create RFQ (Draft)" body. LIVE confirms `minItemsPerBid` is *validated*, so it is a real part
of the contract that GUIDE-v1.0 simply does not mention.

### A5. GUIDE-v1.0 §RFQ Creation — the create/publish **response**

**Says:**
> `"status": "Draft",`
> `"message": "RFQ created and saved as draft.",`
and for publish:
> `"status": "Live",` … `"status": "AwaitingVerification",`

**Establishes:** a `status` discriminator on create and publish.
**Wrong — this is the highest-impact defect.** GUIDE-v1.1 §3.2 p5: *"Create and publish return a
resultType discriminator — DraftSaved, RfqPublished or SavedAsDraftAwaitingVerification — and **no
status field. Reading response.status here yields undefined.**"* COLLECTION's own saved 201 example
agrees:
> `"body": "{\n  \"rfqId\": \"…\",\n  \"number\": \"RFQ-2026-0001\",\n  \"title\": \"Office Supplies & Equipment\",\n  \"resultType\": \"DraftSaved\",\n  \"message\": \"RFQ saved as draft\",\n  \"matchedSuppliersCount\": 0\n}"`

See **BLK-4**.

### A6. GUIDE-v1.0 §RFQ Listing

**Says:**
> `"pageNumber": 1, "pageSize": 25, "totalCount": 18, "totalPages": 1, "hasNextPage": false`
> `- status: Draft, Live, AwaitingVerification, Negotiating, Awarded, Cancelled, Expired`

**Establishes:** a paged envelope with `totalCount`, and `Negotiating` as a filter value.
**Contradicted by COLLECTION**, whose list test asserts a *flat* field:
> `"pm.expect(jsonData.total).to.be.a('number');"` (COLLECTION, "List All RFQs")

SUMMARY sides with the guide (`pageNumber, pageSize, totalCount, totalPages, hasNextPage,
hasPreviousPage`). Two-against-one, but **not verifiable** — LIVE returns 500 on the list. See
**MAJ-3** and Unknown **U-3**.

### A7. GUIDE-v1.0 §RFQ Detail — `actionState`

**Says:**
> `// Response includes actionState based on RFQ status`
> `"actionState": { "primaryAction": "Duplicate RFQ", "isPrimaryActionDisabled": false,`
> `  "secondaryActions": [ { "label": "Amend RFQ", "actionType": "amend", … } ],`
> `  "showBidsReceivedSection": true, "showComplianceSection": true, "showPaymentTermsSection": true }`

**Establishes:** a nested action-descriptor object driving the detail UI.
**This object does not exist.** GUIDE-v1.1 §5.8 lists it as a *settled* question:
*"Which UI contract does the detail endpoint return? → **availableActions, fieldVisibility and
primaryActionLabel. actionState is not returned.** Evidence: Every saved response in the collection;
four of five source documents."*
COLLECTION confirms — every saved detail body carries `availableActions` / `fieldVisibility` /
`primaryActionLabel` and never `actionState`. See **BLK-5**. SUMMARY repeats the error at length.

### A8. GUIDE-v1.0 §RFQ Management — Cancel

**Says:**
> `DELETE /api/rfq/{rfqId}` … with a JSON body:
> `{ "cancellationReason": "Requirements changed. New RFQ coming with updated specs." }`

**Establishes:** cancellation reason sent in a request body.
**Wrong.** COLLECTION sends it as a query parameter:
> `"raw": "{{baseUrl}}/api/rfq/{{rfqId}}?reason=This project has been cancelled internally due to budget constraints…"`
GUIDE-v1.1 §5.8 marks this settled: *"How is the cancellation reason sent? → As a URL-encoded query
parameter, 20-500 characters. **Not a request body.**"* and §3.5 p10 adds *"a body is ignored"*.
See **BLK-6**.

**Length rule:** COLLECTION establishes 20–500 chars via its error example
> `"message": "Cancellation reason must be between 20 and 500 characters."`
GUIDE-v1.0 states no length rule at all — a silent omission.

### A9. GUIDE-v1.0 §RFQ Management — Close early

**Says:**
> `// No request body needed`
> `// Status changes to Closed`

**Establishes:** close-early produces `Closed`.
**Wrong.** GUIDE-v1.1 §5.8: *"What status does close-early return? → **Awarded, PartiallyAwarded or
Cancelled — never Closed.** Closed stays an internal intermediate. Evidence: Three saved close-early
responses, one per outcome."* COLLECTION has exactly those three saved responses
("Close Early - Auto Resolve to Awarded" / "…PartiallyAwarded" / "…Cancelled"). See **BLK-8**.

### A10. GUIDE-v1.0 §Documents & Bulk Operations

**Says:**
> `POST /api/rfq/{rfqId}/upload-items` … `Form Data: - file: [binary xlsx file]`
> Excel columns: `1 Description`, `2 Specification`, `3 Quantity`, `4 Unit of Measure`, `5 Required Delivery Date`

**Establishes:** multipart upload under field name `file`, five columns, partial-success shape with
`importedCount` / `errors[]` / `isSuccess`.
**Consistent with GUIDE-v1.1 §3.6.** No contradiction found. Unverified live (blocked).
**Undocumented extra:** SUMMARY adds `File validation (Excel .xlsx only, max 5MB)` — the 5 MB limit
appears in **no** other file. See **MIN-4**.

### A11. GUIDE-v1.0 §Master Data

**Says:**
> `GET /api/rfq/master-data/categories` / `regions` / `certifications` / `units`

**Establishes:** four reference endpoints.
**Correct and LIVE-verified today** — 17 categories, 13 regions, 20 units, 8 certifications, all 200.
Shapes: categories `{id,name,description}`, regions `{id,code,name}`, units `{id,name,symbol}`.
**The docs never state these shapes** — I had to read them off the wire. See Unknown **U-7**.

### A12. GUIDE-v1.0 §State Machine

**Says:**
> `Negotiating`
> `ââ Actions: Open negotiations, Compare bids, Amend, Cancel`
> `ââ Next: â Awarded OR â PartiallyAwarded OR â Cancelled`

**Establishes:** `Negotiating` as a first-class status.
**Contradicted by GUIDE-v1.1 §5.1**, whose enum is `Draft, AwaitingVerification, Live,
PartiallyAwarded, Awarded, Cancelled, Expired, Closed` — no `Negotiating` — and §5.8 open item #1:
*"Four sources say it does not [ship]."* See **MAJ-2**.

### A13. GUIDE-v1.0 §Error Handling

**Says:**
> `{ "error": "RFQ not found", "message": "…", "statusCode": 404 }`

**Establishes:** a three-key error envelope.
**Neither the collection nor the live API uses it.** COLLECTION's error examples are two-key:
> `"body": "{\n  \"message\": \"Cannot amend RFQ with status 'Awarded'…\",\n  \"statusCode\": 400\n}"`
LIVE returns ASP.NET ProblemDetails, a third shape entirely:
```json
{"title":"An unexpected error occurred.","status":500}
{"title":"One or more validation errors occurred.","status":400,"errors":{"Title":["RFQ title is required"]}}
```
Three documented/actual shapes, none matching. See **BLK-9**.

### A14. GUIDE-v1.0 §Best Practices

**Says:**
> `### 3. Validate Input on Client` … `- Budget > 0`
> `### 1. Always Check actionState` … `const canAmend = !actionState.secondaryActions.find(a => a.actionType === 'amend')?.isDisabled;`

**Establishes:** budget is required to be positive, and `actionState` drives buttons.
**Both wrong.** `actionState` per **BLK-5**. Budget per **BLK-10** — LIVE proves `estimatedBudget`
is optional: `EstimatedBudget` is absent from the empty-body required list, and bodies with `0` and
`-5` both pass validation.

### B1. COLLECTION §Setup & Authentication

**Says:**
> `"pm.environment.set('accessToken', 'Bearer ' + jsonData.accessToken);"`
> posted to `"raw": "{{baseUrl}}/api/auth/login"`

**Establishes:** login returns `accessToken` in the body.
**Broken as written.** LIVE `/api/auth/login` returns `{"token":"","refreshToken":"","user":{…}}` —
no `accessToken` key, and `token` is **empty on purpose** because web auth is cookie-based. This
script sets the variable to the literal string `"Bearer undefined"`, so every subsequent request in
the collection is unauthenticated. See **BLK-7**.

### B2. COLLECTION §1. DRAFT Status — Create RFQ

**Says (test):**
> `"pm.expect(jsonData.status).to.equal('Draft');"`
> `"pm.expect(jsonData.availableActions).to.exist;"`
> `"pm.expect(jsonData.availableActions.canPublish).to.be.true;"`

**Says (its own saved 201 example):**
> `{ "rfqId": …, "number": "RFQ-2026-0001", "title": …, "resultType": "DraftSaved", "message": "RFQ saved as draft", "matchedSuppliersCount": 0 }`

**The test contradicts the example in the same request.** The saved body has neither `status` nor
`availableActions`, so all three assertions fail against the documented response. See **MAJ-1**.

### B3. COLLECTION §4. Amendment Workflows

**Says (4a, "Amend Live RFQ - Full Edit"):** a PATCH body containing **every** field — `title`,
`categoryIds`, `estimatedBudget`, `lineItems`, `deliveryAddress`, `requiredDeliveryDate`,
`closingDate`, `allowPartialDelivery`, `allowPartialBids`, `minItemsPerBid`, `maxItemsPerBid`,
`allowSplitAward`, `paymentPlan`, `paymentMilestones`, `paymentTermsNotes`,
`requirementsAndCriteria`, `requiredCertifications`, `minimumWarranty`,
`specificationDocumentPath`, `targetedRegions`, `invitedSupplierIds`.

**Says (GUIDE-v1.1 §3.5 p9), the same endpoint:** a **three-field** body —
> `{ "title": "Steel Rebar, Grade 60 - AMENDED", "estimatedBudget": 135000, "requiredDeliveryDate": "2026-09-05T00:00:00Z" }`

**This is the most consequential ambiguity in the whole doc set.** One source implies full-body
replace, the other implies partial merge, and **neither states the semantics**. See **BLK-11** and
Unknown **U-1**.

**Internal contradiction in 4b:** the description says
> `"Amend PartiallyAwarded RFQ - only reduce quantities (10â8, 20â18). No field changes allowed."`
…while the body it sends also changes `requiredDeliveryDate` to `2026-04-30T23:59:59Z`,
`closingDate` to `2026-03-28T17:00:00Z` and `requiredCertifications` to `"ISO 9001"`. Either the
rule or the example is wrong. See **MAJ-5**.

**Also:** GUIDE-v1.0 §Amend says `// Cannot change category or regions`, yet both COLLECTION amend
bodies send `categoryIds` **and** `targetedRegions` (4a even *changes* regions to
`"Riyadh,Jeddah,Dammam,Khobar"`). See **MAJ-6**.

### B4. COLLECTION §5. CLOSE EARLY

**Says:** three saved responses resolving to `"status": "Awarded"`, `"status": "PartiallyAwarded"`,
and `"status": "Cancelled"` with
> `"cancellationReason": "RFQ closed early with no awards selected"`

**Establishes:** the auto-resolution rule, correctly, and directly refutes GUIDE-v1.0's "Status
changes to Closed". This is the collection at its most useful.

### B5. COLLECTION §7. LIST RFQs

**Says:** `"pm.expect(jsonData.total).to.be.a('number');"` — see A6 / **MAJ-3**.

### C1. SUMMARY §Deliverables

**Says:**
> `**File:** backend/RFQ_API_Postman_Collection.json`

**The primary collection this whole document set is built around is not among the files you sent me.**
COLLECTION (file B) is a *different* artefact — `"RFQ Status Handling - Complete"` — and contains no
auth-token, master-data, wizard or document requests despite SUMMARY claiming seven groups including
`Master Data`. See Unknown **U-6**.

### C2. SUMMARY §Security Notes

**Says:**
> `â All endpoints require Authorization: Bearer {accessToken} header`
> `â Role-based access (Buyer, BuyerAndSupplier)`

**Both contradicted.** The first contradicts GUIDE-v1.0's own auth table (`/api/auth/login` = "Login
with httpOnly cookies (for web)") — the web client sends **no** Authorization header. LIVE confirms
cookie-only calls succeed. The second is obsolete: LIVE `/auth/me` returns
`{"role":"Admin","kind":"buyer","status":"Verified"}` — roles are `Admin | User | SuperAdmin`, and
buyer/supplier is the separate `kind` field. See **MAJ-7** and **MAJ-8**.

### C3. SUMMARY §Example: Complete Flow

**Says:**
> `const auth = await POST /api/auth/token`
> `token = auth.accessToken`
> `status = published.status  // "Live" or "AwaitingVerification"`

**Both lines are wrong.** LIVE `/auth/token` returns `{"token":…,"refreshToken":…,"user":{…}}` —
`auth.accessToken` is `undefined`. And publish returns `resultType`, not `status` (A5). See **BLK-7**,
**BLK-4**.

### C4. SUMMARY §Key Response Fields

**Says:**
> `bidsReceived_List[],  // Bid summaries`

**Appears in no other document** and in no saved response. Undocumented field of unknown shape.
See Unknown **U-8**.

### C5. SUMMARY §closing claim

**Says:**
> `All endpoints are production-ready, fully documented, and tested.`

**Contradicted by LIVE.** Today, on three separate accounts including a `role: Admin` / `kind: buyer`
/ `status: Verified` / `tenantStatus: Active` account:
```
GET  /api/rfq            → 500     POST /api/rfq (valid body)   → 500
GET  /api/rfq/{id}       → 500     POST /api/rfq (invalid body) → 400  (validation works)
GET  /api/rfq/stats/counts → 404
GET  /api/rfq/master-data/*  → 200
GET  /api/auth/me, /onboarding/* → 200
```
See **BLK-12**.

---

## PART 2 — DEFECT LOG

Ranked. Each has pasteable corrected wording.

### 🔴 BLOCKERS

**BLK-1 — create body: `categories` should be `categoryIds`, and they are GUIDs**
*Where:* GUIDE-v1.0 §Path A + §Quick Create; SUMMARY §Example Complete Flow.
*Wrong:* `"categories": ["Construction"],`
*Correction:*
> `"categoryIds": ["c1000001-0000-0000-0000-000000000001"],   // GUIDs from GET /api/rfq/master-data/categories — names are rejected`
*Evidence:* LIVE empty-body 400 names `CategoryIds`; COLLECTION create body uses `categoryIds`;
GUIDE-v1.1 §2.1 p3 `categoryIds: ["550e8400-..."], // GUIDs, not names`.

**BLK-2 — create body: `targetedRegions` is a comma-separated STRING, not an array**
*Wrong:* `"targetedRegions": ["Riyadh", "Eastern Province"],`
*Correction:*
> `"targetedRegions": "Riyadh,Eastern Province",   // comma-separated string, not an array`
*Evidence:* COLLECTION `"targetedRegions": "Riyadh,Jeddah,Dammam"`; GUIDE-v1.1 §2.1 p3.
*Same fix for* `invitedSupplierIds` (`[]` → `""`) and `requiredCertifications`.

**BLK-3 — line items use `itemName`, not `description`**
*Wrong:* `"description": "Steel rebar 12mm",`
*Correction:*
> `"itemName": "Steel rebar 12mm",   // NOT "description" — that is the Path B (rfq-draft) field name`
*Evidence:* COLLECTION `"itemName": "Office Chairs"`; GUIDE-v1.1 §3.2 p5. Note the two paths really
do differ — GUIDE-v1.0 §Path B uses `description`, and that one is correct for `/api/rfq-draft`.
Worth calling out explicitly so nobody "fixes" the wrong one.

**BLK-4 — create/publish return `resultType`, NOT `status`**
*Wrong:* `"status": "Draft",` / `"status": "Live",` / `"status": "AwaitingVerification",`
*Correction (create 201):*
> ```json
> { "rfqId": "…", "number": "RFQ-2026-0001", "title": "…",
>   "resultType": "DraftSaved", "message": "RFQ saved as draft", "matchedSuppliersCount": 0 }
> ```
> **Branch on `resultType`, never `status`. These responses have no `status` field — reading it yields `undefined`.**
> Publish returns `resultType: "RfqPublished"` or `"SavedAsDraftAwaitingVerification"`; only the second carries `willPublishAt`.
*Evidence:* GUIDE-v1.1 §3.2 p5; COLLECTION saved 201 body.

**BLK-5 — `actionState` does not exist; the detail response returns three flat objects**
*Where:* GUIDE-v1.0 §Get RFQ Detail + §Best Practices #1 + #4; SUMMARY §State-Specific Actions + §Key Response Fields.
*Correction:*
> The detail response carries **`availableActions`**, **`fieldVisibility`** and **`primaryActionLabel`**. There is no `actionState` object, no `secondaryActions[]`, no `blockingIssues[]`, no `showBidsReceivedSection`.
> ```json
> "availableActions": { "canPublish": false, "canCompareBids": true, "canAmend": true,
>                       "canCloseEarly": true, "canCancel": true, "canViewOrders": false },
> "fieldVisibility": { "showBids": true, "showPaymentTerms": true,
>                      "showCancellationReason": false, "allowQuantityDownAmendmentOnly": false },
> "primaryActionLabel": "Compare bids"
> ```
> Read the flags; never derive buttons from the status string.
*Evidence:* GUIDE-v1.1 §5.8 settled table; every saved detail body in COLLECTION.
*Impact:* any detail screen written against GUIDE-v1.0 renders nothing.

**BLK-6 — cancellation reason is a QUERY PARAMETER, not a body**
*Wrong:* `DELETE /api/rfq/{rfqId}` + `{ "cancellationReason": "…" }`
*Correction:*
> ```
> DELETE /api/rfq/{rfqId}?reason=<URL-encoded text>
> ```
> **No request body — a body is ignored.** The reason must be **20–500 characters**, is enforced server-side, and is shared with every supplier. Under 20 chars returns 400 *"Cancellation reason must be between 20 and 500 characters."*
*Evidence:* COLLECTION cancel URL + its 400 example; GUIDE-v1.1 §3.5 p9-10 and §5.8.

**BLK-7 — the login response field is `token`, not `accessToken`; and web uses cookies**
*Where:* COLLECTION auth script; SUMMARY §Example Complete Flow; GUIDE-v1.0 §Authentication ("Response includes: `accessToken`").
*Correction:*
> **Web:** `POST /api/auth/login` sets HttpOnly cookies `access_token` (path `/`) and `refresh_token` (path `/api/auth/refresh`). The response body returns `"token": ""` and `"refreshToken": ""` **on purpose** — the real values are in the cookies. Send no Authorization header.
> **Mobile/Postman:** `POST /api/auth/token` returns `{ "token": "…", "refreshToken": "…", "user": {…} }`. The field is **`token`**, not `accessToken`.
> COLLECTION fix: `pm.environment.set('accessToken', 'Bearer ' + jsonData.token);` — and point it at `/api/auth/token`, not `/api/auth/login`.
*Evidence:* LIVE, both routes, today.

**BLK-8 — close-early never produces `Closed`**
*Wrong:* `// Status changes to Closed`
*Correction:*
> No request body. The end status **resolves itself** from how many line items were awarded: all → `Awarded`; some → `PartiallyAwarded`; none → `Cancelled` (with the auto reason *"RFQ closed early with no awards selected"*). **It is never `Closed`** — that is an internal intermediate state the API does not return.
*Evidence:* COLLECTION's three saved close-early responses; GUIDE-v1.1 §5.7, §5.8.

**BLK-9 — the error format is ASP.NET ProblemDetails**
*Wrong:* `{ "error": "RFQ not found", "message": "…", "statusCode": 404 }`
*Correction:*
> ```json
> { "title": "An unexpected error occurred.", "status": 500 }
> { "title": "One or more validation errors occurred.", "status": 400,
>   "errors": { "Title": ["RFQ title is required"] } }
> ```
> Read `errors{}` for field-level messages and `title` for the summary. There is no `error` or `statusCode` key.
*Evidence:* LIVE, every error observed today. Note COLLECTION uses a third shape (`{message, statusCode}`) which is also wrong.

**BLK-10 — `estimatedBudget` is OPTIONAL, with no minimum**
*Wrong:* GUIDE-v1.0 §Best Practices #3 `- Budget > 0`
*Correction:*
> `estimatedBudget` is **optional**. Verified against the deployed API: it is absent from the required-field list, and bodies with `0` and even `-5` pass validation. Do not block submission on it.
> **Required fields are exactly six:** `title`, `categoryIds`, `lineItems`, `deliveryAddress`, `requiredDeliveryDate`, `closingDate`.
*Evidence:* LIVE — `POST /api/rfq` with `{}` returns those six and nothing else.
*(Separately worth fixing server-side: a negative budget should probably be rejected.)*

**BLK-11 — amend semantics are undefined, and the two sources imply opposite behaviour**
*Where:* GUIDE-v1.1 §3.5 (3-field partial body) vs COLLECTION 4a (21-field full body).
*Correction — the docs must state one of these explicitly:*
> `PATCH /api/rfq/{id}/amend` uses **merge** semantics: only fields present in the request body are applied; every field not sent is left unchanged.
> — OR —
> `PATCH /api/rfq/{id}/amend` uses **replace** semantics: the request body must contain the complete RFQ; any field omitted is cleared.
*Why it is a Blocker:* the requirement is "edit specific fields, preserve the rest". Under replace, a
body assembled from a detail response that omits fields would **silently destroy live RFQ data**.
See Unknown **U-1**.

**BLK-12 — "production-ready and tested" is not true today**
*Wrong:* SUMMARY `All endpoints are production-ready, fully documented, and tested.`
*Correction:*
> Known defect (2026-08-18): every RFQ endpoint that touches an RFQ record returns **500** — `GET /api/rfq`, `GET /api/rfq/{id}`, `POST /api/rfq` — on all tested accounts including `role: Admin` + `kind: buyer` + `status: Verified`. Validation still returns correct 400s and `master-data/*` returns 200, so the fault is in the RFQ data path, not auth or routing. `GET /api/rfq/stats/counts` returns **404** (not deployed).
*Evidence:* LIVE. Trace for the backend's logs: `x-cloud-trace-context: 080cafd31a017180862820fd3528415c`.

### 🟠 MAJOR

**MAJ-1 — COLLECTION's create test contradicts its own saved example.**
`"pm.expect(jsonData.status).to.equal('Draft');"` and `"pm.expect(jsonData.availableActions.canPublish).to.be.true;"` assert fields the saved 201 body does not contain.
*Correction:* `pm.expect(jsonData.resultType).to.equal('DraftSaved');` and delete the `availableActions` assertions from the **create** test (they belong on **detail**).

**MAJ-2 — `Negotiating` is documented as a status but is not in the enum.**
GUIDE-v1.0 §State Machine + §Tab Counts (`negotiatingCount`) vs GUIDE-v1.1 §5.1.
*Correction:* > `Negotiating` is not a stored status. The enum is `Draft, AwaitingVerification, Live, PartiallyAwarded, Awarded, Cancelled, Expired` (plus the internal `Closed`). If a "negotiating" view is needed, derive it client-side; do not send it as a `status` filter value.
*Confirm with backend before deleting the tab — see U-4.*

**MAJ-3 — list paging field name: `total` vs `totalCount`.**
COLLECTION asserts `jsonData.total`; GUIDE-v1.0, GUIDE-v1.1 and SUMMARY all say `totalCount`.
*Correction:* pick one and state it. My money is on `totalCount` (three sources vs one test script), but **this is unverified** — see U-3.

**MAJ-4 — GUIDE-v1.0's create example is missing five real fields.**
`minItemsPerBid`, `maxItemsPerBid`, `allowSplitAward`, `paymentMilestones`, `specificationDocumentPath` are all absent from the guide but present in COLLECTION's body — and `minItemsPerBid` is demonstrably validated (LIVE: *"When partial bids are allowed, MinItemsPerBid and MaxItemsPerBid must be valid and within line item count"*).
*Correction:* add all five to the §Quick Create example.

**MAJ-5 — COLLECTION 4b contradicts itself on PartiallyAwarded amendments.**
Description: `"only reduce quantities … No field changes allowed."` Body: also changes `requiredDeliveryDate`, `closingDate`, `requiredCertifications`.
*Correction:* either make the example body change **only** quantities, or restate the rule as "quantity may only decrease; other fields are ignored".

**MAJ-6 — "Cannot change category or regions" vs examples that send both.**
GUIDE-v1.0 §Amend says `// Cannot change category or regions`; COLLECTION 4a sends `categoryIds` and *changes* `targetedRegions` to `"Riyadh,Jeddah,Dammam,Khobar"`.
*Correction:* state whether these fields are **rejected**, **silently ignored**, or **accepted** on amend. This directly affects whether a full-body amend is even legal.

**MAJ-7 — "All endpoints require Authorization: Bearer" is false for web.**
*Correction:* > Web clients authenticate with HttpOnly cookies set by `POST /api/auth/login` and send no Authorization header. Only mobile/Postman clients using `POST /api/auth/token` send `Authorization: Bearer`.

**MAJ-8 — the documented role model is obsolete.**
SUMMARY `Role-based access (Buyer, BuyerAndSupplier)`.
*Correction:* > Authorisation has three independent layers: `role` (`Admin | User | SuperAdmin`), `kind` (`buyer | supplier | both`), and `status` (`Verified` once the SuperAdmin approves the org's Admin). Buyer-vs-supplier is **`kind`**, not `role`. RFQ access is granted by `kind`; a `null` kind returns **403** on every RFQ endpoint even when `status` is `Verified`.
*Evidence:* LIVE — `habibablal6@` (`kind: null`, `status: Verified`) → 403; `saima.khanum@` (`kind: buyer`) → past authorisation.

### 🟡 MINOR

**MIN-1 — three different base URLs.** `https://localhost:5001` (GUIDE-v1.0 §Quick Start) vs `http://localhost:5000` (COLLECTION setup note) vs the real `https://dev-miproc.mitechnologies.org/api`.

**MIN-2 — stale test credentials.** `test@example.com / TestPass123!` (GUIDE-v1.0 §1.3) and `buyer@example.com / Password123!` (COLLECTION login body). Neither is one of our dev accounts.

**MIN-3 — Path B is documented but never exercised.** Four endpoints in GUIDE-v1.0 §Path B, five in SUMMARY (adds `DELETE /api/rfq-draft/{id}`), zero requests in COLLECTION.

**MIN-4 — undocumented 5 MB upload limit.** SUMMARY only. Appears in no contract.

**MIN-5 — master-data response shapes are never documented.** Endpoints listed, payloads never shown.

**MIN-6 — GUIDE-v1.0 has no version marker in its body**, only a footer. Easy to mistake for current. Add `SUPERSEDED BY v1.1` at the top.

---

## PART 3 — STILL UNKNOWN

| ID | Question | Why the docs can't answer | Most direct way to find out |
|---|---|---|---|
| **U-1** | Does `PATCH /amend` **merge** or **replace**? | GUIDE-v1.1 §3.5 shows a partial body; COLLECTION 4a sends a full one. Neither states the rule. | Once the 500 is fixed: create an RFQ with every optional field populated → `GET` (save as BEFORE) → `PATCH {"title":"X"}` only → `GET` again → diff. If `minimumWarranty`/`paymentTermsNotes` are now empty, it replaces. **Or** ask backend whether the amend handler maps nulls. |
| **U-2** | Exactly which fields does `GET /api/rfq/{id}` return? Specifically top-level `categoryIds`? | GUIDE-v1.1 §3.4's example is explicitly abbreviated; GUIDE-v1.0's is the obsolete `actionState` shape. | One authenticated `GET` on a real RFQ; dump `Object.keys()`. Blocked by the 500. |
| **U-3** | List envelope: `total` or `totalCount`? | COLLECTION test says one, three prose sources say the other. | One `GET /api/rfq?pageSize=1` once the 500 is fixed. |
| **U-4** | Does `Negotiating` ship? | Present in GUIDE-v1.0 state machine + `stats/counts`; absent from the v1.1 enum. | Ask backend directly — it is a one-line answer about the `RfqStatus` enum. |
| **U-5** | On amend, are `categoryIds`/`targetedRegions` rejected, ignored, or accepted? | "Cannot change category or regions" vs examples that send them. | Same live test as U-1: PATCH with a *changed* region and see whether it 400s or silently no-ops. |
| **U-6** | Where is `RFQ_API_Postman_Collection.json`? | SUMMARY references it as the primary deliverable; it is not in the files I was given. | Ask backend to send it — it reportedly contains the master-data, wizard and document requests that COLLECTION lacks. |
| **U-7** | Master-data response shapes | Never documented. *(I read them off the wire today: categories `{id,name,description}`, regions `{id,code,name}`, units `{id,name,symbol}`, certifications `{id,name,description}`.)* | Already answered empirically — just needs writing into the doc. |
| **U-8** | What is `bidsReceived_List[]`? | SUMMARY only; no shape, no other mention. | Ask backend, or read it off a real detail response once the 500 is fixed. |
| **U-9** | Idempotency, concurrency, versioning, rate limits | **NOT ANSWERED IN ANY DOC.** No ETag, `If-Match`, idempotency key, or rate-limit header anywhere. | Ask backend: is `POST /{id}/publish` idempotent? A double-click must not create two live RFQs. |
| **U-10** | Full `status` enum on `/auth/me` | Only `"Verified"` has ever been observed. | Ask backend for the enum. |
| **U-11** | Is `unitOfMeasure` / `targetedRegions` validated against master data? | Docs silent. *(LIVE says **no** — `"bags"` and `"Atlantis"` both pass.)* | Answered empirically; needs documenting. |

---

## PART 4 — FRONTEND IMPACT, ranked by urgency

| # | Blocked work | Blocked by | Consequence if built anyway |
|---|---|---|---|
| **1** | **Anything at all against the live API** | BLK-12 (500 on every RFQ data endpoint) | Nothing can be validated end to end. This gates every row below. |
| **2** | **Amend / edit-RFQ screen** | U-1 + U-2 + BLK-11 | **Data destruction.** A full-body PATCH built from a detail response that omits 16 fields would blank them on a live RFQ — and amend also resets every submitted bid and notifies suppliers. Do not ship until U-1 is answered. |
| **3** | **RFQ detail screen** | BLK-5, U-2 | Built against `actionState` it renders **no buttons and no sections** — the object never arrives. Must read `availableActions`/`fieldVisibility`/`primaryActionLabel`. |
| **4** | **Create → publish flow** | BLK-1/2/3/4 | Wrong field names → 400 on every attempt; reading `response.status` → `undefined` → the success screen can never decide between "Live" and "Awaiting verification". |
| **5** | **Error handling everywhere** | BLK-9 | Code reading `err.message` / `err.statusCode` displays nothing. Must read ProblemDetails `title` + `errors{}`. |
| **6** | **Auth bootstrap** | BLK-7, MAJ-7 | Reading `accessToken` from the login body yields `undefined`; adding an Authorization header on web is the wrong model entirely. |
| **7** | **Cancel dialog** | BLK-6 | Sending a body silently cancels with **no reason recorded** — and the reason is shared with suppliers. Also needs the 20–500 char validator, which GUIDE-v1.0 never mentions. |
| **8** | **Budget field** | BLK-10 | Blocking submit on `budget > 0` rejects RFQs the API accepts. *(I have already removed this guard from our frontend on the strength of the live evidence.)* |
| **9** | **List pagination** | U-3, MAJ-3 | Pager reads `undefined` if the field name is wrong → page count breaks. |
| **10** | **Status filter tabs** | MAJ-2, U-4 | A `Negotiating` tab that the API rejects as a filter value, or a permanently empty tab. |
| **11** | **Close-early confirmation copy** | BLK-8 | Telling the user the RFQ becomes "Closed" when it actually becomes Awarded / PartiallyAwarded / **Cancelled** — the last one is a very different thing to confirm. |
| **12** | **Excel import, spec download, wizard resume** | MIN-3, U-6 | Path B is unexercised and the primary collection is missing; nothing to build against. |
| **13** | **Publish retry / double-click guard** | U-9 | Risk of duplicate live RFQs. |

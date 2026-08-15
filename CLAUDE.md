# CLAUDE.md — MI-Proc / mimony

Context for any new session. Read this fully before editing.

---

## 1. Overview

**mimony** (internal repo name **MI-Proc**) is a **bilingual (English + Arabic, full RTL) B2B procurement / e-sourcing web frontend** for the Saudi market.

The one idea that drives every screen: it is a **blind (anonymous) marketplace**. A **Buyer** posts an **RFQ** (Request for Quotation); **Suppliers** bid on it.

- **Identities stay hidden on BOTH sides until the deal is awarded AND the supplier accepts the Purchase Order.** The buyer only ever sees "Supplier A / B / C"; the supplier only ever sees "Verified buyer".
- mimony **does not hold funds** (not escrow). It records the agreed payment schedule; money moves directly between buyer and supplier.
- Prices are in **SAR**, **VAT is 15%**, region is **Saudi Arabia**.

**Users:** Buyers (post RFQs, compare bids, award), Suppliers (discover RFQs, submit/revise bids), plus a super-admin back-office (verifications). One email/company can be **both** buyer and supplier.

---

## 2. Tech stack

- **React 18 + TypeScript**, **Vite** build.
- **Tailwind CSS v4** (uses arbitrary grid templates, e.g. `grid-cols-[20px_minmax(180px,2.4fr)_...]`).
- **Tailwind v4 — there is NO tailwind.config theme.** All design tokens live in
  `src/index.css` (925 lines): `@theme` → semantic var → `--mp-*` primitive, each
  with a whitelabel override slot, e.g.
  `--color-brand-primary: var(--brand-primary, var(--mp-brand-primary))`.
  Re-skin via the override slot, never by editing `@theme`.
  Fully tokenised: brand, content, background, border, interactive, status,
  motion (12 `--animate-*`, 4 easings, 6 durations, `.mp-*` utilities), `--font-sans`.
  NOT tokenised: spacing, radius, shadow, type scale, tracking, leading,
  breakpoints — these use Tailwind's stock scale (`p-5`, `rounded-xl`, `text-sm`,
  `shadow-xl`). A Figma value that misses the stock scale is a decision, not a
  silent round: propose a token and get approval.
- **Zustand** (client state), **TanStack Query** (server state), **react-router-dom** (routing), **react-i18next** (i18n).
- **Mock-first**: data is **localStorage-backed** with artificial latency so the UI exercises loading/optimistic paths. Swapping to the real BFF is a body change inside the API seam (`rfqApi.ts`, `ordersApi.ts`) — return shapes stay put.

---

## 3. Architecture

### Two repositories — WHY (read this before touching either)

There are **two copies of the same frontend on purpose**. This is the single most confusing thing
about this codebase, so here is the reasoning in full.

| | **MI-Proc** (`d:\MI-Proc`, `src/`) | **myapp** (`d:\MI-Proc\myapp-frontend-new`, `src/`) |
|---|---|---|
| Role | The **mock-API reference / design source of truth** | The **real-API integration** target |
| Data | 100% **mock**, localStorage-backed, artificial latency | Real BFF over HTTP where wired; mock elsewhere |
| Ships to | **GitHub** | **GitLab `dev`** → Cloud Run `dev-miproc.mitechnologies.org` (backend `https://dev-miproc-api.mitechnologies.org`) |
| Purpose | Build & review every screen against Figma without waiting on backend | Prove the screens against the live API, one module at a time |

**Why two instead of one:**
1. **The backend is not ready, and never all at once.** Screens must be designed, reviewed and
   signed off against Figma *now*. MI-Proc lets the whole product exist and be clicked through
   end-to-end with zero backend. Waiting for endpoints would stall the design work.
2. **Real integration is risky and lands module-by-module.** Auth landed first, RFQ is mid-flight,
   bids/orders are still mock. Doing that surgery in the same tree that holds the reviewed design
   would constantly break the reference. myapp absorbs the churn; MI-Proc stays clean and always
   demoable.
3. **A clean fallback.** If a real-API change goes wrong on the deployed dev site, MI-Proc is still
   the known-good version of every screen.
4. **The mock is also the spec.** MI-Proc's mock services encode the agreed behaviour (statuses,
   transitions, VAT, anonymity). When a real endpoint arrives we diff its behaviour against the mock.

**Why the same UI change must be made in BOTH:**
The two repos are the *same product*. If a screen changes in only one, they drift and the "reference"
stops matching what actually deploys — every later comparison, review and port becomes unreliable.
So: **a UI/screen change is not done until it exists in both repos.**

**Where they are ALLOWED to differ (the exception):**
Only the **real-API wiring** — that lives in myapp alone (Constraint #2). Concretely myapp has files
MI-Proc does not: `features/auth/api/`, `useSessionBootstrap`, `useLogout`, `useResolveAfterLogin`,
`platform/http/apiClient`, and the flag-driven RFQ view-models. Those files, plus the real-API i18n
strings (auth/onboarding errors, toasts), are **myapp-only and must never be overwritten by a copy
from MI-Proc.** For those, mirror the *behaviour*, not the bytes.

**How to sync safely (learned the hard way):**
- **MI-Proc is CRLF, myapp is LF.** A raw `diff -rq` reports ~141 files "differing" when only ~46
  really differ. Always compare with `diff --strip-trailing-cr`, and convert on copy:
  `sed 's/\r$//' src/<path> > myapp-frontend-new/src/<path>`.
- **Never blanket-copy a whole tree or a shared file.** Check the diff direction first: if myapp has
  lines MI-Proc lacks (`>` lines), it holds real-API content — **merge by hand, don't copy.**
  `PortalShell.tsx` (has `useLogout`) and both i18n locale files are the usual traps.
- Files where MI-Proc is purely ahead can be copied wholesale; then confirm with `diff -q`.

### Feature-based (vertical slice) architecture
All new frontend code lives under **`src/features/<feature>/`** (binding rule). A feature owns its pages, components, hooks, services, and types.

### Mock API seam + data flow
- Services like `features/rfq/services/rfqApi.ts` and `features/orders/services/ordersApi.ts` are the **only** owners of dynamic data (localStorage records). Static reference lists (categories, regions, certs, units) live in i18n as localisable arrays, not in the API.
- **Optimistic updates via `setQueryData`, NOT `invalidate`** (a UI/UX pillar).
- Platform model (from roadmap): async / BFF / **202-style** flows; regulatory integrations (Nafath / WATHQ / CR / VAT / ZATCA) run in **backend middleware behind the BFF** — the frontend builds **mock-first against contracts**; the ZATCA SDK is server-side.

### Flag-driven detail (real + mock unification, myapp)
- In **myapp**, `RfqDetailPage` and the RFQ list are **flag-driven**: a view-model (`rfqDetailView.ts` → `RfqDetailView`, via `fromMockRfq` / `fromApiDetail`) plus `statusRules.ts` (a **MOCK-ONLY** mirror of the backend's `availableActions` / `fieldVisibility` / `primaryActionLabel` flags — never used in the real path). The `useRealRfq` flag toggles mock vs real.
- In **MI-Proc**, the same pages are the **older mock-only** versions. These files **have legitimately diverged** between the two repos (real integration lives only in myapp). Do not force them byte-identical.

### Real-API integration — what is DONE vs still mock (myapp only)

| Module | Real-API state |
|---|---|
| **Register / Onboarding / Login / Reset password / Logout** | ✅ **COMPLETE & signed off** (2026-08-10, pushed to GitLab `dev`). **Do not touch** — Constraint #8. |
| **RFQ (buyer lifecycle)** | ⏸️ **PAUSED ~55%** — code written & build-green behind `useRealRfq`, but **0% live-validated**. |
| **Bids / Compare / Award / Negotiation / Orders / Supplier / Organisation** | ❌ Still **100% mock** — no backend contract yet. |

#### Auth + Onboarding — the finished real integration (historical record; do not re-litigate)
This is the part that is genuinely **live against the backend**. Recorded here so no future session
has to re-discover it.

- **Auth model = HttpOnly cookies, NOT bearer (web).** `POST /api/auth/login` sets `access_token`
  (TTL **8h**, path `/`) + `refresh_token` (**30d**, path `/api/auth/refresh`), both Secure +
  SameSite=Strict + HttpOnly. The login **response body's `token`/`refreshToken` are EMPTY on
  purpose** — that is not a failure. The same backend serves Flutter, which uses the Bearer token;
  **web must stay cookie-first.** All calls go through one axios instance with `withCredentials`.
- **Endpoints wired & verified end-to-end (curl + browser):** `register` → `verify-otp` (phone SMS,
  **4 digits**, 5 min, 60s cooldown) → `verify-email` (**6 digits**, 15 min) → `login` →
  `/auth/me` → `/auth/refresh` → `/auth/logout`. SMS login: `send-otp{purpose:'Login'}` →
  `login{method:'Sms', otpCode}`. Onboarding: `GET /onboarding/cities`,
  `POST /onboarding/documents/{CommercialRegistrationCertificate|VatCertificate|NationalAddressCertificate}`
  (multipart field **`file`** → returns a `gs://` documentId), `PUT /onboarding/review`,
  `POST /onboarding/submit`.
- **Password reset = 3 steps** (backend-confirmed twice): `forgot-password` →
  `verify-password-reset` (→ `resetToken`) → `reset-password{resetToken,newPassword}`.
- **Onboarding lifecycle:** `PendingVerification` → `InProgress(currentStep)` → `Ready` →
  `Completed`. Login routing: **`Completed` OR `Ready` → dashboard**; anything else resumes the
  wizard at `currentStep`. Wizard **saves on ENTRY** to each step (backend accepts partial
  `/onboarding/review` saves), so a drop-out resumes where it left off.
- **Backend field rules (discovered by live test, enforced by the FE):** password ≥8 with
  upper+lower+digit+special; **CR = exactly 10 digits**; **VAT = exactly 15 digits starting and
  ending with 3**; UnitNumber/building/additional = exactly 4 digits; postal = 5 digits;
  `currentStep` must be **1–5** (sending 6 is rejected); `addressLine1`/`addressLine2` must be
  composed and non-empty. NB: **CR/VAT format is validated but registry EXISTENCE (WATHQ/ZATCA) is
  NOT** — a fake-but-format-valid CR reached `Completed`.
- **Error contract:** `ProblemDetails {status,title,detail?}` + `ValidationProblemDetails
  {…errors:{field:[]}}` + soft-`200 {success:false,message}`. **There is no `errorCode` field** —
  the old ErrorCode table is dead. Register duplicate = **409**; bad/unverified login = **401**;
  OTP throttle = `200 {success:false, retryAfterSeconds}` (honour that value for the cooldown).
- **Logout is fully secure** (backend confirmed 2026-08-10): blacklists the access JWT, revokes the
  refresh token, clears both cookies. An earlier gap (access token surviving logout) is **closed**.
- **Two bootstrap gotchas already fixed — do not reintroduce:** `/auth/refresh` + `/auth/me` are
  skipped on `/login` and `/register` in **both** bootstraps; and **StrictMode was removed** because
  its dev remount replayed the entrance animation and looked like a self-refresh.

### UI/UX philosophy — 4 binding pillars
1. Low cognitive load. 2. 60fps / **GPU-only** motion. 3. Optimistic `setQueryData` (no invalidate). 4. Graceful failure.

### Build sequence (product phases, in order)
**tenancy → auth → buyer → supplier.** Auth/onboarding is **complete**. Buyer bid flow is largely complete. **Supplier is the current phase.**

### Key domain rules (invariants — apply everywhere)
- **Anonymity** (above) — the single most important rule.
- **Mirror symmetry:** buyer is **one-to-MANY** (compare many bids → Award, possibly split across suppliers → issues one PO per awarded supplier). Supplier is **one-to-ONE** (manages one bid per RFQ → Submit / Withdraw / Revise-when-invited → *receives* a PO). Buyer terminal states: Awarded / Cancelled / Closed. Supplier: Won / Lost / Withdrawn / Expired. Supplier **"Lost" = identity was never revealed at all**.
- **Line items / partial bids / partial quantity:** an RFQ has N line items; a supplier may quote only some (subject to a buyer min, e.g. "≥3 of 5") — un-quoted shows "Not supplying"; may quote fewer units → shortfall flag.
- **Compliance:** RFQ can require docs (ISO 9001, SASO Conformity, Mill test certificate); per bid each is On file / Attached / Missing / Not attached.
- **Payment terms:** buyer PROPOSES a schedule (Staged 30/60/10, 50/50, or custom milestones); supplier accepts / rejects / counters — store proposer + response.
- **Offer versioning:** every negotiation round is kept **immutably, append-only** (v1, v2, v3…) as an audit trail labeled by author. **Never overwrite an offer.**
- **VAT:** all pricing is SAR ex-VAT per line, VAT 15% added once on the subtotal.

### RFQ status model
Stored statuses: `draft`, `awaiting_verification`, `live`, `partially_awarded`, `awarded`, `cancelled`, `expired`.
**"Negotiating" is a DERIVED display state, not stored:** a `live` RFQ where the **buyer has OPENED a negotiation** — i.e. `rfq.negotiations` has ≥1 persisted thread. Bid-level "Negotiating/Submitted" tags are the *suppliers'* states, not the RFQ's.

### RFQ Amend / Extend logic (agreed this session)
- A **Live RFQ keeps Amend + Close-early even when it has bids.** Amending a live RFQ warns it notifies suppliers / resets bids.
- Amend + Close-early are withdrawn **only once the buyer has opened a negotiation** (`rfq.negotiations` non-empty) → RFQ reads **"Negotiating"** → the only change left is **Extend the bidding window** (change closing date; submitted bids stay valid; open negotiations unaffected; can extend again). "Open negotiations" action also appears.
- An **`awaiting_verification` RFQ can also Amend** (+ Cancel) — it's editable before it goes live on verification. Its detail shows no bids/Compare.
- The RFQ **list chip** shows "Negotiating" for a live RFQ with an open negotiation.

---

## 4. Project structure

Paths are under each repo's `src/`.

- **`features/rfq/`** — the RFQ + Bids + Negotiation + Award domain.
  - `services/rfqApi.ts` — mock API seam + **`seedRfqs()`** demo data (STORE_KEY `miproc.rfqs.v7`).
  - `types.ts` — RFQ/Bid/Award/Negotiation/`SupplierBidRecord` types.
  - `hooks/rfqQueries.ts`, `hooks/useRfqs.ts` — TanStack Query hooks + mutations.
  - `detail/` — `RfqDetailPage`, `CompareBidsPage`, `AwardConfirmedPage`, `CompareOverrideDialog`, `ExtendWindowDialog`, `deriveRfqDetail.ts`, `award.ts`; (myapp only: `rfqDetailView.ts`, `statusRules.ts`, `useRfqDetailView`).
  - `negotiate/` — `NegotiationThreadPage`, `NegotiationsInboxPage`, `EndNegotiationDialog`, `deriveNegotiation.ts` (thread/offer model, `getThread`, `deriveThread`, `applyBuyerCounter`).
  - `create/` — Create-RFQ wizard (`PaymentTermsEditor.tsx` holds the "Coming soon: split payments…" BNPL promo banner — intentional, in Figma).
  - `supplier/` — **the supplier feature (currently being built by another session — see TODO / Do-Not).**
  - `BidsInboxPage.tsx`, `RfqListPage.tsx` — buyer Bids inbox + RFQ list.
  - `listView.ts` — **myapp only** (flag-driven list row view-model).
- **`features/orders/`** — buyer Orders module (100% mock, STORE_KEY `miproc.orders.v5`); dependency-free PDF (`purchaseOrderPdf.ts`).
- **`features/auth/`, `features/onboarding/`** — DONE, do not touch (see Do-Not).
- **`features/dashboard/`, `features/admin/`, `features/subscription/`, `features/profile/`, `features/marketing/`, `features/legal/`.**
- **`platform/i18n/locales/en.ts` + `ar.ts`** — ALL UI strings. Every key must exist in **both** files, in **both** repos.
- **`app/`** — `PortalShell`, `ComingSoonPage` (placeholder for unbuilt routes), `portals.ts`.
- **`router.tsx`** — routes. Buyer portal is wired; **all `/supplier/*` routes currently point at `ComingSoonPage`** (being replaced by the supplier tab).
- **`shared/ui/`, `shared/lib/`** — design-system components + helpers (`cn`, `formatSar`, `toHalalas`, `money`).

---

## 5. Conventions & rules

- **Code style:** single quotes, **no semicolons**, **2-space** indentation, `@/` import alias. Clean / DRY / readable. Intent-revealing comments (explain *why*, match surrounding density).
- **Bilingual, always:** every user-facing string goes through i18n; add the key to **`en.ts` AND `ar.ts`** in **both repos**. Use **logical** Tailwind utilities (`ms-`, `me-`, `text-start`, `justify-self-start`) for RTL, never physical left/right.
- **Two-repo sync:** UI/screen changes must be **byte-identical** in both repos. Workflow: edit MI-Proc, `cp` to myapp (or vice-versa), then `diff -q` to confirm identical. Exceptions: files that legitimately diverged for real-API (myapp `RfqDetailPage`, `listView.ts`, `rfqDetailView.ts`, `statusRules.ts`, flag-driven list) — mirror the *behavior*, not the bytes.
- **Figma is the visual contract; this doc is the behavioral contract.** Reproduce screens **exactly** — layout, spacing, sizing, typography, colors, radius, badges, table/card/modal structure, empty/hover/disabled states, **light + dark**. If pixel-ambiguous, **ask** rather than guess. When Figma and this doc conflict, pause and ask which wins.
- **Efficiency:** prefer a **single-pass loop** over allocating a throwaway array (e.g. count with a `for` loop, not `.filter(...).length`).
- **Seed data:** keep it **rich enough to cover every status/scenario for testing** — the user does NOT want it to match Figma's exact numbers. Bump the STORE_KEY when the seed shape changes (forces re-seed).
- **Shell:** primary shell is **PowerShell 5.1** (no `&&`/`||` chaining, no ternary/null-coalescing) — a Bash tool is also available for POSIX. Prefer absolute paths; a persisted `cd` from a subshell can leak into the next command.

---

## 6. Constraints / Do Not

Written as commands. Do not violate these.

1. **Do NOT make a UI/screen change in only one repo.** UI changes must be byte-identical in **both** MI-Proc (`src/`) and myapp (`myapp-frontend-new/src/`).
2. **Do NOT put real-API integration in MI-Proc.** Real-API work goes **only** in myapp. (Why the two repos exist, and how to sync them without destroying myapp's real-API files → §3 "Two repositories — WHY".)
3. **Do NOT verify types with `vite build`, `tsc --noEmit`, or the root tsconfig.** Use **`npm run build`** / **`tsc -b`** (the root tsconfig checks nothing; CI runs the strict check).
4. **Do NOT introduce mock/fake data or mock APIs "as part of real integration."** Only extend the existing mock where a module is already mock.
5. **Do NOT reveal supplier or buyer identity before award AND PO acceptance.** Buyer sees "Supplier A/B/C"; supplier sees "Verified buyer". (This was a real bug fixed on the Award-confirmed page — CR/VAT/address/contact must read "Revealed on acceptance".)
6. **Do NOT overwrite or mutate an offer version.** Offer history is **append-only**, immutable; always add a new version.
7. **Do NOT allow contact details or company names** in counter-offer / revision messages — validate and block them.
8. **Do NOT touch the auth / onboarding integration** again unless explicitly asked — it is DONE, signed off (2026-08-10) and pushed to GitLab `dev`. Covers register, onboarding, login, SMS login, password reset and logout, in `features/auth`, `features/onboarding`, `platform/http/apiClient`, `platform/auth/authStore` and both session bootstraps. What it does and the rules it enforces → §3 "Auth + Onboarding — the finished real integration".
9. **Do NOT use a PIN** for the post-login "Continue as" buyer/supplier role switch.
10. **Do NOT add "Required documents" to the Orders module** — it is not in the Figma.
11. **Do NOT redesign, "improve", or simplify a Figma screen.** Reproduce it exactly; ask when something is pixel-ambiguous.
12. **Do NOT touch the supplier feature while another session owns it** — leave `src/features/rfq/supplier/`, and the supplier-related parts of `rfqApi.ts`, `types.ts` (`SupplierBidRecord`, `supplierBid`), `rfqQueries.ts` (`saveSupplierBid`), and `router.tsx` (`/supplier/*`) alone. **Another tab is actively building these.**
13. **Do NOT edit shared files (`i18n/locales/en.ts` & `ar.ts`, `deriveNegotiation.ts`, `rfqApi.ts`) while the supplier tab is active** — parallel writes will clobber each other.
14. **Do NOT make the demo seed match Figma's exact numbers** — richness over fidelity for the seed.
15. **Do NOT change the STORE_KEY / seed casually** — bumping it force-re-seeds and wipes users' local data.
16. **Do NOT confuse the two "coming soon"s:** `ComingSoonPage` is a stub for unbuilt routes; the *"Coming soon: split payments, buy now, pay later"* banner inside the payment-terms modal is an **intentional BNPL promo in the Figma** — keep it.
17. **Do NOT run destructive git ops** (reset --hard, force push, checkout that discards) on files another session may be editing.

---

## 7. Important commands

Run from the stated directory.

- **Type-check / build MI-Proc:** from `d:\MI-Proc` → `npx tsc -b`  (0 errors = green).
- **Build myapp:** `cd myapp-frontend-new && npm run build` (or in a subshell: `( cd myapp-frontend-new && npm run build )`).
- **Both must be green before considering a change done.**
- **Confirm two-repo parity:** `diff -q src/<path> myapp-frontend-new/src/<path>`.
- myapp dev deploy = production build served by nginx (not `vite dev`).

---

## 8. In progress / TODO

- **SUPPLIER feature — owned by another open tab/session (do not touch).** MI-Proc `src/features/rfq/supplier/` has 10 files (`AvailableRfqsPage`, `MyBidsPage`, `SubmitBidPage`, `SupplierBidPage`, `SupplierRfqDetailPage`, `WithdrawBidDialog`, `bidRecord.ts`, `components.tsx`, `deriveSupplierBid.ts`, `supplierProfile.ts`) plus a `SupplierBidRecord` type + `saveSupplierBid` hook. As of hand-off it did **not compile** (4 tsc errors in `deriveSupplierBid.ts` / `SupplierBidPage.tsx`) and was **not yet ported to myapp**.
- **myapp build is currently BROKEN:** `rfqApi.ts` imports `SupplierBidRecord` / uses `supplierBid`, which myapp's `types.ts` does not define yet. **The supplier tab is expected to fix this** by porting the type + `supplier/` dir to myapp. Do not fight it.
- **Buyer Negotiation — DONE and audited (2026-08-14).** The accepted state + amber banner, expandable
  "View details", target-total + payment-terms-modal counter form and the "Also negotiating" panel are
  all built, in both repos. Audited against the Figma frames and **Negotiation and Orders Source of
  Truth v1.1**; see `docs/figma-audit.md` → "Screen 3". Two items were deliberately NOT changed and
  need a decision: the **VAT model** (the doc says entered prices are VAT-inclusive; the code and the
  recorded 13-Aug decision say ex-VAT prices with VAT added on top) and the doc's requirement that every
  status row carry an **activity sentence** (no slot for it in the Figma).
- **RFQ real-API integration — ⏸️ PAUSED ~55%, BLOCKED ON BACKEND.** (myapp only; flag `useRealRfq`
  in `platform/config.ts`, default **false**.) Full detail lives in the memory
  `rfq-real-api-contract` — read it first when resuming.
  - **Written & build-green behind the flag (but 0% live-validated — not one real RFQ call has ever
    succeeded):** foundation (`rfqDtos.ts`, `rfqMappers.ts`, `rfqHttpApi.ts`, `useRfqMasterData`);
    Create+Publish (Path A `POST /api/rfq` → `/publish`, branch on **`resultType`**, not `status`);
    List (server pagination); Detail (consumes backend `availableActions`/`fieldVisibility`/
    `primaryActionLabel` **directly** — never derive buttons from the status string);
    Close-early + Cancel (`?reason=` 20–500 as a **query param**); Amend (full-body PATCH, with
    categories/regions **locked** read-only in the wizard).
  - **What stops us — 6 P0 backend items** (full ask: artifact
    `https://claude.ai/code/artifact/25b44847-1ebc-4569-93f6-da81e2bae378`):
    **ENV-1** an RFQ-authorized account (both test logins fail: one is role `Requester` with no org
    claim → **403**; the other → **401**); **ENV-2** seed master-data (`master-data/*` returns
    `200 []`, so we cannot build a valid `categoryIds` body); **ENV-3** confirm base URL (the direct
    api host times out — only the `/api` proxy works); **AMD-1** does `PATCH /amend` **merge or
    replace**; **AMD-2** the exact field set `GET /api/rfq/{id}` returns; **AMD-3** where
    `categoryIds` come from. (`stats/counts` → **404**, not deployed.)
  - **AMD-1 is the one open design decision.** User chose **full-body**, but the evidence leans
    partial/merge (real GET is missing ~16 of the 22 Create fields, verb is PATCH, v1.1 §3.5 shows a
    partial body + "cannot change category/regions"). If the backend **replaces**, a full-body amend
    built from that lean GET would **wipe data**. Resolve empirically with a
    BEFORE → PATCH-one-field → AFTER test before shipping amend.
  - **⚠️ KNOWN BUG, identified & deliberately HELD:** `toDraftFromApiDetail` (`rfqMappers.ts`) reads
    top-level `dto.categoryIds`, which the real `GET /api/rfq/{id}` does **not** return (only
    `lineItems[].categoryId`) → a real amend would **blank the categories**. Fix = reconstruct from
    the distinct `lineItems[].categoryId`. Do not ship amend until this + AMD-1 are resolved.
- **Supplier bid flow screens still to build** (per the domain doc, mirror of buyer): Available RFQs, RFQ detail, Submit bid, My Bids, Your bid (Won/Lost/Submitted), Supplier negotiation (list + thread in 3 states: awaiting-buyer / awaiting-you / closed), Withdraw dialog, Payment-terms modal.

### Buyer bid screens completed this session (both repos, green)
Bids inbox; Compare bids (Line-by-line + Summary, incl. two-footer split — line-by-line sticky "Agreed total · saved · Award & issue N POs", summary in-card "Total · Award N suppliers"); Override modal; Award-confirm modal; Award confirmed (identity-leak fix). Status label corrected to **"Awaiting verification"** (was "Pending verification"). Orders module Figma-matched earlier.

---

## Needs confirmation

- **Compare-bids Summary "Total"** is implemented as `agreedTotal + savedTotal` (pre-negotiation total, e.g. 116,006 vs the line-by-line agreed 112,240). Confirm this is the intended figure.
- **"Columns don't line up" table complaint (all buyer tables) is UNRESOLVED.** The grid templates are verified present in the built CSS and structurally correct (each header row + its data rows share one grid). Root cause not found without a screenshot of the *actual running app* (a hard-refresh to clear a stale build was suggested first). Await a real-render screenshot.
- **myapp un-break + supplier port** is assumed to be handled by the other tab. Confirm before this session touches those files.
- Whether **`CLAUDE.md` should also be copied into `myapp-frontend-new/`** (this file was written only at `d:\MI-Proc\CLAUDE.md`).

---

## Figma → Code Audit Protocol

```
ROLE
You are my senior front-end reviewer for MI-Proc. We are doing a screen-by-screen
(module-by-module) audit of the implemented UI against the original Figma designs.
I will send you Figma screens in batches across many messages. Each batch = one
screen or one module. Never review the whole app at once, and never move to the
next screen until I send it.

STACK FACTS YOU MUST RESPECT (do not "modernize" any of these)
- React 18.3 + TypeScript strict. Type-check is `tsc -b` ONLY — never `vite build`,
  never `tsc --noEmit`.
- Vite 8 + Rolldown. `codeSplitting` build warnings are expected; do not chase them.
- Tailwind CSS v4.3 via @tailwindcss/vite. THERE IS NO tailwind.config theme.
  All tokens live in `src/index.css` (@theme / CSS variables). If a Figma value has
  no token, propose adding it to `src/index.css` first — never hardcode a hex or px.
- RTL is first-class: use logical utilities only (`ms-`, `me-`, `ps-`, `pe-`,
  `text-start`, `text-end`, `start-`, `end-`). Flag ANY `ml-`, `mr-`, `pl-`, `pr-`,
  `left-`, `right-`, `text-left`, `text-right` as a defect.
- Arbitrary grid templates are the house style for layout — match Figma's grid with
  them rather than inventing new wrapper divs.
- TanStack Query 5, "Zero-Fetch" rule: a mutation returns the authoritative record
  and we project it with `setQueryData`. Flag ANY `invalidateQueries` as a defect.
- Zustand 5 for client state (`useTenant`, auth session) with `persist`.
- THIS REPO IS MOCK-FIRST — there is no HTTP client, no axios. Never add one, never
  write a fetch call. Data comes from the mock layer.
  (Note: CLAUDE.md §2 lists axios under the shared stack; that is wrong for this
  repo — it only applies to myapp. Remind me to fix that line.)
- react-hook-form 7 + zod 4 + @hookform/resolvers for every form. The `Field`
  component forwards its ref, so it drops straight into `register()` — use `Field`,
  do not hand-roll inputs.
- i18next 26 / react-i18next 17. EVERY user-visible string must come from
  `platform/i18n/locales/en.ts` AND `ar.ts`. A hardcoded literal in JSX is a defect,
  and a key that exists in en but not ar (or vice versa) is a defect.
- Motion: framer-motion 12 exists, but the 60fps pillar means prefer CSS/GPU-only
  (`motion-safe:animate-card-in`, `mp-press`). Flag any JS-driven animation of
  layout properties, and any animation that ignores `motion-safe:`.
- Fonts: @fontsource-variable/inter for latin. Check the Arabic font path separately.
- xlsx 0.20.3 is pinned to the SheetJS CDN tarball (Create-RFQ Excel import, ~493 kB
  chunk). Never change that dependency or its import style.
- ESLint 10 + typescript-eslint 8, Node 24.15, npm 11.12.

BEFORE YOU REVIEW ANYTHING — do this once, now:
1. Read and summarize back to me:
   - `src/index.css` → the full token set (colors, spacing, radii, shadows,
     typography, breakpoints, custom animations like `animate-card-in`, `mp-press`)
   - the shared UI primitives folder (Field, Button, Card, Table, Modal, etc.) —
     list each component and its variants/props
   - `platform/i18n/locales/en.ts` and `ar.ts` — the key namespacing convention
   - CLAUDE.md — and tell me anything in it that contradicts what I wrote above
2. Tell me which tokens exist and which categories are thin/missing.
3. Write nothing else until I send the first Figma screen.

PROCEDURE FOR EVERY SCREEN I SEND

STEP 1 — READ THE DESIGN
Describe the screen back from the Figma image: layout grid, sections, components,
states shown, and every measurable value (spacing, font size/weight/line-height,
colors, radii, borders, shadows, icon sizes, image ratios). Anything the image
does not clearly show goes under "NEEDS CONFIRMATION" — never guess it.

STEP 2 — FIND THE CODE
Locate the implementation: route/page, components, hooks, mock data, zod schema,
i18n keys. List every file that renders this screen. If you cannot find it, say so
and stop — do not create a new file.

STEP 3 — DIFF (the main deliverable)
A table: Element | Figma | Code | Verdict | Fix. Cover both categories.

  A. STYLING
     - spacing/padding/margin/gap vs the tokens in src/index.css
     - typography: family, size, weight, line-height, letter-spacing, color
     - colors: bg, text, border, and every interactive state — must resolve to a
       token, never a raw hex
     - radius, border width, shadow, opacity
     - sizes: fixed w/h, icon size, avatar size, image aspect ratio
     - layout: grid template vs Figma's grid, alignment, flex/grid structure,
       overlay/z-index
     - responsive behavior at each breakpoint Figma provides
     - RTL: mirrored layout, logical utilities, icon flipping, number/date
       formatting in ar
     - states: default, hover, focus-visible, active, disabled, loading, error,
       empty, selected. Flag any state in Figma but missing in code, and any state
       in code that contradicts Figma.

  B. LOGIC & BEHAVIOR
     - what data each element binds to vs what the mock layer actually provides
     - conditional rendering rules implied by the design
     - navigation targets for every button/link
     - forms: zod schema vs the validation implied by Figma (required, min/max,
       formats, error copy), `Field` usage, disabled/submit conditions
     - mutations: does it follow Zero-Fetch (`setQueryData`) or does it invalidate?
     - query keys: consistent with the rest of the repo?
     - loading / error / empty states, skeletons
     - pagination, sorting, filtering, search behavior
     - side effects: toasts, modals, redirects
     - i18n: every string keyed, en + ar both present, no concatenated sentences
     - accessibility: semantic tags, alt text, aria-*, focus order, keyboard nav,
       focus trap in modals

STEP 4 — VERDICT PER ROW (exactly one)
  ✅ MATCH      identical to Figma
  ⚠️ CLOSE      near but numerically off — state the exact delta
  ❌ MISMATCH   wrong value or wrong behavior
  🚫 MISSING    in Figma, not in code
  ➕ EXTRA      in code, not in Figma
Then a prioritized fix list: Blocker / Major / Minor.

STEP 5 — FIXES (only after I say "apply")
  - Reuse existing tokens and existing UI primitives. No raw hex, no magic px, no
    new one-off component when a primitive covers it.
  - Missing token → propose the addition to `src/index.css` first, then use it.
  - No axios, no fetch, no invalidateQueries, no directional utilities.
  - Add i18n keys to BOTH en.ts and ar.ts in the same edit.
  - Minimal diff. No unrelated refactors, no prop renames, no changes to a shared
    component's public API without telling me first.
  - After applying: run `tsc -b` and the linter, show me the diff per file, then
    re-run STEP 3 briefly to confirm every row is ✅.

HARD RULES
- Never assume. Ambiguous in the screenshot → ask me.
- Pixel-accuracy matters. "Looks similar" is a fail. Report exact numbers.
- Consistency with the existing design system beats a literal one-off value.
- If a component appears on several screens, list which other screens your fix
  touches before you touch it.
- Maintain `docs/figma-audit.md`: one appended section per screen with the diff
  table and final status. Never overwrite earlier sections.
- Answer in English. Concise in prose, detailed in the tables.

Confirm you understand, do the pre-review read, then wait for my first screen.
```

### Send this with EVERY screen

```
Screen: <name> — route: <path>
Figma: [attach the frames — include all states + breakpoints + the ar/RTL frame]
Notes: <anything the image can't show: interactions, mock data shape, edge cases>

Run STEP 1 → STEP 4 for this screen only. No file edits yet.
Give me the diff table, the prioritized fix list, and NEEDS CONFIRMATION.
```

When the analysis looks right:

```
apply — Blockers and Majors only. Show the diff per file, run tsc -b, then re-verify.
```

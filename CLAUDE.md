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
| Ships to | **GitHub** | **GitLab `dev`** → Cloud Run `https://dev-miproc.mi-mony.com` (backend `https://dev-api-miproc.mi-mony.com`) — moved 2026-08-18 from the old `*.mitechnologies.org` pair |
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
| **RFQ (buyer lifecycle)** | ✅ **Create / update / publish / amend / cancel WIRED to `/api/rfq`** (2026-08-21) and live-verified end to end. Path chosen by KYB status; the draft wizard serves pending orgs. See "RFQ real-API — CONTRACT SETTLED & INTEGRATED". |
| **Buyer + Supplier dashboards** | ✅ **FRONTEND COMPLETE** behind `useRealDashboard`, build-green. **Both** endpoints live-verified. Every field the API publishes is consumed; the remaining gaps are API-side. See §8 "Dashboard real-API integration". |
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

- **Integration order after RFQ (Marina, 2026-08-21): BIDS → ORDERS → NEGOTIATIONS.** All three are
  deployed — see "API SURFACE INVENTORY" above, which corrects the "100% mock, no backend contract"
  note that stood until today.
  - **BIDS is owned by ANOTHER TAB — do NOT start it.** Leave `features/rfq/supplier/` and anything
    under `/api/bids` alone until Marina confirms that tab is finished. When she does, the ask is the
    WHOLE flow wired to the real contract and **tested end to end**, not one screen build-green.
  - Orders and Negotiations follow, in that order.
- **SUPPLIER feature — owned by another open tab/session (do not touch).** MI-Proc `src/features/rfq/supplier/` has 10 files (`AvailableRfqsPage`, `MyBidsPage`, `SubmitBidPage`, `SupplierBidPage`, `SupplierRfqDetailPage`, `WithdrawBidDialog`, `bidRecord.ts`, `components.tsx`, `deriveSupplierBid.ts`, `supplierProfile.ts`) plus a `SupplierBidRecord` type + `saveSupplierBid` hook. As of hand-off it did **not compile** (4 tsc errors in `deriveSupplierBid.ts` / `SupplierBidPage.tsx`) and was **not yet ported to myapp**.
- ~~**myapp build is currently BROKEN**~~ — **RESOLVED.** Verified green 2026-08-19: `tsc -b` clean in
  both repos, `npm run build` passes, vitest **83/83**. The supplier tab landed the `SupplierBidRecord`
  type + `supplier/` port as expected.
- **Buyer Negotiation — DONE and audited (2026-08-14).** The accepted state + amber banner, expandable
  "View details", target-total + payment-terms-modal counter form and the "Also negotiating" panel are
  all built, in both repos. Audited against the Figma frames and **Negotiation and Orders Source of
  Truth v1.1**; see `docs/figma-audit.md` → "Screen 3". Two items were deliberately NOT changed and
  need a decision: the **VAT model** (the doc says entered prices are VAT-inclusive; the code and the
  recorded 13-Aug decision say ex-VAT prices with VAT added on top) and the doc's requirement that every
  status row carry an **activity sentence** (no slot for it in the Figma).
- **RFQ real-API integration — SUPERSEDED by "RFQ real-API — INTEGRATION STATE" below; the notes in this bullet describe the abandoned Path-A attempt and are kept only as history.** ⏸️ (was: PAUSED ~55%, BLOCKED ON BACKEND.) (myapp only; flag `useRealRfq`
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

### RFQ real-API — VERIFIED ENDPOINT MAP (live-tested 2026-08-18/19/20)

Everything below was established by running the deployed dev API, not by reading the docs. The docs
are wrong in enough places (see `docs/rfq-api-doc-review.md`) that **the wire is the only contract we
trust**. Full evidence: `docs/rfq-api-integration-analysis.md`.

**The create path we must build is the WIZARD (`/api/rfq-draft/*`), not Path A (`POST /api/rfq`).**
Our current `rfqHttpApi.ts` targets Path A, which is the broken controller — that code is aimed at
endpoints that do not work.

#### ✅ WORKS — integrate against these only

| Endpoint | Verified behaviour |
|---|---|
| `POST /api/auth/login` | 200; sets HttpOnly `access_token` (path `/`) + `refresh_token` (path `/api/auth/refresh`). Body `token` is `""` BY DESIGN — web is cookie-first |
| `GET /api/auth/me` | 200; the three gates `role` / `kind` / `status` |
| `GET /api/rfq/master-data/{categories,regions,units,certifications}` | 200 — 17 / 13 / 20 / 8 rows |
| `GET /api/rfq-draft/categories` | 200 — byte-identical to `master-data/categories`; prefer the master-data one |
| **`POST /api/rfq-draft/create`** | **201** — the real create route. **Ignores its request body** (title comes back `null`) |
| `POST /api/rfq-draft/{id}/step1` | 200 — **persists 100%** |
| `POST /api/rfq-draft/{id}/step2` | 200 — **persists 100%** |
| `POST /api/rfq-draft/{id}/step4` | 200 — **persists 100%, but ONLY with `visibilityType: 2`** (see below) |
| `GET /api/rfq-draft/{id}` | 200 — `currentStep`, `status`, `step1Data`…`step4Data` |
| `POST /api/rfq-draft/{id}/publish` | 200 — RFQ goes `Live` |
| `GET /api/rfq` | 200 — paging `{pageNumber,pageSize,totalCount,totalPages,hasNextPage,hasPreviousPage}`; `status=` filter works |
| `GET /api/rfq/{id}` | 200 — carries `availableActions` / `fieldVisibility` / `primaryActionLabel` |
| `GET /api/rfq/{unknown}` | 404 — correct |
| `DELETE /api/rfq/{id}?reason=` | 200 → `Cancelled`; reason 20–500 chars enforced (fixed 2026-08-19) |

#### 🔴 BROKEN — DO NOT INTEGRATE. Waiting on Backend; re-test before wiring.

| Endpoint | Status | Why it is dangerous / blocking |
|---|---|---|
| `POST /api/rfq` (Path A quick create) | **500 — BUT IT CREATES THE RECORD** | A retry on 500 duplicates the RFQ. Confirmed twice. **Never call this.** |
| `PATCH /api/rfq/{id}/amend` | **500** on every body shape (empty, title-only, full 22-field) | Blocks the whole Amend UI |
| `POST /api/rfq/{id}/close-early` | **500** | RFQ stays `Live` |
| `GET /api/rfq/stats/counts` | **404** — not deployed | Filter-chip badges have no source |
| `POST /api/rfq-draft` | **404** — the documented create route | Use `/rfq-draft/create` |
| `PUT /api/rfq/{id}` | 404 / untestable | No working update path for a draft |
| `POST /api/rfq/{id}/upload-items`, `GET /api/rfq/documents/{id}/download` | untested | No working path to exercise them |

#### 🟠 DATA LOSS — endpoint returns 200 but the data is discarded

1. **Step 3 persists NOTHING.** `POST /step3` → 200 and `currentStep` advances to 3, but `step3Data`
   is `null` on read-back — every time, including a fully valid body with
   `requiredDocuments: [{documentName, documentPath}]`. Certifications, warranty,
   requirements/criteria and documents are all lost. **Do not promise the user this is saved.**
2. **`visibilityType: 0` persists NOTHING.** `step4` with `0` returns 200 and stores nothing —
   `isAnonymous` included — yet publish still succeeds. **Always send `visibilityType: 2` with at
   least one region.**
3. **Publish drops wizard data.** On the published RFQ, `deliveryAddress` is `""`,
   `paymentMilestones` is `[]`, `estimatedBudget` and `categoryIds` are absent, `publishedAt` is
   `null` despite `status: "Live"`, and `matchedSuppliersCount` is `0` where publish reported `3`.

#### ⚠️ Contract facts that contradict the documentation

- Create/publish return **`status`**, not `resultType` (v1.1 guide is wrong here; v1.0 was right).
- **`actionState` does not exist.** Detail returns `availableActions` / `fieldVisibility` /
  `primaryActionLabel`.
- **`categoryIds` is ABSENT from `GET /api/rfq/{id}`** — the amend blank-out risk is real.
- Errors are **ASP.NET ProblemDetails** (`{title,status}` / `{title,status,errors{}}`), never the
  documented `{error,message,statusCode}`.
- `estimatedBudget` is **optional** — `0` and `-5` both pass. The guide's "budget > 0" rule is false.
- **`Negotiating` is not a valid `status` filter** — returns 400 `"The value 'Negotiating' is not valid."`
- Two numbering schemes coexist: wizard → `RFQ-0031`, Path A → `RFQ-2026-0019`.
- Milestone shape differs per controller: wizard writes `{description, percentage, condition,
  sequence, amount}` with `condition: "OnGoodsReceipt"`; detail reads `triggerType`.
- `unitOfMeasure`, `targetedRegions` and milestone `condition` are **not validated** against master
  data — arbitrary strings are accepted and stored.
- Seeded catalogue has a **duplicate category name**: `"Steel Reinforcement"` under two GUIDs.

#### Frontend gaps this creates (work required before the wizard can be wired)

- **No `rfq-draft` client at all** — zero references in `src/`. The wizard service is unwritten.
- **No unit resolver and no region resolver.** `useRfqMasterData` has categories only; the wizard
  needs `unitOfMeasurementId` and `targetedRegionIds` as **GUIDs**, but our draft holds names
  (`unit: 'bags'`, `regions: ['Riyadh']`). `'bags'` has no catalogue equivalent at all.
- **Milestone mapping**: ours is `{trigger, percent}`; backend wants
  `{description, percentage, condition, sequence, amount}` and `on_delivery` maps to
  **`OnGoodsReceipt`**, not `OnDelivery`.
- Our wizard's step 3 mixes compliance (backend step3) with supplier targeting (backend step4) —
  the two must be split.
- Our line items carry no `unitPrice`; the backend accepts it on step1.

### RFQ real-API — CONTRACT SETTLED & INTEGRATED (2026-08-21)

**Backend ruled `/api/rfq` the contract** (one `Rfq` row, one numbering scheme, no parallel draft
document). Its write surface was 500 all week and is now **FIXED**. Everything below was verified by
running the deployed API, not by reading the guide.

#### The two paths — chosen by KYB status

`useRfqWizard` reads `GET /api/profile/status` (via `useOrgVerification`) and branches:

| Org status | Path |
|---|---|
| **Verified** | `POST /api/rfq` → `PUT /api/rfq/{id}` → `POST /api/rfq/{id}/publish` |
| **Pending / other** | `POST /rfq-draft/create` → `step1` → `step2` → `step4` → `publish` |

The branch waits for the status to resolve (`verificationLoading` blocks submit with a toast).
Creating against the wrong family would put the RFQ in the wrong store entirely.

#### AMEND — REPLACE semantics, proven

`PATCH /api/rfq/{id}/amend` **replaces the record**. Amending with only the required fields wiped 13
others: the three `allow*` flags → false, `min/maxItemsPerBid` → null, `paymentTermsNotes` /
`requirementsAndCriteria` / `requiredCertifications` / `minimumWarranty` / `invitedSupplierIds` →
null, `paymentMilestones` → `[]`, and **`targetedRegions` "Riyadh,Makkah" → "All"** — the audience
silently widened. Line items are destroyed and recreated with new GUIDs (accepted, product decision).

So `toAmendRequest` builds a COMPLETE body from a **freshly fetched** detail. This is only safe
because the detail response now returns the full editable field set (it was missing 12 of 22 before).

#### Field rules measured on the wire

| Field | Rule |
|---|---|
| `minItemsPerBid` / `maxItemsPerBid` | Partial bids **OFF** → send `null` (the server's own default; it ignores them). **ON** → required and range-checked `1 ≤ min ≤ max ≤ lineItemCount`. **`0` is rejected** — our "0 = all" convention must expand to the real count. |
| `targetedRegions` | CSV of region **names** (`"Riyadh,Makkah"`). Empty pick → send the literal **`"All"`**. **Never omit** — omitting rewrites it to "All". |
| `paymentMilestones` | Write shape is `{triggerType, percentageOfBudget, description, sequence}`. **`description` is REQUIRED** — without it: 400 *"Each payment milestone must have a Description"*. The old two-field assumption was wrong. |
| Milestone `triggerType` | The backend's own PlanA generator emits **`OnOrderConfirmation`, `OnGoodsReceipt`, `After14DayInspection`** — NOT the guide's `OnDelivery`/`OnInspection`. Our maps use the observed spellings. |
| `matchedSuppliersCount` | Plural, on both publish and detail. It was renamed from `matchedSupplierCount` mid-week without notice. |

#### End-to-end live validation (2026-08-21)

`POST /api/rfq` 201 `DraftSaved` → `GET` (min/max null, regions, certs, warranty all persisted) →
`PUT` full body 200 (nothing lost) → `publish` 200 `RfqPublished` *"published to 3 matched
suppliers"*, `publishedAt` set, milestones present → **full-body `PATCH /amend` 200 with every
non-bookkeeping field preserved**, `amendmentCount` 0→1 → `DELETE ?reason=` 200 `Cancelled`.
A Custom-plan create with the new milestone shape also returned 201 and stored both rows.

#### Still open

| Item | State |
|---|---|
| **Pending path never exercised** | Every test account is `Verified`. The draft branch has never run for a genuinely pending org, so it is unproven that `/rfq-draft/publish` parks as `AwaitingVerification` rather than going Live. **Needs a Pending account.** |
| `status` enum | Only `"Verified"` ever observed. `Pending` / `Rejected` come from the docs. An unrecognised value maps to `undefined` → falls to the draft path (safe). |
| `GET /api/rfq/stats/counts` | **404**, not deployed. Filter-chip counts have no source. Out of scope per Marina. |
| step3 (compliance) on the draft path | Returns 200, persists nothing. Certifications / warranty / criteria stay local for pending orgs. |
| `"All"` semantics | Round-trips faithfully, but whether it means *every* region for supplier matching is unconfirmed. |
| Excel import / doc download | Untested, no working path. |

### RFQ real-API — INTEGRATION STATE (2026-08-20)

**The buyer create-and-publish flow is now WIRED to the real API**, against the wizard route family
only. `npx tsc -b` clean, `npx eslint` clean, `npx vitest run` **119 tests / 8 files** green.
Flag `useRealRfq` is still **false** — flip it per environment to switch the flow on.

#### The proven flow (this is what we build against)

    POST /api/auth/login                 →  HttpOnly cookies
    GET  /api/auth/me                    →  gate on role + kind + status
    GET  /api/rfq/master-data/*          →  categories / regions / units / certifications
    POST /api/rfq-draft/create           →  201, blank draft (body is IGNORED)
    POST /api/rfq-draft/{id}/step1       →  title, categoryIds, budget, lineItems
    POST /api/rfq-draft/{id}/step2       →  address, dates, paymentMilestones
    POST /api/rfq-draft/{id}/step4       →  visibility, targeting, isAnonymous
    POST /api/rfq-draft/{id}/publish     →  RFQ goes Live
    GET  /api/rfq  ·  GET /api/rfq/{id}  ·  DELETE /api/rfq/{id}?reason=

Every call above was run end to end on deployed dev, with a GET after each step diffed field by field
against what was sent. **step3 is never called** — it returns 200 and persists nothing, and publish
does not require it (verified: create → step1 → step2 → step4 → publish succeeds without it).

#### Integration decisions taken (Marina approved 2026-08-20)

1. **Compliance (step3) is collected but not sent.** Certifications, warranty and acceptance criteria
   stay in the local draft; the RFQ-level `description` carries the acceptance criteria so it is not
   lost entirely. Revisit the moment step3 persists.
2. **"All regions" is expressed as `visibilityType: 2` + every region id.** The natural fit,
   `visibilityType: 0`, returns 200 and stores NOTHING — `isAnonymous` included. Targeting all
   thirteen regions is the only way to say "everyone" and have the server keep it.
3. **The detail screen renders API truth, not the local draft.** Delivery address, milestones and
   budget will therefore read blank on a published RFQ until the backend stops dropping them.
   Showing local values the server does not have is exactly how the amend blank-out bug was born.

#### What was built (myapp only — MI-Proc stays mock)

| File | Purpose |
|---|---|
| `services/rfqDraftDtos.ts` | **new** — wizard wire shapes, `VISIBILITY`, milestone `condition` |
| `services/rfqDraftMappers.ts` | **new** — pure `toStep1/2/4Request`, `toDraftMilestones`, unresolved-name guards |
| `services/rfqDraftHttpApi.ts` | **new** — create / step1 / step2 / step4 / get / publish |
| `services/rfqDraftMappers.test.ts` | **new** — 22 tests pinning the contract facts |
| `services/rfqHttpApi.ts` | **rewritten** — broken methods DELETED; only list, detail, cancel, uploadItems remain |
| `hooks/useRfqMasterData.ts` | `useUnitIdResolver`, `useRegionIdResolver`, `useAllRegionIds` |
| `hooks/rfqQueries.ts` | removed the five dead Path-A hooks; `useCancelRfqReal` kept |
| `create/useRfqWizard.ts` | real branch rewritten onto the wizard; amend refuses with a toast |
| `i18n en.ts / ar.ts` | `unitUnresolved`, `regionUnresolved`, `amendUnavailable` |

**Deliberately deleted, not stubbed:** `POST /api/rfq`, `PUT /api/rfq/{id}`, `PATCH /amend`,
`POST /close-early`. `POST /api/rfq` in particular 500s *after committing*, so a retry duplicates a
buyer's RFQ — it must stay unreachable from our code.

**Unit vocabulary:** `UNIT_ALIASES` maps 13 of our 14 i18n units onto the catalogue. `bags` has no
equivalent and deliberately resolves to undefined — the pre-flight guard blocks the submit and names
it, rather than filing the line under a unit the buyer did not choose.

#### Still pending — blocked on Backend

| Blocked | Needs |
|---|---|
| **Amend UI** | `PATCH /amend` returns 500 for every body. Also still unknown: **merge vs replace** — untestable until it responds |
| **Close early** | 500 |
| **Compliance step** | step3 persists nothing |
| **Published RFQ completeness** | publish drops `deliveryAddress`, `paymentMilestones`, `estimatedBudget`; `publishedAt` null despite Live; `matchedSuppliersCount` disagrees with publish |
| **Filter-chip counts** | `stats/counts` 404 |
| **Excel import / doc download** | untested, no working path |
| **Milestone enum** | `condition` is unvalidated free text; three spellings exist in the DB. Our `OnInstallation` / `OnInspection` mappings are UNVERIFIED guesses from the guide |

**Re-test before wiring any of these** — the failure set has changed twice already (cancel and the
read endpoints were fixed mid-week). Evidence and method: `docs/rfq-api-integration-analysis.md`,
`docs/rfq-api-doc-review.md`.

### API SURFACE INVENTORY — from the published OpenAPI doc (2026-08-21)

`GET https://dev-api-miproc.mi-mony.com/swagger/v1/swagger.json` returns the **full spec, 103
paths**, unauthenticated-readable. This supersedes every "no backend contract yet" note below: the
bid, negotiation and order modules are **deployed**. Earlier probing missed them because it guessed
`/api/rfq/available`, `/api/supplier/*` and `/api/quotations` — the real prefix is **`/api/bids`**.

**Read the swagger doc before declaring an endpoint missing.** Two sessions burned time probing
route names that never existed while the real ones sat in the spec.

#### Supplier bidding — EXISTS (was recorded as "no endpoint deployed")

| Endpoint | Purpose |
|---|---|
| `GET /api/bids/available-rfqs` | **Available RFQs list.** Live-verified 200 |
| `GET /api/bids/available-rfqs/{rfqId}` | Supplier's RFQ detail (anonymised). Live-verified 200 |
| `GET /api/bids/my-bids` | My Bids list |
| `GET /api/bids/rfq/{rfqId}/my-bid` | The supplier's own bid on one RFQ |
| `POST /api/bids/rfq/{rfqId}/draft` · `/submit` · `/decline` | Save / submit / decline |
| `POST /api/bids/{quotationId}/withdraw` | Withdraw |
| `GET,POST /api/bids/certificates` · `DELETE /{certificateId}` | Saved certificates |
| `POST /api/bids/{quotationId}/attachments` · `/from-saved` · `DELETE /api/bids/attachments/{id}` | Bid attachments |

#### Buyer bid review — EXISTS

`GET /api/buyer/bids` · `POST /api/buyer/bids/compare` · `POST /api/buyer/bids/award` ·
`POST /api/buyer/bids/award/preview` · `GET /api/buyer/bids/rfq/{rfqId}/bidders`

#### Negotiations — EXISTS

`GET,POST /api/negotiations` · `GET /api/negotiations/{threadId}` · `/counters` · `/messages` ·
`/accept` · `/accept-and-issue` · `/end`

#### Orders — EXISTS

`GET,POST /api/orders` · `GET /api/orders/{orderId}` · `/accept` · `/decline` · `/cancel` ·
`/accept-cancel` · `/shipments` · `/goods-receipts` · `/delivered`

#### Also present and unused by us

`GET /api/admin/organization/status` · `POST,GET /api/admin/users` (+ `/batch`) ·
`GET /api/dashboard/super-admin/*` (+ `PUT /verification-decision`) ·
`POST /api/rfq-draft/{id}/auto-save` · `GET /api/rfq-draft/list` · `POST /api/rfq-draft/addresses`
(+ `PUT,DELETE /{id}`, `GET /my-addresses`) · `POST /api/rfq/{rfqId}/documents` ·
`GET /documents/rfq/{rfqId}/{folder}/{fileName}` · `POST /api/profile/apply` ·
`GET,PUT /api/profile/communication-preferences` · `POST /api/demo/auth/login`.

#### `GET /api/bids/available-rfqs` — measured contract

Envelope: `{ items, total, browseAllCount, matchedCount, declinedCount }` — the three counts are
the tab badges. Query: `supplierId`, `tab` (**`BrowseAll` | `Matched` | `Declined`**), `search`,
`category`, `deliveryRegion`, `closingBefore`, `sort`, `pageNumber`, `pageSize`.
`MyBidsTab` = `All | Draft | Bidding | Negotiating | Won | Lost`.

Row shape (captured live):
```
rfqId, number, title, buyerLabel ("Verified buyer · Electrical Equipment · Makkah"),
category, buyerCity, itemCount, totalUnits, deliverTo, matchReason ("Open to bid"),
closingDate, daysToClose, closingSoon, liveChip ("Live"), closedChip, declinedAt, myBid
```
Anonymity is enforced server-side — `buyerLabel` is the only buyer identity on the row. Detail adds
`status, buyerCategory, identityNotice, requiredDeliveryDate, deliveryAddress, paymentPlan,
paymentTermsNotes, rfqType, allowPartialDelivery, allowPartialBids, minItemsPerBid,
requirementsAndCriteria, requiredCertifications, items`.

⚠️ **Two defects measured on 2026-08-21:**
1. **`supplierId` is required but IGNORED.** Omitting it returns `400 "Supplier id is required."`;
   passing `00000000-0000-0000-0000-000000000001` returns the **same 16 rows** as the real id. The
   list is therefore not scoped to the calling supplier — raise with Backend before trusting it.
2. **`tab=Matched` returns 0** while `BrowseAll` returns 16, so supplier↔category matching is not
   populated. The Matched tab has no data.

`myBid` has been `null` on every row observed (no bids exist yet), so its shape is **unvalidated** —
do not map it from the schema alone.

### Dashboard real-API integration — ✅ FRONTEND COMPLETE, partial by API contract (2026-08-19)

**myapp only** (Constraint #2 — MI-Proc's dashboard stays 100% mock). Flag **`useRealDashboard`** in
`platform/config.ts` — **now `true`** (turned on 2026-08-19). Both dashboards are **finished on the
frontend side**: every field the API publishes is consumed, localised and rendered. What is still
missing is missing in the API, not in the client.

⚠️ **`loadRuntimeConfig()` does NOT fetch `/config.json`** — it returns `DEV_DEFAULTS`, so every flag
in `platform/config.ts` is a **compile-time constant**. A deployed build cannot be toggled without a
rebuild, and *"the real API isn't showing"* is almost always this flag rather than the integration.
Wiring the `/config.json` fetch is the obvious follow-up.

**Scope rule (product decision, 19 Aug):** each dashboard is built from **its own endpoint and
nothing else**. No companion call to `/auth/me`, no legacy `/api/dashboard`, no other profile
endpoint. Fields the payload omits render **empty**; the backend completes the response later. Do
not "fix" a gap here by adding a second request.
This also turned out to be protective: `/api/dashboard` (legacy) appears **tenant-unscoped** — called
with the supplier token it returned another party's sourcing figures (`activeRfqs: 6`) for an account
with zero RFQs. We do not read it.

**Files.** New: `features/dashboard/services/dashboardDtos.ts` · `dashboardHttpApi.ts` ·
`dashboardMappers.ts` · `dashboardMappers.test.ts` · `features/dashboard/hooks/dashboardQueries.ts`.
Modified: `useBuyerDashboard.ts`, `useSupplierDashboard.ts` (mock body renamed `useMock*`, new
flag-driven wrapper exported), `platform/config.ts`, and `BuyerDashboardPage.tsx` (the one UI change,
mirrored byte-identically into MI-Proc).
Both seams return the **same `BuyerDashboardData`**, so the pages are mode-agnostic; the two
`use*Dashboard.ts` files legitimately diverge from MI-Proc (the real-API exception).

**Endpoints — both live-verified.** `GET /api/dashboard/buyer` and `GET /api/dashboard/supplier`,
each `200`, cookie *or* bearer. Cross-role access is **403 with an empty `text/html` body in BOTH
directions** — never ProblemDetails, so the error parser must not read `data.title` on 401/403.
(Application errors *do* use ProblemDetails: `{"title":"…","status":500}`.)

#### ✅ Completed — Buyer dashboard
| Element | Source |
|---|---|
| Greeting + user name | `user.fullName` |
| Company name + address | `user.companyName` / `companyAddress` |
| Account-type chip | `user.accountType` → localised via `onboarding.company.*` |
| Seat status | `user.accountStatus` |
| Compliance & documents card | `user.documents[]` → localised kind + status |
| **KYB banner + verified/pending/rejected page state** | **derived from `user.documents[].status`** — no localStorage, no mock, no auth session |
| My RFQs rows — categories, amount, status chip | `rfqs[]` (drafts **and** published) |
| Bids-to-review tile | `counts.bidsToReview` |
| Negotiating pipeline segment | `counts.currentNegotiating` |
| Track-order card | `order` — mapped, but never yet non-null (see limitations) |

#### ✅ Completed — Supplier dashboard
Identical treatment through the same shared mappers: greeting, company name/address, account-type
chip (`"Supplier"` → `onboarding.company.seller`), seat status, compliance documents, and the
**Active bids** tile from `counts.activeBids` — the one count whose semantics match our tile exactly.
My Bids rows map `bids[]` (categories, amount, status, submission date), with the backend's `awarded`
translated to our `won`.

#### 🔧 Fixed by Backend during this integration (verified live)
1. Profile block was null on both dashboards → **now populated on both**.
2. `rfqs[]` returned drafts only → **published RFQs now appear**.
3. `GET /api/rfq` + `/api/rfq/{id}` 500'd on every input → **now `200`**, and each dashboard row id
   resolves cleanly on exactly one of `/api/rfq/{id}` or `/api/rfq-draft/{id}`.

#### ⚠️ Remaining API gaps — BACKEND-side, frontend needs no change when they land
| Gap | Effect on screen |
|---|---|
| **`rfqs[]` still has no `title` and no `reference`** — although `/api/rfq` now returns `number` + `title`, so this is purely a projection gap. **Top ask.** | Rows read "Untitled RFQ"; the categories string stands in for the reference |
| No `isDraft` discriminator on `rfqs[].id` | Rows non-navigating (they are non-navigating in the mock too, so not a regression) |
| No live-RFQ count | "Active RFQs" tile shows **"—"** |
| `avgRfqToAward` measures publish→**closing**, not time-to-award | Rendered only when > 0; reads "—" today |
| `bidsToReview` = all `Bidding` quotations, not "unopened" | Shown; semantics differ — recorded, not hidden |
| No per-status counts | **All 5 segments render on both dashboards, but only buyer "Negotiating" has a source** (`counts.currentNegotiating`). Open / Bidding / Awarded / Completed, and all 5 supplier bid states, are pinned at **0 regardless of the true figure** — placeholders holding the strip's shape (product decision, 19 Aug, overriding the earlier omit-what-we-cannot-measure rule). **Do not read those zeros as data.** |
| No negotiation / read state | "Action Required" empty on both dashboards |
| No suggestions data | "Suggested suppliers/RFQs" empty |
| `order` carries only `id`/`status`/`dueDate` — no PO number, no supplier label | Track-order card renders without them (and `order` has always been null) |
| Supplier `totalRfqs` ≠ "available to bid on"; no `winRate` | Two supplier tiles show **"—"** |
| Supplier `bids[]` has no line-item counts | Row subtitle falls back to the submission date |
| `categories` is a comma-joined **English** string, not ids | Cannot be localised for Arabic |
| Negative budget served (`amount: -5`); same value serialises as `500000.0000`/`500000.00`/`500000` | Rendered as "SAR —" |
| `documents[].id` is `null` (rows are inferred) and `url` is a **`gs://` URI**, not HTTPS | Documents cannot be opened from the browser as-is |
| **`GET /api/rfq` → 403 for a supplier**; no available-RFQs endpoint exists (probed 8 candidates, all 404) | Supplier "Available RFQs" has no data source — **Backend is implementing this** |
| ⚠️ **`GET /api/dashboard` (legacy) appears tenant-unscoped** | Suspected cross-tenant exposure — raise with Backend; we do not read it |
| 401/403 return empty `text/html`, not ProblemDetails | Error parser must not assume a JSON body |
| Cold start ~13s (12.7s / 14.5s measured; 0.5s warm) | Needs a min-instance on dev |

#### 📝 Temporary frontend compensations — STILL REQUIRED
Each is marked `TEMPORARY` in `dashboardMappers.ts`. **None could be removed yet**, because the
fields that would retire them have not arrived:
- **Row title** → `rfq.list.untitled`, and **the categories string stands in for the reference**.
  Delete both the day `rfqs[]` gains `title` + `reference`.
- **Negative / null budget renders "SAR —"** (the rule the mock applies to `rfq.budget`).
- **`deleted` → `cancelled`** (a buyer must never read "deleted"); **`closed` → `expired`** (no stored
  equivalent); unknown status → `draft`. Supplier **`awarded` → `won`**.
- **Order stage mapping is UNVERIFIED** — `order` has never been non-null. `acknowledged` is *assumed*
  to be our "accepted by supplier"; nothing maps to our `in_transit`.
- **`currency` assumed SAR** (`formatSar`); a non-SAR value would need a different formatter.

#### 📝 Assumptions & design decisions
- **Unmeasured KPI tiles show "—", never 0** — "Active RFQs", "Avg RFQ-to-Award", supplier
  "Available RFQs" and "Win rate" have no source, and a 0 would assert something unmeasured.
  **The pipeline strips are the deliberate exception:** the user asked for all five segments back
  (19 Aug), so they render with placeholder zeros rather than being dropped. The concern was raised
  and overruled — recorded here so the zeros are never mistaken for measurements.
- **Enums are localised, never printed raw**: `accountType` → `onboarding.company.*`; document `kind`
  → `org.profile.docs.type.*` (with `NationalIdCertificate` borrowing `auth.nationalId`); document
  `status` (`"VERIFIED"`) → `org.profile.docs.status.valid`. Unrecognised values fall back to the raw
  string — a stray enum beats a document mislabelled as something it is not.
- **No new i18n keys were added.** Every label reuses a key already present in both `en.ts` and
  `ar.ts`, so the shared locale files were left untouched (Constraint #13).
- **`BuyerDashboardPage` row subtitle joins non-empty parts** (`[ref, meta].filter(Boolean)`) so a
  published row — which has no bid count, hence no `meta` — does not render a dangling " · ". This is
  the **one UI change**, applied byte-identically in **both** repos.
- Mapping runs **outside `queryFn`** so the cache holds raw wire data and a language switch re-labels
  from cache instead of re-fetching. `staleTime` 30s (no cache headers; cold starts are expensive).
- **KYB verification now comes from `GET /api/auth/me` (2026-08-21, Marina).** The backend serves the
  decision on that response's `status` field, so the separate `GET /api/profile/status` request was
  retired: `features/verification/services/profileStatusApi.ts` became `orgStatusApi.ts`, reading
  `me()` from `features/auth/api`. Both endpoints were captured on the same account the day of the
  move and AGREE (`"status":"Verified"` from each) — the earlier note below, that the two answer
  different questions, is superseded. If they are ever seen to disagree, re-examine this first.
  `tenantStatus` is NOT this value; it is seat membership (`PendingAssignment|Active|Suspended`).
  Everything else is unchanged: one query for the whole app, `undefined` for an unrecognised value,
  and a failed request propagates rather than reading as "pending".
- **KYB verification comes from `GET /api/profile/status` (2026-08-19, supersedes the derivation
  below).** That endpoint is the authoritative source and is called after login; it returns
  `{"status":"Verified"}` — live-verified `200` on **both** the buyer and supplier accounts.
  Wired in `features/verification/services/profileStatusApi.ts` (+ 6 unit tests) and consumed by
  `useOrgVerification`, so every screen — header pill, nav gating, both dashboards, Organisation
  pages, RFQ create-gate — resolves through one query. `Pending`/`Rejected` come from the documented
  set and have **not** been observed live; an unrecognised value maps to `undefined` and the caller
  falls back rather than asserting a state the backend did not send, and a failed request propagates
  rather than silently reading as "pending".
  **NOT read from the login / `/auth/me` payload** — that `status` answers a different question (the
  account's own state, not the org's KYB decision).
  ~~It is **derived from `user.documents[].status`**~~ — **REMOVED.** `toVerification()` and the
  mappers' `verification` field are gone, so there is exactly one source; the historical rationale
  is kept below only to explain why the dashboard payload alone was never enough.
  ~~because the dashboard payload carries **no org-level KYB field** —~~
  confirmed live on both endpoints (`user` has only `accountStatus`, the tenant *seat* status
  `PendingAssignment|Active|Suspended`, which is not KYB). The API contract states that an inferred
  document row is `"VERIFIED"` when onboarding `Status` is `Completed`, else `"PENDING"`, so those
  document statuses **are** the super-admin's decision as reported by this endpoint. Rules (mirroring
  the verification store's own `deriveStatus`): any `REJECTED` → `rejected`; all `VERIFIED` →
  `verified`; otherwise `pending`; **no documents → `undefined`** ("cannot tell" is not "pending").
  Case-insensitive, since the API sends uppercase and our vocabulary is lowercase.
  `BuyerDashboardData.verification` carries it; both pages resolve
  `data?.verification ?? record?.status ?? 'pending'`, so **the real flow no longer depends on the
  localStorage `useOrgVerification` record** — the mock seam leaves the field undefined and mock mode
  behaves exactly as before.
  **The status is ALSO overlaid at the single source** (myapp `features/verification/
  verificationQueries.ts` → `useOrgVerification`, via `useRealOrgVerification()` in
  `dashboardQueries.ts`), because the org's KYB state is read in four more places that would
  otherwise keep showing the mock's "pending" while the dashboard said "verified": the **portal
  header pill** and its `requiresVerification` **nav gating** (`PortalShell`), the **Organisation
  overview/profile** pages, and the **RFQ wizard's create-gate**. That hook picks the endpoint from
  `user.portal` and reuses the dashboard pages' query keys, so it costs **no extra request**. Only
  the *status* is overlaid — per-document review rows (numbers, rejection reasons, resubmit) have no
  equivalent on the dashboard payload and stay local. myapp's `verificationQueries.ts` therefore
  diverges from MI-Proc's by design (the real-API exception).
  **No flash-of-pending on login:** `useOrgVerification` reports `isLoading: true` until the backend
  answers. The local record resolves from localStorage in milliseconds while the dashboard call takes
  ~0.5s (far longer on a cold backend), so without this every screen painted the local "pending" and
  visibly flipped to "verified" a moment later. `PortalShell` also skips the `requiresVerification`
  nav lock while loading (`!verificationLoading`), so Bids/Negotiations/Orders no longer flash locked
  — the lock is a hint, not the security boundary. That nav guard is applied in **both** repos. Replace `toVerification()` with a straight read the day the backend puts
  a real KYB status on the payload.
  ⚠️ Two caveats: **`REJECTED` has never been observed live** (every real document came back
  `VERIFIED`), so that branch is asserted against the documented value, not a capture; and the
  **pre-verified document *review* list** (`PreVerifiedDashboard record={record}`) still reads the
  mock record — it only renders for a non-verified org, and rewiring it needs per-document review
  data (reason text, resubmit) that the dashboard payload does not carry.

#### 🧪 Test & build status (2026-08-19, final)
- `npx tsc -b` — **clean in both repos**.
- `npm run build` — **passes in both repos** (`tsc -b && vite build`).
- `npx vitest run` — **89/89 green**: 17 in `dashboardMappers.test.ts` (incl. 2 pinning the
  5-segment pipeline shape) and 6 in `profileStatusApi.test.ts` covering `Verified`/`Pending`/
  `Rejected`, casing, an unknown value and a failed request.
- **Every test runs against a real captured response body.** The one fabricated "supplier with bids"
  fixture was deliberately removed: inventing a payload the API has never sent would test our
  imagination, not the contract.

#### Known issues / still pending before the dashboards are fully complete
- **The real supplier bid flow is NOT verified, and cannot be yet.** An end-to-end attempt on
  2026-08-19 published a **real RFQ as the buyer** — `RFQ-0026` (`663053b7-cf5b-4059-a7f1-22419ac0cd71`),
  status **Live**, `matchedSupplierCount: 3`, left live on dev on purpose — but **no supplier bid API
  is deployed**: `GET /api/rfq/{id}` is 403 for a supplier and all 24 probed quotation/bid routes
  404. A supplier cannot see an RFQ or submit a bid at all, so `toBidRow` has never run against real
  data and **`bids[]` remains unvalidated end-to-end.** This is broader than the "Available RFQs"
  tile: the entire supplier bidding surface is missing. Details: `docs/…live-test-results.md` §5f.
- ⚠️ **New question raised by that test:** with a Live RFQ carrying 3 matched suppliers,
  `counts.totalRfqs` still returned **0** for the supplier. Either the account is not among the 3, or
  the documented email-based supplier-id resolution finds nothing — the payload cannot distinguish
  them.
- **RFQ-module defects found while publishing** (they block the RFQ integration, not the dashboard):
  `POST /api/rfq` **500s but still persists the record** (a retry would duplicate);
  `POST /api/rfq/{id}/publish` **500s for every RFQ** — the only working publish is
  `POST /api/rfq-draft/{id}/publish`, i.e. `Rfq` and `RfqDraft` are separate entities with separate
  publish paths and only the draft one works; `GET /api/rfq-draft` returns **502**; and no reachable
  route creates a draft. Wizard steps save via `POST /api/rfq-draft/{id}/step1|step2|step4`.
- **Counts semantics unverified on both sides**: `bidsToReview`, `currentNegotiating`,
  `avgRfqToAward`, supplier `totalRfqs`/`activeBids` and `order` are all `0`/`null`. Needs a buyer
  **with live bids and a purchase order**, and a supplier **with bids**.
- **The rendered pages have not been exercised against the live API** — the mappers are unit-tested
  against real bodies, but no end-to-end run with `useRealDashboard: true` has been done.
- **Supplier "Available RFQs" is blocked** on the endpoint Backend is building.

**Evidence:** `docs/dashboard-api-live-test-results.md` (real captures + ~60 calls across three
sessions, incl. the §5d re-test checklist and the §5e post-fix diff) and
`docs/dashboard-api-doc-review.md`.


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

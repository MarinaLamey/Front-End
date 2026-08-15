# Figma → Code Audit

Screen-by-screen audit of the implemented UI against the Figma designs.
One appended section per screen. Never overwrite an earlier section.

Verdict legend: ✅ MATCH · ⚠️ CLOSE · ❌ MISMATCH · 🚫 MISSING · ➕ EXTRA

---

## 1. Buyer Dashboard — route `/buyer` — audited 2026-08-14

**Frames supplied:** (A) verified + populated, (B) rejected verification, (C) duplicate of B,
(D) verified + empty. Light theme only. No Arabic/RTL frame, no breakpoint frames.

### STEP 1 — Design read

**Shell (all frames):** full-width header 1440×~62px — `mimony` wordmark + `Beta` lavender pill on
the start side; on the end side a Buyer/Supplier segmented switch, a verification pill
(green `✓ Verified` / red `⚠ Rejected`), a bell, and a 32–36px lavender avatar square `SM`.
Sidebar ~240px wide, bordered on the end edge, nav items ~40px tall with a 20px icon; active item
has a lavender fill and brand-purple label. Bottom of the sidebar: a `? Help & support` row, a
divider, then a Light/Dark segmented toggle. Main content column is exactly **1152px** wide
(1440 − 240 sidebar − 48 padding), vertical rhythm between sections ~24px.

**Frame A — verified + populated (top → bottom)**
1. Purple gradient hero (radius ~16px, padding 24px): `Welcome, Ahmed Al-Sayed!` (~28px bold white),
   building icon + `SME Corporation Ltd.` + `Goods & Services` chip on white/15, subtitle at ~70%
   white, and a white `+ Create RFQ` pill (brand-purple text) on the end side.
2. `Verified suppliers only` strip — bordered surface row, green check, secondary text.
3. Three KPI cards: `24 / Active RFQs` (purple tile), `6.2 days / Avg RFQ-to-Award` (amber tile),
   `5 / Bids to Review` (teal tile). Value ~30px bold. **No trend/delta chips.**
4. `RFQ pipeline` strip — label start, five dot+label+count segments end:
   **Open 3 (blue) · Bidding 5 (teal) · Negotiating 2 (amber) · Awarded 4 (purple) · Completed 12 (green)**.
5. `Action required today` card — title + red count pill `2`, **sub-line `2 items need your response`**,
   two rows (purple checklist tile → `Supplier A accepted your offer on RFQ-2026-0142 · issue the
   purchase order` + filled `Issue purchase order`; green chat tile → `Supplier replied in
   negotiation · Office Equipment` + outlined `Open chat`), then a **footer bar: `‹ Today ›` pager
   start, `Swipe to review the last 7 days` end.**
6. Two-column row, ratio ≈ **2.13 : 1**, gap ≈ 20px:
   - `My RFQs` + `View All ↗` — 5 rows: neutral file tile, title, meta `REF · N bids` + an
     `Anonymous` chip with an **eye-with-slash** icon, trailing bold amount over a status pill
     (Bidding / Negotiating / Awarded / Awarded / Draft; last row amount `SAR —`, meta `not published`).
   - `Track order` — sub-line **`PO-2026-0088 · Supplier A · due 25 Aug`**, then a 6-step vertical
     timeline: **PO issued (done) → PO accepted (current, trailing `Awaiting supplier` pill) →
     Shipped → Delivered → Goods received → Closed.**
7. `Suggested suppliers` (no leading icon) — two rows: person tile `3 verified suppliers cover your
   Steel Rebar RFQ` / `RFQ-2024-001 · Riyadh · avg 21-day delivery` + `category · region` chip +
   `Invite`; check tile `Lowest total bid on IT Hardware` / `Supplier B · SAR 42,900` +
   `lowest total` chip + `Review`. Chips read as **neutral grey**, buttons as **outlined**.
8. `Compliance & documents` + `Manage` link — **five** rows: CR `1010567890 · exp 13 Mar 2027`
   (Valid), VAT Certificate `300012345600003` (Valid), National Address `RIYD2547 · Riyadh` (Valid),
   SASO Conformity `Steel & rebar` (**Expiring 5d**, amber tile), ISO 9001 : 2015 `Quality
   management` (Valid). Status reads as **plain coloured text, no pill**.
9. `Quick Actions` heading (outside any card) + 4 tiles: Create New RFQ (lavender), Compare Bids
   (teal), Track Orders (lavender), Help & support (lavender).

**Frame B/C — rejected.** No hero. Red banner `Verification could not be completed` + Wathiq reason
+ `Rejected` on the end side → `Verification status` card (CR: red ✗, **red reason line only, no
number**, `Rejected` + purple `Re-upload`; VAT: green ✓, number, `Verified`, no button; National
Address: red ✗, **`RIYD2547 · from registration` rendered in red**, `Rejected` + `Re-upload`;
footer note `Fix the flagged item and resubmit. Need help? Contact support.`) → **`Keep sourcing
while you resubmit`** card, subtitle `You can still build RFQs and save them as drafts. Fix the
flagged item and resubmit to publish.`, purple `⟳ Resubmit documents` action, steps
**1 Build your first RFQ / 2 Compare bids on merit / 3 Award and track delivery** — **not dimmed, no
lock icon** → three muted `0 / — / 0` KPI tiles → `My RFQs` empty state → Quick Actions
(Create New RFQ, Browse Categories, How Anonymity Works, Complete Profile).
Sidebar shows only `Dashboard` + `RFQs` live; the remaining three rows are greyed `Nav item`
placeholders.

**Frame D — verified + empty.** Green banner `Your organisation is verified` → hero
**`Welcome to mimony, Ahmed Al-Sayed!`** → **`Get started in 3 steps`** card, subtitle `Your
organisation is verified. Here is how sourcing works on mimony.`, **no header action**, steps
**1 Create an anonymous RFQ / 2 Compare bids on merit / 3 Award and track delivery**, not dimmed →
three `0 / — / 0` KPI tiles (**muted grey values, faded tiles — identical to the rejected frame**) →
`My RFQs` empty state `No RFQs yet. Create your first anonymous RFQ to receive competitive bids from
matched suppliers.` + `+ Create RFQ` → Quick Actions (same four as the rejected frame).
**No verified-suppliers strip, no pipeline, no Action required, no Track order, no Suggested
suppliers, no Compliance card.**

### STEP 2 — Implementation

| File | Role |
|---|---|
| `src/features/dashboard/BuyerDashboardPage.tsx` | page; `VerifiedDashboard` / `PreVerifiedDashboard` / `QuickActions` |
| `src/features/dashboard/useBuyerDashboard.ts` | data seam — derives everything from the RFQ + Organisation stores |
| `src/features/dashboard/types.ts` | `BuyerDashboardData` and friends |
| `src/features/dashboard/components/WelcomeHero.tsx` | purple gradient hero |
| `src/features/dashboard/components/VerificationStatusCard.tsx` | per-document review panel |
| `src/shared/ui/dashboard/{StatCard,SectionCard,ListRow,StatusBadge,Timeline,EmptyState,QuickActionCard,StepsCard,VerificationBanner,icons}.tsx` | shared dashboard kit |
| `src/app/layouts/PortalShell/PortalShell.tsx`, `src/app/portals.ts` | header + sidebar chrome |
| `src/features/organisation/services/organisationApi.ts` | compliance document source (3 seeded docs) |
| `src/platform/i18n/locales/{en,ar}.ts` → `dashboard.*` | copy (en/ar parity verified for the whole block) |

### STEP 3/4 — Diff

#### A. Styling

| # | Element | Figma | Code | Verdict | Fix |
|---|---|---|---|---|---|
| A1 | Content column | 1152px, centred | `mx-auto max-w-6xl` = 1152px | ✅ | — |
| A2 | Section vertical rhythm | ~24px | `flex-col gap-6` = 24px | ✅ | — |
| A3 | Sidebar width | ~240px | `aside w-64` = 256px | ⚠️ −16px | `w-60` |
| A4 | Header height | ~62px | no vertical padding — height collapses to the 36px control row | ❌ | `py-3` (60px) or explicit height — see NC-1 |
| A5 | Brand logo sizing | ~22–24px tall | `<BrandLogo className="h-full w-full" />` inside an auto-height flex row — `h-full` has no basis | ❌ | give the logo an explicit height |
| A6 | Sidebar footer | `Help & support` row + divider + theme toggle | theme toggle only | 🚫 | add the row |
| A7 | Hero gradient | 120° purple sweep | `bg-[linear-gradient(120deg,#4A3F8F_0%,#51489E_45%,#6D63C6_100%)]` — **raw hex, bypasses the token chain** | ❌ | propose `--mp-gradient-hero` → **[ADD TOKEN 1]** |
| A8 | Hero radius / padding | ~16px / 24px | `rounded-2xl` (16px) / `p-6` | ✅ | — |
| A9 | Hero text tones | white, ~90%, ~70% | `text-white`, `text-white/90`, `text-white/70`, chip `bg-white/15` | ⚠️ raw white | use `brand-primary-on` + a token'd chip tint |
| A10 | KPI card | radius 12px, padding 20px, 44px accent tile, 30px bold value | `rounded-xl p-5`, `h-11 w-11 rounded-xl`, `text-3xl font-bold` | ✅ | — (tile size NC-2) |
| A11 | KPI delta chip | absent | `delta` prop supported, never populated | ➕ (dormant) | leave |
| A12 | KPI accent colours | purple / amber / teal | `brand` / `warning` / `success` | ✅ | — |
| A13 | Muted KPI (B & D) | faded tile, grey value | `muted` → `opacity-50` tile, `text-content-tertiary` value | ✅ | — |
| A14 | Pipeline strip | 5 segments, dot 8px | 4 segments | ❌ | see B4 — model conflict |
| A15 | Action-required title icon | none | amber `BoltIcon` before the title | ➕ | drop |
| A16 | Action-required sub-line | `2 items need your response` | absent | 🚫 | add + i18n key |
| A17 | Action-required footer | `‹ Today ›` pager + `Swipe to review the last 7 days` | absent | 🚫 | add |
| A18 | Two-column ratio | ≈ 2.13 : 1, gap ≈ 20px | `lg:grid-cols-[1.6fr_1fr]`, `gap-6` (24px) | ❌ | `lg:grid-cols-[2.13fr_1fr] gap-5` |
| A19 | Anonymous chip icon | eye **with slash** | `EyeIcon` (no slash) | ⚠️ | add `EyeOffIcon` |
| A20 | Anonymous chip type | ~11px | `text-[11px]` — arbitrary, off the stock scale | ⚠️ | **[DECISION 1]** accept `text-[11px]` or round to `text-xs` |
| A21 | Compliance status | plain coloured text | `StatusBadge` pill with subtle background | ⚠️ | NC-3 |
| A22 | Verification-card status | `Rejected` / `Verified` read as plain coloured text | `StatusBadge` pill | ⚠️ | NC-3 |
| A23 | Rejected doc meta line | rendered **in red**; CR row shows **no number** | meta stays `text-content-tertiary`; number always shown + separate red reason line | ❌ | tint the meta on `rejected`; NC-4 for the CR number |
| A24 | Rejected steps card | full contrast, no lock icon | `locked` → `opacity-60` + grey numerals; `LockIcon` in the title | ❌ | drop `locked` + `titleIcon` for rejected |
| A25 | Suggested-suppliers title icon | none | purple `UsersIcon` | ➕ | drop |
| A26 | Suggested-suppliers chips | neutral grey | `tone="brand"` (lavender) | ⚠️ | `tone="neutral"` |
| A27 | Row action buttons (`Invite` / `Review` / `Open chat`) | outlined, bordered | `variant="ghost"` (borderless) | ⚠️ | `variant="outline"` |
| A28 | Quick-action accents | Create purple, Compare teal, Track **purple**, Help **purple**; (B/D) Anonymity **purple** | Track `info`, Help `info`, Anonymity `info` (blue) | ❌ | `info` → `brand` on those three |
| A29 | Quick-action tile | 48px medallion, radius 12px, card padding 24px | `h-12 w-12 rounded-xl`, `p-6` | ✅ | — |
| A30 | Timeline connectors | not clearly visible between markers | 2px connector, green + `animate-connector-draw` when done | ⚠️ | NC-5 |
| A31 | RTL utilities | — | no `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` in any dashboard file | ✅ | — |
| A32 | RTL — dropdown origin | — | `origin-top-right` in `PortalShell` (physical) while anchored `end-0` | ⚠️ | shell-level; flips wrongly in `ar` |
| A33 | Dark theme | not supplied | every colour resolves to a semantic token except A7/A9 | ✅ | — |
| A34 | Motion | not supplied | `motion-safe:animate-stepper-in` (60ms stagger), `animate-connector-draw`, `animate-stepper-pulse` — transform/opacity only | ✅ | — |

#### B. Logic & behaviour

| # | Element | Figma | Code | Verdict | Fix |
|---|---|---|---|---|---|
| B1 | **Verified + empty state (frame D)** | own layout: banner, hero, `Get started in 3 steps`, 3 zero KPIs, empty My RFQs, 4 quick actions — **no** strip/pipeline/actions/track/suggested/compliance | not implemented. `VerifiedDashboard` always renders all nine sections; with no data the Action-required, My RFQs, Suggested and Track cards render as empty bordered boxes | 🚫 **Blocker** | branch `VerifiedDashboard` on `rfqs.length === 0` |
| B2 | `StepsCard` on the verified dashboard | present in frame D | never rendered in `VerifiedDashboard` | 🚫 | render for the empty verified state |
| B3 | Hero greeting | populated `Welcome, Ahmed Al-Sayed!`; empty `Welcome to mimony, Ahmed Al-Sayed!` | always `dashboard.welcome.greetingBack` = `Welcome back, {{name}}!`; `greetingNew` exists but is interpolated with `{{org}}`, not `{{name}}` | ❌ | two greetings, keyed on empty vs populated; retarget `greetingNew` to `{{name}}` |
| B4 | Pipeline segments | Open / Bidding / Negotiating / Awarded / Completed | Draft / Live / Negotiating / Awarded | ❌ | **Figma ↔ CLAUDE.md conflict** — `open`, `bidding`, `completed` are not in the stored status model (`draft · awaiting_verification · live · partially_awarded · awarded · cancelled · expired`). Needs a ruling (NC-6) |
| B5 | Action rows | `Issue purchase order` → PO issue flow; `Open chat` → negotiation thread | both `onClick={() => undefined}` — dead buttons | ❌ | wire to `/buyer/orders/...` and `/buyer/negotiations/:id` |
| B6 | Action copy | `Supplier A accepted your offer … issue the purchase order` | `{{count}} new bids to review on {{title}} ({{ref}})` — a different action entirely | ❌ | add the accepted-offer action once the award→PO seam exists |
| B7 | **Track order card** | tracks a **purchase order**: `PO-2026-0088 · Supplier A · due 25 Aug`, steps PO issued → PO accepted → Shipped → Delivered → Goods received → Closed | tracks an **RFQ**: `{rfq.reference} · N bids`, steps Published → Bids received → Negotiating → Award → Delivery → Completed | ❌ **Blocker** | source from `features/orders` (`miproc.orders.v5`), not the RFQ store |
| B8 | Current-step note | `Awaiting supplier` | `dashboard.inProgress` = `In progress` | ❌ | new key |
| B9 | Suggested suppliers | two row kinds (supplier-coverage + lowest-bid) | only the lowest-bid row is ever produced | 🚫 | add the coverage row |
| B10 | Compliance rows | 5 documents incl. SASO Conformity + ISO 9001 : 2015 | org seed has 3 (`Commercial registration`, `VAT certificate`, `National Address`) | 🚫 | extend the org seed (seed richness rule) |
| B11 | Compliance meta | `1010567890 · exp 13 Mar 2027` (number + expiry) | `doc.fileName` (`CR_….pdf`) for valid docs | ❌ | show number + expiry |
| B12 | Compliance titles | localisable | `doc.type` — English literals stored in the mock, rendered raw | ❌ i18n | key the document type |
| B13 | `Manage` link | navigates | `<button>` with no handler | ❌ | → `/buyer/organisation/profile` |
| B14 | `Help & support` quick action | opens support | no `onClick` | ❌ | wire or disable |
| B15 | Rejected steps copy | `Keep sourcing while you resubmit` / `You can still build RFQs and save them as drafts. Fix the flagged item and resubmit to publish.` | `Resubmit to continue` / `Fix the issue in the banner above and resubmit your documents to unlock sourcing.` | ❌ | replace both keys |
| B16 | Step 1 copy | verified `Create an anonymous RFQ`; **rejected `Build your first RFQ` / `Add items and terms now, save as draft, and publish once your organisation is verified.`** | one shared `steps.create` | ❌ | state-dependent step 1 |
| B17 | Step 2 desc | `Verified suppliers bid on your RFQ; you compare side by side.` | `AI matches suppliers; you compare side by side.` | ❌ | replace |
| B18 | Step 3 | `Award and track delivery` / `Follow the order through to goods receipt.` | `Award & fund escrow` / `Pay securely, released on delivery.` | ❌ **also a domain violation** — CLAUDE.md §1: mimony does **not** hold funds, this is not escrow | replace en + ar |
| B19 | Verified empty-state copy | `No RFQs yet. Create your first anonymous RFQ to receive competitive bids from matched suppliers.` | only `emptyRfqs.pending` / `.rejected` exist | 🚫 | add `emptyRfqs.verified` |
| B20 | `VerificationStatusCard` badges | localised | `STATE_BADGE = { verifying: 'Verifying', verified: 'Verified', rejected: 'Rejected' }` — hardcoded English | ❌ i18n | `t('dashboard.status.*')`; `verifying` needs a new key |
| B21 | `StatItem.label` | — | `'Active RFQs'` / `'Avg RFQ-to-Award'` / `'Bids to Review'` hardcoded in the hook (unused — the page re-keys via `t()`) | ⚠️ dead English | drop the field |
| B22 | Zero-Fetch | — | no `invalidateQueries` in the dashboard path (the only one in the repo is a deliberate boot-time verification refresh in `AppProviders`) | ✅ | — |
| B23 | Loading | — | single spinner until verification **and** dashboard resolve, to stop a verified org flashing the pending view | ✅ | — |
| B24 | Efficiency | — | `deriveRfqDetail(withBids)` recomputed 3× and `deriveRfqDetail(r)` runs inside two `.find()` predicates over every RFQ | ⚠️ | hoist into the existing single pass |
| B25 | Sidebar in the unverified state | `Dashboard` + `RFQs` live, 3 greyed placeholders | all 5 items always live | ⚠️ | NC-7 — likely a Figma placeholder, not a spec |
| B26 | i18n parity | — | every `dashboard.*` key present in both `en.ts` and `ar.ts` | ✅ | — |
| B27 | a11y | — | `<section>` + `<h2>` per card, `<ol>`/`<ul>` lists, `aria-pressed` on the portal switch, `aria-expanded` on nav groups; **no `aria-label` on the KPI/quick-action icon tiles** (decorative, acceptable) | ✅ | — |

### Prioritized fixes

**Blockers**
1. B1/B2/B19 — the verified + empty dashboard (frame D) does not exist in code.
2. B7/B8 — Track order tracks the wrong entity (RFQ, not the purchase order) with the wrong steps.
3. B18 — "Award & fund escrow" contradicts the escrow-free domain rule *and* the Figma.
4. B4 — pipeline segment set must be resolved (Figma vs the stored status model).

**Majors**
5. A4/A5 — header height collapses; `BrandLogo` `h-full` has no basis.
6. A7 — raw-hex hero gradient bypasses the token chain.
7. A18 — two-column ratio 1.6 : 1 vs 2.13 : 1.
8. B3 — wrong greeting in both states.
9. B15/B16/B17 — rejected steps card: wrong title, subtitle and step copy.
10. A24 — rejected steps card must not be locked/dimmed.
11. A23 — rejected document rows must tint their meta line red.
12. B5/B13/B14 — dead buttons (`Issue purchase order`, `Open chat`, `Manage`, `Help & support`).
13. A16/A17 — missing sub-line and the `‹ Today ›` / "last 7 days" footer.
14. B20 — hardcoded English verification badges.
15. B10/B11/B12 — compliance rows: 3 of 5 documents, filename instead of number + expiry, unkeyed titles.
16. A28 — three quick-action tiles use the blue `info` accent where Figma is lavender.
17. B9 — the supplier-coverage recommendation row is never produced.

**Minors**
18. A3 sidebar 256 → 240 · A6 `Help & support` sidebar row · A15/A25 extra title icons ·
    A19 eye-with-slash · A26 chip tone · A27 outlined row buttons · A9 raw white ·
    A32 `origin-top-right` in RTL · B21 dead English labels · B24 repeated `deriveRfqDetail`.

### NEEDS CONFIRMATION

- **NC-1** Exact header height (I measure ~62px; `py-3` gives 60, `py-3.5` gives 64).
- **NC-2** KPI accent tile: 40px or 44px? (code is 44).
- **NC-3** Are `Valid` / `Expiring 5d` / `Rejected` / `Verified` **plain coloured text** or pills with
  a subtle tinted background? The raster is ambiguous and it affects `StatusBadge` everywhere.
- **NC-4** On a rejected CR row, is the CR number intentionally suppressed in favour of the reason,
  or is the number simply absent from this mock?
- **NC-5** Does the Track-order timeline draw connectors between markers?
- **NC-6** **Figma ↔ CLAUDE.md conflict.** The pipeline names `Open`, `Bidding` and `Completed`,
  which the stored RFQ status model does not have. Which wins — remap the Figma labels onto
  `draft / live / negotiating / awarded`, or extend the model?
- **NC-7** Are the greyed `Nav item` rows in the rejected frame a real "nav locked until verified"
  rule, or just unlabelled Figma placeholders?
- **NC-8** No Arabic/RTL frame and no breakpoint frames were supplied — responsive and RTL rows are
  audited against the code only.
- **NC-9** Frame A's `Action required today` references `RFQ-2026-0142` and `PO-2026-0088`, but
  `My RFQs` uses `RFQ-2024-00x`. Assumed to be Figma placeholder drift, not a spec.

### Token decisions (approval required before any fix)

- **[ADD TOKEN 1]** Hero gradient. `WelcomeHero` hardcodes
  `linear-gradient(120deg,#4A3F8F 0%,#51489E 45%,#6D63C6 100%)`. Propose
  `--mp-gradient-hero` + `--color-gradient-hero: var(--gradient-hero, var(--mp-gradient-hero))`
  in `src/index.css`, following the existing whitelabel-override chain.
- **[DECISION 1]** `text-[11px]` on the `Anonymous` chip and the `Beta` badge is off Tailwind's stock
  type scale. Accept the arbitrary value, or round both to `text-xs` (12px)?
- **[ACCEPT]** Everything else on this screen lands on the stock scale: container 1152 (`max-w-6xl`),
  sidebar 240 (`w-60`), gaps 20/24 (`gap-5`/`gap-6`), radii 12/16 (`rounded-xl`/`rounded-2xl`),
  tiles 44/48 (`h-11`/`h-12`), padding 20/24 (`p-5`/`p-6`).

### STEP 5 — Applied (styling only, 2026-08-14)

Scope given: *"UI only. Fix the styling issues… do not touch the logic, API, data model, status
model, or functionality."* Every **Table A** row was actioned except the three blocked on an open
question. **No Table B row was touched.**

| Row | Change | File |
|---|---|---|
| A3 | `w-64` → `w-60` (240px) | `PortalShell.tsx` |
| A4 | header gains `py-3` → 60px | `PortalShell.tsx` |
| A5 | `h-full w-full` → `h-8 w-auto` | `PortalShell.tsx` |
| A6 | `Help & support` row added above the theme toggle | `PortalShell.tsx` |
| A7 | raw hex → `--mp-gradient-hero` + `.mp-gradient-hero` utility | `index.css`, `WelcomeHero.tsx` |
| A15 | `BoltIcon` dropped from the Action-required title | `BuyerDashboardPage.tsx` |
| A16 | `{{count}} items need your response` sub-line added | `BuyerDashboardPage.tsx`, `en/ar.ts` |
| A17 | `‹ Today ›` + `Swipe to review the last 7 days` footer added | `BuyerDashboardPage.tsx`, `en/ar.ts` |
| A18 | `[1.6fr_1fr] gap-6` → `[2.13fr_1fr] gap-5` | `BuyerDashboardPage.tsx` |
| A19 | `EyeIcon` → new `EyeOffIcon` | `icons.tsx`, `BuyerDashboardPage.tsx` |
| A23 | rejected doc rows tint their meta line `text-status-danger` | `VerificationStatusCard.tsx` |
| A24 | rejected steps card: no `locked`, no `LockIcon` | `BuyerDashboardPage.tsx` |
| A25 | `UsersIcon` dropped from the Suggested-suppliers title | `BuyerDashboardPage.tsx` |
| A26 | match chip `tone="brand"` → `"neutral"` | `BuyerDashboardPage.tsx` |
| A27 | row buttons `ghost` → `outline` | `BuyerDashboardPage.tsx` |
| A28 | Track Orders / Help & support / How Anonymity `info` → `brand` | `BuyerDashboardPage.tsx` |
| A32 | `origin-top-right rtl:origin-top-left` (2×) | `PortalShell.tsx` |
| — | Action-required title → `Action required today` (new key, buyer only) | `BuyerDashboardPage.tsx`, `en/ar.ts` |

**Deliberately not applied**

- **A9** — raw `text-white` / `bg-white/15` on the hero **kept on purpose**. `--mp-brand-primary-on`
  is `#0f172a` in dark mode, but `.mp-gradient-hero` stays purple in both themes, so swapping to the
  on-brand token would put near-black text on a purple banner in dark mode. White is correct here.
- **A30** — timeline connectors, blocked on **NC-5**.
- Pending-state steps card still dims (`locked`) — no pending frame was supplied, only rejected.

**Verification:** `npx tsc -b` green and `npx eslint` clean in **both** repos. Two-repo parity
confirmed: the five self-contained files are byte-identical (modulo myapp's CRLF), and
`PortalShell.tsx` / `en.ts` / `ar.ts` were edited surgically so myapp's pre-existing real-API
divergence (`useLogout`, 43 locale lines each) is preserved.

### STEP 5b — NC-3 and DECISION 1 resolved (2026-08-14)

**NC-3 — ruled: coloured text, no pill.** A status shown as a statement of where the user currently
stands renders bare; a status you scan a list *by* stays a pill.

`StatusBadge` gains an additive optional `plain` prop (no existing call site changes behaviour):
it keeps the `STATUS_TONE` resolution and drops the background, padding and pill radius, resolving
through new `TONE_TEXT_CLASS` / `TONE_TEXT_STRONG_CLASS` maps so colour is still decided in one
place. Applied at exactly **three** call sites — buyer Compliance & documents rows (A21),
`VerificationStatusCard` document rows (A22), and `VerificationBanner`'s trailing label.

The remaining ~25 `StatusBadge` call sites are untouched and still render pills, including the
`My RFQs` status chips, the Track-order step note, the Suggested-suppliers match chip, and every
RFQ / bid / order list in the app.

> **Other screens this touches:** `VerificationBanner` is shared, so the supplier dashboard's
> banner label also becomes plain text. `SupplierDashboardPage`'s own compliance row (the mirror of
> A21) was **left as a pill** — it has no Figma frame in this batch; align it when the supplier
> dashboard is audited.

**DECISION 1 — ruled: accept `text-[11px]`.** No code change was required; the Anonymous chip and
the Beta badge already carry it, and it is an established off-scale value elsewhere in the repo
(`AdminShell`, `PurchaseOrderModal`). Recorded as approved so it is not re-flagged.

**Verification:** `tsc -b` green and `eslint` clean in both repos; all four changed files
byte-identical across repos (modulo myapp's CRLF).

### STEP 5c — A30 + Table B applied (2026-08-14)

**A30 — ruled: no connectors.** `Timeline` no longer renders the marker-joining rail; the
marker/connector column collapsed to a plain marker and step spacing tightened to `pb-4`. The
`connector-draw` animation is gone with it; the stagger and the current-marker ping remain.

**Status is the source of truth for feature access.** Confirmed with the user: the org's KYB status
comes from the Admin approval flow (`verificationApi.decideDoc` → `OrgVerification.status`, derived
from the per-document decisions) and gates features across the app. It is read through the existing
`useOrgVerification` hook — no new status model, nothing mocked.

| Row | Change |
|---|---|
| NC-7 | `NavItem.requiresVerification` added; Bids / Negotiations / Orders render inert + padlocked until `status === 'verified'` (both portals). Dashboard + RFQs stay reachable — an unverified org can still build drafts |
| B1/B2/B19 | New `VerifiedEmptyDashboard`: hero, `Get started in 3 steps`, muted KPIs, empty My RFQs, onboarding quick actions. Chosen when `verified && rfqs.length === 0` |
| B3 | `greeting()` helper — `Welcome, {{name}}!` when populated, `Welcome to mimony, {{name}}!` on first run; `greetingNew` retargeted from `{{org}}` to `{{name}}` (it had no call sites) |
| B5 | `ActionItem.to` added; buttons navigate to `/buyer/rfqs/:id/compare` and `/buyer/negotiations/:rfqId/:bidId` |
| B7 | `Track order` now reads the **Orders** store: most recent order in `awaiting_acceptance` / `in_transit` / `delivered`, PO number + supplier + due date, steps derived from the order's own timestamps. `trackedOrder` is nullable — no live PO hides the card instead of faking one |
| B8 | Current-step note is `Awaiting supplier`, except the buyer-owned receipt step which reads `Awaiting you` |
| B9 | Supplier-coverage recommendation added, from the real `invitedSuppliers` / `deliverToCity` on the RFQ detail |
| B10 | Org seed extended to 5 documents (+ SASO Conformity, ISO 9001 : 2015); `STORE_KEY` → `miproc.organisation.v3` |
| B11 | `OrgDocument.reference` added; compliance meta is now identifier + expiry (`1010229481 · exp 13 Mar 2027`) instead of a filename |
| B12 | `OrgDocument.typeKey` added → `org.profile.docs.type.*`; user-added documents still use their typed name |
| B13 | `Manage` navigates to `/buyer/organisation/profile` |
| B15–B18 | Steps copy replaced. **B18 also removes the escrow claim** — `Award & fund escrow / Pay securely, released on delivery` → `Award and track delivery / Follow the order through to goods receipt`, matching both the Figma and CLAUDE.md §1 (mimony holds no funds) |
| B20 | Verification badges localised via `dashboard.status.*` (+ new `verifying` key) |
| B21 | Dead English `StatItem.label` removed; the label is resolved from `key` at render |
| B24 | One pass over the RFQs: `deriveRfqDetail` is no longer re-derived inside `.find()` predicates, and the recommendations share a single derivation |

**Found and fixed while in here (not in the original audit):** `StatusBadge` infers its tone from the
label text, but every call site passes an **already-translated** label — so in Arabic the My RFQs
chips, the verification rows and the verification banner all fell back to neutral grey. Tone is now
passed explicitly from the raw status (`RfqSummary.tone`, `BID_STATUS_TONE`, `STATE_TONE`, and
`VerificationBanner`'s state-derived badge). `Tone` is exported as `BadgeTone` for that purpose.

**Deliberately not applied**

- **B4 — pipeline segments.** Figma names `Open`, `Bidding` and `Completed`; the stored model has
  none of them. Instructed not to introduce a new status model, so the four real segments stand and
  the Figma labels are not adopted. **Still open (NC-6).**
- **B6 — "Supplier A accepted your offer · issue the purchase order".** Depends on a
  negotiation-accepted state that does not exist yet (CLAUDE.md lists the buyer negotiation rework
  as outstanding). Adding it would mean inventing a status — explicitly excluded.
- **B14 — `Help & support` quick action.** Left unwired here; a concurrent session has since wired
  the *sidebar* entry to a new `HelpSupportDialog`, which is the natural target.
- **NC-4** (is the CR number suppressed on a rejected row?) and **NC-9** remain open.
- Route-level enforcement of the verification gate was **not** added — only the nav is gated, which
  is what the Figma shows. Deep links to `/buyer/orders` still resolve. Flagged for a decision.

**Verification:** `tsc -b` green and `eslint` clean in **both** repos. Parity re-confirmed: 14 files
byte-identical (modulo CRLF); `PortalShell.tsx` and the two locale files edited surgically so
myapp's real-API divergence (`useLogout`, ~43 lines of auth/onboarding copy per locale) survives
untouched. `HelpSupportDialog.tsx` exists only in MI-Proc — another session's in-flight work, left
for them to port.

**Status: TABLE A COMPLETE except A30 (done) — Table B complete except B4 (NC-6) and B6.**

---

## Screen 2 — Buyer RFQ module (list · detail ×6 · modals ×4 · create wizard ×4 · outcomes ×3 · help)

Routes: `/buyer/rfqs`, `/buyer/rfqs/:id`, `/buyer/rfqs/new`.
Status: **FIXES APPLIED.** `tsc -b` green and `npm run build` green in BOTH repos.

### Re-verified diff (post-fix)

| # | Element | Verdict |
|---|---|---|
| A1 | List subtitle → "RFQs you raised. Switch to All organisation…" | ✅ |
| A2 | `+ Create RFQ` icon | ✅ |
| A3 | Scope toggle kept — the subtitle explicitly references it | ✅ |
| A4/A5 | Chips = All · Live · Awaiting verification · Negotiating · Awarded · Cancelled · Expired · Draft; `negotiating` derived and excluded from the `live` tally so the two chips partition the live set | ✅ |
| A6 | Live row action `Compare` → `View` | ✅ |
| A7 | Awaiting-verification closing → "Publishes when verified" | ✅ |
| A8 | Cancelled row keeps "Closed" — a cancelled RFQ with bids *was* published; the frame's "Not published" is data drift | ⚠️ resolved-as-designed |
| A9 | "· split award, N suppliers" on rows with >1 award | ✅ |
| A10/A11 | Badge tones left on the existing status tokens (design-system consistency over a raster reading) | ⚠️ resolved-as-designed |
| A12 | Pagination renders only once the list spills a page | ✅ |
| B1 | `← Back` above the breadcrumb | ✅ |
| B2/B3/E2 | **Anonymity copy** — all three now say identity is revealed when the supplier ACCEPTS THE PO, not at award | ✅ |
| B4 | Compliance column (`n of m`) in the bids table | ✅ |
| B5 | "Partial bids · Allowed · min N of M" rail row | ✅ |
| B6 | "Closes in N days" chip | ✅ |
| C1 | Close-early **kept** on Live — CLAUDE.md §3 mandates it; the frame omits it. Behavioural contract wins for which actions exist | ⚠️ contract over frame |
| C2/C9 | Cancel is an outlined danger button; Amend is primary on awaiting-verification | ✅ |
| C4–C8 | Awaiting-verification: 3 chips, "Created … by", `Bids` card + its own copy, Created/Opens/Closing/Bids/Matched-suppliers rail, new note | ✅ |
| C10–C12 | Awarded: dated chip, Won/Lost bid outcomes, View purchase orders + View awarded bids + note | ✅ |
| C13 | Cancelled: dated chip, all bids Lost, View cancellation reason + Duplicate RFQ + note | ✅ |
| C14 | Expired: dated chip, View bids received + Duplicate RFQ + note | ✅ |
| D2–D7 | Amend b4 + the whole Cancel dialog (neutral reference badge, body, "What happens", 3 bullets, "Reason (shared with bidders)") | ✅ |
| D8 | Reason min-length + counter kept — graceful-failure pillar | ⚠️ resolved-as-designed |
| D9 | **Cancellation reason is persisted** (`cancelReason` + `cancelledAt` on the record) and read back in the reason dialog | ✅ |
| D12 | `Modal` now traps focus, focuses on open and restores focus on close — fixes every modal in the app | ✅ |
| E3/E4 | Budget grouped via `formatSar`; line-items footer shows "Budget SAR … · private" | ✅ |
| E5 | **NC-8 resolved:** the buyer sets the window explicitly at BOTH ends. New `openingDate` on `RfqDraft`, two `datetime-local` inputs under "Bidding window", `biddingWindowValid` guard, seed + STORE_KEY bumped to `miproc.rfqs.v10` | ✅ |
| E6/E7/E9/E11/E16 | Copy corrected (partial hints, payment subtitle, proposing banner, "then publish") | ✅ |
| E10 | Proposing banner now shows on all three presets | ✅ |
| E12/E13 | Rule chips + "Within rules" pill removed; the broken rule is still named when the schedule is invalid | ✅ |
| E17/E18/E19/E20/E21 | Review restructured: summary rows with Edit for Line items / Payment / Requirements / Audience; Partial bids replaces Partial delivery; Award row dropped | ✅ |
| E22/E23 | Before-you-publish / Not-verified-yet notes moved INSIDE the review card with their headings | ✅ |
| E24/E25 | Save draft on step 4 + "Saved · just now" (from the store's `savedAt`, stamped on every persisted edit) | ✅ |
| F2 | Result card `max-w-md` → left as-is | ⚠️ see below |
| F3/F4 | Sidebar Help & support opens a new `HelpSupportDialog` | ✅ |

### Two-repo status

Byte-identical (line-endings aside) in both repos: `types.ts`, `validation.ts`, `rfqApi.ts`, `deriveRfqDetail.ts`, `rfqDraftStore.ts`, `RfqCreatePage.tsx`, all four wizard steps, `LineItemsEditor`, `PaymentTermsEditor`, `Modal`, `icons`, `HelpSupportDialog`.
Behaviour-mirrored (legitimately diverged for the real API): `RfqDetailPage`, `rfqDetailView.ts`, `listView.ts`, `useRfqs.ts`, `rfqQueries.ts`, `RfqListPage`, `PortalShell`, and both locale files (myapp keeps `amendments` / `amendedValue` / `cancellationReason`).

### Still open

- **F2** result-card width: Figma ≈558px, stock steps are 512 / 576. Needs a call before changing.
- **Real-mode gaps** in myapp: the detail DTO carries no `openingDate`, `cancelledAt`, `awardedAt` or partial-bid rule, so those rail rows / chips stay hidden under `useRealRfq`. Backend contract change required.
- Keys orphaned by this pass are left in place (`publishReadyNote`, `publishUnverifiedNote`, `payment.rulesLabel`/`rules`/`withinRules`, `review.award`/`singleAward`/`splitAward`/`publishNote`/`warrantyCerts`, `delivery.closingDate`). Harmless; sweep with the older dead keys from the deleted Plans/Scope/AI components.

**Status: FIXED — awaiting visual sign-off.**

---

## Screen 3 — Buyer Negotiation (thread · End-negotiation · Payment terms · inbox)

Routes: `/buyer/negotiations`, `/buyer/negotiations/:rfqId/:bidId`.
Status: **FIXES APPLIED.** `tsc -b` and `npm run build` green in BOTH repos.

Authority for this screen is the **Negotiation and Orders Source of Truth v1.1 (13 Aug 2026)**, not the
Figma sample data — supplier names, amounts, rounds, row order and statuses in the frames are dummy.

### Applied

| # | Change | Source |
|---|---|---|
| E9 | `agreed` reads **Awaiting you**, not Closed — the supplier accepted and only the buyer's award is left | user decision |
| E10 | Status mapping confirmed as built: supplier moved last → **Awaiting you**; buyer moved last → **Active**; ended/awarded → **Closed** | user decision (Figma rows were dummy) |
| E11 | Identity reveal is now a real rule: new `identity.ts` unmasks a supplier only when this RFQ's award names their bid **and** its purchase order has been accepted; the empty-set default keeps everything masked | doc §1, §15.1 |
| D1 | Default `Modal` width 448 → **560 px** — fixes this dialog and the four RFQ dialogs I wrongly passed last batch | measured ×2 |
| F2 | Result card `max-w-md` → 560 px, same measurement | carried over |
| E3 | Inbox container `max-w-5xl` → `max-w-6xl` | Figma |
| E5 | Inbox tracks re-cut — RFQ column widened, Last-activity narrowed | Figma |
| A11 | Line totals print bare and to 2 dp (`10,600.00`), not `SAR 10,600` | doc §4 rounding |
| F | **Counter messages are now blocked**, not merely discouraged: new `messageGuard.ts` detects an email, a 9+-digit phone run, a link or a legal-entity suffix and disables Send | CLAUDE.md #7 |
| — | **Lines must reconcile to the target**: a typed target that the pro-rata split cannot hit exactly now reports "over/under by X" in red and blocks Send | doc §4 |
| — | Expiry chip names the **date** as well as the days, counted from `effectiveExpiry` = the latest `bidValidUntil` across versions (new optional field on `OfferVersion`) | doc §3, §15.1 |
| — | Also-negotiating note corrected: **a full award** closes the others; a partial award leaves them open | doc §6 |
| — | Award now cascades onto the conversations automatically: won threads → `awarded`; the rest close **only** on a full award | doc §13 |
| — | Milestone trigger drops the "(GRN)" abbreviation | doc §4.1 |
| — | The 2–5-milestone cap is gone; the only payment rule left is the 100% total (`MIN/MAX_MILESTONES` and the dead rule keys removed) | doc §4.1 |
| C3 | Payment-terms modal footnote removed (`footnote={null}` now supported) | Figma + doc §4.1 |
| — | **Close-early is gone** from the live RFQ — the previous batch's NC-5 is settled: ending early is an award or a cancellation | doc change #4 |
| A2 | Breadcrumb links use `content-link` | Figma |
| A6 | `View details` gains a rotating caret with `aria-expanded` | Figma |
| A16 | Right rail 340 → 320 px, matching the RFQ detail page | Figma |
| E12 | `Date.now()` hoisted out of render on both negotiation pages | lint/purity |

### Verified already correct (doc §17)

End-negotiation dialog copy · offer history append-only · countering withdraws acceptance · every total
derived from its lines · headline delivery = latest line date · rail comparison figures · Accept-and-award
as one step · Zero-Fetch throughout · logical utilities only.

### NOT changed — needs a decision

- **VAT model.** Doc change #2 and §15.1 say entered prices are **VAT-inclusive** (`subtotal = total / 1.15`).
  The code does the opposite — ex-VAT unit prices with VAT added on top (`withVat`) — which is what the
  recorded 13-Aug decision in memory `bid-vat-rule` asks for. Two written sources disagree. Flipping it
  touches `vat.ts`, `deriveNegotiation`, the bid composer, compare and orders, so it is held.
- **Activity sentence.** Doc §2.1 requires every status row to carry an activity sentence
  ("Supplier A replied with offer v3"). The inbox has a relative-time column and no room for one; the
  Figma has no slot for it. Needs a layout decision.
- **Five-state vocabulary.** Doc §2.1 wants Awaiting supplier / Awaiting you / Agreed / Awarded / Closed;
  the three-status set was kept per the user's explicit instruction.

**Status: FIXED — awaiting visual sign-off.**

---

## Screen 4 — Buyer Orders module — audited & fixed 2026-08-15

**Frames supplied (9, light theme only):** Order conversation · Order detail ×5 (Awaiting acceptance,
Awaiting + PO modal, In transit, Delivered·confirm receipt, Closed) · Declined resolution ·
Cancel purchase order · Orders list. No Arabic/RTL frame, no dark frame, no breakpoint frames.

**Measurement caveat.** The Figma MCP connector was not authorised for this session, so the audit ran
against rasterised PNGs with no inspect panel. Structure, composition, copy, states, colour *role* and
logic were verified; exact px / weight / hex were NOT, and no token was proposed on a guess. The
`[ADD TOKEN]` batch for this screen is therefore empty and still owed once inspect access exists.

### Files

`OrdersInboxPage.tsx` · `OrderDetailPage.tsx` · `OrderMessagesPage.tsx` · `CancelOrderPage.tsx` ·
`PurchaseOrderModal.tsx` · `components.tsx` · `lib.ts` · `types.ts` · `services/ordersApi.ts` ·
`shared/ui/dashboard/icons.tsx` · both locale files.

### STEP 3/4 — Diff and outcome

| # | Element | Figma | Code (before) | Verdict | Outcome |
|---|---|---|---|---|---|
| 1 | Conversation header + rail strings | 12 visible strings | `order.heading`, `order.conversation`, `order.inFulfilment`, `order.termsLocked`, `order.identitiesRevealed`, `order.lockedNote`, `order.countersClosed`, `order.locked`, `order.fromOffer`, `order.colDelivery`, `order.phoneMasked`, `order.attached` — **none existed** in en or ar; raw key paths rendered on screen | ❌ Blocker | FIXED — repointed to `order.messages.*`; 9 keys added, `heading` corrected to "Order conversation" |
| 2 | Offer history (v1/v2/v3) | Three version blocks, 4-stat strip, message | Absent; stale comment claimed the model had no history although `Order.offerHistory` existed | 🚫 Blocker | FIXED — `OfferBlock` added; seeded 3 rounds on the hero order |
| 3 | Declined — "three ways forward" | Copy says three, two options shown | Two options; `Order.runnerUp` modelled and unused | ❌ Blocker | FIXED as copy — **user ruling 15 Aug: Republish covers the Declined case**, so there is no third path. Copy → "two ways forward" |
| 4 | Detail status | Tinted pill under the breadcrumb | Coloured text + a stray `ORD-… · PO-…` line | ❌/➕ Blocker | FIXED — pill; id line removed; declined branch no longer double-renders a title |
| 5 | Conversation composer | "Send message" + "Attach file" buttons | `FileDrop` dashed dropzone + one button | ❌ Major | FIXED — button pair over a hidden file input |
| 6 | Items covered | 4 of 5 | `lines.length / lines.length` → "4 of 4" | ❌ Major | FIXED — reads `itemsCovered`/`itemsTotal` |
| 7 | Conversation supplier card | name · Contact · Phone | name · CR/VAT · location · Phone | ❌/➕ Major | FIXED — `OrderParty.contactName` added and seeded |
| 8 | Timeline, Delivered | "Your confirmation" / "After confirmation" | "Awaiting your confirmation" / "Not started" | ❌ Major | FIXED — state-specific keys |
| 9 | Timeline, In transit | "Expected 25 Aug" | "Expected arrival" (static) | ❌ Major | FIXED — `noteDate` on the step, formatted in-component |
| 10 | List sub-line | `PO-… · RFQ-… (1 of 2)` / `PO-…` | led with internal `ORD-…` id | ❌ Major | FIXED — PO number leads; id never surfaced |
| 11 | Declined default | Neither radio selected | defaulted to `republish`, Confirm always enabled | ❌ Major | FIXED — no default, Confirm gated |
| 12 | Breadcrumbs | 2 crumbs, PO number, at every status | 3 crumbs; ORD id on non-terminal statuses | ❌ Major | FIXED |
| 13 | Declined + Cancel rails | no PO-reference row | extra Reference row on both | ➕ Major | FIXED |
| 14 | Next step, declined | "Supplier declined 13 Aug" | no date | ❌ Minor | FIXED |
| 15 | List subtitle | "Every **purchase** order…" | "Every order…" | ❌ Minor | FIXED |
| 16 | Payment trigger | "On goods receipt **(GRN)**" | "On goods receipt" | ❌ Minor | FIXED (`order.trigger` only; the `rfq.*` twin left alone) |
| 17 | Short-line warning | "150 **pcs**" | "150 units" | ❌ Minor | FIXED — interpolates the line's unit |
| 18 | Cancel rail title | "Purchase order" | "Order" | ❌ Minor | FIXED |
| 19 | Closed rail | ☆ Add to favourites | no icon | ❌ Minor | FIXED — `StarIcon` added to the shared kit (additive only) |
| 20 | PO modal | full document + footer bar | as designed | ✅ | — |
| 21 | VAT arithmetic | 88,000 + 13,200 = 101,200; milestones % of the VAT-inclusive total | `orderTotals` / `paymentSchedule` reproduce exactly | ✅ | — |
| 22 | Reveal-on-acceptance | `Supplier A` until accepted | `isSupplierRevealed` | ✅ | — |
| 23 | RTL + Zero-Fetch | logical utilities only; no invalidate | zero directional utilities, zero `invalidateQueries` | ✅ | — |

### Deliberately not built

- **"View details" disclosure** on each offer block. `OrderOffer` carries no line-level data, so there
  is nothing to expand into. Rendering a dead control would repeat the mistake the dashboard day-pager
  already avoids. Needs either line data on `OrderOffer` or removal from the design.

### Data changes

- `Order.offerHistory` seeded (3 rounds), `itemsCovered/itemsTotal` = 4 / 5, `supplierAnonLabel`,
  and `OrderParty.contactName` on the hero order.
- **STORE_KEY `miproc.orders.v6` → `v7`** — required by the seed shape change; re-seeds local orders.

### Still open (carried forward)

1. Does `All` exclude declined orders? Figma tab counts sum to 13 without the declined row.
2. Orders list pagination — 13 orders, 6 rows, no pager in frame.
3. Delivery-note abbreviation "DN-88214 / 15 / 16" — display rule or mockup shorthand?
4. Cancel page selected-chip fill — `bg-brand-subtle` or white with a brand border?
5. **Cross-document conflict:** this module's timeline has six steps including a separate *Goods
   received* and *Closed*; Buyer Dashboard SoT §3.4 says the tracker has no Goods received because
   receipt confirmation IS Closed. Which surface wins?
6. Arabic/RTL, dark, and breakpoint frames for this module.
7. `[ADD TOKEN]` pass, pending Figma inspect access.

**Status: FIXED — 19 of 19 actionable findings applied in both repos; awaiting visual sign-off and
the seven items above.**

---

## Screen 4 — Supplier Dashboard (verified first-run · rejected · pending · verified populated)

Route: `/supplier`.
Status: **FIXES APPLIED.** `tsc -b` and `npm run build` green in BOTH repos.

Authority is the **Supplier Dashboard Source of Truth v1.4 (12 Aug 2026)**. Where the frames and the
document disagree, the document wins — and it does disagree with them in three places, noted below.

### Applied

| # | Change | Source |
|---|---|---|
| B1/B2 | Greeting uses the **user's** name with a first-run/returning split, not the org name (which was also duplicated on the line beneath) | Figma + buyer parity |
| B3–B7 | **First-run verified state now exists**: hero · "Get started in 3 steps" · muted KPIs · My Bids empty state. Pipeline, action-required, tracker, suggestions and compliance are guarded, so a new supplier no longer sees six empty cards | Figma |
| B8/B9 | Step copy corrected; **"Get paid on delivery / instant settlement via escrow" removed** — payment is out of phase 1 and mimony records nothing about money | doc §5, v1.4 #3 |
| — | **Payments Received (MTD) tile removed** — deferred for phase 1, "do not compute". KPI row is now three tiles | doc §3.1, §6.1 |
| C1 | Rejected banner carries **Resubmit documents** (`VerificationBanner` gained an `action` slot); it resubmits every flagged document | Figma |
| C5/C6 | Muted `0%` → `0` on a count; accents reconciled between muted and live | Figma |
| E3 | Action-required gains the "N items need your response" subtitle and the `‹ Today ›` / "Swipe…" rail | doc §3.3 |
| E4/E5/E6 | Bolt icon dropped, secondary button `ghost` → `outline`, and **both row buttons now navigate** (`action.to` was already in the data) | Figma |
| E7 | Anonymous chip uses the slashed eye | Figma |
| E8–E12 | **Track order rebuilt**: it follows a purchase order from the orders store, shows the **five** phase-1 supplier stages (To review → Assign delivery → In fulfilment → Awaiting buyer → Closed) with no payment stage, is titled by PO number, and is hidden when there is no order. The buyer's name appears only once this supplier has accepted the PO | doc §3.4, §5.4, v1.4 #5 |
| E11 | Current step reads "Your action" | Figma |
| E14–E17 | "Suggested suppliers" → **Suggested RFQs**, region + category match only (no fit score), extra title icon dropped, button outlined and wired | doc §3.5, v1.4 #4 |
| E18/E20 | Manage → organisation profile; Help & support opens the real dialog (moved `HelpSupportDialog` to `shared/ui` so the shell and the dashboard share one) | — |
| E19 | Quick action "Submit Quote" → **Submit Bid** | doc §3.7 |
| — | Supplier bid status "Submitted" → **Bidding**, "Under negotiation" → **Negotiating** | v1.4 #1 |
| A1 | Sidebar reads **RFQs / Bids**; the pages keep their longer titles | Figma |
| D1 | Pending banner now names all three documents (CR, VAT, National Address) | Figma + doc §2 |

### Where the document overrides the frames

- **Payments Received (MTD)** is on all four frames; the document defers it. Tile removed.
- **Quick actions on a verified-but-empty account**: frame 1 shows the onboarding set, but §3.7 splits
  them on **verification**, not activity. A verified supplier gets Browse RFQs / Submit Bid /
  Track Orders / Help & support even on first run.
- **Track order** shows six bid-ish stages on the frame; §5.4 defines five order stages.

### Resolved NCs

NC-1 first-run = the supplier has no bids · NC-3 "Your action" (frame) over "Review and accept" ·
NC-4 the buyer is named only after this supplier accepts the PO — the later Negotiation & Orders v1.1
(13 Aug) puts the reveal at **acceptance**, superseding this document's §1 "until awarded".

### Still open

- **NC-2** rejected doc row: the frame shows the reason on CR and the meta on National Address; both
  are rendered. Needs a rule.
- The **buyer** dashboard's Help & support quick action has the same dead handler — out of this
  screen's scope, one line when its turn comes.
- No Arabic/RTL or breakpoint frames supplied.

**Status: FIXED — awaiting visual sign-off.**

---

## Screen 5 — Supplier Negotiation + SoT v1.1 alignment — audited & applied 2026-08-15

**Authority change.** The user declared *Negotiation and Orders — Source of Truth v1.1 (13 Aug 2026)*
the final authority, superseding earlier decisions, the Figma frames, and the existing build. Several
fixes applied on 14–15 August were reversed by it; those reversals are recorded below so nobody
re-applies them.

### Reversed by the document

| Applied earlier | Reversed to | Rule |
|---|---|---|
| "On goods receipt **(GRN)**" | "On goods receipt" | §4.1 — no abbreviations on screen |
| 6-step order timeline, `Goods received` + `Closed` separate | **5 steps**, merged, one timestamp (`closedAt`) | §2.3 |
| Ex-VAT unit prices, VAT added on subtotal | VAT-**inclusive** entered prices | v1.1 #2, §4, §15.1 |
| Partial receipt + editable qty + short-line warning | Read-only table, single "Confirm receipt" | §11 |
| "Request cancellation" on an in-transit order | Only while Awaiting supplier | §12, v1.1 #7 |
| Declined/Cancel: two radio options incl. "Close the RFQ" | **One** route, set by the request's award state | §9 |

### Applied this pass

| Rule | Change |
|---|---|
| §5 | Withdraw dialog: `noRejoin` and `reliability` bullets deleted (both untrue — they overstated how final and how punitive withdrawing is); replaced with "while this RFQ is still live you can simply bid again"; 20–500 counter now always visible |
| §5, §9 | "reliability record" removed from the decline note and the declined-order rail |
| §2.2 | The word **Void** eliminated — `status.void` → `declinedStatus`, "Voided purchase order" → "Declined purchase order", "voided {{date}}" → "declined {{date}}" |
| §4.1 | "(GRN)" removed from the goods-receipt trigger |
| §2.3 | Order timeline and the Buyer Dashboard tracker both cut to five steps: Order issued → Accepted by the supplier → Dispatched → Delivered → Received and closed |
| §11 | Receipt table made read-only; partial receipt, editable quantity, shortfall arithmetic and the short-line warning all removed; one "Confirm receipt" action |
| §11, §18 | Dispute flow deleted: `/buyer/orders/:id/report` route, `ReportIssuePage`, its barrel export and the "Report an issue" button |
| §12 | Cancellation gated to `awaiting_acceptance`; the in-transit "Request cancellation" button removed |
| §9 | Declined and Cancel screens now show ONE determined route — fully awarded → start a new request (old stays Awarded); partly awarded → returns to Live, "go to the current bids". No radios, no "Close the RFQ", no "previous bidders notified" |
| §1, v1.1 #1 | Supplier negotiations list: buyer now reads "Verified buyer · category · city" with an absent city dropped rather than left as a dangling separator. The real company name that leaked on won/closed rows is gone — reveal is on PO **acceptance**, and a closed negotiation was never accepted |
| — | Pre-existing parity defect fixed: Arabic `supplier.actions.submitQuote` vs English `submitBid` made the Arabic supplier dashboard render a raw key |

### Not applied — carried forward

1. **§2.1 five negotiation states** (Awaiting supplier / Awaiting you / Agreed / Awarded / Closed). Both
   lists and both room chips still use the three-status set. Large, and the supplier room is owned by
   another session.
2. **§2.2 missing order states** — `Accepted, awaiting dispatch` and `Expired` do not exist in
   `OrderStatus`; the model jumps Awaiting supplier → In transit and has no expiry.
3. **§12 cancellation as request→consent** — the buyer's cancel still cancels immediately instead of
   creating a request the supplier must consent to. `CancellationRequest` is modelled but unused.
4. **§1** — the buyer order conversation still offers both "View purchase order" and "View order".
5. **§3, §6** — supplier room "How this works": "any offer on the table" and "hidden until the buyer
   awards you" still wrong. File owned by the concurrent VAT session.
6. **§16** — five screens still to create (buyer/supplier order expired, cancellation answer, reopen,
   View single bid).
7. **§11** — help & support card has not been moved onto the order screens.
8. Dead i18n keys left in place (`receipt.confirmPartial`, `shortBy`, `balanceToFollow`, `outstanding`,
   `shortWarningFull`, `resolve.close`, `resolve.runnerUp`, `cancel.rfq.*`, `action.reportIssue`,
   `action.requestCancel`) — removing them risks colliding with the concurrent session.

**Status: PARTIAL — 11 rule groups applied in both repos, `tsc -b` green in both, all 271 keys
resolving in en + ar in both. Eight items carried forward.**

---

## Screen 5 — Supplier Orders (list · PO review · fulfilment · decline · cancellation · conversation)

Routes: `/supplier/orders`, `/supplier/orders/:id`, `/purchase-order`, `/decline`, `/cancellation`, `/conversation`.
Status: **FIXES APPLIED.** `tsc -b` and `npm run build` green in BOTH repos; all 20 order files and both
`order.*` i18n blocks byte-identical across them.

Authority is **Negotiation and Orders v1.1 (13 Aug)** + **Supplier Dashboard v1.4 (12 Aug)**. The user
confirmed the document wins on every conflict except the in-transit status word.

### Applied

| # | Change | Source |
|---|---|---|
| A1–A6 | **The amendment route is gone end to end** — the Request-a-change button and panel, `useRequestPoChange`, `ordersApi.requestPoChange`, the `changeRequestedAt`/`changeRequestNote` fields, the decline banner and its button, the `change.*` i18n block, and the reissue clauses in `acceptNote` / `acceptedNote` | §8: "No amendment of any kind exists. Every trace of it comes out" |
| F1 | **Cancellation re-gated to pre-acceptance.** `awaitingCancellationAnswer` now requires `awaiting_acceptance`, so a request on an accepted order can never resurface; the page redirects otherwise and its copy no longer assumes acceptance, dispatch or fulfilment. The seeded request moved off the dispatched order onto a new `awaiting_acceptance` one (PO-2026-0086) so both scenarios stay reachable | §12 / change #7 |
| E3/E4 | **"Void" removed from the product.** Consequence, resolved note, cancel copy, the two key names and the code comments all read Declined / cancelled / ended | §2.2 "The word Void is not used anywhere" |
| B3/F2/G4 | **The `ORD-…` second reference is off every screen** — list row, order header, cancellation header, conversation breadcrumb and subtitle all carry the PO number only | §1 "There is no second reference and no second record" |
| G2 | Conversation rail keeps **one** button; "View order" removed | §1 |
| B2 | In-fulfilment badge reads **In transit** | **user decision — Figma wins here** |
| — | Four distinct endings: `declined` and `expired` are their own stages/tabs instead of being filed under *Cancelled* | §5.4 |
| D3 | Dispatch and expected-arrival dates lock once saved | §10 / user |
| D6 | Shipment status is **derived, read-only** (Not dispatched → Dispatched, in transit → Delivered) — entering a dispatch date is what moves the order | §10 |
| D4 | An attached document is **replaced**, not removed | change #8 / §10 |
| H | Rail 340 → 320, matching the RFQ and negotiation screens | consistency |

### Verified already correct (frames are the stale artefact)

Five-step timeline with `receivedClosed` · VAT-**inclusive** totals via `priceTotals` · buyer masked
until acceptance on the list, parties card and conversation · decline gated to pre-acceptance ·
the reliability-record line already removed · the conversation counterparty card labelled **Buyer**
(frame says "Supplier") · the To-review row showing "Verified buyer" (frame prints real names).

### Still to build

§16 lists **Buyer — order expired** and **Supplier — order expired** as screens that must be created.
The `expired` status, stage and tab now exist and are labelled, but there is no seven-day acceptance
clock driving it and no dedicated screen.

**Status: FIXED — awaiting visual sign-off.**

---

## Screen 6 — SoT v1.1 enforcement: VAT, negotiation states, order states — 2026-08-15

The user made the document the final authority over the Figma frames and the existing build, and
directed three things specifically: VAT-inclusive everywhere, negotiation statuses to match, order
statuses to match. Where the Figma and the document disagree the document wins by its own rule —
"Design conflict means a screen does something this document does not agree with, and the screen has
to change" — which is what decided the negotiation vocabulary below.

### 1. VAT — inclusive, end to end (v1.1 #2, §4, §15.1)

The helper layer had already been flipped by a parallel session (`vat.ts` → `priceTotals`), but the
**seed was still authored ex-VAT**: every `agreedTotalSar` was `lineSum × 1.15`, so `orderTotals`
silently discarded it and fell back to the lines. Corrected each to its line sum, so the stored
headline and the lines agree by construction:

| PO | was | now |
|---|---|---|
| PO-2026-0088 | 101,200 | 88,000 |
| PO-2026-0089 | 11,040 | 9,600 |
| PO-2026-0074 | 288,500 | 280,800 |
| PO-2026-0081 | 412,000 | 411,996 |
| PO-2026-0083 | 409,400 | 356,000 |

Also corrected two seed comments that still described the net model. **Consequence to note: every
order headline drops ~13%** — that is the arithmetic of the inclusive rule applied to prices §7
blesses (2.75 / 3.30 / 4.00 / 46.21), and it means the Figma frames' 101,200 is now wrong, not the code.

Verified clean across both repos: no `withVat` / `vatOn`, no `× 1.15` anywhere, seed self-consistent.

### 2. Negotiation states — the five of §2.1

New `negotiate/negotiationState.ts` derives the five states per side, with whose-turn kept separate
from open/closed exactly as §15.1 asks (open/closed on the record; whose-turn from the offer array,
never stored, so a stored copy can never disagree with the offers it describes).

| stored | buyer sees | supplier sees |
|---|---|---|
| open, their turn | Awaiting supplier | Awaiting you |
| open, your turn | Awaiting you | Awaiting buyer |
| agreed | Agreed — issue the order | Agreed — waiting for the buyer |
| awarded | Awarded | Won |
| closed | Closed | Closed |

Both inboxes rewired to these five, with the §2 activity sentence now rendered beside every status.
The old Active / Awaiting you / Closed set is gone. The worst of it was that `agreed` had to be
smuggled in as "Awaiting you", which hid the most actionable thing on the buyer's page — a purchase
order waiting to be issued from terms already agreed.

### 3. Order states — the two §2.2 was missing

Added `accepted_awaiting_dispatch` and `expired` to `OrderStatus`, then followed the type errors
through every consumer: `statusMeta`, `isSupplierRevealed`, the buyer list (tabs, status key,
activity line), the buyer detail header, and the supplier's own vocabulary (`assignDelivery`,
`inFulfilment`, `expired`, `addDispatchDetails`).

Two related fixes: `isSupplierRevealed` now gates on **acceptance** (v1.1 #1) rather than listing
post-dispatch states, so the new accepted state reveals correctly; and `stageOf` had been filing
declined and expired under `cancelled` while its own new type declared them distinct.

Seeded one order in each new state (PO-2026-0087 accepted-awaiting-dispatch, PO-2026-0068 expired)
so both are reachable. STORE_KEY → `miproc.orders.v8`.

### Incidental defects found while verifying

- `order.supplierView.shipment.replace` existed only in Arabic; English had the retired `remove`, so
  the English supplier order page rendered a raw key. Corrected to `replace` per v1.1 #8.
- `rfq.supplier.pricesIncludeVat` was missing from both myapp locales.
- A duplicate `PO-2026-0086` I introduced clashed with the cancellation-requested seed; renumbered.

**Status: applied in both repos. `tsc -b` green in both; all 618 static keys plus the 20 dynamic
negotiation-state keys resolve in en and ar, in both repos.**

### Still outstanding against this document

1. §12 cancellation is still immediate — it must create a request the supplier consents to.
   `CancellationRequest` is modelled and seeded but the buyer's cancel does not use it.
2. §16 screens: buyer/supplier order expired, the supplier's answer to a cancellation request,
   reopen the request, View single bid.
3. §1 — the buyer order conversation still offers both "View purchase order" and "View order".
4. §3/§6 — supplier room "How this works": "any offer on the table" and "hidden until the buyer
   awards you".
5. §11 — help & support card has not moved onto the order screens.
6. §2.3 — the five-step bar is correct on the buyer side; the supplier's timeline was not re-checked.

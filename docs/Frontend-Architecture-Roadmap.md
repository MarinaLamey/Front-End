# MI-Proc Web Frontend — Architecture & Engineering Roadmap

> **Status:** Draft for ADR ratification · **Stack:** React 18 + TypeScript (Vite SPA) · **Source:** Sys. Architecture v1.2
> **Audience:** Frontend engineering team, Tech Lead, reviewing architects

This document refines the *Frontend Architecture Analysis & Roadmap (v1.2)* into an actionable engineering plan. It assumes the **authoritative architecture**: an asynchronous, event-driven backend (Kafka + Temporal sagas) fronted by a thin **BFF**, with a **.NET** service tier *behind* that BFF. The web client consumes the **BFF only**.

Claim tags are inherited from the source: **[MANDATE]** (binding, section-cited), **[CHOICE]** (a tool/technique we select), **[INFERENCE]** (an implication to ratify).

---

## 1. The frontend's job, in one paragraph

The client is a **presentation tier over an eventually-consistent backend**. A user action does not return its result — it fires a **command** that returns `202 Accepted`, and the truth arrives **later** as a domain event over a WebSocket (the Socket Service) or via a subsequent read-model query. Every business transaction is tracked by a client-minted **`correlationId`** that joins the accepted command to its eventual confirming/failing event. The three verbs are **initiate → observe → reconcile**, and **`pending` is a first-class UI state**, never an error.

```
┌────────────┐  1. POST command (+correlationId, +idempotencyKey)   ┌─────────┐
│   React    │ ───────────────────────────────────────────────────▶│   BFF   │──▶ Kafka ──▶ .NET services / Temporal saga
│  (client)  │ ◀─────────────── 2. 202 Accepted ────────────────────│         │
│            │                                                      └─────────┘
│  pending   │  3. domain event (confirm / fail / compensate)        ┌──────────────┐
│  registry  │ ◀──────────────────────────────────────────────────── │ Socket Svc   │ ◀── event backbone
│ (by corrId)│         (or 3b. read-model re-query as fallback)       └──────────────┘
└────────────┘
```

This single loop drives the entire data layer. Get it right and the rest is detail.

---

## 2. Frontend reference architecture (feature-based / vertical slices)

Two tiers: a thin **platform/core layer** (cross-cutting infrastructure every feature depends on) and **feature slices** (the product).

```
src/
├── app/                      # composition root: providers, router, error boundaries
├── platform/                 # cross-cutting infrastructure — the "frontend BFF SDK"
│   ├── bff/                  # single BFF base client (ETag/304, ProblemDetails, auth headers)
│   ├── command-bus/          # write path: mint correlationId + idempotencyKey, POST, return 202 handle
│   ├── saga-tracker/         # pending registry keyed by correlationId (the reconcile engine)
│   ├── socket/               # Socket Service client: ticket → connect → replay → backpressure
│   ├── auth/                 # OIDC/PKCE, token lifecycle, step-up MFA gate, RBAC primitives
│   ├── telemetry/            # OTel browser, traceparent propagation, CWV, SLO signals
│   ├── tenancy/              # tenant resolution, server-driven theming interpreter, feature flags
│   ├── sdui/                 # schema-version negotiation + screen-definition renderer
│   └── money/                # decimal-safe money type + formatting (NEVER JS float)
├── features/                 # vertical slices — see ISOLATION rules below
│   ├── auth/
│   ├── rfq/
│   ├── bidding/
│   ├── settlement/
│   ├── catalogue/
│   ├── procurement/
│   └── back-office/
└── shared/                   # design-system components, hooks, utils with NO feature knowledge
```

**Feature isolation rules (binding for the team):**
1. Every feature lives under `src/features/<feature>/` with its own `components/`, `hooks/`, `services/`, `types/`.
2. A feature exposes **only** its public surface via `index.ts`. Cross-feature imports go through the barrel, never deep paths.
3. Features depend **downward** on `platform/` and `shared/`, **never sideways** on another feature's internals. Cross-feature needs are an explicit contract or get lifted into `platform/`.
4. **BFF-first:** all I/O routes through `platform/bff` + `platform/command-bus`. No `fetch`/`axios` inside a feature.

---

## 3. The canonical command lifecycle (the contract every write follows)

This is the most important pattern in the codebase. Every mutating action implements it.

1. **Mint identity.** `command-bus` generates a `correlationId` (business transaction) and an `idempotencyKey` (this specific attempt) and registers a **pending entry** in `saga-tracker` *before* the request leaves.
2. **Optimistic apply (reversible).** Optionally apply an optimistic update to the TanStack Query cache, **tagged with the `correlationId`** so it can be resolved or rolled back. **Never** optimistically render a terminal money move (`ReleaseToSupplier`) as done.
3. **POST → expect `202`.** The 202 is an *acknowledgement of receipt*, not success. The UI moves to `pending`.
4. **Observe.** The `saga-tracker` waits for a domain event on the socket carrying the same `correlationId`:
   - **confirm** → resolve optimistic state, invalidate/refresh the relevant read model.
   - **fail / compensate** → roll back optimistic state, surface a typed, human-meaningful reason.
5. **Reconcile on gaps.** If the socket is down, a confirming event was missed, or the client just reconnected → fall back to a **read-model query** to learn the authoritative state. Never leave a transaction stuck in `pending` because an event was missed.

---

## 4. Gap analysis & integration bottlenecks (the value-add)

The roadmap is strong on *what* but leaves these **integration seams under-specified**. Prioritized by blast radius. Each becomes an ADR and/or a Phase task.

| # | Gap / risk | Why it bites | Recommended resolution |
|---|-----------|--------------|------------------------|
| **G1** | **Event/202 race & missed events.** A confirming event can arrive *before* the 202 returns or before the client subscribes; or be missed during a socket gap. | Transactions hang in `pending` forever; UI lies. | `saga-tracker` registers `correlationId` **before** POST; buffers early events; every pending entry has a **timeout → read-model reconcile** fallback. (Strengthens the roadmap's replay-buffer mandate.) |
| **G2** | **Async *failure* contract is undefined.** Roadmap details the happy path; the *fail/compensate* event shape per command is not specified. | Optimistic rollback with a blank "something went wrong" is unacceptable for money flows. | Define a typed **async failure envelope** (code, reason, compensatable?, retriable?) mirroring **RFC 7807 ProblemDetails** used for sync errors. Map each to UI copy. **Backend contract dependency.** |
| **G3** | **Money as JS `number`.** Roadmap never pins money representation; JS floats cannot represent currency. | Rounding errors in a SAMA-regulated ledger product = correctness + compliance failure. | Transport money as **string or integer minor-units**; client uses a decimal-safe `money/` type for **display only** (pairs with "cached balances are display-only"). **Backend contract dependency** (.NET `decimal` → string). |
| **G4** | **Client idempotency beyond offline.** Roadmap scopes idempotency keys to offline replay; double-clicks/retries online double-submit. | Double-charge risk (Principle 4) starts at the button. | **Every** command carries a client `idempotencyKey`; disable-on-submit + dedupe in `command-bus`. Replaying same key must not double-effect UI (already a test mandate §18.2). |
| **G5** | **Socket ticket ↔ token refresh choreography.** WS ticket ≤60s single-use; access token ≤15 min. Their interaction during refresh/expiry isn't specified. | Thundering-herd reconnects on token expiry; dropped live bids/chat. | Define ordered **refresh → new ticket → reconnect** with exponential backoff + jitter; on reconnect, replay from last-seen sequence then reconcile pending. |
| **G6** | **Degraded mode (no socket) is only defined for backpressure.** | Socket loss is normal on mobile/flaky networks; needs a general fallback, not an error screen. | Define a **degraded mode**: rate-limited ETag/304 polling of read models as the universal push fallback, with a visible "live updates paused" affordance. |
| **G7** | **Read-your-writes gap.** After 202 the read model may not yet reflect the change. | User submits an RFQ, navigates to the list, doesn't see it → files a bug. | Optimistic cache insertion keyed by `correlationId`, reconciled on the confirming event; show a subtle `pending` badge on the optimistic row. |
| **G8** | **Multi-tab / multi-device coherence.** `correlationId` minted in tab A is unknown to tab B; two sockets per user. | Duplicate sockets, split-brain pending state across tabs. | One socket via **SharedWorker/BroadcastChannel**; broadcast saga-tracker updates across tabs. Ratify in an ADR. |
| **G9** | **Three versioning systems don't compose.** SDUI schema negotiation, per-tenant `ConfigEntry` flags, and config-version pinning are independent. | A pinned in-flight workflow may need an older screen schema than the app negotiated. | A single **capability/version context** provider resolves {schema version, tenant flags, pinned config version} and exposes one hook. |
| **G10** | **Tenant bootstrap order vs theme-flash.** Theming is server-driven, but `tenantId` source on first paint isn't defined. | FOUC / wrong-brand flash; LCP regression (a CWV obligation). | Resolve tenant from **host/subdomain** pre-auth; prefer **edge-injected CSS variables** for first paint; reconcile with the JWT tenant claim post-auth. |
| **G11** | **Socket Service protocol unspecified: SignalR vs raw WS.** Ticket+sticky-LB+sequence-numbers smells bespoke, not stock SignalR. | Wrong client library = rework; SignalR's own reconnect fights our replay logic. | **Decide with backend now.** If raw WS, own the protocol; if SignalR, configure custom ticket auth and disable its auto-reconnect in favor of our replay buffer. **ADR + backend contract.** |
| **G12** | **`correlationId` (business) vs `traceId` (request) cardinality.** Roadmap propagates both but doesn't define the relationship. | One business transaction spans many requests/socket frames; conflating them breaks tap-to-ledger tracing. | **1 `correlationId` : N `traceId`.** Mint `correlationId` at the business-action boundary; `traceparent` per request. Document in telemetry module. |
| **G13** | **Client RBAC is UX-only.** Route-level RBAC from JWT must not be mistaken for enforcement. | A hidden button is not a closed door; BFF must re-check. | Declarative permission model per portal×role; treat client gating as UX, assert BFF re-authorizes in contract tests. |

---

## 5. ADR backlog (ratify before code hardens)

Per the source, every **CHOICE/INFERENCE** needs an ADR + Defense-of-Design row. Open the following:

| ADR | Decision | Recommendation |
|-----|----------|----------------|
| ADR-001 | Bundler | **Vite** (fast HMR, simple SPA). |
| ADR-002 | Router | TanStack Router (type-safe, validated search params — good for catalogue/RFQ search) **vs** react-router (already scaffolded). *Recommend TanStack Router; react-router is acceptable.* |
| ADR-003 | Server-cache | **TanStack Query** with mandated ETag/304 support. |
| ADR-004 | Client/UI + saga state | **Zustand** for transient UI + the `saga-tracker` store keyed by `correlationId`. |
| ADR-005 | Token transport | Header-bearer (XSS-exposed) vs HttpOnly cookie (**requires CSRF defense** the doc never specifies). *Decide deliberately; document the trade.* |
| ADR-006 | Socket protocol | SignalR vs raw WS (**G11**) — joint with backend. |
| ADR-007 | Mocking | **MSW v2** emulating OpenAPI (sync) **and** the two-phase async pattern (202 + delayed socket event). |
| ADR-008 | Money type | String/minor-units + decimal-safe display lib (**G3**). |

---

## 6. Phased delivery — mapped to sprints with Definition of Done

> Phases are sequential in dependency but the platform layer (Phase 1–2) must stabilize before feature teams scale onto it.

### Phase 1 — Architecture Setup & Security Baseline
- **[MANDATE/CHOICE]** Scaffold React 18 + TS (Vite), **TS strict mode** on. ✅ *(done)*
- **[MANDATE]** Single **BFF base client** — every call through CDN/WAF→Gateway→BFF; ETag/304; ProblemDetails parsing.
- **[MANDATE]** **OIDC + PKCE** against Keycloak/Nafath; access token ≤15 min, refresh + revocation; secure storage; no secrets in client.
- **[MANDATE]** **Step-up MFA gate** reacting to the backend `risk_score` claim (money movement, bank-detail changes, back-office).
- **[INFERENCE/CHOICE]** Routing + **route-level RBAC** for the four portals × role matrices.
- **DoD:** a protected route requires login; a high-risk action triggers step-up; all network I/O demonstrably flows through the single BFF client; CI generates TS types from the BFF OpenAPI.

### Phase 2 — Core State Management & Real-Time Sync *(the critical phase)*
- **[CHOICE/INFERENCE]** Three-store model: server-cache (TanStack Query) ‖ transient UI (Zustand) ‖ **saga-tracker** keyed by `correlationId`.
- **[MANDATE]** **Command bus** implementing §3's lifecycle, incl. client `idempotencyKey` (**G4**) and the early-event/missed-event reconcile (**G1**).
- **[MANDATE]** **Socket client**: single-use ticket → sticky-LB connect → node-loss rebalancing → **sequence-number replay** → **backpressure drop→refetch**.
- **[MANDATE]** **Push-over-poll**; **degraded mode** fallback (**G6**).
- **[INFERENCE]** Reversible optimistic UI keyed by `correlationId` (**G7**); never pre-confirm terminal money moves.
- **DoD:** a demo command shows 202→pending→confirm via socket; killing the socket reconciles via read-model; replaying a command twice yields one effect.

### Phase 3 — Dynamic Multi-Tenancy & Layout UI
- **[MANDATE]** Server-driven **theming interpreter** (`palette_json`/`copy_json`/`logo_uri`) applied at runtime; tenant bootstrap order to kill theme-flash (**G10**).
- **[MANDATE/CHOICE]** **SDUI schema-version negotiation** (header name is ours) + renderer.
- **[MANDATE]** Per-tenant **feature flags & limits** (`ConfigEntry`); config-version pinning surfaced where it matters; unified capability/version context (**G9**).
- **DoD:** two tenants render distinct branding with no flash; a flag toggles a feature per tenant; an in-flight approval shows its pinned config version.

### Phase 4 — Observability & Performance Enforcement
- **[MANDATE]** **OTel browser** → Elastic APM; **traceparent** propagation; `correlationId`:`traceId` = 1:N (**G12**); **CWV** + SLO-aligned client signals.
- **[CHOICE/INFERENCE]** **List virtualization** (bid lists, catalogue) + **debounced invalidation** — framed against **INP/CWV**, *not* the BFF's P99 ≤ 800ms (different budget).
- **DoD:** a single user action is traceable tap→ledger in APM; a 5k-row bid list holds 60fps; CWV reported to backend.

### Phase 5 — Contract-First Testing & Mocking Layer
- **[CHOICE]** **MSW** emulating OpenAPI **and the two-phase async pattern** (mock 202 + delayed socket event keyed by `correlationId`) — *the single most important thing the mock must get right.*
- **[MANDATE]** Consumer **contract tests** (read models + command envelopes); **idempotency** scenarios; **tenant-isolation** assertions (no foreign-tenant leakage).
- **DoD:** the app runs fully against mocks with realistic async delays + injectable failures; contract tests gate CI; a tenant-leak test fails loudly if a projection crosses tenants.

---

## 7. Cross-cutting best practices

**State management.** Strictly separate the three concerns. Server data is *cache*, not state — let TanStack Query own it (staleTime, ETag/304, background refetch). Zustand holds only transient UI/session. The `saga-tracker` is its own store because in-flight business transactions outlive any single component and must survive route changes.

**Data fetching from the BFF.** Reads: TanStack Query with conditional requests (ETag/304) on the expensive endpoints (ledger balance, catalogue/RFQ search). Writes: never call `fetch` directly — go through the command bus, treat `202` as "accepted," and let the socket/reconcile loop produce truth. Generate TS types from the BFF's OpenAPI in CI so the schema registry governs client types (no hand-typed DTOs).

**Auth flow.** Authorization Code + PKCE against Keycloak; Nafath federated for step-up. Keep the access token in memory (refresh on a timer/401), gate sensitive actions through the step-up MFA component driven by `risk_score`. The socket uses a **separate** single-use ticket — never the access token.

**Performance (RAIL / 60fps).** Code-split per portal and per feature (`React.lazy` + route-based chunks). Virtualize high-cardinality lists; debounce search and the invalidations it triggers. Apply tenant theming via CSS variables (ideally edge-injected) to protect LCP. Keep INP low by moving non-urgent updates off the interaction path (`useTransition`, batched socket-event application). Remember the budgets are different: **P99 ≤ 800ms is the BFF's**, INP/CWV is ours.

**Testing.** Contract-first. The mock layer must reproduce eventual consistency or the whole team builds against a synchronous illusion the backend never provides.

---

## 8. React ↔ .NET (via BFF) integration contract checklist

These are joint decisions to confirm with the backend team — the client can't finalize its data layer without them:

- [ ] **OpenAPI** (sync) **+ AsyncAPI** (events) published and versioned; client generates types in CI (§6.3).
- [ ] **Error envelope:** RFC 7807 **ProblemDetails** for sync; a defined **async failure envelope** for saga failures (**G2**).
- [ ] **Money:** `decimal` serialized as **string/minor-units**, never float (**G3**).
- [ ] **JSON conventions:** camelCase, `DateTimeOffset` as ISO-8601 UTC, enums as strings.
- [ ] **Socket protocol:** SignalR vs raw WS; ticket issuance endpoint; sequence-number + replay semantics; backpressure signal shape (**G11**).
- [ ] **Idempotency:** header name + server dedupe window; confirm replay-safe (**G4**).
- [ ] **Correlation:** `correlationId` minted client-side, echoed on every event; `traceparent` accepted at the gateway (**G12**).
- [ ] **RBAC:** JWT role claims per portal; confirm BFF re-authorizes server-side (**G13**).

---

*Everything tagged CHOICE/INFERENCE above is defensible engineering, not yet a requirement — ratify via ADR + Defense-of-Design row before it hardens.*

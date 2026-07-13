# Onboarding & Auth Alignment Plan — HLD v1.0

Aligns the frontend with **Mi-Proc HLD v1.0 (June 2026)** — "Organization Registration,
Onboarding & User Management". The HLD is **authoritative** where it conflicts with the
current code. Build order follows the established sequence: tenancy → **auth** → buyer →
supplier. Everything is **mock-first** against contracts shaped by the HLD DB tables
(Organization Master, Buyer/Supplier Profile, User, Audit).

## Authoritative decisions (resolved)

- **No per-role PIN.** Dual-role = **post-login dashboard CONTEXT selection** ("Continue as
  Buyer / Supplier"), gated by normal password/OTP login — not a 6-digit role PIN.
- **Auth methods = Email/Mobile + Password, and OTP verification.** MFA/SSO are future.
  **Nafath and Google sign-in are out of scope for now** — park the components behind a flag,
  don't surface them in the primary flow.
- **Dual-role CR/VAT UX:** default to **one shared CR/VAT** for both roles; add a toggle
  ("Use different CR/VAT for Supplier") that reveals the second set of fields when needed.
- **OTP channel:** default to **whatever the user registered with** (email or mobile) to
  reduce friction.

---

## Phase 1 — Remove superseded auth (cleanup, lowest risk)

- Delete the **PIN step**: remove `RolePinCard` + `useRolePinCard`; drop the `'pin'` state
  from `useLoginFlow` / `LoginPage`.
- `ContinueAsCard.onSelect` now sets the **dashboard context** and routes straight to that
  dashboard (no PIN gate).
- **Park federated sign-in**: hide the Nafath + Google + phone buttons in `CredentialsCard`
  behind a flag (`SHOW_FEDERATED_SIGN_IN = false`); keep `NafathSignIn` / `useGoogleSignIn`
  dormant so they're re-addable. Login = email/mobile + password.

## Phase 2 — Registration form → HLD fields

- Update `RegisterValues` schema + `RegisterPage`: **Organization Name, CR Number, Mobile
  Number, Email, Password, Confirm Password**, and a **3-way role** (Buyer / Supplier /
  **Buyer & Supplier**) — role cards currently offer only two.
- Add CR + KSA-mobile + confirm-password validation. `useRegisterForm` stops calling
  `login()`; it advances to **OTP**.

## Phase 3 — OTP verification step

- New `OtpVerifyCard` + `useOtpVerify`: 6-digit entry, **defaults to the channel the user
  registered with** (email or mobile), resend countdown (mitigates the HLD "OTP delivery
  failure" risk). Mock-first. Success → profile wizard.

## Phase 4 — Organization Profile wizard

- Multi-section wizard rendering a **Buyer Profile and/or Supplier Profile** by chosen
  role(s): Address/City/Country, VAT, CR, official email, mobile, registration/expiry dates,
  product categories, supplier type.
- Reuse `ValidationCard` for **CR Validate / VAT Validate** (manual/mock until the regulatory
  middleware lands).
- **Dual-role CR/VAT:** one shared CR/VAT by default + a "Use different CR/VAT for Supplier"
  toggle revealing the second set; shared registration info synced across both profiles.
- Submit → validate mandatory fields → status **Active** → dashboard.

## Phase 5 — RBAC role model

- Expand the role type beyond `buyer | supplier` to include **Organization Admin, Platform
  Admin**, plus the admin-vs-standard-user split; carry role in the auth context and gate
  routes accordingly.

## Phase 6 — User Management module (post-auth)

- New `features/users` slice: list (cap **5/org**), add/modify/remove user (User Name, Email,
  Password, Mobile, Department, Product Category, Assigned Role). Internal users → **no OTP**.
  Org-Admin-gated.

## Phase 7 — Dashboards (post-auth)

- Replace the placeholder with **Admin / Buyer / Supplier** dashboards and their HLD widgets
  (RFQ summary, POs, Payments, user counts).

---

## Status

- [x] Decisions resolved · memory updated (`onboarding-hld`, `rbac-roles`, `dual-role-auth`)
- [x] Mock backend foundation (`src/platform/api`, in-process typed service, magic-value errors) — see `docs/mock-backend.md`
- [x] Phase 1 — remove superseded auth (PIN gone; Nafath/Google parked behind a flag)
- [x] Phase 2 — registration HLD fields (Org Name, CR, Mobile, Confirm Password, 3-way role) wired to `api.register`; login wired to `api.login`
- [x] Phase 3 — OTP step (`useOtpVerify` + `OtpVerifyCard`) wired to `api.verifyOtp`/`resendOtp` with resend countdown; OTP channel chosen on the register form (email/mobile)
- [x] Phase 4 — org-profile wizard (`useOrgProfile` + `OrgProfileWizard`): Buyer/Supplier sections, CR/VAT validate (auto-fills city + dates), shared-vs-separate CR/VAT toggle, `api.submitProfile` → Active → dashboard
- [ ] Phase 5 — RBAC roles **(next)**
- [ ] Phase 6 — user management
- [ ] Phase 7 — dashboards

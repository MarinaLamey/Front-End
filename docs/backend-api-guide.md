# Backend Integration Guide — Auth & Onboarding

How the **login** and **register** flows talk to the backend. This is the hand-off doc for the
backend team: it maps every frontend expectation to an endpoint they must implement.

> **Single source of truth:** `src/platform/api/contracts.ts` — the `OnboardingApi` interface
> (13 methods with exact request/response TypeScript types). The endpoints below are the REST
> shape of those methods.

---

## 1. The model

The frontend never calls URLs directly. It calls **one interface — `OnboardingApi`**. Today a
**mock** (`src/platform/api/mock`, backed by `localStorage`) fulfils it so the UI can be built
offline. The backend's job is to implement the **same methods as REST endpoints** (the BFF).
Swapping mock → real is **one line** in `src/platform/api/index.ts` and touches zero components.

### Rules for every endpoint

- **HTTPS + JSON, all async.**
- **Passwords:** sent as **plaintext over TLS**. The **server** hashes them (bcrypt / argon2 /
  scrypt, salted). The frontend does **no** hashing — that's by design (client-side hashing would
  create a pass-the-hash problem).
- **Errors:** return a non-2xx status with a typed body the UI maps to the right field:
  ```json
  { "code": "INVALID_CREDENTIALS", "message": "Incorrect email or password.", "field": "password" }
  ```
  Error codes in use:
  `ACCOUNT_NOT_FOUND`, `INVALID_CREDENTIALS`, `EMAIL_EXISTS`, `MOBILE_EXISTS`, `CR_EXISTS`,
  `OTP_INVALID`, `OTP_EXPIRED`, `OTP_RESEND_THROTTLED`, `CR_NOT_FOUND`, `VAT_NOT_FOUND`,
  `VALIDATION_FAILED`, `NOT_FOUND`.
- **Roles:** `roles` is always an array of `'buyer' | 'supplier'` (an org can be both).
  Back-office roles are admin-provisioned, never via self-service.

---

## 2. LOGIN

### A) Password login

```
POST /auth/login
Body:  { identifier, password }          // identifier = email OR mobile
200:   { orgId, roles }                  // roles: ('buyer'|'supplier')[]
Err:   ACCOUNT_NOT_FOUND | INVALID_CREDENTIALS
```

On success the frontend starts the session and routes to the (first) role's dashboard.

### B) Passwordless login (phone / email OTP)

```
POST /auth/login/otp/request
Body:  { identifier }                    // registered email or mobile
200:   { orgId, channel, expiresAt, resendAvailableAt }
       // server SENDS the code out-of-band; the response NEVER contains the code

POST /auth/login/otp/verify
Body:  { orgId, code }
200:   { orgId, roles }
Err:   OTP_INVALID | OTP_EXPIRED
```

- `channel` = `'email' | 'mobile'`.
- `expiresAt` / `resendAvailableAt` are **epoch-ms** timestamps — they drive the on-screen
  countdown and the "Resend" gate.

### ⚠️ Gap — password reset

The **forgot / reset-password** screens exist in the UI but are **mock-only** (not in the
contract yet). The backend will also need:

```
POST /auth/password/reset/request   { identifier, channel }   → send a code
POST /auth/password/reset/verify    { identifier, code }      → OK
POST /auth/password/reset/confirm   { identifier, code, newPassword }  → OK
```

---

## 3. REGISTER — the 6-step wizard

Steps: **1** Account → **2** Verify phone → **3** Verify email → **4** Company (CR/VAT) →
**5** Address → **6** Review. The wizard collects everything **locally** and calls the backend at
two points today, with more to wire in (see §4).

### 3.1 Uniqueness check (fail-fast)

Called on **step 1** Continue (email + mobile) and **step 4** Continue (CR), so a taken value is
caught at the step that owns it — not at final submit.

```
POST /onboarding/check-availability
Body:  { email?, mobile?, cr? }          // send only the fields to check
200:   { email?: 'available'|'taken', mobile?: …, cr?: … }   // only queried fields returned
```

### 3.2 Final submit (creates the org)

Called at **step 6** Review — submits every field at once.

```
POST /onboarding/register
Body:  {
         roles,                 // ('buyer'|'supplier')[]
         email, mobile, password,
         organizationName,
         cr,                    // 10 digits
         vat,                   // 15 digits
         address, city, country,
         registrationDate, expiryDate,   // from CR validation (see §4)
         productCategories      // string[]
       }
200:   { orgId }
Err:   EMAIL_EXISTS | CR_EXISTS           // server re-checks — protects against a mid-session race
```

> Field lengths the server must re-validate: **CR = exactly 10 digits**, **VAT = exactly 15
> digits**, both digits-only. Full name / city / district / street are **letters only** on the
> client; the server should validate too.

---

## 4. Still mocked in register — the real integration work

The current 6-step wizard **does not yet hit the backend** for these; they're local mocks. These
are the priority items for the backend + a later frontend wiring pass.

| Feature | Where | Contract method | Backend must build |
|---|---|---|---|
| **Phone/email OTP** (steps 2 & 3) | `VerifyStep` uses local code `1234` | `register` / `verifyOtp` / `resendOtp` exist (older flow) | Send + verify an OTP **per channel** (phone, then email). |
| **CR validation (WATHQ)** (step 4) | length-checked only today | `validateCr(cr)` | Real CR lookup → `{ cr, organizationName, city, registrationStatus, registrationDate, expiryDate }` |
| **VAT validation (ZATCA)** (step 4) | length-checked only today | `validateVat(vat)` | Real VAT lookup → `{ vat, organizationName, city, country, vatRegistrationDate, vatRegistrationStatus }` |
| **CR/VAT certificate upload** (step 4) | only the **filename** is kept; the file is **discarded** | **none** | A `multipart/form-data` upload (or a pre-signed URL to object storage), returning a file id/URL to store on the org. |

Suggested OTP endpoints for the wizard:

```
POST /onboarding/otp/request   { orgId?, channel, destination }   → { channel, expiresAt, resendAvailableAt }
POST /onboarding/otp/verify    { orgId?, channel, code }          → { ok: true }
```

---

## 5. The full `OnboardingApi` surface (contract)

Every method the frontend depends on. `Promise` rejections are always the typed error in §1.

| Method | REST shape | Purpose |
|---|---|---|
| `checkAvailability(query)` | `POST /onboarding/check-availability` | Fail-fast email/mobile/CR uniqueness |
| `completeRegistration(input)` | `POST /onboarding/register` | Create org from the full wizard payload |
| `register(input)` | `POST /onboarding/register-basic` | (Legacy single-step) create org + issue first OTP |
| `verifyOtp(orgId, code)` | `POST /onboarding/otp/verify` | Verify a registration OTP |
| `resendOtp(orgId)` | `POST /onboarding/otp/resend` | Re-issue a registration OTP |
| `submitProfile(orgId, profile)` | `POST /onboarding/{orgId}/profile` | (Legacy) attach buyer/supplier profile |
| `login(identifier, password)` | `POST /auth/login` | Password login |
| `requestLoginOtp(identifier)` | `POST /auth/login/otp/request` | Send passwordless-login OTP |
| `verifyLoginOtp(orgId, code)` | `POST /auth/login/otp/verify` | Verify passwordless-login OTP → session |
| `validateCr(cr)` | `POST /onboarding/validate-cr` | WATHQ CR lookup |
| `validateVat(vat)` | `POST /onboarding/validate-vat` | ZATCA VAT lookup |

> Endpoint **paths are a suggestion** — the backend owns the real routes; the frontend adapts in
> the single `httpApi` client at `src/platform/api`. What must match exactly are the **request /
> response shapes** and the **error codes**, which are pinned in `contracts.ts` and `errors.ts`.

---

## 6. Reference — key types (from `contracts.ts`)

```ts
type OnboardingRole = 'buyer' | 'supplier'
type OtpChannel     = 'email' | 'mobile'
type OrgStatus      = 'pending_otp' | 'pending_profile' | 'active'

interface LoginResult      { orgId: string; roles: OnboardingRole[] }
interface OtpChallenge     { orgId: string; channel: OtpChannel; expiresAt: number; resendAvailableAt: number }
interface AvailabilityQuery  { email?: string; mobile?: string; cr?: string }
interface AvailabilityResult { email?: 'available'|'taken'; mobile?: …; cr?: … }

interface CompleteRegistrationInput {
  roles: OnboardingRole[]
  email: string; mobile: string; password: string
  organizationName: string
  cr: string; vat: string
  address: string; city: string; country: string
  registrationDate: string; expiryDate: string
  productCategories: string[]
}
```

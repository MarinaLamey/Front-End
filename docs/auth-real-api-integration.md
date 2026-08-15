# Auth + Onboarding — Real API Integration (COMPLETE)

**Scope:** register · phone/email verification · login (email + SMS) · onboarding · password reset ·
logout.
**Repo:** `myapp-frontend-new` **ONLY** (MI-Proc stays mock — see CLAUDE.md §3).
**Status:** ✅ Complete, signed off 2026-08-10, pushed to GitLab `dev`. **Do not modify** without an
explicit request (CLAUDE.md Constraint #8).
**Backend:** `https://dev-miproc-api.mitechnologies.org`, called same-origin as `/api`.

---

## 0. Transport & session model

`src/platform/http/apiClient.ts` — one axios instance for everything:

```ts
axios.create({ baseURL: '/api', withCredentials: true,
               headers: { 'Content-Type': 'application/json' } })
```

**Web auth = HttpOnly cookies, NOT bearer.**

| Cookie | TTL | Path | Flags |
|---|---|---|---|
| `access_token` | **8 h** (28800s) | `/` | HttpOnly · Secure · SameSite=Strict |
| `refresh_token` | **30 d** (2592000s) | `/api/auth/refresh` | HttpOnly · Secure · SameSite=Strict |

- The login response body's **`token` / `refreshToken` are EMPTY on purpose.** That is **not** a
  failure. The same backend serves Flutter, which uses the Bearer token; **web must stay cookie-first.**
- A request interceptor attaches an in-memory bearer *only if* one exists (mobile-shaped fallback).
  Nothing is ever written to localStorage/sessionStorage → no XSS token exposure.
- **401 → single-flight refresh → replay.** `refreshSession()` posts `/auth/refresh` on a **bare**
  client (no interceptors) so a failing refresh can't recurse. Concurrent 401s share one in-flight
  promise (refresh-token rotation would otherwise invalidate each other).
- After a failed refresh: **401/403 → full client sign-out** (guards redirect to `/login`);
  **network/5xx → keep the session**, just drop the token (don't sign out on a blip).
- **`NO_REFRESH` set** — anonymous endpoints where a 401 is a real answer, not an expired token:
  `login, register, verify-email, verify-otp, forgot-password, verify-password-reset, reset-password,
  resend-otp-sms, resend-otp-email, send-otp, social-login, logout`.

---

## 1. Register

`POST /api/auth/register` — anonymous. Creates the account **and auto-sends both OTPs**.

```jsonc
// RegisterRequest
{ "phoneNumber": "+9665XXXXXXXX", "email": "...", "password": "...",
  "fullName": "...", "userConsent": true }
```
```jsonc
// RegisterResponse
{ "token": "...", "user": { "id","email","phoneNumber","fullName","role" },
  "isPhoneVerified": false, "isEmailVerified": false, "message": "...",
  "tokenStatus": "PendingVerification",
  "codeForDevelopment": "1234",          // dev-only echo of the SMS code — NEVER render in prod
  "sendStatus": { "smsSent": true, "emailSent": true, "smsError": null, "emailError": null } }
```

- `tokenStatus` ∈ `Valid | PendingVerification | None`. Register returns **PendingVerification**;
  the body token is a throwaway. The account is committed at phone verify-otp.
- **Duplicate email/phone → `409`** → mapped to `auth.errors.emailExists`.
- **Password policy: ≥8 chars with uppercase + lowercase + digit + special** (`isStrongPassword`
  in `shared/lib/validators.ts`; enforced on register **and** reset).
- Re-registering an unverified account re-stages it; rate-limited with `400 "Please wait…"`.
- `UserRole` ∈ `Admin | Requester | Approver | Buyer | Supplier | BuyerAndSupplier`.

## 2. Verification (phone, then email)

**Phone — `POST /api/auth/verify-otp`**
```jsonc
{ "phoneNumber": "+9665…", "purpose": "Register", "code": "1234" }   // → { success, message }
```
- SMS code = **4 digits**, valid **5 min**, 60 s resend cooldown.
- **Failure is a soft `200 {success:false}`** (invalid / expired / max-5-attempts) — the UI only
  treats `success === true` as verified.

**Email — `POST /api/auth/verify-email`**
```jsonc
{ "email": "...", "verificationCode": "123456" }
```
- Email PIN = **6 digits**, valid **15 min**. **Failure is a hard `400`** (different from phone).
- The email code is **never dev-echoed** — a real inbox is required for E2E.

**Resend — `POST /api/auth/resend-otp-sms` | `/auth/resend-otp-email`**
`{ phoneNumber|email, purpose }` → `{ success, message, retryAfterSeconds, codeForDevelopment, status }`
- **Throttling returns `200 {success:false, retryAfterSeconds:N}`** — the UI uses **N** as the
  cooldown instead of the default 60 s, and does not show a hard error.
- There is **no `send-otp` for resend**; `send-otp` exists only for the SMS-login purpose.

**Order is enforced:** email verification only runs after phone verification, and login requires
**both** verified.

## 3. Login

**Email — `POST /api/auth/login`**
```jsonc
{ "method": "Email", "email": "...", "password": "..." }
```
**SMS — two calls**
```jsonc
POST /api/auth/send-otp   { "phoneNumber": "+9665…", "purpose": "Login" }
POST /api/auth/login      { "method": "Sms", "phoneNumber": "+9665…", "otpCode": "1234" }
```
Both return `AuthResponse { token, refreshToken, user }` — **token/refreshToken empty**; the session
is the Set-Cookie pair. `LoginMethod` ∈ `Email | Sms`.

**Failures = `401 ProblemDetails`:** `"Invalid email or password."`, `"Phone number not verified…"`,
`"Invalid OTP code."`, `"Invalid phone number."`

**`GET /api/auth/me`** — cookie-authed (no bearer), returns `UserDto`. Used to restore a session on a
fresh tab whose per-tab store is empty but whose cookie is still valid.

### Post-login routing (`useResolveAfterLogin.ts`)
1. `SuperAdmin` → `/admin/verifications`.
2. Otherwise `GET /onboarding/resume`, then branch on `status`:
   - **`Completed` or `Ready`** → establish the portal session → `/{portal}` dashboard.
     (`Ready` = form submitted, KYB still under review → limited dashboard.)
   - **`PendingVerification` / `InProgress`** → `/register` with the profile in route state; the
     wizard opens at the backend's **`currentStep`** (the source of truth).
   - **Failed resume never lands on a dashboard**: `401/403` → clear token → `/login`; transient → `/login`.
3. Role → portal: `Requester`/`Approver` operate in the **buyer** portal; `BuyerAndSupplier` gets both
   memberships (drives the Buyer/Supplier toggle).

## 4. Onboarding

| Call | Purpose |
|---|---|
| `GET /api/onboarding/resume` | The full profile + **`currentStep`** + `status` + `requiresOnboarding` |
| `GET /api/onboarding/cities` | `{id, name_en, name_ar, displayOrder}[]` for the city picker |
| `POST /api/onboarding/documents/{documentType}` | multipart, field name **`file`** → `{documentType, documentId, uri, contentType, size}` |
| `PUT /api/onboarding/review` | Persists text + document ids |
| `POST /api/onboarding/submit` | No body → `{message, onboarding}` |

- `documentType` ∈ `CommercialRegistrationCertificate | VatCertificate | NationalIdCertificate |
  NationalAddressCertificate`. The returned `documentId` is a `gs://…` URI carried in the review body
  (no binaries in review).
- **Lifecycle:** `PendingVerification` → `InProgress(currentStep)` → `Ready` → `Completed`.
- **Save on ENTRY to each step** — the backend accepts *partial* `/onboarding/review` saves, so a
  drop-out resumes exactly where it left off.
- City is sent **by name** (`city` = English, `cityNameArabic`), not by id.
- `accountType` ∈ `Buyer | Supplier | Both` — this is what grants the portal memberships.

### Backend validation rules (discovered by live test, mirrored in the FE)
| Field | Rule |
|---|---|
| `currentStep` | **1–5** — sending 6 is rejected ("Current step must be between 1 and 5") |
| `commercialRegistrationNumber` | exactly **10 digits** |
| `vatNumber` | exactly **15 digits, starting and ending with 3** |
| `unitNumber`, `buildingNumber`, `additionalNumber` | exactly **4 digits** |
| `postalCode` | **5 digits** |
| `addressLine1` / `addressLine2` | must be composed & non-empty — FE builds them: `addressLine1 = [buildingNo, street].join(' ')`, `addressLine2 = [district, city].join(', ')` |

> ⚠️ **CR/VAT format is validated, but registry EXISTENCE (WATHQ/ZATCA) is NOT** — a fake but
> format-valid CR reached `Completed`. Confirm with backend whether real-registry lookup is intended.

## 5. Password reset — 3 steps (backend-confirmed twice)

```jsonc
1) POST /api/auth/forgot-password
   { "method": "Email"|"Sms", "email"?, "phoneNumber"? }
   → { message, codeForDevelopment }             // dev-only echo

2) POST /api/auth/verify-password-reset
   { "method": "Email", "emailVerificationPin": "123456", "email": "..." }
   // NB: the code field differs per channel — Email → `emailVerificationPin`, Sms → `code`
   → { message, resetToken }

3) POST /api/auth/reset-password
   { "resetToken": "...", "newPassword": "..." }
```
- Email PIN 6 digits · SMS code 4 digits.
- Resend during reset = **re-call `forgot-password`** (not the resend endpoints).
- New password uses the **same** strength rule as register.

## 6. Logout

`POST /api/auth/logout` — cookie-authed, `withCredentials`.
**Fully secure** (backend confirmed 2026-08-10): blacklists the access JWT, revokes the refresh token
(`RefreshTokenRevokedAt` → any later `/auth/refresh` → 401), and clears **both** cookies.
An earlier gap where the access token outlived logout is **closed**.
FE: `useLogout` → POST → clear client session → `/login`. `logout` is in `NO_REFRESH`.

## 7. Error contract

**There is no `errorCode` field** — the old ErrorCode table is dead (the `ERROR_KEYS` branch in
`toAuthError` never fires; harmless). What actually ships:

1. **`ValidationProblemDetails`** `{ title, status, errors: { Field: [msg] } }` → the FE surfaces the
   first field message as the title, the rest as detail.
2. **`ProblemDetails`** `{ title, status, detail? }` → surfaced verbatim.
3. **Soft `200 {success:false, message, retryAfterSeconds?}`** → OTP verify/resend outcomes.
4. **`409`** on register duplicate → mapped to "email already exists".

> Server titles are **English only** → mixed-language in the Arabic UI. Mitigated by doing validation
> client-side first. Not fixed; low priority.

## 8. Two gotchas already fixed — do NOT reintroduce
1. **Skip `/auth/refresh` + `/auth/me` on `/login` and `/register`** — in **both** bootstraps
   (`useSessionBootstrap` *and* `AppProviders`). Otherwise a public page fires an auth call.
2. **StrictMode is removed** — its dev remount replayed the auth entrance animation and looked like
   the page was refreshing itself.

## 9. File map (myapp only)

```
src/platform/http/apiClient.ts        axios instance, refresh, NO_REFRESH
src/platform/http/accessToken.ts      in-memory token (no storage)
src/platform/auth/authStore.ts        session store (sessionStorage, per-tab)
src/platform/auth/guards.tsx          RequireAuth / RequireRole (hydration-aware)

src/features/auth/api/authApi.ts      every /auth/* call
src/features/auth/api/authTypes.ts    all request/response DTOs
src/features/auth/api/authErrors.ts   toAuthError — the error contract mapper
src/features/auth/useLoginFlow.ts     email login
src/features/auth/usePhoneLogin.ts    SMS login (send-otp → login)
src/features/auth/useForgotPassword.ts / useNewPassword.ts   3-step reset
src/features/auth/useResolveAfterLogin.ts  post-login routing
src/features/auth/useLogout.ts        logout
src/features/auth/useSessionBootstrap.tsx  restore session from cookie on fresh tab

src/features/onboarding/api/onboardingApi.ts    resume/cities/documents/review/submit
src/features/onboarding/api/onboardingTypes.ts  onboarding DTOs
src/features/onboarding/useOnboardingWizard.ts  wizard + buildReviewRequest
```

## 10. Still parked (intentional)
- **Google / Apple social sign-in** — `useCredentialsCard.socialSignIn` is still a mock; Google OAuth
  is real but resolves to a mock session. Parked per HLD v1.0, not wired.
- `AuthResponse.token` is kept in the DTOs **for Flutter** — web ignores it. Do not remove.

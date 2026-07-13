# Mock Backend — Onboarding & Login

A decoupled, typed mock of the onboarding/login BFF for stakeholder demos. Production
components never import it — they call hooks, hooks call the **`OnboardingApi` interface**,
and the mock implementation fulfils it against a persisted store. Swapping to the real BFF
later is one line.

## Layout

```
src/platform/api/
  contracts.ts     // domain types + OnboardingApi interface (the boundary)
  errors.ts        // ApiError (code + field) + toUiError() → UiError
  mock/
    db.ts          // localStorage-persisted store + demo seed + reset
    mockApi.ts     // implements OnboardingApi; latency + magic-value errors
  index.ts         // exports `api` (the single swap point) + resetDemoData()
```

Consume it from hooks via React Query, mapping failures to the UI error contract:

```ts
import { api, toUiError } from '@/platform/api'

const mutation = useMutation({ mutationFn: api.register })
// in the component: error={mutation.error ? toUiError(mutation.error) : null}
```

## Swap point

`src/platform/api/index.ts` exports `api: OnboardingApi = mockApi`. When a real BFF exists,
add an `httpApi` implementing the same interface and select it (e.g.
`import.meta.env.VITE_USE_MOCK ? mockApi : httpApi`). Components don't change.

## Persistence

State lives in `localStorage` under `miproc.mockdb.v1` (in-memory cached), so registrations
**survive refresh**. Call `resetDemoData()` to wipe back to the seed.

## Demo accounts (seeded)

| Email | Password | Roles | Login lands on |
| --- | --- | --- | --- |
| `demo@mi-proc.sa` | `password` | buyer **+** supplier | **Continue as** (dual-role) |
| `buyer@demo.sa` | `password` | buyer | straight to Buyer dashboard |

(You can also log in with the mobile number instead of the email.)

## OTP

- Demo code is always **`123456`** (the "sent" code is also logged to the browser console).
- Channel defaults to whatever the user registered with (email or mobile).
- Code TTL 5 min → `OTP_EXPIRED`; resend throttled 30s → drives the resend countdown.

## Magic values — error cheat sheet

Type these to trigger each error state and showcase the error UI:

| Action | Input | Error shown |
| --- | --- | --- |
| Register | CR Number = `0000000000` | "This CR number is already registered." (also any existing CR) |
| Register | Email already registered | "An account with this email already exists." |
| Register | Mobile already registered | "An account with this mobile number already exists." |
| Login | Password = `wrong` (or any mismatch) | "Incorrect email or password." |
| Login | Unknown email/mobile | "No account found for these details." |
| OTP verify | Any code ≠ `123456` | "That code is incorrect." |
| OTP verify | After 5 min | "This code has expired. Request a new one." |
| Resend OTP | Within 30s of the last send | "Please wait a moment before requesting another code." |
| CR validate | CR = `1111111111` | "No commercial registration found for this CR number." |
| VAT validate | VAT ending `0000` | "No VAT registration found for this number." |

All errors are typed `ApiError { code, message, field? }`; `toUiError()` converts them to the
`UiError` the `Field`/`Button` primitives render, and `field` lets a form attach the message
to the right input.

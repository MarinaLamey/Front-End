# Onboarding & Login — Test Accounts & Test Plan

Covers the registration → OTP → profile → dashboard flow and login (single- & dual-role),
all running against the **mock backend** (`src/platform/api`). No real email/SMS is sent —
the OTP is always `123456` and is also logged to the browser console.

> Reset demo state any time via `resetDemoData()` (from `@/platform/api`) or by clearing the
> `miproc.mockdb.v1` key in localStorage, then refresh.

---

## 1. Test accounts (seeded — work on first load)

| Email | Mobile | Password | Roles | Login lands on |
| --- | --- | --- | --- | --- |
| `demo@mi-proc.sa` | `+966500000000` | `password` | Buyer + Supplier | **Continue as** (dual-role) |
| `buyer@demo.sa` | `+966500000001` | `password` | Buyer | Buyer dashboard (no Continue-as) |

You can sign in with **either the email or the mobile** + password.

## 2. Test data for NEW registrations (valid — passes validation)

Use fresh values each run (CR/email/mobile must be unique), or reset first.

| Field | Example values |
| --- | --- |
| Organization name | `Najd Trading Co`, `Riyadh Steel Est` |
| CR Number (10 digits) | `1010777001`, `2055123456`, `4030555888` |
| Mobile (KSA) | `0501234567`, `+966512345678` |
| Email | `ahmed.buyer@najd.test`, `sara.supplier@rsteel.test` |
| Password / Confirm | `Passw0rd!` (≥ 8 chars, both must match) |
| OTP code | `123456` |
| VAT (15 digits, passes) | `300012345600003`, `311122334400001` |

## 3. Error-trigger inputs (magic values — show the error UI)

| Where | Input | Expected error |
| --- | --- | --- |
| Register · CR | `0000000000` (or any existing CR) | "This CR number is already registered." |
| Register · Email | `demo@mi-proc.sa` | "An account with this email already exists." |
| Register · Mobile | `+966500000000` | "An account with this mobile number already exists." |
| OTP | any code ≠ `123456` | "That code is incorrect." |
| OTP | wait > 5 min, then verify | "This code has expired…" |
| Resend OTP | within 30 s of last send | countdown shown; resend disabled |
| Login · Password | `wrong` (or any mismatch) | "Incorrect email or password." |
| Login · Email | unknown address | "No account found for these details." |
| Profile · CR validate | `1111111111` | "No commercial registration found…" |
| Profile · VAT validate | any ending `0000` | "No VAT registration found…" |

---

## 4. Test plan

Status legend: ☐ not run · ✅ pass · ❌ fail.

### 4.1 Registration (form)

| ID | Scenario | Steps | Expected | ☐ |
| --- | --- | --- | --- | --- |
| REG-01 | Buyer registration | Fill valid data, role = Buyer, submit | Advances to OTP; console logs the code | ☐ |
| REG-02 | Supplier registration | Role = Supplier, valid data, submit | Advances to OTP | ☐ |
| REG-03 | Dual registration | Role = Buyer & Supplier, submit | Advances to OTP; both roles carried forward | ☐ |
| REG-04 | Confirm-password mismatch | password ≠ confirm | Inline "Passwords do not match"; submit disabled | ☐ |
| REG-05 | Invalid CR | CR `12345` (not 10 digits) | Inline "Enter a valid 10-digit CR number" | ☐ |
| REG-06 | Invalid mobile | `12345` | Inline "Enter a valid mobile number" | ☐ |
| REG-07 | Terms unchecked | leave terms off | Submit disabled / terms error | ☐ |
| REG-08 | Duplicate CR | CR `0000000000` | Server error banner "CR already registered" | ☐ |
| REG-09 | Duplicate email | `demo@mi-proc.sa` | Server error "email already exists" | ☐ |
| REG-10 | OTP channel = Email | select Email, submit | OTP screen reads "…sent to <email>" | ☐ |
| REG-11 | OTP channel = Mobile | select Mobile, submit | OTP screen reads "…sent to <mobile>" | ☐ |

### 4.2 OTP verification

| ID | Scenario | Steps | Expected | ☐ |
| --- | --- | --- | --- | --- |
| OTP-01 | Happy path | enter `123456`, Verify | Advances to profile wizard | ☐ |
| OTP-02 | Wrong code | enter `000000`, Verify | "That code is incorrect."; stays on step | ☐ |
| OTP-03 | Resend countdown | observe after landing | "Resend in m:ss" ticking; resend disabled | ☐ |
| OTP-04 | Resend after countdown | wait 30 s, Resend | New code issued (console); countdown restarts | ☐ |
| OTP-05 | Resend throttled | Resend immediately | Throttle error / disabled | ☐ |
| OTP-06 | Expiry | wait > 5 min, Verify | "This code has expired…" | ☐ |
| OTP-07 | Back | click Back | Returns to the registration form | ☐ |
| OTP-08 | Digits only | type letters | Input ignores non-digits, caps at 6 | ☐ |

### 4.3 Organization profile wizard

| ID | Scenario | Steps | Expected | ☐ |
| --- | --- | --- | --- | --- |
| PROF-01 | CR validate (valid) | enter CR, Validate | "Verified — <org name> ✓"; City + dates auto-fill | ☐ |
| PROF-02 | CR validate (invalid) | CR `1111111111`, Validate | Danger message "No CR found…" | ☐ |
| PROF-03 | VAT validate (valid) | enter VAT, Validate | "Verified — <org name> ✓" | ☐ |
| PROF-04 | VAT validate (invalid) | VAT ending `0000`, Validate | Danger message "No VAT found…" | ☐ |
| PROF-05 | Buyer-only sections | buyer registration | Shows Buyer section; no Supplier section/toggle | ☐ |
| PROF-06 | Supplier-only sections | supplier registration | Shows Supplier section (type + supplied categories) | ☐ |
| PROF-07 | Dual shared CR/VAT | dual reg, toggle OFF | One CR/VAT pair applies to both profiles | ☐ |
| PROF-08 | Dual separate CR/VAT | dual reg, toggle ON | Second CR/VAT pair appears for Supplier | ☐ |
| PROF-09 | Submit (activate) | fill, Activate account | Loader plays → lands on primary dashboard | ☐ |

### 4.4 Login & dual-role

| ID | Scenario | Steps | Expected | ☐ |
| --- | --- | --- | --- | --- |
| LOG-01 | Single-role login | `buyer@demo.sa` / `password` | Straight to Buyer dashboard (no Continue-as) | ☐ |
| LOG-02 | Dual-role login | `demo@mi-proc.sa` / `password` | Continue-as screen → pick context → dashboard | ☐ |
| LOG-03 | Login by mobile | `+966500000001` / `password` | Buyer dashboard | ☐ |
| LOG-04 | Wrong password | `password` = `wrong` | "Incorrect email or password." | ☐ |
| LOG-05 | Unknown account | `nobody@x.test` | "No account found for these details." | ☐ |
| LOG-06 | Newly registered login | register → activate → sign out → log in | Logs in with the chosen role(s) | ☐ |
| LOG-07 | No PIN / no federated | inspect sign-in card | No 6-digit PIN; no Google/phone/Nafath buttons | ☐ |

### 4.5 Persistence & cross-cutting

| ID | Scenario | Steps | Expected | ☐ |
| --- | --- | --- | --- | --- |
| NFR-01 | Persistence | register an org, refresh, log in | New org still exists after refresh | ☐ |
| NFR-02 | Reset | call `resetDemoData()`, refresh | Only the 2 seeded accounts remain | ☐ |
| NFR-03 | RTL (Arabic) | toggle to العربية | Layout mirrors; channel selector + cards correct | ☐ |
| NFR-04 | Reduced motion | OS "reduce motion" on | Loaders/sheen suppressed; flow still works | ☐ |
| NFR-05 | Keyboard a11y | tab through register/OTP | All inputs/buttons reachable; labels announced | ☐ |
| NFR-06 | Validation a11y | trigger a field error | Error linked to input (aria), announced once | ☐ |

---

## 5. Known limitations (expected, not bugs)

- Profile submit isn't blocked on every required field yet (mock-first) — REG/PROF "required"
  hardening comes with a profile zod schema.
- Activation logs into `roles[0]`; dual-role post-activation routing finalizes with Phase 5 (RBAC).
- Nafath / Google / phone sign-in are intentionally parked (HLD scope = email/mobile + password).

/* ────────────────────────────────────────────────────────────────────────────
 * AUTH CONTRACT — mirrors the backend swagger (`/api/auth`) EXACTLY.
 *
 * Field names, optionality and enum casing are copied from the Mi-Proc API schemas so the
 * mock and the real client are byte-compatible: switching between them is a config change
 * (see ./index.ts), never a change to these types or to any consumer.
 *
 * Scope today: wizard step 1 (register), step 2 (verify phone + email), login, and password
 * reset. Organisation / CR / VAT (steps 3-5) are NOT in this contract — that API is pending.
 *
 * Backend nullability: every string is `nullable: true` in the swagger, so they're modelled
 * as `string | null | undefined` — reads must tolerate null.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Miproc_Domain_Common_UserRole. PascalCase, exactly as the backend serialises it. */
export type UserRole = 'Admin' | 'Requester' | 'Approver' | 'Buyer' | 'Supplier' | 'BuyerAndSupplier'

/** Miproc_Application_Features_Auth_LoginMethod. */
export type LoginMethod = 'Email' | 'Sms'

/** Miproc_Application_Features_Auth_PasswordResetMethod. */
export type PasswordResetMethod = 'Email' | 'Sms'

/**
 * Why an OTP is being sent. ONE send-otp/verify-otp pair is shared by two flows, and this
 * flag tells the backend which:
 *   Register → wizard step 2, confirming a new account's phone
 *   Login    → passwordless phone sign-in
 *
 * Password reset does NOT use these endpoints — it has its own path
 * (forgot-password → verify-password-reset → reset-password).
 *
 * The swagger types `purpose` as a free string, so keeping it a union means a typo can't
 * compile and there's exactly one place to fix if the backend's casing differs.
 */
export type OtpPurpose = 'Register' | 'Login'

/** Miproc_Application_Features_Auth_UserDto. */
export interface UserDto {
  id: string
  email?: string | null
  phoneNumber?: string | null
  fullName?: string | null
  /**
   * RESPONSE-ONLY. `register` takes no role — the user's real role (Buyer / Supplier / Both)
   * is chosen at wizard step 3 and set through the organisation API (not yet available), so
   * whatever the backend defaults to here is not meaningful until that step runs.
   */
  role: UserRole
}

/* ── register / update (wizard step 1) ────────────────────────────────────── */

/** Step 1 of the wizard. The backend removed `role` — it arrives with the org API. */
export interface RegisterRequest {
  phoneNumber?: string | null
  email?: string | null
  password?: string | null
  fullName?: string | null
}

export interface RegisterResponse {
  token?: string | null
  user: UserDto
  isPhoneVerified: boolean
  isEmailVerified: boolean
  message?: string | null
}

/**
 * Re-submitting step 1 after the user pressed Back and edited their details.
 *
 * The wizard CREATES on the first Continue (`register`) and UPDATES on every later one
 * (`updateUser`), so going Back never creates a duplicate account. PROVISIONAL: the backend
 * is still building this endpoint — the URL/shape are our best guess and are isolated to the
 * HTTP client, so confirming them later is a one-line change.
 */
export interface UpdateUserRequest {
  phoneNumber?: string | null
  email?: string | null
  fullName?: string | null
}

/* ── login ────────────────────────────────────────────────────────────────── */

/** `Email` → send email + password. `Sms` → send phoneNumber + otpCode. */
export interface LoginRequest {
  method: LoginMethod
  password?: string | null
  email?: string | null
  phoneNumber?: string | null
  otpCode?: string | null
}

export interface AuthResponse {
  token?: string | null
  refreshToken?: string | null
  user: UserDto
}

/* ── verification (wizard step 2 + phone login) ───────────────────────────── */

export interface VerifyEmailRequest {
  email?: string | null
  verificationCode?: string | null
}

export interface SendOtpRequest {
  phoneNumber?: string | null
  /** Register or Login — see {@link OtpPurpose}. */
  purpose?: OtpPurpose | null
}

export interface SendOtpResponse {
  success: boolean
  message?: string | null
  retryAfterSeconds?: number | null
  /** Non-prod convenience: the code echoed back so we can test without real SMS. */
  codeForDevelopment?: string | null
}

export interface VerifyOtpRequest {
  phoneNumber?: string | null
  /** Must match the purpose the code was sent with. */
  purpose?: OtpPurpose | null
  code?: string | null
}

export interface VerifyOtpResponse {
  success: boolean
  message?: string | null
}

/* ── password reset (its own 3-step path) ─────────────────────────────────── */

export interface ForgotPasswordRequest {
  method: PasswordResetMethod
  email?: string | null
  phoneNumber?: string | null
}

export interface ForgotPasswordResponse {
  message?: string | null
  codeForDevelopment?: string | null
}

/** Carries `emailVerificationPin` for Email and `code` for Sms (pending backend confirmation). */
export interface VerifyResetPasswordRequest {
  method: PasswordResetMethod
  emailVerificationPin?: string | null
  code?: string | null
  email?: string | null
  phoneNumber?: string | null
}

export interface VerifyResetPasswordResponse {
  message?: string | null
  /** Exchanged for the actual password change in {@link ResetPasswordRequest}. */
  resetToken?: string | null
}

export interface ResetPasswordRequest {
  resetToken?: string | null
  newPassword?: string | null
}

/* ── the surface ──────────────────────────────────────────────────────────── */

/**
 * AuthApi — one method per `/api/auth` endpoint, same names/shapes as the swagger.
 * Implemented by the mock today and by the HTTP client against the real BFF; consumers
 * never know which is active.
 *
 * Rejections are always `ApiError` (see ../errors) so the UI has one error contract.
 */
export interface AuthApi {
  /** POST /api/auth/register — wizard step 1, FIRST Continue. */
  register(body: RegisterRequest): Promise<RegisterResponse>
  /** PUT /api/auth/user — wizard step 1 re-submitted after Back (provisional endpoint). */
  updateUser(body: UpdateUserRequest): Promise<UserDto>
  /** POST /api/auth/login — password (Email) or OTP (Sms). */
  login(body: LoginRequest): Promise<AuthResponse>
  /** POST /api/auth/verify-email — wizard step 2, email channel. */
  verifyEmail(body: VerifyEmailRequest): Promise<void>
  /** POST /api/auth/send-otp — SMS only (there is no email-resend endpoint yet). */
  sendOtp(body: SendOtpRequest): Promise<SendOtpResponse>
  /** POST /api/auth/verify-otp — wizard step 2 (phone) and passwordless login. */
  verifyOtp(body: VerifyOtpRequest): Promise<VerifyOtpResponse>
  /** POST /api/auth/forgot-password — reset step 1. */
  forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse>
  /** POST /api/auth/verify-password-reset — reset step 2 → yields the resetToken. */
  verifyPasswordReset(body: VerifyResetPasswordRequest): Promise<VerifyResetPasswordResponse>
  /** POST /api/auth/reset-password — reset step 3. */
  resetPassword(body: ResetPasswordRequest): Promise<void>
  /** POST /api/auth/logout. */
  logout(): Promise<void>
}

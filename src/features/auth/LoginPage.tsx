import { AuthShell } from './components/AuthShell'
import { CredentialsCard } from './components/CredentialsCard'
import { PhoneLoginCard } from './components/PhoneLoginCard'
import { ForgotPasswordCard } from './components/ForgotPasswordCard'
import { ResetOtpCard } from './components/ResetOtpCard'
import { NewPasswordCard } from './components/NewPasswordCard'
import { PasswordUpdatedCard } from './components/PasswordUpdatedCard'
import { useLoginFlow } from './useLoginFlow'

/**
 * Login flow — presentational shell over {@link useLoginFlow}. A single {@link AuthShell}
 * (split card + "How Mi-Proc works" timeline) stays mounted; only the left-side card swaps
 * as the flow moves: verify identity (password / Google / phone-OTP) → dual-role "Continue
 * as" → dashboard, with a parallel reset-password branch. Per HLD v1.0 there is no PIN.
 */
export function LoginPage() {
  const flow = useLoginFlow()

  return (
    <AuthShell >
      {flow.step === 'credentials' && (
        <CredentialsCard
          onAuthenticated={flow.onAuthenticated}
          onPhoneLogin={flow.startPhone}
          onForgot={flow.startForgot}
        />
      )}

      {flow.step === 'phone' && (
        <PhoneLoginCard onAuthenticated={flow.onAuthenticated} onBack={flow.backToCredentials} />
      )}

      {flow.step === 'forgot' && (
        <ForgotPasswordCard onCodeSent={flow.resetCodeSent} onBack={flow.backToCredentials} />
      )}

      {flow.step === 'resetOtp' && (
        <ResetOtpCard
          destination={flow.resetDestination}
          onVerified={flow.resetOtpVerified}
          onBack={flow.backToForgot}
        />
      )}

      {flow.step === 'newPassword' && (
        <NewPasswordCard onSaved={flow.passwordSaved} onBack={flow.backToCredentials} />
      )}

      {flow.step === 'passwordUpdated' && <PasswordUpdatedCard onBack={flow.backToCredentials} />}
    </AuthShell>
  )
}

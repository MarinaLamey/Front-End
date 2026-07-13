import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import { OnboardingLayout } from './components/OnboardingLayout'
import { AccountDetailsStep } from './components/steps/AccountDetailsStep'
import { VerifyStep } from './components/steps/VerifyStep'
import { CompanyDetailsStep } from './components/steps/CompanyDetailsStep'
import { AddressPreferencesStep } from './components/steps/AddressPreferencesStep'
import { ReviewStep } from './components/steps/ReviewStep'
import { KycScreen } from './components/KycScreen'
import { ResumePrompt } from './components/ResumePrompt'
import { useOnboardingWizard, rolesFor } from './useOnboardingWizard'

/**
 * OnboardingPage — the 6-step registration wizard + KYC outcome. The OnboardingLayout
 * (progress rail + chrome) stays mounted; only the left content swaps as the step / KYC
 * state changes. Flow: Account → Verify phone → Verify email → Company → Address → Review.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const wizard = useOnboardingWizard()

  const goToDashboard = () => {
    const primary = rolesFor(wizard.data.role)[0]
    login(primary)
    navigate(`/${primary}`)
  }

  // Returning with a saved draft → offer to resume before showing the wizard.
  if (wizard.resumeAvailable) {
    return (
      <OnboardingLayout current={wizard.resumeStep}>
        <ResumePrompt step={wizard.resumeStep} onResume={wizard.resume} onStartOver={wizard.startOver} />
      </OnboardingLayout>
    )
  }

  // Once submitted, the same shell shows the KYC outcome.
  if (wizard.kyc) {
    return (
      <OnboardingLayout current={6} allDone={wizard.kyc !== 'rejected'} rejected={wizard.kyc === 'rejected'}>
        <KycScreen
          status={wizard.kyc}
          onGoToDashboard={goToDashboard}
          onPreview={wizard.setKyc}
          onResubmit={() => {
            wizard.setKyc(null)
            wizard.goTo(4)
          }}
        />
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout current={wizard.step}>
      {wizard.step === 1 && <AccountDetailsStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} />}
      {wizard.step === 2 && (
        <VerifyStep channel="phone" data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 3 && (
        <VerifyStep channel="email" data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 4 && (
        <CompanyDetailsStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 5 && (
        <AddressPreferencesStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 6 && (
        <ReviewStep
          data={wizard.data}
          onBack={wizard.back}
          onEdit={wizard.goTo}
          onSubmit={wizard.submit}
          isSubmitting={wizard.isSubmitting}
          submitError={wizard.submitError}
        />
      )}
    </OnboardingLayout>
  )
}

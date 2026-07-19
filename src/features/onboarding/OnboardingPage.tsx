import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import { OnboardingLayout } from './components/OnboardingLayout'
import { AccountDetailsStep } from './components/steps/AccountDetailsStep'
import { VerifyStep } from './components/steps/VerifyStep'
import { CompanyDetailsStep } from './components/steps/CompanyDetailsStep'
import { TaxDetailsStep } from './components/steps/TaxDetailsStep'
import { AddressPreferencesStep } from './components/steps/AddressPreferencesStep'
import { ReviewStep } from './components/steps/ReviewStep'
import { KycScreen } from './components/KycScreen'
import { OnboardingSummaryPanel } from './components/OnboardingSummaryPanel'
import { ResumePrompt } from './components/ResumePrompt'
import { useOnboardingWizard, rolesFor } from './useOnboardingWizard'

/**
 * OnboardingPage — the 6-step registration wizard + KYC outcome. The OnboardingLayout
 * (progress rail + chrome) stays mounted; only the left content swaps as the step / KYC
 * state changes. Flow: Account → Verify (phone + email) → Company → Tax → Address → Review.
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
      <OnboardingLayout
        current={6}
        allDone={wizard.kyc !== 'rejected'}
        rejected={wizard.kyc === 'rejected'}
        // Pending shows the "Under review" summary; approved/rejected keep the step rail.
        panel={wizard.kyc === 'pending' ? <OnboardingSummaryPanel variant="review" /> : undefined}
      >
        <KycScreen
          status={wizard.kyc}
          onGoToDashboard={goToDashboard}
          onPreview={wizard.setKyc}
          onResubmit={() => {
            wizard.setKyc(null)
            wizard.goTo(3)
          }}
        />
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout
      current={wizard.step}
      // The Review step (6) swaps the rail for the "all steps complete" summary.
      panel={wizard.step === 6 ? <OnboardingSummaryPanel variant="complete" /> : undefined}
    >
      {wizard.step === 1 && <AccountDetailsStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} />}
      {wizard.step === 2 && (
        <VerifyStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 3 && (
        <CompanyDetailsStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 4 && (
        <TaxDetailsStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 5 && (
        <AddressPreferencesStep data={wizard.data} patch={wizard.patch} onNext={wizard.next} onBack={wizard.back} />
      )}
      {wizard.step === 6 && (
        <ReviewStep
          data={wizard.data}
          onEdit={wizard.goTo}
          onSubmit={wizard.submit}
          isSubmitting={wizard.isSubmitting}
          submitError={wizard.submitError}
        />
      )}
    </OnboardingLayout>
  )
}

import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import { useTenant } from '@/platform/tenancy'
import { verificationApi } from '@/platform/api/verification'
import { OnboardingLayout } from './components/OnboardingLayout'
import { AccountDetailsStep } from './components/steps/AccountDetailsStep'
import { VerifyStep } from './components/steps/VerifyStep'
import { CompanyDetailsStep } from './components/steps/CompanyDetailsStep'
import { TaxDetailsStep } from './components/steps/TaxDetailsStep'
import { AddressPreferencesStep } from './components/steps/AddressPreferencesStep'
import { ReviewStep } from './components/steps/ReviewStep'
import { PlansStep } from './components/PlansStep'
import { ResumePrompt } from './components/ResumePrompt'
import { useOnboardingWizard, rolesFor, formatAddress } from './useOnboardingWizard'

/**
 * OnboardingPage — the 6-step registration wizard + the Plans screen. The OnboardingLayout
 * (progress rail + chrome) stays mounted; only the left content swaps as the step changes.
 * Flow: Account → Verify (phone + email) → Company → Tax → Address → Review → Plans
 * (verification continues in the background — there are no KYC outcome screens).
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { tenant, setTenant } = useTenant()
  const wizard = useOnboardingWizard()

  const goToDashboard = async () => {
    const memberships = rolesFor(wizard.data.role)
    const primary = memberships[0]
    // Carry the real name/org captured in the wizard into the session so the portal shows the
    // actual signed-in person and organisation (no placeholder user). `memberships` are the
    // buyer/supplier role(s) chosen at registration — they drive which dashboards are reachable.
    setTenant({
      name: wizard.data.orgName,
      address: formatAddress(wizard.data),
      city: wizard.data.city,
    })
    login(primary, { name: wizard.data.fullName, email: wizard.data.email }, memberships)
    // File the KYB request so the org lands in the super-admin queue (pending) with its real
    // CR + VAT — the admin's per-document decisions then drive this org's dashboard.
    await verificationApi.openRequest({
      orgId: tenant.id,
      orgName: wizard.data.orgName,
      cr: wizard.data.cr,
      vat: wizard.data.vat,
    })
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

  // Once submitted → the Plans screen (full-width, like Review); review runs in the background.
  if (wizard.completed) {
    return (
      <OnboardingLayout current={6} fullWidth>
        <PlansStep onGoToDashboard={goToDashboard} />
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout
      current={wizard.step}
      // The editable Review step (6) is a full-width card — no rail, no side panel.
      fullWidth={wizard.step === 6}
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
          patch={wizard.patch}
          onSubmit={wizard.submit}
          isSubmitting={wizard.isSubmitting}
          submitError={wizard.submitError}
        />
      )}
    </OnboardingLayout>
  )
}

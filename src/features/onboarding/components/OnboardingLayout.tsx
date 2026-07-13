import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { SplitShell } from '@/shared/ui/SplitShell'
import { LanguageToggle } from '@/platform/i18n'
import { ThemeToggle } from '@/platform/theme/ThemeToggle'
import { OnboardingStepper } from './OnboardingStepper'
import type { WizardStep } from '../useOnboardingWizard'

interface OnboardingLayoutProps {
  /** 1-based current step for the rail. */
  current: WizardStep
  /** Render every rail step as done (KYC approved / pending outcome screens). */
  allDone?: boolean
  /** Mark the final rail step as failed (KYC "needs attention"). */
  rejected?: boolean
  children: ReactNode
}

/** mimony brand panel: deep purple sweeping into teal (bottom-inner corner). */
const PANEL_GRADIENT = 'bg-[linear-gradient(150deg,#4A3F8F_0%,#51489E_34%,#2C7E86_72%,#00AB98_100%)]'

/**
 * OnboardingLayout — the registration/KYC shell. It's just {@link SplitShell} with the
 * language + theme controls in the top bar and the {@link OnboardingStepper} as the panel.
 * Sign-in reuses the very same SplitShell via AuthShell, so the card lives in one place.
 */
export function OnboardingLayout({ current, allDone, rejected, children }: OnboardingLayoutProps) {
  return (
    <SplitShell
      topBar={
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
      aside={<OnboardingStepper current={current} allDone={allDone} rejected={rejected} />}
      asideClassName={cn('w-[42.5%]', PANEL_GRADIENT)}
    >
      {children}
    </SplitShell>
  )
}

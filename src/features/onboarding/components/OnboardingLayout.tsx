import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { SplitShell, BRAND_PANEL_GRADIENT } from '@/shared/ui/SplitShell'
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
      asideClassName={cn('w-1/2', BRAND_PANEL_GRADIENT)}
    >
      {children}
    </SplitShell>
  )
}

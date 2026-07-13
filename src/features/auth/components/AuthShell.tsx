import { type ReactNode } from 'react'
import { SplitShell } from '@/shared/ui/SplitShell'
import { LanguageToggle } from '@/platform/i18n'
import { ThemeToggle } from '@/platform/theme/ThemeToggle'
import { HowItWorksPanel } from './HowItWorksPanel'

interface AuthShellProps {
  children: ReactNode
}

/**
 * AuthShell — the shell shared by every sign-in / reset screen. It's the same
 * {@link SplitShell} used by registration, with the language + theme controls in the top
 * bar and the {@link HowItWorksPanel} timeline as the gradient panel. The shell stays
 * mounted while the left-side card swaps between flow steps.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <SplitShell
      topBar={
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
      aside={<HowItWorksPanel />}
      asideClassName="w-[52%] bg-[linear-gradient(150deg,#7C3AED_0%,#5B4BE0_55%,#4F46E5_100%)]"
    >
      {children}
    </SplitShell>
  )
}

import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { SplitShell, BRAND_PANEL_GRADIENT } from '@/shared/ui/SplitShell'
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
      // Same panel as registration: the shared mimony gradient + matching width.
      asideClassName={cn('w-[435px]', BRAND_PANEL_GRADIENT)}
    >
      {children}
    </SplitShell>
  )
}

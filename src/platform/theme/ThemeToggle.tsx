import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { SunIcon, MoonIcon } from '@/features/onboarding/components/onboardingIcons'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'miproc.theme'

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* storage unavailable — fall back to the OS preference */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Light/dark theme toggle. Flips a `dark` class on <html> (the token overrides live in
 * index.css) and persists the choice. A segmented sun/moon control, matching the design.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    apply(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const options: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Light', Icon: SunIcon },
    { value: 'dark', label: 'Dark', Icon: MoonIcon },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-brand-primary p-1">
      {options.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              active ? 'bg-white text-brand-primary' : 'text-white/90 hover:bg-white/10',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

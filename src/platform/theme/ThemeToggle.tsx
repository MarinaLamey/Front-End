import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { SunIcon, MoonIcon } from '@/features/onboarding/components/onboardingIcons'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'miproc.theme'
// One segment (w-[30px]) + gap-1 (4px) = 34px between segment starts.
const STEP = 34

/** Document with the (still-experimental, so optional) View Transitions API. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
 * index.css) and persists the choice. A brand pill SLIDES between the sun/moon segments with a
 * soft spring overshoot and the active icon pops — pure CSS transform, no library. Pinned
 * `dir="ltr"` for a stable path in RTL; reduced-motion drops the motion to an instant swap.
 */
interface ThemeToggleProps {
  /** 'icon' = compact sun/moon slider (auth). 'labeled' = "Light | Dark" segmented (sidebar). */
  variant?: 'icon' | 'labeled'
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps = {}) {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    apply(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  // Switch the theme with a full-UI palette crossfade via the View Transitions API. The API
  // snapshots the current colours, flips the `dark` class inside the callback, then fades old→
  // new on the compositor. Runs once per click; Firefox / reduced-motion fall back to instant.
  const changeTheme = (next: Theme) => {
    if (next === theme) return
    const doc = document as ViewTransitionDocument
    if (prefersReducedMotion() || !doc.startViewTransition) {
      setTheme(next)
      return
    }
    doc.startViewTransition(() => {
      apply(next)
      flushSync(() => setTheme(next))
    })
  }

  const options: { value: Theme; labelKey: string; Icon: typeof SunIcon }[] = [
    { value: 'light', labelKey: 'common.light', Icon: SunIcon },
    { value: 'dark', labelKey: 'common.dark', Icon: MoonIcon },
  ]
  const activeIndex = theme === 'light' ? 0 : 1

  // Labeled variant — the "Light | Dark" segmented pill used in the portal sidebar. Same theme
  // logic; the active segment fills with the brand colour (matches the buyer/supplier screens).
  if (variant === 'labeled') {
    return (
      <div
        dir="ltr"
        className="inline-flex w-full items-center gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1"
      >
        {options.map(({ value, labelKey, Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => changeTheme(value)}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none',
                active
                  ? 'bg-brand-primary text-brand-primary-on'
                  : 'text-content-secondary hover:text-content-primary',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      dir="ltr"
      className="relative inline-flex items-center gap-1 rounded-[8px] border border-border-subtle bg-bg-surface p-1 shadow-md"
    >
      {/* Sliding brand pill (sits behind the icons). */}
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 w-[30px] rounded-md bg-brand-primary transition-transform duration-300 ease-[cubic-bezier(0.34,1.5,0.64,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * STEP}px)` }}
      />
      {options.map(({ value, labelKey, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            aria-label={t(labelKey)}
            aria-pressed={active}
            onClick={() => changeTheme(value)}
            className={cn(
              'relative z-10 inline-flex h-11 w-[30px] items-center justify-center rounded-md px-[7px] py-1.5 transition-colors duration-200 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100',
              active ? 'text-brand-primary-on' : 'text-content-secondary hover:text-content-primary',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.5,0.64,1)] motion-reduce:transition-none',
                active ? 'scale-110' : 'scale-100',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

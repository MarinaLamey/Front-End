import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { setLocale, type Locale } from './i18n'

const LANGS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

// One segment (w-16 = 64px) + gap-1 (4px) = 68px between segment starts.
const STEP = 68

/**
 * Segmented English / Arabic switch. A brand pill SLIDES between the two options with a soft
 * spring overshoot — pure CSS transform, no library. The container is pinned `dir="ltr"` so the
 * segments keep a stable order (and the pill a stable path) even when the page flips to RTL.
 * Reduced-motion drops the slide to an instant swap. Tokens only, so it reskins with the palette.
 */
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const current: Locale = i18n.language === 'ar' ? 'ar' : 'en'
  const activeIndex = LANGS.findIndex((l) => l.value === current)

  return (
    <div
      dir="ltr"
      className="relative inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1 shadow-md"
    >
      {/* Sliding brand pill (sits behind the labels). */}
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 w-16 rounded-md bg-brand-primary transition-transform duration-300 ease-[cubic-bezier(0.34,1.5,0.64,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * STEP}px)` }}
      />
      {LANGS.map(({ value, label }) => {
        const active = current === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(value)}
            className={cn(
              'relative z-10 inline-flex h-11 w-16 items-center justify-center rounded-md px-2.5 text-sm font-medium transition-colors duration-200 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100',
              active ? 'text-brand-primary-on' : 'text-content-secondary hover:text-content-primary',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

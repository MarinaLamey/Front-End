import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { ShimmerButton } from '@/shared/ui/ShimmerButton'

const NAV_KEYS = ['home', 'solutions', 'howItWorks', 'pricing', 'about'] as const

/**
 * Marketing nav. Each link is a ShimmerButton: a spinning conic glow ring reveals on
 * hover (and stays lit on the active item, which also wears the brand gradient), with a
 * spring-eased scale. See ShimmerButton.css for the effect and its motion gating.
 */
export function HeaderNav() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)

  return (
    <div className="hidden items-center gap-2 md:flex">
      {NAV_KEYS.map((key, index) => {
        const isActive = index === active
        return (
          <ShimmerButton
            key={key}
            active={isActive}
            onClick={() => setActive(index)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium',
              isActive ? 'text-brand-primary-on' : 'text-content-secondary hover:text-brand-primary-on',
            )}
          >
            {t(`marketing.nav.${key}`)}
          </ShimmerButton>
        )
      })}
    </div>
  )
}

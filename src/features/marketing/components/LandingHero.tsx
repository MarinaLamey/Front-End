import { type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Reveal } from '@/shared/ui/Reveal'
import { ShimmerButton } from '@/shared/ui/ShimmerButton'
import { MorphButton } from '@/shared/ui/MorphButton'
import { ctaSecondaryDark } from './ctaStyles'
import { IconAi, IconExchange, IconRfq, IconShield } from './icons'

const CARDS = [
  { Icon: IconRfq, titleKey: 'cardRfqTitle', bodyKey: 'cardRfqBody' },
  { Icon: IconAi, titleKey: 'cardAiTitle', bodyKey: 'cardAiBody' },
  { Icon: IconShield, titleKey: 'cardVerifiedTitle', bodyKey: 'cardVerifiedBody' },
  { Icon: IconExchange, titleKey: 'cardSettleTitle', bodyKey: 'cardSettleBody' },
]

export function LandingHero() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  // Cards converge from the container's centre; in RTL the grid mirrors, so flip x.
  const dirSign = i18n.dir() === 'rtl' ? -1 : 1
  // Let the click shimmer sweep before the route swaps the page out.
  const goAfterShimmer = (path: string) => window.setTimeout(() => navigate(path), 650)

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(101deg,#0E938D_0%,#325AE1_100%)] px-6 py-16 md:px-20 md:py-[72px]">
      {/* Decorative drifting blobs — compositor-only, paused under reduced motion. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl motion-safe:animate-float" />
        <span className="absolute -right-16 top-8 h-80 w-80 rounded-full bg-[#325AE1]/30 blur-3xl motion-safe:animate-float-slow" />
        <span className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#0E938D]/40 blur-3xl motion-safe:animate-float" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-14 lg:flex-row">
        <div className="flex-1 space-y-6">
          <Reveal from="up">
            <p className="text-xs font-medium tracking-wide text-white/85">
              {t('marketing.hero.eyebrow')}
            </p>
          </Reveal>
          <Reveal from="up" delay={90}>
            <h1 className="text-4xl font-bold leading-tight text-white">
              {t('marketing.hero.title')}
            </h1>
          </Reveal>
          <Reveal from="up" delay={180}>
            <p className="text-lg leading-relaxed text-white/90">{t('marketing.hero.subtitle')}</p>
          </Reveal>
          <Reveal from="up" delay={270}>
            <div className="flex flex-wrap gap-3 pt-2">
              <MorphButton
                to="/register"
                tone="onDark"
                label={t('marketing.hero.ctaPrimary')}
                hoverLabel={t('marketing.hero.growWithUs')}
              />
              <ShimmerButton
                trigger="click"
                onClick={() => goAfterShimmer('/login')}
                className={ctaSecondaryDark}
              >
                {t('marketing.hero.ctaSecondary')}
              </ShimmerButton>
            </div>
          </Reveal>
        </div>

        {/*
          Two-phase entrance: each card starts bundled near the grid's centre (scaled
          down, faded, offset toward the middle), then springs out to its slot — staggered
          via animation-delay. Driven by the `hero-card-in` keyframe (see index.css).
        */}
        <div className="grid w-full max-w-[520px] grid-cols-2 gap-4">
          {CARDS.map((card, index) => {
            const cardStyle = {
              // Offset toward the centre: left column starts right, top row starts low.
              '--hero-from-x': `${(index % 2 === 0 ? 80 : -80) * dirSign}px`,
              '--hero-from-y': index < 2 ? '70px' : '-70px',
              animationDelay: `${150 + index * 120}ms`,
            } as CSSProperties
            return (
              <div
                key={card.titleKey}
                style={cardStyle}
                className="group relative flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 text-center transition-transform duration-200 ease-out hover:-translate-y-1 motion-safe:animate-hero-card motion-reduce:transition-none"
              >
                <card.Icon className="h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none" />
                <p className="text-lg font-semibold text-white">
                  {t(`marketing.hero.${card.titleKey}`)}
                </p>
                <p className="text-sm text-white/80">{t(`marketing.hero.${card.bodyKey}`)}</p>
                {/* One-time sheen, fired just after this card's entrance settles. */}
                <span
                  aria-hidden="true"
                  style={{ animationDelay: `${900 + index * 120}ms` }}
                  className="hero-sheen pointer-events-none absolute inset-0"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
